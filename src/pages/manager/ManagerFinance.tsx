// Manager · payments & invoices (5.7), reports to Admin (BR-61), centre settings incl. care-log config (M4).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Download, FileBarChart, Plus, Printer, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { manager } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell, SearchBox, Stat, TierBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, ErrorText, Field, KV, Loading, Note, Table, Tabs, TextArea, Toggle } from "../../components/ui";
import { CYCLE_LABEL, GROUP_LABEL, TIER_LABEL } from "../../domain/catalog";
import { dmy, hm, millions, vnd } from "../../lib/format";
import type { CenterSettings, Invoice } from "../../types/models";

export const INV_STATUS: Record<Invoice["status"], ["green" | "orange" | "gray" | "red", string]> = { PAID: ["green", "Đã thanh toán"], UNPAID: ["orange", "Chưa thanh toán"], REFUNDED: ["gray", "Đã hoàn"], VOID: ["red", "Đã hủy"] };
export const INV_KIND: Record<Invoice["kind"], string> = { NEW: "Đăng ký mới", RENEWAL: "Gia hạn", UPGRADE: "Nâng hạng", ADDON: "Dịch vụ mua thêm", DAY_BOOKING: "Đặt gói ngày" };

export function PaymentsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<"inv" | "pay" | "refund" | "credit">("inv");
  const [f, setF] = useState<"ALL" | "UNPAID" | "PAID">("ALL");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["m-pay"], queryFn: () => manager.payments() });
  const done = useMutation({ mutationFn: (id: number) => manager.markRefundDone(me, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-pay"] }) });
  const susp = useMutation({ mutationFn: () => manager.suspendOverdue(me), onSuccess: () => qc.invalidateQueries() });
  if (isLoading || !data) return <Page title="Thanh toán & hóa đơn"><Loading /></Page>;
  const inv = data.invoices.filter((r) => (f === "ALL" || r.invoice.status === f) && (!q || `${r.elderly.fullName} ${r.invoice.number} ${r.family?.fullName}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <Page title="Thanh toán & hóa đơn" sub="Trả trước qua VNPay/MoMo, không tiền mặt, không đặt cọc. Không hoàn tiền khi cụ nghỉ hoặc gia đình dừng gói — trừ trường hợp qua đời (BR-20, BR-24).">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Đã thu tháng 10" value={millions(data.month)} tone="green" />
        <Stat label="Chưa thu" value={millions(data.unpaid)} tone="orange" />
        <Stat label="Giao dịch lỗi" value={data.payments.filter((p) => p.payment.status === "FAILED").length} tone="red" />
        <Stat label="Số dư gia đình (gói ngày)" value={vnd(data.credits.filter((c) => !c.credit.usedInvoiceId).reduce((s, c) => s + c.credit.amount, 0))} tone="purple" />
      </div>
      <Tabs value={tab} onChange={setTab} items={[{ value: "inv", label: "Hóa đơn" }, { value: "pay", label: "Giao dịch cổng thanh toán" }, { value: "refund", label: "Hoàn tiền (qua đời)" }, { value: "credit", label: "Số dư gói ngày" }]} />
      {tab === "inv" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <SearchBox value={q} onChange={setQ} placeholder="Tìm số HĐ, cụ, gia đình…" />
            {([["ALL", "Tất cả"], ["UNPAID", "Chưa thu"], ["PAID", "Đã thu"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}
            <Button className="ml-auto" size="sm" variant="danger" loading={susp.isPending} onClick={() => susp.mutate()}>Chạy kiểm tra hết hạn chưa đóng</Button>
          </div>
          {susp.isSuccess && <Note>Đã chuyển {susp.data} gói sang Tạm ngưng (BR-23). Cụ tạm ngưng không check-in được.</Note>}
          <Card>
            <Table rows={inv} rowKey={(r) => r.invoice.id} onRowClick={(r) => nav(`/manager/invoices/${r.invoice.id}`)} columns={[
              { key: "n", header: "Số HĐ", render: (r) => <b className="text-navy">{r.invoice.number}</b> },
              { key: "k", header: "Loại", render: (r) => INV_KIND[r.invoice.kind] },
              { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} sub={r.family?.fullName} /> },
              { key: "p", header: "Gói", render: (r) => <span className="text-[12px]"><TierBadge tier={r.sub.tier} /> {CYCLE_LABEL[r.sub.cycle]}</span> },
              { key: "d", header: "Ngày", render: (r) => dmy(r.invoice.issueDate) },
              { key: "t", header: "Tổng", render: (r) => <b>{vnd(r.invoice.total)}</b> },
              { key: "s", header: "Trạng thái", render: (r) => <Badge tone={INV_STATUS[r.invoice.status][0]}>{INV_STATUS[r.invoice.status][1]}</Badge> },
              { key: "m", header: "Cổng", render: (r) => r.payment ? `${r.payment.method === "VNPAY" ? "VNPay" : "MoMo"} · ${r.payment.transactionCode}` : "—" },
            ]} />
          </Card>
        </>
      )}
      {tab === "pay" && (
        <Card>
          <Table rows={data.payments} rowKey={(r) => r.payment.id} columns={[
            { key: "t", header: "Lúc", render: (r) => `${dmy(r.payment.paidAt.slice(0, 10))} ${hm(r.payment.paidAt)}` },
            { key: "c", header: "Mã giao dịch", render: (r) => r.payment.transactionCode },
            { key: "i", header: "Hóa đơn", render: (r) => r.invoice?.number },
            { key: "p", header: "Người trả", render: (r) => r.payer?.fullName },
            { key: "m", header: "Cổng", render: (r) => r.payment.method === "VNPAY" ? "VNPay" : "MoMo" },
            { key: "a", header: "Số tiền", render: (r) => vnd(r.payment.amount) },
            { key: "s", header: "Callback", render: (r) => r.payment.status === "SUCCESS" ? <Badge tone="green">Thành công</Badge> : <Badge tone="red">Thất bại</Badge> },
          ]} />
        </Card>
      )}
      {tab === "refund" && (
        <Card>
          <Table rows={data.refunds} rowKey={(r) => r.refund.id} empty="Chưa có hoàn tiền" columns={[
            { key: "e", header: "Cụ", render: (r) => r.elderly?.fullName },
            { key: "r", header: "Lý do", render: (r) => r.refund.reason },
            { key: "a", header: "Số tiền", render: (r) => vnd(r.refund.amount) },
            { key: "d", header: "Ngày", render: (r) => dmy(r.refund.createdAt.slice(0, 10)) },
            { key: "s", header: "Trạng thái", render: (r) => r.refund.status === "DONE" ? <Badge tone="green">Đã hoàn qua cổng</Badge> : <Button size="sm" variant="success" loading={done.isPending} onClick={() => done.mutate(r.refund.id)}>Gửi lệnh hoàn</Button> },
          ]} />
          <Note className="mt-3">Bảng refunds chỉ dùng khi cụ qua đời: hoàn phần chưa dùng của gói dài hạn. Dịch vụ lẻ đã dùng không hoàn (5.9).</Note>
        </Card>
      )}
      {tab === "credit" && (
        <Card>
          <Table rows={data.credits} rowKey={(r) => r.credit.id} columns={[
            { key: "f", header: "Gia đình", render: (r) => r.family?.fullName },
            { key: "e", header: "Cụ", render: (r) => r.elderly?.fullName },
            { key: "r", header: "Lý do", render: (r) => r.credit.reason },
            { key: "a", header: "Số dư", render: (r) => vnd(r.credit.amount) },
            { key: "s", header: "Trạng thái", render: (r) => r.credit.usedInvoiceId ? <Badge tone="gray">Đã trừ vào HĐ</Badge> : <Badge tone="green">Còn dùng được</Badge> },
          ]} />
          <Note className="mt-3">Gói ngày báo nghỉ trước 17h hôm trước: tiền ngày đó giữ thành số dư, tự trừ vào lần đặt sau (BR-21).</Note>
        </Card>
      )}
    </Page>
  );
}

export function InvoiceDetail({ back, family }: { back: string; family?: boolean }) {
  const me = useMe();
  const id = Number(useParams().id);
  const { data, isLoading, error } = useQuery({ queryKey: ["invoice", id], queryFn: () => manager.invoice(me, id) });
  if (isLoading) return <Page title="Hóa đơn" back={back}><Loading /></Page>;
  if (!data) return <Page title="Hóa đơn" back={back}><ErrorText error={error} /></Page>;
  const i = data.invoice;
  return (
    <Page title={`Hóa đơn ${i.number}`} back={back} actions={<><Button size="sm" variant="neutral" icon={Printer}>In</Button><Button size="sm" variant="neutral" icon={Download}>Tải PDF</Button>{family && i.status === "UNPAID" && <Button size="sm" to={`/family/checkout/${i.id}`}>Thanh toán</Button>}</>}>
      <Card className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between border-b border-line pb-3">
          <div><div className="text-[18px] font-bold text-navy">{data.settings.name}</div><div className="text-[11.5px] text-subtle">{data.settings.address} · {data.settings.phone}</div></div>
          <div className="text-right"><Badge tone={INV_STATUS[i.status][0]}>{INV_STATUS[i.status][1]}</Badge><div className="mt-1 text-[11.5px] text-subtle">{INV_KIND[i.kind]}</div></div>
        </div>
        <div className="grid gap-x-6 py-3 sm:grid-cols-2">
          <div><KV label="Cụ" w={80}>{data.elderly.fullName}</KV><KV label="Gia đình" w={80}>{data.family?.fullName}</KV></div>
          <div><KV label="Ngày lập" w={80}>{dmy(i.issueDate)}</KV><KV label="Hạn" w={80}>{dmy(i.dueDate)}</KV><KV label="Nhóm" w={80}>{GROUP_LABEL[data.sub.targetGroup]} · {TIER_LABEL[data.sub.tier]}</KV></div>
        </div>
        <table className="w-full text-[12.5px]">
          <tbody>
            {i.lines.map((l, k) => <tr key={k} className="border-b border-line-soft"><td className="py-2">{l.label}</td><td className="py-2 text-right">{vnd(l.amount)}</td></tr>)}
            {i.creditUsed > 0 && <tr className="border-b border-line-soft"><td className="py-2 text-green-ink">Trừ số dư gói ngày</td><td className="py-2 text-right text-green-ink">−{vnd(i.creditUsed)}</td></tr>}
            <tr><td className="py-2.5 font-bold text-navy">Tổng thanh toán</td><td className="py-2.5 text-right text-[16px] font-bold text-orange">{vnd(i.total)}</td></tr>
          </tbody>
        </table>
        {data.payments.map((p) => <div key={p.id} className="mt-1 text-[11.5px] text-subtle">{p.status === "SUCCESS" ? "✓" : "✗"} {p.method === "VNPAY" ? "VNPay" : "MoMo"} · {p.transactionCode} · {dmy(p.paidAt.slice(0, 10))} {hm(p.paidAt)} · {p.status === "SUCCESS" ? "thành công" : "thất bại"}</div>)}
        <Note className="mt-3">Không thu tiền mặt. Đã thanh toán thì không hoàn tiền khi cụ nghỉ, trừ trường hợp qua đời (BR-20).</Note>
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ reports to Admin
export function ReportsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [sel, setSel] = useState<number>();
  const [note, setNote] = useState<string>();
  const { data, isLoading } = useQuery({ queryKey: ["m-reports"], queryFn: () => manager.reports() });
  const send = useMutation({ mutationFn: () => manager.sendReport(me, cur!.id, note ?? cur!.managerNote), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-reports"] }) });
  const cur = data?.find((r) => r.id === sel) ?? data?.[0];
  return (
    <Page title="Báo cáo gửi Admin" sub="Hệ thống tự tạo báo cáo tuần và tháng (doanh thu, có mặt, sự cố, thiết bị, phòng). Quản lý thêm nhận xét rồi gửi (BR-61).">
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card bodyClass="space-y-2">
          {isLoading ? <Loading /> : data?.map((r) => (
            <button key={r.id} onClick={() => { setSel(r.id); setNote(undefined); }} className={`w-full rounded-[10px] border px-3 py-2 text-left ${cur?.id === r.id ? "border-[2px] border-orange" : "border-line"}`}>
              <span className="flex items-center justify-between"><b className="text-[12.5px] text-navy">{r.label}</b>{r.sentAt ? <Badge tone="green">Đã gửi</Badge> : <Badge tone="orange">Nháp</Badge>}</span>
              <span className="text-[11px] text-subtle">{r.period === "WEEK" ? "Báo cáo tuần" : "Báo cáo tháng"} · tạo {dmy(r.generatedAt.slice(0, 10))}</span>
            </button>
          ))}
        </Card>
        {cur && (
          <Card title={<span className="flex items-center gap-2"><FileBarChart size={16} />{cur.label}</span>} actions={cur.sentAt ? <span className="text-[11.5px] text-subtle">Đã gửi {dmy(cur.sentAt.slice(0, 10))} {hm(cur.sentAt)}</span> : undefined}>
            <div className="grid gap-2 sm:grid-cols-3">{cur.metrics.map((m) => <Stat key={m.label} label={m.label} value={m.value} />)}</div>
            <TextArea className="mt-3" label="Nhận xét của Quản lý" value={note ?? cur.managerNote} onChange={(e) => setNote(e.target.value)} readOnly={!!cur.sentAt} />
            {!cur.sentAt && <Button className="mt-3" icon={Send} loading={send.isPending} onClick={() => send.mutate()}>Gửi cho Admin</Button>}
          </Card>
        )}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ settings (incl. M4 care-log config)
export function SettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"info" | "hours" | "carelog" | "faq" | "pay">("info");
  const { data, isLoading } = useQuery({ queryKey: ["m-settings"], queryFn: () => manager.settings() });
  const [f, setF] = useState<Partial<CenterSettings>>({});
  const save = useMutation({ mutationFn: () => manager.saveSettings(me, f), onSuccess: () => { qc.invalidateQueries({ queryKey: ["m-settings"] }); setF({}); } });
  if (isLoading || !data) return <Page title="Cài đặt trung tâm"><Loading /></Page>;
  const v = { ...data, ...f };
  const th = v.thresholds;
  const setTh = (k: keyof typeof th, n: number) => setF({ ...f, thresholds: { ...th, [k]: n } });
  return (
    <Page title="Cài đặt trung tâm" sub="Một trung tâm duy nhất (BR-01): thông tin, giờ, cấu hình care log, FAQ cho chatbot, cổng thanh toán." actions={Object.keys(f).length > 0 && <Button size="sm" icon={CircleCheck} loading={save.isPending} onClick={() => save.mutate()}>Lưu thay đổi</Button>}>
      {save.isSuccess && <Note tone="green">Đã lưu.</Note>}
      <Tabs value={tab} onChange={setTab} items={[{ value: "info", label: "Thông tin" }, { value: "hours", label: "Giờ & đón cụ" }, { value: "carelog", label: "Cài đặt care log (M4)" }, { value: "faq", label: "FAQ cho chatbot" }, { value: "pay", label: "Thanh toán & AI" }]} />
      {tab === "info" && (
        <Card><div className="grid gap-2 sm:grid-cols-2">
          <Field label="Tên trung tâm" value={v.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <Field label="Điện thoại" value={v.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <Field label="Email" value={v.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <Field label="Ngày mở cửa" value={v.openDays} onChange={(e) => setF({ ...f, openDays: e.target.value })} />
          <Field label="Địa chỉ" className="sm:col-span-2" value={v.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        </div></Card>
      )}
      {tab === "hours" && (
        <Card><div className="grid gap-2 sm:grid-cols-3">
          <Field label="Bắt đầu chăm sóc" type="time" value={v.careStart} onChange={(e) => setF({ ...f, careStart: e.target.value })} />
          <Field label="Kết thúc chăm sóc" type="time" value={v.careEnd} onChange={(e) => setF({ ...f, careEnd: e.target.value })} />
          <Field label="Giờ đóng cửa (đón muộn nhất)" type="time" value={v.closingTime} onChange={(e) => setF({ ...f, closingTime: e.target.value })} />
          {v.pickupReminders.map((r, i) => <Field key={i} label={`Nhắc đón lần ${i + 1}`} type="time" value={r} onChange={(e) => setF({ ...f, pickupReminders: v.pickupReminders.map((x, k) => (k === i ? e.target.value : x)) })} />)}
          <Field label="Hạn báo nghỉ gói ngày (hôm trước)" type="time" value={v.dayCancelCutoff} onChange={(e) => setF({ ...f, dayCancelCutoff: e.target.value })} />
          <Field label="Nhắc gia hạn trước (ngày)" type="number" value={v.renewalReminderDays} onChange={(e) => setF({ ...f, renewalReminderDays: Number(e.target.value) })} />
          <Field label="Bảo lưu tối đa (ngày)" type="number" value={v.maxPauseDays} onChange={(e) => setF({ ...f, maxPauseDays: Number(e.target.value) })} />
        </div><Note className="mt-3">Không có gói ở lại muộn. Từ {v.careEnd} tới {v.closingTime} chỉ chờ đón, miễn phí, không hoạt động và không ăn uống (BR-34).</Note></Card>
      )}
      {tab === "carelog" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Ngưỡng chỉ số mặc định">
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Huyết áp tâm thu tối đa" type="number" value={th.sysMax} onChange={(e) => setTh("sysMax", Number(e.target.value))} />
              <Field label="Huyết áp tâm thu tối thiểu" type="number" value={th.sysMin} onChange={(e) => setTh("sysMin", Number(e.target.value))} />
              <Field label="Huyết áp tâm trương tối đa" type="number" value={th.diaMax} onChange={(e) => setTh("diaMax", Number(e.target.value))} />
              <Field label="SpO₂ tối thiểu (%)" type="number" value={th.spo2Min} onChange={(e) => setTh("spo2Min", Number(e.target.value))} />
              <Field label="Mạch tối thiểu" type="number" value={th.pulseMin} onChange={(e) => setTh("pulseMin", Number(e.target.value))} />
              <Field label="Mạch tối đa" type="number" value={th.pulseMax} onChange={(e) => setTh("pulseMax", Number(e.target.value))} />
              <Field label="Nhiệt độ tối đa (°C)" type="number" step={0.1} value={th.tempMax} onChange={(e) => setTh("tempMax", Number(e.target.value))} />
              <Field label="Đường huyết đói tối đa (mmol/L)" type="number" step={0.1} value={th.glucoseMax} onChange={(e) => setTh("glucoseMax", Number(e.target.value))} />
            </div>
            <Note className="mt-3">Ngưỡng riêng từng cụ chỉnh ở hồ sơ cụ (điều dưỡng đề xuất).</Note>
          </Card>
          <Card title="Giờ nhắc & quy tắc cảnh báo (CL-07, CL-11)">
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Cảnh báo chưa đến" type="time" value={v.absentAlertAt} onChange={(e) => setF({ ...f, absentAlertAt: e.target.value })} />
              <Field label="Nhắc chốt care log" type="time" value={v.closeReminderAt} onChange={(e) => setF({ ...f, closeReminderAt: e.target.value })} />
              <Field label="Quản lý chốt thay" type="time" value={v.managerCloseAt} onChange={(e) => setF({ ...f, managerCloseAt: e.target.value })} />
            </div>
            <ul className="mt-3 space-y-1 text-[12px] text-muted">
              {["Chỉ số vượt ngưỡng", "Thuốc quá 30 phút", "Ăn ít (1/4 trở xuống) 2 bữa liền", "Từ chối thuốc 2 lần liền", "Tâm trạng kích động", "Có sự cố", `${v.absentAlertAt} chưa đến mà chưa báo nghỉ`].map((x) => <li key={x}><Toggle checked onChange={() => {}} label={x} /></li>)}
            </ul>
            <Note className="mt-2">Mẫu việc trong ngày lấy từ lịch ngày mẫu (mục 4.2E), hoạt động gia đình đã tích và nhóm đối tượng.</Note>
          </Card>
        </div>
      )}
      {tab === "faq" && (
        <Card title="Câu hỏi thường gặp (chatbot trả lời từ đây, BR-52)" actions={<Button size="sm" variant="outline" icon={Plus} onClick={() => setF({ ...f, faqs: [...v.faqs, { q: "", a: "" }] })}>Thêm câu</Button>}>
          <div className="space-y-2">
            {v.faqs.map((x, i) => (
              <div key={i} className="grid gap-2 rounded-xl bg-canvas p-2 sm:grid-cols-[1fr_2fr_auto]">
                <Field label="Câu hỏi" value={x.q} onChange={(e) => setF({ ...f, faqs: v.faqs.map((y, k) => (k === i ? { ...y, q: e.target.value } : y)) })} />
                <Field label="Trả lời" value={x.a} onChange={(e) => setF({ ...f, faqs: v.faqs.map((y, k) => (k === i ? { ...y, a: e.target.value } : y)) })} />
                <button className="self-center text-subtle hover:text-red-ink" onClick={() => setF({ ...f, faqs: v.faqs.filter((_, k) => k !== i) })} aria-label="Xóa"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <Note className="mt-3">Chatbot không trả lời được thì chuyển thành tin nhắn tới Quản lý. <Link to="/manager/messages" className="font-semibold text-orange">Xem câu hỏi đã chuyển</Link></Note>
        </Card>
      )}
      {tab === "pay" && (
        <Card><div className="space-y-3">
          <Toggle checked={v.vnpayConnected} onChange={(x) => setF({ ...f, vnpayConnected: x })} label="VNPay" sub="Nhận thanh toán và callback IPN" />
          <Toggle checked={v.momoConnected} onChange={(x) => setF({ ...f, momoConnected: x })} label="MoMo" sub="Nhận thanh toán và callback IPN" />
          <Toggle checked={v.aiEnabled} onChange={(x) => setF({ ...f, aiEnabled: x })} label="Bật AI (chatbot, gợi ý ca, thực đơn, cảnh báo xu hướng)" sub="Dữ liệu gửi AI đã ẩn tên, CCCD, số điện thoại (BR-51)" />
        </div></Card>
      )}
    </Page>
  );
}
