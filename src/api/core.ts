// Shared helpers for the mock API. Every portal module scopes data by the signed-in user ("me")
// the same way the real backend must (BR-33, BR-40, mục 7).
import { commit, db, nextId, wait } from "../mock/db";
import { DEMO_NOW, DEMO_TODAY } from "../mock/seed";
import type { Cycle, ElderlyMember, Notification, Position, Subscription, TargetGroup, Tier, User } from "../types/models";
import { ALL_TIERS, CYCLE_LABEL, cycleMonths, isDayCycle, isWeeklyCycle, TIERS, TIER_LABEL } from "../domain/catalog";

export { commit, db, nextId, wait };
export const TODAY = DEMO_TODAY;
export const NOW = DEMO_NOW;

/** Timestamps for new records: demo date + real clock so actions sort after seeded data. */
export function stamp() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${TODAY}T${hh}:${mm}:00`;
}
export const clock = () => stamp().slice(11, 16);

export const byId = <T extends { id: number }>(rows: T[], id?: number) => rows.find((r) => r.id === id);
export const need = <T,>(v: T | undefined | null, msg = "Không tìm thấy dữ liệu"): T => {
  if (v === undefined || v === null) throw new Error(msg);
  return v;
};
export function audit(userId: number | null, action: string, entityName: string, entityId?: number) {
  const d = db();
  d.auditLogs.unshift({ id: nextId(d.auditLogs), userId, action, entityName, entityId, ipAddress: "127.0.0.1", createdAt: stamp() });
}
export function notify(userId: number, type: Notification["type"], title: string, message: string, link?: string) {
  const d = db();
  d.notifications.unshift({ id: nextId(d.notifications), userId, type, title, message, link, isRead: false, createdAt: stamp() });
}
export const managers = () => db().users.filter((u) => u.role === "MANAGER" && u.status !== "LOCKED");
export const notifyManagers = (type: Notification["type"], title: string, message: string, link?: string) => managers().forEach((m) => notify(m.id, type, title, message, link));
export const notifyAdmins = (type: Notification["type"], title: string, message: string, link?: string) => db().users.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE").forEach((a) => notify(a.id, type, title, message, link));
/** Phân quyền Admin (chủ DN) / Quản lý: giá, nhân sự, tài sản, hoàn tiền thuộc Admin; vận hành hằng ngày thuộc Quản lý. */
export function requireRole(me: User, role: User["role"], what: string) {
  if (me.role !== role) throw new Error(`${what}: chỉ ${role === "ADMIN" ? "Admin (chủ doanh nghiệp)" : "Quản lý trung tâm"} được làm`);
}

export const lookups = {
  user: (id?: number) => byId(db().users, id),
  elderly: (id?: number) => byId(db().elderly, id),
  service: (id?: number) => byId(db().services, id),
  room: (id?: number) => byId(db().rooms, id),
  pkg: (id?: number) => byId(db().packages, id),
  equipment: (id?: number) => byId(db().equipment, id),
  position: (userId?: number): Position | undefined => db().staffProfiles.find((p) => p.userId === userId)?.position,
  settings: () => db().centerSettings,
};

export const honor = (e: Pick<ElderlyMember, "gender">) => (e.gender === "Nữ" ? "Bà" : "Ông");
export const pkgName = (s: Pick<Subscription, "tier" | "cycle">) => `${CYCLE_LABEL[s.cycle]} · ${TIER_LABEL[s.tier]}`;
export const entitlement = (tier: Tier) => need(db().entitlements.find((e) => e.tier === tier));
export const priceOfPkg = (tier: Tier, cycle: Cycle) => need(db().packages.find((p) => p.tier === tier && p.cycle === cycle)).basePrice;

const LIVE: Subscription["status"][] = ["ACTIVE", "PAUSED", "SUSPENDED", "AWAITING_PAYMENT", "PENDING_ASSESSMENT"];
/** The main subscription of an elderly (BR-03): the newest one that is not finished. */
export const currentSub = (elderlyId: number) =>
  db().subscriptions.filter((s) => s.elderlyId === elderlyId && LIVE.includes(s.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
export const activeSub = (elderlyId: number) => db().subscriptions.find((s) => s.elderlyId === elderlyId && s.status === "ACTIVE");
export const choicesOf = (subId: number) => db().serviceChoices.filter((c) => c.subscriptionId === subId).map((c) => c.serviceId);
export const addOnsOf = (subId: number) => db().addOns.filter((a) => a.subscriptionId === subId).map((a) => ({ ...a, service: lookups.service(a.serviceId) }));
export const invoicesOf = (subId: number) => db().invoices.filter((i) => i.subscriptionId === subId);
export const paymentOf = (invoiceId: number) => db().payments.find((p) => p.invoiceId === invoiceId && p.status === "SUCCESS");
export const attendanceOn = (elderlyId: number, date = TODAY) => db().attendance.find((a) => a.elderlyId === elderlyId && a.date === date);

/** Is the elderly scheduled to come on a date? (BR-31: subscription ACTIVE + weekday of the package) */
export function scheduledOn(elderlyId: number, date: string) {
  const s = activeSub(elderlyId);
  if (!s || date < s.startDate || date > s.endDate) return false;
  const dow = new Date(date + "T00:00:00").getDay();
  if (dow === 0 || db().holidays.some((h) => h.date === date)) return false;
  if (isDayCycle(s.cycle)) return !!s.dayDates?.includes(date) && !db().absences.some((a) => a.elderlyId === elderlyId && a.status === "APPROVED" && a.fromDate <= date && a.toDate >= date);
  if (isWeeklyCycle(s.cycle)) return !!s.weekdays?.includes(dow);
  return true;
}

export const usable = (e: { total: number; broken: number; repairing: number }) => e.total - e.broken - e.repairing;

/** Seats per tier = active nap beds in open rooms (BR-74). Long-term subs (incl. paused Premium, BR-76) hold a seat. */
export function capacity() {
  const d = db();
  return ALL_TIERS.map((tier) => {
    const beds = d.beds.filter((b) => b.tier === tier && b.status === "ACTIVE" && lookups.room(b.roomId)?.status === "ACTIVE").length;
    const holding = d.subscriptions.filter((s) => s.tier === tier && !isDayCycle(s.cycle) && ["ACTIVE", "PAUSED", "AWAITING_PAYMENT"].includes(s.status));
    const todayDay = d.subscriptions.filter((s) => s.tier === tier && isDayCycle(s.cycle) && s.status === "ACTIVE" && s.dayDates?.includes(TODAY)).length;
    const waiting = d.waitlist.filter((w) => w.tier === tier && (w.status === "WAITING" || w.status === "HOLDING")).length;
    return { tier, beds, held: holding.length, free: Math.max(0, beds - holding.length), todayDay, waiting, full: holding.length >= beds };
  });
}

/** BR-17 (bản mới): phụ phí cố định theo nhóm, tính theo thời hạn gói. Gói ngày = phụ phí tháng / 26 mỗi ngày. */
export const surchargeMonthly = (group: TargetGroup) => db().groupSurcharges.find((x) => x.group === group)?.monthly ?? 0;
export function fixedSurcharge(group: TargetGroup, cycle: Cycle, days = 1) {
  const m = surchargeMonthly(group);
  if (!m) return 0;
  if (isDayCycle(cycle)) return Math.round(m / 26 / 1000) * 1000 * days;
  return m * Math.max(1, cycleMonths(cycle));
}

export const isNurse = (me: User) => lookups.position(me.id) === "NURSE";
export const staffOf = (me: User) => db().elderly.filter((e) => e.caregiverId === me.id || e.nurseId === me.id);
export const ownsElderly = (me: User, elderlyId: number) => {
  if (me.role === "MANAGER" || me.role === "ADMIN") return true;
  const e = lookups.elderly(elderlyId);
  if (!e) return false;
  if (me.role === "FAMILY") return e.familyUserId === me.id;
  return e.caregiverId === me.id || e.nurseId === me.id;
};
export const guard = (me: User, elderlyId: number) => {
  if (!ownsElderly(me, elderlyId)) throw new Error("Bạn không có quyền với hồ sơ này");
  return need(lookups.elderly(elderlyId));
};

export const metricsOf = (elderlyId: number) => db().healthMetrics.filter((m) => m.elderlyId === elderlyId).sort((a, b) => a.at.localeCompare(b.at));
export const latestVitals = (elderlyId: number) => {
  const ms = metricsOf(elderlyId).filter((m) => m.sys);
  return ms[ms.length - 1];
};
export const thresholdsOf = () => db().centerSettings.thresholds;
export const outOfRange = (m: { sys?: number; dia?: number; pulse?: number; temp?: number; spo2?: number; glucose?: number }) => {
  const t = thresholdsOf();
  const r: string[] = [];
  if (m.sys && (m.sys > t.sysMax || m.sys < t.sysMin)) r.push("huyết áp tâm thu");
  if (m.dia && m.dia > t.diaMax) r.push("huyết áp tâm trương");
  if (m.pulse && (m.pulse < t.pulseMin || m.pulse > t.pulseMax)) r.push("mạch");
  if (m.temp && m.temp > t.tempMax) r.push("nhiệt độ");
  if (m.spo2 && m.spo2 < t.spo2Min) r.push("SpO₂");
  if (m.glucose && m.glucose > t.glucoseMax) r.push("đường huyết");
  return r;
};

/** "Cụ đang làm gì" (G1): the last ACTIVITY/NAP/MEAL entry or the scheduled block at NOW. */
export function nowDoing(elderlyId: number) {
  const a = attendanceOn(elderlyId);
  if (!a || a.status === "EXPECTED") return { label: "Chưa đến trung tâm", since: undefined as string | undefined };
  if (a.status === "ABSENT") return { label: "Nghỉ hôm nay", since: undefined };
  if (a.status === "LEFT") return { label: "Đã về nhà", since: a.checkOut };
  const task = db().dailyTasks.filter((t) => t.elderlyId === elderlyId && t.date === TODAY && t.status === "DONE" && (t.type === "ACTIVITY" || t.type === "MEAL" || t.type === "NAP")).sort((x, y) => y.time.localeCompare(x.time))[0];
  const block = db().schedules.find((s) => s.date === TODAY && s.startTime <= NOW && s.endTime > NOW && s.serviceId !== 11);
  if (block) return { label: block.title, since: block.startTime };
  return { label: task ? task.title : "Đang ở trung tâm", since: task?.time };
}
