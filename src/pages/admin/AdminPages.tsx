import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck, Download, Lock, Plus, Search, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { admin, ROLE_PERMISSIONS } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Avatar, Badge, Button, Card, Chip, ErrorText, Field, Kpi, KV, Loading, Note, SelectField, Table, Toggle, cn, type Tone } from "../../components/ui";
import { dm, dmy, hm } from "../../lib/format";
import type { Center, Role } from "../../types/models";

const CENTER_STATUS: Record<Center["status"], [Tone, string]> = { ACTIVE: ["green", "Hoạt động"], PENDING: ["purple", "Chờ duyệt"], SUSPENDED: ["red", "Tạm khoá"] };

// ------------------------------------------------------------------ AD-01
export function AdminDashboard() {
  const { data } = useQuery({ queryKey: ["a-dash"], queryFn: () => admin.dashboard() });
  if (!data) return <Page title="Tổng quan nền tảng"><Loading /></Page>;
  return (
    <Page title="Tổng quan nền tảng">
      <div className="flex flex-wrap gap-3">
        <Kpi label="Trung tâm hoạt động" value={data.centers} sub="+1 tháng này" color="green" />
        <Kpi label="Người cao tuổi" value={data.elderly.toLocaleString("vi-VN")} sub="tổng hợp" />
        <Kpi label="Tài khoản gia đình" value={data.families.toLocaleString("vi-VN")} sub="▲ 6%" color="orange" />
        <Kpi label="Nhân viên" value={data.staff} sub="toàn hệ thống" color="teal" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card title="Số người cao tuổi theo tháng">
          <div className="flex h-44 items-end justify-around">{data.growth.map((v, i) => <div key={i} className="flex flex-col items-center gap-1"><span className="text-[10px] text-subtle">{v}</span><div className={`w-10 rounded-t-md ${i === 5 ? "bg-orange" : "bg-blue"}`} style={{ height: v / 9 }} /><span className="text-[10.5px] text-subtle">T{i + 5}</span></div>)}</div>
        </Card>
        <Card title="Cảnh báo hệ thống">
          <ul className="space-y-2 text-[12.5px]">
            <li className="flex items-center gap-2"><Badge tone="orange">{data.pendingCenters}</Badge>Trung tâm chờ duyệt mở</li>
            <li className="flex items-center gap-2"><Badge tone="red">{data.expiring}</Badge>Trung tâm sắp hết hợp đồng</li>
            <li className="flex items-center gap-2"><Badge tone="green">OK</Badge>Cổng thanh toán & LLM hoạt động</li>
          </ul>
          <Note className="mt-3">Chỉ hiển thị số liệu tổng hợp, không có dữ liệu cá nhân của người cao tuổi.</Note>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ AD-02
export function CentersPage() {
  const nav = useNavigate();
  const [f, setF] = useState<"ALL" | Center["status"]>("ALL");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["a-centers"], queryFn: () => admin.centers() });
  const rows = (data ?? []).filter((r) => (f === "ALL" || r.center.status === f) && r.center.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page title={`Trung tâm (${data?.length ?? 0})`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-56 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5"><Search size={14} className="text-subtle" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trung tâm" className="min-w-0 flex-1 text-[12.5px] outline-none" /></label>
        {(["ALL", "ACTIVE", "PENDING", "SUSPENDED"] as const).map((v) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{v === "ALL" ? "Tất cả" : CENTER_STATUS[v][1]}{v === "PENDING" ? ` (${data?.filter((r) => r.center.status === "PENDING").length ?? 0})` : ""}</Chip>)}
        <Button className="ml-auto" icon={Plus} to="/admin/centers/new">Tạo trung tâm</Button>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.center.id} onRowClick={(r) => nav(`/admin/centers/${r.center.id}`)} columns={[
            { key: "n", header: "Trung tâm", render: (r) => <b>{r.center.name}</b> },
            { key: "d", header: "Quận", render: (r) => r.center.district },
            { key: "m", header: "Người quản lý", render: (r) => r.manager?.fullName },
            { key: "e", header: "Người cao tuổi", render: (r) => r.elderly || "—" },
            { key: "c", header: "Hợp đồng đến", render: (r) => dmy(r.center.contractEnd) },
            { key: "s", header: "Trạng thái", render: (r) => (r.center.contractEnd && r.center.contractEnd <= "2026-11-30" && r.center.status === "ACTIVE" ? <Badge tone="orange">Sắp hết hạn</Badge> : <Badge tone={CENTER_STATUS[r.center.status][0]}>{CENTER_STATUS[r.center.status][1]}</Badge>) },
            { key: "a", header: "", render: (r) => r.center.status === "PENDING" ? <Button size="sm" variant="success">Duyệt</Button> : null },
          ]} />
        )}
      </Card>
      <Note>Admin chỉ làm việc với trung tâm, không thu tiền gia đình và không xem dữ liệu cá nhân.</Note>
    </Page>
  );
}

