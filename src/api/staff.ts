// Staff API (điều dưỡng + hộ lý). Screens S1–S10 of mục 5.11, plus assessment, shifts,
// damage reports and personal belongings. Staff only see their assigned elderly (BR-33).
import type { CareLogEntry, DailyTask, HealthMetric, Incident, LeaveRequest, TargetGroup, Tier, User } from "../types/models";
import { GROUP_INFO, GROUP_LABEL, isDayCycle, minTierFor, POSITION_LABEL, TIER_LABEL, tierRank } from "../domain/catalog";
import { assertValid, BARTHEL_NOT_ACCEPTED, validateBarthel, validateVitals } from "../lib/validate";
import { manager } from "./manager";
import {
  activeSub, attendanceOn, audit, byId, capacity, fixedSurcharge, surchargeMonthly, choicesOf, clock, commit, currentSub, db, entitlement, guard, honor, isNurse, lookups, metricsOf,
  need, nextId, notify, notifyManagers, NOW, outOfRange, scheduledOn, stamp, staffOf, TODAY, usable, wait,
} from "./core";

const mins = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));
const familyAlertAllowed = (elderlyId: number, level: string) => level === "URGENT" || (currentSub(elderlyId) && entitlement(currentSub(elderlyId)!.tier).aiAlertFamily === "ALL");

function entry(me: User, elderlyId: number, kind: CareLogEntry["kind"], title: string, detail: string, extra: Partial<CareLogEntry> = {}) {
  const d = db();
  const e: CareLogEntry = { id: nextId(d.careLogEntries), elderlyId, date: TODAY, time: clock(), kind, title, detail, staffId: me.id, ...extra };
  d.careLogEntries.push(e);
  return e;
}
function raise(elderlyId: number, source: "THRESHOLD" | "AI" | "RULE", level: "INFO" | "WARNING" | "URGENT", title: string, detail: string) {
  const d = db();
  const e = need(lookups.elderly(elderlyId));
  d.alerts.unshift({ id: nextId(d.alerts), elderlyId, at: stamp(), source, level, title, detail, status: "NEW" });
  notifyManagers("HEALTH", `${title}: ${e.fullName}`, detail, "/manager/alerts");
  if (e.nurseId) notify(e.nurseId, "HEALTH", `${title}: ${e.fullName}`, detail, "/staff/alerts");
  if (familyAlertAllowed(elderlyId, level)) notify(e.familyUserId, "HEALTH", `${level === "URGENT" ? "Khẩn cấp" : "Cảnh báo"}: ${title}`, detail, "/family/alerts");
}

