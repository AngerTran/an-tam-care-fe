import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Download, EyeOff, Lock, Mail, MessageCircle, Pencil, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { manager } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Avatar, Badge, Button, Card, Chip, ErrorText, Field, Kpi, KV, Loading, Note, SelectField, Table, Tabs, TextArea, Toggle, cn } from "../../components/ui";
import { dm, dmy, hm, millions, refundCode, vnd } from "../../lib/format";
import type { ServiceType } from "../../types/models";

const TYPE_LABEL: Record<ServiceType, string> = { ACTIVITY: "Hoạt động", MEAL: "Bữa ăn", SERVICE: "Dịch vụ chăm sóc" };
const TYPE_TONE: Record<ServiceType, "green" | "orange" | "blue"> = { ACTIVITY: "green", MEAL: "orange", SERVICE: "blue" };

// ------------------------------------------------------------------ CM-09 staff
export function StaffPage() {
  const me = useMe();
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["m-staff"], queryFn: () => manager.staff(me) });
  const rows = (data ?? []).filter((r) => r.user.fullName.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page title={`Nhân viên (${data?.length ?? 0})`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-64 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5"><Search size={14} className="text-subtle" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm nhân viên" className="min-w-0 flex-1 text-[12.5px] outline-none" /></label>
        <Button className="ml-auto" icon={Plus} to="/manager/staff/new">Thêm nhân viên</Button>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.user.id} columns={[
            { key: "n", header: "Họ tên", render: (r) => <span className="flex items-center gap-2"><Avatar name={r.user.fullName} size={26} tone="teal" />{r.user.fullName}</span> },
            { key: "p", header: "Vị trí", render: (r) => r.user.position },
            { key: "ph", header: "Số điện thoại", render: (r) => r.user.phone },
            { key: "s", header: "Ca tuần tới", render: (r) => `${r.shifts} ca` },
            { key: "a", header: "Người phụ trách", render: (r) => (r.assigned ? `${r.assigned} người` : "—") },
            { key: "st", header: "Trạng thái", render: (r) => r.user.status === "INVITED" ? <Badge tone="teal">Chờ kích hoạt</Badge> : r.user.id === 6 ? <Badge tone="orange">Nghỉ phép</Badge> : <Badge tone="green">Đang làm</Badge> },
            { key: "m", header: "", render: (r) => <Button size="sm" variant="neutral" icon={MessageCircle} to={`/manager/messages?to=${r.user.id}`}>Nhắn</Button> },
          ]} />
        )}
      </Card>
      <Note>Nhân viên chỉ xem ca và phạm vi người cao tuổi do trung tâm gán, không tự đổi ca.</Note>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-23 add staff
