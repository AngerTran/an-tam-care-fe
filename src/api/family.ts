// Family API (web + app). G1–G6 of mục 5.11, package registration 4.12, payment & renewal 5.7,
// absence 5.3, pause / termination 5.8–5.9. Family only sees their own elderly.
import type { Cycle, ElderlyMember, MedicationPlan, PaymentMethod, TargetGroup, Tier, User } from "../types/models";
import { CYCLE_MONTHS, GROUP_LABEL, minTierFor, TIER_LABEL, tierRank, TIERS } from "../domain/catalog";
import { addDays, daysBetween } from "../lib/format";
import {
  activeSub, addOnsOf, attendanceOn, audit, byId, capacity, choicesOf, clock, commit, currentSub, db, entitlement, guard, honor, invoicesOf,
  lookups, metricsOf, need, nextId, notify, notifyManagers, nowDoing, NOW, paymentOf, pkgName, priceOfPkg, scheduledOn, stamp, TODAY, wait,
} from "./core";

const mine = (me: User) => db().elderly.filter((e) => e.familyUserId === me.id);
const invNo = (id: number) => `HD-2610-${String(100 + id).padStart(4, "0")}`;
const creditBalance = (me: User) => db().credits.filter((c) => c.familyUserId === me.id && !c.usedInvoiceId).reduce((s, c) => s + c.amount, 0);
const nextMonday = (iso: string) => {
  let d = addDays(iso, 1);
  while (new Date(d + "T00:00:00").getDay() !== 1) d = addDays(d, 1);
  return d;
};
function endOf(cycle: Cycle, start: string) {
  if (cycle === "DAY") return start;
  return addDays(start, 30 * CYCLE_MONTHS[cycle] - 1);
}

