// Center Manager API (web). Covers M1–M5, registrations & assessment approval, packages, facilities,
// shifts, finance and reports (mục 3, 4, 5, 7).
import type {
  ActivitySchedule, CatalogStatus, CenterSettings, Cycle, CycleDef, GroupDef, ElderlyMember, Equipment, Incident, Menu, NapBed, Room, Service, TargetGroup,
  Tier, TierDef, TierEntitlement, User,
} from "../types/models";
import { ALL_CYCLES, ALL_GROUPS, ALL_TIERS, CYCLE_LABEL, cycleDef, cycleMonths, entitlementFixedBed, GROUP_LABEL, groupDef, isDayCycle, minTierFor, monthCycle, TIER_LABEL, tierDef, tierRank, VIOLATION_KEEP } from "../domain/catalog";
import { addDays, daysBetween } from "../lib/format";
import {
  activeSub, addOnsOf, attendanceOn, audit, byId, capacity, choicesOf, clock, commit, currentSub, db, entitlement, honor, invoicesOf, lookups, metricsOf, need,
  nextId, notify, notifyAdmins, NOW, paymentOf, requireRole, pkgName, priceOfPkg, scheduledOn, stamp, surchargeMonthly, fixedSurcharge, TODAY, usable, wait,
} from "./core";

const elderlyRow = (e: ElderlyMember) => {
  const sub = currentSub(e.id);
  return { elderly: e, sub, family: lookups.user(e.familyUserId), caregiver: lookups.user(e.caregiverId), nurse: lookups.user(e.nurseId), att: attendanceOn(e.id) };
};
const pending30 = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const [nh, nm] = NOW.split(":").map(Number);
  return nh * 60 + nm - (h * 60 + m) >= 30;
};
const invNo = (id: number) => `HD-2610-${String(100 + id).padStart(4, "0")}`;

const round1k = (n: number) => Math.round(n / 1000) * 1000;
const newCode = (prefix: string, taken: string[]) => { let i = taken.length + 1; while (taken.includes(`${prefix}${i}`)) i++; return `${prefix}${i}`; };
function checkLabel(v: string, others: string[], what: string) {
  const s = (v ?? "").trim();
  if (s.length < 2) throw new Error(`${what} tối thiểu 2 ký tự`);
  if (s.length > 40) throw new Error(`${what} tối đa 40 ký tự`);
  if (others.some((o) => o.toLowerCase() === s.toLowerCase())) throw new Error(`${what} "${s}" đã có`);
  return s;
}
/** Lý do không xóa được (đã có dữ liệu tham chiếu). Rỗng = xóa được. */
const catalogUse = {
  tier: (t: Tier) => {
    const d = db();
    const n = d.subscriptions.filter((s) => s.tier === t).length;
    if (n) return `đã có ${n} đăng ký`;
    const b = d.beds.filter((x) => x.tier === t).length;
    if (b) return `còn ${b} giường gán cho hạng này`;
    if (d.waitlist.some((w) => w.tier === t)) return "đang có trong danh sách chờ";
    const g = d.groupDefs.filter((x) => x.minTier === t).map((x) => x.label);
    if (g.length) return `là hạng tối thiểu của nhóm ${g.join(", ")}`;
    return "";
  },
  cycle: (c: Cycle) => {
    const n = db().subscriptions.filter((s) => s.cycle === c).length;
    return n ? `đã có ${n} đăng ký` : "";
  },
  group: (g: TargetGroup) => {
    const d = db();
    const e = d.elderly.filter((x) => x.targetGroup === g || x.declaredGroup === g).length;
    if (e) return `đang gắn với ${e} hồ sơ cụ`;
    const s = d.subscriptions.filter((x) => x.targetGroup === g).length;
    if (s) return `đã có ${s} đăng ký`;
    if (d.assessments.some((a) => a.proposedGroup === g)) return "có trong kết quả đánh giá";
    return "";
  },
};

