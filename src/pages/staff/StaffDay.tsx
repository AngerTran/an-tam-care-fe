// Staff · during the shift: S1 ca hôm nay, S2 check-in/out, S3 cụ hôm nay, S4 care log của một cụ, S6 ghi nhanh cả nhóm.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity, AlarmClock, Bath, Camera, CircleCheck, DoorOpen, HeartPulse, Lock, LogIn, Moon, NotebookPen, Phone, Pill, QrCode, ScanLine, Smile, TriangleAlert, UserX, Utensils, Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { lookups, NOW, staff, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { AttBadge, ElderlyCell, GroupBadge, Progress, Stat, TierBadge, Timeline } from "../../components/domain";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, KV, Loading, Modal, Note, SelectField, Table, Tabs, TextArea, cn } from "../../components/ui";
import { GROUP_INFO, MEAL_AMOUNTS, PARTICIPATION } from "../../domain/catalog";
import { dmy, hm, weekday } from "../../lib/format";
import { EntryModal, IncidentModal, VitalsModal, type EntryKindUI } from "./StaffForms";
import { DoseButtons } from "./StaffNurse";

// ------------------------------------------------------------------ S1
export function StaffToday() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["s-today", me.id], queryFn: () => staff.today(me) });
  if (isLoading || !data) return <Page title="Ca hôm nay"><Loading /></Page>;
  const nurse = data.position === "NURSE";
  return (
    <Page title={`Ca hôm nay · ${weekday(TODAY)} ${dmy(TODAY)}`} sub={data.shift.length ? data.shift.map((s) => `${s.label} ${s.startTime}–${s.endTime}`).join(" + ") : "Hôm nay bạn không có ca"}>
      {data.note && <Note>Ghi chú ca: {data.note}</Note>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Có mặt" value={`${data.counts.present}/${data.counts.total}`} tone="green" />
        <Stat label="Chưa đến" value={data.counts.notArrived} tone="orange" />
        <Stat label="Đã về" value={data.counts.left} />
        <Stat label="Cảnh báo cần xử lý" value={data.alerts.length} tone="red" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={<span className="flex items-center gap-2"><AlarmClock size={16} className="text-orange" />Việc trong 30 phút tới</span>} actions={<span className="text-[11px] text-subtle">bây giờ {NOW}</span>}>
          {data.soon.length === 0 ? <div className="text-[12.5px] text-subtle">Không có việc sắp tới</div> : (
            <ul className="divide-y divide-line-soft">
              {data.soon.map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2 text-[12.5px]">
                  <Badge tone={t.overdue ? "red" : "blue"}>{t.time}</Badge>
                  <span className="flex-1"><b className="text-navy">{t.elderly?.fullName}</b> · {t.title}</span>
                  <Button size="sm" variant="outline" to={`/staff/elderly/${t.elderlyId}`}>Mở</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={<span className="flex items-center gap-2"><HeartPulse size={16} className="text-red-ink" />Cảnh báo cần xử lý</span>} actions={<Link to="/staff/alerts" className="text-[11.5px] font-semibold text-orange">Tất cả</Link>}>
          {data.alerts.length === 0 ? <div className="text-[12.5px] text-subtle">Không có</div> : data.alerts.map(({ alert: a, elderly }) => (
            <div key={a.id} className="border-b border-line-soft py-1.5 text-[12.5px] last:border-0"><Badge tone={a.level === "URGENT" ? "red" : a.level === "WARNING" ? "orange" : "blue"}>{a.title}</Badge> <b className="text-navy">{elderly?.fullName}</b><span className="block text-[11.5px] text-muted">{a.detail}</span></div>
          ))}
        </Card>
        <Card title={<span className="flex items-center gap-2"><UserX size={16} className="text-orange" />Có lịch mà chưa đến sau 8:30</span>}>
          {data.lateArrivals.length === 0 ? <div className="text-[12.5px] text-subtle">Không có</div> : data.lateArrivals.map((e) => <div key={e.id} className="flex items-center justify-between py-1"><ElderlyCell e={e} /><Button size="sm" variant="neutral" icon={Phone}>Gọi gia đình</Button></div>)}
        </Card>
        <Card title="Đồng đội cùng ca">
          {data.team.map((t, i) => <div key={i} className="flex items-center gap-2 py-1 text-[12.5px]"><Avatar name={t.user?.fullName ?? ""} size={24} tone="teal" />{t.user?.fullName}<Badge tone={t.position === "NURSE" ? "teal" : "blue"}>{t.position === "NURSE" ? "Điều dưỡng" : "Hộ lý"}</Badge><span className="text-subtle">{t.label}</span></div>)}
          {data.openLogs.length > 0 && <Note tone="red" className="mt-2">Care log chưa chốt: {data.openLogs.map((c) => `${c.elderly?.fullName} (${c.date.slice(8)}/${c.date.slice(5, 7)})`).join(", ")}</Note>}
        </Card>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button icon={QrCode} to="/staff/checkin">Check-in / check-out</Button>
        <Button variant="outline" icon={Users} to="/staff/elderly">Cụ hôm nay</Button>
        {nurse ? <><Button variant="outline" icon={Activity} to="/staff/vitals">Đo chỉ số</Button><Button variant="outline" icon={Pill} to="/staff/meds">Thuốc đến hạn</Button></> : <Button variant="outline" icon={Utensils} to="/staff/group-log">Ghi nhanh cả nhóm</Button>}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ S2
export function StaffCheckin() {
  const me = useMe();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"wait" | "in" | "out">("wait");
  const [code, setCode] = useState("");
  const [manual, setManual] = useState<number>();
  const [reason, setReason] = useState("Quên thẻ QR");
  const [out, setOut] = useState<number>();
  const [pickup, setPickup] = useState<number>();
  const [stranger, setStranger] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["s-checkin", me.id], queryFn: () => staff.checkin(me) });
  const inv = () => qc.invalidateQueries();
  const scan = useMutation({ mutationFn: () => staff.scan(me, code), onSuccess: (e) => { setCode(""); const a = data?.find((r) => r.elderly.id === e.id)?.a; if (a?.status === "PRESENT") { setOut(e.id); setPickup(undefined); } else checkIn.mutate({ id: e.id }); } });
  const checkIn = useMutation({ mutationFn: ({ id, r }: { id: number; r?: string }) => staff.checkIn(me, id, r), onSuccess: () => { inv(); setManual(undefined); } });
  const absent = useMutation({ mutationFn: (id: number) => staff.markAbsent(me, id), onSuccess: inv });
  const checkOut = useMutation({ mutationFn: () => staff.checkOut(me, out!, pickup!), onSuccess: () => { inv(); setTab("out"); } });
  const strange = useMutation({ mutationFn: () => staff.strangerPickup(me, out!, stranger), onSuccess: () => { inv(); setStranger(""); } });
  const close = useMutation({ mutationFn: (id: number) => staff.closeLog(me, id), onSuccess: inv });
  const rows = data ?? [];
  const wait = rows.filter((r) => !r.a || r.a.status === "EXPECTED");
  const inside = rows.filter((r) => r.a?.status === "PRESENT");
  const left = rows.filter((r) => r.a?.status === "LEFT" || r.a?.status === "ABSENT");
  const outRow = rows.find((r) => r.elderly.id === out);
  const list = tab === "wait" ? wait : tab === "in" ? inside : left;
  return (
    <Page title="Check-in / check-out" sub="Quét QR của cụ (BR-35). Chỉ giao cụ cho người có trong danh sách người được phép đón (BR-30).">
      <Card>
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); scan.mutate(); }}>
          <span className="flex size-12 items-center justify-center rounded-xl bg-navy text-white"><ScanLine size={22} /></span>
          <Field label="Mã QR trên thẻ cụ (VD: ATC-0004)" value={code} onChange={(e) => setCode(e.target.value)} className="w-72" />
          <Button type="submit" icon={QrCode} loading={scan.isPending}>Quét</Button>
          <span className="text-[11.5px] text-subtle">Đã có mặt → mở check-out. Chưa đến → check-in.</span>
        </form>
        <ErrorText error={scan.error ?? checkIn.error} />
      </Card>
      <Tabs value={tab} onChange={setTab} items={[{ value: "wait", label: `Chưa đến (${wait.length})` }, { value: "in", label: `Đang ở (${inside.length})` }, { value: "out", label: `Đã về / vắng (${left.length})` }]} />
      <Card>
        {isLoading ? <Loading /> : list.length === 0 ? <EmptyState icon={CircleCheck} title="Không có cụ nào" /> : (
          <ul className="divide-y divide-line-soft">
            {list.map((r) => (
              <li key={r.elderly.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <ElderlyCell e={r.elderly} sub={<span className="flex gap-1"><TierBadge tier={r.sub?.tier} /><GroupBadge group={r.elderly.targetGroup} /></span>} />
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {r.absence && <Badge tone="purple">Báo nghỉ: {r.absence.reason}</Badge>}
                  <AttBadge a={r.a} />
                  {r.a?.checkIn && <span className="text-[11.5px] text-subtle">đến {r.a.checkIn}{r.a.checkOut ? ` · về ${r.a.checkOut}` : ""}</span>}
                  {tab === "wait" && !r.absence && <><Button size="sm" variant="success" icon={LogIn} loading={checkIn.isPending && checkIn.variables?.id === r.elderly.id} onClick={() => checkIn.mutate({ id: r.elderly.id })}>Check-in</Button><Button size="sm" variant="neutral" onClick={() => setManual(r.elderly.id)}>Check-in hộ</Button><Button size="sm" variant="danger" onClick={() => absent.mutate(r.elderly.id)}>Vắng</Button></>}
                  {tab === "in" && <><Button size="sm" variant="outline" to={`/staff/elderly/${r.elderly.id}`}>Care log</Button><Button size="sm" icon={DoorOpen} onClick={() => { setOut(r.elderly.id); setPickup(undefined); }}>Check-out</Button></>}
                  {tab === "out" && r.a?.status === "LEFT" && (r.day?.status === "CLOSED" ? <Badge tone="green">Đã chốt care log</Badge> : r.elderly.caregiverId === me.id ? <Button size="sm" icon={Lock} loading={close.isPending && close.variables === r.elderly.id} onClick={() => close.mutate(r.elderly.id)}>Chốt care log</Button> : <Badge tone="orange">Chờ hộ lý chốt</Badge>)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <ErrorText error={close.error ?? absent.error} />
      </Card>
      <Modal open={!!manual} onClose={() => setManual(undefined)} title="Check-in hộ" footer={<><Button variant="neutral" onClick={() => setManual(undefined)}>Hủy</Button><Button loading={checkIn.isPending} onClick={() => checkIn.mutate({ id: manual!, r: reason })}>Check-in</Button></>}>
        <SelectField label="Lý do" value={reason} onChange={(e) => setReason(e.target.value)}>{["Quên thẻ QR", "Thẻ hỏng", "Máy quét lỗi", "Khác"].map((x) => <option key={x}>{x}</option>)}</SelectField>
      </Modal>
      <Modal open={!!outRow} onClose={() => setOut(undefined)} title={`Check-out · ${outRow?.elderly.fullName ?? ""}`} width={520} footer={<><Button variant="neutral" onClick={() => setOut(undefined)}>Hủy</Button><Button icon={DoorOpen} disabled={!pickup} loading={checkOut.isPending} onClick={() => checkOut.mutate()}>Giao cụ</Button></>}>
        {outRow && (
          <div className="space-y-2">
            {outRow.elderly.targetGroup === "DEMENTIA" && <Note tone="red">Nhóm sa sút trí tuệ: kiểm tra kỹ người đón.</Note>}
            <div className="text-[12px] font-semibold text-navy">Chọn người đón — đối chiếu ảnh và 4 số cuối CCCD</div>
            {outRow.pickups.map((p) => (
              <button key={p.id} onClick={() => setPickup(p.id)} className={cn("flex w-full items-center gap-3 rounded-xl border p-2.5 text-left", pickup === p.id ? "border-[2px] border-orange bg-orange-soft" : "border-line")}>
                <Avatar name={p.fullName} size={40} />
                <span className="flex-1 text-[12.5px]"><b className="text-navy">{p.fullName}</b>{p.isPrimary && <Badge tone="blue" className="ml-1">Liên hệ chính</Badge>}<span className="block text-subtle">{p.relationship} · {p.phone}</span></span>
                <span className="rounded-lg bg-navy px-2.5 py-1 font-mono text-[14px] font-bold text-white">…{p.idLast4}</span>
              </button>
            ))}
            <div className="rounded-xl bg-red-soft/40 p-2.5">
              <div className="text-[12px] font-semibold text-red-ink">Người đến đón không có trong danh sách?</div>
              <div className="mt-1 flex gap-2"><Field label="Tên người đến đón" value={stranger} onChange={(e) => setStranger(e.target.value)} className="flex-1" /><Button className="self-center" variant="danger" icon={Phone} disabled={!stranger} loading={strange.isPending} onClick={() => strange.mutate()}>Không giao · gọi liên hệ chính</Button></div>
              {strange.isSuccess && <div className="mt-1 text-[11.5px] text-red-ink">Đã ghi lại và báo gia đình, Quản lý.</div>}
            </div>
            <ErrorText error={checkOut.error} />
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ S3
export function StaffElderly() {
  const me = useMe();
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["s-elderly", me.id], queryFn: () => staff.elderlyToday(me) });
  return (
    <Page title="Cụ hôm nay" sub="Chỉ cụ đã check-in và được giao cho bạn (BR-33)">
      {isLoading ? <Loading /> : !data?.length ? <Card><EmptyState icon={Users} title="Chưa có cụ nào check-in" /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((r) => (
            <button key={r.elderly.id} onClick={() => nav(`/staff/elderly/${r.elderly.id}`)} className="rounded-xl bg-white p-4 text-left shadow-[0_2px_6px_rgba(18,35,89,0.06)] hover:ring-2 hover:ring-orange-line">
              <div className="flex items-start justify-between gap-2">
                <ElderlyCell e={r.elderly} size={40} />
                {r.alerts > 0 && <Badge tone="red"><HeartPulse size={11} />{r.alerts}</Badge>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1"><TierBadge tier={r.sub?.tier} /><GroupBadge group={r.elderly.targetGroup} />{r.restricted > 0 && <Badge tone="orange">⚠ {r.restricted} dịch vụ không dùng</Badge>}<AttBadge a={r.a} /></div>
              <div className="mt-2 text-[11px] text-subtle">Việc đã xong {r.progress}%</div>
              <Progress value={r.progress} />
              <div className="mt-1.5 text-[11px]">{r.day?.status === "CLOSED" ? <Badge tone="green">Đã chốt</Badge> : <Badge tone="gray">Đang mở</Badge>}</div>
            </button>
          ))}
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ S4 + S5
const QUICK: [EntryKindUI, typeof Utensils, string][] = [["MEAL", Utensils, "Ăn uống"], ["HYGIENE", Bath, "Vệ sinh"], ["ACTIVITY", Activity, "Hoạt động"], ["NAP", Moon, "Nghỉ trưa"], ["MOOD", Smile, "Tâm trạng"], ["PHOTO", Camera, "Ảnh"]];
export function StaffCareLog() {
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useParams().id);
  const [tab, setTab] = useState<"tasks" | "timeline">("tasks");
  const [kind, setKind] = useState<EntryKindUI>();
  const [vitals, setVitals] = useState(false);
  const [incident, setIncident] = useState(false);
  const [skip, setSkip] = useState<number>();
  const [reason, setReason] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["s-cl", id], queryFn: () => staff.careLog(me, id) });
  const meds = useQuery({ queryKey: ["s-meds", me.id], queryFn: () => staff.meds(me), enabled: lookups.position(me.id) === "NURSE" });
  const inv = () => qc.invalidateQueries();
  const setTask = useMutation({ mutationFn: ({ t, s, r }: { t: number; s: "DONE" | "SKIPPED" | "TODO"; r?: string }) => staff.setTask(me, t, s, r), onSuccess: () => { inv(); setSkip(undefined); setReason(""); } });
  const close = useMutation({ mutationFn: () => staff.closeLog(me, id), onSuccess: inv });
  if (isLoading) return <Page title="Care log" back="/staff/elderly"><Loading /></Page>;
  if (!data) return <Page title="Care log" back="/staff/elderly"><ErrorText error={error} /></Page>;
  const e = data.elderly;
  const nurse = lookups.position(me.id) === "NURSE";
  const closed = data.day?.status === "CLOSED";
  const photoLimit = data.entitlement?.photoPerDay;
  const acts = [...new Set([...data.choices.map((c) => c.name), "Dưỡng sinh, khởi động khớp", "Thư giãn tự do"])];
  const done = data.tasks.filter((t) => t.status !== "TODO").length;
  return (
    <Page title={`Care log · ${e.fullName}`} back="/staff/elderly" sub={`${weekday(TODAY)} ${dmy(TODAY)}`}>
      <Card>
        <div className="flex flex-wrap items-start gap-4">
          <ElderlyCell e={e} size={52} />
          <div className="flex flex-wrap gap-1"><TierBadge tier={data.sub?.tier} /><GroupBadge group={e.targetGroup} /><AttBadge a={data.a} /></div>
          <span className="ml-auto text-right">{closed ? <Badge tone="green">Đã chốt · {data.closer?.fullName} {hm(data.day?.closedAt)}</Badge> : <Badge tone="orange">Đang mở</Badge>}</span>
        </div>
        <div className="mt-3 grid gap-x-6 text-[12px] sm:grid-cols-2 lg:grid-cols-3">
          <KV label="Dị ứng" w={90}>{e.allergies.join(", ") || "Không"}</KV>
          <KV label="Chế độ ăn" w={90}>{e.diet || "Bình thường"}</KV>
          <KV label="Giường" w={90}>{data.bed?.code ?? "—"}</KV>
          <KV label="Bệnh nền" w={90}>{e.conditions.join(", ") || "Không"}</KV>
          <KV label="Ghi chú" w={90}>{e.careNote || "—"}</KV>
          <KV label="Ảnh hôm nay" w={90}>{data.photos}/{photoLimit ?? "∞"}</KV>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {data.permissions.map((p) => <Badge key={p.serviceId} tone={p.allowed ? "green" : "red"}>{p.allowed ? "✓" : "✗"} {p.service?.name}</Badge>)}
          {data.belongings.map((b) => <Badge key={b.id} tone="gray">Đồ gửi: {b.item}</Badge>)}
        </div>
        {e.targetGroup && GROUP_INFO[e.targetGroup].care.length > 0 && <Note className="mt-2">Chăm sóc riêng nhóm: {GROUP_INFO[e.targetGroup].care.join(" · ")}. Hạn chế: {GROUP_INFO[e.targetGroup].limits}.</Note>}
      </Card>
      {!closed && data.a?.status === "PRESENT" && (
        <div className="flex flex-wrap gap-2">
          {QUICK.map(([k, Icon, l]) => <Button key={k} variant="neutral" icon={Icon} disabled={k === "PHOTO" && photoLimit !== null && photoLimit !== undefined && data.photos >= photoLimit} onClick={() => setKind(k)}>{l}</Button>)}
          <Button variant="outline" icon={NotebookPen} onClick={() => setKind("NOTE")}>Ghi lưu ý / bất thường</Button>
          {nurse && <><Button variant="ai" icon={Activity} onClick={() => setVitals(true)}>Đo chỉ số</Button><Button variant="danger" icon={TriangleAlert} onClick={() => setIncident(true)}>Sự cố</Button></>}
          {!nurse && <Button variant="danger" icon={TriangleAlert} onClick={() => setIncident(true)}>Báo nhanh sự cố</Button>}
        </div>
      )}
      <Tabs value={tab} onChange={setTab} items={[{ value: "tasks", label: `Việc hôm nay (${done}/${data.tasks.length})` }, { value: "timeline", label: `Dòng thời gian (${data.entries.length})` }]} />
      {tab === "tasks" && (
        <Card>
          <ul className="divide-y divide-line-soft">
            {data.tasks.map((t) => {
              const mine = (t.owner === "NURSE") === nurse;
              const dose = meds.data?.find((m) => m.dose.elderlyId === id && m.dose.time === t.time && t.type === "MEDICATION");
              return (
                <li key={t.id} className={cn("flex flex-wrap items-center gap-2 py-2", !mine && "opacity-60")}>
                  <span className={cn("w-12 text-[12px] font-semibold", t.status === "TODO" && t.time < NOW ? "text-red-ink" : "text-navy")}>{t.time}</span>
                  <span className="min-w-0 flex-1 text-[12.5px]">{t.title}<span className="ml-1.5"><Badge tone={t.owner === "NURSE" ? "teal" : "blue"}>{t.owner === "NURSE" ? "Điều dưỡng" : "Hộ lý"}</Badge></span>{t.skipReason && <span className="block text-[11px] text-amber-ink">Bỏ qua: {t.skipReason}</span>}</span>
                  {t.status === "DONE" ? <Badge tone="green">Đã làm {t.doneAt} · {t.by?.fullName}</Badge> : t.status === "SKIPPED" ? <Badge tone="orange">Bỏ qua</Badge> : mine && !closed && data.a?.status === "PRESENT" ? (
                    dose ? <DoseButtons doseId={dose.dose.id} /> : t.type === "VITALS" || t.type === "GLUCOSE" ? <Button size="sm" variant="ai" onClick={() => setVitals(true)}>Đo</Button> : t.type === "CHECKOUT" ? <Button size="sm" variant="outline" icon={DoorOpen} to="/staff/checkin">Check-out</Button> : (
                      <span className="flex gap-1">
                        <Button size="sm" variant="success" icon={CircleCheck} onClick={() => setTask.mutate({ t: t.id, s: "DONE" })}>Đã làm</Button>
                        <Button size="sm" variant="neutral" onClick={() => setSkip(t.id)}>Bỏ qua</Button>
                      </span>
                    )
                  ) : <Badge tone="gray">Chưa làm</Badge>}
                </li>
              );
            })}
          </ul>
          <ErrorText error={setTask.error} />
        </Card>
      )}
      {tab === "timeline" && <Card><Timeline entries={data.entries} showStaff /></Card>}
      {!closed && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex-1 text-[12px] text-muted">Hộ lý phụ trách chính chốt care log khi trả cụ, sau khi điều dưỡng ghi xong chỉ số và thuốc. Hệ thống kiểm tra việc còn thiếu (CL-06).</span>
            <Button icon={Lock} disabled={e.caregiverId !== me.id} loading={close.isPending} onClick={() => close.mutate()}>Chốt care log</Button>
          </div>
          <ErrorText error={close.error} />
        </Card>
      )}
      <EntryModal key={kind} kind={kind} elderly={e} activities={acts} photoInfo={`${data.photos}/${photoLimit ?? "không giới hạn"} ảnh hôm nay`} onClose={() => setKind(undefined)} />
      <VitalsModal open={vitals} onClose={() => setVitals(false)} elderly={e} thresholds={data.thresholds} diabetic={e.conditions.some((c) => c.includes("Tiểu đường"))} />
      {incident && <IncidentModal open onClose={() => setIncident(false)} elderlyOptions={[e]} defaultElderly={e.id} />}
      <Modal open={!!skip} onClose={() => setSkip(undefined)} title="Bỏ qua việc" footer={<><Button variant="neutral" onClick={() => setSkip(undefined)}>Hủy</Button><Button loading={setTask.isPending} onClick={() => setTask.mutate({ t: skip!, s: "SKIPPED", r: reason })}>Bỏ qua</Button></>}>
        <TextArea label="Lý do (bắt buộc, CL-02)" value={reason} onChange={(ev) => setReason(ev.target.value)} />
        <div className="mt-2 flex flex-wrap gap-1.5">{["Cụ mệt, xin nghỉ", "Cụ từ chối", "Thiết bị đang hỏng", "Đang ở phòng y tế"].map((r) => <Chip key={r} onClick={() => setReason(r)}>{r}</Chip>)}</div>
        <ErrorText error={setTask.error} />
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ S6
export function StaffGroupLog() {
  const me = useMe();
  const qc = useQueryClient();
  const [kind, setKind] = useState<"MEAL" | "ACTIVITY">("MEAL");
  const [title, setTitle] = useState("Bữa trưa");
  const [def, setDef] = useState<string>("Hết");
  const [over, setOver] = useState<Record<number, string>>({});
  const [skip, setSkip] = useState<number[]>([]);
  const { data, isLoading } = useQuery({ queryKey: ["s-elderly", me.id], queryFn: () => staff.elderlyToday(me) });
  const present = (data ?? []).filter((r) => r.a?.status === "PRESENT");
  const opts = kind === "MEAL" ? MEAL_AMOUNTS : PARTICIPATION;
  const save = useMutation({
    mutationFn: () => staff.groupLog(me, { kind, title, rows: present.filter((r) => !skip.includes(r.elderly.id)).map((r) => ({ elderlyId: r.elderly.id, detail: kind === "MEAL" ? `Ăn ${over[r.elderly.id] ?? def} · 1 cốc nước` : `${over[r.elderly.id] ?? def} · 30 phút` })) }),
    onSuccess: () => { qc.invalidateQueries(); setOver({}); setSkip([]); },
  });
  return (
    <Page title="Ghi nhanh cả nhóm" sub="Chọn bữa hoặc hoạt động; danh sách cụ có mặt tích sẵn với giá trị mặc định; sửa riêng từng cụ (S6).">
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={kind === "MEAL"} onClick={() => { setKind("MEAL"); setTitle("Bữa trưa"); setDef("Hết"); }}>Bữa ăn</Chip>
          <Chip active={kind === "ACTIVITY"} onClick={() => { setKind("ACTIVITY"); setTitle("Âm nhạc, hát nhẹ"); setDef("Có tham gia"); }}>Hoạt động nhóm</Chip>
          <SelectField label={kind === "MEAL" ? "Bữa" : "Hoạt động"} value={title} onChange={(e) => setTitle(e.target.value)} className="w-64">
            {(kind === "MEAL" ? ["Bữa sáng", "Bữa trưa", "Bữa xế"] : ["Dưỡng sinh, khởi động khớp", "Thể dục trên ghế", "Đọc báo, kể chuyện nhóm", "Cắm hoa đơn giản", "Âm nhạc, hát nhẹ", "Cờ tướng, cờ caro", "Đi bộ có người dìu"]).map((x) => <option key={x}>{x}</option>)}
          </SelectField>
          <span className="text-[11.5px] text-subtle">Mặc định:</span>
          {opts.map((o) => <Chip key={o} active={def === o} onClick={() => setDef(o)}>{o}</Chip>)}
        </div>
      </Card>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={present} rowKey={(r) => r.elderly.id} empty="Chưa có cụ nào đang ở trung tâm" columns={[
            { key: "c", header: "", render: (r) => <input type="checkbox" checked={!skip.includes(r.elderly.id)} onChange={(e) => setSkip(e.target.checked ? skip.filter((x) => x !== r.elderly.id) : [...skip, r.elderly.id])} /> },
            { key: "e", header: "Cụ", render: (r) => <ElderlyCell e={r.elderly} sub={<GroupBadge group={r.elderly.targetGroup} />} /> },
            { key: "v", header: kind === "MEAL" ? "Lượng ăn" : "Mức tham gia", render: (r) => <span className="flex flex-wrap gap-1">{opts.map((o) => <button key={o} onClick={() => setOver({ ...over, [r.elderly.id]: o })} className={cn("rounded-full px-2 py-0.5 text-[11px]", (over[r.elderly.id] ?? def) === o ? "bg-navy text-white" : "bg-canvas text-muted")}>{o}</button>)}</span> },
            { key: "n", header: "Lưu ý", render: (r) => r.elderly.targetGroup === "STROKE" ? <Badge tone="red">Ăn mềm, hỗ trợ</Badge> : r.elderly.diet && r.elderly.diet !== "Bình thường" ? <span className="text-[11px] text-subtle">{r.elderly.diet}</span> : null },
          ]} />
        )}
        <div className="mt-3 flex items-center gap-2"><Button icon={CircleCheck} disabled={!present.length} loading={save.isPending} onClick={() => save.mutate()}>Lưu cho {present.length - skip.length} cụ</Button>{save.isSuccess && <Badge tone="green">Đã lưu {save.data} cụ, gia đình đã nhận thông báo</Badge>}</div>
        <ErrorText error={save.error} />
      </Card>
    </Page>
  );
}
