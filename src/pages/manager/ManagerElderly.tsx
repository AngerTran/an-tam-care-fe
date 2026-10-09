// Manager · elderly: profiles, registration & assessment approval (5.1, 4.12), waitlist (4.7),
// absences (5.3), pause / termination (5.8, 5.9).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, CalendarClock, CircleCheck, Hourglass, MessageCircle, Pencil, QrCode, Send, Stethoscope, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { manager, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { AttBadge, ElderlyCell, GroupBadge, LineChart, SearchBox, SubBadge, TierBadge } from "../../components/domain";
import { Badge, Button, Card, Chip, EmptyState, ErrorText, Field, KV, Loading, Modal, Note, Photo, SelectField, Table, Tabs, TextArea, cn } from "../../components/ui";
import { CYCLE_LABEL, DISEASE_GROUPS, GROUP_INFO, GROUP_LABEL, GROUPS, minTierFor, NOT_ACCEPTED, TIER_LABEL, TIERS, tierRank, weekdaysLabel } from "../../domain/catalog";
import { age, daysBetween, dm, dmy, hm, vnd, weekday } from "../../lib/format";
import type { TargetGroup, Tier } from "../../types/models";
import { LEVEL, INC_TYPE, SEVERITY } from "./ManagerOps";

// ------------------------------------------------------------------ list
export function MembersPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [f, setF] = useState<"ALL" | "ACTIVE" | "PAUSED" | "SUSPENDED" | "TERMINATED">("ACTIVE");
  const [g, setG] = useState<TargetGroup | "ALL">("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["m-members"], queryFn: () => manager.members() });
  const rows = (data ?? []).filter((r) => (f === "ALL" || r.elderly.status === f) && (g === "ALL" || r.elderly.targetGroup === g) && (!q || `${r.elderly.fullName} ${r.family?.fullName}`.toLowerCase().includes(q.toLowerCase())));
  const count = (s: string) => data?.filter((r) => r.elderly.status === s).length ?? 0;
  return (
    <Page title="Hồ sơ cụ" sub="Cụ đang đi, bảo lưu, tạm ngưng và đã chấm dứt. Cụ mới đăng ký nằm ở mục Đăng ký & đánh giá.">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={setQ} placeholder="Tìm theo tên cụ, gia đình…" />
        {([["ACTIVE", `Đang đi (${count("ACTIVE")})`], ["PAUSED", `Bảo lưu (${count("PAUSED")})`], ["SUSPENDED", `Tạm ngưng (${count("SUSPENDED")})`], ["TERMINATED", "Đã chấm dứt"], ["ALL", "Tất cả"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}
        <SelectField value={g} onChange={(e) => setG(e.target.value as TargetGroup)} className="ml-auto w-48"><option value="ALL">Mọi nhóm</option>{GROUPS.map((x) => <option key={x} value={x}>{GROUP_LABEL[x]}</option>)}</SelectField>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.elderly.id} onRowClick={(r) => nav(`/manager/members/${r.elderly.id}`)} empty={<EmptyState icon={Users} title="Không có cụ phù hợp bộ lọc" />} columns={[
            { key: "n", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "g", header: "Nhóm", render: (r) => <GroupBadge group={r.elderly.targetGroup} /> },
            { key: "p", header: "Gói", render: (r) => r.sub ? <span className="text-[12px]"><TierBadge tier={r.sub.tier} /> <span className="text-muted">{CYCLE_LABEL[r.sub.cycle]}{r.sub.weekdays ? ` (${weekdaysLabel(r.sub.weekdays)})` : ""}</span></span> : "—" },
            { key: "e", header: "Hết hạn", render: (r) => r.sub ? <span className={cn(daysBetween(TODAY, r.sub.endDate) <= 7 && r.sub.status === "ACTIVE" && "font-semibold text-amber-ink")}>{dmy(r.sub.endDate)}</span> : "—" },
            { key: "s", header: "Gói", render: (r) => <SubBadge status={r.sub?.status} /> },
            { key: "a", header: "Hôm nay", render: (r) => <AttBadge a={r.att} /> },
            { key: "c", header: "Phụ trách", render: (r) => <span className="text-[11.5px]">{r.nurse?.fullName ?? "—"}<span className="block text-subtle">{r.caregiver?.fullName ?? "—"}</span></span> },
            { key: "f", header: "Gia đình", render: (r) => r.family?.fullName },
          ]} />
        )}
      </Card>
    </Page>
  );
}