export const family = {
  // ---------------------------------------------------------------- relatives
  async relatives(me: User) {
    await wait();
    const d = db();
    return mine(me).map((e) => {
      const s = currentSub(e.id);
      return { elderly: e, sub: s, a: attendanceOn(e.id), doing: nowDoing(e.id), caregiver: lookups.user(e.caregiverId), nurse: lookups.user(e.nurseId), pickups: d.pickups.filter((p) => p.elderlyId === e.id), assessment: d.assessments.filter((a) => a.elderlyId === e.id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0] };
    });
  },
  async relative(me: User, id: number) {
    await wait();
    const e = guard(me, id);
    const d = db();
    return { elderly: e, pickups: d.pickups.filter((p) => p.elderlyId === id), sub: currentSub(id), assessments: d.assessments.filter((a) => a.elderlyId === id && a.status === "APPROVED") };
  },
  async saveRelative(me: User, input: Partial<ElderlyMember> & Pick<ElderlyMember, "fullName" | "dateOfBirth" | "gender" | "address" | "declaredGroup"> & { id?: number }) {
    await wait();
    const d = db();
    const { id, ...rest } = input;
    if (id) {
      const e = guard(me, id);
      if (e.targetGroup && rest.declaredGroup !== e.declaredGroup) delete (rest as Partial<ElderlyMember>).declaredGroup; // locked after assessment
      Object.assign(e, rest);
      commit();
      return id;
    }
    const e: ElderlyMember = { id: nextId(d.elderly), familyUserId: me.id, conditions: [], allergies: [], diet: "", hobbies: "", careNote: "", status: "PENDING", qrCode: `ATC-${String(nextId(d.elderly)).padStart(4, "0")}`, tone: "green", ...rest };
    d.elderly.push(e);
    d.pickups.push({ id: nextId(d.pickups), elderlyId: e.id, fullName: me.fullName, relationship: "Người đăng ký", phone: me.phone, idLast4: "----", isPrimary: true });
    commit();
    return e.id;
  },
  async savePickup(me: User, input: { id?: number; elderlyId: number; fullName: string; relationship: string; phone: string; idLast4: string; isPrimary: boolean }) {
    await wait();
    guard(me, input.elderlyId);
    const d = db();
    if (input.isPrimary) d.pickups.filter((p) => p.elderlyId === input.elderlyId).forEach((p) => (p.isPrimary = false));
    const { id, ...rest } = input;
    if (id) Object.assign(need(byId(d.pickups, id)), rest);
    else d.pickups.push({ id: nextId(d.pickups), ...rest });
    commit();
  },
  async removePickup(me: User, id: number) {
    await wait();
    const d = db();
    const p = need(byId(d.pickups, id));
    guard(me, p.elderlyId);
    if (p.isPrimary) throw new Error("Không xóa người liên hệ chính (BR-02). Đặt người khác làm chính trước.");
    d.pickups = d.pickups.filter((x) => x.id !== id);
    commit();
  },

  // ---------------------------------------------------------------- G1 / G2 / G3 / G4 / G5
  async home(me: User, elderlyId: number) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    const s = currentSub(elderlyId);
    const ent = s ? entitlement(s.tier) : undefined;
    const a = attendanceOn(elderlyId);
    const entries = d.careLogEntries.filter((x) => x.elderlyId === elderlyId && x.date === TODAY).sort((x, y) => y.time.localeCompare(x.time));
    return {
      elderly: e, sub: s, entitlement: ent, a, doing: nowDoing(elderlyId),
      pickup: a?.pickupId ? byId(d.pickups, a.pickupId) : undefined,
      checkedInBy: lookups.user(a?.checkedInBy),
      entries,
      photos: entries.filter((x) => x.kind === "PHOTO"),
      latest: metricsOf(elderlyId).filter((m) => m.sys).pop(),
      next: d.schedules.filter((x) => x.date === TODAY && s && x.tiers.includes(s.tier) && x.startTime > NOW).slice(0, 3),
      therapy: d.therapySlots.filter((x) => x.date === TODAY && x.startTime > NOW && x.bookings.some((b) => b.elderlyId === elderlyId)).map((x) => ({ ...x, service: lookups.service(x.serviceId) })),
      alerts: d.alerts.filter((x) => x.elderlyId === elderlyId && x.status !== "CLOSED" && (x.level === "URGENT" || ent?.aiAlertFamily === "ALL")),
      caregiver: lookups.user(e.caregiverId), nurse: lookups.user(e.nurseId),
      scheduledToday: scheduledOn(elderlyId, TODAY),
      day: d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === TODAY),
    };
  },
  async summary(me: User, elderlyId: number, date: string) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    const entries = d.careLogEntries.filter((x) => x.elderlyId === elderlyId && x.date === date).sort((a, b) => a.time.localeCompare(b.time));
    const by = (k: string) => entries.filter((x) => x.kind === k);
    return {
      elderly: e, date, a: attendanceOn(elderlyId, date), day: d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === date),
      meals: by("MEAL"), activities: by("ACTIVITY"), moods: by("MOOD"), vitals: d.healthMetrics.filter((m) => m.elderlyId === elderlyId && m.at.startsWith(date)),
      meds: d.medDoses.filter((m) => m.elderlyId === elderlyId && m.date === date).map((m) => ({ ...m, plan: byId(d.medPlans, m.planId) })),
      notes: entries.filter((x) => x.important || x.kind === "NOTE" || x.kind === "INCIDENT"), photos: by("PHOTO"), naps: by("NAP"),
      pickup: byId(d.pickups, attendanceOn(elderlyId, date)?.pickupId),
      dates: [...new Set(d.careLogEntries.filter((x) => x.elderlyId === elderlyId).map((x) => x.date))].sort().reverse(),
    };
  },
  async health(me: User, elderlyId: number) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    const s = currentSub(elderlyId);
    return {
      elderly: e, sub: s, metrics: metricsOf(elderlyId).filter((m) => m.at >= addDays(TODAY, -30)), thresholds: d.centerSettings.thresholds,
      doses: d.medDoses.filter((m) => m.elderlyId === elderlyId).map((m) => ({ ...m, plan: byId(d.medPlans, m.planId) })),
      monthlyReport: s ? entitlement(s.tier).monthlyHealthReport : false,
    };
  },
  async alerts(me: User) {
    await wait();
    const d = db();
    const ids = new Set(mine(me).map((e) => e.id));
    const allowed = (elderlyId: number, level: string) => level === "URGENT" || (currentSub(elderlyId) && entitlement(currentSub(elderlyId)!.tier).aiAlertFamily === "ALL");
    return {
      alerts: d.alerts.filter((a) => ids.has(a.elderlyId) && allowed(a.elderlyId, a.level)).sort((a, b) => b.at.localeCompare(a.at)).map((a) => ({ alert: a, elderly: lookups.elderly(a.elderlyId), hidden: false })),
      hidden: d.alerts.filter((a) => ids.has(a.elderlyId) && !allowed(a.elderlyId, a.level)).length,
      incidents: d.incidents.filter((i) => ids.has(i.elderlyId)).sort((a, b) => b.at.localeCompare(a.at)).map((i) => ({ incident: i, elderly: lookups.elderly(i.elderlyId) })),
    };
  },
  async meds(me: User, elderlyId: number) {
    await wait();
    guard(me, elderlyId);
    const d = db();
    return { plans: d.medPlans.filter((m) => m.elderlyId === elderlyId).sort((a, b) => Number(b.active) - Number(a.active)), today: d.medDoses.filter((m) => m.elderlyId === elderlyId && m.date === TODAY).map((m) => ({ ...m, plan: byId(d.medPlans, m.planId), nurse: lookups.user(m.by) })) };
  },
  async saveMed(me: User, input: Omit<MedicationPlan, "id" | "active"> & { replaceId?: number }) {
    await wait();
    const e = guard(me, input.elderlyId);
    const d = db();
    const { replaceId, ...rest } = input;
    if (replaceId) { const old = need(byId(d.medPlans, replaceId)); old.active = false; old.endDate = addDays(rest.startDate, -1); }
    d.medPlans.push({ id: nextId(d.medPlans), ...rest, active: true });
    if (e.nurseId) notify(e.nurseId, "HEALTH", `Gia đình ${replaceId ? "đổi" : "thêm"} thuốc: ${e.fullName}`, `${rest.name} ${rest.dose} · ${rest.times.join(", ")}`, "/staff/meds");
    commit();
  },
  async stopMed(me: User, id: number) {
    await wait();
    const m = need(byId(db().medPlans, id));
    guard(me, m.elderlyId);
    Object.assign(m, { active: false, endDate: TODAY });
    commit();
  },

  // ---------------------------------------------------------------- registration wizard (4.12)
  async registerOptions(me: User) {
    await wait();
    const d = db();
    return {
      elderly: mine(me).filter((e) => e.status !== "TERMINATED").map((e) => ({ elderly: e, sub: currentSub(e.id), assessed: !!e.targetGroup })),
      packages: d.packages.filter((p) => p.status === "ACTIVE"), entitlements: d.entitlements, services: d.services.filter((s) => s.status === "ACTIVE"),
      capacity: capacity(), credit: creditBalance(me),
    };
  },
  async register(me: User, input: { elderlyId: number; cycle: Cycle; group: TargetGroup; tier: Tier; choiceIds: number[]; addOns: { serviceId: number; quantity: number }[]; startDate: string; weekdays?: number[]; dayDates?: string[]; commit: boolean }) {
    await wait();
    const d = db();
    const e = guard(me, input.elderlyId);
    if (!input.commit) throw new Error("Vui lòng đọc Quy định dịch vụ và tích cam kết khai đúng (BR-79)");
    const cur = currentSub(e.id);
    if (cur && ["PENDING_ASSESSMENT", "AWAITING_PAYMENT"].includes(cur.status)) throw new Error("Cụ đang có một đăng ký chờ xử lý");
    const group = e.targetGroup ?? input.group;
    if (tierRank(input.tier) < tierRank(minTierFor(group))) throw new Error(`Nhóm ${GROUP_LABEL[group]} cần hạng từ ${TIER_LABEL[minTierFor(group)]} (BR-11)`);
    const ent = entitlement(input.tier);
    if (input.choiceIds.length > ent.optionalMax) throw new Error(`Hạng ${TIER_LABEL[input.tier]} chọn tối đa ${ent.optionalMax} hoạt động (BR-13)`);
    const cap = capacity().find((c) => c.tier === input.tier)!;
    if (input.cycle !== "DAY" && cap.full) throw new Error(`FULL:${input.tier}`);
    const dayDates = input.cycle === "DAY" ? [...(input.dayDates ?? [])].sort() : undefined;
    const start = dayDates?.[0] ?? input.startDate;
    const end = dayDates ? dayDates[dayDates.length - 1] : endOf(input.cycle, start);
    const base = input.cycle === "DAY" ? priceOfPkg(input.tier, "DAY") * (dayDates?.length ?? 1) : priceOfPkg(input.tier, input.cycle);
    // Already assessed → no new assessment; previous negotiated surcharge carries over, family still confirms (4.12)
    const prev = d.subscriptions.filter((s) => s.elderlyId === e.id && s.targetGroup === group && s.familyConfirmedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const assessed = !!e.targetGroup;
    // BR-79: "Vận động được" + commitment → pay online now, nurse checks on the first morning
    const online = !assessed && group === "MOBILE";
    const months = Math.max(1, CYCLE_MONTHS[input.cycle]);
    const surcharge = assessed && prev ? Math.round((prev.surchargeAmount / Math.max(1, CYCLE_MONTHS[prev.cycle])) * months) : 0;
    const id = nextId(d.subscriptions);
    d.subscriptions.push({
      id, elderlyId: e.id, packageId: need(d.packages.find((p) => p.tier === input.tier && p.cycle === input.cycle)).id, targetGroup: group, tier: input.tier, cycle: input.cycle,
      weekdays: input.cycle === "M3" ? input.weekdays : undefined, dayDates, startDate: start, endDate: end, basePrice: base, discount: 0, surchargeAmount: surcharge,
      surchargeNote: surcharge ? `Giữ mức đã thỏa thuận kỳ trước (${prev?.surchargeNote ?? ""})` : undefined, status: assessed || online ? "AWAITING_PAYMENT" : "PENDING_ASSESSMENT", createdAt: stamp(), createdBy: me.id, previousId: cur?.id,
      commitmentAt: stamp(), familyConfirmedAt: assessed || online ? stamp() : undefined,
    });
    input.choiceIds.forEach((serviceId) => d.serviceChoices.push({ subscriptionId: id, serviceId, effectiveFrom: start }));
    input.addOns.forEach((a) => { const sv = need(lookups.service(a.serviceId)); d.addOns.push({ id: nextId(d.addOns), subscriptionId: id, serviceId: a.serviceId, quantity: a.quantity, price: (sv.addonPrice ?? 0) * a.quantity, createdAt: stamp() }); });
    let invoiceId: number | undefined;
    if (online) {
      e.declaredGroup = group;
      const nurse = d.users.find((u) => lookups.position(u.id) === "NURSE");
      d.assessments.push({ id: nextId(d.assessments), elderlyId: e.id, subscriptionId: id, kind: "FIRST_DAY", scheduledAt: `${start}T08:00:00`, nurseId: nurse?.id, status: "SCHEDULED" });
      if (nurse) notify(nurse.id, "SYSTEM", "Kiểm tra ngày đầu (đăng ký online)", `${e.fullName} · ${start.slice(8)}/${start.slice(5, 7)} khi cụ đến`, "/staff/assessments");
    }
    if (!assessed && !online) {
      e.declaredGroup = input.group;
      let day = addDays(TODAY, 1);
      while (new Date(day + "T00:00:00").getDay() === 0) day = addDays(day, 1);
      const nurse = d.users.find((u) => lookups.position(u.id) === "NURSE");
      d.assessments.push({ id: nextId(d.assessments), elderlyId: e.id, subscriptionId: id, kind: "INITIAL", scheduledAt: `${day}T09:00:00`, nurseId: nurse?.id, status: "SCHEDULED" });
      notify(me.id, "SYSTEM", `Đã đặt lịch đánh giá cho ${honor(e).toLowerCase()} ${e.fullName}`, `${day.slice(8)}/${day.slice(5, 7)} lúc 09:00 tại phòng y tế. Mang theo giấy ra viện / sổ khám nếu có.`);
      if (nurse) notify(nurse.id, "SYSTEM", "Lịch đánh giá đầu vào", `${e.fullName} · ${day.slice(8)}/${day.slice(5, 7)} 09:00`, "/staff/assessments");
    } else if (assessed || online) {
      const s = need(byId(d.subscriptions, id));
      const lines = [{ label: `${pkgName(s)}`, amount: base }];
      if (surcharge) lines.push({ label: `Phụ phí nhóm ${GROUP_LABEL[group]}`, amount: surcharge });
      for (const ad of addOnsOf(id)) lines.push({ label: `${ad.service?.name} × ${ad.quantity}`, amount: ad.price });
      const iid = nextId(d.invoices);
      invoiceId = iid;
      d.invoices.push({ id: iid, subscriptionId: id, number: invNo(iid), kind: cur && !online ? "RENEWAL" : "NEW", lines, creditUsed: 0, total: lines.reduce((x, l) => x + l.amount, 0), issueDate: TODAY, dueDate: addDays(TODAY, 3), status: "UNPAID" });
    }
    notifyManagers("SYSTEM", "Đăng ký gói mới", `${e.fullName} · ${pkgName({ tier: input.tier, cycle: input.cycle })} · ${GROUP_LABEL[group]}`, "/manager/registrations");
    commit();
    return { subId: id, assessed, online, invoiceId };
  },
  async joinWaitlist(me: User, elderlyId: number, tier: Tier, reason: "FULL" | "UPGRADE" = "FULL") {
    await wait();
    const d = db();
    guard(me, elderlyId);
    if (d.waitlist.some((w) => w.elderlyId === elderlyId && w.tier === tier && ["WAITING", "HOLDING"].includes(w.status))) throw new Error("Cụ đã ở trong danh sách chờ hạng này");
    d.waitlist.push({ id: nextId(d.waitlist), elderlyId, tier, requestedAt: stamp(), reason, status: "WAITING" });
    const pos = d.waitlist.filter((w) => w.tier === tier && w.status === "WAITING").length;
    notifyManagers("SYSTEM", "Danh sách chờ mới", `${lookups.elderly(elderlyId)?.fullName} · hạng ${TIER_LABEL[tier]}`, "/manager/waitlist");
    commit();
    return pos;
  },

  // ---------------------------------------------------------------- my packages, pay, renew, upgrade (5.7, 4.4)
  async packages(me: User) {
    await wait();
    const d = db();
    return {
      rows: mine(me).filter((e) => e.status !== "TERMINATED" || d.subscriptions.some((s) => s.elderlyId === e.id && s.status === "TERMINATED")).map((e) => {
        const s = currentSub(e.id) ?? d.subscriptions.filter((x) => x.elderlyId === e.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        const invs = s ? invoicesOf(s.id) : [];
        return {
          elderly: e, sub: s, entitlement: s ? entitlement(s.tier) : undefined,
          choices: s ? choicesOf(s.id).map((id) => need(lookups.service(id))) : [], addOns: s ? addOnsOf(s.id) : [],
          invoices: invs.map((i) => ({ invoice: i, payment: paymentOf(i.id) })),
          unpaid: invs.filter((i) => i.status === "UNPAID"),
          assessment: d.assessments.filter((a) => a.elderlyId === e.id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0],
          waitlist: d.waitlist.filter((w) => w.elderlyId === e.id && ["WAITING", "HOLDING"].includes(w.status)).map((w) => ({ ...w, pos: d.waitlist.filter((x) => x.tier === w.tier && ["WAITING", "HOLDING"].includes(x.status)).sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || a.requestedAt.localeCompare(b.requestedAt)).findIndex((x) => x.id === w.id) + 1 })),
          pauses: s ? d.pauses.filter((p) => p.subscriptionId === s.id) : [],
          daysLeft: s ? daysBetween(TODAY, s.endDate) : 0,
          permissions: d.servicePermissions.filter((p) => p.elderlyId === e.id),
          bed: d.beds.find((b) => b.fixedElderlyId === e.id),
        };
      }),
      credit: creditBalance(me),
      capacity: capacity(),
    };
  },
  async confirmPrice(me: User, subId: number) {
    await wait();
    const s = need(byId(db().subscriptions, subId));
    guard(me, s.elderlyId);
    s.familyConfirmedAt = stamp();
    commit();
    return invoicesOf(s.id).find((i) => i.status === "UNPAID")?.id;
  },
  async pay(me: User, invoiceId: number, method: PaymentMethod, useCredit: boolean, fail = false) {
    await wait(800);
    const d = db();
    const inv = need(byId(d.invoices, invoiceId));
    const s = need(byId(d.subscriptions, inv.subscriptionId));
    const e = guard(me, s.elderlyId);
    if (s.status === "AWAITING_PAYMENT" && !s.familyConfirmedAt && inv.kind !== "ADDON") throw new Error("Vui lòng xác nhận giá cuối trước khi thanh toán (BR-17)");
    if (useCredit && !inv.creditUsed) {
      const avail = d.credits.filter((c) => c.familyUserId === me.id && !c.usedInvoiceId);
      const used = Math.min(inv.total, avail.reduce((x, c) => x + c.amount, 0));
      if (used > 0) { inv.creditUsed = used; inv.total -= used; avail.forEach((c) => (c.usedInvoiceId = inv.id)); }
    }
    const code = `${method === "VNPAY" ? "VNP" : "MOMO"}-${89000 + nextId(d.payments)}`;
    if (fail) {
      d.payments.push({ id: nextId(d.payments), invoiceId, payerId: me.id, amount: inv.total, method, transactionCode: code, status: "FAILED", paidAt: stamp() });
      commit();
      return { ok: false as const };
    }
    const p = { id: nextId(d.payments), invoiceId, payerId: me.id, amount: inv.total, method, transactionCode: code, status: "SUCCESS" as const, paidAt: stamp() };
    d.payments.push(p);
    inv.status = "PAID";
    // callback IPN → subscription state (5.1 bước 5, 5.7)
    if (s.status === "AWAITING_PAYMENT") {
      const prev = s.previousId ? byId(d.subscriptions, s.previousId) : undefined;
      if (prev && prev.status === "ACTIVE" && prev.endDate >= s.startDate) prev.status = "EXPIRED";
      s.status = "ACTIVE";
      e.status = "ACTIVE";
      if (!e.targetGroup) e.targetGroup = s.targetGroup; // provisional until the first-day check (BR-79)
      const w = d.waitlist.find((x) => x.elderlyId === e.id && x.tier === s.tier && ["WAITING", "HOLDING"].includes(x.status));
      if (w) w.status = "CONVERTED";
      if (s.tier === "PREMIUM" && !d.beds.some((b) => b.fixedElderlyId === e.id)) {
        const free = d.beds.find((b) => b.tier === "PREMIUM" && !b.fixedElderlyId && b.status === "ACTIVE" && lookups.room(b.roomId)?.status === "ACTIVE");
        if (free) free.fixedElderlyId = e.id;
      }
      notifyManagers("PAYMENT", "Đã thanh toán, gói chuyển hiệu lực", `${e.fullName} · ${pkgName(s)} · ${inv.number}`, "/manager/registrations");
    } else if (inv.kind === "VIOLATION" && s.status === "SUSPENDED") {
      s.status = "ACTIVE";
      e.status = "ACTIVE";
    } else if (inv.kind === "RENEWAL") {
      s.endDate = endOf(s.cycle, addDays(s.endDate, 1));
      if (s.status === "SUSPENDED") { s.status = "ACTIVE"; e.status = "ACTIVE"; }
    } else if (inv.kind === "UPGRADE") {
      const target = inv.lines[0].label.includes("Cao cấp") ? "PREMIUM" : "STANDARD";
      s.tier = target;
      s.packageId = need(d.packages.find((x) => x.tier === target && x.cycle === s.cycle)).id;
      const w = d.waitlist.find((x) => x.elderlyId === e.id && x.tier === target && ["WAITING", "HOLDING"].includes(x.status));
      if (w) w.status = "CONVERTED";
    }
    notify(me.id, "PAYMENT", "Thanh toán thành công", `${inv.number} · ${p.transactionCode}`, `/family/invoices/${inv.id}`);
    audit(null, `Callback ${method} thành công ${code}`, "payments", p.id);
    commit();
    return { ok: true as const, payment: p };
  },
  async renew(me: User, subId: number) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    guard(me, s.elderlyId);
    const open = invoicesOf(s.id).find((i) => i.kind === "RENEWAL" && i.status === "UNPAID");
    if (open) return open.id;
    if (s.cycle === "DAY") throw new Error("Gói ngày: đặt thêm ngày bằng cách đăng ký gói mới");
    const start = addDays(s.endDate, 1);
    const months = Math.max(1, CYCLE_MONTHS[s.cycle]);
    const lines = [{ label: `${pkgName(s)} (${start.slice(8)}/${start.slice(5, 7)}–${endOf(s.cycle, start).slice(8)}/${endOf(s.cycle, start).slice(5, 7)})`, amount: priceOfPkg(s.tier, s.cycle) }];
    if (s.surchargeAmount) lines.push({ label: `Phụ phí nhóm ${GROUP_LABEL[s.targetGroup]}`, amount: Math.round((s.surchargeAmount / Math.max(1, CYCLE_MONTHS[s.cycle])) * months) });
    const id = nextId(d.invoices);
    d.invoices.push({ id, subscriptionId: s.id, number: invNo(id), kind: "RENEWAL", lines, creditUsed: 0, total: lines.reduce((x, l) => x + l.amount, 0), issueDate: TODAY, dueDate: s.endDate, status: "UNPAID" });
    commit();
    return id;
  },
  /** Nâng hạng: hiệu lực ngay, trả phần chênh lệch cho số ngày còn lại (4.4). Hết chỗ → danh sách chờ (4.7). */
  async upgrade(me: User, subId: number, tier: Tier) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    guard(me, s.elderlyId);
    if (tierRank(tier) <= tierRank(s.tier)) throw new Error("Hạ hạng có hiệu lực từ kỳ sau — chọn khi gia hạn");
    if (capacity().find((c) => c.tier === tier)!.full) {
      await family.joinWaitlist(me, s.elderlyId, tier, "UPGRADE");
      return { waitlisted: true as const };
    }
    const left = Math.max(1, daysBetween(TODAY, s.endDate) + 1);
    const total = Math.max(1, daysBetween(s.startDate, s.endDate) + 1);
    const diff = Math.round(((priceOfPkg(tier, s.cycle) - priceOfPkg(s.tier, s.cycle)) * left) / total / 1000) * 1000;
    const id = nextId(d.invoices);
    d.invoices.push({ id, subscriptionId: s.id, number: invNo(id), kind: "UPGRADE", lines: [{ label: `Nâng hạng ${TIER_LABEL[s.tier]} → ${TIER_LABEL[tier]} (${left} ngày còn lại)`, amount: diff }], creditUsed: 0, total: diff, issueDate: TODAY, dueDate: addDays(TODAY, 1), status: "UNPAID" });
    commit();
    return { waitlisted: false as const, invoiceId: id };
  },
  /** BR-13: change optional activities, effective next week. */
  async changeChoices(me: User, subId: number, ids: number[]) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    const e = guard(me, s.elderlyId);
    const max = entitlement(s.tier).optionalMax;
    if (ids.length > max) throw new Error(`Tối đa ${max} hoạt động`);
    const from = nextMonday(TODAY);
    d.serviceChoices = d.serviceChoices.filter((c) => c.subscriptionId !== subId).concat(ids.map((serviceId) => ({ subscriptionId: subId, serviceId, effectiveFrom: from })));
    if (e.nurseId) notify(e.nurseId, "SYSTEM", "Gia đình đổi hoạt động tự chọn", `${e.fullName} · hiệu lực ${from.slice(8)}/${from.slice(5, 7)}`);
    commit();
    return from;
  },
  async buyAddOn(me: User, subId: number, serviceId: number, quantity: number) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    guard(me, s.elderlyId);
    const sv = need(lookups.service(serviceId));
    if (sv.quota[s.tier] === null) throw new Error("Dịch vụ không áp dụng cho hạng này");
    d.addOns.push({ id: nextId(d.addOns), subscriptionId: subId, serviceId, quantity, price: (sv.addonPrice ?? 0) * quantity, createdAt: stamp() });
    const id = nextId(d.invoices);
    d.invoices.push({ id, subscriptionId: subId, number: invNo(id), kind: "ADDON", lines: [{ label: `${sv.name} × ${quantity} ${sv.addonUnit}`, amount: (sv.addonPrice ?? 0) * quantity }], creditUsed: 0, total: (sv.addonPrice ?? 0) * quantity, issueDate: TODAY, dueDate: addDays(TODAY, 3), status: "UNPAID" });
    commit();
    return id;
  },
  async requestPause(me: User, input: { subId: number; kind: "HOSPITAL" | "DEATH"; fromDate: string; toDate?: string; document: string; note: string }) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, input.subId));
    const e = guard(me, s.elderlyId);
    if (input.kind === "HOSPITAL" && input.toDate && daysBetween(input.fromDate, input.toDate) + 1 > d.centerSettings.maxPauseDays) throw new Error(`Bảo lưu tối đa ${d.centerSettings.maxPauseDays} ngày (BR-22)`);
    if (!input.document) throw new Error("Đính kèm giấy tờ (giấy nhập viện / giấy chứng tử)");
    d.pauses.unshift({ id: nextId(d.pauses), subscriptionId: s.id, kind: input.kind, fromDate: input.fromDate, toDate: input.toDate, document: input.document, note: input.note, requestedBy: me.id, createdAt: stamp(), status: "PENDING" });
    notifyManagers("SYSTEM", input.kind === "HOSPITAL" ? "Yêu cầu bảo lưu" : "Gia đình báo cụ qua đời", e.fullName, "/manager/pauses");
    commit();
  },

  // ---------------------------------------------------------------- invoices & credit
  async invoices(me: User) {
    await wait();
    const d = db();
    const ids = new Set(mine(me).map((e) => e.id));
    return {
      rows: d.invoices.filter((i) => ids.has(byId(d.subscriptions, i.subscriptionId)?.elderlyId ?? -1)).sort((a, b) => b.issueDate.localeCompare(a.issueDate)).map((i) => {
        const s = need(byId(d.subscriptions, i.subscriptionId));
        return { invoice: i, sub: s, elderly: lookups.elderly(s.elderlyId), payment: paymentOf(i.id), refunds: d.refunds.filter((r) => r.subscriptionId === s.id) };
      }),
      credits: d.credits.filter((c) => c.familyUserId === me.id).map((c) => ({ ...c, elderly: lookups.elderly(c.elderlyId) })),
      balance: creditBalance(me),
    };
  },
  creditBalance,

  // ---------------------------------------------------------------- absence (5.3, BR-21)
  async absences(me: User) {
    await wait();
    const ids = new Set(mine(me).map((e) => e.id));
    return db().absences.filter((a) => ids.has(a.elderlyId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((a) => ({ absence: a, elderly: lookups.elderly(a.elderlyId) }));
  },
  async reportAbsence(me: User, input: { elderlyId: number; fromDate: string; toDate: string; reason: string; note: string }) {
    await wait();
    const d = db();
    const e = guard(me, input.elderlyId);
    const s = activeSub(e.id);
    if (!s) throw new Error("Cụ chưa có gói đang hiệu lực");
    let credit = 0;
    if (s.cycle === "DAY") {
      // BR-21: báo trước 17h ngày hôm trước → giữ tiền thành số dư
      const inTime = input.fromDate > addDays(TODAY, 1) || (input.fromDate === addDays(TODAY, 1) && clock() < d.centerSettings.dayCancelCutoff);
      const booked = (s.dayDates ?? []).filter((x) => x >= input.fromDate && x <= input.toDate);
      if (inTime) credit = booked.length * priceOfPkg(s.tier, "DAY");
    }
    const id = nextId(d.absences);
    d.absences.unshift({ id, ...input, requestedBy: me.id, createdAt: stamp(), creditAmount: credit, status: s.cycle === "DAY" && credit ? "APPROVED" : "PENDING" });
    if (credit) d.credits.push({ id: nextId(d.credits), familyUserId: me.id, elderlyId: e.id, amount: credit, reason: `Báo nghỉ gói ngày ${input.fromDate} đúng hạn`, createdAt: stamp() });
    notifyManagers("ATTENDANCE", "Báo nghỉ từ gia đình", `${e.fullName} · ${input.fromDate.slice(8)}/${input.fromDate.slice(5, 7)}${input.toDate !== input.fromDate ? `–${input.toDate.slice(8)}/${input.toDate.slice(5, 7)}` : ""}`, "/manager/absences");
    commit();
    return { credit, cycle: s.cycle };
  },

  // ---------------------------------------------------------------- schedule, belongings, prefs
  async schedule(me: User, elderlyId: number, dates: string[]) {
    await wait();
    const d = db();
    const e = guard(me, elderlyId);
    const s = currentSub(elderlyId);
    const ch = s ? choicesOf(s.id) : [];
    return {
      elderly: e, sub: s,
      items: d.schedules.filter((x) => dates.includes(x.date)).map((x) => ({ ...x, room: lookups.room(x.roomId), forMe: !!s && x.tiers.includes(s.tier) && (!x.serviceId || x.serviceId < 11 || ch.includes(x.serviceId)) })),
      menus: d.menus.filter((m) => dates.includes(m.date) && m.status === "APPROVED"),
      therapy: d.therapySlots.filter((x) => dates.includes(x.date) && x.bookings.some((b) => b.elderlyId === elderlyId)).map((x) => ({ ...x, service: lookups.service(x.serviceId), room: lookups.room(x.roomId), mine: x.bookings.find((b) => b.elderlyId === elderlyId) })),
      bed: d.beds.find((b) => b.fixedElderlyId === elderlyId) ?? byId(d.beds, d.bedAssignments.find((b) => b.date === TODAY && b.elderlyId === elderlyId)?.bedId),
      bedRoom: lookups.room((d.beds.find((b) => b.fixedElderlyId === elderlyId) ?? byId(d.beds, d.bedAssignments.find((b) => b.date === TODAY && b.elderlyId === elderlyId)?.bedId))?.roomId),
      holidays: d.holidays,
      scheduledDays: dates.filter((x) => scheduledOn(elderlyId, x)),
      diet: (e.targetGroup === "STROKE" ? "soft" : e.conditions.some((c) => c.includes("Tiểu đường")) ? "lowSugar" : e.conditions.some((c) => c.toLowerCase().includes("huyết áp")) ? "lowSalt" : undefined) as "soft" | "lowSugar" | "lowSalt" | undefined,
    };
  },
  async belongings(me: User) {
    await wait();
    const ids = new Set(mine(me).map((e) => e.id));
    return db().belongings.filter((b) => ids.has(b.elderlyId)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).map((b) => ({ item: b, elderly: lookups.elderly(b.elderlyId), receiver: lookups.user(b.receivedBy) }));
  },
  async prefs(me: User) {
    await wait(30);
    return db().notificationPrefs.find((p) => p.userId === me.id)?.off ?? [];
  },
  async savePrefs(me: User, off: string[]) {
    await wait();
    const d = db();
    d.notificationPrefs = d.notificationPrefs.filter((p) => p.userId !== me.id).concat({ userId: me.id, off });
    commit();
  },
  tiers: TIERS,
};
