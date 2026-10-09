// Manager · daily operation: M1 dashboard, attendance & pickup, care log M2/M5, health alerts, incidents (M3).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlarmClock, BedDouble, BookOpen, CircleCheck, ClipboardList, Eye, HeartPulse, Lock, Phone, Pill, Siren, Wrench } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { manager, NOW, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { AttBadge, ElderlyCell, GroupBadge, Progress, SearchBox, Stat, TierBadge, Timeline } from "../../components/domain";
import { Badge, Button, Card, Chip, ErrorText, Field, Kpi, KV, Loading, Modal, Note, SelectField, Table, Tabs, TextArea, type Tone } from "../../components/ui";
import { dm, dmy, hm, millions, weekday } from "../../lib/format";
import type { CareLogEntry, HealthAlert, Incident } from "../../types/models";

export const LEVEL: Record<HealthAlert["level"], [Tone, string]> = { URGENT: ["red", "Khẩn cấp"], WARNING: ["orange", "Cảnh báo"], INFO: ["blue", "Thông tin"] };
export const SOURCE: Record<HealthAlert["source"], string> = { THRESHOLD: "Vượt ngưỡng", AI: "AI phát hiện xu hướng", RULE: "Quy tắc hệ thống" };
export const INC_TYPE: Record<Incident["type"], string> = { FALL: "Té ngã", HEALTH: "Sức khỏe", BEHAVIOR: "Hành vi", LATE_PICKUP: "Đón trễ", FACILITY: "Cơ sở vật chất", OTHER: "Khác" };
export const SEVERITY: Record<Incident["severity"], [Tone, string]> = { HIGH: ["red", "Nặng"], MEDIUM: ["orange", "Vừa"], LOW: ["blue", "Nhẹ"] };

