// Admin = business owner / investor. Aggregated numbers only, no individual health records (mục 3, BR-60).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileBarChart, KeyRound, Lock, Mail, Unlock, UserPlus } from "lucide-react";
import { useState } from "react";
import { admin } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Bars, PositionBadge, Progress, SearchBox, Stat, TierBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, ErrorText, Field, Kpi, KV, Loading, Modal, Note, SelectField, Table, Tabs, Toggle } from "../../components/ui";
import { EQUIP_CAT, GROUP_LABEL, GROUP_TONE, ZONE_LABEL } from "../../domain/catalog";
import { dm, dmy, hm, millions } from "../../lib/format";
import type { SystemSettings } from "../../types/models";

export function AdminDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["a-dash"], queryFn: () => admin.dashboard() });
  if (isLoading || !data) return <Page title="Tổng quan doanh nghiệp"><Loading /></Page>;
  const beds = data.capacity.reduce((s, c) => s + c.beds, 0);
  const held = data.capacity.reduce((s, c) => s + c.held, 0);
  return (
    <Page title="Tổng quan doanh nghiệp" sub="Số liệu tổng hợp. Admin không xem hồ sơ sức khỏe từng cụ (đề xuất, phân quyền chi tiết để sau — BR-60).">
      <div className="flex flex-wrap gap-3">
        <Kpi label="Doanh thu tháng 10 (tới 09/10)" value={millions(data.revenueMonth)} sub="VNPay + MoMo" color="green" />
        <Kpi label="Cụ đang đi" value={data.active} sub={`${data.todayExpected} cụ có lịch hôm nay`} />
        <Kpi label="Tỷ lệ lấp chỗ" value={`${Math.round((held / Math.max(1, beds)) * 100)}%`} sub={`${held}/${beds} giường`} color="orange" />
        <Kpi label="Chưa thu" value={millions(data.unpaid)} sub="hóa đơn chờ thanh toán" color="red" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card title="Doanh thu 6 tháng (triệu đồng)">
          <Bars data={data.byMonth.map((m) => ({ label: `T${Number(m.month.slice(5))}`, value: Math.round(m.value / 100000) / 10 }))} height={190} highlightLast format={(v) => String(v)} />
        </Card>
        <Card title="Lấp chỗ theo hạng">
          {data.capacity.map((c) => (
            <div key={c.tier} className="mb-2.5">
              <div className="flex items-center justify-between text-[12px]"><TierBadge tier={c.tier} /><span className="text-muted">{c.held}/{c.beds}{c.waiting ? ` · ${c.waiting} chờ` : ""}</span></div>
              <div className="mt-1"><Progress value={(c.held / Math.max(1, c.beds)) * 100} tone={c.full ? "red" : "green"} /></div>
            </div>
          ))}
          <Note className="mt-1">Hạng Cao cấp kín chỗ: {data.waitlist} gia đình trong danh sách chờ, phòng P202 đang tạm đóng.</Note>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Cụ theo nhóm đối tượng">
          {data.groups.map((g) => <div key={g.group} className="flex items-center justify-between py-1 text-[12.5px]"><Badge tone={GROUP_TONE[g.group]}>{GROUP_LABEL[g.group]}</Badge><b>{g.count}</b></div>)}
        </Card>
        <Card title="Tỷ lệ có mặt 2 tuần">
          <Bars data={data.rate.map((r) => ({ label: dm(r.date).slice(0, 2), value: r.rate }))} height={130} format={(v) => `${v}%`} />
        </Card>
        <Card title="Vận hành">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Sự cố từ 01/09" value={data.incidents} tone="orange" />
            <Stat label="Chuyển viện" value={data.transfers} tone="red" />
            <Stat label="Thiết bị dưới định mức" value={data.lowEquip} tone="red" />
            <Stat label="Phòng tạm đóng" value={data.closedRooms} tone="orange" />
            <Stat label="Nhân viên" value={data.staff} />
            <Stat label="VNPay / MoMo" value={`${Math.round((data.methods[0].amount / Math.max(1, data.methods[0].amount + data.methods[1].amount)) * 100)}% / ${Math.round((data.methods[1].amount / Math.max(1, data.methods[0].amount + data.methods[1].amount)) * 100)}%`} />
          </div>
        </Card>
      </div>
      {data.latestReport && (
        <Card title={<span className="flex items-center gap-2"><FileBarChart size={16} />Báo cáo mới nhất từ Quản lý · {data.latestReport.label}</span>} actions={<Button size="sm" variant="outline" to="/admin/reports">Tất cả báo cáo</Button>}>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">{data.latestReport.metrics.map((m) => <Stat key={m.label} label={m.label} value={m.value} />)}</div>
          <p className="mt-2 text-[12.5px] text-muted">“{data.latestReport.managerNote}”</p>
        </Card>
      )}
    </Page>
  );
}

