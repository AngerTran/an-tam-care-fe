// Public site for guests (khách vãng lai): tier summary cards only (BR-14), target groups, facilities,
// a sample day, FAQ, chatbot (BR-52) and visit booking.
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bot, CalendarCheck, CircleCheck, Clock, Heart, Lock, MapPin, Phone, Send, ShieldCheck, Wallet, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { chatbot, publicSite } from "../../api";
import { useAuth, HOME } from "../../auth/AuthContext";
import { ServiceTerms } from "../../components/domain";
import { Badge, Button, Card, Field, IconCircle, Note, Photo, TextArea, cn } from "../../components/ui";
import { CYCLE_DESC, CYCLE_LABEL, CYCLES, GROUP_INFO, GROUP_LABEL, GROUPS, minTierFor, NOT_ACCEPTED, TIER_LABEL, TIER_TONE, TIERS, ZONE_LABEL } from "../../domain/catalog";
import { vnd } from "../../lib/format";

export function PublicHome() {
  const { user } = useAuth();
  const { data } = useQuery({ queryKey: ["public"], queryFn: () => publicSite.overview() });
  const [chat, setChat] = useState(false);
  const s = data?.settings;
  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 text-[17px] font-bold text-navy"><Heart size={18} className="text-orange" strokeWidth={2.4} /> An Tâm Care</Link>
          <nav className="hidden flex-1 gap-4 text-[12.5px] font-semibold text-muted md:flex">
            <a href="#goi" className="hover:text-orange">Gói & giá</a>
            <a href="#doi-tuong" className="hover:text-orange">Đối tượng</a>
            <a href="#co-so" className="hover:text-orange">Cơ sở vật chất</a>
            <a href="#mot-ngay" className="hover:text-orange">Một ngày ở trung tâm</a>
            <a href="#quy-dinh" className="hover:text-orange">Quy định dịch vụ</a>
            <a href="#hoi-dap" className="hover:text-orange">Hỏi đáp</a>
          </nav>
          <div className="ml-auto flex gap-2">
            {user ? <Button size="sm" to={HOME[user.role]}>Vào trang của tôi</Button> : <><Button size="sm" variant="neutral" to="/login">Đăng nhập</Button><Button size="sm" to="/dang-ky">Đăng ký gia đình</Button></>}
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-br from-navy to-blue text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:grid-cols-[1.2fr_1fr]">
          <div>
            <Badge tone="orange">Bán trú · sáng đi chiều về</Badge>
            <h1 className="mt-3 text-[34px] leading-tight font-bold">Trung tâm chăm sóc ban ngày cho người cao tuổi</h1>
            <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/85">Cụ đến buổi sáng, gia đình đón về buổi chiều. Điều dưỡng theo dõi sức khỏe, hộ lý chăm sóc ăn uống, vệ sinh và hoạt động. Gia đình xem care log, ảnh và chỉ số của cụ ngay trên app.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button size="lg" to={user?.role === "FAMILY" ? "/family/register" : "/dang-ky"}>Đăng ký cho cụ</Button>
              <Button size="lg" variant="outline" className="bg-transparent text-white" onClick={() => document.getElementById("tham-quan")?.scrollIntoView({ behavior: "smooth" })}>Đặt lịch tham quan</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center text-[12.5px]">
            {[[Clock, `${s?.careStart ?? "07:00"}–${s?.careEnd ?? "16:30"}`, `${s?.openDays ?? ""}. Chờ đón miễn phí tới ${s?.closingTime ?? "19:30"}`], [Wallet, "Trả trước online", "VNPay / MoMo. Không tiền mặt, không đặt cọc"], [ShieldCheck, "Chỉ giao cụ cho người được phép đón", "Đối chiếu ảnh và CCCD"], [MapPin, "Q.7, TP.HCM", s?.address ?? ""]].map(([Icon, t, d]) => {
              const I = Icon as typeof Clock;
              return (
                <div key={t as string} className="rounded-xl bg-white/10 p-3">
                  <I size={18} className="text-orange" />
                  <div className="mt-1 font-bold">{t as string}</div>
                  <div className="text-white/75">{d as string}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="goi" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-[24px] font-bold text-navy">{TIERS.length} hạng gói</h2>
        <p className="mt-1 text-[13px] text-muted">Giá tham khảo theo ngày. Nhóm bệnh cộng phụ phí cố định theo tháng (xem mục Đối tượng). Đăng nhập để xem chi tiết dịch vụ và tích chọn hoạt động.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {data?.tiers.map((t) => (
            <div key={t.tier} className={cn("relative rounded-2xl border-[1.5px] p-5", t.highlight ? "border-orange shadow-lg" : "border-line")}>
              {t.highlight && <span className="absolute -top-3 left-5 rounded-full bg-orange px-3 py-0.5 text-[11px] font-bold text-white">Phổ biến</span>}
              <div className="flex items-center justify-between">
                <div className="text-[18px] font-bold text-navy">{TIER_LABEL[t.tier]}</div>
                {t.full && <Badge tone="red">Đang hết chỗ</Badge>}
              </div>
              <div className="mt-2 text-[13px] text-muted">từ <span className="text-[24px] font-bold text-orange">{vnd(t.from)}</span>/ngày</div>
              <div className="text-[12px] text-subtle">Gói tháng {vnd(t.monthFrom)}</div>
              <ul className="mt-4 space-y-1.5 text-[12.5px]">{t.highlights.map((h) => <li key={h} className="flex gap-1.5"><CircleCheck size={15} className="mt-0.5 shrink-0 text-green" />{h}</li>)}</ul>
              <div className="mt-4 flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-[11.5px] text-subtle"><Lock size={12} />Danh sách dịch vụ chi tiết hiện sau khi đăng nhập</div>
              <Button className="mt-3" block variant={t.highlight ? "primary" : "outline"} to={user?.role === "FAMILY" ? "/family/register" : "/login"}>{t.full ? "Vào danh sách chờ" : "Chọn hạng này"}</Button>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {CYCLES.map((c) => (
            <div key={c} className="rounded-xl bg-canvas p-3">
              <div className="text-[13px] font-bold text-navy">{CYCLE_LABEL[c]}</div>
              <div className="mt-0.5 text-[11.5px] text-muted">{CYCLE_DESC[c]}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="doi-tuong" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-[24px] font-bold text-navy">Trung tâm nhận {GROUPS.length} nhóm đối tượng</h2>
          <p className="mt-1 text-[13px] text-muted">Gia đình tự khai khi đăng ký, điều dưỡng đánh giá tại trung tâm (thang Barthel + giấy tờ khám), Quản lý chốt nhóm.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {GROUPS.map((g) => (
              <Card key={g}>
                <div className="text-[13.5px] font-bold text-navy">{GROUP_LABEL[g]}</div>
                <p className="mt-1 text-[11.5px] text-muted">{GROUP_INFO[g].who}</p>
                {GROUP_INFO[g].care.length > 0 && <ul className="mt-2 space-y-1 text-[11.5px]">{GROUP_INFO[g].care.map((c) => <li key={c} className="flex gap-1"><CircleCheck size={12} className="mt-0.5 shrink-0 text-green" />{c}</li>)}</ul>}
                <div className="mt-2 text-[11px] text-subtle">{minTierFor(g) === TIERS[0] ? "Mọi hạng" : <>Từ hạng {TIER_LABEL[minTierFor(g)]}</>} · {data?.surcharges.find((x) => x.group === g)?.monthly ? <>phụ phí <b className="text-orange">{vnd(data.surcharges.find((x) => x.group === g)!.monthly)}/tháng</b></> : "không phụ phí"}</div>
              </Card>
            ))}
          </div>
          <Note tone="red" className="mt-4"><b>Không nhận:</b> {NOT_ACCEPTED.join("; ")}. Các trường hợp này cần y tế 24/7, không hợp mô hình bán trú.</Note>
          <div className="mt-6 grid gap-2 md:grid-cols-5">
            {["Tạo tài khoản, thêm hồ sơ cụ, tự khai tình trạng", "Chọn thời hạn → đối tượng → hạng, tích hoạt động", "Cụ đến đánh giá đầu vào với điều dưỡng", "Điều dưỡng duyệt, hệ thống áp nhóm và phụ phí cố định", "Thanh toán online, cụ bắt đầu đi"].map((t, i) => (
              <div key={t} className="flex gap-2 rounded-xl bg-white p-3 text-[12px]"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange text-[11px] font-bold text-white">{i + 1}</span>{t}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="co-so" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-[24px] font-bold text-navy">Cơ sở vật chất</h2>
        <p className="mt-1 text-[13px] text-muted">Hạng nào dùng khu nào, để gia đình so sánh trước khi đăng ký.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data?.rooms.map((r) => (
            <div key={r.id} className="overflow-hidden rounded-xl border border-line">
              <Photo tone={r.tone} caption={ZONE_LABEL[r.zone]} />
              <div className="p-3">
                <div className="text-[13px] font-bold text-navy">{r.name}</div>
                <div className="text-[11.5px] text-muted">{r.description}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">{TIERS.every((t) => r.tiers.includes(t)) ? <Badge tone="gray">Mọi hạng</Badge> : r.tiers.filter((t) => TIER_LABEL[t]).map((t) => <Badge key={t} tone={TIER_TONE[t]}>{TIER_LABEL[t]}</Badge>)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="mot-ngay" className="bg-canvas">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-[24px] font-bold text-navy">Một ngày ở trung tâm</h2>
          <div className="mt-5 grid gap-x-6 md:grid-cols-2">
            {data?.schedule.filter((x, i, a) => a.findIndex((y) => y.startTime === x.startTime && y.title === x.title) === i).map((x) => (
              <div key={x.id} className="flex gap-3 border-b border-line py-2 text-[12.5px]">
                <span className="w-24 shrink-0 font-semibold text-navy">{x.startTime}–{x.endTime}</span>
                <span className="flex-1 text-ink">{x.title}</span>
                {x.tiers.length < 3 && <span className="text-[11px] text-subtle">{x.tiers.map((t) => TIER_LABEL[t]).join(", ")}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="quy-dinh" className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="text-[24px] font-bold text-navy">Quy định dịch vụ</h2>
        <p className="mt-1 text-[13px] text-muted">Khi đăng ký online, gia đình đọc quy định này và tích cam kết khai đúng trước khi thanh toán. Cụ được điều dưỡng kiểm tra vào sáng ngày đầu.</p>
        <Card className="mt-4"><ServiceTerms className="sm:columns-2 sm:gap-8 [&>div]:mb-3 [&>div]:break-inside-avoid" /></Card>
      </section>

      <section id="hoi-dap" className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-2">
        <div>
          <h2 className="text-[24px] font-bold text-navy">Hỏi đáp</h2>
          <div className="mt-4 space-y-2">
            {s?.faqs.map((f) => (
              <details key={f.q} className="rounded-xl border border-line p-3 text-[13px]">
                <summary className="cursor-pointer font-semibold text-navy">{f.q}</summary>
                <p className="mt-1.5 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
          <Button className="mt-3" variant="ai" icon={Bot} onClick={() => setChat(true)}>Hỏi trợ lý tư vấn</Button>
        </div>
        <VisitForm />
      </section>

      <footer className="border-t border-line bg-navy text-[12px] text-sidebar-text">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-6 px-4 py-6">
          <span className="font-bold text-white">An Tâm Care</span>
          <span className="flex items-center gap-1"><MapPin size={13} />{s?.address}</span>
          <span className="flex items-center gap-1"><Phone size={13} />{s?.phone}</span>
          <span>{s?.email}</span>
        </div>
      </footer>

      {!chat && <button onClick={() => setChat(true)} className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-teal px-4 py-3 text-[13px] font-semibold text-white shadow-lg"><Bot size={18} />Trợ lý tư vấn</button>}
      {chat && <ChatWidget onClose={() => setChat(false)} />}
    </div>
  );
}

function VisitForm() {
  const [f, setF] = useState({ fullName: "", phone: "", date: "2026-10-12", time: "09:00", note: "" });
  const m = useMutation({ mutationFn: () => publicSite.bookVisit(f) });
  return (
    <Card title={<span id="tham-quan" className="flex items-center gap-2"><CalendarCheck size={18} className="text-orange" />Đặt lịch tham quan</span>}>
      {m.isSuccess ? <Note tone="green">Đã nhận lịch tham quan {f.date.slice(8)}/{f.date.slice(5, 7)} lúc {f.time}. Trung tâm sẽ gọi xác nhận cho {f.fullName}.</Note> : (
        <form className="grid gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Họ tên người liên hệ" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
          <Field label="Số điện thoại" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Field label="Ngày" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          <Field label="Giờ" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />
          <TextArea className="sm:col-span-2" label="Tình trạng của cụ (không bắt buộc)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <Button type="submit" className="sm:col-span-2" loading={m.isPending}>Gửi yêu cầu</Button>
        </form>
      )}
    </Card>
  );
}

export function ChatWidget({ onClose, inline }: { onClose?: () => void; inline?: boolean }) {
  const { user } = useAuth();
  const [items, setItems] = useState<{ me: boolean; text: string; handed?: boolean }[]>([{ me: false, text: "Xin chào! Mình là trợ lý tư vấn của An Tâm Care. Bạn có thể hỏi về giá, giờ đón, đối tượng trung tâm nhận hoặc cách đăng ký." }]);
  const [text, setText] = useState("");
  const ask = useMutation({ mutationFn: (q: string) => chatbot.ask(q, user ?? undefined), onSuccess: (a) => setItems((x) => [...x, { me: false, text: a.answer, handed: a.handedOff }]) });
  const go = (q: string) => { if (!q.trim()) return; setItems((x) => [...x, { me: true, text: q }]); ask.mutate(q); setText(""); };
  return (
    <div className={cn("flex flex-col overflow-hidden bg-white", inline ? "h-[560px] rounded-xl border border-line" : "fixed right-5 bottom-5 z-50 h-[520px] w-[360px] max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl")}>
      <div className="flex items-center gap-2.5 bg-teal px-4 py-3 text-white">
        <IconCircle icon={Bot} tone="teal" size={32} />
        <div className="flex-1"><div className="text-[13.5px] font-bold">Trợ lý tư vấn</div><div className="text-[10.5px] text-white/80">Trả lời từ thông tin Quản lý nhập · không trả lời được thì chuyển Quản lý</div></div>
        {onClose && <button onClick={onClose} aria-label="Đóng"><X size={18} /></button>}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {items.map((m, i) => (
          <div key={i} className={cn("flex", m.me ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-[12.5px] leading-relaxed", m.me ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-bubble", m.handed && "border border-orange")}>{m.text}</div>
          </div>
        ))}
        {ask.isPending && <div className="text-[11.5px] text-subtle">Đang trả lời…</div>}
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 pb-2">
        {["Giá bao nhiêu?", "Mấy giờ đón cụ?", "Có nhận cụ sau tai biến?", "Có phòng riêng cho cụ không?"].map((q) => <button key={q} onClick={() => go(q)} className="rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-semibold text-teal-ink">{q}</button>)}
      </div>
      <form className="flex gap-2 border-t border-line p-3" onSubmit={(e) => { e.preventDefault(); go(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập câu hỏi…" className="h-9 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-input-line px-3 text-[12.5px] outline-none focus:border-teal" />
        <Button type="submit" variant="ai" icon={Send}>Gửi</Button>
      </form>
    </div>
  );
}
