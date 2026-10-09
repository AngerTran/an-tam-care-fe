// Platform Administrator (chủ doanh nghiệp). Only aggregated numbers — no individual health records
// (mục 3, BR-60: Admin permissions to be refined later).
import type { SystemSettings, User } from "../types/models";
import { GROUPS, TIERS } from "../domain/catalog";
import { audit, capacity, commit, db, lookups, need, nextId, scheduledOn, TODAY, usable, wait } from "./core";
import { addDays } from "../lib/format";

export const admin = {
  async dashboard() {
    await wait();
    const d = db();
    const ok = d.payments.filter((p) => p.status === "SUCCESS");
    const byMonth = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((m, i) => ({ month: m, value: [38.5, 46.2, 52.8, 61.4, 0, 0][i] * 1_000_000 + ok.filter((p) => p.paidAt.startsWith(m)).reduce((s, p) => s + p.amount, 0) }));
    const active = d.elderly.filter((e) => ["ACTIVE", "PAUSED"].includes(e.status));
    const days = Array.from({ length: 14 }, (_, i) => addDays(TODAY, -13 + i)).filter((x) => new Date(x + "T00:00:00").getDay() !== 0);
    const rate = days.map((date) => {
      const sched = d.attendance.filter((a) => a.date === date);
      const came = sched.filter((a) => a.status === "LEFT" || a.status === "PRESENT").length;
      return { date, rate: sched.length ? Math.round((came / sched.length) * 100) : 0 };
    });
    const subsByTier = TIERS.map((t) => ({ tier: t, count: d.subscriptions.filter((s) => s.tier === t && ["ACTIVE", "PAUSED"].includes(s.status)).length }));
    return {
      revenueMonth: byMonth[byMonth.length - 1].value, byMonth,
      active: active.length, todayExpected: d.elderly.filter((e) => scheduledOn(e.id, TODAY)).length,
      capacity: capacity(), subsByTier,
      groups: GROUPS.map((g) => ({ group: g, count: active.filter((e) => e.targetGroup === g).length })),
      rate,
      methods: (["VNPAY", "MOMO"] as const).map((m) => ({ method: m, amount: ok.filter((p) => p.method === m).reduce((s, p) => s + p.amount, 0) })),
      unpaid: d.invoices.filter((i) => i.status === "UNPAID").reduce((s, i) => s + i.total, 0),
      incidents: d.incidents.filter((i) => i.at >= "2026-09-01").length,
      transfers: d.incidents.filter((i) => i.transfer).length,
      lowEquip: d.equipment.filter((e) => usable(e) < e.minStock).length,
      closedRooms: d.rooms.filter((r) => r.status === "CLOSED").length,
      waitlist: d.waitlist.filter((w) => ["WAITING", "HOLDING"].includes(w.status)).length,
      pendingRefunds: d.refunds.filter((r) => r.status === "PENDING"),
      disposeRequests: d.damageReports.filter((r) => r.disposeRequested && r.status !== "DISPOSED").length,
      staff: d.users.filter((u) => u.role === "STAFF" && u.status !== "LOCKED").length,
      pendingReport: d.reports.filter((r) => !r.sentAt).length,
      latestReport: d.reports.filter((r) => r.sentAt).sort((a, b) => b.sentAt!.localeCompare(a.sentAt!))[0],
    };
  },
  async reports() {
    await wait();
    return db().reports.filter((r) => r.sentAt).sort((a, b) => b.sentAt!.localeCompare(a.sentAt!));
  },
  async facilities() {
    await wait();
    const d = db();
    const last = d.inventoryChecks.filter((c) => c.status === "CLOSED").sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return {
      capacity: capacity(),
      rooms: d.rooms,
      equipment: d.equipment.map((e) => ({ equipment: e, usable: usable(e), room: lookups.room(e.roomId) })),
      damage: { open: d.damageReports.filter((r) => r.status === "NEW" || r.status === "REPAIRING").length, fixed: d.damageReports.filter((r) => r.status === "FIXED").length, disposed: d.damageReports.filter((r) => r.status === "DISPOSED").length },
      lastInventory: last && { ...last, diff: last.items.filter((i) => i.counted !== undefined && i.counted !== i.system).map((i) => ({ ...i, equipment: lookups.equipment(i.equipmentId) })) },
      compensations: d.compensations.length,
      bedUse: Math.round((d.bedAssignments.filter((b) => b.date === TODAY).length + d.beds.filter((b) => b.fixedElderlyId).length) / Math.max(1, d.beds.filter((b) => b.status === "ACTIVE").length) * 100),
    };
  },
  async accounts() {
    await wait();
    const d = db();
    return {
      managers: d.users.filter((u) => u.role === "MANAGER"),
      staff: d.users.filter((u) => u.role === "STAFF").map((u) => ({ user: u, position: lookups.position(u.id) })),
      families: d.users.filter((u) => u.role === "FAMILY").length,
    };
  },
  async createManager(me: User, input: { fullName: string; email: string; phone: string }) {
    await wait();
    const d = db();
    if (d.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Email đã tồn tại");
    const u: User = { id: nextId(d.users), role: "MANAGER", ...input, password: "demo1234", status: "INVITED" };
    d.users.push(u);
    audit(me.id, `Tạo tài khoản Quản lý ${u.email}`, "users", u.id);
    commit();
  },
  async setUserStatus(me: User, userId: number, status: User["status"]) {
    await wait();
    const u = need(lookups.user(userId));
    u.status = status;
    audit(me.id, `${status === "LOCKED" ? "Khóa" : "Mở khóa"} tài khoản ${u.email}`, "users", u.id);
    commit();
  },
  async resetPassword(me: User, userId: number) {
    await wait();
    const u = need(lookups.user(userId));
    audit(me.id, `Gửi email đặt lại mật khẩu cho ${u.email}`, "users", u.id);
    commit();
  },
  async auditLogs() {
    await wait();
    return db().auditLogs.map((l) => ({ log: l, user: lookups.user(l.userId ?? undefined) })).sort((a, b) => b.log.createdAt.localeCompare(a.log.createdAt));
  },
  async systemSettings() {
    await wait();
    return db().systemSettings;
  },
  async saveSystemSettings(me: User, input: Partial<SystemSettings>) {
    await wait();
    Object.assign(db().systemSettings, input);
    audit(me.id, "Cập nhật cấu hình hệ thống", "system_settings");
    commit();
  },
};