export function StaffFormPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["m-members"], queryFn: () => manager.members(me) });
  const [f, setF] = useState({ fullName: "", position: "Hộ lý", email: "", phone: "" });
  const [picked, setPicked] = useState<number[]>([]);
  const [invite, setInvite] = useState(true);
  const save = useMutation({ mutationFn: () => manager.createStaff(me, { ...f, elderlyIds: picked }), onSuccess: () => { qc.invalidateQueries(); nav("/manager/staff"); } });
  return (
    <Page title="Thêm nhân viên" back="/manager/staff">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card title="Thông tin nhân viên">
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Họ và tên" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
              <SelectField label="Vị trí" value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>{["Điều dưỡng", "Hộ lý", "Hoạt động viên"].map((p) => <option key={p}>{p}</option>)}</SelectField>
              <Field label="Email đăng nhập" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <Field label="Số điện thoại" required value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </div>
            <div className="pt-1 text-[12.5px] font-semibold text-navy">Phân công người cao tuổi</div>
            <div className="flex flex-wrap gap-1.5">{members.data?.map((m) => <Chip key={m.elderly.id} active={picked.includes(m.elderly.id)} onClick={() => setPicked((p) => (p.includes(m.elderly.id) ? p.filter((x) => x !== m.elderly.id) : [...p, m.elderly.id]))}>{m.elderly.fullName}</Chip>)}</div>
            <div className="pt-2"><Toggle checked={invite} onChange={setInvite} label="Gửi lời mời kích hoạt qua email" sub="Nhân viên tự đặt mật khẩu khi kích hoạt" /></div>
            <ErrorText error={save.error} />
            <div className="flex gap-2 pt-2"><Button type="submit" icon={CircleCheck} loading={save.isPending}>Tạo tài khoản</Button><Button type="button" variant="neutral" onClick={() => nav(-1)}>Huỷ</Button></div>
          </form>
        </Card>
        <Card title="Quyền của vai trò" actions={<Badge tone="teal">Staff</Badge>} className="h-fit">
          <ul className="space-y-1.5 text-[12px]">
            {["Điểm danh người được phân công", "Xem lịch & thực đơn", "Ghi nhật ký, đính kèm ảnh", "Xem ca được xếp", "Nhắn tin với gia đình"].map((s) => <li key={s} className="flex items-center gap-2"><CircleCheck size={14} className="text-green" />{s}</li>)}
            {["Không xem thanh toán", "Không tự đổi ca", "Không xem người ngoài phân công"].map((s) => <li key={s} className="flex items-center gap-2 text-muted"><Lock size={14} className="text-red-ink" />{s}</li>)}
          </ul>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-10 payments & refunds
export function PaymentsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = (sp.get("tab") as "pays" | "refunds") ?? "pays";
  const [sel, setSel] = useState<number>();
  const { data, isLoading } = useQuery({ queryKey: ["m-payments"], queryFn: () => manager.payments(me) });
  const pending = data?.refunds.filter((r) => r.refund.status === "REQUESTED") ?? [];
  const cur = data?.refunds.find((r) => r.refund.id === sel) ?? pending[0] ?? data?.refunds[0];
  const review = useMutation({ mutationFn: (ok: boolean) => manager.reviewRefund(me, cur!.refund.id, ok), onSuccess: () => qc.invalidateQueries() });
  return (
    <Page title="Thanh toán & hoàn tiền">
      <div className="flex flex-wrap gap-3">
        <Kpi label="Đã thu tháng 10" value={millions(data?.monthTotal ?? 0)} sub="qua VNPay / MoMo" color="green" />
        <Kpi label="Hoá đơn chưa thanh toán" value={data?.invoices.filter((i) => i.status === "UNPAID").length ?? 0} sub="đang chờ gia đình" color="orange" />
        <Kpi label="Yêu cầu hoàn tiền" value={pending.length} sub="chờ duyệt" color="red" />
      </div>
      <div className={cn("grid gap-4", tab === "refunds" && "lg:grid-cols-[1fr_320px]")}>
        <Card>
          <Tabs value={tab} onChange={(v) => setSp({ tab: v })} items={[{ value: "pays", label: "Giao dịch" }, { value: "refunds", label: `Hoàn tiền (${pending.length})` }]} />
          <div className="mt-2">
            {isLoading || !data ? <Loading /> : tab === "pays" ? (
              <Table rows={data.pays} rowKey={(p) => p.payment.id} onRowClick={(p) => nav(`/manager/invoices/${p.invoice.id}`)} columns={[
                { key: "c", header: "Mã GD", render: (p) => p.payment.transactionCode },
                { key: "i", header: "Hoá đơn", render: (p) => p.invoice.number },
                { key: "f", header: "Gia đình", render: (p) => p.payer?.fullName },
                { key: "e", header: "Người cao tuổi", render: (p) => p.elderly?.fullName },
                { key: "a", header: "Số tiền", render: (p) => vnd(p.payment.amount) },
                { key: "m", header: "Cổng", render: (p) => (p.payment.method === "VNPAY" ? "VNPay" : "MoMo") },
                { key: "t", header: "Thời gian", render: (p) => `${dm(p.payment.paidAt.slice(0, 10))} ${hm(p.payment.paidAt)}` },
              ]} />
            ) : (
              <Table rows={data.refunds} rowKey={(r) => r.refund.id} onRowClick={(r) => setSel(r.refund.id)} columns={[
                { key: "c", header: "Mã", render: (r) => <span className={cn(cur?.refund.id === r.refund.id && "font-semibold text-orange")}>{refundCode(r.refund.id)}</span> },
                { key: "f", header: "Gia đình", render: (r) => r.requester?.fullName },
                { key: "a", header: "Số tiền", render: (r) => vnd(r.refund.amount) },
                { key: "r", header: "Lý do", render: (r) => r.refund.reason },
                { key: "s", header: "Trạng thái", render: (r) => <Badge tone={{ REQUESTED: "orange", APPROVED: "green", REJECTED: "red" }[r.refund.status] as "orange"}>{{ REQUESTED: "Chờ duyệt", APPROVED: "Đã hoàn", REJECTED: "Từ chối" }[r.refund.status]}</Badge> },
              ]} />
            )}
          </div>
        </Card>
        {tab === "refunds" && cur && (
          <Card title={`${refundCode(cur.refund.id)} · ${cur.requester?.fullName}`} className="h-fit">
            <div className="rounded-xl bg-canvas p-3">
              <KV label="Giao dịch gốc" w={110}>{cur.payment.transactionCode}</KV>
              <KV label="Hoá đơn" w={110}>{cur.invoice.number}</KV>
              <KV label="Số tiền đề nghị" w={110}><span className="text-orange">{vnd(cur.refund.amount)}</span></KV>
            </div>
            <div className="mt-2 rounded-[10px] border-[1.5px] border-input-line px-3 py-2 text-[12.5px]"><div className="text-[10px] text-subtle">Lý do của gia đình</div>{cur.refund.reason}</div>
            {cur.refund.status === "REQUESTED" ? (
              <>
                <Note className="mt-3">Duyệt sẽ gửi lệnh hoàn tiền về ví gốc qua cổng {cur.payment.method === "VNPAY" ? "VNPay" : "MoMo"}.</Note>
                <div className="mt-3 flex flex-col gap-2">
                  <Button variant="success" icon={CircleCheck} loading={review.isPending} onClick={() => review.mutate(true)}>Duyệt & hoàn qua {cur.payment.method === "VNPAY" ? "VNPay" : "MoMo"}</Button>
                  <Button variant="danger" onClick={() => review.mutate(false)}>Từ chối</Button>
                </div>
              </>
            ) : <Note className="mt-3" tone={cur.refund.status === "APPROVED" ? "green" : "red"}>{cur.refund.status === "APPROVED" ? `Đã hoàn lúc ${dmy(cur.refund.refundedAt?.slice(0, 10))}` : "Yêu cầu đã bị từ chối"}</Note>}
          </Card>
        )}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-22 invoice detail (also used by Family FW-14)
export function InvoiceDetail({ back, family = false }: { back: string; family?: boolean }) {
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useParams().id);
  const { data, isLoading, error } = useQuery({ queryKey: ["invoice", id], queryFn: () => manager.invoice(me, id) });
  const [disc, setDisc] = useState<string>();
  const [extra, setExtra] = useState<string>();
  const adj = useMutation({ mutationFn: () => manager.adjustInvoice(me, id, Number(disc ?? data!.invoice.discount), Number(extra ?? data!.invoice.additionalCharge)), onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice", id] }) });
  if (isLoading) return <Page title="Hoá đơn" back={back}><Loading /></Page>;
  if (!data) return <Page title="Hoá đơn" back={back}><ErrorText error={error} /></Page>;
  const { invoice: inv } = data;
  const paid = inv.status === "PAID";
  return (
    <Page title={`Hoá đơn ${inv.number}`} back={back}>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <Card title={family ? data.center?.name : "Thông tin hoá đơn"} actions={<Badge tone={paid ? "green" : "orange"}>{paid ? "Đã thanh toán" : "Chưa thanh toán"}</Badge>}>
            {!family && <KV label="Gia đình">{data.family?.fullName}</KV>}
            <KV label="Người cao tuổi">{data.elderly.fullName}</KV>
            <KV label="Đăng ký">{data.pkg.name} · {dmy(data.reg.startDate)} – {dmy(data.reg.endDate)}</KV>
            <KV label="Phát hành / hạn">{dmy(inv.issueDate)} · hạn {dmy(inv.dueDate)}</KV>
            <div className="mt-3 overflow-hidden rounded-xl border border-line-soft text-[12.5px]">
              {([[`Gói ${data.pkg.name}`, inv.subtotal], ["Phụ thu · phí đăng ký", inv.additionalCharge], ["Giảm giá", -inv.discount]] as const).map(([l, v]) => <div key={l} className="flex justify-between border-b border-line-soft px-3 py-2"><span>{l}</span><span>{vnd(v)}</span></div>)}
              <div className="flex justify-between px-3 py-2.5 font-bold"><span>Tổng cộng</span><span className="text-[16px] text-orange">{vnd(inv.total)}</span></div>
            </div>
          </Card>
          <Card title="Thanh toán">
            <Table rows={data.payments} rowKey={(p) => p.id} empty="Chưa có giao dịch" columns={[
              { key: "c", header: "Mã giao dịch", render: (p) => p.transactionCode },
              { key: "m", header: "Cổng", render: (p) => (p.method === "VNPAY" ? "VNPay" : "MoMo") },
              { key: "t", header: "Thời gian", render: (p) => `${dm(p.paidAt.slice(0, 10))} ${hm(p.paidAt)}` },
              { key: "s", header: "Trạng thái", render: (p) => <Badge tone={p.status === "SUCCESS" ? "green" : "red"}>{p.status === "SUCCESS" ? "Thành công" : "Thất bại"}</Badge> },
            ]} />
          </Card>
        </div>
        <Card title="Thao tác" className="h-fit">
          <div className="flex flex-col gap-2">
            <Button variant="outline" icon={Download} onClick={() => window.print()}>Tải / in PDF</Button>
            {!family && <Button variant="neutral" icon={Mail}>Gửi lại cho gia đình</Button>}
            {family && !paid && <Button to={`/family/checkout/${inv.id}`}>Thanh toán {vnd(inv.total)}</Button>}
            {family && paid && <Button variant="danger" to={`/family/packages?refund=${data.payments.find((p) => p.status === "SUCCESS")?.id}`}>Yêu cầu hoàn tiền</Button>}
          </div>
          {!family && (
            <>
              <div className="mt-4 mb-2 text-[12.5px] font-semibold text-navy">Điều chỉnh hoá đơn</div>
              <div className="space-y-2">
                <Field label="Giảm giá (VNĐ)" type="number" disabled={paid} value={disc ?? inv.discount} onChange={(e) => setDisc(e.target.value)} />
                <Field label="Phụ thu (VNĐ)" type="number" disabled={paid} value={extra ?? inv.additionalCharge} onChange={(e) => setExtra(e.target.value)} />
                {paid ? <Note>Hoá đơn đã thanh toán chỉ điều chỉnh bằng hoàn tiền.</Note> : <Button size="sm" loading={adj.isPending} onClick={() => adj.mutate()}>Lưu điều chỉnh</Button>}
                <ErrorText error={adj.error} />
              </div>
            </>
          )}
          {family && <Note className="mt-3">Hoá đơn do trung tâm phát hành. Tiền được chuyển vào tài khoản của {data.center?.name}.</Note>}
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-11 reports
export function ReportsPage() {
  const me = useMe();
  const [tab, setTab] = useState("att");
  const { data } = useQuery({ queryKey: ["m-reports"], queryFn: () => manager.reports(me) });
  const exportCsv = () => {
    const csv = "Tuần,Chuyên cần (%)\n" + (data?.weekly ?? []).map((v, i) => `Tuần ${i + 1},${v}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "bao-cao-thang-9.csv";
    a.click();
  };
  return (
    <Page title="Báo cáo trung tâm">
      <div className="flex flex-wrap items-center gap-2">
        {[["att", "Điểm danh"], ["rev", "Doanh thu"], ["act", "Hoạt động"], ["hr", "Nhân sự"]].map(([v, l]) => <Chip key={v} active={tab === v} onClick={() => setTab(v)}>{l}</Chip>)}
        <span className="ml-auto rounded-[10px] border-[1.5px] border-input-line bg-white px-3 py-1.5 text-[12px]">01/09 – 30/09/2026</span>
        <Button variant="outline" icon={Download} onClick={() => window.print()}>PDF</Button>
        <Button icon={Download} onClick={exportCsv}>Excel (CSV)</Button>
      </div>
      {data && (
        <>
          <div className="flex flex-wrap gap-3">
            <Kpi label="Tỷ lệ chuyên cần" value={`${data.attendanceRate}%`} sub="▲ 2% so với T8" color="green" />
            <Kpi label="Doanh thu" value={millions(data.revenue)} sub="▲ 5%" />
            <Kpi label="Tham gia hoạt động" value={`${data.participation}%`} sub="▲ 4%" color="teal" />
            <Kpi label="Người cao tuổi mới" value={`+${data.newMembers}`} sub="tháng 9" color="orange" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card title="Chuyên cần theo tuần">
              <div className="flex h-44 items-end justify-around">
                {data.weekly.map((v, i) => <div key={i} className="flex flex-col items-center gap-1"><div className={`w-12 rounded-t-md ${i === 3 ? "bg-orange" : "bg-blue"}`} style={{ height: v * 1.5 }} /><span className="text-[10.5px] text-subtle">Tuần {i + 1} · {v}%</span></div>)}
              </div>
            </Card>
            <Card title="Hoạt động tham gia">
              {data.activities.map(([n, v], i) => (
                <div key={n} className="mt-2 flex items-center gap-2 text-[12px]"><span className="w-16 text-muted">{n}</span><div className="h-2 flex-1 overflow-hidden rounded bg-blue-soft"><div className={["bg-green", "bg-blue", "bg-orange", "bg-teal"][i] + " h-full rounded"} style={{ width: `${v}%` }} /></div><span className="w-8 text-subtle">{v}%</span></div>
              ))}
              <Note className="mt-3">Báo cáo chỉ gồm dữ liệu của trung tâm bạn.</Note>
            </Card>
          </div>
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ CM-12 packages
export function PackagesPage() {
  const me = useMe();
  const nav = useNavigate();
  const [f, setF] = useState<"ALL" | "ACTIVE" | "HIDDEN">("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["m-packages"], queryFn: () => manager.packages(me) });
  const rows = (data ?? []).filter((p) => f === "ALL" || p.pkg.status === f);
  const [sel, setSel] = useState<number>();
  const cur = rows.find((r) => r.pkg.id === sel) ?? rows.find((r) => r.pkg.id === 2) ?? rows[0];
  return (
    <Page title={`Gói dịch vụ (${data?.length ?? 0})`}>
      <div className="flex flex-wrap items-center gap-2">
        {(["ALL", "ACTIVE", "HIDDEN"] as const).map((v) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{{ ALL: "Tất cả", ACTIVE: "Đang mở bán", HIDDEN: "Tạm ẩn" }[v]}</Chip>)}
        <Button className="ml-auto" icon={Plus} to="/manager/packages/new">Tạo gói mới</Button>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.pkg.id} onRowClick={(r) => setSel(r.pkg.id)} columns={[
            { key: "n", header: "Tên gói", render: (r) => <b className={cn(cur?.pkg.id === r.pkg.id && "text-orange")}>{r.pkg.name}</b> },
            { key: "b", header: "Chu kỳ", render: (r) => <Badge tone={r.pkg.billingPeriod === "DAILY" ? "orange" : "blue"}>{r.pkg.billingPeriod === "DAILY" ? "Theo ngày" : "Theo tháng"}</Badge> },
            { key: "p", header: "Giá", render: (r) => vnd(r.pkg.price) },
            { key: "s", header: "Dịch vụ", render: (r) => `${r.services.length} dịch vụ` },
            { key: "r", header: "Đang đăng ký", render: (r) => `${r.activeRegs} người` },
            { key: "st", header: "Trạng thái", render: (r) => <Badge tone={r.pkg.status === "ACTIVE" ? "green" : "gray"}>{r.pkg.status === "ACTIVE" ? "Đang mở bán" : "Tạm ẩn"}</Badge> },
            { key: "e", header: "", render: (r) => <Button size="sm" variant="outline" icon={Pencil} onClick={(e) => { e.stopPropagation(); nav(`/manager/packages/${r.pkg.id}`); }}>Sửa</Button> },
          ]} />
        )}
      </Card>
      {cur && (
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card title={`Gói “${cur.pkg.name}” gồm`}>
            {(["ACTIVITY", "MEAL", "SERVICE"] as const).map((t) => (
              <div key={t} className="mb-2">
                <div className="text-[11px] text-subtle">{TYPE_LABEL[t]}</div>
                <div className="mt-1 flex flex-wrap gap-1">{cur.services.filter((s) => s.type === t).map((s) => <Badge key={s.id} tone={TYPE_TONE[t]}>✓ {s.name}</Badge>)}</div>
              </div>
            ))}
          </Card>
          <Card title="Lưu ý" className="h-fit">
            <ul className="space-y-1.5 text-[12px] leading-relaxed text-muted">
              <li>• Gia đình xem được chi tiết gói trước khi đăng ký.</li>
              <li>• Đổi giá chỉ áp dụng cho đăng ký mới; gói đang dùng giữ giá cũ.</li>
              <li>• Gói có người đang dùng chỉ được “Tạm ẩn”, không xoá.</li>
            </ul>
          </Card>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ CM-13 package editor
export function PackageEditPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const pid = useParams().id;
  const id = pid && pid !== "new" ? Number(pid) : undefined;
  const pkgs = useQuery({ queryKey: ["m-packages"], queryFn: () => manager.packages(me) });
  const svcs = useQuery({ queryKey: ["m-services"], queryFn: () => manager.services(me) });
  const cur = pkgs.data?.find((p) => p.pkg.id === id);
  const [form, setForm] = useState<{ name?: string; billingPeriod?: "DAILY" | "MONTHLY"; price?: number; description?: string; ids?: number[] }>({});
  const name = form.name ?? cur?.pkg.name ?? "";
  const period = form.billingPeriod ?? cur?.pkg.billingPeriod ?? "MONTHLY";
  const price = form.price ?? cur?.pkg.price ?? 0;
  const desc = form.description ?? cur?.pkg.description ?? "";
  const ids = form.ids ?? cur?.services.map((s) => s.id) ?? [];
  const save = useMutation({ mutationFn: (status: "ACTIVE" | "HIDDEN") => manager.savePackage(me, { id, name, billingPeriod: period, price, description: desc, status, serviceIds: ids }), onSuccess: () => { qc.invalidateQueries(); nav("/manager/packages"); } });
  if (id && pkgs.isLoading) return <Page title="Chỉnh sửa gói"><Loading /></Page>;
  const active = (svcs.data ?? []).filter((s) => s.service.status === "ACTIVE");
  return (
    <Page title={id ? `Chỉnh sửa gói · ${cur?.pkg.name}` : "Tạo gói dịch vụ"} back="/manager/packages">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <div className="grid gap-2 sm:grid-cols-[1fr_150px_150px]">
            <Field label="Tên gói" value={name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <SelectField label="Chu kỳ thanh toán" value={period} onChange={(e) => setForm({ ...form, billingPeriod: e.target.value as "DAILY" })}><option value="MONTHLY">Theo tháng</option><option value="DAILY">Theo ngày</option></SelectField>
            <Field label="Giá (VNĐ)" type="number" value={price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <TextArea className="mt-2" label="Mô tả hiển thị cho gia đình" value={desc} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="mt-3 flex items-center justify-between"><div className="text-[13px] font-bold text-navy">Chọn dịch vụ & hoạt động trong gói</div><span className="text-[11px] text-subtle">{ids.length} / {active.length} từ danh mục của trung tâm</span></div>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {(["ACTIVITY", "MEAL", "SERVICE"] as const).map((t) => (
              <div key={t} className="rounded-xl bg-canvas p-3">
                <div className="mb-1.5 text-[12px] font-bold text-navy">{TYPE_LABEL[t]}</div>
                {active.filter((s) => s.service.type === t).map((s) => (
                  <label key={s.service.id} className="flex cursor-pointer items-center gap-2 py-1 text-[12px]">
                    <input type="checkbox" className="accent-orange" checked={ids.includes(s.service.id)} onChange={(e) => setForm({ ...form, ids: e.target.checked ? [...ids, s.service.id] : ids.filter((x) => x !== s.service.id) })} />
                    <span className={ids.includes(s.service.id) ? "font-semibold text-ink" : "text-faint"}>{s.service.name}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <ErrorText error={save.error} />
          <div className="mt-4 flex gap-2">
            <Button icon={CircleCheck} loading={save.isPending} onClick={() => save.mutate("ACTIVE")}>Lưu thay đổi</Button>
            <Button variant="neutral" onClick={() => nav(-1)}>Huỷ</Button>
            {id && <Button variant="danger" className="ml-auto" icon={EyeOff} onClick={() => save.mutate("HIDDEN")}>Tạm ẩn gói</Button>}
          </div>
        </Card>
        <Card title="Xem trước (gia đình thấy)" className="h-fit">
          <div className="rounded-xl bg-gradient-to-br from-navy to-blue p-3 text-white">
            <div className="text-[10.5px] text-[#b8c4e0]">Day-Care Hoa Sen</div>
            <div className="font-bold">{name || "Tên gói"}</div>
            <div className="text-[18px] font-bold text-[#ffd2b5]">{vnd(price)} <span className="text-[10.5px] text-[#b8c4e0]">/ {period === "DAILY" ? "ngày" : "tháng"}</span></div>
          </div>
          <div className="mt-2 text-[12px] text-muted">{ids.length} dịch vụ gồm:</div>
          <ul className="text-[12px] text-muted">{(["ACTIVITY", "MEAL", "SERVICE"] as const).map((t) => <li key={t}>• {active.filter((s) => s.service.type === t && ids.includes(s.service.id)).length} {TYPE_LABEL[t].toLowerCase()}</li>)}</ul>
          <Note className="mt-3">Thay đổi chỉ áp dụng cho đăng ký mới.</Note>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-14 services catalogue
export function ServicesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<"ALL" | ServiceType>("ALL");
  const [q, setQ] = useState("");
  const [n, setN] = useState({ name: "", type: "ACTIVITY" as ServiceType, description: "" });
  const { data, isLoading } = useQuery({ queryKey: ["m-services"], queryFn: () => manager.services(me) });
  const save = useMutation({ mutationFn: () => manager.saveService(me, { ...n, status: "ACTIVE" }), onSuccess: () => { setN({ name: "", type: "ACTIVITY", description: "" }); qc.invalidateQueries({ queryKey: ["m-services"] }); } });
  const toggle = useMutation({ mutationFn: (s: { id: number; name: string; type: ServiceType; description: string; status: "ACTIVE" | "INACTIVE" }) => manager.saveService(me, { ...s, status: s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-services"] }) });
  const rows = (data ?? []).filter((s) => (f === "ALL" || s.service.type === f) && s.service.name.toLowerCase().includes(q.toLowerCase()));
  const count = (t: ServiceType) => data?.filter((s) => s.service.type === t).length ?? 0;
  return (
    <Page title={`Dịch vụ & hoạt động của trung tâm (${data?.length ?? 0})`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-56 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5"><Search size={14} className="text-subtle" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm dịch vụ" className="min-w-0 flex-1 text-[12.5px] outline-none" /></label>
        <Chip active={f === "ALL"} onClick={() => setF("ALL")}>Tất cả</Chip>
        {(["ACTIVITY", "MEAL", "SERVICE"] as const).map((t) => <Chip key={t} active={f === t} onClick={() => setF(t)}>{TYPE_LABEL[t]} ({count(t)})</Chip>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        <Card>
          {isLoading ? <Loading /> : (
            <Table rows={rows} rowKey={(s) => s.service.id} columns={[
              { key: "n", header: "Tên", render: (s) => s.service.name },
              { key: "t", header: "Loại", render: (s) => <Badge tone={TYPE_TONE[s.service.type]}>{TYPE_LABEL[s.service.type]}</Badge> },
              { key: "d", header: "Mô tả", render: (s) => <span className="text-muted">{s.service.description}</span> },
              { key: "p", header: "Trong gói", render: (s) => (s.inPackages ? `${s.inPackages} gói` : "—") },
              { key: "s", header: "Trạng thái", render: (s) => <button onClick={() => toggle.mutate(s.service)}><Badge tone={s.service.status === "ACTIVE" ? "green" : "red"}>{s.service.status === "ACTIVE" ? "Đang dùng" : "Tạm ngưng"}</Badge></button> },
            ]} />
          )}
        </Card>
        <Card title="Thêm dịch vụ mới" className="h-fit">
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <Field label="Tên" required value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} />
            <SelectField label="Loại" value={n.type} onChange={(e) => setN({ ...n, type: e.target.value as ServiceType })}>{(["ACTIVITY", "MEAL", "SERVICE"] as const).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</SelectField>
            <TextArea label="Mô tả" value={n.description} onChange={(e) => setN({ ...n, description: e.target.value })} />
            <Note>Sau khi thêm, gắn vào gói ở “Gói dịch vụ” và xếp lịch ở “Lịch & thực đơn”.</Note>
            <Button type="submit" block loading={save.isPending}>Lưu dịch vụ</Button>
          </form>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-24 centre settings + AI knowledge
export function CenterSettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["m-settings"], queryFn: () => manager.settings(me) });
  const [c, setC] = useState<Record<string, string>>({});
  const [s, setS] = useState<Record<string, string | boolean>>({});
  const [faq, setFaq] = useState<{ q: string; a: string }[]>();
  const saveC = useMutation({ mutationFn: () => manager.saveCenter(me, { name: c.name ?? data!.center.name, phone: c.phone ?? data!.center.phone, email: c.email ?? data!.center.email, address: c.address ?? data!.center.address }), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-settings"] }) });
  const saveS = useMutation({ mutationFn: () => manager.saveSettings(me, { ...(s as object), faqs: faq ?? data!.settings.faqs }), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-settings"] }) });
  if (isLoading || !data) return <Page title="Cài đặt trung tâm"><Loading /></Page>;
  const st = { ...data.settings, ...s } as typeof data.settings;
  const faqs = faq ?? data.settings.faqs;
  return (
    <Page title="Cài đặt trung tâm & trợ lý AI">
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card title="Thông tin trung tâm">
            <div className="space-y-2">
              <Field label="Tên trung tâm" defaultValue={data.center.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="Số điện thoại" defaultValue={data.center.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} />
                <Field label="Email" defaultValue={data.center.email} onChange={(e) => setC({ ...c, email: e.target.value })} />
              </div>
              <Field label="Địa chỉ" defaultValue={data.center.address} onChange={(e) => setC({ ...c, address: e.target.value })} />
              <Button size="sm" loading={saveC.isPending} onClick={() => saveC.mutate()}>Lưu thông tin</Button>
            </div>
          </Card>
          <Card title="Cổng thanh toán">
            <div className="flex items-center justify-between py-1 text-[12.5px]"><b>VNPay</b><Badge tone={data.settings.vnpayConnected ? "green" : "orange"}>{data.settings.vnpayConnected ? "Đã kết nối" : "Chưa kết nối"}</Badge></div>
            <div className="flex items-center justify-between py-1 text-[12.5px]"><b>MoMo</b><Badge tone={data.settings.momoConnected ? "green" : "orange"}>{data.settings.momoConnected ? "Đã kết nối" : "Chưa kết nối"}</Badge></div>
            <p className="mt-1 text-[11.5px] text-subtle">Tài khoản nhận tiền của trung tâm do Admin cấu hình.</p>
            <Button className="mt-2" size="sm" variant="neutral" icon={MessageCircle} to="/manager/messages?to=1">Nhắn Admin hỗ trợ</Button>
          </Card>
        </div>
        <Card title="Kiến thức cho trợ lý AI" actions={<Badge tone="teal">LLM API</Badge>}>
          <div className="space-y-2">
            <Toggle checked={st.aiEnabled} onChange={(v) => setS({ ...s, aiEnabled: v })} label="Bật trợ lý AI cho gia đình" sub="Trả lời câu hỏi thường gặp trong ứng dụng" />
            <Field label="Giờ hoạt động" value={st.openingHours} onChange={(e) => setS({ ...s, openingHours: e.target.value })} />
            <Field label="Chính sách đón / trả" value={st.pickupPolicy} onChange={(e) => setS({ ...s, pickupPolicy: e.target.value })} />
            <Field label="Chính sách hoàn tiền" value={st.refundPolicy} onChange={(e) => setS({ ...s, refundPolicy: e.target.value })} />
            <div className="pt-1 text-[12.5px] font-semibold text-navy">Câu hỏi thường gặp</div>
            {faqs.map((f, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <Field label={`Câu hỏi ${i + 1}`} value={f.q} onChange={(e) => setFaq(faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                <Field label="Trả lời" value={f.a} onChange={(e) => setFaq(faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              </div>
            ))}
            <Button size="sm" variant="outline" icon={Plus} onClick={() => setFaq([...faqs, { q: "", a: "" }])}>Thêm câu hỏi</Button>
            <Note>Trợ lý chỉ trả lời dựa trên thông tin này và dữ liệu gói, lịch, thực đơn của trung tâm.</Note>
            <Button loading={saveS.isPending} onClick={() => saveS.mutate()}>Lưu kiến thức</Button>
            {saveS.isSuccess && <Note tone="green">Đã lưu.</Note>}
          </div>
        </Card>
      </div>
    </Page>
  );
}