// ------------------------------------------------------------------ detail
type DTab = "overview" | "package" | "health" | "assess" | "attendance" | "carelog" | "belongings";
export function MemberDetailPage() {
  const id = Number(useParams().id);
  const [tab, setTab] = useState<DTab>("overview");
  const { data, isLoading, error } = useQuery({ queryKey: ["m-member", id], queryFn: () => manager.member(id) });
  if (isLoading) return <Page title="Hồ sơ cụ" back="/manager/members"><Loading /></Page>;
  if (!data) return <Page title="Hồ sơ cụ" back="/manager/members"><ErrorText error={error} /></Page>;
  const e = data.elderly;
  const s = data.sub;
  return (
    <Page title={`${e.gender === "Nữ" ? "Bà" : "Ông"} ${e.fullName}`} sub={`${age(e.dateOfBirth)} tuổi · ${e.gender} · mã ${e.qrCode}`} back="/manager/members" actions={<><Button size="sm" variant="outline" icon={Pencil} to={`/manager/members/${id}/edit`}>Sửa hồ sơ & phân công</Button><Button size="sm" variant="neutral" icon={QrCode}>In thẻ QR</Button></>}>
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <ElderlyCell e={e} size={48} sub={e.address} />
          <GroupBadge group={e.targetGroup} /><TierBadge tier={s?.tier} /><SubBadge status={s?.status} />
          {data.waitlist.map((w) => <Badge key={w.id} tone="gray">Chờ hạng {TIER_LABEL[w.tier]}</Badge>)}
          <span className="ml-auto text-right text-[12px]"><span className="block text-subtle">Hôm nay</span><AttBadge a={data.att} /></span>
        </div>
      </Card>
      <Tabs value={tab} onChange={setTab} items={[{ value: "overview", label: "Tổng quan" }, { value: "package", label: "Gói & quyền lợi" }, { value: "health", label: "Sức khỏe & thuốc" }, { value: "assess", label: "Đánh giá" }, { value: "attendance", label: "Điểm danh" }, { value: "carelog", label: "Care log" }, { value: "belongings", label: "Đồ gửi" }]} />
      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Thông tin & chăm sóc">
            <KV label="Ngày sinh">{dmy(e.dateOfBirth)}</KV>
            <KV label="Bệnh nền">{e.conditions.join(", ") || "Không"}</KV>
            <KV label="Dị ứng">{e.allergies.join(", ") || "Không"}</KV>
            <KV label="Chế độ ăn">{e.diet || "—"}</KV>
            <KV label="Sở thích">{e.hobbies || "—"}</KV>
            <KV label="Ghi chú">{e.careNote || "—"}</KV>
            <KV label="Gia đình khai">{GROUP_LABEL[e.declaredGroup]}</KV>
            {e.targetGroup && <Note className="mt-2">{GROUP_INFO[e.targetGroup].who} Theo dõi: {GROUP_INFO[e.targetGroup].watch}.</Note>}
          </Card>
          <div className="space-y-4">
            <Card title="Phụ trách">
              <KV label="Điều dưỡng">{data.nurse?.fullName ?? <Badge tone="red">Chưa phân công</Badge>}</KV>
              <KV label="Hộ lý (chốt care log)">{data.caregiver?.fullName ?? <Badge tone="red">Chưa phân công</Badge>}</KV>
              <KV label="Giường nghỉ trưa">{data.bed ? `${data.bed.code}${data.fixed ? " (cố định)" : " (hôm nay)"}` : "—"}</KV>
            </Card>
            <Card title={`Người được phép đón (${data.pickups.length})`}>
              {data.pickups.map((p) => <KV key={p.id} label={p.isPrimary ? "Liên hệ chính" : p.relationship} w={110}>{p.fullName} · {p.phone} · CCCD …{p.idLast4}</KV>)}
              <Note className="mt-2">Gia đình tự khai danh sách trên app. Staff đối chiếu ảnh và 4 số cuối CCCD khi giao cụ (BR-30).</Note>
            </Card>
            <Card title="Gia đình">
              <KV label="Tài khoản">{data.family?.fullName} · {data.family?.email}</KV>
              <KV label="Điện thoại">{data.family?.phone}</KV>
            </Card>
          </div>
        </div>
      )}
      {tab === "package" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Card title="Gói hiện tại" actions={s && <SubBadge status={s.status} />}>
              {s ? (
                <>
                  <KV label="Gói">{CYCLE_LABEL[s.cycle]} · {TIER_LABEL[s.tier]}{s.weekdays ? ` · ${weekdaysLabel(s.weekdays)}` : ""}</KV>
                  {s.dayDates && <KV label="Ngày đã đặt">{s.dayDates.map(dm).join(", ")}</KV>}
                  <KV label="Thời hạn">{dmy(s.startDate)} – {dmy(s.endDate)}{s.pausedUntil ? ` · bảo lưu tới ${dmy(s.pausedUntil)}` : ""}</KV>
                  <KV label="Giá gói">{vnd(s.basePrice)}</KV>
                  <KV label="Phụ phí thỏa thuận">{vnd(s.surchargeAmount)}{s.surchargeNote ? ` · ${s.surchargeNote}` : ""}</KV>
                  <KV label="Gia đình xác nhận">{s.familyConfirmedAt ? `${dmy(s.familyConfirmedAt.slice(0, 10))} ${hm(s.familyConfirmedAt)}` : "Chưa"}</KV>
                </>
              ) : <div className="text-subtle">Chưa có gói</div>}
            </Card>
            <Card title={`Hoạt động tự chọn đã tích (${data.choices.length})`}>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {data.choices.map((c) => {
                  const p = data.permissions.find((x) => x.serviceId === c.id);
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-2.5 py-1.5 text-[12px]">
                      <span>{c.name}<span className="block text-[11px] text-subtle">{s ? c.quota[s.tier] : ""}</span></span>
                      {c.needsNurseOk && (p ? <Badge tone={p.allowed ? "green" : "red"}>{p.allowed ? "ĐD cho phép" : "ĐD không cho"}</Badge> : <Badge tone="orange">⚠ chờ ĐD</Badge>)}
                    </div>
                  );
                })}
              </div>
            </Card>
            <Card title="Dịch vụ mua thêm">
              {data.addOns.length ? data.addOns.map((a) => <KV key={a.id} label={a.service?.name} w={240}>{a.quantity} × · {vnd(a.price)}</KV>) : <div className="text-[12.5px] text-subtle">Không có</div>}
            </Card>
          </div>
          <div className="space-y-4">
            <Card title="Lịch sử gói">
              {data.subs.map((x) => <div key={x.id} className="border-b border-line-soft py-1.5 text-[12px] last:border-0"><div className="flex items-center justify-between"><b className="text-navy">{CYCLE_LABEL[x.cycle]} · {TIER_LABEL[x.tier]}</b><SubBadge status={x.status} /></div><span className="text-subtle">{dmy(x.startDate)} – {dmy(x.endDate)}</span></div>)}
            </Card>
            <Card title="Hóa đơn">
              {data.invoices.map((i) => <Link key={i.id} to={`/manager/invoices/${i.id}`} className="flex items-center justify-between border-b border-line-soft py-1.5 text-[12px] last:border-0 hover:text-orange"><span>{i.number}<span className="block text-subtle">{dmy(i.issueDate)}</span></span><span className="text-right">{vnd(i.total)}<span className="block"><Badge tone={i.status === "PAID" ? "green" : i.status === "UNPAID" ? "orange" : "gray"}>{({ PAID: "Đã thu", UNPAID: "Chưa thu", REFUNDED: "Đã hoàn", VOID: "Hủy" })[i.status]}</Badge></span></span></Link>)}
            </Card>
            {data.compensations.length > 0 && <Card title="Bù quyền lợi (4.8)">{data.compensations.map((c) => <div key={c.id} className="text-[12px]"><b>{dm(c.date)}</b> · {c.reason} → {c.form}</div>)}</Card>}
          </div>
        </div>
      )}
      {tab === "health" && (
        <div className="space-y-4">
          <Card title="Huyết áp 20 lần đo gần nhất">
            <LineChart labels={[...data.metrics].reverse().filter((m) => m.sys).map((m) => dm(m.at.slice(0, 10)))} series={[{ name: "Tâm thu", color: "#e05a5a", values: [...data.metrics].reverse().filter((m) => m.sys).map((m) => m.sys) }, { name: "Tâm trương", color: "#3e6398", values: [...data.metrics].reverse().filter((m) => m.sys).map((m) => m.dia) }]} bands={[{ from: 150, to: 200, label: "Vượt ngưỡng tâm thu 150" }]} />
          </Card>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Thuốc gia đình gửi">{data.meds.map((m) => <div key={m.id} className={cn("border-b border-line-soft py-1.5 text-[12px] last:border-0", !m.active && "text-faint line-through")}><b>{m.name}</b> {m.dose} · {m.times.join(", ")}<span className="block text-subtle">{m.note}</span></div>)}</Card>
            <Card title="Cảnh báo">{data.alerts.length ? data.alerts.map((a) => <div key={a.id} className="py-1 text-[12px]"><Badge tone={LEVEL[a.level][0]}>{LEVEL[a.level][1]}</Badge> {dm(a.at.slice(0, 10))} · {a.title}</div>) : <div className="text-[12px] text-subtle">Không có</div>}</Card>
            <Card title="Sự cố">{data.incidents.length ? data.incidents.map((i) => <div key={i.id} className="py-1 text-[12px]"><Badge tone={SEVERITY[i.severity][0]}>{INC_TYPE[i.type]}</Badge> {dm(i.at.slice(0, 10))} · {i.description}</div>) : <div className="text-[12px] text-subtle">Không có</div>}</Card>
          </div>
        </div>
      )}
      {tab === "assess" && (
        <Card title="Đánh giá đầu vào và định kỳ">
          <Table rows={data.assessments} rowKey={(a) => a.id} columns={[
            { key: "k", header: "Loại", render: (a) => a.kind === "INITIAL" ? "Đầu vào" : "Định kỳ" },
            { key: "d", header: "Lịch", render: (a) => `${dmy(a.scheduledAt.slice(0, 10))} ${hm(a.scheduledAt)}` },
            { key: "n", header: "Điều dưỡng", render: (a) => a.nurse?.fullName },
            { key: "b", header: "Barthel", render: (a) => a.barthel ?? "—" },
            { key: "g", header: "Đề xuất", render: (a) => a.proposedGroup ? <GroupBadge group={a.proposedGroup} /> : "—" },
            { key: "o", header: "Nền", render: (a) => <span className="text-[11.5px]">{a.baseline ?? "—"}</span> },
            { key: "s", header: "Trạng thái", render: (a) => <Badge tone={a.status === "APPROVED" ? "green" : a.status === "DONE" ? "orange" : "blue"}>{({ SCHEDULED: "Đã hẹn", DONE: "Chờ Quản lý duyệt", APPROVED: "Đã duyệt" })[a.status]}</Badge> },
          ]} />
          {e.targetGroup && <Note className="mt-3">Nhóm {GROUP_LABEL[e.targetGroup]} đánh giá lại mỗi {GROUP_INFO[e.targetGroup].reassessMonths === 1 ? "tháng" : "3 tháng"} (BR-12). Mức đổi thì giá đổi từ kỳ sau.</Note>}
        </Card>
      )}
      {tab === "attendance" && (
        <Card title="Điểm danh 14 ngày">
          <div className="grid grid-cols-7 gap-2">
            {data.attendance.map(({ date, a, scheduled }) => (
              <div key={date} className="rounded-lg bg-canvas p-2 text-center">
                <div className="text-[10.5px] font-semibold text-subtle">{weekday(date)} {dm(date)}</div>
                <div className="mt-1">{a ? <AttBadge a={a} /> : scheduled ? <Badge tone="orange">Có lịch</Badge> : <Badge tone="gray">Không lịch</Badge>}</div>
                {a?.checkIn && <div className="mt-0.5 text-[10px] text-subtle">{a.checkIn}–{a.checkOut ?? "…"}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}
      {tab === "carelog" && (
        <Card title="Care log 7 ngày gần nhất">
          {data.careDays.map((c) => <Link key={c.date} to={`/manager/care-logs/${id}/${c.date}`} className="flex items-center justify-between border-b border-line-soft py-2 text-[12.5px] last:border-0 hover:text-orange"><span>{weekday(c.date)} {dmy(c.date)}</span>{c.status === "CLOSED" ? <Badge tone="green">Đã chốt</Badge> : <Badge tone="orange">Đang mở</Badge>}</Link>)}
        </Card>
      )}
      {tab === "belongings" && (
        <Card title="Đồ cá nhân gửi lại (4.10)">
          <div className="grid gap-3 sm:grid-cols-3">
            {data.belongings.map((b) => <div key={b.id} className="rounded-xl border border-line p-2"><Photo tone={b.tone} /><div className="mt-1.5 text-[12.5px] font-semibold text-navy">{b.item}</div><div className="text-[11px] text-subtle">Nhận {dm(b.receivedAt.slice(0, 10))} {hm(b.receivedAt)}{b.returnedAt ? ` · đã trả ${dm(b.returnedAt.slice(0, 10))}` : " · đang giữ"}</div></div>)}
          </div>
        </Card>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ edit (profile + assignment)
export function MemberEditPage() {
  const me = useMe();
  const id = Number(useParams().id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["m-member", id], queryFn: () => manager.member(id) });
  const staff = useQuery({ queryKey: ["m-staff-opts"], queryFn: () => manager.staffOptions() });
  const [f, setF] = useState<Record<string, string>>({});
  const e = data?.elderly;
  const v = (k: string, d = "") => f[k] ?? d;
  const set = (k: string) => (ev: { target: { value: string } }) => setF((s) => ({ ...s, [k]: ev.target.value }));
  const save = useMutation({
    mutationFn: () => manager.saveMember(me, id, {
      fullName: v("fullName", e?.fullName), address: v("address", e?.address), diet: v("diet", e?.diet), hobbies: v("hobbies", e?.hobbies), careNote: v("careNote", e?.careNote),
      conditions: v("conditions", e?.conditions.join(", ")).split(",").map((x) => x.trim()).filter(Boolean), allergies: v("allergies", e?.allergies.join(", ")).split(",").map((x) => x.trim()).filter(Boolean),
      caregiverId: Number(v("cg", String(e?.caregiverId ?? ""))) || undefined, nurseId: Number(v("nu", String(e?.nurseId ?? ""))) || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries(); nav(`/manager/members/${id}`); },
  });
  if (!e) return <Page title="Sửa hồ sơ"><Loading /></Page>;
  return (
    <Page title={`Sửa hồ sơ · ${e.fullName}`} back={`/manager/members/${id}`}>
      <form className="grid gap-4 lg:grid-cols-[1fr_320px]" onSubmit={(ev) => { ev.preventDefault(); save.mutate(); }}>
        <Card title="Thông tin chăm sóc">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Họ và tên" defaultValue={e.fullName} onChange={set("fullName")} />
            <Field label="Địa chỉ" defaultValue={e.address} onChange={set("address")} />
            <Field label="Bệnh nền (phẩy)" defaultValue={e.conditions.join(", ")} onChange={set("conditions")} />
            <Field label="Dị ứng (phẩy)" defaultValue={e.allergies.join(", ")} onChange={set("allergies")} />
            <Field label="Chế độ ăn" defaultValue={e.diet} onChange={set("diet")} />
            <Field label="Sở thích" defaultValue={e.hobbies} onChange={set("hobbies")} />
            <TextArea label="Ghi chú chăm sóc" className="sm:col-span-2" defaultValue={e.careNote} onChange={set("careNote")} />
          </div>
          <Note className="mt-3">Nhóm đối tượng chỉ đổi qua đánh giá định kỳ (BR-10, BR-12). Gia đình không tự đổi sau khi đã đánh giá.</Note>
        </Card>
        <Card title="Phân công" className="h-fit">
          <div className="space-y-2">
            <SelectField label="Điều dưỡng phụ trách" defaultValue={e.nurseId ?? ""} onChange={set("nu")}>
              <option value="">— Chưa phân công —</option>
              {staff.data?.filter((s) => s.position === "NURSE").map((s) => <option key={s.user.id} value={s.user.id}>{s.user.fullName}</option>)}
            </SelectField>
            <SelectField label="Hộ lý phụ trách chính" defaultValue={e.caregiverId ?? ""} onChange={set("cg")}>
              <option value="">— Chưa phân công —</option>
              {staff.data?.filter((s) => s.position === "CAREGIVER").map((s) => <option key={s.user.id} value={s.user.id}>{s.user.fullName}</option>)}
            </SelectField>
            <Note>Staff chỉ thấy cụ được giao (BR-33) và chỉ nhắn với gia đình các cụ đó (BR-40).</Note>
            <ErrorText error={save.error} />
            <Button type="submit" block loading={save.isPending}>Lưu</Button>
          </div>
        </Card>
      </form>
    </Page>
  );
}

// ------------------------------------------------------------------ registrations & assessment approval
const STAGE: Record<string, [string, "orange" | "blue" | "teal" | "green" | "red" | "gray"]> = {
  ASSESS: ["Chờ đánh giá", "blue"], APPROVE: ["Chờ chốt nhóm & phụ phí", "orange"], CONFIRM: ["Chờ gia đình xác nhận giá", "teal"], PAY: ["Chờ thanh toán", "teal"], DONE: ["Đã hiệu lực", "green"], REJECTED: ["Không tiếp nhận", "red"],
};
export function RegistrationsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") ?? "pipeline";
  const [stage, setStage] = useState<"OPEN" | "ASSESS" | "APPROVE" | "PAY" | "DONE">("OPEN");
  const [sel, setSel] = useState<number>();
  const { data, isLoading } = useQuery({ queryKey: ["m-regs"], queryFn: () => manager.registrations() });
  const rows = (data?.rows ?? []).filter((r) => stage === "OPEN" ? ["ASSESS", "APPROVE", "CONFIRM", "PAY"].includes(r.stage) : stage === "PAY" ? ["CONFIRM", "PAY"].includes(r.stage) : stage === "DONE" ? ["DONE", "REJECTED"].includes(r.stage) : r.stage === stage);
  const cur = rows.find((r) => r.sub.id === sel) ?? rows[0];
  const visit = useMutation({ mutationFn: ({ id, s }: { id: number; s: "CONFIRMED" | "DONE" }) => manager.setVisit(me, id, s), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-regs"] }) });
  const n = (s: string[]) => data?.rows.filter((r) => s.includes(r.stage)).length ?? 0;
  return (
    <Page title="Đăng ký & đánh giá" sub="Luồng 5.1: gia đình đăng ký → điều dưỡng đánh giá → Quản lý chốt nhóm & phụ phí → gia đình xác nhận và thanh toán">
      <Tabs value={tab} onChange={(v) => setSp({ tab: v })} items={[{ value: "pipeline", label: "Đăng ký gói" }, { value: "visits", label: `Lịch tham quan (${data?.visits.filter((v) => v.status === "NEW").length ?? 0} mới)` }]} />
      {tab === "visits" ? (
        <Card>
          <Table rows={data?.visits ?? []} rowKey={(v) => v.id} columns={[
            { key: "n", header: "Người liên hệ", render: (v) => <span><b className="text-navy">{v.fullName}</b><span className="block text-[11px] text-subtle">{v.phone}</span></span> },
            { key: "d", header: "Lịch", render: (v) => `${weekday(v.date)} ${dmy(v.date)} · ${v.time}` },
            { key: "o", header: "Ghi chú", render: (v) => v.note },
            { key: "s", header: "Trạng thái", render: (v) => <Badge tone={v.status === "NEW" ? "orange" : v.status === "CONFIRMED" ? "blue" : "green"}>{({ NEW: "Mới", CONFIRMED: "Đã gọi xác nhận", DONE: "Đã tham quan" })[v.status]}</Badge> },
            { key: "x", header: "", render: (v) => v.status === "NEW" ? <Button size="sm" variant="outline" onClick={() => visit.mutate({ id: v.id, s: "CONFIRMED" })}>Đã gọi xác nhận</Button> : v.status === "CONFIRMED" ? <Button size="sm" variant="neutral" onClick={() => visit.mutate({ id: v.id, s: "DONE" })}>Đã tham quan</Button> : null },
          ]} />
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {([["OPEN", `Đang xử lý (${n(["ASSESS", "APPROVE", "CONFIRM", "PAY"])})`], ["ASSESS", `Chờ đánh giá (${n(["ASSESS"])})`], ["APPROVE", `Chờ chốt (${n(["APPROVE"])})`], ["PAY", `Chờ xác nhận & thanh toán (${n(["CONFIRM", "PAY"])})`], ["DONE", "Đã xong / không nhận"]] as const).map(([v, l]) => <Chip key={v} active={stage === v} onClick={() => setStage(v)}>{l}</Chip>)}
          </div>
          <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
            <Card bodyClass="space-y-2">
              {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState icon={CircleCheck} title="Không có đăng ký" /> : rows.map((r) => (
                <button key={r.sub.id} onClick={() => setSel(r.sub.id)} className={cn("w-full rounded-[10px] border px-3 py-2.5 text-left", cur?.sub.id === r.sub.id ? "border-[2px] border-orange" : "border-line hover:bg-canvas")}>
                  <ElderlyCell e={r.elderly} sub={`${CYCLE_LABEL[r.sub.cycle]} · ${TIER_LABEL[r.sub.tier]} · gửi ${dm(r.sub.createdAt.slice(0, 10))}`} />
                  <div className="mt-1.5"><Badge tone={STAGE[r.stage][1]}>{STAGE[r.stage][0]}</Badge></div>
                </button>
              ))}
            </Card>
            {cur ? <RegistrationDetail key={cur.sub.id} r={cur} capacity={data!.capacity} nurses={data!.nurses} /> : <Card><EmptyState icon={Users} title="Chọn một đăng ký" /></Card>}
          </div>
        </>
      )}
    </Page>
  );
}

type RegRow = Awaited<ReturnType<typeof manager.registrations>>["rows"][number];
type Cap = Awaited<ReturnType<typeof manager.registrations>>["capacity"];
function RegistrationDetail({ r, capacity, nurses }: { r: RegRow; capacity: Cap; nurses: { id: number; fullName: string }[] }) {
  const me = useMe();
  const qc = useQueryClient();
  const a = r.assessment;
  const [group, setGroup] = useState<TargetGroup>(a?.proposedGroup ?? r.elderly.declaredGroup);
  const needTier = minTierFor(group);
  const [tier, setTier] = useState<Tier>(tierRank(r.sub.tier) < tierRank(needTier) ? needTier : r.sub.tier);
  const [surcharge, setSurcharge] = useState(String(r.sub.surchargeAmount || (group === "MOBILE" ? 0 : 600000)));
  const [note, setNote] = useState(r.sub.surchargeNote ?? "");
  const [drop, setDrop] = useState<number[]>([]);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState(NOT_ACCEPTED[0]);
  const [at, setAt] = useState(a?.scheduledAt.slice(0, 16) ?? `${TODAY}T14:00`);
  const [nurseId, setNurseId] = useState(a?.nurseId ?? nurses[0]?.id);
  const inv = () => qc.invalidateQueries();
  const approve = useMutation({ mutationFn: () => manager.approveRegistration(me, r.sub.id, { group, tier, surcharge: Number(surcharge) || 0, note, dropServiceIds: drop }), onSuccess: inv });
  const rej = useMutation({ mutationFn: () => manager.rejectRegistration(me, r.sub.id, reason), onSuccess: () => { setReject(false); inv(); } });
  const sched = useMutation({ mutationFn: () => manager.scheduleAssessment(me, r.sub.id, `${at}:00`, Number(nurseId)), onSuccess: inv });
  const remind = useMutation({ mutationFn: () => manager.remindRenewal(me, r.sub.id) });
  const cap = capacity.find((c) => c.tier === tier)!;
  const upgraded = tier !== r.sub.tier;
  const disease = DISEASE_GROUPS.includes(group);
  return (
    <div className="space-y-4">
      <Card title={r.elderly.fullName} actions={<Badge tone={STAGE[r.stage][1]}>{STAGE[r.stage][0]}</Badge>}>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <div>
            <KV label="Tuổi">{age(r.elderly.dateOfBirth)} · {r.elderly.gender}</KV>
            <KV label="Bệnh nền">{r.elderly.conditions.join(", ") || "Không khai"}</KV>
            <KV label="Gia đình khai"><GroupBadge group={r.elderly.declaredGroup} /></KV>
            <KV label="Gia đình">{r.family?.fullName} · {r.family?.phone}</KV>
          </div>
          <div>
            <KV label="Thời hạn">{CYCLE_LABEL[r.sub.cycle]}{r.sub.weekdays ? ` (${weekdaysLabel(r.sub.weekdays)})` : ""}</KV>
            <KV label="Hạng chọn"><TierBadge tier={r.sub.tier} /></KV>
            <KV label="Bắt đầu">{r.sub.dayDates ? r.sub.dayDates.map(dm).join(", ") : dmy(r.sub.startDate)}</KV>
            <KV label="Hoạt động tích">{r.choices.map((c) => c.name).join(", ") || "—"}</KV>
          </div>
        </div>
      </Card>

      <Card title={<span className="flex items-center gap-2"><Stethoscope size={16} className="text-teal" />Đánh giá đầu vào</span>}>
        {!a || a.status === "SCHEDULED" ? (
          <div className="space-y-2">
            {a ? <Note>Đã hẹn {dmy(a.scheduledAt.slice(0, 10))} lúc {hm(a.scheduledAt)} với {a.nurse?.fullName}. Gia đình đã nhận thông báo.</Note> : <Note tone="red">Chưa có lịch đánh giá.</Note>}
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Ngày giờ đánh giá" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
              <SelectField label="Điều dưỡng" value={nurseId} onChange={(e) => setNurseId(Number(e.target.value))}>{nurses.map((n) => <option key={n.id} value={n.id}>{n.fullName}</option>)}</SelectField>
              <Button className="self-center" variant="outline" icon={CalendarClock} loading={sched.isPending} onClick={() => sched.mutate()}>{a ? "Đổi lịch" : "Đặt lịch"}</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-x-6 sm:grid-cols-2">
            <div>
              <KV label="Điều dưỡng">{a.nurse?.fullName} · {dmy(a.doneAt?.slice(0, 10))}</KV>
              <KV label="Điểm Barthel"><b className="text-[15px] text-navy">{a.barthel}</b>/100</KV>
              <KV label="Đề xuất nhóm"><GroupBadge group={a.proposedGroup} /></KV>
            </div>
            <div>
              <KV label="Chỉ số nền">{a.baseline}</KV>
              <KV label="Giấy tờ">{a.diagnosisDocs ?? "—"}</KV>
              <KV label="Nhận xét">{a.nurseNote}</KV>
            </div>
            {a.proposedGroup !== r.elderly.declaredGroup && <Note tone="red" className="sm:col-span-2">Đánh giá khác với gia đình khai ({GROUP_LABEL[r.elderly.declaredGroup]} → {GROUP_LABEL[a.proposedGroup!]}). Áp dụng quy tắc cuối mục 4.12: nhập phụ phí thỏa thuận, nâng hạng nếu cần, bỏ dịch vụ không phù hợp, gửi gia đình xác nhận.</Note>}
          </div>
        )}
      </Card>

      {r.stage === "APPROVE" && (
        <Card title="Chốt đối tượng, hạng và phụ phí">
          <div className="grid gap-2 sm:grid-cols-2">
            <SelectField label="Đối tượng (nhóm chính, BR-16)" value={group} onChange={(e) => { const g = e.target.value as TargetGroup; setGroup(g); if (tierRank(tier) < tierRank(minTierFor(g))) setTier(minTierFor(g)); setSurcharge(g === "MOBILE" ? "0" : surcharge === "0" ? "600000" : surcharge); }}>
              {GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
            </SelectField>
            <SelectField label="Hạng" value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
              {TIERS.map((t) => <option key={t} value={t} disabled={tierRank(t) < tierRank(needTier)}>{TIER_LABEL[t]}{tierRank(t) < tierRank(needTier) ? " (không áp dụng cho nhóm này)" : ""}</option>)}
            </SelectField>
            <Field label="Phụ phí thỏa thuận (đ/kỳ)" type="number" step={50000} value={surcharge} onChange={(e) => setSurcharge(e.target.value)} disabled={!disease} />
            <Field label="Lý do / nội dung phụ phí" value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: theo dõi đường huyết, nhắc thuốc 2 lần/ngày" />
          </div>
          {upgraded && <Note tone="orange" className="mt-2">Hạng {TIER_LABEL[r.sub.tier]} không áp dụng cho nhóm {GROUP_LABEL[group]} (BR-11) — tự nâng lên {TIER_LABEL[tier]}. Gia đình sẽ thấy giá mới khi xác nhận.</Note>}
          {r.choices.some((c) => c.needsNurseOk) && disease && (
            <div className="mt-3">
              <div className="mb-1 text-[12px] font-semibold text-navy">Bỏ dịch vụ ⚠ không phù hợp</div>
              <div className="flex flex-wrap gap-2">{r.choices.filter((c) => c.needsNurseOk).map((c) => <label key={c.id} className="flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 text-[12px]"><input type="checkbox" checked={drop.includes(c.id)} onChange={(e) => setDrop(e.target.checked ? [...drop, c.id] : drop.filter((x) => x !== c.id))} />{c.name}</label>)}</div>
            </div>
          )}
          <div className="mt-3 rounded-xl bg-canvas p-3 text-[12.5px]">
            <KV label="Sức chứa hạng" w={160}>{cap.held}/{cap.beds} chỗ {cap.full ? <Badge tone="red">Hết chỗ</Badge> : <Badge tone="green">Còn {cap.free}</Badge>}</KV>
            <KV label="Giá gói" w={160}>theo bảng giá hạng {TIER_LABEL[tier]}</KV>
            <KV label="Phụ phí" w={160}>{vnd(Number(surcharge) || 0)}</KV>
          </div>
          <ErrorText error={approve.error} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="success" icon={Send} loading={approve.isPending} disabled={r.sub.cycle !== "DAY" && cap.full} onClick={() => approve.mutate()}>Chốt & gửi gia đình xác nhận</Button>
            {cap.full && <Button variant="outline" icon={Hourglass} to="/manager/waitlist">Hạng đã đầy · danh sách chờ</Button>}
            <Button variant="danger" className="ml-auto" icon={Ban} onClick={() => setReject(true)}>Không tiếp nhận</Button>
          </div>
        </Card>
      )}

      {(r.stage === "CONFIRM" || r.stage === "PAY") && (
        <Card title="Chờ gia đình">
          <KV label="Nhóm · hạng" w={150}><GroupBadge group={r.sub.targetGroup} /> <TierBadge tier={r.sub.tier} /></KV>
          <KV label="Phụ phí" w={150}>{vnd(r.sub.surchargeAmount)} · {r.sub.surchargeNote}</KV>
          <KV label="Gia đình xác nhận giá" w={150}>{r.sub.familyConfirmedAt ? `${dmy(r.sub.familyConfirmedAt.slice(0, 10))} ${hm(r.sub.familyConfirmedAt)}` : <Badge tone="orange">Chưa xác nhận</Badge>}</KV>
          {r.invoice && <KV label="Hóa đơn" w={150}><Link className="text-orange" to={`/manager/invoices/${r.invoice.id}`}>{r.invoice.number}</Link> · {vnd(r.invoice.total)} · hạn {dmy(r.invoice.dueDate)}</KV>}
          {r.failed.length > 0 && <Note tone="red" className="mt-2">Có {r.failed.length} lần thanh toán thất bại ({r.failed.map((p) => `${p.method} ${dm(p.paidAt.slice(0, 10))}`).join(", ")}).</Note>}
          <div className="mt-3 flex gap-2"><Button variant="outline" icon={MessageCircle} loading={remind.isPending} onClick={() => remind.mutate()}>{remind.isSuccess ? "Đã nhắc" : "Nhắc gia đình"}</Button></div>
          <Note className="mt-3">Không thu đặt cọc. Khi cổng thanh toán báo thành công, gói tự chuyển "Đang hiệu lực" (BR-19, 5.1).</Note>
        </Card>
      )}
      {r.stage === "REJECTED" && <Note tone="red">Không tiếp nhận: {r.sub.surchargeNote}</Note>}
      {r.stage === "DONE" && <Note tone="green">Gói đang hiệu lực từ {dmy(r.sub.startDate)}. Nhớ phân công điều dưỡng và hộ lý ở hồ sơ cụ.</Note>}

      <Modal open={reject} onClose={() => setReject(false)} title="Không tiếp nhận" footer={<><Button variant="neutral" onClick={() => setReject(false)}>Hủy</Button><Button variant="danger" loading={rej.isPending} onClick={() => rej.mutate()}>Xác nhận</Button></>}>
        <SelectField label="Lý do (BR-18)" value={reason} onChange={(e) => setReason(e.target.value)}>{[...NOT_ACCEPTED, "Gia đình không đồng ý mức phụ phí"].map((x) => <option key={x}>{x}</option>)}</SelectField>
        <Note className="mt-2">Gia đình chưa thanh toán nên không phát sinh hoàn tiền.</Note>
      </Modal>
    </div>
  );
}

// ------------------------------------------------------------------ waitlist
export function WaitlistPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["m-wait"], queryFn: () => manager.waitlist() });
  const offer = useMutation({ mutationFn: (id: number) => manager.offerSeat(me, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-wait"] }) });
  const expire = useMutation({ mutationFn: (id: number) => manager.expireHold(me, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-wait"] }) });
  return (
    <Page title="Danh sách chờ" sub="Hạng cao trước, sau đó ai đăng ký trước. Có chỗ thì giữ 24 giờ để thanh toán; quá hạn chuyển người kế tiếp (BR-75).">
      <div className="grid gap-3 sm:grid-cols-3">
        {data?.capacity.map((c) => <Card key={c.tier}><div className="flex items-center justify-between"><TierBadge tier={c.tier} />{c.full ? <Badge tone="red">Hết chỗ</Badge> : <Badge tone="green">Còn {c.free}</Badge>}</div><div className="mt-1 text-[12px] text-muted">{c.held}/{c.beds} giường · {c.waiting} người chờ</div></Card>)}
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={data?.rows ?? []} rowKey={(r) => r.entry.id} empty="Không có ai trong danh sách chờ" columns={[
            { key: "p", header: "#", render: (r) => <b className="text-navy">{r.pos}</b> },
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "t", header: "Hạng chờ", render: (r) => <TierBadge tier={r.entry.tier} /> },
            { key: "r", header: "Lý do", render: (r) => ({ FULL: "Hạng đã đầy", UPGRADE: "Chờ nâng hạng", SECURE_ZONE: "Khu kiểm soát đầy" })[r.entry.reason] },
            { key: "d", header: "Đăng ký lúc", render: (r) => `${dmy(r.entry.requestedAt.slice(0, 10))} ${hm(r.entry.requestedAt)}` },
            { key: "f", header: "Gia đình", render: (r) => r.family?.fullName },
            { key: "s", header: "Trạng thái", render: (r) => r.entry.status === "HOLDING" ? <Badge tone="orange">Giữ chỗ tới {hm(r.entry.holdUntil)} {dm(r.entry.holdUntil?.slice(0, 10))}</Badge> : <Badge tone="gray">Đang chờ</Badge> },
            { key: "x", header: "", render: (r) => r.entry.status === "WAITING" ? <Button size="sm" variant="outline" disabled={data?.capacity.find((c) => c.tier === r.entry.tier)?.full} loading={offer.isPending} onClick={() => offer.mutate(r.entry.id)}>Giữ chỗ 24h</Button> : <Button size="sm" variant="danger" onClick={() => expire.mutate(r.entry.id)}>Hết hạn giữ</Button> },
          ]} />
        )}
        <ErrorText error={offer.error} />
      </Card>
      <Note>Không đẩy cụ hạng thấp ra để nhường chỗ (BR-74). Nâng hạng khi hạng cao hết giường: cụ giữ hạng cũ tới khi có chỗ (4.7).</Note>
    </Page>
  );
}

// ------------------------------------------------------------------ absences
export function AbsencesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<"PENDING" | "ALL">("PENDING");
  const { data, isLoading } = useQuery({ queryKey: ["m-abs"], queryFn: () => manager.absences() });
  const review = useMutation({ mutationFn: ({ id, ok }: { id: number; ok: boolean }) => manager.reviewAbsence(me, id, ok), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-abs"] }) });
  const rows = (data ?? []).filter((r) => f === "ALL" || r.absence.status === "PENDING");
  return (
    <Page title="Báo nghỉ" sub="Gói tháng/quý/năm vẫn tính tiền — báo nghỉ để chuẩn bị nhân sự và suất ăn. Gói ngày báo trước 17h hôm trước thì giữ tiền thành số dư (BR-21).">
      <div className="flex gap-1.5"><Chip active={f === "PENDING"} onClick={() => setF("PENDING")}>Chờ duyệt</Chip><Chip active={f === "ALL"} onClick={() => setF("ALL")}>Tất cả</Chip></div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.absence.id} empty="Không có báo nghỉ chờ duyệt" columns={[
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "d", header: "Ngày nghỉ", render: (r) => `${dm(r.absence.fromDate)}${r.absence.toDate !== r.absence.fromDate ? ` – ${dm(r.absence.toDate)}` : ""} (${r.days} ngày)` },
            { key: "r", header: "Lý do", render: (r) => <span>{r.absence.reason}<span className="block text-[11px] text-subtle">{r.absence.note}</span></span> },
            { key: "p", header: "Gói", render: (r) => r.sub ? CYCLE_LABEL[r.sub.cycle] : "—" },
            { key: "m", header: "Tiền", render: (r) => r.absence.creditAmount ? <Badge tone="green">Giữ số dư {vnd(r.absence.creditAmount)}</Badge> : <Badge tone="gray">Vẫn tính tiền</Badge> },
            { key: "s", header: "Trạng thái", render: (r) => <Badge tone={r.absence.status === "PENDING" ? "orange" : r.absence.status === "APPROVED" ? "green" : "red"}>{({ PENDING: "Chờ duyệt", APPROVED: "Đã ghi nhận", REJECTED: "Từ chối" })[r.absence.status]}</Badge> },
            { key: "x", header: "", render: (r) => r.absence.status === "PENDING" && <span className="flex gap-1"><Button size="sm" variant="success" onClick={() => review.mutate({ id: r.absence.id, ok: true })}>Ghi nhận</Button><Button size="sm" variant="danger" onClick={() => review.mutate({ id: r.absence.id, ok: false })}>Từ chối</Button></span> },
          ]} />
        )}
      </Card>
      <Note>Cụ báo nghỉ thì việc và thuốc của cụ tự rớt khỏi danh sách ngày hôm đó (CL-05).</Note>
    </Page>
  );
}

// ------------------------------------------------------------------ pauses & termination
export function PausesPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [cur, setCur] = useState<number>();
  const [refund, setRefund] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["m-pauses"], queryFn: () => manager.pauses() });
  const review = useMutation({ mutationFn: ({ id, ok }: { id: number; ok: boolean }) => manager.reviewPause(me, id, ok, Number(refund) || 0), onSuccess: () => { qc.invalidateQueries(); setCur(undefined); } });
  const sel = data?.find((r) => r.pause.id === cur);
  const unused = sel ? Math.max(0, Math.round((sel.paid * Math.max(0, daysBetween(sel.pause.fromDate, sel.sub.endDate))) / Math.max(1, daysBetween(sel.sub.startDate, sel.sub.endDate) + 1) / 1000) * 1000) : 0;
  return (
    <Page title="Bảo lưu & chấm dứt" sub="Nhập viện có giấy tờ: bảo lưu tối đa 30 ngày, các ngày còn lại dời sang sau (BR-22). Qua đời: chấm dứt, hoàn phần chưa dùng của gói dài hạn (5.9). Gia đình tự dừng gói: không hoàn tiền (BR-20).">
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={data ?? []} rowKey={(r) => r.pause.id} onRowClick={(r) => { setCur(r.pause.id); setRefund(""); }} columns={[
            { key: "k", header: "Loại", render: (r) => r.pause.kind === "HOSPITAL" ? <Badge tone="purple">Bảo lưu nhập viện</Badge> : <Badge tone="gray">Qua đời</Badge> },
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "d", header: "Thời gian", render: (r) => `${dmy(r.pause.fromDate)}${r.pause.toDate ? ` – ${dmy(r.pause.toDate)} (${daysBetween(r.pause.fromDate, r.pause.toDate) + 1} ngày)` : ""}` },
            { key: "g", header: "Giấy tờ", render: (r) => <span className="text-blue underline">{r.pause.document}</span> },
            { key: "s", header: "Gói", render: (r) => <span className="text-[12px]">{CYCLE_LABEL[r.sub.cycle]} · {TIER_LABEL[r.sub.tier]}</span> },
            { key: "r", header: "Hoàn tiền", render: (r) => r.pause.refundAmount ? vnd(r.pause.refundAmount) : "—" },
            { key: "st", header: "Trạng thái", render: (r) => <Badge tone={r.pause.status === "PENDING" ? "orange" : r.pause.status === "APPROVED" ? "green" : "red"}>{({ PENDING: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" })[r.pause.status]}</Badge> },
          ]} />
        )}
      </Card>
      <Modal open={!!sel} onClose={() => setCur(undefined)} title={sel?.pause.kind === "HOSPITAL" ? "Duyệt bảo lưu" : "Duyệt chấm dứt hợp đồng"} width={480} footer={sel?.pause.status === "PENDING" && <><Button variant="danger" onClick={() => review.mutate({ id: sel.pause.id, ok: false })}>Từ chối</Button><Button variant="success" loading={review.isPending} onClick={() => review.mutate({ id: sel.pause.id, ok: true })}>Duyệt</Button></>}>
        {sel && (
          <div className="space-y-1.5">
            <KV label="Cụ">{sel.elderly.fullName}</KV>
            <KV label="Người gửi">{sel.requester?.fullName}</KV>
            <KV label="Ghi chú">{sel.pause.note}</KV>
            <KV label="Gói">{dmy(sel.sub.startDate)} – {dmy(sel.sub.endDate)} · đã thu {vnd(sel.paid)}</KV>
            {sel.pause.kind === "HOSPITAL" ? <Note>Duyệt: gói chuyển Bảo lưu, ngày kết thúc dời thêm {sel.pause.toDate ? daysBetween(sel.pause.fromDate, sel.pause.toDate) + 1 : 0} ngày. Giường cố định Cao cấp vẫn giữ (BR-76).</Note> : (
              <>
                <Field label={`Số tiền hoàn (gợi ý phần chưa dùng: ${vnd(unused)})`} type="number" value={refund || String(unused)} onChange={(e) => setRefund(e.target.value)} disabled={sel.pause.status !== "PENDING"} />
                <Note>Hoàn qua cổng thanh toán. Phí đặt cọc (không có) và dịch vụ lẻ đã dùng không hoàn.</Note>
              </>
            )}
            <ErrorText error={review.error} />
          </div>
        )}
      </Modal>
    </Page>
  );
}
