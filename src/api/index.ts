// Mock API. Every function is async and scoped by the signed-in user ("me") the same way the
// real backend must scope data: Manager/Staff → their centre, Staff → assigned elderly,
// Family → their own relatives, Admin → centres only (no family money, no personal data).
import { commit, db, nextId, nowIso, wait } from "../mock/db";
import { DEMO_TODAY } from "../mock/seed";
import type {
  AbsenceRequest, CareLog, Center, CenterSettings, ElderlyMember, Invoice, Message, PaymentMethod, Role, Service,
  ServicePackage, SystemSettings, User,
} from "../types/models";
import { addDays, refundCode } from "../lib/format";

export const TODAY = DEMO_TODAY;
const byId = <T extends { id: number }>(rows: T[], id?: number) => rows.find((r) => r.id === id);
const need = <T,>(v: T | undefined, msg = "Không tìm thấy dữ liệu"): T => {
  if (v === undefined) throw new Error(msg);
  return v;
};
const audit = (userId: number | null, action: string, entityName: string, entityId?: number) => {
  const d = db();
  d.auditLogs.unshift({ id: nextId(d.auditLogs), userId, action, entityName, entityId, ipAddress: "127.0.0.1", createdAt: nowIso() });
};
const notify = (userId: number, type: "ATTENDANCE" | "CARE_LOG" | "PAYMENT" | "MESSAGE" | "SHIFT" | "SYSTEM", title: string, message: string) => {
  const d = db();
  d.notifications.unshift({ id: nextId(d.notifications), userId, type, title, message, isRead: false, createdAt: nowIso() });
};
const managersOf = (centerId: number | null) => db().users.filter((u) => u.role === "MANAGER" && u.centerId === centerId);

// ---------------------------------------------------------------- shared lookups
export const lookups = {
  user: (id?: number) => byId(db().users, id),
  center: (id?: number | null) => (id == null ? undefined : byId(db().centers, id)),
  elderly: (id?: number) => byId(db().elderly, id),
  pkg: (id?: number) => byId(db().packages, id),
  service: (id?: number) => byId(db().services, id),
};

const activeReg = (elderlyId: number) => db().registrations.find((r) => r.elderlyId === elderlyId && r.status === "ACTIVE");
const latestReg = (elderlyId: number) =>
  db().registrations.filter((r) => r.elderlyId === elderlyId).sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
const attToday = (elderlyId: number) => db().attendance.find((a) => a.elderlyId === elderlyId && a.date === TODAY);
const invoiceOfReg = (regId: number) => db().invoices.find((i) => i.registrationId === regId);
const paymentOfInvoice = (invoiceId: number) => db().payments.find((p) => p.invoiceId === invoiceId && p.status === "SUCCESS");
const servicesOfPackage = (packageId: number) =>
  db().packageServices.filter((ps) => ps.packageId === packageId).map((ps) => need(lookups.service(ps.serviceId)));

export type MemberRow = ReturnType<typeof memberRow>;
const memberRow = (e: ElderlyMember) => {
  const reg = activeReg(e.id) ?? latestReg(e.id);
  return { elderly: e, family: lookups.user(e.familyUserId), reg, pkg: lookups.pkg(reg?.packageId), attendance: attToday(e.id), staff: lookups.user(e.assignedStaffId) };
};