export function AdminReports() {
  const { data, isLoading } = useQuery({ queryKey: ["a-reports"], queryFn: () => admin.reports() });
  const [sel, setSel] = useState<number>();
  const cur = data?.find((r) => r.id === sel) ?? data?.[0];
  return (
    <Page title="Báo cáo từ Quản lý" sub="Hệ thống tự tạo theo tuần và tháng; Quản lý thêm nhận xét rồi gửi (BR-61).">
      {isLoading ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card bodyClass="space-y-2">{data?.map((r) => <button key={r.id} onClick={() => setSel(r.id)} className={`w-full rounded-[10px] border px-3 py-2 text-left ${cur?.id === r.id ? "border-[2px] border-orange" : "border-line"}`}><b className="block text-[12.5px] text-navy">{r.label}</b><span className="text-[11px] text-subtle">{r.period === "WEEK" ? "Tuần" : "Tháng"} · gửi {dmy(r.sentAt!.slice(0, 10))}</span></button>)}</Card>
          {cur && (
            <Card title={cur.label} actions={<span className="text-[11.5px] text-subtle">{dmy(cur.from)} – {dmy(cur.to)} · gửi {hm(cur.sentAt)} {dmy(cur.sentAt!.slice(0, 10))}</span>}>
              <div className="grid gap-2 sm:grid-cols-3">{cur.metrics.map((m) => <Stat key={m.label} label={m.label} value={m.value} />)}</div>
              <div className="mt-3 rounded-xl bg-orange-soft p-3 text-[12.5px]"><b className="text-navy">Nhận xét của Quản lý:</b> {cur.managerNote}</div>
            </Card>
          )}
        </div>
      )}
    </Page>
  );
}

