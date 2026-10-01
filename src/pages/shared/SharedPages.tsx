import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, Building2, CalendarDays, ClipboardList, CreditCard, Lock, MessageCircle, Search, Send, ShieldAlert, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { auth, family, inbox, lookups } from "../../api";
import { HOME, ROLE_LABEL, useAuth, useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, IconCircle, KV, Loading, Modal, Note, SelectField, cn } from "../../components/ui";
import { dmy, hm } from "../../lib/format";
import type { Notification, User } from "../../types/models";

// ------------------------------------------------------------------ notifications
const NOTE_ICON: Record<Notification["type"], [typeof Bell, "orange" | "red" | "teal" | "blue" | "purple" | "green"]> = {
  ATTENDANCE: [CalendarDays, "blue"], CARE_LOG: [ClipboardList, "green"], PAYMENT: [CreditCard, "orange"], MESSAGE: [MessageCircle, "purple"], SHIFT: [Users, "teal"], SYSTEM: [Bell, "orange"],
};
export function NotificationsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["notifications", me.id], queryFn: () => inbox.notifications(me) });
  const readAll = useMutation({ mutationFn: () => inbox.markAllRead(me), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", me.id] }) });
  const rows = (data ?? []).filter((n) => !unreadOnly || !n.isRead);
  return (
    <Page title="Thông báo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Chip active={!unreadOnly} onClick={() => setUnreadOnly(false)}>Tất cả</Chip>
          <Chip active={unreadOnly} onClick={() => setUnreadOnly(true)}>Chưa đọc</Chip>
        </div>
        <button className="text-[12px] font-semibold text-orange" onClick={() => readAll.mutate()}>Đánh dấu đã đọc tất cả</button>
      </div>
      <Card>
        {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState icon={Bell} title="Không có thông báo" /> : (
          <ul className="divide-y divide-line-soft">
            {rows.map((n) => {
              const [Icon, tone] = NOTE_ICON[n.type];
              return (
                <li key={n.id} className="flex items-center gap-3 py-3">
                  <IconCircle icon={Icon} tone={tone} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-[13px] text-navy", !n.isRead ? "font-semibold" : "font-medium")}>{n.title}</div>
                    <div className="truncate text-[11.5px] text-subtle">{n.message}</div>
                  </div>
                  <div className="text-[11px] text-subtle">{n.createdAt.slice(0, 10) === "2026-10-01" ? hm(n.createdAt) : dmy(n.createdAt.slice(0, 10))}</div>
                  {!n.isRead && <span className="size-2 rounded-full bg-orange" />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ profile
export function ProfilePage({ extra }: { extra?: ReactNode }) {
  const me = useMe();
  const { setUser } = useAuth();
  const [name, setName] = useState(me.fullName);
  const [phone, setPhone] = useState(me.phone);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [msg, setMsg] = useState("");
  const save = useMutation({ mutationFn: () => auth.updateProfile(me, { fullName: name, phone }), onSuccess: (u) => { setUser(u); setMsg("Đã lưu thông tin cá nhân"); } });
  const pw = useMutation({
    mutationFn: async () => {
      if (next.length < 8 || !/\d/.test(next) || !/[a-zA-Z]/.test(next)) throw new Error("Mật khẩu tối thiểu 8 ký tự, gồm chữ và số");
      if (next !== next2) throw new Error("Mật khẩu nhập lại không khớp");
      return auth.changePassword(me, cur, next);
    },
    onSuccess: () => { setCur(""); setNext(""); setNext2(""); setMsg("Đã cập nhật mật khẩu"); },
  });
  const center = lookups.center(me.centerId);
  return (
    <Page title={me.role === "FAMILY" ? "Tài khoản" : "Hồ sơ cá nhân"}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Avatar name={me.fullName} size={64} tone={me.role === "ADMIN" ? "purple" : "blue"} />
            <div className="text-[16px] font-bold text-navy">{me.fullName}</div>
            <Badge tone={me.role === "ADMIN" ? "purple" : me.role === "STAFF" ? "teal" : "blue"}>{ROLE_LABEL[me.role]}</Badge>
            <div className="text-[11.5px] text-subtle">{center?.name ?? (me.role === "ADMIN" ? "Nền tảng An Tâm Care" : "Tài khoản gia đình")}</div>
          </div>
          <div className="mt-3 border-t border-line-soft pt-2">
            <KV label="Email" w={70}>{me.email}</KV>
            <KV label="Điện thoại" w={70}>{me.phone || "—"}</KV>
            {me.lastLoginAt && <KV label="Đăng nhập" w={70}>{dmy(me.lastLoginAt.slice(0, 10))} {hm(me.lastLoginAt)}</KV>}
          </div>
        </Card>
        <div className="space-y-4">
          {msg && <Note tone="green">{msg}</Note>}
          <Card title="Thông tin cá nhân">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} />
              <Field label="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Field label="Email (không đổi được)" value={me.email} disabled className="sm:col-span-2" />
            </div>
            <Button className="mt-3" size="sm" loading={save.isPending} onClick={() => save.mutate()}>Lưu thay đổi</Button>
          </Card>
          <Card title="Đổi mật khẩu">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Mật khẩu hiện tại" type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="sm:col-span-2" />
              <Field label="Mật khẩu mới" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
              <Field label="Nhập lại mật khẩu mới" type="password" value={next2} onChange={(e) => setNext2(e.target.value)} />
            </div>
            <div className="mt-2"><ErrorText error={pw.error} /></div>
            <Button className="mt-3" size="sm" variant="outline" icon={Lock} loading={pw.isPending} onClick={() => pw.mutate()}>Cập nhật mật khẩu</Button>
          </Card>
          {extra}
          <Note>Mật khẩu tối thiểu 8 ký tự, gồm chữ và số. Phiên đăng nhập tự hết hạn sau 30 phút không thao tác.</Note>
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ messages (all roles)
type Filter = "ALL" | "FAMILY" | "STAFF" | "ADMIN" | "UNREAD";
const partnerTone = (u: User) => (u.role === "ADMIN" ? "purple" : u.role === "STAFF" ? "teal" : u.role === "MANAGER" ? "orange" : "blue") as "purple" | "teal" | "orange" | "blue";
const partnerSub = (u: User, elderlyName?: string) =>
  u.role === "FAMILY" ? `Gia đình${elderlyName ? ` · ${elderlyName}` : ""}` : u.role === "STAFF" ? u.position ?? "Nhân viên" : u.role === "ADMIN" ? "Hỗ trợ nền tảng" : lookups.center(u.centerId)?.name ?? "Quản lý trung tâm";

export function MessagesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [forward, setForward] = useState(false);
  const isFamily = me.role === "FAMILY";
  const selected = sp.get("to") === "ai" ? "ai" : sp.get("to") ? Number(sp.get("to")) : null;
  const convs = useQuery({ queryKey: ["convs", me.id], queryFn: () => inbox.conversations(me) });
  const list = useMemo(() => (convs.data ?? []).filter((c) => {
    if (q && !`${c.partner.fullName} ${c.center?.name ?? ""} ${c.elderly?.fullName ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "UNREAD") return c.unread > 0;
    if (filter === "FAMILY") return c.partner.role === "FAMILY";
    if (filter === "STAFF") return c.partner.role === "STAFF" || c.partner.role === "MANAGER";
    if (filter === "ADMIN") return c.partner.role === "ADMIN";
    return true;
  }), [convs.data, q, filter]);
  useEffect(() => {
    if (selected === null && list.length && !isFamily) setSp({ to: String(list[0].partner.id) }, { replace: true });
    if (selected === null && isFamily) setSp({ to: "ai" }, { replace: true });
  }, [selected, list, isFamily, setSp]);
  const partnerId = typeof selected === "number" ? selected : undefined;
  const thread = useQuery({ queryKey: ["thread", me.id, partnerId], queryFn: () => inbox.thread(me, partnerId!), enabled: !!partnerId });
  const send = useMutation({
    mutationFn: (t: string) => inbox.send(me, partnerId!, t),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["thread", me.id, partnerId] }); qc.invalidateQueries({ queryKey: ["convs", me.id] }); },
  });
  const partner = lookups.user(partnerId);
  const conv = convs.data?.find((c) => c.partner.id === partnerId);
  const chips: [Filter, string][] = me.role === "ADMIN" ? [["ALL", "Tất cả"], ["UNREAD", "Chưa đọc"]] : me.role === "MANAGER" ? [["ALL", "Tất cả"], ["FAMILY", "Gia đình"], ["STAFF", "Nhân viên"], ["ADMIN", "Admin"]] : [["ALL", "Tất cả"], ["UNREAD", "Chưa đọc"]];
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.data]);
  return (
    <Page title={me.role === "ADMIN" ? "Tin nhắn với trung tâm" : me.role === "STAFF" ? "Tin nhắn với gia đình" : "Tin nhắn"}>
      <div className="grid min-h-[540px] gap-3 lg:grid-cols-[300px_1fr]">
        <Card bodyClass="space-y-2">
          <div className="flex gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line px-2.5">
              <Search size={14} className="text-subtle" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={me.role === "ADMIN" ? "Tìm trung tâm…" : "Tìm cuộc trò chuyện…"} className="h-9 min-w-0 flex-1 text-[12.5px] outline-none" />
            </label>
            <Button size="md" variant="outline" onClick={() => setNewChat(true)}>Mới</Button>
          </div>
          <div className="flex flex-wrap gap-1.5">{chips.map(([v, l]) => <Chip key={v} active={filter === v} onClick={() => setFilter(v)}>{l}</Chip>)}</div>
          {isFamily && (
            <button onClick={() => setSp({ to: "ai" })} className={cn("flex w-full items-center gap-2.5 rounded-[10px] border px-2.5 py-2 text-left", selected === "ai" ? "border-orange bg-orange-soft" : "border-line")}>
              <IconCircle icon={Bot} tone="teal" size={32} />
              <span><span className="block text-[12.5px] font-semibold text-navy">Trợ lý AI</span><span className="text-[11px] text-subtle">Hỏi nhanh về trung tâm</span></span>
            </button>
          )}
          {convs.isLoading ? <Loading /> : list.map((c) => (
            <button key={c.partner.id} onClick={() => setSp({ to: String(c.partner.id) })} className={cn("flex w-full items-start gap-2.5 rounded-[10px] border px-2.5 py-2 text-left transition", c.partner.id === partnerId ? "border-orange bg-orange-soft" : "border-line hover:bg-canvas")}>
              <Avatar name={me.role === "ADMIN" ? c.center?.name.replace("Day-Care ", "") ?? c.partner.fullName : c.partner.fullName} size={32} tone={partnerTone(c.partner)} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1">
                  <span className="flex-1 truncate text-[12.5px] font-semibold text-navy">{me.role === "ADMIN" ? c.center?.name : c.partner.fullName}</span>
                  <span className="text-[10px] text-subtle">{c.last.sentAt.startsWith("2026-10-01") ? hm(c.last.sentAt) : dmy(c.last.sentAt.slice(0, 10)).slice(0, 5)}</span>
                </span>
                <span className="block truncate text-[10.5px] text-subtle">{me.role === "ADMIN" ? `${c.partner.fullName} · Center Manager` : partnerSub(c.partner, c.elderly?.fullName)}</span>
                <span className="flex items-center gap-1">
                  <span className={cn("flex-1 truncate text-[11.5px]", c.unread ? "font-semibold text-ink" : "text-muted")}>{c.last.text}</span>
                  {c.unread > 0 && <span className="size-2 rounded-full bg-orange" />}
                </span>
              </span>
            </button>
          ))}
          {me.role === "ADMIN" && <Note>Chỉ Quản lý trung tâm nhắn được với Admin. Gia đình và nhân viên không thấy kênh này.</Note>}
          {me.role === "STAFF" && <Note>Chỉ nhắn với gia đình của người cao tuổi bạn phụ trách.</Note>}
        </Card>
        <Card className="flex flex-col" bodyClass="flex flex-1 flex-col">
          {selected === "ai" ? <AiChat /> : !partner ? <EmptyState icon={MessageCircle} title="Chưa có cuộc trò chuyện" desc="Chọn một người ở danh sách bên trái hoặc bấm Mới." /> : (
            <>
              <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
                <Avatar name={partner.fullName} size={36} tone={partnerTone(partner)} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold text-navy">{me.role === "ADMIN" ? lookups.center(partner.centerId)?.name : partner.fullName}</div>
                  <div className="text-[11px] text-subtle">{me.role === "ADMIN" ? `${partner.fullName} · Center Manager` : partnerSub(partner, conv?.elderly?.fullName)}</div>
                </div>
                {me.role === "ADMIN" && <Button size="sm" variant="outline" icon={Building2} to={`/admin/centers/${partner.centerId}`}>Xem trung tâm</Button>}
                {me.role === "MANAGER" && partner.role === "FAMILY" && <Button size="sm" variant="neutral" icon={Users} onClick={() => setForward(true)}>Chuyển cho nhân viên</Button>}
                {me.role === "MANAGER" && conv?.elderly && <Button size="sm" variant="outline" to={`/manager/members/${conv.elderly.id}`}>Hồ sơ</Button>}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto py-3">
                {thread.isLoading ? <Loading /> : thread.data?.map((m) => {
                  const mineMsg = m.senderId === me.id;
                  return (
                    <div key={m.id} className={cn("flex", mineMsg ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed", mineMsg ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-bubble text-ink")}>
                        {m.text}
                        <div className={cn("mt-0.5 text-[9.5px]", mineMsg ? "text-right text-[#b8c4e0]" : "text-subtle")}>{hm(m.sentAt)}{mineMsg && m.isRead ? " · Đã xem" : ""}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(text.trim()); }}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập tin nhắn…" className="h-10 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-input-line px-3 text-[12.5px] outline-none focus:border-orange" />
                <Button type="submit" icon={Send} loading={send.isPending}>Gửi</Button>
              </form>
              <ErrorText error={send.error} />
            </>
          )}
        </Card>
      </div>
      <NewChatModal open={newChat} onClose={() => setNewChat(false)} onPick={(id) => { setNewChat(false); setSp({ to: String(id) }); }} />
      {partner && <ForwardModal open={forward} onClose={() => setForward(false)} family={partner} />}
    </Page>
  );
}

function NewChatModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: number) => void }) {
  const me = useMe();
  const { data = [] } = useQuery({ queryKey: ["contacts", me.id], queryFn: () => inbox.contacts(me), enabled: open });
  return (
    <Modal open={open} onClose={onClose} title="Cuộc trò chuyện mới">
      <ul className="max-h-80 space-y-1 overflow-y-auto">
        {data.map((u) => (
          <li key={u.id}>
            <button onClick={() => onPick(u.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-canvas">
              <Avatar name={u.fullName} size={30} tone={partnerTone(u)} />
              <span><span className="block text-[12.5px] font-semibold text-navy">{me.role === "ADMIN" ? lookups.center(u.centerId)?.name : u.fullName}</span><span className="text-[11px] text-subtle">{me.role === "ADMIN" ? u.fullName : ROLE_LABEL[u.role]}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function ForwardModal({ open, onClose, family: fam }: { open: boolean; onClose: () => void; family: User }) {
  const me = useMe();
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["contacts", me.id], queryFn: () => inbox.contacts(me), enabled: open });
  const staffList = data.filter((u) => u.role === "STAFF");
  const [sid, setSid] = useState<number>();
  const m = useMutation({ mutationFn: () => inbox.send(me, sid!, `Nhờ em trả lời giúp gia đình ${fam.fullName} trong mục Tin nhắn nhé.`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["convs", me.id] }); onClose(); } });
  return (
    <Modal open={open} onClose={onClose} title="Chuyển cho nhân viên" footer={<><Button variant="neutral" onClick={onClose}>Huỷ</Button><Button disabled={!sid} loading={m.isPending} onClick={() => m.mutate()}>Chuyển</Button></>}>
      <SelectField label="Nhân viên phụ trách" value={sid ?? ""} onChange={(e) => setSid(Number(e.target.value))}>
        <option value="">Chọn nhân viên…</option>
        {staffList.map((s) => <option key={s.id} value={s.id}>{s.fullName} · {s.position}</option>)}
      </SelectField>
      <Note className="mt-3">Nhân viên nhận tin nội bộ và tiếp tục trả lời gia đình (đề xuất cột messages.assigned_staff_id).</Note>
    </Modal>
  );
}

function AiChat() {
  const me = useMe();
  const [items, setItems] = useState<{ me: boolean; text: string }[]>([{ me: false, text: "Xin chào! Mình là trợ lý AI của trung tâm. Bạn có thể hỏi về giờ đón, gói dịch vụ, thực đơn hoặc chính sách hoàn tiền." }]);
  const [text, setText] = useState("");
  const ask = useMutation({ mutationFn: (q: string) => family.ask(me, q), onSuccess: (a) => setItems((x) => [...x, { me: false, text: a }]) });
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
        <IconCircle icon={Bot} tone="teal" size={36} />
        <div className="flex-1"><div className="text-[13.5px] font-bold text-navy">Trợ lý AI</div><div className="text-[11px] text-subtle">Trả lời dựa trên thông tin của trung tâm (LLM API)</div></div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto py-3">
        {items.map((m, i) => (
          <div key={i} className={cn("flex", m.me ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed", m.me ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-bubble")}>{m.text}</div>
          </div>
        ))}
        {ask.isPending && <div className="text-[11.5px] text-subtle">Trợ lý đang trả lời…</div>}
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {["Giờ đón là mấy giờ?", "Gói của bà gồm những gì?", "Chính sách hoàn tiền?"].map((s) => <Chip key={s} onClick={() => { setItems((x) => [...x, { me: true, text: s }]); ask.mutate(s); }}>{s}</Chip>)}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; setItems((x) => [...x, { me: true, text }]); ask.mutate(text); setText(""); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập câu hỏi…" className="h-10 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-input-line px-3 text-[12.5px] outline-none focus:border-orange" />
        <Button type="submit" icon={Send}>Gửi</Button>
      </form>
    </>
  );
}

// ------------------------------------------------------------------ errors
export function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <IconCircle icon={ShieldAlert} tone="red" size={88} />
        <h1 className="mt-3 text-[18px] font-bold text-navy">403 · Không có quyền truy cập</h1>
        <p className="mt-1 text-[12.5px] text-muted">Trang này không thuộc vai trò của bạn. Liên hệ quản lý nếu bạn cần quyền này.</p>
        <Button className="mt-4" to={user ? HOME[user.role] : "/login"}>Về trang chính</Button>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-3 bg-canvas p-6 text-center">
      <div className="text-[44px] font-bold text-navy">404</div>
      <p className="text-[13px] text-muted">Không tìm thấy trang.</p>
      <Link to="/" className="text-[13px] font-semibold text-orange">Về trang chính</Link>
    </div>
  );
}