// ---------------------------------------------------------------- auth & profile
export const auth = {
  async login(email: string, password: string) {
    await wait();
    const u = db().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new Error("Email hoặc mật khẩu không đúng");
    if (u.status === "LOCKED") throw new Error("Tài khoản đang bị khoá. Liên hệ quản trị viên.");
    const c = lookups.center(u.centerId);
    if (u.role !== "ADMIN" && u.role !== "FAMILY" && c && c.status === "SUSPENDED") throw new Error("Trung tâm đang tạm khoá trên nền tảng.");
    u.lastLoginAt = nowIso();
    if (u.status === "INVITED") u.status = "ACTIVE";
    audit(u.id, "Đăng nhập thành công", "users", u.id);
    commit();
    return u;
  },
  async registerFamily(input: { fullName: string; email: string; phone: string; password: string }) {
    await wait();
    const d = db();
    if (d.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Email đã được sử dụng");
    const u: User = { id: nextId(d.users), centerId: null, role: "FAMILY", status: "INVITED", ...input };
    d.users.push(u);
    commit();
    return u;
  },
  async verifyEmail(userId: number, code: string) {
    await wait();
    if (!/^\d{6}$/.test(code)) throw new Error("Mã gồm 6 chữ số");
    const u = need(lookups.user(userId));
    u.status = "ACTIVE";
    commit();
    return u;
  },
  async requestReset(email: string) {
    await wait();
    if (!db().users.some((u) => u.email.toLowerCase() === email.toLowerCase())) throw new Error("Không tìm thấy tài khoản với email này");
    return true;
  },
  async resetPassword(email: string, code: string, password: string) {
    await wait();
    if (!/^\d{6}$/.test(code)) throw new Error("Mã gồm 6 chữ số");
    const u = need(db().users.find((x) => x.email.toLowerCase() === email.toLowerCase()), "Không tìm thấy tài khoản");
    u.password = password;
    commit();
    return true;
  },
  async updateProfile(me: User, input: { fullName: string; phone: string }) {
    await wait();
    const u = need(lookups.user(me.id));
    Object.assign(u, input);
    commit();
    return u;
  },
  async changePassword(me: User, current: string, next: string) {
    await wait();
    const u = need(lookups.user(me.id));
    if (u.password !== current) throw new Error("Mật khẩu hiện tại không đúng");
    u.password = next;
    commit();
    return true;
  },
};

// ---------------------------------------------------------------- notifications & messages
export const inbox = {
  async notifications(me: User) {
    await wait(80);
    return db().notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markAllRead(me: User) {
    db().notifications.filter((n) => n.userId === me.id).forEach((n) => (n.isRead = true));
    commit();
  },
  /** Conversations visible to me, grouped by partner. Admin only sees CENTER_ADMIN channel. */
  async conversations(me: User) {
    await wait(80);
    const mine = db().messages.filter((m) => (m.senderId === me.id || m.receiverId === me.id) && (me.role !== "ADMIN" || m.channel === "CENTER_ADMIN"));
    const groups = new Map<number, Message[]>();
    for (const m of mine) {
      const partner = m.senderId === me.id ? m.receiverId : m.senderId;
      groups.set(partner, [...(groups.get(partner) ?? []), m]);
    }
    return [...groups.entries()]
      .map(([partnerId, msgs]) => {
        msgs.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
        const last = msgs[msgs.length - 1];
        const partner = need(lookups.user(partnerId));
        return { partner, center: lookups.center(partner.centerId), elderly: lookups.elderly(msgs.find((m) => m.elderlyId)?.elderlyId), channel: last.channel, last, unread: msgs.filter((m) => m.receiverId === me.id && !m.isRead).length };
      })
      .sort((a, b) => b.last.sentAt.localeCompare(a.last.sentAt));
  },
  async thread(me: User, partnerId: number) {
    await wait(60);
    const msgs = db().messages.filter((m) => (m.senderId === me.id && m.receiverId === partnerId) || (m.senderId === partnerId && m.receiverId === me.id));
    msgs.filter((m) => m.receiverId === me.id).forEach((m) => (m.isRead = true));
    commit();
    return msgs.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  },
  async send(me: User, partnerId: number, text: string) {
    await wait(60);
    const partner = need(lookups.user(partnerId));
    if ((me.role === "ADMIN" && partner.role !== "MANAGER") || (partner.role === "ADMIN" && me.role !== "MANAGER")) throw new Error("Chỉ Quản lý trung tâm được nhắn với Admin");
    const channel: Message["channel"] = me.role === "ADMIN" || partner.role === "ADMIN" ? "CENTER_ADMIN" : me.role === "FAMILY" || partner.role === "FAMILY" ? "FAMILY_CENTER" : "INTERNAL";
    const d = db();
    const prev = d.messages.find((m) => (m.senderId === partnerId && m.receiverId === me.id) || (m.senderId === me.id && m.receiverId === partnerId));
    d.messages.push({ id: nextId(d.messages), senderId: me.id, receiverId: partnerId, elderlyId: prev?.elderlyId, channel, text, sentAt: nowIso(), isRead: false });
    notify(partnerId, "MESSAGE", `Tin nhắn mới từ ${me.fullName}`, text.slice(0, 60));
    commit();
  },
  /** People a user may start a chat with. */
  async contacts(me: User) {
    await wait(50);
    const d = db();
    if (me.role === "ADMIN") return d.users.filter((u) => u.role === "MANAGER");
    if (me.role === "FAMILY") {
      const centerIds = new Set(d.elderly.filter((e) => e.familyUserId === me.id && e.centerId).map((e) => e.centerId));
      const staffIds = new Set(d.elderly.filter((e) => e.familyUserId === me.id).map((e) => e.assignedStaffId));
      return d.users.filter((u) => (u.role === "MANAGER" && centerIds.has(u.centerId)) || staffIds.has(u.id));
    }
    const centerUsers = d.users.filter((u) => u.centerId === me.centerId && u.id !== me.id && (u.role === "MANAGER" || u.role === "STAFF"));
    const families = d.elderly.filter((e) => e.centerId === me.centerId && (me.role === "MANAGER" || e.assignedStaffId === me.id)).map((e) => need(lookups.user(e.familyUserId)));
    const admin = me.role === "MANAGER" ? d.users.filter((u) => u.role === "ADMIN") : [];
    return [...admin, ...centerUsers, ...families.filter((f, i, a) => a.indexOf(f) === i)];
  },
};

// ---------------------------------------------------------------- manager
const cid = (me: User) => need(me.centerId ?? undefined, "Tài khoản không thuộc trung tâm");
const centerElderly = (me: User) => db().elderly.filter((e) => e.centerId === cid(me));

export const manager = {
  async dashboard(me: User) {
    await wait();
    const d = db();
    const els = centerElderly(me).filter((e) => e.status !== "PENDING");
    const present = els.filter((e) => ["PRESENT", "LEFT"].includes(attToday(e.id)?.status ?? "")).length;
    const regIds = new Set(d.registrations.filter((r) => els.some((e) => e.id === r.elderlyId) || d.elderly.find((x) => x.id === r.elderlyId)?.centerId === cid(me)).map((r) => r.id));
    const revenue = d.payments.filter((p) => p.paidAt.startsWith("2026-10") && regIds.has(need(byId(d.invoices, p.invoiceId)).registrationId)).reduce((s, p) => s + p.amount, 0);
    const pendingRegs = d.registrations.filter((r) => r.status === "PENDING" && lookups.elderly(r.elderlyId)?.centerId === cid(me)).length;
    const flagged = d.careLogs.filter((l) => l.issueStatus === "NEW" && lookups.elderly(l.elderlyId)?.centerId === cid(me)).length;
    const pendingRefunds = d.refunds.filter((r) => r.status === "REQUESTED").length;
    const pendingAi = d.aiSuggestions.filter((s) => s.status === "PENDING").length;
    const week = [-6, -5, -4, -3, -2, -1, 0].map((i) => {
      const date = addDays(TODAY, i);
      return { date, count: d.attendance.filter((a) => a.date === date && (a.status === "PRESENT" || a.status === "LEFT")).length };
    });
    return { present, total: els.length, revenue, pendingRegs, flagged, pendingRefunds, pendingAi, week, pendingAbsences: d.absences.filter((a) => a.status === "PENDING").length };
  },

  async members(me: User) {
    await wait();
    return centerElderly(me).filter((e) => e.status !== "PENDING").map(memberRow);
  },
  async member(me: User, id: number) {
    await wait();
    const e = need(centerElderly(me).find((x) => x.id === id));
    const row = memberRow(e);
    const invoice = row.reg ? invoiceOfReg(row.reg.id) : undefined;
    const days = [0, -1, -2, -3, -4, -5, -6].map((i) => addDays(TODAY, i));
    const attendance = days.map((date) => ({ date, a: db().attendance.find((x) => x.elderlyId === id && x.date === date), absence: db().absences.find((x) => x.elderlyId === id && x.fromDate <= date && x.toDate >= date && x.status !== "REJECTED") }));
    const logs = db().careLogs.filter((l) => l.elderlyId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((l) => ({ ...l, staff: lookups.user(l.staffId) }));
    return { ...row, invoice, attendance, logs };
  },
  async saveMember(me: User, input: Omit<ElderlyMember, "id" | "centerId" | "status" | "familyUserId" | "healthTags"> & { id?: number; familyEmail: string; healthTags: string; packageId?: number; startDate?: string; months?: number }) {
    await wait();
    const d = db();
    const family = d.users.find((u) => u.role === "FAMILY" && u.email.toLowerCase() === input.familyEmail.toLowerCase());
    if (!family) throw new Error("Không tìm thấy tài khoản gia đình với email này");
    const { familyEmail: _f, packageId, startDate, months, id, healthTags, ...rest } = input;
    const tags = healthTags.split(",").map((s) => s.trim()).filter(Boolean);
    if (id) {
      const e = need(centerElderly(me).find((x) => x.id === id));
      Object.assign(e, rest, { familyUserId: family.id, healthTags: tags });
      commit();
      return { elderlyId: e.id };
    }
    const e: ElderlyMember = { id: nextId(d.elderly), centerId: cid(me), familyUserId: family.id, status: "ACTIVE", healthTags: tags, ...rest };
    d.elderly.push(e);
    let invoiceId: number | undefined;
    if (packageId && startDate) {
      const pkg = need(lookups.pkg(packageId));
      const end = pkg.billingPeriod === "DAILY" ? startDate : addDays(startDate, 30 * (months ?? 1) - 1);
      const reg = { id: nextId(d.registrations), elderlyId: e.id, packageId, registeredBy: me.id, startDate, endDate: end, status: "ACTIVE" as const, registeredAt: nowIso() };
      d.registrations.push(reg);
      const subtotal = pkg.price * (pkg.billingPeriod === "MONTHLY" ? months ?? 1 : 1);
      invoiceId = nextId(d.invoices);
      d.invoices.push({ id: invoiceId, registrationId: reg.id, number: `HD-2610-${String(invoiceId).padStart(5, "0")}`, subtotal, discount: 0, additionalCharge: 300000, total: subtotal + 300000, issueDate: TODAY, dueDate: addDays(TODAY, 4), status: "UNPAID" });
      notify(family.id, "PAYMENT", "Hoá đơn mới", `Trung tâm đã tạo hoá đơn cho ${e.fullName}`);
    }
    audit(me.id, `Thêm người cao tuổi ${e.fullName}`, "elderly_members", e.id);
    commit();
    return { elderlyId: e.id, invoiceId };
  },

  async registrations(me: User) {
    await wait();
    const d = db();
    return d.registrations
      .filter((r) => {
        const e = lookups.elderly(r.elderlyId);
        return e && (e.centerId === cid(me) || (e.centerId === null && lookups.pkg(r.packageId)?.centerId === cid(me)));
      })
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))
      .map((r) => {
        const invoice = invoiceOfReg(r.id);
        return { reg: r, elderly: need(lookups.elderly(r.elderlyId)), family: lookups.user(lookups.elderly(r.elderlyId)?.familyUserId), pkg: need(lookups.pkg(r.packageId)), invoice, payment: invoice ? paymentOfInvoice(invoice.id) : undefined };
      });
  },
  async approveRegistration(me: User, regId: number) {
    await wait();
    const r = need(byId(db().registrations, regId));
    r.status = "ACTIVE";
    const e = need(lookups.elderly(r.elderlyId));
    e.status = "ACTIVE";
    e.centerId = cid(me);
    notify(e.familyUserId, "SYSTEM", "Đăng ký đã được duyệt", `${e.fullName} đã được nhận vào trung tâm`);
    audit(me.id, `Duyệt đăng ký ${e.fullName}`, "registrations", r.id);
    commit();
  },
  async rejectRegistration(me: User, regId: number) {
    await wait();
    const d = db();
    const r = need(byId(d.registrations, regId));
    r.status = "CANCELLED";
    const inv = invoiceOfReg(r.id);
    const p = inv ? paymentOfInvoice(inv.id) : undefined;
    if (p) d.refunds.unshift({ id: nextId(d.refunds), paymentId: p.id, requestedBy: me.id, amount: p.amount, reason: "Trung tâm từ chối đăng ký", status: "REQUESTED", createdAt: nowIso() });
    audit(me.id, "Từ chối đăng ký", "registrations", r.id);
    commit();
  },

  async attendance(me: User) {
    await wait();
    return centerElderly(me)
      .filter((e) => e.status !== "PENDING")
      .map((e) => ({ elderly: e, a: attToday(e.id), staff: lookups.user(e.assignedStaffId), absence: db().absences.find((x) => x.elderlyId === e.id && x.fromDate <= TODAY && x.toDate >= TODAY && x.status === "APPROVED") }));
  },

  async schedule(me: User, dates: string[]) {
    await wait();
    const d = db();
    return {
      items: d.schedules.filter((s) => s.centerId === cid(me) && dates.includes(s.date)).map((s) => ({ ...s, service: need(lookups.service(s.serviceId)), staff: lookups.user(s.staffId) })),
      menus: d.menus.filter((m) => m.centerId === cid(me) && dates.includes(m.date)),
    };
  },
  async createSchedule(me: User, input: { serviceId: number; date: string; startTime: string; endTime: string; location: string; staffId?: number; repeatWeeks: number }) {
    await wait();
    const d = db();
    for (let w = 0; w < Math.max(1, input.repeatWeeks); w++) {
      const { repeatWeeks: _r, ...rest } = input;
      d.schedules.push({ id: nextId(d.schedules), centerId: cid(me), ...rest, date: addDays(input.date, 7 * w) });
    }
    commit();
  },
  async saveMenu(me: User, input: { date: string; breakfast: string; lunch: string; snack: string; dinner: string; note?: string }) {
    await wait();
    const d = db();
    const m = d.menus.find((x) => x.centerId === cid(me) && x.date === input.date);
    if (m) Object.assign(m, input);
    else d.menus.push({ id: nextId(d.menus), centerId: cid(me), ...input });
    commit();
  },

  async careLogs(me: User) {
    await wait();
    return db()
      .careLogs.filter((l) => lookups.elderly(l.elderlyId)?.centerId === cid(me) && l.issueStatus !== "NONE")
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((l) => ({ log: l, elderly: need(lookups.elderly(l.elderlyId)), staff: lookups.user(l.staffId), photos: db().photos.filter((p) => p.careLogId === l.id) }));
  },
  async updateIssue(me: User, logId: number, status: CareLog["issueStatus"], managerNote: string) {
    await wait();
    const l = need(byId(db().careLogs, logId));
    l.issueStatus = status;
    l.managerNote = managerNote;
    audit(me.id, `Cập nhật lưu ý nhật ký #${logId}`, "care_logs", logId);
    commit();
  },

  async shiftWeek(me: User, dates: string[]) {
    await wait();
    const d = db();
    const shifts = d.shifts.filter((s) => s.centerId === cid(me) && dates.includes(s.date));
    const ids = new Set(shifts.map((s) => s.id));
    return {
      staff: d.users.filter((u) => u.role === "STAFF" && u.centerId === cid(me) && u.status === "ACTIVE"),
      shifts,
      suggestions: d.aiSuggestions.filter((s) => ids.has(s.shiftId)),
    };
  },
  async setRequired(me: User, shiftId: number, required: number) {
    const s = need(byId(db().shifts, shiftId));
    s.requiredStaff = Math.max(0, required);
    commit();
  },
  /** Simulated AI: assigns available staff round-robin, max 5 shifts/person/week, flags conflicts with activities. */
  async generateAi(me: User, dates: string[]) {
    await wait(500);
    const d = db();
    const shifts = d.shifts.filter((s) => s.centerId === cid(me) && dates.includes(s.date));
    const ids = new Set(shifts.map((s) => s.id));
    d.aiSuggestions = d.aiSuggestions.filter((s) => !ids.has(s.shiftId) || s.status === "APPROVED");
    const staff = d.users.filter((u) => u.role === "STAFF" && u.centerId === cid(me) && u.status === "ACTIVE");
    const load = new Map(staff.map((s) => [s.id, 0]));
    let k = 0;
    for (const sh of shifts) {
      const already = d.aiSuggestions.filter((s) => s.shiftId === sh.id).length;
      for (let i = already; i < sh.requiredStaff; i++) {
        const candidates = staff.filter((s) => (load.get(s.id) ?? 0) < 5 && !d.aiSuggestions.some((x) => x.staffId === s.id && d.shifts.find((y) => y.id === x.shiftId)?.date === sh.date));
        if (!candidates.length) break;
        const pick = candidates[k++ % candidates.length];
        load.set(pick.id, (load.get(pick.id) ?? 0) + 1);
        const conflict = pick.position === "Hoạt động viên" && sh.label !== "Chiều";
        d.aiSuggestions.push({ id: nextId(d.aiSuggestions), shiftId: sh.id, staffId: pick.id, conflict, status: "PENDING", reason: conflict ? "Trùng giờ hoạt động nhóm buổi sáng" : `${pick.position ?? "Nhân viên"} còn trống ca, ${load.get(pick.id)} ca trong tuần` });
      }
    }
    audit(me.id, "Tạo gợi ý xếp ca bằng AI", "ai_shift_suggestions");
    commit();
  },
  async reviewSuggestion(me: User, id: number, status: "APPROVED" | "REJECTED" | "PENDING", note?: string) {
    const s = need(byId(db().aiSuggestions, id));
    s.status = status;
    s.reviewedBy = me.id;
    if (note !== undefined) s.managerNote = note;
    if (status === "APPROVED") {
      const sh = need(byId(db().shifts, s.shiftId));
      notify(s.staffId, "SHIFT", "Ca mới đã được duyệt", `Ca ${sh.label.toLowerCase()} ${sh.date.slice(8, 10)}/${sh.date.slice(5, 7)} · ${sh.startTime} – ${sh.endTime}`);
    }
    commit();
  },
  async approveAll(me: User, dates: string[]) {
    await wait();
    const ids = new Set(db().shifts.filter((s) => dates.includes(s.date)).map((s) => s.id));
    for (const s of db().aiSuggestions.filter((x) => ids.has(x.shiftId) && x.status === "PENDING" && !x.conflict)) await manager.reviewSuggestion(me, s.id, "APPROVED");
    audit(me.id, "Duyệt toàn bộ gợi ý xếp ca", "ai_shift_suggestions");
    commit();
  },

  async staff(me: User) {
    await wait();
    const d = db();
    return d.users
      .filter((u) => u.role === "STAFF" && u.centerId === cid(me))
      .map((u) => ({ user: u, shifts: d.aiSuggestions.filter((s) => s.staffId === u.id && s.status !== "REJECTED").length, assigned: d.elderly.filter((e) => e.assignedStaffId === u.id && e.status !== "PENDING").length }));
  },
  async createStaff(me: User, input: { fullName: string; email: string; phone: string; position: string; elderlyIds: number[] }) {
    await wait();
    const d = db();
    if (d.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Email đã tồn tại");
    const u: User = { id: nextId(d.users), centerId: cid(me), role: "STAFF", fullName: input.fullName, email: input.email, phone: input.phone, position: input.position, password: "demo1234", status: "INVITED" };
    d.users.push(u);
    input.elderlyIds.forEach((id) => {
      const e = lookups.elderly(id);
      if (e) e.assignedStaffId = u.id;
    });
    audit(me.id, `Tạo tài khoản nhân viên ${u.fullName}`, "users", u.id);
    commit();
    return u;
  },

  async payments(me: User) {
    await wait();
    const d = db();
    const regs = await manager.registrations(me);
    const regIds = new Set(regs.map((r) => r.reg.id));
    const invs = d.invoices.filter((i) => regIds.has(i.registrationId));
    const pays = d.payments
      .filter((p) => invs.some((i) => i.id === p.invoiceId))
      .map((p) => {
        const invoice = need(byId(d.invoices, p.invoiceId));
        const reg = need(byId(d.registrations, invoice.registrationId));
        return { payment: p, invoice, elderly: lookups.elderly(reg.elderlyId), payer: lookups.user(p.payerId) };
      })
      .sort((a, b) => b.payment.paidAt.localeCompare(a.payment.paidAt));
    const refunds = d.refunds.filter((r) => pays.some((p) => p.payment.id === r.paymentId)).map((r) => ({ refund: r, ...need(pays.find((p) => p.payment.id === r.paymentId)), requester: lookups.user(r.requestedBy) }));
    return { pays, refunds, invoices: invs, monthTotal: pays.filter((p) => p.payment.paidAt.startsWith("2026-10")).reduce((s, p) => s + p.payment.amount, 0) };
  },
  async reviewRefund(me: User, id: number, approve: boolean) {
    await wait(300);
    const r = need(byId(db().refunds, id));
    r.status = approve ? "APPROVED" : "REJECTED";
    r.processedBy = me.id;
    if (approve) r.refundedAt = nowIso();
    notify(r.requestedBy, "PAYMENT", approve ? `Đã hoàn tiền ${refundCode(r.id)}` : `Yêu cầu ${refundCode(r.id)} bị từ chối`, approve ? "Tiền hoàn về ví gốc qua cổng thanh toán" : "Liên hệ trung tâm để biết thêm");
    audit(me.id, `${approve ? "Duyệt" : "Từ chối"} hoàn tiền ${refundCode(r.id)}`, "refunds", r.id);
    commit();
  },
  async invoice(me: User, id: number) {
    await wait();
    const inv = need(byId(db().invoices, id));
    const reg = need(byId(db().registrations, inv.registrationId));
    const e = need(lookups.elderly(reg.elderlyId));
    if (me.role === "FAMILY" ? e.familyUserId !== me.id : e.centerId !== me.centerId && lookups.pkg(reg.packageId)?.centerId !== me.centerId) throw new Error("Không có quyền xem hoá đơn này");
    return { invoice: inv, reg, elderly: e, family: lookups.user(e.familyUserId), pkg: need(lookups.pkg(reg.packageId)), center: lookups.center(lookups.pkg(reg.packageId)?.centerId), payments: db().payments.filter((p) => p.invoiceId === id) };
  },
  async adjustInvoice(me: User, id: number, discount: number, additionalCharge: number) {
    await wait();
    const inv = need(byId(db().invoices, id));
    if (inv.status === "PAID") throw new Error("Hoá đơn đã thanh toán chỉ điều chỉnh bằng hoàn tiền");
    Object.assign(inv, { discount, additionalCharge, total: inv.subtotal - discount + additionalCharge });
    audit(me.id, `Điều chỉnh hoá đơn ${inv.number}`, "invoices", inv.id);
    commit();
  },

  async reports(me: User) {
    await wait();
    const { pays } = await manager.payments(me);
    const sept = pays.filter((p) => p.payment.paidAt.startsWith("2026-09")).reduce((s, p) => s + p.payment.amount, 0);
    return {
      attendanceRate: 88, revenue: sept, participation: 81, newMembers: 3,
      weekly: [82, 86, 90, 94],
      activities: [["Thể chất", 90], ["Trí nhớ", 68], ["Giao lưu", 80], ["Âm nhạc", 74]] as [string, number][],
    };
  },

  async packages(me: User) {
    await wait();
    return db().packages.filter((p) => p.centerId === cid(me)).map((p) => ({ pkg: p, services: servicesOfPackage(p.id), activeRegs: db().registrations.filter((r) => r.packageId === p.id && r.status === "ACTIVE").length }));
  },
  async savePackage(me: User, input: Omit<ServicePackage, "id" | "centerId"> & { id?: number; serviceIds: number[] }) {
    await wait();
    const d = db();
    const { serviceIds, id, ...rest } = input;
    let pkgId = id;
    if (id) Object.assign(need(d.packages.find((p) => p.id === id && p.centerId === cid(me))), rest);
    else {
      pkgId = nextId(d.packages);
      d.packages.push({ id: pkgId, centerId: cid(me), ...rest });
    }
    d.packageServices = d.packageServices.filter((ps) => ps.packageId !== pkgId).concat(serviceIds.map((serviceId) => ({ packageId: pkgId!, serviceId })));
    audit(me.id, `Lưu gói dịch vụ ${rest.name}`, "service_packages", pkgId);
    commit();
    return pkgId!;
  },
  async services(me: User) {
    await wait();
    return db().services.filter((s) => s.centerId === cid(me)).map((s) => ({ service: s, inPackages: db().packageServices.filter((ps) => ps.serviceId === s.id).length }));
  },
  async saveService(me: User, input: Omit<Service, "id" | "centerId"> & { id?: number }) {
    await wait();
    const d = db();
    const { id, ...rest } = input;
    if (id) Object.assign(need(d.services.find((s) => s.id === id && s.centerId === cid(me))), rest);
    else d.services.push({ id: nextId(d.services), centerId: cid(me), ...rest });
    commit();
  },

  async absences(me: User) {
    await wait();
    return db()
      .absences.filter((a) => lookups.elderly(a.elderlyId)?.centerId === cid(me))
      .map((a) => {
        const e = need(lookups.elderly(a.elderlyId));
        const pkg = lookups.pkg(activeReg(e.id)?.packageId);
        const days = Math.round((new Date(a.toDate).getTime() - new Date(a.fromDate).getTime()) / 86_400_000) + 1;
        return { absence: a, elderly: e, requester: lookups.user(a.requestedBy), pkg, days, refund: pkg && pkg.billingPeriod === "MONTHLY" ? 250000 * days : 0 };
      });
  },
  async reviewAbsence(me: User, id: number, approve: boolean, createRefund: boolean) {
    await wait();
    const d = db();
    const a = need(byId(d.absences, id));
    a.status = approve ? "APPROVED" : "REJECTED";
    if (approve) {
      for (let day = a.fromDate; day <= a.toDate; day = addDays(day, 1)) {
        const att = d.attendance.find((x) => x.elderlyId === a.elderlyId && x.date === day);
        if (att) att.status = "ABSENT";
      }
      if (createRefund) {
        const reg = activeReg(a.elderlyId);
        const inv = reg ? invoiceOfReg(reg.id) : undefined;
        const p = inv ? paymentOfInvoice(inv.id) : undefined;
        const days = Math.round((new Date(a.toDate).getTime() - new Date(a.fromDate).getTime()) / 86_400_000) + 1;
        if (p) d.refunds.unshift({ id: nextId(d.refunds), paymentId: p.id, requestedBy: a.requestedBy, amount: 250000 * days, reason: `Nghỉ ${a.reason.toLowerCase()} ${days} ngày`, status: "REQUESTED", createdAt: nowIso() });
      }
    }
    notify(a.requestedBy, "ATTENDANCE", approve ? "Báo nghỉ đã được duyệt" : "Báo nghỉ bị từ chối", `${lookups.elderly(a.elderlyId)?.fullName}`);
    commit();
  },

  async settings(me: User) {
    await wait();
    const d = db();
    return { center: need(lookups.center(cid(me))), settings: need(d.centerSettings.find((s) => s.centerId === cid(me))) };
  },
  async saveCenter(me: User, input: Pick<Center, "name" | "phone" | "email" | "address">) {
    await wait();
    Object.assign(need(lookups.center(cid(me))), input);
    commit();
  },
  async saveSettings(me: User, input: Partial<CenterSettings>) {
    await wait();
    Object.assign(need(db().centerSettings.find((s) => s.centerId === cid(me))), input);
    commit();
  },
};

// ---------------------------------------------------------------- staff
export const staff = {
  async myElderly(me: User) {
    await wait();
    return db()
      .elderly.filter((e) => e.assignedStaffId === me.id && e.status !== "PENDING")
      .map((e) => ({ elderly: e, a: attToday(e.id), absence: db().absences.find((x) => x.elderlyId === e.id && x.fromDate <= TODAY && x.toDate >= TODAY && x.status !== "REJECTED"), reg: activeReg(e.id) }));
  },
  async allElderly(me: User) {
    await wait();
    return db().elderly.filter((e) => e.centerId === me.centerId && e.status === "ACTIVE").map((e) => ({ elderly: e, a: attToday(e.id), absence: undefined as AbsenceRequest | undefined, reg: activeReg(e.id) }));
  },
  async checkIn(me: User, elderlyId: number) {
    const d = db();
    const e = need(lookups.elderly(elderlyId));
    let a = attToday(elderlyId);
    if (!a) {
      a = { id: nextId(d.attendance), elderlyId, date: TODAY, status: "EXPECTED" };
      d.attendance.push(a);
    }
    a.checkIn = nowIso().slice(11, 16);
    a.status = "PRESENT";
    a.checkedInBy = me.id;
    notify(e.familyUserId, "ATTENDANCE", `${e.fullName} đã đến trung tâm`, `Check-in lúc ${a.checkIn}`);
    commit();
  },
  async checkOut(me: User, elderlyId: number) {
    const e = need(lookups.elderly(elderlyId));
    const a = need(attToday(elderlyId));
    a.checkOut = nowIso().slice(11, 16);
    a.status = "LEFT";
    a.checkedOutBy = me.id;
    notify(e.familyUserId, "ATTENDANCE", `${e.fullName} đã về nhà`, `Check-out lúc ${a.checkOut}`);
    commit();
  },
  async today(me: User) {
    await wait();
    const d = db();
    const assigned = d.elderly.filter((e) => e.assignedStaffId === me.id && e.healthTags.length);
    return {
      items: d.schedules.filter((s) => s.centerId === me.centerId && s.date === TODAY).map((s) => ({ ...s, service: need(lookups.service(s.serviceId)) })),
      menu: d.menus.find((m) => m.centerId === me.centerId && m.date === TODAY),
      notes: assigned.map((e) => ({ elderly: e, note: e.healthTags.join(", ") })),
    };
  },
  async createLog(me: User, input: { elderlyId: number; generalCondition: CareLog["generalCondition"]; bloodPressure: string; temperature: string; lunch: string; note: string; flag: boolean; issueNote: string; serviceIds: number[]; photos: number }) {
    await wait();
    const d = db();
    const e = need(lookups.elderly(input.elderlyId));
    if (e.assignedStaffId !== me.id) throw new Error("Bạn không phụ trách người cao tuổi này");
    let log = d.careLogs.find((l) => l.elderlyId === input.elderlyId && l.date === TODAY && l.staffId === me.id);
    const base = { generalCondition: input.generalCondition, bloodPressure: input.bloodPressure, temperature: input.temperature, lunch: input.lunch, note: input.note, issueNote: input.flag ? input.issueNote : undefined, issueSeverity: input.flag ? ("HIGH" as const) : undefined, issueStatus: input.flag ? ("NEW" as const) : ("NONE" as const) };
    if (log) Object.assign(log, base);
    else {
      log = { id: nextId(d.careLogs), elderlyId: input.elderlyId, staffId: me.id, date: TODAY, ...base };
      d.careLogs.push(log);
    }
    const logId = log.id;
    d.careLogServices = d.careLogServices.filter((c) => c.careLogId !== logId).concat(input.serviceIds.map((serviceId) => ({ careLogId: logId, serviceId, status: "DONE" as const })));
    const tones = ["blue", "orange", "green"] as const;
    for (let i = d.photos.filter((p) => p.careLogId === logId).length; i < input.photos; i++) d.photos.push({ id: nextId(d.photos), careLogId: logId, caption: "Ảnh trong ngày", tone: tones[i % 3] });
    notify(e.familyUserId, "CARE_LOG", "Nhật ký hôm nay đã cập nhật", `${e.fullName} · ${input.note.slice(0, 50)}`);
    if (input.flag) managersOf(e.centerId).forEach((m) => notify(m.id, "CARE_LOG", "Nhật ký cần lưu ý", `${e.fullName} · ${input.issueNote}`));
    commit();
    return logId;
  },
  async myLogs(me: User) {
    await wait();
    return db()
      .careLogs.filter((l) => l.staffId === me.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((l) => ({ log: l, elderly: need(lookups.elderly(l.elderlyId)), photos: db().photos.filter((p) => p.careLogId === l.id).length }));
  },
  async log(me: User, elderlyId: number) {
    await wait(60);
    const l = db().careLogs.find((x) => x.elderlyId === elderlyId && x.date === TODAY && x.staffId === me.id);
    return l ? { log: l, serviceIds: db().careLogServices.filter((c) => c.careLogId === l.id).map((c) => c.serviceId), photos: db().photos.filter((p) => p.careLogId === l.id).length } : undefined;
  },
  async myShifts(me: User, dates: string[]) {
    await wait();
    const d = db();
    const fromAssign = d.shiftAssignments.filter((a) => a.staffId === me.id).map((a) => need(byId(d.shifts, a.shiftId)));
    const fromAi = d.aiSuggestions.filter((s) => s.staffId === me.id && s.status === "APPROVED").map((s) => need(byId(d.shifts, s.shiftId)));
    return [...fromAssign, ...fromAi].filter((s) => dates.includes(s.date));
  },
  async profile(me: User, elderlyId: number) {
    await wait();
    const e = need(lookups.elderly(elderlyId));
    if (e.assignedStaffId !== me.id) throw new Error("Bạn chỉ xem được hồ sơ người cao tuổi mình phụ trách");
    const d = db();
    return {
      elderly: e, reg: activeReg(e.id), pkg: lookups.pkg(activeReg(e.id)?.packageId), a: attToday(e.id),
      today: d.schedules.filter((s) => s.centerId === e.centerId && s.date === TODAY).map((s) => ({ ...s, service: need(lookups.service(s.serviceId)) })),
      lastLog: d.careLogs.filter((l) => l.elderlyId === e.id).sort((a, b) => b.date.localeCompare(a.date))[0],
    };
  },
};

// ---------------------------------------------------------------- admin (centres only — no personal elderly data)
export const admin = {
  async dashboard() {
    await wait();
    const d = db();
    return {
      centers: d.centers.filter((c) => c.status === "ACTIVE").length, pendingCenters: d.centers.filter((c) => c.status === "PENDING").length,
      expiring: d.centers.filter((c) => c.contractEnd && c.contractEnd <= "2026-11-30" && c.status === "ACTIVE").length,
      elderly: 1240, families: d.users.filter((u) => u.role === "FAMILY").length + 966, staff: d.users.filter((u) => u.role === "STAFF").length + 207,
      growth: [820, 900, 960, 1040, 1130, 1240],
    };
  },
  async centers() {
    await wait();
    const d = db();
    return d.centers.map((c) => ({ center: c, manager: d.users.find((u) => u.role === "MANAGER" && u.centerId === c.id), elderly: c.status === "PENDING" ? 0 : [24, 31, 18, 0, 12][c.id - 1] ?? 0 }));
  },
  async center(id: number) {
    await wait();
    const d = db();
    const c = need(lookups.center(id));
    return { center: c, manager: d.users.find((u) => u.role === "MANAGER" && u.centerId === id), settings: d.centerSettings.find((s) => s.centerId === id) };
  },
  async setCenterStatus(me: User, id: number, status: Center["status"]) {
    await wait();
    const c = need(lookups.center(id));
    c.status = status;
    if (status === "ACTIVE" && !c.contractStart) Object.assign(c, { contractStart: "2026-11-01", contractEnd: "2027-10-31" });
    audit(me.id, `${status === "ACTIVE" ? "Kích hoạt" : status === "SUSPENDED" ? "Khoá" : "Cập nhật"} trung tâm ${c.name}`, "centers", id);
    commit();
  },
  async saveCenter(me: User, input: Omit<Center, "id" | "status"> & { id?: number; managerName: string; managerEmail: string }) {
    await wait();
    const d = db();
    const { managerName, managerEmail, id, ...rest } = input;
    let c: Center;
    if (id) {
      c = need(lookups.center(id));
      Object.assign(c, rest);
    } else {
      c = { id: nextId(d.centers), status: "PENDING", ...rest };
      d.centers.push(c);
    }
    let m = d.users.find((u) => u.role === "MANAGER" && u.centerId === c.id);
    if (!m) {
      m = { id: nextId(d.users), centerId: c.id, role: "MANAGER", fullName: managerName, email: managerEmail, phone: "", password: "demo1234", status: "INVITED" };
      d.users.push(m);
      d.centerSettings.push({ centerId: c.id, openingHours: "", pickupPolicy: "", refundPolicy: "", faqs: [], aiEnabled: false, vnpayConnected: false, momoConnected: false });
    } else Object.assign(m, { fullName: managerName, email: managerEmail });
    audit(me.id, `Lưu trung tâm ${c.name}`, "centers", c.id);
    commit();
    return c.id;
  },
  async managers() {
    await wait();
    return db().users.filter((u) => u.role === "MANAGER").map((u) => ({ user: u, center: lookups.center(u.centerId) }));
  },
  async setUserStatus(me: User, userId: number, status: User["status"]) {
    await wait();
    const u = need(lookups.user(userId));
    u.status = status;
    audit(me.id, `${status === "LOCKED" ? "Khoá" : "Mở khoá"} tài khoản ${u.email}`, "users", u.id);
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

export const ROLE_PERMISSIONS: { label: string; roles: Role[] }[] = [
  { label: "Quản lý trung tâm & hợp đồng", roles: ["ADMIN"] },
  { label: "Xem thống kê toàn hệ thống", roles: ["ADMIN"] },
  { label: "Thu tiền & duyệt hoàn tiền", roles: ["MANAGER"] },
  { label: "Quản lý gói & dịch vụ", roles: ["MANAGER"] },
  { label: "Duyệt gợi ý xếp ca AI", roles: ["MANAGER"] },
  { label: "Điểm danh & ghi nhật ký", roles: ["MANAGER", "STAFF"] },
  { label: "Xem lịch & thực đơn", roles: ["MANAGER", "STAFF", "FAMILY"] },
  { label: "Xem nhật ký người thân", roles: ["MANAGER", "STAFF", "FAMILY"] },
  { label: "Nhắn tin", roles: ["ADMIN", "MANAGER", "STAFF", "FAMILY"] },
  { label: "Xem nhật ký hệ thống", roles: ["ADMIN"] },
];

// ---------------------------------------------------------------- family
const mine = (me: User) => db().elderly.filter((e) => e.familyUserId === me.id);
const ownElderly = (me: User, id: number) => need(mine(me).find((e) => e.id === id), "Không có quyền với hồ sơ này");

export const family = {
  async relatives(me: User) {
    await wait();
    return mine(me).map((e) => {
      const reg = activeReg(e.id) ?? db().registrations.find((r) => r.elderlyId === e.id && r.status === "PENDING");
      return { elderly: e, reg, pkg: lookups.pkg(reg?.packageId), center: lookups.center(e.centerId ?? lookups.pkg(reg?.packageId)?.centerId), a: attToday(e.id), staff: lookups.user(e.assignedStaffId) };
    });
  },
  async saveRelative(me: User, input: Omit<ElderlyMember, "id" | "centerId" | "familyUserId" | "status" | "healthTags"> & { id?: number; healthTags: string }) {
    await wait();
    const d = db();
    const { id, healthTags, ...rest } = input;
    const tags = healthTags.split(",").map((s) => s.trim()).filter(Boolean);
    if (id) {
      Object.assign(ownElderly(me, id), rest, { healthTags: tags });
      commit();
      return id;
    }
    const e: ElderlyMember = { id: nextId(d.elderly), centerId: null, familyUserId: me.id, status: "PENDING", healthTags: tags, ...rest };
    d.elderly.push(e);
    commit();
    return e.id;
  },
  async centers(q: string) {
    await wait();
    const d = db();
    const s = q.trim().toLowerCase();
    return d.centers
      .filter((c) => c.status === "ACTIVE" && (!s || c.name.toLowerCase().includes(s) || c.district.toLowerCase().includes(s) || c.address.toLowerCase().includes(s)))
      .map((c) => {
        const pkgs = d.packages.filter((p) => p.centerId === c.id && p.status === "ACTIVE");
        const minP = pkgs.sort((a, b) => a.price - b.price)[0];
        return { center: c, packages: pkgs.length, from: minP, highlights: d.services.filter((x) => x.centerId === c.id && x.status === "ACTIVE").slice(0, 3).map((x) => x.name) };
      });
  },
  async center(id: number) {
    await wait();
    const d = db();
    const c = need(lookups.center(id));
    return { center: c, settings: d.centerSettings.find((s) => s.centerId === id), packages: d.packages.filter((p) => p.centerId === id && p.status === "ACTIVE").map((p) => ({ pkg: p, services: servicesOfPackage(p.id) })) };
  },
  async packageDetail(id: number) {
    await wait();
    const d = db();
    const p = need(lookups.pkg(id));
    const services = servicesOfPackage(id);
    const week = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"].map((date) => ({ date, items: d.schedules.filter((s) => s.centerId === p.centerId && s.date === date).map((s) => need(lookups.service(s.serviceId))) }));
    return { pkg: p, center: need(lookups.center(p.centerId)), services, week };
  },
  async register(me: User, input: { elderlyId: number; packageId: number; startDate: string; months: number }) {
    await wait();
    const d = db();
    const e = ownElderly(me, input.elderlyId);
    const pkg = need(lookups.pkg(input.packageId));
    const days = pkg.billingPeriod === "DAILY" ? input.months : 30 * input.months;
    const reg = { id: nextId(d.registrations), elderlyId: e.id, packageId: pkg.id, registeredBy: me.id, startDate: input.startDate, endDate: addDays(input.startDate, days - 1), status: "PENDING" as const, registeredAt: nowIso() };
    d.registrations.push(reg);
    const subtotal = pkg.price * input.months;
    const extra = activeReg(e.id) ? 0 : 300000;
    const invoiceId = nextId(d.invoices);
    d.invoices.push({ id: invoiceId, registrationId: reg.id, number: `HD-2610-${String(invoiceId).padStart(5, "0")}`, subtotal, discount: 0, additionalCharge: extra, total: subtotal + extra, issueDate: TODAY, dueDate: addDays(TODAY, 4), status: "UNPAID" });
    commit();
    return invoiceId;
  },
  /** Simulates the VNPay / MoMo redirect + callback. */
  async pay(me: User, invoiceId: number, method: PaymentMethod, fail = false) {
    await wait(700);
    const d = db();
    const inv = need(byId(d.invoices, invoiceId));
    const reg = need(byId(d.registrations, inv.registrationId));
    ownElderly(me, reg.elderlyId);
    if (fail) {
      d.payments.push({ id: nextId(d.payments), invoiceId, payerId: me.id, amount: inv.total, method, transactionCode: `${method === "VNPAY" ? "VNP" : "MOMO"}-${Date.now() % 100000}`, status: "FAILED", paidAt: nowIso() });
      commit();
      return { ok: false as const };
    }
    const p = { id: nextId(d.payments), invoiceId, payerId: me.id, amount: inv.total, method, transactionCode: `${method === "VNPAY" ? "VNP" : "MOMO"}-${88000 + nextId(d.payments)}`, status: "SUCCESS" as const, paidAt: nowIso() };
    d.payments.push(p);
    inv.status = "PAID";
    const e = need(lookups.elderly(reg.elderlyId));
    managersOf(lookups.pkg(reg.packageId)?.centerId ?? null).forEach((m) => notify(m.id, "SYSTEM", "Đăng ký mới chờ duyệt", `${e.fullName} · ${lookups.pkg(reg.packageId)?.name}`));
    notify(me.id, "PAYMENT", "Thanh toán thành công", `${inv.number} · ${p.transactionCode}`);
    commit();
    return { ok: true as const, payment: p };
  },
  async registrations(me: User) {
    await wait();
    const ids = new Set(mine(me).map((e) => e.id));
    return db()
      .registrations.filter((r) => ids.has(r.elderlyId))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .map((r) => ({ reg: r, elderly: need(lookups.elderly(r.elderlyId)), pkg: need(lookups.pkg(r.packageId)), center: lookups.center(lookups.pkg(r.packageId)?.centerId) }));
  },
  async invoices(me: User) {
    await wait();
    const regs = await family.registrations(me);
    return db()
      .invoices.filter((i) => regs.some((r) => r.reg.id === i.registrationId))
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
      .map((i) => {
        const p = paymentOfInvoice(i.id);
        return { invoice: i, payment: p, refunds: p ? db().refunds.filter((r) => r.paymentId === p.id) : [], reg: need(regs.find((r) => r.reg.id === i.registrationId)) };
      });
  },
  async invoice(me: User, id: number) {
    return manager.invoice(me, id);
  },
  async requestRefund(me: User, paymentId: number, amount: number, reason: string) {
    await wait();
    const d = db();
    const p = need(byId(d.payments, paymentId));
    if (p.payerId !== me.id) throw new Error("Không có quyền");
    const r = { id: nextId(d.refunds), paymentId, requestedBy: me.id, amount, reason, status: "REQUESTED" as const, createdAt: nowIso() };
    d.refunds.unshift(r);
    const inv = need(byId(d.invoices, p.invoiceId));
    const reg = need(byId(d.registrations, inv.registrationId));
    managersOf(lookups.pkg(reg.packageId)?.centerId ?? null).forEach((m) => notify(m.id, "PAYMENT", `Yêu cầu hoàn tiền ${refundCode(r.id)}`, `${me.fullName} · ${amount.toLocaleString("vi-VN")}đ`));
    commit();
    return r.id;
  },
  async careLog(me: User, elderlyId: number, date: string) {
    await wait();
    ownElderly(me, elderlyId);
    const d = db();
    const log = d.careLogs.find((l) => l.elderlyId === elderlyId && l.date === date);
    return log ? { log, staff: lookups.user(log.staffId), services: d.careLogServices.filter((c) => c.careLogId === log.id).map((c) => ({ ...c, service: need(lookups.service(c.serviceId)) })), photos: d.photos.filter((p) => p.careLogId === log.id) } : undefined;
  },
  async schedule(me: User, elderlyId: number, dates: string[]) {
    await wait();
    const e = ownElderly(me, elderlyId);
    const d = db();
    const reg = activeReg(e.id);
    const inPkg = new Set(reg ? servicesOfPackage(reg.packageId).map((s) => s.id) : []);
    return {
      elderly: e,
      items: d.schedules.filter((s) => s.centerId === e.centerId && dates.includes(s.date)).map((s) => ({ ...s, service: need(lookups.service(s.serviceId)), inPackage: inPkg.has(s.serviceId) })),
      menus: d.menus.filter((m) => m.centerId === e.centerId && dates.includes(m.date)),
    };
  },
  async absence(me: User, input: Omit<AbsenceRequest, "id" | "requestedBy" | "status">) {
    await wait();
    const d = db();
    const e = ownElderly(me, input.elderlyId);
    d.absences.unshift({ id: nextId(d.absences), requestedBy: me.id, status: "PENDING", ...input });
    managersOf(e.centerId).forEach((m) => notify(m.id, "ATTENDANCE", "Báo nghỉ từ gia đình", `${e.fullName} · ${input.fromDate.slice(8)}/${input.fromDate.slice(5, 7)}`));
    commit();
  },
  /** Rule-based stand-in for the LLM assistant: answers only from the centre's own data. */
  async ask(me: User, question: string) {
    await wait(500);
    const d = db();
    const e = mine(me).find((x) => x.centerId);
    if (!e) return "Bạn chưa có người thân đang tham gia trung tâm nào.";
    const s = d.centerSettings.find((x) => x.centerId === e.centerId);
    const c = lookups.center(e.centerId);
    const q = question.toLowerCase();
    const reg = activeReg(e.id);
    const svc = reg ? servicesOfPackage(reg.packageId) : [];
    if (!s?.aiEnabled) return "Trợ lý AI của trung tâm đang tắt. Vui lòng nhắn nhân viên.";
    if (/giờ|mở cửa|đón|trả/.test(q)) return `${c?.name} hoạt động ${s.openingHours}. ${s.pickupPolicy}.`;
    if (/hoàn|refund|nghỉ/.test(q)) return `Chính sách hoàn tiền: ${s.refundPolicy}. Bạn có thể gửi yêu cầu ở mục Gói của tôi.`;
    if (/gói|dịch vụ|vật lý|bữa|hoạt động/.test(q) && reg) return `Gói ${lookups.pkg(reg.packageId)?.name} của ${e.fullName} gồm: ${svc.map((x) => x.name).join(", ")}.`;
    if (/dị ứng|ăn|thực đơn/.test(q)) return `Hồ sơ của ${e.fullName} ghi: ${e.healthTags.join(", ") || "không có lưu ý"}. Trung tâm điều chỉnh món ăn theo hồ sơ.`;
    const faq = s.faqs.find((f) => f.q.toLowerCase().split(" ").some((w) => w.length > 3 && q.includes(w)));
    if (faq) return faq.a;
    return "Mình chưa có thông tin cho câu hỏi này. Bạn muốn nhắn trực tiếp nhân viên trung tâm không?";
  },
  async notifications(me: User) {
    return inbox.notifications(me);
  },
};

export type { Invoice };