export function AdminFacilities() {
  const { data, isLoading } = useQuery({ queryKey: ["a-fac"], queryFn: () => admin.facilities() });
  if (isLoading || !data) return <Page title="Cơ sở vật chất"><Loading /></Page>;
  return (
    <Page title="Cơ sở vật chất" sub="Chỉ xem báo cáo. Quản lý nhập và cập nhật số liệu.">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Sử dụng giường hôm nay" value={`${data.bedUse}%`} />
        <Stat label="Báo hỏng đang mở" value={data.damage.open} tone="orange" />
        <Stat label="Đã sửa / thanh lý" value={`${data.damage.fixed} / ${data.damage.disposed}`} />
        <Stat label="Lần bù quyền lợi" value={data.compensations} tone="purple" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Thiết bị">
          <Table rows={data.equipment} rowKey={(r) => r.equipment.id} columns={[
            { key: "n", header: "Thiết bị", render: (r) => r.equipment.name },
            { key: "c", header: "Nhóm", render: (r) => EQUIP_CAT[r.equipment.category] },
            { key: "u", header: "Dùng được", render: (r) => <Badge tone={r.usable < r.equipment.minStock ? "red" : "green"}>{r.usable}/{r.equipment.total}</Badge> },
            { key: "m", header: "Định mức", render: (r) => r.equipment.minStock },
          ]} />
        </Card>
        <div className="space-y-4">
          <Card title="Phòng">
            {data.rooms.map((r) => <div key={r.id} className="flex items-center justify-between py-1 text-[12.5px]"><span>{r.name} <span className="text-subtle">· {ZONE_LABEL[r.zone]} · {r.capacity} chỗ</span></span>{r.status === "CLOSED" ? <Badge tone="orange">Tạm đóng</Badge> : <Badge tone="green">Hoạt động</Badge>}</div>)}
          </Card>
          {data.lastInventory && (
            <Card title={`Kiểm kê gần nhất · ${data.lastInventory.title}`}>
              {data.lastInventory.diff.length === 0 ? <div className="text-[12.5px] text-subtle">Không chênh lệch</div> : data.lastInventory.diff.map((d) => <KV key={d.equipmentId} label={d.equipment?.name} w={160}>{d.system} → {d.counted} · {d.reason}</KV>)}
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

export function AccountsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"mgr" | "staff">("mgr");
  const [q, setQ] = useState("");
  const [add, setAdd] = useState<{ fullName: string; email: string; phone: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["a-acc"], queryFn: () => admin.accounts() });
  const lock = useMutation({ mutationFn: ({ id, s }: { id: number; s: "LOCKED" | "ACTIVE" }) => admin.setUserStatus(me, id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["a-acc"] }) });
  const reset = useMutation({ mutationFn: (id: number) => admin.resetPassword(me, id) });
  const create = useMutation({ mutationFn: () => admin.createManager(me, add!), onSuccess: () => { qc.invalidateQueries({ queryKey: ["a-acc"] }); setAdd(null); } });
  return (
    <Page title="Tài khoản" sub={`Admin quản lý tài khoản Quản lý trung tâm; tài khoản nhân viên chỉ xem. ${data?.families ?? 0} tài khoản gia đình tự đăng ký.`} actions={tab === "mgr" && <Button size="sm" icon={UserPlus} onClick={() => setAdd({ fullName: "", email: "", phone: "" })}>Tạo tài khoản Quản lý</Button>}>
      <Tabs value={tab} onChange={setTab} items={[{ value: "mgr", label: "Quản lý trung tâm" }, { value: "staff", label: "Nhân viên (chỉ xem)" }]} />
      <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên, email…" />
      <Card>
        {isLoading || !data ? <Loading /> : tab === "mgr" ? (
          <Table rows={data.managers.filter((u) => !q || `${u.fullName} ${u.email}`.toLowerCase().includes(q.toLowerCase()))} rowKey={(u) => u.id} columns={[
            { key: "n", header: "Họ tên", render: (u) => <b className="text-navy">{u.fullName}</b> },
            { key: "e", header: "Email", render: (u) => u.email },
            { key: "l", header: "Đăng nhập gần nhất", render: (u) => (u.lastLoginAt ? `${dmy(u.lastLoginAt.slice(0, 10))} ${hm(u.lastLoginAt)}` : "—") },
            { key: "s", header: "Trạng thái", render: (u) => <Badge tone={u.status === "ACTIVE" ? "green" : u.status === "INVITED" ? "orange" : "red"}>{({ ACTIVE: "Hoạt động", INVITED: "Đã mời", LOCKED: "Đã khóa" })[u.status]}</Badge> },
            { key: "x", header: "", render: (u) => <span className="flex gap-1"><Button size="sm" variant="neutral" icon={Mail} onClick={() => reset.mutate(u.id)}>Đặt lại MK</Button><Button size="sm" variant={u.status === "LOCKED" ? "outline" : "danger"} icon={u.status === "LOCKED" ? Unlock : Lock} onClick={() => lock.mutate({ id: u.id, s: u.status === "LOCKED" ? "ACTIVE" : "LOCKED" })}>{u.status === "LOCKED" ? "Mở" : "Khóa"}</Button></span> },
          ]} />
        ) : (
          <Table rows={data.staff.filter((r) => !q || `${r.user.fullName} ${r.user.email}`.toLowerCase().includes(q.toLowerCase()))} rowKey={(r) => r.user.id} columns={[
            { key: "n", header: "Họ tên", render: (r) => r.user.fullName },
            { key: "p", header: "Chức vụ", render: (r) => <PositionBadge position={r.position} /> },
            { key: "e", header: "Email", render: (r) => r.user.email },
            { key: "s", header: "Trạng thái", render: (r) => <Badge tone={r.user.status === "ACTIVE" ? "green" : "orange"}>{r.user.status === "ACTIVE" ? "Hoạt động" : r.user.status === "INVITED" ? "Đã mời" : "Đã khóa"}</Badge> },
          ]} />
        )}
        {reset.isSuccess && <Note tone="green" className="mt-2">Đã gửi email đặt lại mật khẩu.</Note>}
      </Card>
      <Modal open={!!add} onClose={() => setAdd(null)} title="Tạo tài khoản Quản lý" footer={<><Button variant="neutral" onClick={() => setAdd(null)}>Hủy</Button><Button icon={KeyRound} loading={create.isPending} onClick={() => create.mutate()}>Tạo & gửi lời mời</Button></>}>
        {add && <div className="grid gap-2"><Field label="Họ tên" value={add.fullName} onChange={(e) => setAdd({ ...add, fullName: e.target.value })} /><Field label="Email" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} /><Field label="Điện thoại" value={add.phone} onChange={(e) => setAdd({ ...add, phone: e.target.value })} /><ErrorText error={create.error} /></div>}
      </Modal>
    </Page>
  );
}