export const staff = {
  // ---------------------------------------------------------------- S1
  async today(me: User) {
    await wait();
    const d = db();
    const mine = staffOf(me);
    const ids = new Set(mine.map((e) => e.id));
    const shift = d.shiftAssignments.filter((a) => a.staffId === me.id && a.status === "APPROVED").map((a) => byId(d.shifts, a.shiftId)!).filter((s) => s?.date === TODAY);
    const scheduled = mine.filter((e) => scheduledOn(e.id, TODAY));
    const st = (e: { id: number }) => attendanceOn(e.id)?.status;
    const soon = d.dailyTasks.filter((t) => ids.has(t.elderlyId) && t.date === TODAY && t.status === "TODO" && mins(t.time) - mins(NOW) <= 30 && (t.owner === lookups.position(me.id)))
      .sort((a, b) => a.time.localeCompare(b.time)).map((t) => ({ ...t, elderly: lookups.elderly(t.elderlyId), overdue: t.time < NOW }));
    return {
      position: need(lookups.position(me.id)),
      shift,
      counts: { present: scheduled.filter((e) => st(e) === "PRESENT").length, notArrived: scheduled.filter((e) => !st(e) || st(e) === "EXPECTED").length, left: scheduled.filter((e) => st(e) === "LEFT").length, total: scheduled.length },
      lateArrivals: NOW >= d.centerSettings.absentAlertAt ? scheduled.filter((e) => !st(e) || st(e) === "EXPECTED") : [],
      alerts: d.alerts.filter((a) => ids.has(a.elderlyId) && a.status !== "CLOSED").map((a) => ({ alert: a, elderly: lookups.elderly(a.elderlyId) })),
      soon,
      openLogs: d.careLogDays.filter((c) => ids.has(c.elderlyId) && c.status === "OPEN" && (c.date < TODAY || st({ id: c.elderlyId }) === "LEFT")).map((c) => ({ ...c, elderly: lookups.elderly(c.elderlyId) })),
      note: shift.find((s) => s.note)?.note,
      team: shift.flatMap((s) => d.shiftAssignments.filter((a) => a.shiftId === s.id && a.status === "APPROVED" && a.staffId !== me.id).map((a) => ({ user: lookups.user(a.staffId), position: lookups.position(a.staffId), label: s.label }))),
    };
  },

  // ---------------------------------------------------------------- S2 check-in / check-out
  async checkin(me: User) {
    await wait();
    const d = db();
    return staffOf(me).filter((e) => scheduledOn(e.id, TODAY) || attendanceOn(e.id)).map((e) => ({
      elderly: e, a: attendanceOn(e.id), sub: activeSub(e.id), pickups: d.pickups.filter((p) => p.elderlyId === e.id),
      day: d.careLogDays.find((c) => c.elderlyId === e.id && c.date === TODAY),
      absence: d.absences.find((x) => x.elderlyId === e.id && x.status !== "REJECTED" && x.fromDate <= TODAY && x.toDate >= TODAY),
    }));
  },
  async scan(me: User, code: string) {
    await wait(200);
    const e = db().elderly.find((x) => x.qrCode.toLowerCase() === code.trim().toLowerCase());
    if (!e) throw new Error("Không nhận ra mã QR");
    guard(me, e.id);
    return e;
  },
  /** BR-31: subscription must be ACTIVE and the day must belong to the package. */
  async checkIn(me: User, elderlyId: number, manualReason?: string) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    const s = currentSub(elderlyId);
    if (!s || s.status !== "ACTIVE") throw new Error(`Không check-in được: gói đang ở trạng thái ${s ? s.status : "không có"} (BR-31)`);
    if (!scheduledOn(elderlyId, TODAY)) throw new Error("Hôm nay không thuộc lịch của gói (BR-31)");
    let a = attendanceOn(elderlyId);
    if (!a) { a = { id: nextId(d.attendance), elderlyId, date: TODAY, status: "EXPECTED" }; d.attendance.push(a); }
    Object.assign(a, { checkIn: clock(), status: "PRESENT", checkedInBy: me.id, manualReason });
    if (!d.careLogDays.some((c) => c.elderlyId === elderlyId && c.date === TODAY)) d.careLogDays.push({ elderlyId, date: TODAY, status: "OPEN" });
    entry(me, elderlyId, "CHECKIN", "Đã đến trung tâm", manualReason ? `Check-in hộ (${manualReason})` : "Check-in bằng QR");
    if (manualReason) audit(me.id, `Check-in thủ công ${e.fullName}: ${manualReason}`, "attendance", a.id);
    d.alerts.filter((x) => x.elderlyId === elderlyId && x.source === "RULE" && x.title.includes("chưa đến") && x.status !== "CLOSED").forEach((x) => Object.assign(x, { status: "CLOSED", result: `Cụ đến lúc ${a!.checkIn}` }));
    notify(e.familyUserId, "ATTENDANCE", `${honor(e)} ${e.fullName} đã đến trung tâm`, `Check-in lúc ${a.checkIn}`, "/family");
    commit();
  },
  async markAbsent(me: User, elderlyId: number) {
    await wait();
    const d = db();
    const a = attendanceOn(elderlyId) ?? (() => { const x = { id: nextId(d.attendance), elderlyId, date: TODAY, status: "EXPECTED" as const }; d.attendance.push(x); return x; })();
    a.status = "ABSENT";
    d.dailyTasks = d.dailyTasks.filter((t) => !(t.elderlyId === elderlyId && t.date === TODAY && t.status === "TODO")); // CL-05
    d.medDoses = d.medDoses.filter((m) => !(m.elderlyId === elderlyId && m.date === TODAY && m.status === "PENDING"));
    commit();
  },
  /** BR-30: only hand over to an authorized pickup. */
  async checkOut(me: User, elderlyId: number, pickupId: number) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    const p = need(d.pickups.find((x) => x.id === pickupId && x.elderlyId === elderlyId), "Người đón không có trong danh sách (BR-30)");
    const a = need(attendanceOn(elderlyId), "Cụ chưa check-in");
    Object.assign(a, { checkOut: clock(), status: "LEFT", checkedOutBy: me.id, pickupId });
    entry(me, elderlyId, "CHECKOUT", "Đã về nhà", `Người đón: ${p.fullName} (${p.relationship}) · CCCD …${p.idLast4}`);
    d.dailyTasks.filter((t) => t.elderlyId === elderlyId && t.date === TODAY && t.type === "CHECKOUT").forEach((t) => Object.assign(t, { status: "DONE", doneBy: me.id, doneAt: clock() }));
    const done = d.careLogEntries.filter((x) => x.elderlyId === elderlyId && x.date === TODAY);
    notify(e.familyUserId, "ATTENDANCE", `${honor(e)} ${e.fullName} đã về`, `Đón lúc ${a.checkOut} bởi ${p.fullName}. Hôm nay: ${done.filter((x) => x.kind === "ACTIVITY").length} hoạt động, ${done.filter((x) => x.kind === "PHOTO").length} ảnh.`, "/family/summary");
    commit();
  },
  async strangerPickup(me: User, elderlyId: number, name: string) {
    await wait();
    const e = guard(me, elderlyId);
    entry(me, elderlyId, "NOTE", "Người đón không có trong danh sách", `${name} đến đón. Chưa giao cụ, đã gọi người liên hệ chính.`, { important: true });
    notify(e.familyUserId, "ATTENDANCE", "Có người lạ đến đón cụ", `${name} không có trong danh sách người được phép đón. Trung tâm chưa giao cụ.`, "/family");
    notifyManagers("ATTENDANCE", "Người đón không có trong danh sách", `${e.fullName} · ${name}`);
    commit();
  },

  // ---------------------------------------------------------------- S3 / S4 / S5
  async elderlyToday(me: User) {
    await wait();
    const d = db();
    return staffOf(me).filter((e) => attendanceOn(e.id)?.status === "PRESENT" || attendanceOn(e.id)?.status === "LEFT").map((e) => {
      const tasks = d.dailyTasks.filter((t) => t.elderlyId === e.id && t.date === TODAY);
      const s = activeSub(e.id);
      return {
        elderly: e, sub: s, a: attendanceOn(e.id), progress: tasks.length ? Math.round((tasks.filter((t) => t.status !== "TODO").length / tasks.length) * 100) : 0,
        alerts: d.alerts.filter((a) => a.elderlyId === e.id && a.status !== "CLOSED").length,
        restricted: d.servicePermissions.filter((p) => p.elderlyId === e.id && !p.allowed).length,
        day: d.careLogDays.find((c) => c.elderlyId === e.id && c.date === TODAY),
      };
    });
  },
  /** Lịch hôm nay theo hoạt động: gom việc của các cụ mình phụ trách theo giờ + tên việc, kèm lưu ý riêng từng cụ. */
  async schedule(me: User) {
    await wait();
    const d = db();
    const mine = staffOf(me).filter((e) => attendanceOn(e.id)?.status !== "ABSENT" && (scheduledOn(e.id, TODAY) || !!attendanceOn(e.id)));
    const ids = new Set(mine.map((e) => e.id));
    const tasks = d.dailyTasks.filter((t) => t.date === TODAY && ids.has(t.elderlyId)).sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
    const groups = new Map<string, { key: string; time: string; title: string; type: DailyTask["type"]; owner: DailyTask["owner"]; items: ReturnType<typeof row>[] }>();
    function row(t: DailyTask) {
      const e = need(lookups.elderly(t.elderlyId));
      const notes: string[] = [];
      let blocked = "";
      const perm = t.serviceId ? d.servicePermissions.find((p) => p.elderlyId === e.id && p.serviceId === t.serviceId) : undefined;
      if (perm && !perm.allowed) blocked = `Điều dưỡng không cho phép${perm.reason ? `: ${perm.reason}` : ""}`;
      if (t.type === "MEAL") {
        if (e.diet && e.diet !== "Bình thường") notes.push(`Ăn: ${e.diet}`);
        if (e.allergies.length) notes.push(`Dị ứng: ${e.allergies.join(", ")}`);
        if (e.targetGroup === "STROKE") notes.push("Thức ăn mềm, hỗ trợ khi ăn để phòng sặc");
      } else if (t.type === "MEDICATION") {
        const meds = d.medPlans.filter((m) => m.elderlyId === e.id && m.active && m.times.includes(t.time));
        if (meds.length) notes.push(meds.map((m) => `${m.name} ${m.dose}`).join(" · "));
      } else if (t.type === "VITALS" || t.type === "GLUCOSE") {
        if (e.conditions.length) notes.push(`Bệnh nền: ${e.conditions.join(", ")}`);
        if (e.targetGroup === "STROKE") notes.push("Làm checklist dấu hiệu tái phát");
      } else if (t.type === "ACTIVITY") {
        const lim = e.targetGroup ? GROUP_INFO[e.targetGroup]?.limits : "";
        if (lim && lim !== "—") notes.push(`Hạn chế nhóm: ${lim}`);
      } else if (t.type === "CHECKOUT" && e.targetGroup === "DEMENTIA") notes.push("Kiểm tra kỹ người đón");
      if (e.careNote) notes.push(e.careNote);
      return { task: t, by: lookups.user(t.doneBy), elderly: e, attendance: attendanceOn(e.id)?.status ?? "EXPECTED", notes, blocked };
    }
    for (const t of tasks) {
      const key = `${t.time}|${t.title}|${t.owner}`;
      if (!groups.has(key)) groups.set(key, { key, time: t.time, title: t.title, type: t.type, owner: t.owner, items: [] });
      groups.get(key)!.items.push(row(t));
    }
    return { position: need(lookups.position(me.id)), now: NOW, groups: [...groups.values()], thresholds: d.centerSettings.thresholds };
  },
  async careLog(me: User, elderlyId: number) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    const s = activeSub(elderlyId) ?? currentSub(elderlyId);
    const ent = s ? entitlement(s.tier) : undefined;
    const entries = d.careLogEntries.filter((x) => x.elderlyId === elderlyId && x.date === TODAY).sort((a, b) => b.time.localeCompare(a.time));
    return {
      elderly: e, sub: s, a: attendanceOn(elderlyId), entitlement: ent,
      day: d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === TODAY),
      closer: lookups.user(d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === TODAY)?.closedBy),
      tasks: d.dailyTasks.filter((t) => t.elderlyId === elderlyId && t.date === TODAY).sort((a, b) => a.time.localeCompare(b.time)).map((t) => ({ ...t, by: lookups.user(t.doneBy) })),
      entries: entries.map((x) => ({ ...x, staff: lookups.user(x.staffId) })),
      permissions: d.servicePermissions.filter((p) => p.elderlyId === elderlyId).map((p) => ({ ...p, service: lookups.service(p.serviceId) })),
      choices: s ? choicesOf(s.id).map((id) => lookups.service(id)!) : [],
      photos: entries.filter((x) => x.kind === "PHOTO").length,
      pickups: d.pickups.filter((p) => p.elderlyId === elderlyId),
      meds: d.medPlans.filter((m) => m.elderlyId === elderlyId && m.active),
      latest: metricsOf(elderlyId).filter((m) => m.sys).pop(),
      bed: d.beds.find((b) => b.fixedElderlyId === elderlyId) ?? byId(d.beds, d.bedAssignments.find((b) => b.date === TODAY && b.elderlyId === elderlyId)?.bedId),
      thresholds: d.centerSettings.thresholds,
      belongings: d.belongings.filter((b) => b.elderlyId === elderlyId && !b.returnedAt),
    };
  },
  async setTask(me: User, taskId: number, status: DailyTask["status"], skipReason?: string) {
    await wait(60);
    const t = need(byId(db().dailyTasks, taskId));
    guard(me, t.elderlyId);
    if (attendanceOn(t.elderlyId)?.status !== "PRESENT") throw new Error("Chỉ ghi cho cụ đang có mặt (CL-01)");
    if (t.owner === "NURSE" && !isNurse(me)) throw new Error("Việc này do điều dưỡng làm (CL-03)");
    if (status === "SKIPPED" && !skipReason?.trim()) throw new Error("Bỏ qua phải ghi lý do (CL-02)");
    Object.assign(t, { status, skipReason, doneBy: status === "TODO" ? undefined : me.id, doneAt: status === "TODO" ? undefined : clock() });
    commit();
  },
  /** S5: one care-log entry. Photos respect the tier limit (CL-04); nurse-only kinds (CL-03). */
  async addEntry(me: User, elderlyId: number, input: { kind: CareLogEntry["kind"]; title: string; detail: string; important?: boolean; tone?: "blue" | "orange" | "green" }) {
    await wait(80);
    const d = db();
    const e = guard(me, elderlyId);
    if (attendanceOn(elderlyId)?.status !== "PRESENT") throw new Error("Chỉ ghi care log cho cụ đã check-in hôm nay (CL-01)");
    if (d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === TODAY)?.status === "CLOSED") throw new Error("Care log đã chốt, chỉ Quản lý được sửa (CL-06)");
    if (["VITALS", "MEDICATION", "INCIDENT"].includes(input.kind) && !isNurse(me)) throw new Error("Chỉ điều dưỡng ghi chỉ số, thuốc, sự cố (CL-03)");
    if (input.kind === "PHOTO") {
      const limit = entitlement(need(activeSub(elderlyId)).tier).photoPerDay;
      const n = d.careLogEntries.filter((x) => x.elderlyId === elderlyId && x.date === TODAY && x.kind === "PHOTO").length;
      if (limit !== null && n >= limit) throw new Error(`Đã đủ ${limit} ảnh/ngày theo hạng của cụ (CL-04)`);
    }
    entry(me, elderlyId, input.kind, input.title, input.detail, { important: input.important, tone: input.tone });
    if (input.kind === "MOOD" && input.detail.startsWith("Kích động")) raise(elderlyId, "RULE", "WARNING", "Tâm trạng kích động", input.detail);
    if (input.kind === "MEAL" && /1\/4|Không ăn/.test(input.detail)) {
      const prev = d.careLogEntries.filter((x) => x.elderlyId === elderlyId && x.kind === "MEAL").slice(-2);
      if (prev.length === 2 && prev.every((x) => /1\/4|Không ăn/.test(x.detail))) raise(elderlyId, "RULE", "WARNING", "Ăn ít 2 bữa liền", input.detail);
    }
    const prefs = d.notificationPrefs.find((p) => p.userId === e.familyUserId)?.off ?? [];
    const key = input.kind === "MEAL" ? "MEAL" : input.kind === "ACTIVITY" ? "ACTIVITY" : input.kind === "PHOTO" ? "PHOTO" : input.kind;
    if (input.important || !prefs.includes(key)) notify(e.familyUserId, "CARE_LOG", `${honor(e)} ${e.fullName}: ${input.title}`, input.detail.slice(0, 70), "/family");
    commit();
  },
  /** S6: one meal/activity for the whole group with defaults, editable per elderly. */
  async groupLog(me: User, input: { kind: "MEAL" | "ACTIVITY"; title: string; rows: { elderlyId: number; detail: string }[] }) {
    await wait();
    for (const r of input.rows) {
      if (attendanceOn(r.elderlyId)?.status !== "PRESENT") continue;
      guard(me, r.elderlyId);
      entry(me, r.elderlyId, input.kind, input.title, r.detail);
      db().dailyTasks.filter((t) => t.elderlyId === r.elderlyId && t.date === TODAY && t.status === "TODO" && t.title.toLowerCase().includes(input.title.toLowerCase().split(",")[0])).forEach((t) => Object.assign(t, { status: "DONE", doneBy: me.id, doneAt: clock() }));
      const e = lookups.elderly(r.elderlyId)!;
      if (!(db().notificationPrefs.find((p) => p.userId === e.familyUserId)?.off ?? []).includes(input.kind)) notify(e.familyUserId, "CARE_LOG", `${honor(e)} ${e.fullName}: ${input.title}`, r.detail, "/family");
    }
    commit();
    return input.rows.length;
  },
  /** CL-06: caregiver closes after the nurse finished vitals & meds; system checks missing tasks. */
  async closeLog(me: User, elderlyId: number) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    if (e.caregiverId !== me.id) throw new Error("Hộ lý phụ trách chính mới chốt care log (CL-06)");
    const todo = d.dailyTasks.filter((t) => t.elderlyId === elderlyId && t.date === TODAY && t.status === "TODO" && t.type !== "CHECKOUT");
    if (todo.length) throw new Error(`Còn ${todo.length} việc chưa làm: ${todo.slice(0, 3).map((t) => `${t.time} ${t.title}`).join(", ")}${todo.length > 3 ? "…" : ""}`);
    const day = need(d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === TODAY));
    Object.assign(day, { status: "CLOSED", closedBy: me.id, closedAt: stamp() });
    commit();
  },

  // ---------------------------------------------------------------- S7 vitals, S8 meds (nurse)
  async vitalsBoard(me: User) {
    await wait();
    const d = db();
    return staffOf(me).filter((e) => attendanceOn(e.id)?.status === "PRESENT").map((e) => {
      const todays = d.healthMetrics.filter((m) => m.elderlyId === e.id && m.at.startsWith(TODAY) && m.sys);
      const s = activeSub(e.id)!;
      const per = e.targetGroup === "STROKE" ? 3 : entitlement(s.tier).vitalsPerDay;
      return { elderly: e, sub: s, todays, per, latest: metricsOf(e.id).filter((m) => m.sys).pop(), due: todays.length < per, diabetic: e.conditions.some((c) => c.includes("Tiểu đường")) };
    });
  },
  async recordVitals(me: User, elderlyId: number, m: Omit<HealthMetric, "id" | "elderlyId" | "at" | "by">) {
    await wait();
    if (!isNurse(me)) throw new Error("Chỉ điều dưỡng ghi chỉ số sức khỏe (BR-32)");
    const d = db();
    const e = guard(me, elderlyId);
    if (attendanceOn(elderlyId)?.status !== "PRESENT") throw new Error("Cụ chưa check-in (CL-01)");
    assertValid(validateVitals({ sys: m.sys, dia: m.dia, pulse: m.pulse, temp: m.temp, spo2: m.spo2, glucose: m.glucose, weight: m.weight }));
    d.healthMetrics.push({ id: nextId(d.healthMetrics), elderlyId, at: stamp(), by: me.id, ...m });
    const parts = [m.sys && `HA ${m.sys}/${m.dia}`, m.pulse && `mạch ${m.pulse}`, m.temp && `${m.temp}°C`, m.spo2 && `SpO₂ ${m.spo2}%`, m.glucose && `ĐH ${m.glucose} mmol/L`, m.weight && `${m.weight}kg`].filter(Boolean).join(" · ");
    const bad = outOfRange(m);
    entry(me, elderlyId, "VITALS", "Chỉ số sức khỏe", parts + (bad.length ? ` — vượt ngưỡng ${bad.join(", ")}` : ""), { important: bad.length > 0 });
    d.dailyTasks.filter((t) => t.elderlyId === elderlyId && t.date === TODAY && (t.type === "VITALS" || (t.type === "GLUCOSE" && m.glucose)) && t.status === "TODO").slice(0, 1).forEach((t) => Object.assign(t, { status: "DONE", doneBy: me.id, doneAt: clock() }));
    if (bad.length) raise(elderlyId, "THRESHOLD", "WARNING", "Chỉ số vượt ngưỡng", parts);
    if (e.targetGroup === "STROKE" && m.strokeChecklistOk === false) raise(elderlyId, "RULE", "URGENT", "Dấu hiệu tái phát tai biến", "Checklist tái phát có dấu hiệu bất thường. Gọi gia đình, cân nhắc chuyển viện.");
    commit();
    return bad;
  },
  async meds(me: User) {
    await wait();
    const d = db();
    const ids = new Set(staffOf(me).map((e) => e.id));
    return d.medDoses.filter((m) => ids.has(m.elderlyId) && m.date === TODAY).sort((a, b) => a.time.localeCompare(b.time)).map((m) => ({
      dose: m, plan: need(byId(d.medPlans, m.planId)), elderly: need(lookups.elderly(m.elderlyId)), overdue: m.status === "PENDING" && mins(NOW) - mins(m.time) >= 30, present: attendanceOn(m.elderlyId)?.status === "PRESENT",
    }));
  },
  async giveDose(me: User, doseId: number, status: "GIVEN" | "REFUSED" | "MISSING", reason?: string) {
    await wait();
    if (!isNurse(me)) throw new Error("Chỉ điều dưỡng cho uống thuốc (CL-03)");
    const d = db();
    const m = need(byId(d.medDoses, doseId));
    guard(me, m.elderlyId);
    if (status !== "GIVEN" && !reason?.trim()) throw new Error("Ghi lý do");
    Object.assign(m, { status, by: me.id, at: clock(), reason });
    const plan = need(byId(d.medPlans, m.planId));
    entry(me, m.elderlyId, "MEDICATION", status === "GIVEN" ? "Đã uống thuốc" : status === "REFUSED" ? "Cụ từ chối thuốc" : "Chưa có thuốc", `${plan.name} ${plan.dose}${reason ? ` · ${reason}` : ""}`, { important: status !== "GIVEN" });
    d.alerts.filter((a) => a.elderlyId === m.elderlyId && a.title.includes("Thuốc quá giờ") && a.status !== "CLOSED").forEach((a) => Object.assign(a, { status: "CLOSED", result: `Đã xử lý lúc ${clock()}` }));
    const refused = d.medDoses.filter((x) => x.elderlyId === m.elderlyId && x.status === "REFUSED").slice(-2);
    if (status === "REFUSED" && refused.length >= 2) raise(m.elderlyId, "RULE", "WARNING", "Từ chối thuốc 2 lần liền", plan.name);
    d.dailyTasks.filter((t) => t.elderlyId === m.elderlyId && t.date === TODAY && t.type === "MEDICATION" && t.time === m.time && t.status === "TODO").forEach((t) => Object.assign(t, status === "GIVEN" ? { status: "DONE", doneBy: me.id, doneAt: clock() } : { status: "SKIPPED", skipReason: reason, doneBy: me.id, doneAt: clock() }));
    commit();
  },

  // ---------------------------------------------------------------- S9 incidents, S10 alerts
  async incidents(me: User) {
    await wait();
    const ids = new Set(staffOf(me).map((e) => e.id));
    return db().incidents.filter((i) => ids.has(i.elderlyId)).sort((a, b) => b.at.localeCompare(a.at)).map((i) => ({ incident: i, elderly: lookups.elderly(i.elderlyId), reporter: lookups.user(i.reportedBy) }));
  },
  async reportIncident(me: User, input: Omit<Incident, "id" | "at" | "reportedBy" | "status"> & { time: string }) {
    await wait();
    const d = db();
    const e = guard(me, input.elderlyId);
    const { time, ...rest } = input;
    const inc: Incident = { id: nextId(d.incidents), at: `${TODAY}T${time}:00`, reportedBy: me.id, status: "OPEN", ...rest };
    d.incidents.unshift(inc);
    if (attendanceOn(e.id)?.status === "PRESENT") entry(me, e.id, "INCIDENT", `Sự cố: ${input.description.slice(0, 40)}`, `${input.action}${input.transfer ? ` · Chuyển viện ${input.transfer.hospital} lúc ${input.transfer.time}` : ""}`, { important: true });
    if (!isNurse(me)) notify(e.nurseId ?? 0, "HEALTH", "Hộ lý báo nhanh sự cố", `${e.fullName}: ${input.description}`, "/staff/incidents");
    raise(e.id, "RULE", input.severity === "HIGH" ? "URGENT" : "WARNING", input.transfer ? "Chuyển viện" : "Có sự cố", input.description);
    commit();
  },
  async alerts(me: User) {
    await wait();
    const ids = new Set(staffOf(me).map((e) => e.id));
    return db().alerts.filter((a) => ids.has(a.elderlyId)).sort((a, b) => b.at.localeCompare(a.at)).map((a) => ({ alert: a, elderly: need(lookups.elderly(a.elderlyId)), handler: lookups.user(a.handledBy) }));
  },
  async handleAlert(me: User, id: number, status: "IN_PROGRESS" | "CLOSED", result?: string) {
    await wait();
    const a = need(byId(db().alerts, id));
    guard(me, a.elderlyId);
    Object.assign(a, { status, handledBy: me.id, result: result ?? a.result });
    commit();
  },

  // ---------------------------------------------------------------- assessments & permissions (nurse)
  async assessments(me: User) {
    await wait();
    const d = db();
    return d.assessments.filter((a) => a.nurseId === me.id).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).map((a) => {
      const e = need(lookups.elderly(a.elderlyId));
      const s = a.subscriptionId ? byId(d.subscriptions, a.subscriptionId) : currentSub(e.id);
      return { assessment: a, approver: lookups.user(a.approvedBy), elderly: e, sub: s, family: lookups.user(e.familyUserId), choices: s ? choicesOf(s.id).map((id) => lookups.service(id)!) : [], permissions: d.servicePermissions.filter((p) => p.elderlyId === e.id) };
    });
  },
  /** Điều dưỡng duyệt là xong (BR-10 bản mới): hệ thống tự áp nhóm, hạng, phụ phí cố định, xử lý khai sai. Quản lý chỉ xem. */
  async submitAssessment(me: User, id: number, input: { barthel: number; group: TargetGroup; baseline: string; docs: string; note: string; notAccepted?: boolean; permissions: { serviceId: number; allowed: boolean; reason: string }[] }) {
    await wait();
    if (!isNurse(me)) throw new Error("Chỉ điều dưỡng đánh giá và duyệt (BR-10)");
    const d = db();
    const a = need(byId(d.assessments, id));
    if (a.status === "APPROVED" && a.kind !== "PERIODIC") throw new Error(`Đã duyệt bởi ${lookups.user(a.approvedBy)?.fullName ?? "—"}, không sửa được`);
    const bErr = validateBarthel(input.barthel);
    if (bErr) throw new Error(bErr);
    const notAccepted = !!input.notAccepted || input.barthel <= BARTHEL_NOT_ACCEPTED;
    Object.assign(a, { barthel: input.barthel, proposedGroup: input.group, baseline: input.baseline, diagnosisDocs: input.docs, nurseNote: input.note, notAccepted, doneAt: stamp(), status: "APPROVED", approvedBy: me.id, approvedAt: stamp() });
    for (const p of input.permissions) {
      d.servicePermissions = d.servicePermissions.filter((x) => !(x.elderlyId === a.elderlyId && x.serviceId === p.serviceId));
      d.servicePermissions.push({ elderlyId: a.elderlyId, serviceId: p.serviceId, allowed: p.allowed, reason: p.reason, nurseId: me.id, date: TODAY });
    }
    const e = need(lookups.elderly(a.elderlyId));
    const sub = a.subscriptionId ? byId(d.subscriptions, a.subscriptionId) : undefined;
    let outcome = "";
    if (a.kind === "PERIODIC") {
      if (e.targetGroup !== input.group) outcome = `Đổi nhóm ${GROUP_LABEL[e.targetGroup ?? e.declaredGroup]} → ${GROUP_LABEL[input.group]}, áp dụng từ kỳ sau (BR-12)`;
      e.targetGroup = input.group;
      commit();
    } else if (a.kind === "FIRST_DAY" && sub) {
      if (notAccepted) {
        sub.violation = "NOT_ACCEPTED";
        const refund = await manager.stopNotAccepted(me, sub.id);
        outcome = `Thuộc diện không nhận: ngừng nhận, hoàn ${refund.toLocaleString("vi-VN")}đ`;
      } else if (input.group !== e.declaredGroup) {
        sub.violation = "WRONG_GROUP";
        await manager.chargeWrongGroup(me, sub.id, input.group, surchargeMonthly(input.group), input.note);
        outcome = `Khai sai nhóm: đã gửi hóa đơn phụ phí + chênh lệch, hạn 3 ngày`;
      } else {
        e.targetGroup = input.group;
        outcome = "Khai đúng";
        commit();
      }
    } else if (sub && sub.status === "PENDING_ASSESSMENT") {
      if (notAccepted) {
        await manager.rejectRegistration(me, sub.id, `Thuộc diện không nhận (BR-18). ${input.note}`);
        outcome = "Không tiếp nhận";
      } else {
        const tier: Tier = tierRank(sub.tier) < tierRank(minTierFor(input.group)) ? minTierFor(input.group) : sub.tier;
        const full = !isDayCycle(sub.cycle) && capacity().find((c) => c.tier === tier)!.full;
        if (full) {
          Object.assign(sub, { targetGroup: input.group, tier });
          e.targetGroup = input.group;
          if (!d.waitlist.some((w) => w.elderlyId === e.id && w.tier === tier && ["WAITING", "HOLDING"].includes(w.status))) d.waitlist.push({ id: nextId(d.waitlist), elderlyId: e.id, tier, requestedAt: stamp(), reason: "FULL", status: "WAITING" });
          notify(e.familyUserId, "SYSTEM", `Đã có kết quả đánh giá: ${e.fullName}`, `Hạng ${TIER_LABEL[tier]} đang hết chỗ, cụ được đưa vào danh sách chờ.`, "/family/packages");
          outcome = `Hạng ${TIER_LABEL[tier]} hết chỗ → danh sách chờ`;
          commit();
        } else {
          const drop = input.permissions.filter((p) => !p.allowed).map((p) => p.serviceId);
          await manager.approveRegistration(me, sub.id, { group: input.group, tier, surcharge: fixedSurcharge(input.group, sub.cycle, sub.dayDates?.length ?? 1), note: `Phụ phí cố định nhóm ${GROUP_LABEL[input.group]}`, dropServiceIds: drop });
          sub.familyConfirmedAt = stamp();
          outcome = `Đã duyệt ${GROUP_LABEL[input.group]} · ${TIER_LABEL[tier]}, gửi gia đình thanh toán`;
          commit();
        }
      }
    } else commit();
    notifyManagers("SYSTEM", `${me.fullName} đã duyệt: ${e.fullName}`, `Barthel ${input.barthel} · ${GROUP_LABEL[input.group]}${outcome ? ` · ${outcome}` : ""}`, "/manager/registrations");
    return outcome;
  },
  async setPermission(me: User, elderlyId: number, serviceId: number, allowed: boolean, reason: string) {
    await wait();
    if (!isNurse(me)) throw new Error("Chỉ điều dưỡng cho phép dịch vụ ⚠ (BR-15)");
    guard(me, elderlyId);
    const d = db();
    d.servicePermissions = d.servicePermissions.filter((x) => !(x.elderlyId === elderlyId && x.serviceId === serviceId));
    d.servicePermissions.push({ elderlyId, serviceId, allowed, reason, nurseId: me.id, date: TODAY });
    commit();
  },

  // ---------------------------------------------------------------- shifts, availability, leave
  async shifts(me: User, dates: string[]) {
    await wait();
    const d = db();
    return {
      mine: d.shiftAssignments.filter((a) => a.staffId === me.id && a.status === "APPROVED").map((a) => byId(d.shifts, a.shiftId)!).filter((s) => dates.includes(s.date)),
      availability: d.availability.filter((a) => a.staffId === me.id && dates.includes(a.date)),
      leaves: d.leaveRequests.filter((l) => l.staffId === me.id).map((l) => ({ ...l, shift: byId(d.shifts, l.shiftId), replacement: lookups.user(l.replacementId) })),
      colleagues: d.users.filter((u) => u.role === "STAFF" && u.id !== me.id && u.status === "ACTIVE" && lookups.position(u.id) === lookups.position(me.id)),
      allShifts: d.shifts.filter((s) => dates.includes(s.date)),
    };
  },
  async saveAvailability(me: User, rows: { date: string; slots: ("Sáng" | "Chiều" | "Trực chờ đón")[] }[]) {
    await wait();
    const d = db();
    for (const r of rows) {
      d.availability = d.availability.filter((a) => !(a.staffId === me.id && a.date === r.date));
      d.availability.push({ staffId: me.id, ...r });
    }
    commit();
  },
  async requestLeave(me: User, input: Pick<LeaveRequest, "kind" | "shiftId" | "reason" | "replacementId">) {
    await wait();
    const d = db();
    d.leaveRequests.unshift({ id: nextId(d.leaveRequests), staffId: me.id, createdAt: stamp(), status: "PENDING", ...input });
    notifyManagers("SHIFT", `${me.fullName} ${input.kind === "LEAVE" ? "xin nghỉ" : "xin đổi ca"}`, input.reason, "/manager/shifts?tab=leave");
    commit();
  },

  // ---------------------------------------------------------------- damage & belongings
  async facilityOptions() {
    await wait(30);
    return { equipment: db().equipment.map((e) => ({ ...e, usable: usable(e), room: lookups.room(e.roomId) })), rooms: db().rooms };
  },
  async myReports(me: User) {
    await wait();
    return db().damageReports.filter((r) => r.reportedBy === me.id).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)).map((r) => ({ report: r, equipment: lookups.equipment(r.equipmentId), room: lookups.room(r.roomId) }));
  },
  async reportDamage(me: User, input: { equipmentId?: number; roomId?: number; quantity: number; description: string }) {
    await wait();
    const d = db();
    if (input.equipmentId) {
      const e = need(lookups.equipment(input.equipmentId));
      if (input.quantity > usable(e)) throw new Error(`Chỉ còn ${usable(e)} ${e.name} dùng được`);
      e.broken += input.quantity;
      if (usable(e) < e.minStock) notifyManagers("FACILITY", `${e.name} dưới định mức`, `Dùng được ${usable(e)}/${e.total}, định mức ${e.minStock}`, "/manager/facilities/equipment");
    }
    d.damageReports.unshift({ id: nextId(d.damageReports), ...input, reportedBy: me.id, reportedAt: stamp(), status: "NEW" });
    notifyManagers("FACILITY", "Báo hỏng mới", input.description.slice(0, 60), "/manager/facilities/damage");
    commit();
  },
  async belongings(me: User) {
    await wait();
    const ids = new Set(staffOf(me).map((e) => e.id));
    return db().belongings.filter((b) => ids.has(b.elderlyId)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map((b) => ({ item: b, elderly: lookups.elderly(b.elderlyId), receiver: lookups.user(b.receivedBy), returner: lookups.user(b.returnedBy) }));
  },
  async addBelonging(me: User, elderlyId: number, item: string) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    d.belongings.unshift({ id: nextId(d.belongings), elderlyId, item, receivedAt: stamp(), receivedBy: me.id, tone: (["blue", "orange", "green"] as const)[d.belongings.length % 3] });
    notify(e.familyUserId, "CARE_LOG", "Trung tâm đã nhận đồ gửi", item, "/family/belongings");
    commit();
  },
  async returnBelonging(me: User, id: number) {
    await wait();
    const b = need(byId(db().belongings, id));
    guard(me, b.elderlyId);
    Object.assign(b, { returnedAt: stamp(), returnedBy: me.id });
    commit();
  },
  myElderly(me: User) {
    return staffOf(me).filter((e) => ["ACTIVE", "PAUSED"].includes(e.status));
  },
  positionLabel(me: User) {
    return POSITION_LABEL[need(lookups.position(me.id))];
  },
};