// ------------------------------------------------------------------ M1 Vận hành trong ngày
export function ManagerDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["m-dash"], queryFn: () => manager.dashboard() });
  if (isLoading || !data) return <Page title="Vận hành trong ngày"><Loading /></Page>;
  const c = data.counts;
  const todo: [number, Tone, string, string][] = [
    [data.todo.assessToday, "blue", "Lịch đánh giá / kiểm tra ngày đầu hôm nay (điều dưỡng duyệt)", "/manager/registrations"],
    [data.todo.awaitingPay, "blue", "Chờ gia đình thanh toán", "/manager/registrations"],
    [data.todo.absences, "purple", "Báo nghỉ chờ duyệt", "/manager/absences"],
    [data.todo.pauses, "purple", "Bảo lưu / chấm dứt chờ duyệt", "/manager/pauses"],
    [data.todo.leaves, "teal", "Xin nghỉ / đổi ca của nhân viên", "/manager/shifts?tab=leave"],
    [data.todo.aiShifts, "teal", "Lịch ca AI gợi ý tuần sau", "/manager/shifts"],
    [data.todo.aiMenus, "teal", "Thực đơn AI gợi ý tuần sau", "/manager/schedule"],
    [data.todo.damage, "orange", "Báo hỏng mới", "/manager/facilities/damage"],
    [data.todo.waitlist, "gray", "Gia đình trong danh sách chờ", "/manager/waitlist"],
    [data.todo.visits, "blue", "Lịch tham quan mới", "/manager/registrations?tab=visits"],
    [data.todo.handoffs, "purple", "Câu hỏi chatbot chuyển tới", "/manager/messages"],
    [data.todo.report, "gray", "Báo cáo tuần chưa gửi Admin", "/manager/reports"],
  ];
  return (
    <Page title={`Vận hành trong ngày · ${weekday(TODAY)}, ${dmy(TODAY)}`} sub={`Cập nhật lúc ${NOW} · giờ chăm sóc 07:00–16:30, đóng cửa 19:30`}>
      <div className="flex flex-wrap gap-3">
        <Kpi label="Có mặt" value={`${c.present}/${c.expected}`} sub="cụ có lịch hôm nay" />
        <Kpi label="Chưa đến" value={c.notArrived} sub={NOW >= "08:30" ? "quá 8:30, chưa báo nghỉ" : "trước 8:30"} color="orange" />
        <Kpi label="Báo nghỉ" value={c.reported} sub="gia đình đã báo" color="gray" />
        <Kpi label="Đã về" value={c.left} sub="đã giao người đón" color="green" />
        <Kpi label="Chờ đón sau 16:30" value={c.waiting} sub="1 staff trực sảnh" color="teal" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card title={<span className="flex items-center gap-2"><HeartPulse size={16} className="text-red-ink" />Cảnh báo chưa xử lý ({data.alerts.length})</span>} actions={<Button size="sm" variant="outline" to="/manager/alerts">Tất cả cảnh báo</Button>}>
            {data.alerts.length === 0 ? <div className="py-4 text-center text-[12.5px] text-subtle">Không có cảnh báo</div> : (
              <ul className="divide-y divide-line-soft">
                {data.alerts.map(({ alert: a, elderly, handler }) => (
                  <li key={a.id} className="flex items-start gap-3 py-2.5">
                    <Badge tone={LEVEL[a.level][0]}>{LEVEL[a.level][1]}</Badge>
                    <div className="min-w-0 flex-1 text-[12.5px]">
                      <div className="font-semibold text-navy">{elderly?.fullName} · {a.title}</div>
                      <div className="text-muted">{a.detail}</div>
                      <div className="text-[11px] text-subtle">{hm(a.at)} · {SOURCE[a.source]}{handler ? ` · ${handler.fullName} đang xử lý` : " · chưa ai nhận"}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title={<span className="flex items-center gap-2"><AlarmClock size={16} className="text-orange" />Chưa đến sau 8:30</span>}>
              {data.notArrived.length === 0 ? <div className="text-[12.5px] text-subtle">Tất cả đã đến</div> : data.notArrived.map(({ elderly, family }) => (
                <div key={elderly.id} className="flex items-center justify-between gap-2 py-1.5">
                  <ElderlyCell e={elderly} sub={`Gia đình: ${family?.fullName} · ${family?.phone}`} />
                  <Button size="sm" variant="neutral" icon={Phone}>Gọi</Button>
                </div>
              ))}
            </Card>
            <Card title={<span className="flex items-center gap-2"><Pill size={16} className="text-purple-ink" />Thuốc quá giờ 30 phút</span>}>
              {data.overdueMeds.length === 0 ? <div className="text-[12.5px] text-subtle">Không có</div> : data.overdueMeds.map(({ dose, plan, elderly }) => (
                <div key={dose.id} className="flex items-center justify-between py-1.5 text-[12.5px]">
                  <span><b className="text-navy">{elderly?.fullName}</b> · {plan?.name}</span>
                  <Badge tone="red">{dose.time}</Badge>
                </div>
              ))}
            </Card>
            <Card title={<span className="flex items-center gap-2"><Siren size={16} className="text-red-ink" />Sự cố đang mở</span>} actions={<Link to="/manager/incidents" className="text-[11.5px] font-semibold text-orange">Xem</Link>}>
              {data.incidents.length === 0 ? <div className="text-[12.5px] text-subtle">Không có</div> : data.incidents.map(({ incident: i, elderly }) => (
                <div key={i.id} className="py-1.5 text-[12.5px]"><Badge tone={SEVERITY[i.severity][0]}>{INC_TYPE[i.type]}</Badge> <b className="text-navy">{elderly?.fullName}</b> · {i.description}</div>
              ))}
            </Card>
            <Card title={<span className="flex items-center gap-2"><BookOpen size={16} className="text-green" />Care log chưa chốt</span>} actions={<Link to="/manager/care-logs" className="text-[11.5px] font-semibold text-orange">M5</Link>}>
              <div className="text-[12.5px] text-muted">Hôm nay: {data.openLogs - data.openLogsPast.length} cụ đang mở (bình thường trong giờ chăm sóc).</div>
              {data.openLogsPast.map((d) => <div key={`${d.elderlyId}${d.date}`} className="mt-1 text-[12.5px]"><Badge tone="red">Quá hạn</Badge> {d.elderly?.fullName} · {dm(d.date)} — cần chốt thay</div>)}
            </Card>
          </div>
        </div>
        <div className="space-y-4">
          <Card title="Việc chờ duyệt">
            <ul className="space-y-2 text-[12.5px]">
              {todo.filter(([n]) => n > 0).map(([n, tone, label, to]) => (
                <li key={label}><Link to={to} className="flex items-center gap-2 hover:text-orange"><Badge tone={tone}>{n}</Badge>{label}</Link></li>
              ))}
            </ul>
          </Card>
          <Card title={<span className="flex items-center gap-2"><BedDouble size={16} />Sức chứa theo hạng</span>} actions={<Link to="/manager/facilities/beds" className="text-[11.5px] font-semibold text-orange">Giường</Link>}>
            <div className="space-y-2.5">
              {data.capacity.map((x) => (
                <div key={x.tier}>
                  <div className="flex items-center justify-between text-[12px]"><TierBadge tier={x.tier} /><span className="text-muted">{x.held}/{x.beds} chỗ{x.waiting ? ` · chờ ${x.waiting}` : ""}{x.todayDay ? ` · gói ngày hôm nay ${x.todayDay}` : ""}</span></div>
                  <div className="mt-1"><Progress value={(x.held / Math.max(1, x.beds)) * 100} tone={x.full ? "red" : "green"} /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card title={<span className="flex items-center gap-2"><Wrench size={16} />Cơ sở vật chất</span>}>
            {data.lowEquip.map((e) => <div key={e.id} className="text-[12.5px]"><Badge tone="red">Dưới định mức</Badge> {e.name}: dùng được {e.total - e.broken - e.repairing}/{e.total} (tối thiểu {e.minStock})</div>)}
            {data.closedRooms.map((r) => <div key={r.id} className="mt-1 text-[12.5px]"><Badge tone="orange">Tạm đóng</Badge> {r.name} — {r.closedReason}</div>)}
          </Card>
          <Card><Stat label="Đã thu tháng 10 (VNPay/MoMo)" value={millions(data.revenue)} tone="green" /></Card>
        </div>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ Điểm danh & đón cụ
export function AttendancePage() {
  const [f, setF] = useState<"ALL" | "EXPECTED" | "PRESENT" | "LEFT" | "ABSENT">("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["m-att"], queryFn: () => manager.attendance() });
  const rows = (data?.rows ?? []).filter((r) => {
    const st = r.absence ? "ABSENT" : r.a?.status ?? "EXPECTED";
    return f === "ALL" || st === f;
  });
  const s = data?.settings;
  return (
    <Page title={`Điểm danh & đón cụ · ${dmy(TODAY)}`} sub="Quản lý chỉ xem. Hộ lý và điều dưỡng check-in/out trên app (quét QR).">
      <div className="flex flex-wrap gap-1.5">
        {([["ALL", "Tất cả"], ["EXPECTED", "Chưa đến"], ["PRESENT", "Đang ở"], ["LEFT", "Đã về"], ["ABSENT", "Báo nghỉ / vắng"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.elderly.id} columns={[
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "t", header: "Hạng · nhóm", render: (r) => <span className="flex gap-1"><TierBadge tier={r.sub?.tier} /><GroupBadge group={r.elderly.targetGroup} /></span> },
            { key: "s", header: "Trạng thái", render: (r) => <AttBadge a={r.a} absent={!!r.absence} /> },
            { key: "i", header: "Đến", render: (r) => r.a?.checkIn ?? "—" },
            { key: "o", header: "Về", render: (r) => r.a?.checkOut ?? "—" },
            { key: "p", header: "Người đón", render: (r) => r.pickup ? `${r.pickup.fullName} (${r.pickup.relationship})` : "—" },
            { key: "c", header: "Hộ lý", render: (r) => r.caregiver?.fullName },
            { key: "n", header: "Ghi chú", render: (r) => r.a?.manualReason ? <Badge tone="gray">Check-in hộ: {r.a.manualReason}</Badge> : r.absence ? r.absence.reason : "" },
          ]} />
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Quy trình chờ đón (mục 4.3)">
          <ol className="space-y-2 text-[12.5px]">
            <li className="flex gap-2"><Badge tone="green">{s?.careEnd}</Badge>Hết giờ chăm sóc. Hệ thống báo gia đình "cụ đã sẵn sàng về".</li>
            <li className="flex gap-2"><Badge tone="orange">{s?.pickupReminders[1]}</Badge>Nhắc lần 1 cho gia đình chưa đón.</li>
            <li className="flex gap-2"><Badge tone="orange">{s?.pickupReminders[2]}</Badge>Nhắc lần 2 và gọi người liên hệ chính.</li>
            <li className="flex gap-2"><Badge tone="red">{s?.closingTime}</Badge>Đóng cửa. Staff gọi tất cả người được phép đón, ghi sự cố đón trễ, báo Quản lý, ở lại tới khi giao được cụ.</li>
          </ol>
          <Note className="mt-3">16:30–19:30 miễn phí, không có hoạt động và không ăn uống (BR-34).</Note>
        </Card>
        <Card title="Sự cố đón trễ gần đây">
          {data?.lateIncidents.length ? data.lateIncidents.map(({ incident: i, elderly }) => (
            <div key={i.id} className="border-b border-line-soft py-2 text-[12.5px] last:border-0">
              <div className="font-semibold text-navy">{elderly?.fullName} · {dmy(i.at.slice(0, 10))} {hm(i.at)}</div>
              <div className="text-muted">{i.description} {i.action}</div>
            </div>
          )) : <div className="text-[12.5px] text-subtle">Không có</div>}
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ M5 Care log trong ngày + M2 xem care log
export function CareLogsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [date, setDate] = useState(TODAY);
  const [q, setQ] = useState("");
  const dates = useQuery({ queryKey: ["m-cl-dates"], queryFn: () => manager.careLogDates() });
  const { data, isLoading } = useQuery({ queryKey: ["m-cl-day", date], queryFn: () => manager.careLogDay(date) });
  const close = useMutation({ mutationFn: (id: number) => manager.closeOnBehalf(me, id, date), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-cl-day"] }) });
  const rows = (data ?? []).filter((r) => !q || `${r.elderly.fullName} ${r.caregiver?.fullName}`.toLowerCase().includes(q.toLowerCase()));
  const open = rows.filter((r) => r.day.status === "OPEN").length;
  return (
    <Page title="Care log" sub="M5 · theo dõi trong ngày, chốt thay khi staff quên, sửa care log đã chốt (bắt buộc lý do)">
      <div className="flex flex-wrap items-center gap-2">
        <SelectField label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} className="w-44">
          {dates.data?.map((d) => <option key={d} value={d}>{weekday(d)} {dmy(d)}{d === TODAY ? " (hôm nay)" : ""}</option>)}
        </SelectField>
        <SearchBox value={q} onChange={setQ} placeholder="Lọc theo cụ, hộ lý…" />
        <span className="ml-auto flex gap-2"><Badge tone="orange">{open} đang mở</Badge><Badge tone="green">{rows.length - open} đã chốt</Badge></span>
      </div>
      {date === TODAY && <Note>Hệ thống nhắc staff chốt lúc 18:00; 20:00 vẫn chưa chốt thì Quản lý chốt thay (CL-11). Hộ lý phụ trách chính chốt sau khi điều dưỡng ghi xong chỉ số và thuốc (CL-06).</Note>}
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.elderly.id} onRowClick={(r) => nav(`/manager/care-logs/${r.elderly.id}/${date}`)} columns={[
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} sub={<span className="flex gap-1"><TierBadge tier={r.sub?.tier} /><GroupBadge group={r.elderly.targetGroup} /></span>} /> },
            { key: "a", header: "Điểm danh", render: (r) => <AttBadge a={r.att} /> },
            { key: "c", header: "Hộ lý phụ trách", render: (r) => r.caregiver?.fullName },
            { key: "p", header: "Việc đã xong", render: (r) => <span className="block w-28"><span className="text-[11px] text-subtle">{r.done}/{r.total}</span><Progress value={(r.done / Math.max(1, r.total)) * 100} /></span> },
            { key: "n", header: "Điều dưỡng", render: (r) => r.nursePending ? <Badge tone="orange">Còn {r.nursePending} việc</Badge> : <Badge tone="green">Xong</Badge> },
            { key: "i", header: "Lưu ý", render: (r) => r.important.length ? <Badge tone="red">{r.important.length} lưu ý</Badge> : "—" },
            { key: "ph", header: "Ảnh", render: (r) => r.photos },
            { key: "s", header: "Trạng thái", render: (r) => r.day.status === "CLOSED" ? <span className="text-[11.5px]"><Badge tone="green">Đã chốt</Badge><span className="block text-subtle">{r.closer?.fullName}{r.day.closedByManager ? " (chốt thay)" : ""} · {hm(r.day.closedAt)}</span></span> : <Badge tone="orange">Đang mở</Badge> },
            { key: "x", header: "", render: (r) => r.day.status === "OPEN" && (date < TODAY || r.att?.status === "LEFT") ? <Button size="sm" variant="outline" icon={Lock} loading={close.isPending && close.variables === r.elderly.id} onClick={(ev) => { ev.stopPropagation(); close.mutate(r.elderly.id); }}>Chốt thay</Button> : <Button size="sm" variant="neutral" icon={Eye}>Xem</Button> },
          ]} />
        )}
      </Card>
    </Page>
  );
}

export function CareLogDetailPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { id, date = TODAY } = useParams();
  const eid = Number(id);
  const [tab, setTab] = useState<"timeline" | "tasks" | "summary" | "edits">("timeline");
  const [edit, setEdit] = useState<CareLogEntry>();
  const [detail, setDetail] = useState("");
  const [reason, setReason] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["m-cl", eid, date], queryFn: () => manager.careLog(eid, date) });
  const save = useMutation({ mutationFn: () => manager.editEntry(me, edit!.id, detail, reason), onSuccess: () => { qc.invalidateQueries({ queryKey: ["m-cl", eid, date] }); setEdit(undefined); } });
  const close = useMutation({ mutationFn: () => manager.closeOnBehalf(me, eid, date), onSuccess: () => qc.invalidateQueries({ queryKey: ["m-cl", eid, date] }) });
  if (isLoading || !data) return <Page title="Care log" back="/manager/care-logs"><Loading /></Page>;
  const closed = data.day?.status === "CLOSED";
  const by = (k: CareLogEntry["kind"]) => data.entries.filter((x) => x.kind === k);
  return (
    <Page title={`Care log · ${data.elderly.fullName}`} sub={`${weekday(date)} ${dmy(date)}`} back="/manager/care-logs">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <ElderlyCell e={data.elderly} size={40} />
          <TierBadge tier={data.sub?.tier} /><GroupBadge group={data.elderly.targetGroup} />
          <span className="ml-auto flex items-center gap-2">
            {closed ? <Badge tone="green">Đã chốt · {data.closer?.fullName}{data.day?.closedByManager ? " (chốt thay)" : ""} · {hm(data.day?.closedAt)}</Badge> : <Badge tone="orange">Đang mở</Badge>}
            {!closed && <Button size="sm" variant="outline" icon={Lock} loading={close.isPending} onClick={() => close.mutate()}>Chốt thay</Button>}
          </span>
        </div>
        {closed && <Note className="mt-3">Care log đã chốt. Bấm "Sửa" ở từng mục để sửa — bắt buộc ghi lý do, hệ thống lưu ai sửa, lúc nào, từ gì thành gì (CL-06).</Note>}
      </Card>
      <Tabs value={tab} onChange={setTab} items={[{ value: "timeline", label: "Dòng thời gian" }, { value: "tasks", label: `Việc trong ngày (${data.tasks.length})` }, { value: "summary", label: "Tổng kết ngày" }, { value: "edits", label: `Lịch sử sửa (${data.edits.length})` }]} />
      {tab === "timeline" && <Card><Timeline entries={data.entries} showStaff onEdit={closed ? (x) => { setEdit(x); setDetail(x.detail); setReason(""); } : undefined} /></Card>}
      {tab === "tasks" && (
        <Card>
          <Table rows={data.tasks} rowKey={(t) => t.id} columns={[
            { key: "t", header: "Giờ", render: (t) => t.time },
            { key: "n", header: "Việc", render: (t) => t.title },
            { key: "o", header: "Người làm", render: (t) => t.owner === "NURSE" ? <Badge tone="teal">Điều dưỡng</Badge> : <Badge tone="blue">Hộ lý</Badge> },
            { key: "s", header: "Trạng thái", render: (t) => t.status === "DONE" ? <Badge tone="green">Đã làm {t.doneAt}</Badge> : t.status === "SKIPPED" ? <Badge tone="orange">Bỏ qua</Badge> : <Badge tone="gray">Chưa làm</Badge> },
            { key: "r", header: "Lý do / người ghi", render: (t) => <span className="text-[11.5px] text-muted">{t.skipReason ?? t.by?.fullName ?? ""}</span> },
          ]} />
        </Card>
      )}
      {tab === "summary" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Ăn uống">{by("MEAL").map((x) => <KV key={x.id} label={`${x.time} ${x.title}`} w={140}>{x.detail}</KV>)}</Card>
          <Card title="Hoạt động">{by("ACTIVITY").map((x) => <KV key={x.id} label={`${x.time} ${x.title}`} w={180}>{x.detail}</KV>)}</Card>
          <Card title="Chỉ số">{data.metrics.map((m) => <KV key={m.id} label={hm(m.at)} w={60}>{[m.sys && `HA ${m.sys}/${m.dia}`, m.pulse && `mạch ${m.pulse}`, m.temp && `${m.temp}°C`, m.spo2 && `SpO₂ ${m.spo2}%`, m.glucose && `ĐH ${m.glucose}`].filter(Boolean).join(" · ")}</KV>)}</Card>
          <Card title="Thuốc">{data.doses.map((m) => <KV key={m.id} label={`${m.time} ${m.plan?.name}`} w={200}><Badge tone={m.status === "GIVEN" ? "green" : m.status === "PENDING" ? "gray" : "orange"}>{({ GIVEN: "Đã uống", REFUSED: "Từ chối", MISSING: "Chưa có thuốc", PENDING: "Chưa đến giờ" })[m.status]}</Badge> {m.reason}</KV>)}</Card>
          <Card title="Tâm trạng & lưu ý" className="md:col-span-2">{[...by("MOOD"), ...data.entries.filter((x) => x.important && x.kind !== "MOOD")].map((x) => <KV key={x.id} label={`${x.time} ${x.title}`} w={180}>{x.detail}</KV>)}</Card>
        </div>
      )}
      {tab === "edits" && (
        <Card>
          <Table rows={data.edits} rowKey={(x) => x.id} empty="Chưa có lần sửa nào" columns={[
            { key: "w", header: "Lúc", render: (x) => `${dmy(x.editedAt.slice(0, 10))} ${hm(x.editedAt)}` },
            { key: "b", header: "Người sửa", render: (x) => x.editor?.fullName },
            { key: "f", header: "Từ", render: (x) => <span className="text-red-ink line-through">{x.before}</span> },
            { key: "t", header: "Thành", render: (x) => <span className="text-green-ink">{x.after}</span> },
            { key: "r", header: "Lý do", render: (x) => x.reason },
          ]} />
        </Card>
      )}
      <Modal open={!!edit} onClose={() => setEdit(undefined)} title={`Sửa: ${edit?.title} (${edit?.time})`} width={480} footer={<><Button variant="neutral" onClick={() => setEdit(undefined)}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu & ghi lịch sử</Button></>}>
        <div className="space-y-2">
          <Field label="Giá trị cũ" value={edit?.detail ?? ""} readOnly />
          <TextArea label="Giá trị mới" value={detail} onChange={(e) => setDetail(e.target.value)} />
          <TextArea label="Lý do sửa (bắt buộc)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <ErrorText error={save.error} />
        </div>
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ Cảnh báo sức khỏe
export function AlertsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<"OPEN" | "CLOSED" | "ALL">("OPEN");
  const [cur, setCur] = useState<number>();
  const [result, setResult] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["m-alerts"], queryFn: () => manager.alerts() });
  const handle = useMutation({ mutationFn: (s: "IN_PROGRESS" | "CLOSED") => manager.handleAlert(me, cur!, s, result), onSuccess: () => { qc.invalidateQueries({ queryKey: ["m-alerts"] }); setCur(undefined); } });
  const rows = (data ?? []).filter((r) => f === "ALL" || (f === "OPEN" ? r.alert.status !== "CLOSED" : r.alert.status === "CLOSED"));
  const sel = data?.find((r) => r.alert.id === cur);
  return (
    <Page title="Cảnh báo sức khỏe" sub="Từ ngưỡng chỉ số, AI phát hiện xu hướng, và quy tắc CL-07. Mức khẩn cấp luôn gửi gia đình (CL-08).">
      <div className="flex gap-1.5">{([["OPEN", "Chưa đóng"], ["CLOSED", "Đã đóng"], ["ALL", "Tất cả"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}</div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.alert.id} onRowClick={(r) => { setCur(r.alert.id); setResult(r.alert.result ?? ""); }} columns={[
            { key: "l", header: "Mức", render: (r) => <Badge tone={LEVEL[r.alert.level][0]}>{LEVEL[r.alert.level][1]}</Badge> },
            { key: "t", header: "Lúc", render: (r) => `${dm(r.alert.at.slice(0, 10))} ${hm(r.alert.at)}` },
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} sub={<GroupBadge group={r.elderly.targetGroup} />} /> },
            { key: "n", header: "Cảnh báo", render: (r) => <span><b className="text-navy">{r.alert.title}</b><span className="block text-[11.5px] text-muted">{r.alert.detail}</span></span> },
            { key: "s", header: "Nguồn", render: (r) => <Badge tone={r.alert.source === "AI" ? "teal" : "gray"}>{SOURCE[r.alert.source]}</Badge> },
            { key: "h", header: "Xử lý", render: (r) => r.alert.status === "CLOSED" ? <Badge tone="green">Đã đóng</Badge> : r.alert.status === "IN_PROGRESS" ? <Badge tone="orange">{r.handler?.fullName}</Badge> : <Badge tone="red">Chưa nhận</Badge> },
          ]} />
        )}
      </Card>
      <Modal open={!!sel} onClose={() => setCur(undefined)} title={sel?.alert.title} width={480} footer={sel?.alert.status !== "CLOSED" && <><Button variant="neutral" loading={handle.isPending} onClick={() => handle.mutate("IN_PROGRESS")}>Nhận xử lý</Button><Button variant="success" icon={CircleCheck} loading={handle.isPending} onClick={() => handle.mutate("CLOSED")}>Đóng cảnh báo</Button></>}>
        {sel && (
          <div className="space-y-2">
            <KV label="Cụ">{sel.elderly.fullName}</KV>
            <KV label="Chi tiết">{sel.alert.detail}</KV>
            <KV label="Nguồn">{SOURCE[sel.alert.source]}</KV>
            {sel.alert.source === "AI" && <Note>AI chỉ gợi ý. Điều dưỡng/Quản lý quyết định cách xử lý (BR-50).</Note>}
            <TextArea label="Kết quả xử lý" value={result} onChange={(e) => setResult(e.target.value)} readOnly={sel.alert.status === "CLOSED"} />
            <Button size="sm" variant="outline" icon={Siren} to={`/manager/incidents?new=${sel.elderly.id}`}>Tạo sự cố / chuyển viện</Button>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ M3 Sự cố & chuyển viện
export function IncidentsPage() {
  const me = useMe();
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const [f, setF] = useState<"ALL" | "OPEN" | "HIGH" | "TRANSFER">("ALL");
  const [cur, setCur] = useState<number>();
  const [action, setAction] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["m-inc"], queryFn: () => manager.incidents() });
  const upd = useMutation({ mutationFn: (status: "OPEN" | "RESOLVED") => manager.updateIncident(me, cur!, { status, action }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["m-inc"] }); setCur(undefined); } });
  const rows = (data ?? []).filter((r) => f === "ALL" || (f === "OPEN" ? r.incident.status === "OPEN" : f === "HIGH" ? r.incident.severity === "HIGH" : !!r.incident.transfer));
  const sel = data?.find((r) => r.incident.id === cur);
  const month = (data ?? []).filter((r) => r.incident.at >= "2026-09-10");
  return (
    <Page title="Sự cố & chuyển viện" sub="Điều dưỡng ghi sự cố trên app (hộ lý báo nhanh). Quản lý theo dõi, xử lý sự cố nặng và xem báo cáo tháng.">
      {sp.get("new") && <Note>Sự cố được tạo bởi điều dưỡng trên app staff (S9). Quản lý cập nhật xử lý tại đây.</Note>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="30 ngày qua" value={month.length} />
        <Stat label="Té ngã" value={month.filter((r) => r.incident.type === "FALL").length} tone="orange" />
        <Stat label="Chuyển viện" value={month.filter((r) => r.incident.transfer).length} tone="red" />
        <Stat label="Đón trễ" value={month.filter((r) => r.incident.type === "LATE_PICKUP").length} tone="purple" />
      </div>
      <div className="flex gap-1.5">{([["ALL", "Tất cả"], ["OPEN", "Đang mở"], ["HIGH", "Mức nặng"], ["TRANSFER", "Có chuyển viện"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}</div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.incident.id} onRowClick={(r) => { setCur(r.incident.id); setAction(r.incident.action); }} columns={[
            { key: "t", header: "Lúc", render: (r) => `${dmy(r.incident.at.slice(0, 10))} ${hm(r.incident.at)}` },
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} /> },
            { key: "k", header: "Loại", render: (r) => INC_TYPE[r.incident.type] },
            { key: "s", header: "Mức độ", render: (r) => <Badge tone={SEVERITY[r.incident.severity][0]}>{SEVERITY[r.incident.severity][1]}</Badge> },
            { key: "d", header: "Mô tả", render: (r) => <span className="text-[12px]">{r.incident.description}</span> },
            { key: "tr", header: "Chuyển viện", render: (r) => r.incident.transfer ? <Badge tone="red">{r.incident.transfer.hospital}</Badge> : "—" },
            { key: "f", header: "Báo GĐ", render: (r) => r.incident.familyNotified ? <Badge tone="green">Đã báo</Badge> : <Badge tone="red">Chưa</Badge> },
            { key: "st", header: "Trạng thái", render: (r) => r.incident.status === "OPEN" ? <Badge tone="orange">Đang mở</Badge> : <Badge tone="green">Đã xử lý</Badge> },
          ]} />
        )}
      </Card>
      <Modal open={!!sel} onClose={() => setCur(undefined)} title={sel ? `${INC_TYPE[sel.incident.type]} · ${sel.elderly.fullName}` : ""} width={520} footer={<><Button variant="neutral" loading={upd.isPending} onClick={() => upd.mutate("OPEN")}>Lưu, vẫn mở</Button><Button variant="success" loading={upd.isPending} onClick={() => upd.mutate("RESOLVED")}>Đánh dấu đã xử lý</Button></>}>
        {sel && (
          <div className="space-y-1.5">
            <KV label="Lúc">{dmy(sel.incident.at.slice(0, 10))} {hm(sel.incident.at)}</KV>
            <KV label="Người ghi">{sel.reporter?.fullName}</KV>
            <KV label="Mức độ"><Badge tone={SEVERITY[sel.incident.severity][0]}>{SEVERITY[sel.incident.severity][1]}</Badge></KV>
            <KV label="Mô tả">{sel.incident.description}</KV>
            {sel.incident.transfer && <Note tone="red">Chuyển viện {sel.incident.transfer.hospital} lúc {sel.incident.transfer.time} · người đi kèm: {sel.incident.transfer.escort}</Note>}
            <TextArea label="Cách xử lý" value={action} onChange={(e) => setAction(e.target.value)} />
            {sel.incident.transfer && <Button size="sm" variant="outline" icon={ClipboardList} to="/manager/pauses">Xem bảo lưu nếu cụ nhập viện</Button>}
          </div>
        )}
      </Modal>
    </Page>
  );
}