export function SystemSettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["a-sys"], queryFn: () => admin.systemSettings() });
  const [f, setF] = useState<Partial<SystemSettings>>({});
  const save = useMutation({ mutationFn: () => admin.saveSystemSettings(me, f), onSuccess: () => { qc.invalidateQueries({ queryKey: ["a-sys"] }); setF({}); } });
  if (isLoading || !data) return <Page title="Cấu hình hệ thống"><Loading /></Page>;
  const v = { ...data, ...f };
  return (
    <Page title="Cấu hình hệ thống" sub="Cổng thanh toán, AI, bảo mật, kênh thông báo." actions={Object.keys(f).length > 0 && <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>Lưu</Button>}>
      {save.isSuccess && <Note tone="green">Đã lưu và ghi nhật ký hệ thống.</Note>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cổng thanh toán">
          <div className="grid gap-2 sm:grid-cols-2">
            <SelectField label="VNPay" value={v.vnpayMode} onChange={(e) => setF({ ...f, vnpayMode: e.target.value as "SANDBOX" })}><option value="PRODUCTION">Production</option><option value="SANDBOX">Sandbox</option></SelectField>
            <SelectField label="MoMo" value={v.momoMode} onChange={(e) => setF({ ...f, momoMode: e.target.value as "SANDBOX" })}><option value="PRODUCTION">Production</option><option value="SANDBOX">Sandbox</option></SelectField>
          </div>
          <Note className="mt-2">Callback IPN cập nhật trạng thái thanh toán; hoàn tiền chỉ dùng cho trường hợp qua đời.</Note>
        </Card>
        <Card title="AI (LLM)">
          <Field label="Giới hạn token mỗi ngày" type="number" value={v.llmDailyTokenLimit} onChange={(e) => setF({ ...f, llmDailyTokenLimit: Number(e.target.value) })} />
          <div className="mt-2"><Toggle checked={v.llmMaskPersonalData} onChange={(x) => setF({ ...f, llmMaskPersonalData: x })} label="Ẩn thông tin cá nhân khi gửi AI" sub="Tên, CCCD, số điện thoại (BR-51)" /></div>
          <Note className="mt-2">AI chỉ gợi ý: xếp ca, thực đơn, chatbot, cảnh báo xu hướng. Mọi quyết định do người duyệt (BR-50).</Note>
        </Card>
        <Card title="Bảo mật">
          <Field label="Hết phiên sau (phút)" type="number" value={v.sessionTimeoutMinutes} onChange={(e) => setF({ ...f, sessionTimeoutMinutes: Number(e.target.value) })} />
          <div className="mt-2"><Toggle checked={v.lockAfterFailedLogins} onChange={(x) => setF({ ...f, lockAfterFailedLogins: x })} label="Khóa tạm sau 5 lần đăng nhập sai" /></div>
        </Card>
        <Card title="Thông báo">
          <Toggle checked={v.emailEnabled} onChange={(x) => setF({ ...f, emailEnabled: x })} label="Email" />
          <div className="mt-2"><Toggle checked={v.pushEnabled} onChange={(x) => setF({ ...f, pushEnabled: x })} label="Push trên app mobile" /></div>
        </Card>
      </div>
    </Page>
  );
}

export function AuditPage() {
  const [q, setQ] = useState("");
  const [f, setF] = useState<"ALL" | "MSG" | "MONEY" | "CARE">("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["a-audit"], queryFn: () => admin.auditLogs() });
  const rows = (data ?? []).filter((r) => (!q || r.log.action.toLowerCase().includes(q.toLowerCase())) && (f === "ALL" || (f === "MSG" ? r.log.entityName === "messages" : f === "MONEY" ? ["payments", "refunds", "subscriptions", "invoices"].includes(r.log.entityName) : r.log.entityName.startsWith("care_log"))));
  return (
    <Page title="Nhật ký hệ thống" sub="Gồm cả lần Quản lý mở lịch sử tin nhắn gia đình (BR-40) và sửa care log đã chốt (CL-06).">
      <div className="flex flex-wrap items-center gap-2"><SearchBox value={q} onChange={setQ} placeholder="Tìm hành động…" />{([["ALL", "Tất cả"], ["MSG", "Mở tin nhắn"], ["CARE", "Sửa care log"], ["MONEY", "Tiền & gói"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}</div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.log.id} columns={[
            { key: "t", header: "Thời gian", render: (r) => `${dmy(r.log.createdAt.slice(0, 10))} ${hm(r.log.createdAt)}` },
            { key: "u", header: "Người thực hiện", render: (r) => r.user?.fullName ?? <Badge tone="gray">Hệ thống</Badge> },
            { key: "a", header: "Hành động", render: (r) => r.log.action },
            { key: "e", header: "Bảng", render: (r) => <code className="text-[11px]">{r.log.entityName}</code> },
            { key: "i", header: "IP", render: (r) => r.log.ipAddress },
          ]} />
        )}
      </Card>
    </Page>
  );
}