// ------------------------------------------------------------------ AD-06
export function CenterDetailPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const pid = useParams().id;
  const id = pid && pid !== "new" ? Number(pid) : undefined;
  const { data, isLoading } = useQuery({ queryKey: ["a-center", id], queryFn: () => admin.center(id!), enabled: !!id });
  const [f, setF] = useState<Record<string, string>>({});
  const c = data?.center;
  const v = (k: string, d = "") => f[k] ?? d;
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useMutation({
    mutationFn: () => admin.saveCenter(me, { id, name: v("name", c?.name), address: v("address", c?.address), district: v("district", c?.district), phone: v("phone", c?.phone), email: v("email", c?.email), contractStart: v("cs", c?.contractStart ?? "2026-11-01"), contractEnd: v("ce", c?.contractEnd ?? "2027-10-31"), managerName: v("mn", data?.manager?.fullName), managerEmail: v("me", data?.manager?.email) }),
    onSuccess: (newId) => { qc.invalidateQueries(); nav(`/admin/centers/${newId}`); },
  });
  const status = useMutation({ mutationFn: (s: Center["status"]) => admin.setCenterStatus(me, id!, s), onSuccess: () => qc.invalidateQueries() });
  if (id && isLoading) return <Page title="Trung tâm" back="/admin/centers"><Loading /></Page>;
  const st = c ? CENTER_STATUS[c.status] : (["purple", "Mới"] as [Tone, string]);
  return (
    <Page title={id ? `Chi tiết trung tâm · ${c?.name}` : "Tạo trung tâm mới"} back="/admin/centers">
      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        <Card title="Thông tin trung tâm" actions={<Badge tone={st[0]}>{st[1]}</Badge>}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên trung tâm" className="sm:col-span-2" defaultValue={c?.name} onChange={set("name")} />
            <Field label="Địa chỉ" defaultValue={c?.address} onChange={set("address")} />
            <Field label="Quận / huyện" defaultValue={c?.district} onChange={set("district")} />
            <Field label="Số điện thoại" defaultValue={c?.phone} onChange={set("phone")} />
            <Field label="Email" defaultValue={c?.email} onChange={set("email")} />
          </div>
          <div className="mt-3 mb-1.5 text-[12.5px] font-semibold text-navy">Quản lý trung tâm</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Họ tên" defaultValue={data?.manager?.fullName} onChange={set("mn")} />
            <Field label="Email đăng nhập" defaultValue={data?.manager?.email} onChange={set("me")} />
          </div>
          <div className="mt-3 mb-1.5 text-[12.5px] font-semibold text-navy">Hợp đồng nền tảng</div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Bắt đầu" type="date" defaultValue={c?.contractStart ?? "2026-11-01"} onChange={set("cs")} />
            <Field label="Kết thúc" type="date" defaultValue={c?.contractEnd ?? "2027-10-31"} onChange={set("ce")} />
          </div>
          <ErrorText error={save.error} />
          <Button className="mt-3" loading={save.isPending} onClick={() => save.mutate()}>{id ? "Lưu thông tin" : "Tạo trung tâm & mời quản lý"}</Button>
        </Card>
        {id && c && (
          <Card title="Duyệt & kích hoạt" className="h-fit">
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-center gap-2"><CircleCheck size={14} className="text-green" />Giấy phép hoạt động</li>
              <li className="flex items-center gap-2"><CircleCheck size={14} className="text-green" />Thông tin quản lý trung tâm</li>
              <li className="flex items-center gap-2">{data?.settings?.vnpayConnected ? <CircleCheck size={14} className="text-green" /> : <CircleAlert size={14} className="text-amber-ink" />}Merchant VNPay của trung tâm</li>
              <li className="flex items-center gap-2"><CircleAlert size={14} className="text-amber-ink" />MoMo (không bắt buộc)</li>
            </ul>
            <Note className="mt-3">Admin không thu tiền của gia đình; tiền vào tài khoản merchant của trung tâm.</Note>
            <div className="mt-3 flex flex-col gap-2">
              {c.status !== "ACTIVE" && <Button variant="success" icon={CircleCheck} loading={status.isPending} onClick={() => status.mutate("ACTIVE")}>{c.status === "PENDING" ? "Duyệt & kích hoạt" : "Mở khoá"}</Button>}
              {c.status === "ACTIVE" && <Button variant="neutral" icon={Lock} onClick={() => status.mutate("SUSPENDED")}>Tạm khoá</Button>}
              {c.status === "PENDING" && <Button variant="danger" onClick={() => { status.mutate("SUSPENDED"); }}>Từ chối</Button>}
              <Button variant="outline" icon={Send} to={`/admin/messages?to=${data?.manager?.id}`}>Nhắn quản lý</Button>
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ AD-03
export function AccountsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["a-managers"], queryFn: () => admin.managers() });
  const lock = useMutation({ mutationFn: ({ id, s }: { id: number; s: "ACTIVE" | "LOCKED" }) => admin.setUserStatus(me, id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["a-managers"] }) });
  const reset = useMutation({ mutationFn: (id: number) => admin.resetPassword(me, id), onSuccess: () => setMsg("Đã gửi email đặt lại mật khẩu.") });
  const rows = (data ?? []).filter((r) => `${r.user.fullName} ${r.user.email}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page title="Tài khoản Center Manager">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-64 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5"><Search size={14} className="text-subtle" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, email" className="min-w-0 flex-1 text-[12.5px] outline-none" /></label>
        <Button className="ml-auto" icon={Plus} to="/admin/centers/new">Cấp tài khoản (qua tạo trung tâm)</Button>
      </div>
      {msg && <Note tone="green">{msg}</Note>}
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.user.id} columns={[
            { key: "n", header: "Người quản lý", render: (r) => <span className="flex items-center gap-2"><Avatar name={r.user.fullName} size={24} />{r.user.fullName}</span> },
            { key: "e", header: "Email", render: (r) => r.user.email },
            { key: "c", header: "Trung tâm", render: (r) => r.center?.name.replace("Day-Care ", "") },
            { key: "l", header: "Đăng nhập cuối", render: (r) => (r.user.lastLoginAt ? `${dm(r.user.lastLoginAt.slice(0, 10))} ${hm(r.user.lastLoginAt)}` : "—") },
            { key: "s", header: "Trạng thái", render: (r) => <Badge tone={r.user.status === "ACTIVE" ? "green" : r.user.status === "INVITED" ? "purple" : "red"}>{{ ACTIVE: "Hoạt động", INVITED: "Chờ kích hoạt", LOCKED: "Đã khoá" }[r.user.status]}</Badge> },
            { key: "a", header: "Thao tác", render: (r) => (
              <span className="flex gap-1.5">
                {r.user.status === "INVITED" ? <Button size="sm" onClick={() => reset.mutate(r.user.id)}>Gửi lại lời mời</Button> : <Button size="sm" variant="outline" onClick={() => reset.mutate(r.user.id)}>Đặt lại MK</Button>}
                {r.user.status === "LOCKED" ? <Button size="sm" variant="neutral" onClick={() => lock.mutate({ id: r.user.id, s: "ACTIVE" })}>Mở khoá</Button> : <Button size="sm" variant="danger" onClick={() => lock.mutate({ id: r.user.id, s: "LOCKED" })}>Khoá</Button>}
              </span>
            ) },
          ]} />
        )}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ AD-07
const ROLES: [Role, string, number][] = [["ADMIN", "Administrator", 1], ["MANAGER", "Center Manager", 14], ["STAFF", "Caregiver / Staff", 214], ["FAMILY", "Family Member", 980]];
export function RolesPage() {
  const [sel, setSel] = useState<Role>("MANAGER");
  return (
    <Page title="Vai trò & phân quyền">
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card title="Vai trò" className="h-fit">
          <div className="space-y-1.5">{ROLES.map(([r, l, n]) => <button key={r} onClick={() => setSel(r)} className={cn("flex w-full items-center justify-between rounded-[10px] border px-3 py-2 text-[12.5px]", sel === r ? "border-[1.5px] border-orange bg-orange-soft font-semibold" : "border-line")}>{l}<Badge tone="blue">{n} người</Badge></button>)}</div>
        </Card>
        <Card title="Ma trận quyền">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12.5px]">
              <thead><tr className="border-b-[1.5px] border-line text-[10.5px] text-subtle uppercase"><th className="py-2 text-left">Quyền</th>{ROLES.map(([r]) => <th key={r} className={cn(sel === r && "text-orange")}>{r === "ADMIN" ? "Admin" : r === "MANAGER" ? "Manager" : r === "STAFF" ? "Staff" : "Family"}</th>)}</tr></thead>
              <tbody>
                {ROLE_PERMISSIONS.map((p) => (
                  <tr key={p.label} className="border-b border-line-soft">
                    <td className="py-2">{p.label}</td>
                    {ROLES.map(([r]) => <td key={r} className={cn("text-center", sel === r && "bg-orange-soft/60")}>{p.roles.includes(r) ? <CircleCheck size={15} className="inline text-green" /> : <span className="text-faint">—</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Note className="mt-3">Ma trận quyền ánh xạ bảng roles / permissions / role_permissions. Dữ liệu cá nhân người cao tuổi chỉ hiển thị trong phạm vi trung tâm của người dùng.</Note>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ AD-04
export function AuditPage() {
  const [f, setF] = useState("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["a-audit"], queryFn: () => admin.auditLogs() });
  const match = (a: string, e: string) => f === "ALL" || (f === "LOGIN" && /Đăng nhập|đăng nhập/.test(a)) || (f === "PAY" && /hoàn tiền|hoá đơn/.test(a)) || (f === "ROLE" && e === "users") || (f === "CONF" && /centers|system/.test(e));
  const rows = (data ?? []).filter((r) => match(r.log.action, r.log.entityName));
  const exportCsv = () => {
    const csv = "Thời gian,Người dùng,Hành động,Bảng,IP\n" + rows.map((r) => `${r.log.createdAt},${r.user?.email ?? "Hệ thống"},${r.log.action},${r.log.entityName},${r.log.ipAddress}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = "audit-log.csv";
    a.click();
  };
  return (
    <Page title="Nhật ký hệ thống">
      <div className="flex flex-wrap items-center gap-2">
        {[["ALL", "Tất cả"], ["LOGIN", "Đăng nhập"], ["ROLE", "Tài khoản"], ["PAY", "Thanh toán"], ["CONF", "Cấu hình"]].map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}
        <Button className="ml-auto" variant="outline" icon={Download} onClick={exportCsv}>Xuất CSV</Button>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.log.id} columns={[
            { key: "t", header: "Thời gian", render: (r) => `${dm(r.log.createdAt.slice(0, 10))} ${hm(r.log.createdAt)}` },
            { key: "u", header: "Người dùng", render: (r) => r.user?.email ?? (r.log.action.includes("thất bại") ? "unknown" : "Hệ thống") },
            { key: "r", header: "Vai trò", render: (r) => <Badge tone={r.user?.role === "ADMIN" ? "purple" : r.user ? "teal" : "gray"}>{r.user?.role === "ADMIN" ? "Admin" : r.user?.role === "MANAGER" ? "Manager" : r.user ? r.user.role : "System"}</Badge> },
            { key: "a", header: "Hành động", render: (r) => r.log.action },
            { key: "e", header: "Bảng", render: (r) => <code className="text-[11px] text-muted">{r.log.entityName}</code> },
            { key: "i", header: "IP", render: (r) => r.log.ipAddress },
          ]} />
        )}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ AD-08
