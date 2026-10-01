import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, MessageCircle, Pencil, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { lookups, manager, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Avatar, Badge, Button, Card, Chip, ConfirmDialog, EmptyState, ErrorText, Field, Kpi, KV, Loading, Note, SelectField, Table, TextArea, Tabs, type Tone } from "../../components/ui";
import { age, dm, dmy, hm, millions, vnd, weekday } from "../../lib/format";
import type { Attendance } from "../../types/models";

export const attBadge = (a?: Attendance, absence?: boolean): [Tone, string] =>
  absence ? ["purple", "Báo nghỉ"] : !a ? ["gray", "Không có lịch"] : a.status === "PRESENT" ? ["green", "Có mặt"] : a.status === "LEFT" ? ["blue", "Đã về"] : a.status === "ABSENT" ? ["purple", "Nghỉ"] : ["orange", "Chưa đến"];
export const regBadge: Record<string, [Tone, string]> = { ACTIVE: ["green", "Đang hiệu lực"], PENDING: ["orange", "Chờ duyệt"], EXPIRED: ["gray", "Hết hạn"], CANCELLED: ["red", "Đã huỷ"] };

// ------------------------------------------------------------------ CM-02 dashboard
export function ManagerDashboard() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["m-dash"], queryFn: () => manager.dashboard(me) });
  if (isLoading || !data) return <Page title="Tổng quan"><Loading /></Page>;
  const max = Math.max(...data.week.map((w) => w.count), 1);
  return (
    <Page title={`Tổng quan · ${weekday(TODAY)}, ${dmy(TODAY)}`}>
      <div className="flex flex-wrap gap-3">
        <Kpi label="Có mặt hôm nay" value={`${data.present}/${data.total}`} sub="cập nhật theo điểm danh" />
        <Kpi label="Doanh thu tháng 10" value={millions(data.revenue)} sub="qua VNPay / MoMo" color="green" />
        <Kpi label="Đăng ký mới chờ duyệt" value={data.pendingRegs} sub="Cần xử lý hôm nay" color="orange" />
        <Kpi label="Mục nhật ký cần lưu ý" value={data.flagged} sub="Huyết áp · ăn ít" color="red" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Điểm danh 7 ngày gần đây">
          <div className="flex h-48 items-end justify-around gap-2">
            {data.week.map((w) => (
              <div key={w.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10.5px] text-subtle">{w.count}</span>
                <div className={`w-full max-w-10 rounded-t-md ${w.date === TODAY ? "bg-orange" : "bg-blue"}`} style={{ height: `${(w.count / max) * 150}px` }} />
                <span className="text-[10.5px] text-subtle">{weekday(w.date)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Việc cần làm">
          <ul className="space-y-2.5 text-[12.5px]">
            {([[data.pendingRegs, "orange", "Duyệt đăng ký mới", "/manager/registrations"], [data.pendingRefunds, "red", "Yêu cầu hoàn tiền chờ xử lý", "/manager/payments?tab=refunds"], [data.pendingAi, "teal", "Duyệt đề xuất xếp ca tuần 05–10/10", "/manager/shifts"], [data.flagged, "blue", "Mục nhật ký cần liên hệ gia đình", "/manager/care-logs"], [data.pendingAbsences, "purple", "Báo nghỉ chờ duyệt", "/manager/absences"]] as const).map(([n, tone, label, to]) => (
              <li key={label}>
                <Link to={to} className="flex items-center gap-2 hover:text-orange">
                  <Badge tone={tone}>{n}</Badge> {label}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-03 members
export function MembersPage() {
  const me = useMe();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"ALL" | "ACTIVE" | "EXPIRING" | "PAUSED">("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["m-members"], queryFn: () => manager.members(me) });
  const rows = (data ?? []).filter((r) => {
    if (q && !`${r.elderly.fullName} ${r.family?.fullName}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (f === "ACTIVE") return r.elderly.status === "ACTIVE";
    if (f === "PAUSED") return r.elderly.status === "PAUSED";
    if (f === "EXPIRING") return !!r.reg && r.reg.endDate <= "2026-10-15";
    return true;
  });
  return (
    <Page title={`Người cao tuổi (${data?.length ?? 0})`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-64 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5">
          <Search size={14} className="text-subtle" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, gia đình…" className="min-w-0 flex-1 text-[12.5px] outline-none" />
        </label>
        {([["ALL", "Tất cả"], ["ACTIVE", "Đang tham gia"], ["EXPIRING", "Sắp hết hạn"], ["PAUSED", "Tạm nghỉ"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}
        <Button className="ml-auto" icon={Plus} to="/manager/members/new">Thêm người cao tuổi</Button>
      </div>
      <Card>
        {isLoading ? <Loading /> : data?.length === 0 ? (
          <EmptyState icon={Users} title="Trung tâm chưa có người cao tuổi" desc="Thêm hồ sơ trực tiếp, hoặc chờ gia đình đăng ký gói qua ứng dụng." action={<><Button icon={Plus} to="/manager/members/new">Thêm người cao tuổi</Button><Button variant="neutral" to="/manager/packages">Xem gói dịch vụ</Button></>} />
        ) : (
          <Table
            rows={rows}
            rowKey={(r) => r.elderly.id}
            onRowClick={(r) => nav(`/manager/members/${r.elderly.id}`)}
            columns={[
              { key: "n", header: "Họ tên", render: (r) => <span className="flex items-center gap-2"><Avatar name={r.elderly.fullName} size={26} />{r.elderly.fullName}</span> },
              { key: "a", header: "Tuổi", render: (r) => age(r.elderly.dateOfBirth) },
              { key: "p", header: "Gói dịch vụ", render: (r) => r.pkg?.name ?? "—" },
              { key: "f", header: "Gia đình đại diện", render: (r) => r.family?.fullName },
              { key: "e", header: "Hết hạn", render: (r) => (r.reg ? dmy(r.reg.endDate) : "—") },
              { key: "s", header: "Trạng thái", render: (r) => r.elderly.status === "PAUSED" ? <Badge tone="gray">Tạm nghỉ</Badge> : r.reg && r.reg.endDate <= "2026-10-15" ? <Badge tone="orange">Sắp hết hạn</Badge> : <Badge tone="green">Đang tham gia</Badge> },
            ]}
          />
        )}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-16 member detail
export function MemberDetailPage() {
  const me = useMe();
  const id = Number(useParams().id);
  const { data, isLoading, error } = useQuery({ queryKey: ["m-member", id], queryFn: () => manager.member(me, id) });
  if (isLoading) return <Page title="Hồ sơ" back="/manager/members"><Loading /></Page>;
  if (!data) return <Page title="Hồ sơ" back="/manager/members"><ErrorText error={error} /></Page>;
  const e = data.elderly;
  return (
    <Page title={`Hồ sơ · ${e.gender === "Nữ" ? "Bà" : "Ông"} ${e.fullName}`} back="/manager/members">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <Avatar name={e.fullName} size={60} />
            <div className="text-[16px] font-bold text-navy">{e.fullName}</div>
            <div className="text-[11.5px] text-subtle">{age(e.dateOfBirth)} tuổi · {e.gender} · {dmy(e.dateOfBirth)}</div>
            <Badge tone={e.status === "ACTIVE" ? "green" : "gray"}>{e.status === "ACTIVE" ? "Đang tham gia" : "Tạm nghỉ"}</Badge>
          </div>
          <div className="mt-3 border-t border-line-soft pt-2">
            <KV label="Địa chỉ" w={80}>{e.address}</KV>
            <KV label="Gia đình" w={80}>{data.family?.fullName} · {data.family?.phone}</KV>
            <KV label="Khẩn cấp" w={80}>{e.emergencyContactName} · {e.emergencyContactRelationship} · {e.emergencyContactPhone}</KV>
            <KV label="Phụ trách" w={80}>{data.staff?.fullName ?? "Chưa phân công"}</KV>
          </div>
          <div className="mt-2 text-[12px] font-semibold text-navy">Ghi chú chăm sóc</div>
          <div className="mt-1 flex flex-wrap gap-1">{e.healthTags.map((t) => <Badge key={t} tone="red">{t}</Badge>)}</div>
          <p className="mt-1.5 text-[12px] text-muted">{e.careNote}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" icon={Pencil} to={`/manager/members/${e.id}/edit`}>Sửa hồ sơ</Button>
            <Button size="sm" variant="neutral" icon={MessageCircle} to={`/manager/messages?to=${e.familyUserId}`}>Nhắn gia đình</Button>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="Gói dịch vụ đang dùng" actions={data.reg && <Badge tone={regBadge[data.reg.status][0]}>{data.reg.status}</Badge>}>
            {data.reg ? (
              <>
                <KV label="Gói">{data.pkg?.name} · {vnd(data.pkg?.price ?? 0)}/{data.pkg?.billingPeriod === "DAILY" ? "ngày" : "tháng"}</KV>
                <KV label="Thời hạn">{dmy(data.reg.startDate)} – {dmy(data.reg.endDate)}</KV>
                {data.invoice && <KV label="Hoá đơn">{data.invoice.number} <Badge tone={data.invoice.status === "PAID" ? "green" : "orange"}>{data.invoice.status === "PAID" ? "Đã thanh toán" : "Chưa thanh toán"}</Badge></KV>}
                {data.invoice && <Button className="mt-2" size="sm" variant="outline" to={`/manager/invoices/${data.invoice.id}`}>Xem hoá đơn</Button>}
              </>
            ) : <div className="text-[12.5px] text-subtle">Chưa có gói</div>}
          </Card>
          <Card title="Điểm danh 7 ngày gần đây">
            <div className="grid grid-cols-7 gap-1.5">
              {data.attendance.map(({ date, a, absence }) => {
                const [tone, label] = attBadge(a, !!absence && a?.status !== "PRESENT");
                return (
                  <div key={date} className="flex flex-col items-center gap-1">
                    <span className="text-[10.5px] font-semibold text-subtle">{weekday(date)} {dm(date)}</span>
                    <Badge tone={tone}>{label}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Nhật ký gần đây" actions={<Button size="sm" variant="outline" to="/manager/care-logs">Xem tất cả</Button>}>
            <Table rows={data.logs} rowKey={(l) => l.id} columns={[
              { key: "d", header: "Ngày", render: (l) => dm(l.date) },
              { key: "c", header: "Tình trạng", render: (l) => ({ GOOD: "Tốt", NORMAL: "Bình thường", TIRED: "Mệt" })[l.generalCondition] },
              { key: "i", header: "Lưu ý", render: (l) => <Badge tone={l.issueNote ? "red" : "green"}>{l.issueNote ?? "Không"}</Badge> },
              { key: "s", header: "Nhân viên", render: (l) => l.staff?.fullName },
            ]} />
          </Card>
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-17 member form
export function MemberFormPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const editId = useParams().id ? Number(useParams().id) : undefined;
  const existing = useQuery({ queryKey: ["m-member", editId], queryFn: () => manager.member(me, editId!), enabled: !!editId });
  const pkgs = useQuery({ queryKey: ["m-packages"], queryFn: () => manager.packages(me) });
  const e = existing.data?.elderly;
  const [form, setForm] = useState<Record<string, string>>({});
  const v = (k: string, d = "") => form[k] ?? d;
  const set = (k: string) => (ev: { target: { value: string } }) => setForm((s) => ({ ...s, [k]: ev.target.value }));
  const fam = existing.data?.family;
  const save = useMutation({
    mutationFn: () => manager.saveMember(me, {
      id: editId, fullName: v("fullName", e?.fullName), dateOfBirth: v("dob", e?.dateOfBirth), gender: v("gender", e?.gender ?? "Nam") as "Nam" | "Nữ", phone: v("phone", e?.phone ?? ""), address: v("address", e?.address),
      emergencyContactName: v("ecn", e?.emergencyContactName), emergencyContactPhone: v("ecp", e?.emergencyContactPhone), emergencyContactRelationship: v("ecr", e?.emergencyContactRelationship),
      careNote: v("note", e?.careNote), healthTags: v("tags", e?.healthTags.join(", ")), familyEmail: v("familyEmail", fam?.email),
      packageId: editId ? undefined : Number(v("pkg", "1")), startDate: v("start", "2026-10-15"), months: Number(v("months", "1")), assignedStaffId: e?.assignedStaffId,
    }),
    onSuccess: (r) => { qc.invalidateQueries(); nav(r.invoiceId ? `/manager/invoices/${r.invoiceId}` : `/manager/members/${r.elderlyId}`); },
  });
  if (editId && existing.isLoading) return <Page title="Sửa hồ sơ"><Loading /></Page>;
  const pkg = pkgs.data?.find((p) => p.pkg.id === Number(v("pkg", "1")))?.pkg;
  const est = pkg ? pkg.price * (pkg.billingPeriod === "MONTHLY" ? Number(v("months", "1")) : 1) + 300000 : 0;
  return (
    <Page title={editId ? `Sửa hồ sơ · ${e?.fullName}` : "Thêm người cao tuổi"} back={editId ? `/manager/members/${editId}` : "/manager/members"}>
      <form className="grid gap-4 lg:grid-cols-[1fr_300px]" onSubmit={(ev) => { ev.preventDefault(); save.mutate(); }}>
        <Card title="Thông tin người cao tuổi">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Họ và tên" required defaultValue={e?.fullName} onChange={set("fullName")} />
            <Field label="Ngày sinh" type="date" required defaultValue={e?.dateOfBirth} onChange={set("dob")} />
            <SelectField label="Giới tính" defaultValue={e?.gender ?? "Nam"} onChange={set("gender")}><option>Nam</option><option>Nữ</option></SelectField>
            <Field label="Số điện thoại (không bắt buộc)" defaultValue={e?.phone} onChange={set("phone")} />
            <Field label="Địa chỉ" className="sm:col-span-2" required defaultValue={e?.address} onChange={set("address")} />
          </div>
          <div className="mt-3 mb-1.5 text-[12.5px] font-semibold text-navy">Gia đình & liên hệ khẩn cấp</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Email tài khoản gia đình" type="email" required className="sm:col-span-3" placeholder="vd: lan.nguyen@gmail.com" defaultValue={fam?.email} onChange={set("familyEmail")} />
            <Field label="Liên hệ khẩn cấp" required defaultValue={e?.emergencyContactName} onChange={set("ecn")} />
            <Field label="Quan hệ" required defaultValue={e?.emergencyContactRelationship} onChange={set("ecr")} />
            <Field label="Số điện thoại" required defaultValue={e?.emergencyContactPhone} onChange={set("ecp")} />
          </div>
          <div className="mt-2 grid gap-2">
            <Field label="Bệnh lý / dị ứng (phân cách bằng dấu phẩy)" defaultValue={e?.healthTags.join(", ")} onChange={set("tags")} />
            <TextArea label="Ghi chú chăm sóc" defaultValue={e?.careNote} onChange={set("note")} />
          </div>
          <ErrorText error={save.error} />
          <div className="mt-3 flex gap-2">
            {editId && <Button type="submit" loading={save.isPending}>Lưu hồ sơ</Button>}
            <Button type="button" variant="neutral" onClick={() => nav(-1)}>Huỷ</Button>
          </div>
        </Card>
        {!editId && (
          <Card title="Đăng ký gói" className="h-fit">
            <div className="space-y-2">
              <SelectField label="Gói dịch vụ" value={v("pkg", "1")} onChange={set("pkg")}>
                {pkgs.data?.filter((p) => p.pkg.status === "ACTIVE").map((p) => <option key={p.pkg.id} value={p.pkg.id}>{p.pkg.name} · {vnd(p.pkg.price)}</option>)}
              </SelectField>
              <Field label="Ngày bắt đầu" type="date" value={v("start", "2026-10-15")} onChange={set("start")} />
              {pkg?.billingPeriod === "MONTHLY" && <SelectField label="Thời hạn" value={v("months", "1")} onChange={set("months")}><option value="1">1 tháng</option><option value="3">3 tháng</option><option value="6">6 tháng</option></SelectField>}
              <KV label="Tạm tính" w={70}><span className="text-[15px] text-orange">{vnd(est)}</span></KV>
              <Note>Hoá đơn sẽ gửi cho gia đình thanh toán online qua VNPay / MoMo. Phí đăng ký 300.000đ.</Note>
              <Button type="submit" icon={CircleCheck} block loading={save.isPending}>Lưu & tạo hoá đơn</Button>
            </div>
          </Card>
        )}
      </form>
    </Page>
  );
}

// ------------------------------------------------------------------ CM-04 registrations (+ WC-07 confirm)
export function RegistrationsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [tab, setTab] = useState<"PENDING" | "DONE">("PENDING");
  const [sel, setSel] = useState<number>();
  const [confirm, setConfirm] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["m-regs"], queryFn: () => manager.registrations(me) });
  const list = (data ?? []).filter((r) => (tab === "PENDING" ? r.reg.status === "PENDING" : r.reg.status !== "PENDING"));
  const cur = list.find((r) => r.reg.id === sel) ?? list[0];
  const approve = useMutation({ mutationFn: () => manager.approveRegistration(me, cur!.reg.id), onSuccess: () => { qc.invalidateQueries(); setConfirm(false); nav(`/manager/members/${cur!.elderly.id}`); } });
  const reject = useMutation({ mutationFn: () => manager.rejectRegistration(me, cur!.reg.id), onSuccess: () => qc.invalidateQueries() });
  return (
    <Page title="Đăng ký mới">
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <Tabs value={tab} onChange={setTab} items={[{ value: "PENDING", label: `Chờ duyệt (${data?.filter((r) => r.reg.status === "PENDING").length ?? 0})` }, { value: "DONE", label: "Đã xử lý" }]} />
          <div className="mt-3 space-y-2">
            {isLoading ? <Loading /> : list.length === 0 ? <EmptyState icon={CircleCheck} title="Không có đăng ký chờ duyệt" /> : list.map((r) => (
              <button key={r.reg.id} onClick={() => setSel(r.reg.id)} className={`flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left ${cur?.reg.id === r.reg.id ? "border-[2px] border-orange" : "border-line"}`}>
                <Avatar name={r.elderly.fullName} size={32} />
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-navy">{r.elderly.fullName}</span><span className="text-[11px] text-subtle">{age(r.elderly.dateOfBirth)} tuổi · {r.pkg.name}</span></span>
                {r.reg.status === "PENDING" ? <Badge tone={r.payment ? "green" : "orange"}>{r.payment ? "Đã thanh toán" : "Chờ thanh toán"}</Badge> : <Badge tone={regBadge[r.reg.status][0]}>{regBadge[r.reg.status][1]}</Badge>}
              </button>
            ))}
          </div>
        </Card>
        {cur && (
          <Card title={cur.elderly.fullName} actions={<Badge tone={cur.payment ? "green" : "orange"}>{cur.payment ? "Đã thanh toán" : "Chờ thanh toán"}</Badge>}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Người đại diện" value={`${cur.family?.fullName} · ${cur.family?.phone}`} readOnly />
              <Field label="Sức khoẻ" value={cur.elderly.healthTags.join(", ") || "Không ghi nhận"} readOnly />
            </div>
            <div className="mt-3 rounded-xl bg-canvas p-3">
              <KV label={`${cur.pkg.name} (kỳ đầu)`} w={200}>{vnd(cur.invoice?.subtotal ?? 0)}</KV>
              <KV label="Phí đăng ký" w={200}>{vnd(cur.invoice?.additionalCharge ?? 0)}</KV>
              <KV label={cur.payment ? `Đã thu qua ${cur.payment.method === "VNPAY" ? "VNPay" : "MoMo"}` : "Cần thu"} w={200}><span className="text-orange">{vnd(cur.invoice?.total ?? 0)}</span></KV>
              {cur.payment && <div className="text-[11px] text-subtle">Mã GD {cur.payment.transactionCode} · {cur.invoice?.number} · {dmy(cur.payment.paidAt.slice(0, 10))} {hm(cur.payment.paidAt)}</div>}
            </div>
            <Note className="mt-3">Tiền đã chuyển vào tài khoản của trung tâm. Admin nền tảng không thu tiền của gia đình.</Note>
            {cur.reg.status === "PENDING" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="success" icon={CircleCheck} disabled={!cur.payment} onClick={() => setConfirm(true)}>Duyệt & tạo hồ sơ</Button>
                <Button variant="neutral" to={`/manager/messages?to=${cur.family?.id}`}>Yêu cầu bổ sung</Button>
                <Button variant="danger" className="ml-auto" loading={reject.isPending} onClick={() => reject.mutate()}>Từ chối & hoàn tiền</Button>
              </div>
            )}
          </Card>
        )}
      </div>
      {cur && (
        <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={() => approve.mutate()} loading={approve.isPending} icon={CircleCheck} title="Duyệt đăng ký & tạo hồ sơ?"
          desc={`${cur.elderly.fullName} sẽ được thêm vào ${lookups.center(me.centerId)?.name}. Gia đình nhận thông báo và hoá đơn ${cur.invoice?.number}.`} confirmLabel="Duyệt" />
      )}
    </Page>
  );
}
