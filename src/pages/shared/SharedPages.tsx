import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, Building2, CalendarDays, ClipboardList, CreditCard, HeartPulse, Lock, MessageCircle, Send, ShieldAlert, Users, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth, inbox, lookups, manager } from "../../api";
import { HOME, ROLE_LABEL, useAuth, useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { PositionBadge, SearchBox } from "../../components/domain";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, IconCircle, KV, Loading, Modal, Note, TextArea, cn } from "../../components/ui";
import { POSITION_LABEL } from "../../domain/catalog";
import { dmy, hm } from "../../lib/format";
import type { Message, Notification, User } from "../../types/models";

const TODAY = "2026-10-09";
const when = (iso: string) => (iso.startsWith(TODAY) ? hm(iso) : dmy(iso.slice(0, 10)).slice(0, 5));

// ------------------------------------------------------------------ notifications
const NOTE_ICON: Record<Notification["type"], [typeof Bell, "orange" | "red" | "teal" | "blue" | "purple" | "green"]> = {
  ATTENDANCE: [CalendarDays, "blue"], CARE_LOG: [ClipboardList, "green"], HEALTH: [HeartPulse, "red"], PAYMENT: [CreditCard, "orange"], MESSAGE: [MessageCircle, "purple"], SHIFT: [Users, "teal"], FACILITY: [Wrench, "orange"], SYSTEM: [Bell, "blue"],
};
export function NotificationsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["notifications", me.id], queryFn: () => inbox.notifications(me) });
  const readAll = useMutation({ mutationFn: () => inbox.markAllRead(me), onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", me.id] }) });
  const rows = (data ?? []).filter((n) => !unreadOnly || !n.isRead);
  return (
    <Page title="Thông báo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Chip active={!unreadOnly} onClick={() => setUnreadOnly(false)}>Tất cả</Chip>
          <Chip active={unreadOnly} onClick={() => setUnreadOnly(true)}>Chưa đọc ({data?.filter((n) => !n.isRead).length ?? 0})</Chip>
        </div>
        <button className="text-[12px] font-semibold text-orange" onClick={() => readAll.mutate()}>Đánh dấu đã đọc tất cả</button>
      </div>
      <Card>
        {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState icon={Bell} title="Không có thông báo" /> : (
          <ul className="divide-y divide-line-soft">
            {rows.map((n) => {
              const [Icon, tone] = NOTE_ICON[n.type];
              return (
                <li key={n.id} className={cn("flex items-center gap-3 py-3", n.link && "cursor-pointer hover:bg-canvas")} onClick={() => n.link && nav(n.link)}>
                  <IconCircle icon={Icon} tone={tone} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-[13px] text-navy", !n.isRead ? "font-semibold" : "font-medium")}>{n.title}</div>
                    <div className="truncate text-[11.5px] text-subtle">{n.message}</div>
                  </div>
                  <div className="text-[11px] text-subtle">{when(n.createdAt)}</div>
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
  const pos = lookups.position(me.id);
  return (
    <Page title={me.role === "FAMILY" ? "Tài khoản" : "Hồ sơ cá nhân"}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Avatar name={me.fullName} size={64} tone={me.role === "ADMIN" ? "purple" : me.role === "STAFF" ? "teal" : "blue"} />
            <div className="text-[16px] font-bold text-navy">{me.fullName}</div>
            <Badge tone={me.role === "ADMIN" ? "purple" : me.role === "STAFF" ? "teal" : "blue"}>{pos ? POSITION_LABEL[pos] : ROLE_LABEL[me.role]}</Badge>
            <div className="text-[11.5px] text-subtle">{me.role === "FAMILY" ? "Tài khoản gia đình" : lookups.settings().name}</div>
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

// ------------------------------------------------------------------ messages (BR-40)
const partnerTone = (u: User) => (u.role === "STAFF" ? "teal" : u.role === "MANAGER" ? "orange" : "blue") as "teal" | "orange" | "blue";
const partnerSub = (u: User, elderlyName?: string) => {
  if (u.role === "FAMILY") return `Gia đình${elderlyName ? ` · ${elderlyName}` : ""}`;
  if (u.role === "STAFF") { const p = lookups.position(u.id); return p ? POSITION_LABEL[p] : "Nhân viên"; }
  return "Quản lý trung tâm";
};

export function MessagesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [newChat, setNewChat] = useState(false);
  const tab = sp.get("tab") ?? "mine";
  const selected = sp.get("to") ? Number(sp.get("to")) : undefined;
  const convs = useQuery({ queryKey: ["convs", me.id], queryFn: () => inbox.conversations(me) });
  const list = useMemo(() => (convs.data ?? []).filter((c) => !q || `${c.partner.fullName} ${c.elderly?.fullName ?? ""}`.toLowerCase().includes(q.toLowerCase())), [convs.data, q]);
  useEffect(() => {
    if (tab === "mine" && !selected && list.length) setSp({ to: String(list[0].partner.id) }, { replace: true });
  }, [selected, list, setSp, tab]);
  const thread = useQuery({ queryKey: ["thread", me.id, selected], queryFn: () => inbox.thread(me, selected!), enabled: !!selected && tab === "mine" });
  const send = useMutation({
    mutationFn: (t: string) => inbox.send(me, selected!, t),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey: ["thread", me.id, selected] }); qc.invalidateQueries({ queryKey: ["convs", me.id] }); },
  });
  const partner = lookups.user(selected);
  const conv = convs.data?.find((c) => c.partner.id === selected);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [thread.data]);
  return (
    <Page title="Tin nhắn" sub={me.role === "MANAGER" ? "Nội bộ với nhân viên và câu hỏi chatbot chuyển tới" : me.role === "STAFF" ? "Gia đình các cụ bạn phụ trách và nội bộ" : "Nhân viên phụ trách cụ"}>
      {me.role === "MANAGER" && (
        <div className="flex gap-1.5">
          <Chip active={tab === "mine"} onClick={() => setSp({ tab: "mine" })}>Hộp thư của tôi</Chip>
          <Chip active={tab === "audit"} onClick={() => setSp({ tab: "audit" })}>Lịch sử gia đình – nhân viên</Chip>
        </div>
      )}
      {tab === "audit" ? <FamilyThreadAudit /> : (
        <div className="grid min-h-[540px] gap-3 lg:grid-cols-[300px_1fr]">
          <Card bodyClass="space-y-2">
            <div className="flex gap-2">
              <SearchBox value={q} onChange={setQ} placeholder="Tìm cuộc trò chuyện…" className="flex-1" />
              <Button size="md" variant="outline" onClick={() => setNewChat(true)}>Mới</Button>
            </div>
            {convs.isLoading ? <Loading /> : list.length === 0 ? <div className="py-6 text-center text-[12px] text-subtle">Chưa có cuộc trò chuyện</div> : list.map((c) => (
              <button key={c.partner.id} onClick={() => setSp({ to: String(c.partner.id) })} className={cn("flex w-full items-start gap-2.5 rounded-[10px] border px-2.5 py-2 text-left transition", c.partner.id === selected ? "border-orange bg-orange-soft" : "border-line hover:bg-canvas")}>
                <Avatar name={c.partner.fullName} size={32} tone={partnerTone(c.partner)} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1">
                    <span className="flex-1 truncate text-[12.5px] font-semibold text-navy">{c.partner.fullName}</span>
                    <span className="text-[10px] text-subtle">{when(c.last.sentAt)}</span>
                  </span>
                  <span className="flex items-center gap-1 truncate text-[10.5px] text-subtle">{c.channel === "CHATBOT_HANDOFF" && <Bot size={11} className="text-teal" />}{c.channel === "CHATBOT_HANDOFF" ? "Chatbot chuyển · " : ""}{partnerSub(c.partner, c.elderly?.fullName)}</span>
                  <span className="flex items-center gap-1">
                    <span className={cn("flex-1 truncate text-[11.5px]", c.unread ? "font-semibold text-ink" : "text-muted")}>{c.last.text}</span>
                    {c.unread > 0 && <span className="size-2 rounded-full bg-orange" />}
                  </span>
                </span>
              </button>
            ))}
            {me.role === "STAFF" && <Note>Chỉ nhắn với gia đình của các cụ bạn phụ trách. Mọi tin nhắn đều được lưu (BR-40).</Note>}
            {me.role === "FAMILY" && <Note>Nhắn với điều dưỡng và hộ lý phụ trách cụ. Câu hỏi chung hãy dùng Trợ lý tư vấn.</Note>}
            {me.role === "MANAGER" && <Note>Quản lý không nhắn thay nhân viên. Tin nhắn gia đình – nhân viên chỉ mở khi có khiếu nại (tab bên trên).</Note>}
          </Card>
          <Card className="flex flex-col" bodyClass="flex flex-1 flex-col">
            {!partner ? <EmptyState icon={MessageCircle} title="Chưa chọn cuộc trò chuyện" desc="Chọn một người ở danh sách bên trái hoặc bấm Mới." /> : (
              <>
                <div className="flex items-center gap-2.5 border-b border-line-soft pb-3">
                  <Avatar name={partner.fullName} size={36} tone={partnerTone(partner)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-navy">{partner.fullName}</div>
                    <div className="text-[11px] text-subtle">{partnerSub(partner, conv?.elderly?.fullName)}</div>
                  </div>
                  {me.role === "MANAGER" && conv?.elderly && <Button size="sm" variant="outline" to={`/manager/members/${conv.elderly.id}`}>Hồ sơ cụ</Button>}
                  {me.role === "STAFF" && conv?.elderly && <Button size="sm" variant="outline" to={`/staff/elderly/${conv.elderly.id}`}>Care log</Button>}
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto py-3">
                  {thread.isLoading ? <Loading /> : thread.data?.map((m) => <Bubble key={m.id} m={m} mine={m.senderId === me.id} />)}
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
      )}
      <NewChatModal open={newChat} onClose={() => setNewChat(false)} onPick={(id) => { setNewChat(false); setSp({ to: String(id) }); }} />
    </Page>
  );
}

function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed", mine ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-bubble text-ink")}>
        {m.text}
        <div className={cn("mt-0.5 text-[9.5px]", mine ? "text-right text-[#b8c4e0]" : "text-subtle")}>{dmy(m.sentAt.slice(0, 10)).slice(0, 5)} {hm(m.sentAt)}{mine && m.isRead ? " · Đã xem" : ""}</div>
      </div>
    </div>
  );
}

function FamilyThreadAudit() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["m-fam-threads"], queryFn: () => manager.familyThreads() });
  const [pick, setPick] = useState<{ familyId: number; staffId: number }>();
  const [reason, setReason] = useState("");
  const open = useMutation({ mutationFn: () => manager.openFamilyThread(me, pick!.familyId, pick!.staffId, reason) });
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
      <Card title="Các cuộc trò chuyện gia đình – nhân viên">
        <Note className="mb-3">Bạn chỉ thấy ai nhắn với ai và số tin nhắn. Nội dung chỉ mở khi có khiếu nại hoặc gia đình yêu cầu; mỗi lần mở được ghi vào nhật ký hệ thống (BR-40).</Note>
        {isLoading ? <Loading /> : (
          <ul className="space-y-1.5">
            {data?.map((t) => (
              <li key={`${t.familyId}-${t.staffId}`}>
                <button onClick={() => { setPick(t); open.reset(); setReason(""); }} className={cn("flex w-full items-center gap-2 rounded-[10px] border px-3 py-2 text-left text-[12.5px]", pick?.familyId === t.familyId && pick.staffId === t.staffId ? "border-orange bg-orange-soft" : "border-line hover:bg-canvas")}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-navy">{t.family?.fullName} ↔ {t.staff?.fullName}</span>
                    <span className="text-[11px] text-subtle">{t.elderly ? `Cụ ${t.elderly.fullName} · ` : ""}{t.count} tin · gần nhất {when(t.last)}</span>
                  </span>
                  <PositionBadge position={lookups.position(t.staffId)} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Nội dung">
        {!pick ? <EmptyState icon={Lock} title="Chọn một cuộc trò chuyện" desc="Ghi lý do để mở lịch sử." /> : open.data ? (
          <div className="space-y-2">
            <Note tone="orange">Đã ghi nhật ký: {me.fullName} mở lịch sử lúc này. Lý do: {reason}</Note>
            {open.data.map((m) => <Bubble key={m.id} m={m} mine={m.senderId === pick.staffId} />)}
          </div>
        ) : (
          <div className="space-y-2">
            <TextArea label="Lý do mở lịch sử (bắt buộc)" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Gia đình khiếu nại nhân viên trả lời chậm ngày 08/10" />
            <ErrorText error={open.error} />
            <Button icon={Lock} loading={open.isPending} onClick={() => open.mutate()}>Mở lịch sử & ghi nhật ký</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function NewChatModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (id: number) => void }) {
  const me = useMe();
  const { data = [] } = useQuery({ queryKey: ["contacts", me.id], queryFn: () => inbox.contacts(me), enabled: open });
  return (
    <Modal open={open} onClose={onClose} title="Cuộc trò chuyện mới">
      {data.length === 0 ? <div className="py-4 text-center text-[12.5px] text-subtle">Không có người nào bạn được nhắn.</div> : (
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {data.map(({ user: u, position }) => (
            <li key={u.id}>
              <button onClick={() => onPick(u.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-canvas">
                <Avatar name={u.fullName} size={30} tone={partnerTone(u)} />
                <span className="flex-1"><span className="block text-[12.5px] font-semibold text-navy">{u.fullName}</span><span className="text-[11px] text-subtle">{position ? POSITION_LABEL[position] : ROLE_LABEL[u.role]}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ errors
export function ForbiddenPage() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-full items-center justify-center bg-canvas p-6">
      <div className="max-w-md rounded-2xl bg-surface p-8 text-center shadow-sm">
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
      <Building2 size={40} className="text-blue" />
      <div className="text-[44px] font-bold text-navy">404</div>
      <p className="text-[13px] text-muted">Không tìm thấy trang.</p>
      <Link to="/" className="text-[13px] font-semibold text-orange">Về trang chính</Link>
    </div>
  );
}