export function SystemSettingsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["a-sys"], queryFn: () => admin.systemSettings() });
  const [s, setS] = useState<Partial<NonNullable<typeof data>>>({});
  const save = useMutation({ mutationFn: () => admin.saveSystemSettings(me, s), onSuccess: () => { setS({}); qc.invalidateQueries({ queryKey: ["a-sys"] }); } });
  if (!data) return <Page title="Cấu hình hệ thống"><Loading /></Page>;
  const v = { ...data, ...s };
  return (
    <Page title="Cấu hình hệ thống" actions={<Button className="ml-auto" icon={CircleCheck} loading={save.isPending} onClick={() => save.mutate()}>Lưu cấu hình</Button>}>
      {save.isSuccess && <Note tone="green">Đã lưu cấu hình.</Note>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cổng thanh toán">
          <div className="grid gap-2 sm:grid-cols-2">
            <SelectField label="VNPay" value={v.vnpayMode} onChange={(e) => setS({ ...s, vnpayMode: e.target.value as "SANDBOX" })}><option value="PRODUCTION">Production</option><option value="SANDBOX">Sandbox</option></SelectField>
            <SelectField label="MoMo" value={v.momoMode} onChange={(e) => setS({ ...s, momoMode: e.target.value as "SANDBOX" })}><option value="PRODUCTION">Production</option><option value="SANDBOX">Sandbox</option></SelectField>
          </div>
          <KV label="Callback URL" w={100}>api.antamcare.vn/pay/callback</KV>
          <Note className="mt-2">Tiền vào thẳng tài khoản merchant của từng trung tâm; nền tảng không giữ tiền.</Note>
        </Card>
        <Card title="LLM API · trợ lý AI" actions={<Badge tone="green">Hoạt động</Badge>}>
          <KV label="Nhà cung cấp" w={110}>LLM API (bên ngoài)</KV>
          <Field label="Giới hạn token / trung tâm / ngày" type="number" value={v.llmDailyTokenLimit} onChange={(e) => setS({ ...s, llmDailyTokenLimit: Number(e.target.value) })} />
          <div className="mt-2"><Toggle checked={v.llmMaskPersonalData} onChange={(x) => setS({ ...s, llmMaskPersonalData: x })} label="Ẩn dữ liệu cá nhân khi gửi LLM" sub="Không gửi tên, SĐT, ghi chú sức khoẻ" /></div>
        </Card>
        <Card title="Bảo mật">
          <Field label="Hết phiên sau (phút)" type="number" value={v.sessionTimeoutMinutes} onChange={(e) => setS({ ...s, sessionTimeoutMinutes: Number(e.target.value) })} />
          <KV label="Mật khẩu" w={100}>Tối thiểu 8 ký tự, có chữ và số</KV>
          <Toggle checked={v.lockAfterFailedLogins} onChange={(x) => setS({ ...s, lockAfterFailedLogins: x })} label="Khoá tài khoản sau 5 lần sai" />
        </Card>
        <Card title="Thông báo">
          <div className="space-y-2">
            <Toggle checked={v.emailEnabled} onChange={(x) => setS({ ...s, emailEnabled: x })} label="Email (SMTP)" sub="noreply@antamcare.vn" />
            <Toggle checked={v.pushEnabled} onChange={(x) => setS({ ...s, pushEnabled: x })} label="Push notification (mobile)" />
          </div>
        </Card>
      </div>
    </Page>
  );
}