export const manager = {
  // ---------------------------------------------------------------- M1
  async dashboard() {
    await wait();
    const d = db();
    const expected = d.elderly.filter((e) => scheduledOn(e.id, TODAY));
    const att = expected.map((e) => ({ e, a: attendanceOn(e.id) }));
    const present = att.filter((x) => x.a?.status === "PRESENT");
    const notArrived = att.filter((x) => !x.a || x.a.status === "EXPECTED");
    const reported = d.absences.filter((a) => a.status !== "REJECTED" && a.fromDate <= TODAY && a.toDate >= TODAY);
    const left = att.filter((x) => x.a?.status === "LEFT");
    const waitingPickup = NOW >= d.centerSettings.careEnd ? present : [];
    const openDays = d.careLogDays.filter((c) => c.status === "OPEN" && c.date <= TODAY);
    const overdueMeds = d.medDoses.filter((m) => m.date === TODAY && m.status === "PENDING" && pending30(m.time));
    const revenue = d.payments.filter((p) => p.status === "SUCCESS" && p.paidAt >= "2026-10-01").reduce((s, p) => s + p.amount, 0);
    const lowEquip = d.equipment.filter((x) => usable(x) < x.minStock);
    return {
      counts: { expected: expected.length, present: present.length, notArrived: notArrived.length, reported: reported.length, left: left.length, waiting: waitingPickup.length },
      notArrived: notArrived.map((x) => ({ elderly: x.e, family: lookups.user(x.e.familyUserId) })),
      openLogs: openDays.filter((c) => c.date < TODAY).length + openDays.filter((c) => c.date === TODAY).length,
      openLogsPast: openDays.filter((c) => c.date < TODAY).map((c) => ({ ...c, elderly: lookups.elderly(c.elderlyId) })),
      incidents: d.incidents.filter((i) => i.status === "OPEN").map((i) => ({ incident: i, elderly: lookups.elderly(i.elderlyId) })),
      alerts: d.alerts.filter((a) => a.status !== "CLOSED").sort((a, b) => b.at.localeCompare(a.at)).map((a) => ({ alert: a, elderly: lookups.elderly(a.elderlyId), handler: lookups.user(a.handledBy) })),
      overdueMeds: overdueMeds.map((m) => ({ dose: m, plan: byId(d.medPlans, m.planId), elderly: lookups.elderly(m.elderlyId) })),
      capacity: capacity(),
      revenue,
      todo: {
        assessToday: d.assessments.filter((a) => a.status === "SCHEDULED" && a.scheduledAt.startsWith(TODAY)).length,
        awaitingPay: d.subscriptions.filter((s) => s.status === "AWAITING_PAYMENT").length,
        absences: d.absences.filter((a) => a.status === "PENDING").length,
        pauses: d.pauses.filter((p) => p.status === "PENDING").length,
        leaves: d.leaveRequests.filter((l) => l.status === "PENDING").length,
        damage: d.damageReports.filter((r) => r.status === "NEW").length,
        lowEquip: lowEquip.length,
        waitlist: d.waitlist.filter((w) => w.status === "WAITING" || w.status === "HOLDING").length,
        aiShifts: d.shiftAssignments.filter((a) => a.status === "SUGGESTED").length,
        aiMenus: d.menus.filter((m) => m.status === "AI_SUGGESTED").length,
        visits: d.visits.filter((v) => v.status === "NEW").length,
        handoffs: d.messages.filter((m) => m.channel === "CHATBOT_HANDOFF" && !m.isRead && lookups.user(m.receiverId)?.role === "MANAGER").length,
        report: d.reports.filter((r) => !r.sentAt).length,
      },
      lowEquip,
      closedRooms: d.rooms.filter((r) => r.status === "CLOSED"),
    };
  },

  // ---------------------------------------------------------------- elderly
  async members() {
    await wait();
    return db().elderly.filter((e) => e.status !== "PENDING").map(elderlyRow);
  },
  async member(id: number) {
    await wait();
    const d = db();
    const e = need(lookups.elderly(id));
    const row = elderlyRow(e);
    const sub = row.sub;
    const days = Array.from({ length: 14 }, (_, i) => addDays(TODAY, -i));
    const fixedBed = d.beds.find((b) => b.fixedElderlyId === id);
    const todayBed = d.bedAssignments.find((b) => b.date === TODAY && b.elderlyId === id);
    return {
      ...row,
      pickups: d.pickups.filter((p) => p.elderlyId === id),
      choices: sub ? choicesOf(sub.id).map((sid) => need(lookups.service(sid))) : [],
      addOns: sub ? addOnsOf(sub.id) : [],
      permissions: d.servicePermissions.filter((p) => p.elderlyId === id).map((p) => ({ ...p, service: lookups.service(p.serviceId), nurse: lookups.user(p.nurseId) })),
      assessments: d.assessments.filter((a) => a.elderlyId === id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).map((a) => ({ ...a, nurse: lookups.user(a.nurseId), approver: lookups.user(a.approvedBy) })),
      subs: d.subscriptions.filter((s) => s.elderlyId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      invoices: d.subscriptions.filter((s) => s.elderlyId === id).flatMap((s) => invoicesOf(s.id)).sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
      attendance: days.map((date) => ({ date, a: attendanceOn(id, date), scheduled: scheduledOn(id, date) })),
      metrics: metricsOf(id).slice(-20).reverse(),
      meds: d.medPlans.filter((m) => m.elderlyId === id),
      belongings: d.belongings.filter((b) => b.elderlyId === id),
      incidents: d.incidents.filter((i) => i.elderlyId === id),
      alerts: d.alerts.filter((a) => a.elderlyId === id),
      bed: fixedBed ?? (todayBed ? byId(d.beds, todayBed.bedId) : undefined),
      fixed: !!fixedBed,
      careDays: d.careLogDays.filter((c) => c.elderlyId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7),
      compensations: d.compensations.filter((c) => c.elderlyId === id),
      waitlist: d.waitlist.filter((w) => w.elderlyId === id && (w.status === "WAITING" || w.status === "HOLDING")),
    };
  },
  async saveMember(me: User, id: number, input: Partial<Pick<ElderlyMember, "fullName" | "dateOfBirth" | "gender" | "address" | "phone" | "conditions" | "allergies" | "diet" | "hobbies" | "careNote" | "caregiverId" | "nurseId">>) {
    await wait();
    const e = need(lookups.elderly(id));
    const before = { cg: e.caregiverId, nu: e.nurseId };
    Object.assign(e, input);
    if (input.caregiverId && input.caregiverId !== before.cg) notify(input.caregiverId, "SYSTEM", "Phân công phụ trách mới", `${honor(e)} ${e.fullName}`);
    if (input.nurseId && input.nurseId !== before.nu) notify(input.nurseId, "SYSTEM", "Phân công phụ trách mới", `${honor(e)} ${e.fullName}`);
    audit(me.id, `Cập nhật hồ sơ ${e.fullName}`, "elderly_members", e.id);
    commit();
  },
  async staffOptions() {
    await wait(30);
    return db().users.filter((u) => u.role === "STAFF" && u.status !== "LOCKED").map((u) => ({ user: u, position: need(lookups.position(u.id)) }));
  },

  // ---------------------------------------------------------------- registrations, assessment approval (5.1, 4.12)
  async registrations() {
    await wait();
    const d = db();
    // BR-80: violation invoice unpaid after 3 days → system suspends the package (no Manager action needed)
    for (const s of d.subscriptions.filter((x) => x.violation === "WRONG_GROUP" && x.status === "ACTIVE")) {
      const vi = invoicesOf(s.id).find((i) => i.kind === "VIOLATION" && i.status === "UNPAID");
      if (vi && vi.dueDate < TODAY) {
        s.status = "SUSPENDED";
        need(lookups.elderly(s.elderlyId)).status = "SUSPENDED";
        audit(null, `Tự tạm ngưng: quá hạn trả phụ phí sau kiểm tra (${vi.number})`, "subscriptions", s.id);
        commit();
      }
    }
    const rows = d.subscriptions
      .filter((s) => ["PENDING_ASSESSMENT", "AWAITING_PAYMENT", "REJECTED"].includes(s.status) || (s.createdAt >= "2026-10-01" && ["ACTIVE", "SUSPENDED"].includes(s.status)) || !!s.violation)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((s) => {
        const e = need(lookups.elderly(s.elderlyId));
        const assessment = d.assessments.filter((a) => a.subscriptionId === s.id).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))[0];
        const invoice = invoicesOf(s.id).find((i) => i.kind !== "ADDON" && i.kind !== "VIOLATION");
        const vinv = invoicesOf(s.id).find((i) => i.kind === "VIOLATION");
        const stage =
          s.status === "REJECTED" || s.status === "TERMINATED" ? "REJECTED"
          : s.violation === "WRONG_GROUP" && vinv?.status === "UNPAID" ? "VIOLATION"
          : s.status === "PENDING_ASSESSMENT" ? (assessment?.status === "APPROVED" ? "WAIT" : "ASSESS")
          : s.status === "AWAITING_PAYMENT" ? "PAY"
          : "DONE";
        const approver = lookups.user(assessment?.approvedBy);
        const pos = lookups.position(assessment?.approvedBy);
        return {
          violationInvoice: vinv, refund: d.refunds.find((r) => r.subscriptionId === s.id), sub: s, elderly: e, family: lookups.user(e.familyUserId),
          assessment: assessment && { ...assessment, nurse: lookups.user(assessment.nurseId) }, approver, approverPosition: pos === "NURSE" ? "Điều dưỡng" : approver?.role === "MANAGER" ? "Quản lý" : undefined,
          invoice, payment: invoice ? paymentOf(invoice.id) : undefined, failed: invoice ? d.payments.filter((p) => p.invoiceId === invoice.id && p.status === "FAILED") : [],
          choices: choicesOf(s.id).map((id) => need(lookups.service(id))), stage, pickups: d.pickups.filter((p) => p.elderlyId === e.id),
        };
      });
    return { rows, visits: d.visits, capacity: capacity(), nurses: d.users.filter((u) => lookups.position(u.id) === "NURSE") };
  },
  async scheduleAssessment(me: User, subId: number, at: string, nurseId: number) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    let a = d.assessments.find((x) => x.subscriptionId === subId && x.status === "SCHEDULED");
    if (a) Object.assign(a, { scheduledAt: at, nurseId });
    else { a = { id: nextId(d.assessments), elderlyId: s.elderlyId, subscriptionId: subId, kind: "INITIAL", scheduledAt: at, nurseId, status: "SCHEDULED" }; d.assessments.push(a); }
    const e = need(lookups.elderly(s.elderlyId));
    notify(e.familyUserId, "SYSTEM", `Lịch đánh giá đầu vào cho ${honor(e).toLowerCase()} ${e.fullName}`, `${at.slice(8, 10)}/${at.slice(5, 7)} lúc ${at.slice(11, 16)} tại phòng y tế`);
    notify(nurseId, "SYSTEM", "Lịch đánh giá đầu vào", `${e.fullName} · ${at.slice(8, 10)}/${at.slice(5, 7)} ${at.slice(11, 16)}`, "/staff/assessments");
    audit(me.id, `Đặt lịch đánh giá ${e.fullName}`, "assessments", a.id);
    commit();
  },
  /** Manager chốt đối tượng + phụ phí; hạng Cơ bản bị nâng lên Tiêu chuẩn nếu thuộc nhóm bệnh (BR-11, BR-17). */
  async approveRegistration(me: User, subId: number, input: { group: TargetGroup; tier: Tier; surcharge: number; note: string; dropServiceIds: number[] }) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    const e = need(lookups.elderly(s.elderlyId));
    if (tierRank(input.tier) < tierRank(minTierFor(input.group))) throw new Error(`Nhóm ${GROUP_LABEL[input.group]} cần hạng từ ${TIER_LABEL[minTierFor(input.group)]} trở lên (BR-11)`);
    const cap = capacity().find((c) => c.tier === input.tier)!;
    if (!isDayCycle(s.cycle) && cap.full) throw new Error(`Hạng ${TIER_LABEL[input.tier]} đã hết chỗ. Chuyển gia đình vào danh sách chờ (BR-71).`);
    const changedTier = input.tier !== s.tier;
    s.tier = input.tier;
    s.packageId = need(d.packages.find((p) => p.tier === input.tier && p.cycle === s.cycle)).id;
    s.basePrice = isDayCycle(s.cycle) ? priceOfPkg(input.tier, s.cycle) * (s.dayDates?.length ?? 1) : priceOfPkg(input.tier, s.cycle);
    s.targetGroup = input.group;
    s.surchargeAmount = input.surcharge;
    s.surchargeNote = input.note;
    s.status = "AWAITING_PAYMENT";
    s.familyConfirmedAt = undefined;
    d.serviceChoices = d.serviceChoices.filter((c) => !(c.subscriptionId === s.id && input.dropServiceIds.includes(c.serviceId)));
    e.targetGroup = input.group;
    const lines = [{ label: `${pkgName(s)} (${s.startDate.slice(8)}/${s.startDate.slice(5, 7)}–${s.endDate.slice(8)}/${s.endDate.slice(5, 7)})`, amount: s.basePrice }];
    if (s.surchargeAmount) lines.push({ label: `Phụ phí nhóm ${GROUP_LABEL[s.targetGroup]}`, amount: s.surchargeAmount });
    for (const ad of addOnsOf(s.id)) lines.push({ label: `${ad.service?.name} × ${ad.quantity}`, amount: ad.price });
    d.invoices = d.invoices.filter((i) => !(i.subscriptionId === s.id && i.status === "UNPAID"));
    const id = nextId(d.invoices);
    d.invoices.push({ id, subscriptionId: s.id, number: invNo(id), kind: "NEW", lines, creditUsed: 0, total: lines.reduce((x, l) => x + l.amount, 0), issueDate: TODAY, dueDate: addDays(TODAY, 3), status: "UNPAID" });
    notify(e.familyUserId, "PAYMENT", `Đã có kết quả đánh giá của ${honor(e).toLowerCase()} ${e.fullName}`, `Nhóm ${GROUP_LABEL[input.group]}${changedTier ? `, nâng lên hạng ${TIER_LABEL[input.tier]}` : ""}. Vui lòng xác nhận giá cuối và thanh toán.`, "/family/packages");
    audit(me.id, `Duyệt đối tượng ${input.group} + phụ phí ${input.surcharge.toLocaleString("vi-VN")}đ cho ${e.fullName}`, "subscriptions", s.id);
    commit();
  },
  async rejectRegistration(me: User, subId: number, reason: string) {
    await wait();
    const s = need(byId(db().subscriptions, subId));
    const e = need(lookups.elderly(s.elderlyId));
    s.status = "REJECTED";
    s.surchargeNote = reason;
    notify(e.familyUserId, "SYSTEM", `Trung tâm chưa tiếp nhận ${honor(e).toLowerCase()} ${e.fullName}`, reason);
    audit(me.id, `Không tiếp nhận ${e.fullName}: ${reason}`, "subscriptions", s.id);
    commit();
  },
  /** BR-80 quotes: remaining-day share of the surcharge + tier difference, or the 95% refund. */
  violationQuote(subId: number, group: TargetGroup, monthlySurcharge: number) {
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    const total = Math.max(1, daysBetween(s.startDate, s.endDate) + 1);
    const left = Math.max(0, daysBetween(TODAY, s.endDate) + 1);
    const months = Math.max(1, cycleMonths(s.cycle));
    const toTier: Tier = tierRank(s.tier) < tierRank(minTierFor(group)) ? minTierFor(group) : s.tier;
    const round = (n: number) => Math.round(n / 1000) * 1000;
    const surcharge = round((monthlySurcharge * months * left) / total);
    const tierDiff = toTier === s.tier ? 0 : round(((priceOfPkg(toTier, s.cycle) - priceOfPkg(s.tier, s.cycle)) * left) / total);
    return { left, total, toTier, surcharge, tierDiff, sum: surcharge + tierDiff };
  },
  refundQuote(subId: number) {
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    const a = d.assessments.find((x) => x.subscriptionId === subId && x.kind === "FIRST_DAY");
    const firstDay = !!a?.doneAt && a.doneAt.slice(0, 10) === s.startDate;
    // add-on lines ("×") are not refunded (BR-80)
    const paid = invoicesOf(s.id).filter((i) => i.status === "PAID" && i.kind !== "ADDON").reduce((x, i) => x + i.lines.filter((l) => !l.label.includes("×")).reduce((y, l) => y + l.amount, 0), 0);
    const total = Math.max(1, daysBetween(s.startDate, s.endDate) + 1);
    const unused = Math.max(0, daysBetween(TODAY, s.endDate) + 1);
    const base = firstDay ? paid : Math.round((paid * unused) / total);
    return { firstDay, paid, base, unused, total, refund: Math.round((base * (1 - VIOLATION_KEEP)) / 1000) * 1000 };
  },
  async chargeWrongGroup(me: User, subId: number, group: TargetGroup, monthlySurcharge: number, note: string) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    const e = need(lookups.elderly(s.elderlyId));
    const q = manager.violationQuote(subId, group, monthlySurcharge);
    const lines = [{ label: `Phụ phí nhóm ${GROUP_LABEL[group]} (${q.left}/${q.total} ngày còn lại)`, amount: q.surcharge }];
    if (q.tierDiff) lines.push({ label: `Chênh lệch nâng hạng ${TIER_LABEL[s.tier]} → ${TIER_LABEL[q.toTier]} (${q.left} ngày)`, amount: q.tierDiff });
    const id = nextId(d.invoices);
    d.invoices.push({ id, subscriptionId: s.id, number: invNo(id), kind: "VIOLATION", lines, creditUsed: 0, total: q.sum, issueDate: TODAY, dueDate: addDays(TODAY, 3), status: "UNPAID" });
    s.targetGroup = group;
    s.tier = q.toTier;
    s.packageId = need(d.packages.find((p) => p.tier === q.toTier && p.cycle === s.cycle)).id;
    s.surchargeAmount = monthlySurcharge;
    s.surchargeNote = note;
    s.violationHandled = true;
    e.targetGroup = group;
    const a = d.assessments.find((x) => x.subscriptionId === subId && x.kind === "FIRST_DAY");
    if (a) Object.assign(a, { status: "APPROVED", approvedBy: me.id, approvedAt: stamp() });
    notify(e.familyUserId, "PAYMENT", `Kết quả kiểm tra khác khai báo: ${e.fullName}`, `Cụ thuộc nhóm ${GROUP_LABEL[group]}. Vui lòng thanh toán ${q.sum.toLocaleString("vi-VN")}đ trong 3 ngày, quá hạn gói sẽ tạm ngưng (BR-80).`, "/family/packages");
    audit(me.id, `Xử lý vi phạm cam kết ${e.fullName}: ${group}, thu ${q.sum.toLocaleString("vi-VN")}đ`, "subscriptions", s.id);
    commit();
    return id;
  },
  async suspendForViolation(me: User, subId: number) {
    await wait();
    const s = need(byId(db().subscriptions, subId));
    const e = need(lookups.elderly(s.elderlyId));
    s.status = "SUSPENDED";
    e.status = "SUSPENDED";
    notify(e.familyUserId, "PAYMENT", `Gói của ${e.fullName} tạm ngưng`, "Chưa thanh toán phần phụ phí sau kiểm tra trong 3 ngày (BR-80).", "/family/packages");
    audit(me.id, `Tạm ngưng do chưa trả phụ phí vi phạm: ${e.fullName}`, "subscriptions", s.id);
    commit();
  },
  async stopNotAccepted(me: User, subId: number) {
    await wait();
    const d = db();
    const s = need(byId(d.subscriptions, subId));
    const e = need(lookups.elderly(s.elderlyId));
    const q = manager.refundQuote(subId);
    const inv = invoicesOf(s.id).find((i) => i.status === "PAID");
    const pay = inv ? paymentOf(inv.id) : undefined;
    if (pay && q.refund) d.refunds.unshift({ id: nextId(d.refunds), subscriptionId: s.id, paymentId: pay.id, amount: q.refund, reason: `Ngừng nhận: cụ thuộc diện không nhận, khai sai (BR-80). Hoàn 95% ${q.firstDay ? "tổng tiền đã đóng" : "phần chưa dùng"}.`, status: "PENDING", createdAt: stamp(), processedBy: me.id });
    if (pay && q.refund) notifyAdmins("PAYMENT", "Đề nghị hoàn tiền chờ duyệt", `Ngừng nhận (BR-80) · ${q.refund.toLocaleString("vi-VN")}đ`, "/admin/refunds");
    s.status = "TERMINATED";
    s.violationHandled = true;
    e.status = "TERMINATED";
    const a = d.assessments.find((x) => x.subscriptionId === subId && x.kind === "FIRST_DAY");
    if (a) Object.assign(a, { status: "APPROVED", approvedBy: me.id, approvedAt: stamp() });
    notify(e.familyUserId, "PAYMENT", `Trung tâm ngừng nhận ${e.fullName}`, `Cụ thuộc diện trung tâm không nhận. Trung tâm hoàn ${q.refund.toLocaleString("vi-VN")}đ qua cổng thanh toán sau khi chủ trung tâm duyệt (1–3 ngày làm việc).`, "/family/invoices");
    audit(me.id, `Ngừng nhận ${e.fullName} (vi phạm cam kết), hoàn ${q.refund.toLocaleString("vi-VN")}đ`, "subscriptions", s.id);
    commit();
    return q.refund;
  },
  async setVisit(me: User, id: number, status: "CONFIRMED" | "DONE") {
    const v = need(byId(db().visits, id));
    v.status = status;
    commit();
  },

  // ---------------------------------------------------------------- waitlist (4.7, BR-75)
  async waitlist() {
    await wait();
    const d = db();
    const rows = d.waitlist
      .filter((w) => w.status === "WAITING" || w.status === "HOLDING")
      .sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || a.requestedAt.localeCompare(b.requestedAt))
      .map((w, i) => ({ entry: w, pos: i + 1, elderly: need(lookups.elderly(w.elderlyId)), family: lookups.user(lookups.elderly(w.elderlyId)?.familyUserId), sub: currentSub(w.elderlyId) }));
    return { rows, history: d.waitlist.filter((w) => !["WAITING", "HOLDING"].includes(w.status)).map((w) => ({ entry: w, elderly: lookups.elderly(w.elderlyId) })), capacity: capacity() };
  },
  async offerSeat(me: User, id: number) {
    await wait();
    const w = need(byId(db().waitlist, id));
    const cap = capacity().find((c) => c.tier === w.tier)!;
    if (cap.full) throw new Error(`Hạng ${TIER_LABEL[w.tier]} chưa có chỗ trống`);
    w.status = "HOLDING";
    w.holdUntil = `${addDays(TODAY, 1)}T${clock()}:00`;
    const e = need(lookups.elderly(w.elderlyId));
    notify(e.familyUserId, "SYSTEM", `Có chỗ hạng ${TIER_LABEL[w.tier]}`, `Trung tâm giữ chỗ cho ${e.fullName} trong 24 giờ. Vui lòng thanh toán trước ${w.holdUntil.slice(11, 16)} ngày mai.`, "/family/packages");
    audit(me.id, `Giữ chỗ 24h cho ${e.fullName}`, "waitlist_entries", w.id);
    commit();
  },
  async expireHold(me: User, id: number) {
    await wait();
    const w = need(byId(db().waitlist, id));
    w.status = "EXPIRED";
    audit(me.id, "Hết hạn giữ chỗ, chuyển người kế tiếp", "waitlist_entries", w.id);
    commit();
  },

  // ---------------------------------------------------------------- absences, pauses, termination (5.3, 5.8, 5.9)
  async absences() {
    await wait();
    return db().absences.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((a) => {
      const e = need(lookups.elderly(a.elderlyId));
      const s = activeSub(e.id) ?? currentSub(e.id);
      return { absence: a, elderly: e, requester: lookups.user(a.requestedBy), sub: s, days: daysBetween(a.fromDate, a.toDate) + 1 };
    });
  },
  async reviewAbsence(me: User, id: number, approve: boolean) {
    await wait();
    const d = db();
    const a = need(byId(d.absences, id));
    a.status = approve ? "APPROVED" : "REJECTED";
    const e = need(lookups.elderly(a.elderlyId));
    if (approve) {
      d.dailyTasks = d.dailyTasks.filter((t) => !(t.elderlyId === e.id && t.date >= a.fromDate && t.date <= a.toDate && t.status === "TODO"));
      if (a.creditAmount > 0 && !d.credits.some((c) => c.reason.includes(a.fromDate))) d.credits.push({ id: nextId(d.credits), familyUserId: a.requestedBy, elderlyId: e.id, amount: a.creditAmount, reason: `Báo nghỉ gói ngày ${a.fromDate} đúng hạn`, createdAt: stamp() });
    }
    notify(a.requestedBy, "ATTENDANCE", approve ? "Trung tâm đã ghi nhận báo nghỉ" : "Báo nghỉ chưa được ghi nhận", `${e.fullName} · ${a.fromDate.slice(8)}/${a.fromDate.slice(5, 7)}`);
    audit(me.id, `${approve ? "Duyệt" : "Từ chối"} báo nghỉ ${e.fullName}`, "absence_requests", a.id);
    commit();
  },
  async pauses() {
    await wait();
    return db().pauses.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => {
      const s = need(byId(db().subscriptions, p.subscriptionId));
      return { pause: p, sub: s, elderly: need(lookups.elderly(s.elderlyId)), requester: lookups.user(p.requestedBy), paid: invoicesOf(s.id).filter((i) => i.status === "PAID").reduce((x, i) => x + i.total, 0) };
    });
  },
  async reviewPause(me: User, id: number, approve: boolean, refundAmount?: number) {
    await wait();
    const d = db();
    const p = need(byId(d.pauses, id));
    const s = need(byId(d.subscriptions, p.subscriptionId));
    const e = need(lookups.elderly(s.elderlyId));
    p.status = approve ? "APPROVED" : "REJECTED";
    p.reviewedBy = me.id;
    if (approve && p.kind === "HOSPITAL") {
      const days = daysBetween(p.fromDate, p.toDate ?? p.fromDate) + 1;
      if (days > d.centerSettings.maxPauseDays) throw new Error(`Bảo lưu tối đa ${d.centerSettings.maxPauseDays} ngày (BR-22)`);
      s.status = "PAUSED";
      s.pausedUntil = p.toDate;
      s.endDate = addDays(s.endDate, days);
      e.status = "PAUSED";
    }
    if (approve && p.kind === "DEATH") {
      s.status = "TERMINATED";
      e.status = "TERMINATED";
      p.refundAmount = refundAmount ?? 0;
      const inv = invoicesOf(s.id).find((i) => i.status === "PAID");
      const pay = inv ? paymentOf(inv.id) : undefined;
      if (pay && p.refundAmount) d.refunds.unshift({ id: nextId(d.refunds), subscriptionId: s.id, paymentId: pay.id, amount: p.refundAmount, reason: `Cụ qua đời. Hoàn phần chưa dùng của ${pkgName(s)}.`, status: "PENDING", createdAt: stamp(), processedBy: me.id });
      if (pay && p.refundAmount) notifyAdmins("PAYMENT", "Đề nghị hoàn tiền chờ duyệt", `Chấm dứt do cụ qua đời · ${p.refundAmount.toLocaleString("vi-VN")}đ`, "/admin/refunds");
    }
    notify(p.requestedBy, "SYSTEM", approve ? (p.kind === "HOSPITAL" ? "Đã duyệt bảo lưu" : "Đã chấm dứt hợp đồng") : "Yêu cầu chưa được duyệt", e.fullName);
    audit(me.id, `${approve ? "Duyệt" : "Từ chối"} ${p.kind === "HOSPITAL" ? "bảo lưu" : "chấm dứt"} ${e.fullName}`, "subscription_pauses", p.id);
    commit();
  },

  // ---------------------------------------------------------------- packages & services (4.1, 4.2)
  async packages() {
    await wait();
    const d = db();
    const subsUsing = (f: (x: (typeof d.subscriptions)[number]) => boolean) => d.subscriptions.filter(f).length;
    return {
      packages: d.packages.map((p) => ({ pkg: p, active: d.subscriptions.filter((s) => s.packageId === p.id && s.status === "ACTIVE").length, used: subsUsing((s) => s.packageId === p.id) })),
      entitlements: d.entitlements,
      perks: d.perks,
      capacity: capacity(),
      tiers: ALL_TIERS.map((t) => ({ def: need(tierDef(t)), used: subsUsing((s) => s.tier === t), active: subsUsing((s) => s.tier === t && s.status === "ACTIVE"), beds: d.beds.filter((b) => b.tier === t).length, blocker: catalogUse.tier(t) })),
      cycles: ALL_CYCLES.map((c) => ({ def: need(cycleDef(c)), used: subsUsing((s) => s.cycle === c), active: subsUsing((s) => s.cycle === c && s.status === "ACTIVE"), blocker: catalogUse.cycle(c) })),
      groups: ALL_GROUPS.map((g) => ({ def: need(groupDef(g)), group: g, count: d.elderly.filter((e) => e.targetGroup === g && ["ACTIVE", "PAUSED"].includes(e.status)).length, blocker: catalogUse.group(g), monthly: surchargeMonthly(g) })),
    };
  },

  // ---- CRUD hạng / thời hạn / nhóm / quyền lợi (mục 4.1). Đã có người dùng → chỉ ngừng, không xóa.
  async saveTier(me: User, input: { id?: Tier; label: string; tone: TierDef["tone"]; highlight?: boolean; status: CatalogStatus; copyFrom?: Tier; monthlyPrice?: number }) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const label = checkLabel(input.label, d.tierDefs.filter((x) => x.id !== input.id).map((x) => x.label), "Tên hạng");
    if (input.highlight) d.tierDefs.forEach((x) => (x.highlight = false));
    if (input.id) {
      const t = need(tierDef(input.id));
      if (input.status === "HIDDEN" && t.status === "ACTIVE" && d.tierDefs.filter((x) => x.status === "ACTIVE").length <= 1) throw new Error("Phải còn ít nhất một hạng đang bán");
      Object.assign(t, { label, tone: input.tone, highlight: !!input.highlight, status: input.status });
      audit(me.id, `Sửa hạng ${label}`, "tiers");
      commit();
      return t.id;
    }
    const src = input.copyFrom ?? [...d.tierDefs].sort((a, b) => b.rank - a.rank)[0]?.id;
    if (input.monthlyPrice !== undefined && !(input.monthlyPrice > 0)) throw new Error("Nhập giá gói tháng của hạng mới");
    const id = newCode("TIER", d.tierDefs.map((x) => x.id));
    d.tierDefs.push({ id, label, tone: input.tone, rank: Math.max(0, ...d.tierDefs.map((x) => x.rank)) + 1, highlight: !!input.highlight, status: input.status });
    const srcEnt = d.entitlements.find((e) => e.tier === src) ?? d.entitlements[0];
    const srcMonth = d.packages.find((p) => p.tier === src && p.cycle === monthCycle())?.basePrice || 0;
    const ratio = input.monthlyPrice && srcMonth ? input.monthlyPrice / srcMonth : 1;
    d.entitlements.push({ ...srcEnt, tier: id, dailyPrice: round1k(srcEnt.dailyPrice * ratio) });
    for (const c of d.cycleDefs) {
      const sp = d.packages.find((p) => p.tier === src && p.cycle === c.id);
      d.packages.push({ id: nextId(d.packages), tier: id, cycle: c.id, basePrice: round1k((sp?.basePrice ?? 0) * ratio), weekdayOptions: sp?.weekdayOptions, status: "ACTIVE" });
    }
    d.services.forEach((sv) => (sv.quota[id] = src ? sv.quota[src] ?? null : null));
    d.perks.forEach((pk) => (pk.values[id] = src ? pk.values[src] ?? "" : ""));
    audit(me.id, `Thêm hạng ${label} (sao chép quyền lợi từ ${src ? TIER_LABEL[src] : "—"})`, "tiers");
    commit();
    return id;
  },
  async moveTier(me: User, id: Tier, dir: -1 | 1) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const list = [...db().tierDefs].sort((a, b) => a.rank - b.rank);
    const i = list.findIndex((x) => x.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i].rank, list[j].rank] = [list[j].rank, list[i].rank];
    audit(me.id, `Đổi thứ tự hạng ${list[i].label}`, "tiers");
    commit();
  },
  async deleteTier(me: User, id: Tier) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const t = need(tierDef(id));
    const why = catalogUse.tier(id);
    if (why) throw new Error(`Không xóa được hạng ${t.label}: ${why}. Hãy chuyển sang "Ngừng bán".`);
    if (t.status === "ACTIVE" && d.tierDefs.filter((x) => x.status === "ACTIVE").length <= 1) throw new Error("Phải còn ít nhất một hạng đang bán");
    d.tierDefs = d.tierDefs.filter((x) => x.id !== id);
    d.entitlements = d.entitlements.filter((x) => x.tier !== id);
    d.packages = d.packages.filter((x) => x.tier !== id);
    d.services.forEach((sv) => delete sv.quota[id]);
    d.perks.forEach((pk) => delete pk.values[id]);
    audit(me.id, `Xóa hạng ${t.label}`, "tiers");
    commit();
  },

  async saveCycle(me: User, input: { id?: Cycle; label: string; desc: string; kind: CycleDef["kind"]; months: number; discount: number; weekdayOptions?: number[][]; status: CatalogStatus; reprice?: boolean }) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const label = checkLabel(input.label, d.cycleDefs.filter((x) => x.id !== input.id).map((x) => x.label), "Tên thời hạn");
    if (input.kind === "PERIOD" && (!Number.isInteger(input.months) || input.months < 1 || input.months > 24)) throw new Error("Số tháng từ 1 đến 24");
    const months = input.kind === "DAY" ? 0 : input.kind === "WEEKLY" ? 1 : input.months;
    if (!(input.discount >= 0 && input.discount <= 0.5)) throw new Error("Giảm giá từ 0% đến 50%");
    const weekdayOptions = input.kind === "WEEKLY" ? (input.weekdayOptions ?? []).filter((w) => w.length) : undefined;
    if (input.kind === "WEEKLY" && !weekdayOptions?.length) throw new Error("Chọn ít nhất một bộ ngày cố định trong tuần");
    if (weekdayOptions?.some((w) => w.some((x) => x < 1 || x > 6))) throw new Error("Ngày trong tuần chỉ từ T2 đến T7");
    const month = (t: Tier) => d.packages.find((p) => p.tier === t && p.cycle === monthCycle())?.basePrice ?? 0;
    const suggest = (t: Tier) =>
      input.kind === "DAY" ? entitlement(t).dailyPrice
      : input.kind === "WEEKLY" ? round1k(month(t) * (weekdayOptions![0].length / 6) * (1 - input.discount))
      : round1k(month(t) * months * (1 - input.discount));
    if (input.id) {
      const c = need(cycleDef(input.id));
      if (catalogUse.cycle(c.id) && (c.kind !== input.kind || c.months !== months)) throw new Error(`Đã có cụ dùng ${c.label}: không đổi được loại hoặc số tháng, chỉ sửa tên, mô tả, giảm giá, trạng thái`);
      if (c.id === monthCycle() && (input.kind !== "PERIOD" || months !== 1)) throw new Error(`${c.label} là giá tham chiếu (1 tháng), không đổi loại hoặc số tháng`);
      if (input.status === "HIDDEN" && c.status === "ACTIVE" && d.cycleDefs.filter((x) => x.status === "ACTIVE").length <= 1) throw new Error("Phải còn ít nhất một thời hạn đang bán");
      Object.assign(c, { label, desc: input.desc.trim(), kind: input.kind, months, discount: input.discount, weekdayOptions, status: input.status });
      const rows = d.packages.filter((p) => p.cycle === c.id);
      rows.forEach((p) => (p.weekdayOptions = weekdayOptions));
      if (input.reprice && c.id !== monthCycle()) rows.forEach((p) => (p.basePrice = suggest(p.tier)));
      audit(me.id, `Sửa thời hạn ${label}${input.reprice ? " (tính lại giá)" : ""}`, "cycles");
      commit();
      return c.id;
    }
    const id = newCode("CYCLE", d.cycleDefs.map((x) => x.id));
    d.cycleDefs.push({ id, label, desc: input.desc.trim(), kind: input.kind, months, discount: input.discount, weekdayOptions, rank: Math.max(0, ...d.cycleDefs.map((x) => x.rank)) + 1, status: input.status });
    for (const t of d.tierDefs) d.packages.push({ id: nextId(d.packages), tier: t.id, cycle: id, basePrice: suggest(t.id), weekdayOptions, status: "ACTIVE" });
    audit(me.id, `Thêm thời hạn ${label}`, "cycles");
    commit();
    return id;
  },
  async deleteCycle(me: User, id: Cycle) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const c = need(cycleDef(id));
    if (catalogUse.cycle(id)) throw new Error(`Không xóa được ${c.label}: ${catalogUse.cycle(id)}. Hãy chuyển sang "Ngừng bán".`);
    if (id === monthCycle()) throw new Error(`${c.label} là giá tham chiếu cho các thời hạn khác, không xóa được`);
    if (c.status === "ACTIVE" && d.cycleDefs.filter((x) => x.status === "ACTIVE").length <= 1) throw new Error("Phải còn ít nhất một thời hạn đang bán");
    d.cycleDefs = d.cycleDefs.filter((x) => x.id !== id);
    d.packages = d.packages.filter((x) => x.cycle !== id);
    audit(me.id, `Xóa thời hạn ${c.label}`, "cycles");
    commit();
  },

  async saveGroup(me: User, input: Omit<GroupDef, "id" | "rank"> & { id?: TargetGroup; monthly: number }) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const label = checkLabel(input.label, d.groupDefs.filter((x) => x.id !== input.id).map((x) => x.label), "Tên nhóm");
    if (!tierDef(input.minTier)) throw new Error("Chọn hạng tối thiểu");
    if (!input.who.trim()) throw new Error("Nhập mô tả nhóm dành cho ai");
    if (!(input.monthly >= 0) || input.monthly % 1000) throw new Error("Phụ phí tháng là số tiền ≥ 0, làm tròn nghìn đồng");
    if (!(Number.isInteger(input.reassessMonths) && input.reassessMonths >= 1 && input.reassessMonths <= 12)) throw new Error("Chu kỳ đánh giá lại từ 1 đến 12 tháng");
    const fields = { label, tone: input.tone, who: input.who.trim(), care: input.care.map((x) => x.trim()).filter(Boolean), watch: input.watch.trim(), report: input.report.trim(), limits: input.limits.trim() || "—", owner: input.owner.trim(), reassessMonths: input.reassessMonths, minTier: input.minTier, disease: input.disease, status: input.status };
    let id = input.id;
    if (id) {
      const g = need(groupDef(id));
      if (input.status === "HIDDEN" && g.status === "ACTIVE" && d.groupDefs.filter((x) => x.status === "ACTIVE").length <= 1) throw new Error("Phải còn ít nhất một nhóm đang nhận");
      Object.assign(g, fields);
    } else {
      id = newCode("GROUP", d.groupDefs.map((x) => x.id));
      d.groupDefs.push({ id, rank: Math.max(0, ...d.groupDefs.map((x) => x.rank)) + 1, ...fields });
    }
    const row = d.groupSurcharges.find((x) => x.group === id);
    if (row) row.monthly = input.monthly;
    else d.groupSurcharges.push({ group: id, monthly: input.monthly });
    audit(me.id, `${input.id ? "Sửa" : "Thêm"} nhóm ${label} · phụ phí ${input.monthly.toLocaleString("vi-VN")}đ/tháng`, "target_groups");
    commit();
    return id;
  },
  async deleteGroup(me: User, id: TargetGroup) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const g = need(groupDef(id));
    const why = catalogUse.group(id);
    if (why) throw new Error(`Không xóa được nhóm ${g.label}: ${why}. Hãy chuyển sang "Ngừng nhận".`);
    if (g.status === "ACTIVE" && d.groupDefs.filter((x) => x.status === "ACTIVE").length <= 1) throw new Error("Phải còn ít nhất một nhóm đang nhận");
    d.groupDefs = d.groupDefs.filter((x) => x.id !== id);
    d.groupSurcharges = d.groupSurcharges.filter((x) => x.group !== id);
    audit(me.id, `Xóa nhóm ${g.label}`, "target_groups");
    commit();
  },

  async savePerk(me: User, input: { id?: number; label: string; values: Record<Tier, string> }) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const label = checkLabel(input.label, d.perks.filter((x) => x.id !== input.id).map((x) => x.label), "Tên quyền lợi");
    if (input.id) Object.assign(need(byId(d.perks, input.id)), { label, values: input.values });
    else d.perks.push({ id: nextId(d.perks), label, values: input.values });
    audit(me.id, `${input.id ? "Sửa" : "Thêm"} quyền lợi "${label}"`, "package_entitlements");
    commit();
  },
  async deletePerk(me: User, id: number) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const d = db();
    const pk = need(byId(d.perks, id));
    d.perks = d.perks.filter((x) => x.id !== id);
    audit(me.id, `Xóa quyền lợi "${pk.label}"`, "package_entitlements");
    commit();
  },
  async savePrice(me: User, pkgId: number, price: number, status: "ACTIVE" | "HIDDEN") {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const p = need(lookups.pkg(pkgId));
    p.basePrice = price;
    p.status = status;
    audit(me.id, `Đổi giá ${CYCLE_LABEL[p.cycle]} · ${TIER_LABEL[p.tier]} = ${price.toLocaleString("vi-VN")}đ`, "service_packages", p.id);
    commit();
  },
  /** fixed surcharge for one period of a subscription (BR-17) */
  surchargeFor(group: TargetGroup, cycle: Cycle, days = 1) {
    return fixedSurcharge(group, cycle, days);
  },
  monthlySurcharge(group: TargetGroup) {
    return surchargeMonthly(group);
  },
  async saveSurcharge(me: User, group: TargetGroup, monthly: number) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    const row = db().groupSurcharges.find((x) => x.group === group);
    if (row) row.monthly = monthly;
    else db().groupSurcharges.push({ group, monthly });
    audit(me.id, `Đổi phụ phí nhóm ${GROUP_LABEL[group]} = ${monthly.toLocaleString("vi-VN")}đ/tháng`, "group_surcharges");
    commit();
  },
  async saveEntitlement(me: User, tier: Tier, patch: Partial<TierEntitlement>) {
    await wait();
    requireRole(me, "ADMIN", "Đổi gói & giá");
    Object.assign(need(db().entitlements.find((x) => x.tier === tier)), patch);
    audit(me.id, `Sửa quyền lợi hạng ${TIER_LABEL[tier]}`, "package_entitlements");
    commit();
  },
  async services() {
    await wait();
    const d = db();
    return d.services.map((s) => ({ service: s, room: lookups.room(s.roomId), equipment: s.equipmentIds.map((id) => lookups.equipment(id)!).filter(Boolean), users: d.serviceChoices.filter((c) => c.serviceId === s.id && db().subscriptions.find((x) => x.id === c.subscriptionId)?.status === "ACTIVE").length }));
  },
  async saveService(me: User, input: Omit<Service, "id"> & { id?: number }) {
    await wait();
    const d = db();
    const { id, ...rest } = input;
    if (id) Object.assign(need(byId(d.services, id)), rest);
    else d.services.push({ id: nextId(d.services), ...rest });
    audit(me.id, `${id ? "Sửa" : "Thêm"} dịch vụ ${rest.name}`, "services", id);
    commit();
  },
  async deleteService(me: User, id: number) {
    await wait();
    const d = db();
    if (d.serviceChoices.some((c) => c.serviceId === id && byId(d.subscriptions, c.subscriptionId)?.status === "ACTIVE")) throw new Error("Dịch vụ đang có cụ dùng. Chuyển sang Tạm ngừng thay vì xóa.");
    d.services = d.services.filter((s) => s.id !== id);
    audit(me.id, "Xóa dịch vụ", "services", id);
    commit();
  },
  async rooms() {
    await wait(20);
    return db().rooms;
  },
  async equipmentList() {
    await wait(20);
    return db().equipment;
  },

  // ---------------------------------------------------------------- attendance & pickup (5.2, 4.3)
  async attendance(date = TODAY) {
    await wait();
    const d = db();
    const ids = new Set([...d.elderly.filter((e) => scheduledOn(e.id, date)).map((e) => e.id), ...d.attendance.filter((a) => a.date === date).map((a) => a.elderlyId)]);
    return {
      rows: [...ids].map((id) => {
        const e = need(lookups.elderly(id));
        const a = attendanceOn(id, date);
        return { elderly: e, a, sub: activeSub(id) ?? currentSub(id), pickup: a?.pickupId ? byId(d.pickups, a.pickupId) : undefined, absence: d.absences.find((x) => x.elderlyId === id && x.status !== "REJECTED" && x.fromDate <= date && x.toDate >= date), caregiver: lookups.user(e.caregiverId) };
      }),
      settings: d.centerSettings,
      lateIncidents: d.incidents.filter((i) => i.type === "LATE_PICKUP").map((i) => ({ incident: i, elderly: lookups.elderly(i.elderlyId) })),
    };
  },

  // ---------------------------------------------------------------- care log M2/M5 (5.11)
  async careLogDay(date = TODAY) {
    await wait();
    const d = db();
    return d.careLogDays.filter((c) => c.date === date).map((c) => {
      const tasks = d.dailyTasks.filter((t) => t.elderlyId === c.elderlyId && t.date === date);
      const entries = d.careLogEntries.filter((x) => x.elderlyId === c.elderlyId && x.date === date);
      const e = need(lookups.elderly(c.elderlyId));
      return { day: c, elderly: e, sub: currentSub(e.id), caregiver: lookups.user(e.caregiverId), closer: lookups.user(c.closedBy), done: tasks.filter((t) => t.status !== "TODO").length, total: tasks.length, nursePending: tasks.filter((t) => t.owner === "NURSE" && t.status === "TODO").length, important: entries.filter((x) => x.important), photos: entries.filter((x) => x.kind === "PHOTO").length, att: attendanceOn(e.id, date) };
    });
  },
  async careLogDates() {
    await wait(20);
    return [...new Set(db().careLogDays.map((c) => c.date))].sort().reverse();
  },
  async careLog(elderlyId: number, date: string) {
    await wait();
    const d = db();
    const e = need(lookups.elderly(elderlyId));
    const entries = d.careLogEntries.filter((x) => x.elderlyId === elderlyId && x.date === date).sort((a, b) => a.time.localeCompare(b.time));
    return {
      elderly: e, sub: currentSub(e.id), day: d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === date),
      entries: entries.map((x) => ({ ...x, staff: lookups.user(x.staffId), edited: d.careLogEdits.some((ed) => ed.entryId === x.id) })),
      tasks: d.dailyTasks.filter((t) => t.elderlyId === elderlyId && t.date === date).sort((a, b) => a.time.localeCompare(b.time)).map((t) => ({ ...t, by: lookups.user(t.doneBy) })),
      edits: d.careLogEdits.filter((x) => x.elderlyId === elderlyId && x.date === date).map((x) => ({ ...x, editor: lookups.user(x.editedBy) })),
      metrics: d.healthMetrics.filter((m) => m.elderlyId === elderlyId && m.at.startsWith(date)),
      doses: d.medDoses.filter((m) => m.elderlyId === elderlyId && m.date === date).map((m) => ({ ...m, plan: byId(d.medPlans, m.planId) })),
      closer: lookups.user(d.careLogDays.find((c) => c.elderlyId === elderlyId && c.date === date)?.closedBy),
    };
  },
  async closeOnBehalf(me: User, elderlyId: number, date: string) {
    await wait();
    const c = need(db().careLogDays.find((x) => x.elderlyId === elderlyId && x.date === date));
    Object.assign(c, { status: "CLOSED", closedBy: me.id, closedAt: stamp(), closedByManager: true });
    audit(me.id, `Chốt thay care log ${lookups.elderly(elderlyId)?.fullName} ${date}`, "care_log_days");
    commit();
  },
  async editEntry(me: User, entryId: number, detail: string, reason: string) {
    await wait();
    const d = db();
    const x = need(byId(d.careLogEntries, entryId));
    if (!reason.trim()) throw new Error("Bắt buộc ghi lý do sửa (CL-06)");
    d.careLogEdits.push({ id: nextId(d.careLogEdits), entryId, elderlyId: x.elderlyId, date: x.date, editedBy: me.id, editedAt: stamp(), before: x.detail, after: detail, reason });
    x.detail = detail;
    audit(me.id, `Sửa care log đã chốt: ${lookups.elderly(x.elderlyId)?.fullName} ${x.date}`, "care_log_edits");
    commit();
  },

  // ---------------------------------------------------------------- alerts & incidents (5.6, M3)
  async alerts() {
    await wait();
    return db().alerts.sort((a, b) => b.at.localeCompare(a.at)).map((a) => ({ alert: a, elderly: need(lookups.elderly(a.elderlyId)), handler: lookups.user(a.handledBy) }));
  },
  async handleAlert(me: User, id: number, status: "IN_PROGRESS" | "CLOSED", result: string) {
    await wait();
    const a = need(byId(db().alerts, id));
    Object.assign(a, { status, result, handledBy: a.handledBy ?? me.id });
    commit();
  },
  async incidents() {
    await wait();
    return db().incidents.sort((a, b) => b.at.localeCompare(a.at)).map((i) => ({ incident: i, elderly: need(lookups.elderly(i.elderlyId)), reporter: lookups.user(i.reportedBy) }));
  },
  async updateIncident(me: User, id: number, patch: Partial<Incident>) {
    await wait();
    Object.assign(need(byId(db().incidents, id)), patch);
    audit(me.id, "Cập nhật sự cố", "incidents", id);
    commit();
  },

  // ---------------------------------------------------------------- schedule, menu (AI), therapy slots
  async schedule(dates: string[]) {
    await wait();
    const d = db();
    return {
      items: d.schedules.filter((s) => dates.includes(s.date)).map((s) => ({ ...s, room: lookups.room(s.roomId), staff: lookups.user(s.staffId), overCapacity: false, roomClosed: lookups.room(s.roomId)?.status === "CLOSED" })),
      menus: d.menus.filter((m) => dates.includes(m.date)),
      rooms: d.rooms,
      holidays: d.holidays,
    };
  },
  async saveActivity(me: User, input: Omit<ActivitySchedule, "id"> & { id?: number }) {
    await wait();
    const d = db();
    const room = need(lookups.room(input.roomId));
    if (room.status === "CLOSED") throw new Error(`${room.name} đang tạm đóng (BR-73)`);
    const { id, ...rest } = input;
    if (id) Object.assign(need(byId(d.schedules, id)), rest);
    else d.schedules.push({ id: nextId(d.schedules), ...rest });
    commit();
  },
  async deleteActivity(me: User, id: number) {
    await wait();
    db().schedules = db().schedules.filter((s) => s.id !== id);
    commit();
  },
  async saveMenu(me: User, input: Omit<Menu, "id">) {
    await wait();
    const d = db();
    const m = d.menus.find((x) => x.date === input.date);
    if (m) Object.assign(m, input);
    else d.menus.push({ id: nextId(d.menus), ...input });
    commit();
  },
  async approveMenus(me: User, dates: string[]) {
    await wait();
    db().menus.filter((m) => dates.includes(m.date)).forEach((m) => (m.status = "APPROVED"));
    audit(me.id, `Duyệt thực đơn AI ${dates[0]}–${dates[dates.length - 1]}`, "menus");
    commit();
  },
  /** Simulated AI menu: low sugar / low salt / soft variants based on the conditions of active elderly (5.5). */
  async suggestMenus(me: User, dates: string[]) {
    await wait(600);
    const d = db();
    const conds = d.elderly.filter((e) => e.status === "ACTIVE").flatMap((e) => e.conditions).join(" ");
    const B = ["Cháo yến mạch thịt bằm", "Bún gạo lứt nấu cá", "Cháo bí đỏ thịt gà", "Súp nui rau củ", "Bánh canh cá lóc", "Cháo đậu xanh thịt nạc"];
    const L = ["Cơm, cá basa kho tộ ít muối, canh rau dền", "Cơm, ức gà xé trộn rau, canh bầu", "Cơm, đậu hũ non hấp nấm, canh mồng tơi", "Cơm, cá thu sốt cà, canh cải ngọt", "Cơm, thịt heo luộc, canh khổ qua", "Cơm, trứng hấp thịt, canh bí xanh"];
    const S = ["Sữa chua không đường", "Đu đủ chín", "Chè hạt sen ít đường", "Thanh long", "Khoai lang luộc", "Bánh flan ít đường"];
    dates.forEach((date, i) => {
      const input = { date, breakfast: B[i % 6], lunch: L[i % 6], snack: S[i % 6], lowSugar: conds.includes("Tiểu đường") ? "Thay chè bằng trái cây ít ngọt, cơm gạo lứt nửa chén" : "—", lowSalt: conds.includes("huyết áp") ? "Canh, món mặn nêm nhạt; không nước chấm" : "—", soft: d.elderly.some((e) => e.targetGroup === "STROKE" && e.status === "ACTIVE") ? "Cháo/cơm nát, thịt cá xay" : "Cơm nát cho cụ răng yếu", status: "AI_SUGGESTED" as const };
      const m = d.menus.find((x) => x.date === date);
      if (m) Object.assign(m, input);
      else d.menus.push({ id: nextId(d.menus), ...input });
    });
    audit(me.id, "AI gợi ý thực đơn tuần", "menus");
    commit();
  },
  async therapy(date = TODAY) {
    await wait();
    const d = db();
    const cap = (serviceId: number, roomId: number) => {
      const s = need(lookups.service(serviceId));
      const eq = s.equipmentIds.map((id) => need(lookups.equipment(id)));
      const room = need(lookups.room(roomId));
      if (room.status === "CLOSED") return 0;
      return eq.length ? Math.min(serviceId === 11 ? eq.filter((x) => x.id === 6).reduce((n, x) => n + usable(x) * x.concurrent, 0) || usable(eq[0]) : usable(eq[0]) * eq[0].concurrent, room.capacity) : room.capacity;
    };
    const slots = d.therapySlots.filter((s) => s.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)).map((s) => ({ slot: s, service: need(lookups.service(s.serviceId)), room: lookups.room(s.roomId), capacity: cap(s.serviceId, s.roomId), people: s.bookings.map((b) => ({ ...b, elderly: lookups.elderly(b.elderlyId) })) }));
    const present = d.elderly.filter((e) => scheduledOn(e.id, date));
    const need2 = present.map((e) => {
      const s = activeSub(e.id)!;
      const ch = choicesOf(s.id).filter((id) => [11, 12, 13, 14].includes(id));
      const booked = d.therapySlots.filter((x) => x.date === date && x.bookings.some((b) => b.elderlyId === e.id)).map((x) => x.serviceId);
      return { elderly: e, tier: s.tier, wants: ch.map((id) => ({ service: need(lookups.service(id)), quota: lookups.service(id)?.quota[s.tier], booked: booked.includes(id), allowed: d.servicePermissions.find((p) => p.elderlyId === e.id && p.serviceId === id)?.allowed ?? !lookups.service(id)?.needsNurseOk })) };
    });
    return { slots, demand: need2, compensations: d.compensations.map((c) => ({ ...c, elderly: lookups.elderly(c.elderlyId) })) };
  },
  async moveBooking(me: User, fromSlot: number, toSlot: number, elderlyId: number) {
    await wait();
    const d = db();
    const a = need(byId(d.therapySlots, fromSlot));
    const b = need(byId(d.therapySlots, toSlot));
    a.bookings = a.bookings.filter((x) => x.elderlyId !== elderlyId);
    b.bookings.push({ elderlyId, status: "PLANNED" });
    commit();
  },
  async addSlot(me: User, input: { date: string; startTime: string; serviceId: number; roomId: number }) {
    await wait();
    const d = db();
    d.therapySlots.push({ id: nextId(d.therapySlots), ...input, capacity: 0, bookings: [] });
    commit();
  },
  async book(me: User, slotId: number, elderlyId: number, capacityNow: number) {
    await wait();
    const s = need(byId(db().therapySlots, slotId));
    if (s.bookings.length >= capacityNow) throw new Error("Khung đã đủ chỗ theo số thiết bị dùng được (BR-78)");
    if (s.bookings.some((b) => b.elderlyId === elderlyId)) return;
    s.bookings.push({ elderlyId, status: "PLANNED" });
    commit();
  },
  async unbook(me: User, slotId: number, elderlyId: number) {
    await wait();
    const s = need(byId(db().therapySlots, slotId));
    s.bookings = s.bookings.filter((b) => b.elderlyId !== elderlyId);
    commit();
  },

  // ---------------------------------------------------------------- holidays & announcements (BR-25)
  async calendar() {
    await wait();
    const d = db();
    return { holidays: [...d.holidays].sort((a, b) => a.date.localeCompare(b.date)), announcements: [...d.announcements].sort((a, b) => b.sentAt.localeCompare(a.sentAt)) };
  },
  async addHoliday(me: User, date: string, name: string) {
    await wait();
    const d = db();
    d.holidays.push({ id: nextId(d.holidays), date, name, announced: false });
    commit();
  },
  async removeHoliday(me: User, id: number) {
    await wait();
    db().holidays = db().holidays.filter((h) => h.id !== id);
    commit();
  },
  async sendAnnouncement(me: User, input: { title: string; body: string; audience: string; holidayIds?: number[] }) {
    await wait();
    const d = db();
    d.announcements.unshift({ id: nextId(d.announcements), title: input.title, body: input.body, audience: input.audience as "ALL", sentAt: stamp(), sentBy: me.id });
    input.holidayIds?.forEach((id) => { const h = byId(d.holidays, id); if (h) h.announced = true; });
    const fams = new Set(d.elderly.filter((e) => ["ACTIVE", "PAUSED"].includes(e.status)).filter((e) => {
      if (input.audience === "ALL") return true;
      const s = currentSub(e.id);
      return s?.tier === input.audience || e.targetGroup === input.audience;
    }).map((e) => e.familyUserId));
    fams.forEach((f) => notify(f, "SYSTEM", input.title, input.body.slice(0, 80)));
    audit(me.id, `Gửi thông báo "${input.title}" tới ${fams.size} gia đình`, "announcements");
    commit();
    return fams.size;
  },

  // ---------------------------------------------------------------- staff & shifts (5.4)
  async staff() {
    await wait();
    const d = db();
    return d.users.filter((u) => u.role === "STAFF").map((u) => ({
      user: u, profile: d.staffProfiles.find((p) => p.userId === u.id),
      assigned: d.elderly.filter((e) => (e.caregiverId === u.id || e.nurseId === u.id) && ["ACTIVE", "PAUSED"].includes(e.status)),
      shiftsWeek: d.shiftAssignments.filter((a) => a.staffId === u.id && a.status === "APPROVED" && (byId(d.shifts, a.shiftId)?.date ?? "") >= "2026-10-05" && (byId(d.shifts, a.shiftId)?.date ?? "") <= "2026-10-10").length,
    }));
  },
  async saveStaff(me: User, input: { id?: number; fullName: string; email: string; phone: string; position: "NURSE" | "CAREGIVER"; certificate: string; joinedAt: string; elderlyIds?: number[] }) {
    await wait();
    const d = db();
    if (me.role === "MANAGER") {
      // Quản lý chỉ phân công cụ phụ trách; hồ sơ và tài khoản do Admin quản lý
      if (!input.id) throw new Error("Thêm nhân viên mới: chỉ Admin (chủ doanh nghiệp) được làm");
      const u = need(lookups.user(input.id));
      const key = need(d.staffProfiles.find((x) => x.userId === u.id)).position === "NURSE" ? "nurseId" : "caregiverId";
      for (const e of d.elderly) if ((input.elderlyIds ?? []).includes(e.id)) e[key] = u.id;
      audit(me.id, `Phân công cụ cho ${u.fullName}`, "elderly", undefined);
      commit();
      return u.id;
    }
    requireRole(me, "ADMIN", "Sửa hồ sơ nhân viên");
    let u: User;
    if (input.id) {
      u = need(lookups.user(input.id));
      Object.assign(u, { fullName: input.fullName, email: input.email, phone: input.phone });
      Object.assign(need(d.staffProfiles.find((p) => p.userId === u.id)), { position: input.position, certificate: input.certificate, joinedAt: input.joinedAt });
    } else {
      if (d.users.some((x) => x.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Email đã tồn tại");
      u = { id: nextId(d.users), role: "STAFF", fullName: input.fullName, email: input.email, phone: input.phone, password: "demo1234", status: "INVITED" };
      d.users.push(u);
      d.staffProfiles.push({ userId: u.id, position: input.position, certificate: input.certificate, joinedAt: input.joinedAt });
    }
    for (const e of d.elderly) {
      const key = input.position === "NURSE" ? "nurseId" : "caregiverId";
      if (input.elderlyIds?.includes(e.id)) e[key] = u.id;
    }
    audit(me.id, `${input.id ? "Sửa" : "Tạo"} tài khoản nhân viên ${u.fullName}`, "users", u.id);
    commit();
    return u.id;
  },
  async setStaffStatus(me: User, id: number, status: User["status"]) {
    await wait();
    requireRole(me, "ADMIN", "Khóa / mở tài khoản nhân viên");
    need(lookups.user(id)).status = status;
    audit(me.id, `${status === "LOCKED" ? "Khóa" : "Mở"} tài khoản nhân viên`, "users", id);
    commit();
  },
  async shiftWeek(dates: string[]) {
    await wait();
    const d = db();
    const shifts = d.shifts.filter((s) => dates.includes(s.date));
    const ids = new Set(shifts.map((s) => s.id));
    const staff = d.users.filter((u) => u.role === "STAFF" && u.status === "ACTIVE").map((u) => ({ user: u, position: need(lookups.position(u.id)) }));
    const expected = dates.map((date) => ({ date, count: d.elderly.filter((e) => scheduledOn(e.id, date) || (e.status === "ACTIVE" && date > TODAY)).length - d.absences.filter((a) => a.status !== "REJECTED" && a.fromDate <= date && a.toDate >= date).length }));
    return {
      shifts, staff, expected,
      assignments: d.shiftAssignments.filter((a) => ids.has(a.shiftId)),
      availability: d.availability.filter((a) => dates.includes(a.date)),
      leaves: d.leaveRequests.map((l) => ({ ...l, staff: lookups.user(l.staffId), replacement: lookups.user(l.replacementId), shift: byId(d.shifts, l.shiftId) })),
    };
  },
  /** Simulated AI shift suggestion: uses availability, position and ratio by tier (5.4). */
  async generateShifts(me: User, dates: string[]) {
    await wait(700);
    const d = db();
    const shifts = d.shifts.filter((s) => dates.includes(s.date));
    const ids = new Set(shifts.map((s) => s.id));
    d.shiftAssignments = d.shiftAssignments.filter((a) => !ids.has(a.shiftId) || a.status === "APPROVED");
    const load = new Map<number, number>();
    for (const sh of shifts) {
      const avail = d.availability.filter((a) => a.date === sh.date && a.slots.includes(sh.label)).map((a) => a.staffId);
      const taken = new Set(d.shiftAssignments.filter((a) => byId(d.shifts, a.shiftId)?.date === sh.date && a.status !== "REJECTED").map((a) => a.staffId));
      const pick = (pos: "NURSE" | "CAREGIVER", n: number) => {
        const c = avail.filter((id) => lookups.position(id) === pos && !taken.has(id)).sort((a, b) => (load.get(a) ?? 0) - (load.get(b) ?? 0)).slice(0, n);
        for (const staffId of c) {
          taken.add(staffId);
          load.set(staffId, (load.get(staffId) ?? 0) + 1);
          const leave = d.leaveRequests.find((l) => l.staffId === staffId && l.shiftId === sh.id && l.status !== "REJECTED");
          d.shiftAssignments.push({ id: nextId(d.shiftAssignments), shiftId: sh.id, staffId, source: "AI", status: "SUGGESTED", conflict: !!leave, reason: leave ? "Có yêu cầu nghỉ/đổi ca trùng" : `${pos === "NURSE" ? "Điều dưỡng" : "Hộ lý"} rảnh ${sh.label.toLowerCase()}, ${load.get(staffId)} ca trong tuần` });
        }
      };
      pick("NURSE", sh.needNurse);
      pick("CAREGIVER", sh.needCaregiver);
    }
    audit(me.id, "AI gợi ý xếp ca", "shift_assignments");
    commit();
  },
  async reviewAssignment(me: User, id: number, status: "APPROVED" | "REJECTED" | "SUGGESTED") {
    const a = need(byId(db().shiftAssignments, id));
    a.status = status;
    if (status === "APPROVED") {
      const sh = need(byId(db().shifts, a.shiftId));
      notify(a.staffId, "SHIFT", "Lịch ca mới đã duyệt", `Ca ${sh.label.toLowerCase()} ${sh.date.slice(8)}/${sh.date.slice(5, 7)} · ${sh.startTime}–${sh.endTime}`, "/staff/shifts");
    }
    commit();
  },
  async assignManual(me: User, shiftId: number, staffId: number) {
    await wait();
    const d = db();
    d.shiftAssignments.push({ id: nextId(d.shiftAssignments), shiftId, staffId, source: "MANAGER", status: "APPROVED" });
    commit();
  },
  async approveAllShifts(me: User, dates: string[]) {
    await wait();
    const d = db();
    const ids = new Set(d.shifts.filter((s) => dates.includes(s.date)).map((s) => s.id));
    for (const a of d.shiftAssignments.filter((x) => ids.has(x.shiftId) && x.status === "SUGGESTED" && !x.conflict)) await manager.reviewAssignment(me, a.id, "APPROVED");
    audit(me.id, "Duyệt lịch ca tuần", "shift_assignments");
    commit();
  },
  async setShiftNote(me: User, shiftId: number, note: string) {
    need(byId(db().shifts, shiftId)).note = note;
    commit();
  },
  async reviewLeave(me: User, id: number, approve: boolean) {
    await wait();
    const d = db();
    const l = need(byId(d.leaveRequests, id));
    l.status = approve ? "APPROVED" : "REJECTED";
    if (approve) {
      d.shiftAssignments.filter((a) => a.shiftId === l.shiftId && a.staffId === l.staffId).forEach((a) => (a.status = "REJECTED"));
      if (l.replacementId) d.shiftAssignments.push({ id: nextId(d.shiftAssignments), shiftId: l.shiftId, staffId: l.replacementId, source: "MANAGER", status: "APPROVED" });
    }
    notify(l.staffId, "SHIFT", approve ? "Đã duyệt yêu cầu" : "Yêu cầu bị từ chối", l.kind === "LEAVE" ? "Xin nghỉ" : "Đổi ca");
    commit();
  },

  // ---------------------------------------------------------------- facilities (4.5–4.8, 5.10)
  async facilities() {
    await wait();
    const d = db();
    return {
      capacity: capacity(),
      lowEquip: d.equipment.filter((e) => usable(e) < e.minStock),
      closedRooms: d.rooms.filter((r) => r.status === "CLOSED"),
      openDamage: d.damageReports.filter((r) => r.status === "NEW" || r.status === "REPAIRING").map((r) => ({ report: r, equipment: lookups.equipment(r.equipmentId), room: lookups.room(r.roomId), reporter: lookups.user(r.reportedBy) })),
      bedsToday: d.bedAssignments.filter((b) => b.date === TODAY).length,
      rooms: d.rooms.length,
      equipmentTotal: d.equipment.reduce((s, e) => s + e.total, 0),
      equipmentUsable: d.equipment.reduce((s, e) => s + usable(e), 0),
      compensations: d.compensations.map((c) => ({ ...c, elderly: lookups.elderly(c.elderlyId) })),
      secure: { capacity: d.rooms.find((r) => r.zone === "SECURE")?.capacity ?? 0, used: d.elderly.filter((e) => e.targetGroup === "DEMENTIA" && ["ACTIVE", "PAUSED"].includes(e.status)).length },
    };
  },
  async saveRoom(me: User, input: Omit<Room, "id"> & { id?: number }) {
    await wait();
    requireRole(me, "ADMIN", "Thêm / sửa khu và phòng");
    const d = db();
    const { id, ...rest } = input;
    if (id) {
      const r = need(byId(d.rooms, id));
      const closing = r.status === "ACTIVE" && rest.status === "CLOSED";
      Object.assign(r, rest);
      if (closing) {
        const affected = d.schedules.filter((s) => s.roomId === id && s.date >= TODAY).length;
        const premium = d.beds.filter((b) => b.roomId === id && b.fixedElderlyId).map((b) => lookups.elderly(b.fixedElderlyId));
        premium.forEach((e) => e && notify(e.familyUserId, "FACILITY", `${r.name} tạm đóng`, "Cụ được chuyển tạm sang phòng tương đương (BR-73)."));
        audit(me.id, `Tạm đóng ${r.name}: ${affected} lịch hoạt động bị ảnh hưởng`, "rooms", id);
      }
    } else d.rooms.push({ id: nextId(d.rooms), ...rest });
    commit();
  },
  async beds() {
    await wait();
    const d = db();
    return {
      rooms: d.rooms.filter((r) => r.zone === "NAP"),
      beds: d.beds.map((b) => {
        const today = d.bedAssignments.find((a) => a.bedId === b.id && a.date === TODAY);
        return { bed: b, fixed: lookups.elderly(b.fixedElderlyId), today: lookups.elderly(today?.elderlyId) };
      }),
      premium: d.elderly.filter((e) => entitlementFixedBed(currentSub(e.id)?.tier) && ["ACTIVE", "PAUSED"].includes(e.status)),
      unassigned: d.elderly.filter((e) => scheduledOn(e.id, TODAY) && !d.bedAssignments.some((a) => a.date === TODAY && a.elderlyId === e.id) && !d.beds.some((b) => b.fixedElderlyId === e.id)),
    };
  },
  async saveBed(me: User, input: Omit<NapBed, "id"> & { id?: number }) {
    await wait();
    const d = db();
    const { id, ...rest } = input;
    if (id) Object.assign(need(byId(d.beds, id)), rest);
    else d.beds.push({ id: nextId(d.beds), ...rest });
    commit();
  },
  async assignBedToday(me: User, bedId: number, elderlyId: number) {
    await wait();
    const d = db();
    d.bedAssignments = d.bedAssignments.filter((a) => !(a.date === TODAY && (a.bedId === bedId || a.elderlyId === elderlyId)));
    d.bedAssignments.push({ date: TODAY, bedId, elderlyId });
    commit();
  },
  /** Auto daily assignment for non-Premium (4.5). */
  async autoAssignBeds(me: User) {
    await wait(300);
    const d = db();
    const todays = d.elderly.filter((e) => scheduledOn(e.id, TODAY) && !d.beds.some((b) => b.fixedElderlyId === e.id));
    d.bedAssignments = d.bedAssignments.filter((a) => a.date !== TODAY);
    for (const e of todays) {
      const tier = activeSub(e.id)!.tier;
      const free = d.beds.find((b) => b.tier === tier && b.status === "ACTIVE" && !b.fixedElderlyId && lookups.room(b.roomId)?.status === "ACTIVE" && !d.bedAssignments.some((a) => a.date === TODAY && a.bedId === b.id));
      if (free) d.bedAssignments.push({ date: TODAY, bedId: free.id, elderlyId: e.id });
    }
    commit();
  },
  async equipment() {
    await wait();
    const d = db();
    return d.equipment.map((e) => ({ equipment: e, room: lookups.room(e.roomId), usable: usable(e), below: usable(e) < e.minStock, reports: d.damageReports.filter((r) => r.equipmentId === e.id && (r.status === "NEW" || r.status === "REPAIRING")).length }));
  },
  async saveEquipment(me: User, input: Omit<Equipment, "id" | "broken" | "repairing"> & { id?: number }) {
    await wait();
    requireRole(me, "ADMIN", "Thêm / sửa thiết bị");
    const d = db();
    const { id, ...rest } = input;
    if (id) Object.assign(need(byId(d.equipment, id)), rest);
    else d.equipment.push({ id: nextId(d.equipment), broken: 0, repairing: 0, ...rest });
    audit(me.id, `${id ? "Sửa" : "Thêm"} thiết bị ${rest.name}`, "equipment", id);
    commit();
  },
  async importEquipment(me: User, rows: { name: string; category: Equipment["category"]; roomId: number; total: number; minStock: number }[]) {
    await wait(400);
    requireRole(me, "ADMIN", "Nhập thiết bị");
    const d = db();
    rows.forEach((r) => d.equipment.push({ id: nextId(d.equipment), ...r, broken: 0, repairing: 0, concurrent: 1, note: "Nhập từ file Excel" }));
    commit();
    return rows.length;
  },
  async damage() {
    await wait();
    return db().damageReports.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt)).map((r) => ({ report: r, equipment: lookups.equipment(r.equipmentId), room: lookups.room(r.roomId), reporter: lookups.user(r.reportedBy) }));
  },
  /** BR-70: only usable counts move with damage status; disposal reduces the total by hand. */
  async setDamageStatus(me: User, id: number, status: "REPAIRING" | "FIXED" | "DISPOSED") {
    await wait();
    const d = db();
    const r = need(byId(d.damageReports, id));
    if (status === "DISPOSED" && me.role !== "ADMIN") {
      r.disposeRequested = true;
      const eq = lookups.equipment(r.equipmentId);
      notifyAdmins("FACILITY", "Đề nghị thanh lý thiết bị", `${eq?.name ?? "Thiết bị"} × ${r.quantity}: ${r.description.slice(0, 60)}`, "/admin/equipment");
      audit(me.id, `Đề nghị thanh lý ${eq?.name ?? ""} × ${r.quantity}`, "damage_reports", r.id);
      commit();
      return;
    }
    r.disposeRequested = false;
    const e = r.equipmentId ? need(lookups.equipment(r.equipmentId)) : undefined;
    const from = r.status;
    if (e) {
      if (from === "NEW") e.broken = Math.max(0, e.broken - r.quantity);
      if (from === "REPAIRING") e.repairing = Math.max(0, e.repairing - r.quantity);
      if (status === "REPAIRING") e.repairing += r.quantity;
      if (status === "DISPOSED") e.total = Math.max(0, e.total - r.quantity);
      if (usable(e) < e.minStock) notify(me.id, "FACILITY", `${e.name} dưới định mức`, `Dùng được ${usable(e)}/${e.total}, định mức ${e.minStock}`);
    }
    if (r.roomId && status === "FIXED") {
      const room = need(lookups.room(r.roomId));
      room.status = "ACTIVE";
      room.closedReason = undefined;
    }
    Object.assign(r, { status, handledBy: me.id });
    audit(me.id, `Báo hỏng #${id}: ${status}`, "damage_reports", id);
    commit();
  },
  async inventory() {
    await wait();
    return db().inventoryChecks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async inventoryCheck(id: number) {
    await wait();
    const c = need(byId(db().inventoryChecks, id));
    return { check: c, items: c.items.map((i) => ({ ...i, equipment: need(lookups.equipment(i.equipmentId)) })) };
  },
  async createInventory(me: User, title: string) {
    await wait();
    const d = db();
    const id = nextId(d.inventoryChecks);
    d.inventoryChecks.push({ id, title, createdAt: stamp(), createdBy: me.id, status: "DRAFT", items: d.equipment.map((e) => ({ equipmentId: e.id, system: e.total })) });
    commit();
    return id;
  },
  async saveInventory(me: User, id: number, items: { equipmentId: number; counted?: number; reason?: string }[], close: boolean) {
    await wait();
    const d = db();
    const c = need(byId(d.inventoryChecks, id));
    c.items = c.items.map((i) => ({ ...i, ...items.find((x) => x.equipmentId === i.equipmentId) }));
    if (close) {
      if (c.items.some((i) => i.counted === undefined)) throw new Error("Còn thiết bị chưa nhập số đếm");
      if (c.items.some((i) => i.counted !== i.system && !i.reason)) throw new Error("Ghi lý do cho các dòng có chênh lệch");
      c.status = "CLOSED";
      c.closedAt = stamp();
      c.items.forEach((i) => { const e = byId(d.equipment, i.equipmentId); if (e && i.counted !== undefined) e.total = i.counted; });
      audit(me.id, `Chốt phiếu ${c.title}`, "inventory_checks", c.id);
    }
    commit();
  },

  // ---------------------------------------------------------------- finance
  async payments() {
    await wait();
    const d = db();
    const invoices = d.invoices.sort((a, b) => b.issueDate.localeCompare(a.issueDate)).map((i) => {
      const s = need(byId(d.subscriptions, i.subscriptionId));
      return { invoice: i, sub: s, elderly: need(lookups.elderly(s.elderlyId)), family: lookups.user(lookups.elderly(s.elderlyId)?.familyUserId), payment: paymentOf(i.id) };
    });
    const payments = d.payments.sort((a, b) => b.paidAt.localeCompare(a.paidAt)).map((p) => ({ payment: p, invoice: byId(d.invoices, p.invoiceId), payer: lookups.user(p.payerId) }));
    return {
      invoices, payments,
      refunds: d.refunds.map((r) => ({ refund: r, sub: byId(d.subscriptions, r.subscriptionId), elderly: lookups.elderly(byId(d.subscriptions, r.subscriptionId)?.elderlyId) })),
      credits: d.credits.map((c) => ({ credit: c, family: lookups.user(c.familyUserId), elderly: lookups.elderly(c.elderlyId) })),
      month: d.payments.filter((p) => p.status === "SUCCESS" && p.paidAt >= "2026-10-01").reduce((s, p) => s + p.amount, 0),
      unpaid: d.invoices.filter((i) => i.status === "UNPAID").reduce((s, i) => s + i.total, 0),
    };
  },
  async invoice(me: User, id: number) {
    await wait();
    const d = db();
    const i = need(byId(d.invoices, id));
    const s = need(byId(d.subscriptions, i.subscriptionId));
    const e = need(lookups.elderly(s.elderlyId));
    if (me.role === "FAMILY" && e.familyUserId !== me.id) throw new Error("Không có quyền xem hóa đơn này");
    return { invoice: i, sub: s, elderly: e, family: lookups.user(e.familyUserId), payments: d.payments.filter((p) => p.invoiceId === id), settings: d.centerSettings };
  },
  async markRefundDone(me: User, id: number) {
    await wait();
    requireRole(me, "ADMIN", "Duyệt hoàn tiền");
    const r = need(byId(db().refunds, id));
    r.status = "DONE";
    r.processedBy = me.id;
    const inv = byId(db().invoices, byId(db().payments, r.paymentId)?.invoiceId);
    if (inv) inv.status = "REFUNDED";
    const sub = byId(db().subscriptions, r.subscriptionId);
    const el = lookups.elderly(sub?.elderlyId);
    if (el) notify(el.familyUserId, "PAYMENT", "Trung tâm đã hoàn tiền", `${r.amount.toLocaleString("vi-VN")}đ qua cổng thanh toán`, "/family/invoices");
    audit(me.id, `Duyệt hoàn tiền ${r.amount.toLocaleString("vi-VN")}đ`, "refunds", id);
    commit();
  },
  async suspendOverdue(me: User) {
    await wait();
    const d = db();
    let n = 0;
    for (const s of d.subscriptions.filter((x) => x.status === "ACTIVE" && x.endDate < TODAY)) {
      s.status = "SUSPENDED";
      need(lookups.elderly(s.elderlyId)).status = "SUSPENDED";
      n++;
    }
    commit();
    return n;
  },
  async remindRenewal(me: User, subId: number) {
    await wait();
    const s = need(byId(db().subscriptions, subId));
    const e = need(lookups.elderly(s.elderlyId));
    notify(e.familyUserId, "PAYMENT", `Nhắc gia hạn gói của ${e.fullName}`, `Gói hết hạn ${s.endDate.slice(8)}/${s.endDate.slice(5, 7)}`, "/family/packages");
    commit();
  },

  // ---------------------------------------------------------------- reports to Admin (BR-61)
  async reports() {
    await wait();
    return db().reports.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  },
  async sendReport(me: User, id: number, note: string) {
    await wait();
    const r = need(byId(db().reports, id));
    r.managerNote = note;
    r.sentAt = stamp();
    db().users.filter((u) => u.role === "ADMIN").forEach((a) => notify(a.id, "SYSTEM", `Báo cáo ${r.label} đã gửi`, note.slice(0, 80), "/admin/reports"));
    audit(me.id, `Gửi báo cáo ${r.label} cho Admin`, "manager_reports", id);
    commit();
  },

  // ---------------------------------------------------------------- messages (BR-40)
  async familyThreads() {
    await wait();
    const d = db();
    const map = new Map<string, { familyId: number; staffId: number; count: number; last: string; elderlyId?: number }>();
    for (const m of d.messages.filter((x) => x.channel === "FAMILY_STAFF")) {
      const fam = lookups.user(m.senderId)?.role === "FAMILY" ? m.senderId : m.receiverId;
      const st = fam === m.senderId ? m.receiverId : m.senderId;
      const k = `${fam}-${st}`;
      const cur = map.get(k) ?? { familyId: fam, staffId: st, count: 0, last: m.sentAt, elderlyId: m.elderlyId };
      cur.count++;
      if (m.sentAt > cur.last) cur.last = m.sentAt;
      map.set(k, cur);
    }
    return [...map.values()].map((x) => ({ ...x, family: lookups.user(x.familyId), staff: lookups.user(x.staffId), elderly: lookups.elderly(x.elderlyId) })).sort((a, b) => b.last.localeCompare(a.last));
  },
  async openFamilyThread(me: User, familyId: number, staffId: number, reason: string) {
    await wait();
    if (!reason.trim()) throw new Error("Ghi lý do mở lịch sử (khiếu nại hoặc gia đình yêu cầu)");
    audit(me.id, `Mở lịch sử tin nhắn ${lookups.user(familyId)?.fullName} ↔ ${lookups.user(staffId)?.fullName}: ${reason}`, "messages");
    commit();
    return db().messages.filter((m) => (m.senderId === familyId && m.receiverId === staffId) || (m.senderId === staffId && m.receiverId === familyId)).sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  },

  // ---------------------------------------------------------------- settings
  async settings() {
    await wait();
    return db().centerSettings;
  },
  async saveSettings(me: User, input: Partial<CenterSettings>) {
    await wait();
    const ops: (keyof CenterSettings)[] = ["thresholds", "absentAlertAt", "closeReminderAt", "managerCloseAt", "faqs"];
    const keys = Object.keys(input) as (keyof CenterSettings)[];
    if (me.role === "MANAGER" && keys.some((k) => !ops.includes(k))) throw new Error("Thông tin, giờ mở cửa và cổng thanh toán: chỉ Admin (chủ doanh nghiệp) được sửa");
    if (me.role === "ADMIN" && keys.some((k) => ops.includes(k))) throw new Error("Ngưỡng chỉ số, giờ nhắc care log và FAQ do Quản lý trung tâm cấu hình");
    Object.assign(db().centerSettings, input);
    audit(me.id, "Cập nhật cài đặt trung tâm", "center_settings");
    commit();
  },
};
