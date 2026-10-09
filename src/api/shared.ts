import type { Message, User } from "../types/models";
import { GROUP_LABEL, TIERS, TIER_LABEL } from "../domain/catalog";
import { audit, capacity, commit, db, entitlement, lookups, need, nextId, notify, notifyManagers, stamp, wait } from "./core";

// ---------------------------------------------------------------- auth & profile
export const auth = {
  async login(email: string, password: string) {
    await wait();
    const u = db().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password) throw new Error("Email hoặc mật khẩu không đúng");
    if (u.status === "LOCKED") throw new Error("Tài khoản đang bị khóa. Liên hệ quản trị viên.");
    u.lastLoginAt = stamp();
    if (u.status === "INVITED") u.status = "ACTIVE";
    audit(u.id, "Đăng nhập thành công", "users", u.id);
    commit();
    return u;
  },
  async registerFamily(input: { fullName: string; email: string; phone: string; password: string }) {
    await wait();
    const d = db();
    if (d.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) throw new Error("Email đã được sử dụng");
    const u: User = { id: nextId(d.users), role: "FAMILY", status: "INVITED", ...input };
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

// ---------------------------------------------------------------- notifications & messages (BR-40)
const assignedStaffOfFamily = (familyId: number) => {
  const ids = new Set<number>();
  db().elderly.filter((e) => e.familyUserId === familyId && e.status !== "TERMINATED").forEach((e) => { if (e.caregiverId) ids.add(e.caregiverId); if (e.nurseId) ids.add(e.nurseId); });
  return ids;
};
const familiesOfStaff = (staffId: number) => new Set(db().elderly.filter((e) => (e.caregiverId === staffId || e.nurseId === staffId) && ["ACTIVE", "PAUSED"].includes(e.status)).map((e) => e.familyUserId));

function canChat(me: User, partner: User) {
  if (me.role === "ADMIN" || partner.role === "ADMIN") return false;
  if (me.role === "FAMILY") return (partner.role === "STAFF" && assignedStaffOfFamily(me.id).has(partner.id)) || (partner.role === "MANAGER" && db().messages.some((m) => m.channel === "CHATBOT_HANDOFF" && (m.senderId === me.id || m.receiverId === me.id)));
  if (me.role === "STAFF") return partner.role === "MANAGER" || partner.role === "STAFF" || (partner.role === "FAMILY" && familiesOfStaff(me.id).has(partner.id));
  // MANAGER: staff (internal) and chatbot hand-offs only — never a family–staff thread (BR-40)
  return partner.role === "STAFF" || (partner.role === "FAMILY" && db().messages.some((m) => m.channel === "CHATBOT_HANDOFF" && (m.senderId === partner.id || m.receiverId === partner.id)));
}

export const inbox = {
  async notifications(me: User) {
    await wait(60);
    return db().notifications.filter((n) => n.userId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async markAllRead(me: User) {
    db().notifications.filter((n) => n.userId === me.id).forEach((n) => (n.isRead = true));
    commit();
  },
  async conversations(me: User) {
    await wait(60);
    const mine = db().messages.filter((m) => m.senderId === me.id || m.receiverId === me.id);
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
        return { partner, position: lookups.position(partnerId), elderly: lookups.elderly(msgs.find((m) => m.elderlyId)?.elderlyId), channel: last.channel, last, unread: msgs.filter((m) => m.receiverId === me.id && !m.isRead).length };
      })
      .sort((a, b) => b.last.sentAt.localeCompare(a.last.sentAt));
  },
  async thread(me: User, partnerId: number) {
    await wait(40);
    const msgs = db().messages.filter((m) => (m.senderId === me.id && m.receiverId === partnerId) || (m.senderId === partnerId && m.receiverId === me.id));
    msgs.filter((m) => m.receiverId === me.id).forEach((m) => (m.isRead = true));
    commit();
    return msgs.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  },
  async send(me: User, partnerId: number, text: string) {
    await wait(40);
    const partner = need(lookups.user(partnerId));
    if (!canChat(me, partner)) throw new Error("Bạn không được nhắn với người này (BR-40)");
    const d = db();
    const prev = d.messages.filter((m) => (m.senderId === partnerId && m.receiverId === me.id) || (m.senderId === me.id && m.receiverId === partnerId)).pop();
    const channel: Message["channel"] = prev?.channel === "CHATBOT_HANDOFF" ? "CHATBOT_HANDOFF" : me.role === "FAMILY" || partner.role === "FAMILY" ? "FAMILY_STAFF" : "INTERNAL";
    d.messages.push({ id: nextId(d.messages), senderId: me.id, receiverId: partnerId, elderlyId: prev?.elderlyId, channel, text, sentAt: stamp(), isRead: false });
    notify(partnerId, "MESSAGE", `Tin nhắn mới từ ${me.fullName}`, text.slice(0, 60));
    commit();
  },
  async contacts(me: User) {
    await wait(40);
    return db().users.filter((u) => u.id !== me.id && u.status !== "LOCKED" && canChat(me, u)).map((u) => ({ user: u, position: lookups.position(u.id) }));
  },
};

// ---------------------------------------------------------------- public site (khách vãng lai, BR-14)
export const publicSite = {
  async overview() {
    await wait(80);
    const d = db();
    const cap = capacity();
    return {
      settings: d.centerSettings,
      surcharges: d.groupSurcharges,
      tiers: TIERS.map((tier) => {
        const e = entitlement(tier);
        return { tier, from: e.dailyPrice, monthFrom: need(d.packages.find((p) => p.tier === tier && p.cycle === "MONTH")).basePrice, full: cap.find((c) => c.tier === tier)?.full ?? false, highlights: [`Bữa ${e.meals.toLowerCase()}`, e.napRoom, `Đo chỉ số ${e.vitalsPerDay} lần/ngày`, e.optionalMax === e.optionalPool ? `Cả ${e.optionalPool} hoạt động tự chọn` : `Chọn ${e.optionalMax} trong ${e.optionalPool} hoạt động`] };
      }),
      rooms: d.rooms.filter((r) => r.zone !== "NAP" || r.status === "ACTIVE"),
      schedule: d.schedules.filter((s) => s.date === "2026-10-09"),
    };
  },
  async bookVisit(input: { fullName: string; phone: string; date: string; time: string; note: string }) {
    await wait();
    const d = db();
    d.visits.unshift({ id: nextId(d.visits), ...input, createdAt: stamp(), status: "NEW" });
    notifyManagers("SYSTEM", "Lịch tham quan mới", `${input.fullName} · ${input.date.slice(8)}/${input.date.slice(5, 7)} ${input.time}`, "/manager/registrations?tab=visits");
    commit();
  },
};

/** Chatbot (BR-52): answers from FAQ + package data entered by the Manager; hands off otherwise. */
export const chatbot = {
  async ask(question: string, me?: User) {
    await wait(450);
    const d = db();
    const s = d.centerSettings;
    if (!s.aiEnabled) return { answer: "Trợ lý đang tạm tắt. Bạn vui lòng gọi " + s.phone + ".", handedOff: false };
    const q = question.toLowerCase();
    const has = (...k: string[]) => k.some((x) => q.includes(x));
    if (has("giá", "bao nhiêu", "phí", "tiền")) {
      const lines = TIERS.map((t) => `${TIER_LABEL[t]}: từ ${entitlement(t).dailyPrice.toLocaleString("vi-VN")}đ/ngày`).join("; ");
      return { answer: `Giá tham khảo theo hạng: ${lines}. Nhóm bệnh có phụ phí, báo sau buổi đánh giá. Gói quý giảm 5%, gói năm giảm 10%.`, handedOff: false };
    }
    if (has("giờ", "mấy giờ", "đón", "trả")) return { answer: `Trung tâm chăm sóc ${s.careStart}–${s.careEnd}, ${s.openDays}. Sau ${s.careEnd} cụ chờ đón miễn phí tới ${s.closingTime}, không có hoạt động và ăn uống.`, handedOff: false };
    if (has("nhóm", "bệnh", "tai biến", "sa sút", "tiểu đường", "nhận")) return { answer: `Trung tâm nhận 5 nhóm: ${Object.values(GROUP_LABEL).join(", ")}. Không nhận cụ nằm liệt giường, sa sút trí tuệ nặng hoặc cần chăm sóc tích cực.`, handedOff: false };
    const faq = s.faqs.find((f) => f.q.toLowerCase().split(/\s+/).filter((w) => w.length > 2).filter((w) => q.includes(w)).length >= 2);
    if (faq) return { answer: faq.a, handedOff: false };
    if (me && me.role === "FAMILY") {
      const mgr = d.users.find((u) => u.role === "MANAGER");
      if (mgr) {
        d.messages.push({ id: nextId(d.messages), senderId: me.id, receiverId: mgr.id, channel: "CHATBOT_HANDOFF", text: `[Chatbot chuyển] ${question}`, sentAt: stamp(), isRead: false });
        notify(mgr.id, "MESSAGE", "Chatbot chuyển câu hỏi", `${me.fullName}: ${question.slice(0, 50)}`, "/manager/messages");
        commit();
      }
      return { answer: "Mình chưa trả lời được câu này nên đã chuyển cho Quản lý trung tâm. Chị/anh sẽ nhận trả lời trong mục Tin nhắn.", handedOff: true };
    }
    return { answer: `Mình chưa trả lời được câu này. Bạn để lại số điện thoại ở mục Đặt lịch tham quan hoặc gọi ${s.phone} nhé.`, handedOff: false };
  },
};
