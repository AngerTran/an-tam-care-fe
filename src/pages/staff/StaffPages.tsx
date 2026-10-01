import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Camera, CircleCheck, MessageCircle, Pencil, Phone, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { lookups, manager, staff, TODAY } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, KV, Loading, Note, Photo, SelectField, Table, TextArea, Toggle, cn } from "../../components/ui";
import { addDays, age, dm, dmy, weekday } from "../../lib/format";
import type { CareLog } from "../../types/models";
import { attBadge } from "../manager/ManagerCore";
import { CUR_WEEK, NEXT_WEEK } from "../manager/ManagerOps";

// ------------------------------------------------------------------ ST-01 attendance
export function StaffAttendancePage() {
  const me = useMe();
  const qc = useQueryClient();
  const [all, setAll] = useState(false);
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["s-elderly", all], queryFn: () => (all ? staff.allElderly(me) : staff.myElderly(me)) });
  const inM = useMutation({ mutationFn: (id: number) => staff.checkIn(me, id), onSuccess: () => qc.invalidateQueries() });
  const outM = useMutation({ mutationFn: (id: number) => staff.checkOut(me, id), onSuccess: () => qc.invalidateQueries() });
  const rows = (data ?? []).filter((r) => r.elderly.fullName.toLowerCase().includes(q.toLowerCase()));
  const arrived = rows.filter((r) => r.a?.status === "PRESENT" || r.a?.status === "LEFT").length;
  return (
    <Page title="Điểm danh hôm nay">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-60 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5"><Search size={14} className="text-subtle" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm người cao tuổi" className="min-w-0 flex-1 text-[12.5px] outline-none" /></label>
        <Chip active={!all} onClick={() => setAll(false)}>Của tôi</Chip>
        <Chip active={all} onClick={() => setAll(true)}>Tất cả (chỉ xem)</Chip>
        <span className="ml-auto text-[12px] text-muted">Đã đến {arrived}/{rows.length}</span>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table rows={rows} rowKey={(r) => r.elderly.id} columns={[
            { key: "n", header: "Người cao tuổi", render: (r) => r.elderly.assignedStaffId === me.id ? <Link to={`/staff/elderly/${r.elderly.id}`} className="flex items-center gap-2 hover:text-orange"><Avatar name={r.elderly.fullName} size={26} />{r.elderly.fullName}</Link> : <span className="flex items-center gap-2"><Avatar name={r.elderly.fullName} size={26} />{r.elderly.fullName}</span> },
            { key: "p", header: "Gói", render: (r) => lookups.pkg(r.reg?.packageId)?.name ?? "—" },
            { key: "i", header: "Giờ đến", render: (r) => r.a?.checkIn ?? "—" },
            { key: "o", header: "Giờ về", render: (r) => r.a?.checkOut ?? "—" },
            { key: "s", header: "Trạng thái", render: (r) => { const [t, l] = attBadge(r.a, !!r.absence && !r.a?.checkIn); return <Badge tone={t}>{l}</Badge>; } },
            { key: "a", header: "Thao tác", render: (r) => r.elderly.assignedStaffId !== me.id ? <span className="text-[11px] text-subtle">Không phụ trách</span> : r.absence && !r.a?.checkIn ? <span className="text-[11px] text-subtle">Gia đình đã báo</span> : r.a?.status === "PRESENT" ? <Button size="sm" variant="outline" onClick={() => outM.mutate(r.elderly.id)}>Check-out</Button> : r.a?.status === "LEFT" ? <span className="text-[11px] text-subtle">Đã về</span> : <Button size="sm" onClick={() => inM.mutate(r.elderly.id)}>Check-in</Button> },
          ]} />
        )}
      </Card>
      <Note>Check-in / check-out gửi thông báo ngay cho gia đình qua ứng dụng.</Note>
    </Page>
  );
}

// ------------------------------------------------------------------ ST-02 today schedule & menu
export function StaffTodayPage() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["s-today"], queryFn: () => staff.today(me) });
  const now = "10:30";
  return (
    <Page title={`Lịch & thực đơn · ${dmy(TODAY)}`}>
      {isLoading || !data ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card title="Hoạt động hôm nay">
            <div className="space-y-2">
              {data.items.map((i) => {
                const st = i.endTime <= now ? ["green", "Xong"] : i.startTime <= now ? ["orange", "Đang diễn ra"] : ["blue", "Sắp tới"];
                return (
                  <div key={i.id} className="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5">
                    <span className="w-12 font-bold text-navy">{i.startTime}</span>
                    <div className="flex-1"><div className="text-[13px] font-semibold text-navy">{i.service.name}</div><div className="text-[11px] text-subtle">{i.location}</div></div>
                    <Badge tone={st[0] as "green"}>{st[1]}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card title="Thực đơn & lưu ý ăn kiêng">
            {data.menu && (
              <div className="space-y-1.5 text-[12.5px]">
                <div><b>Sáng</b> · {data.menu.breakfast}</div>
                <div><b>Trưa</b> · {data.menu.lunch}</div>
                <div><b>Xế</b> · {data.menu.snack}</div>
              </div>
            )}
            <div className="mt-3 border-t border-line-soft pt-2 text-[12.5px] font-semibold text-navy">Lưu ý đặc biệt (người bạn phụ trách)</div>
            <div className="mt-1.5 space-y-1.5">{data.notes.map((n) => <div key={n.elderly.id} className="flex flex-wrap items-center gap-2 text-[12px]"><Badge tone="red">{n.elderly.fullName}</Badge><span className="text-muted">{n.note}</span></div>)}</div>
          </Card>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ ST-03 write care log
const COND: [CareLog["generalCondition"], string][] = [["GOOD", "Tốt"], ["NORMAL", "Bình thường"], ["TIRED", "Mệt"]];
export function CareLogFormPage() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const mine = useQuery({ queryKey: ["s-elderly", false], queryFn: () => staff.myElderly(me) });
  const svc = useQuery({ queryKey: ["m-services"], queryFn: () => manager.services(me) });
  const [eid, setEid] = useState<number>(Number(sp.get("elderly")) || 0);
  useEffect(() => {
    const fromUrl = Number(sp.get("elderly"));
    if (fromUrl) setEid(fromUrl);
  }, [sp]);
  const elderlyId = eid || mine.data?.[0]?.elderly.id || 0;
  const existing = useQuery({ queryKey: ["s-log", elderlyId], queryFn: () => staff.log(me, elderlyId), enabled: !!elderlyId });
  const [f, setF] = useState({ generalCondition: "GOOD" as CareLog["generalCondition"], bloodPressure: "", temperature: "", lunch: "", note: "", flag: false, issueNote: "", serviceIds: [] as number[], photos: 0 });
  useEffect(() => {
    const l = existing.data;
    if (l) setF({ generalCondition: l.log.generalCondition, bloodPressure: l.log.bloodPressure ?? "", temperature: l.log.temperature ?? "", lunch: l.log.lunch ?? "", note: l.log.note, flag: l.log.issueStatus !== "NONE", issueNote: l.log.issueNote ?? "", serviceIds: l.serviceIds, photos: l.photos });
    else setF((x) => ({ ...x, bloodPressure: "", temperature: "", lunch: "", note: "", flag: false, issueNote: "", serviceIds: [], photos: 0 }));
  }, [existing.data, elderlyId]);
  const save = useMutation({ mutationFn: () => staff.createLog(me, { elderlyId, ...f }), onSuccess: () => { qc.invalidateQueries(); nav("/staff/care-logs"); } });
  const elderly = mine.data?.find((m) => m.elderly.id === elderlyId)?.elderly;
  const options = (svc.data ?? []).filter((s) => s.service.status === "ACTIVE" && s.service.type !== "MEAL");
  return (
    <Page title={`Ghi nhật ký · ${elderly?.fullName ?? ""}`}>
      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        <Card>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_140px]">
              <SelectField label="Người cao tuổi" value={elderlyId} onChange={(e) => setEid(Number(e.target.value))}>{mine.data?.map((m) => <option key={m.elderly.id} value={m.elderly.id}>{m.elderly.fullName}</option>)}</SelectField>
              <Field label="Ngày" value={dmy(TODAY)} readOnly />
            </div>
            {elderly && elderly.healthTags.length > 0 && <div className="flex flex-wrap gap-1">{elderly.healthTags.map((t) => <Badge key={t} tone="red">{t}</Badge>)}</div>}
            <div>
              <div className="mb-1 text-[11px] text-subtle">Tình trạng chung</div>
              <div className="flex gap-1.5">{COND.map(([v, l]) => <Chip key={v} active={f.generalCondition === v} onClick={() => setF({ ...f, generalCondition: v })}>{l}</Chip>)}</div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Huyết áp" placeholder="125/80" value={f.bloodPressure} onChange={(e) => setF({ ...f, bloodPressure: e.target.value })} />
              <Field label="Nhiệt độ" placeholder="36,7°C" value={f.temperature} onChange={(e) => setF({ ...f, temperature: e.target.value })} />
              <Field label="Ăn trưa" placeholder="3/4 suất" value={f.lunch} onChange={(e) => setF({ ...f, lunch: e.target.value })} />
            </div>
            <div>
              <div className="mb-1 text-[11px] text-subtle">Hoạt động / dịch vụ đã tham gia</div>
              <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o.service.id} active={f.serviceIds.includes(o.service.id)} onClick={() => setF({ ...f, serviceIds: f.serviceIds.includes(o.service.id) ? f.serviceIds.filter((x) => x !== o.service.id) : [...f.serviceIds, o.service.id] })}>{f.serviceIds.includes(o.service.id) ? "✓ " : ""}{o.service.name}</Chip>)}</div>
            </div>
            <TextArea label="Ghi chú" required value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          </div>
        </Card>
        <Card title="Ảnh trong ngày" className="h-fit">
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: f.photos }, (_, i) => <Photo key={i} tone={(["blue", "orange", "green"] as const)[i % 3]} />)}
            <button onClick={() => setF({ ...f, photos: f.photos + 1 })} className="flex aspect-[4/3] items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-input-line text-subtle hover:text-orange" aria-label="Thêm ảnh"><Camera size={18} /></button>
          </div>
          <div className="mt-3"><Toggle checked={f.flag} onChange={(v) => setF({ ...f, flag: v })} label="Đánh dấu cần lưu ý" sub="Báo quản lý trung tâm" /></div>
          {f.flag && <Field className="mt-2" label="Nội dung lưu ý" placeholder="Vd: Huyết áp 160/95" value={f.issueNote} onChange={(e) => setF({ ...f, issueNote: e.target.value })} />}
          <Note className="mt-3">Gia đình chỉ thấy nhật ký của người thân mình.</Note>
          <ErrorText error={save.error} />
          <Button className="mt-3" block icon={CircleCheck} disabled={!f.note || !elderlyId} loading={save.isPending} onClick={() => save.mutate()}>Lưu nhật ký</Button>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ ST-07 my care logs
export function StaffLogsPage() {
  const me = useMe();
  const [f, setF] = useState<"TODAY" | "WEEK" | "FLAG">("TODAY");
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["s-logs"], queryFn: () => staff.myLogs(me) });
  const rows = (data ?? []).filter((r) => (f === "TODAY" ? r.log.date === TODAY : f === "FLAG" ? r.log.issueStatus !== "NONE" : r.log.date >= addDays(TODAY, -6)) && r.elderly.fullName.toLowerCase().includes(q.toLowerCase()));
  return (
    <Page title="Nhật ký đã ghi" actions={<Button className="ml-auto" icon={Plus} to="/staff/care-log">Ghi nhật ký mới</Button>}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 w-60 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5"><Search size={14} className="text-subtle" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm người cao tuổi…" className="min-w-0 flex-1 text-[12.5px] outline-none" /></label>
        {([["TODAY", "Hôm nay"], ["WEEK", "Tuần này"], ["FLAG", "Có lưu ý"]] as const).map(([v, l]) => <Chip key={v} active={f === v} onClick={() => setF(v)}>{l}</Chip>)}
      </div>
      <Card>
        {isLoading ? <Loading /> : rows.length === 0 ? <EmptyState icon={BookOpen} title="Chưa có nhật ký" action={<Button icon={Plus} to="/staff/care-log">Ghi nhật ký</Button>} /> : (
          <Table rows={rows} rowKey={(r) => r.log.id} columns={[
            { key: "d", header: "Ngày", render: (r) => dm(r.log.date) },
            { key: "n", header: "Người cao tuổi", render: (r) => <span className="flex items-center gap-2"><Avatar name={r.elderly.fullName} size={24} />{r.elderly.fullName}</span> },
            { key: "c", header: "Tình trạng", render: (r) => COND.find((c) => c[0] === r.log.generalCondition)?.[1] },
            { key: "i", header: "Lưu ý", render: (r) => <Badge tone={r.log.issueNote ? (r.log.issueSeverity === "HIGH" ? "red" : "orange") : "green"}>{r.log.issueNote ?? "Không"}</Badge> },
            { key: "p", header: "Ảnh", render: (r) => r.photos },
            { key: "a", header: "Thao tác", render: (r) => r.log.date === TODAY ? <Button size="sm" variant="outline" icon={Pencil} to={`/staff/care-log?elderly=${r.elderly.id}`}>Sửa</Button> : <span className="text-[11px] text-subtle">Chỉ xem</span> },
          ]} />
        )}
      </Card>
      <Note>Chỉ sửa được nhật ký trong ngày. Nhật ký các ngày trước chỉ xem.</Note>
    </Page>
  );
}

// ------------------------------------------------------------------ ST-04 my shifts
export function MyShiftsPage() {
  const me = useMe();
  const [start, setStart] = useState(NEXT_WEEK);
  const dates = Array.from({ length: 6 }, (_, i) => addDays(start, i));
  const { data, isLoading } = useQuery({ queryKey: ["s-shifts", start], queryFn: () => staff.myShifts(me, dates) });
  const mineEl = useQuery({ queryKey: ["s-elderly", false], queryFn: () => staff.myElderly(me) });
  const hours = (data ?? []).reduce((s, x) => s + (Number(x.endTime.slice(0, 2)) - Number(x.startTime.slice(0, 2))), 0);
  return (
    <Page title={`Ca làm của tôi · Tuần ${dm(dates[0])} – ${dm(dates[5])}`}>
      <div className="flex gap-1.5"><Chip active={start === CUR_WEEK} onClick={() => setStart(CUR_WEEK)}>Tuần này</Chip><Chip active={start === NEXT_WEEK} onClick={() => setStart(NEXT_WEEK)}>Tuần sau</Chip></div>
      <Note>Chỉ xem. Ca do Quản lý trung tâm xếp và duyệt, nhân viên không tự đổi ca.</Note>
      <Card>
        {isLoading ? <Loading /> : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
            {dates.map((d) => {
              const s = data?.filter((x) => x.date === d) ?? [];
              return (
                <div key={d} className="rounded-xl bg-canvas p-2 text-center">
                  <div className="text-[10.5px] font-semibold text-subtle uppercase">{weekday(d)} {dm(d)}</div>
                  {s.length === 0 ? <div className="py-3 text-[12px] text-faint">Nghỉ</div> : s.map((x) => <div key={x.id} className={cn("mt-1.5 rounded-lg px-2 py-2.5 text-[12px] font-semibold", x.label === "Cả ngày" ? "bg-[#dbe5f5] text-blue" : "bg-green-soft text-green-ink")}>{x.label} {x.startTime}–{x.endTime}</div>)}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Người cao tuổi phụ trách">
          <div className="text-[12px] text-muted">{mineEl.data?.length ?? 0} người</div>
          <div className="mt-2 flex flex-wrap gap-1.5">{mineEl.data?.map((m) => <Link key={m.elderly.id} to={`/staff/elderly/${m.elderly.id}`}><Chip>{m.elderly.fullName}</Chip></Link>)}</div>
        </Card>
        <Card title="Tổng kết tuần">
          <div className="flex gap-3"><div className="flex-1 rounded-xl bg-canvas p-3"><div className="text-2xl font-bold text-navy">{data?.length ?? 0}</div><div className="text-[11px] text-subtle">ca</div></div><div className="flex-1 rounded-xl bg-canvas p-3"><div className="text-2xl font-bold text-navy">{hours}h</div><div className="text-[11px] text-subtle">giờ làm</div></div></div>
        </Card>
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ ST-06 elderly profile (read-only)
export function StaffElderlyPage() {
  const me = useMe();
  const id = Number(useParams().id);
  const { data, isLoading, error } = useQuery({ queryKey: ["s-profile", id], queryFn: () => staff.profile(me, id) });
  if (isLoading) return <Page title="Hồ sơ chăm sóc" back="/staff"><Loading /></Page>;
  if (!data) return <Page title="Hồ sơ chăm sóc" back="/staff"><ErrorText error={error} /></Page>;
  const e = data.elderly;
  const [tone, label] = attBadge(data.a);
  return (
    <Page title={`Hồ sơ chăm sóc · ${e.fullName}`} back="/staff">
      <div className="grid gap-4 lg:grid-cols-[270px_1fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Avatar name={e.fullName} size={60} />
              <div className="text-[16px] font-bold text-navy">{e.fullName}</div>
              <div className="text-[11.5px] text-subtle">{age(e.dateOfBirth)} tuổi · {e.gender} · {dmy(e.dateOfBirth)}</div>
              <Badge tone={tone}>{label}{data.a?.checkIn ? ` · ${data.a.checkIn}` : ""}</Badge>
            </div>
            <div className="mt-3 border-t border-line-soft pt-2"><KV label="Gói" w={70}>{data.pkg?.name ?? "—"}</KV><KV label="Phụ trách" w={70}>{me.fullName} (bạn)</KV></div>
          </Card>
          <Card title="Liên hệ khẩn cấp">
            <div className="text-[12.5px] font-semibold">{e.emergencyContactName} · {e.emergencyContactRelationship}</div>
            <Button className="mt-2" size="sm" variant="outline" icon={Phone}>Gọi {e.emergencyContactPhone}</Button>
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Lưu ý chăm sóc" className="bg-[#fffafa]">
            <div className="flex flex-wrap gap-1">{e.healthTags.map((t) => <Badge key={t} tone="red">{t}</Badge>)}</div>
            <p className="mt-2 text-[12.5px] text-muted">{e.careNote}</p>
          </Card>
          <Card title="Hôm nay">
            <Table rows={data.today} rowKey={(s) => s.id} columns={[
              { key: "t", header: "Giờ", render: (s) => s.startTime },
              { key: "a", header: "Hoạt động", render: (s) => s.service.name },
              { key: "l", header: "Địa điểm", render: (s) => s.location },
            ]} />
          </Card>
          {data.lastLog && <Card title="Nhật ký gần nhất"><KV label={dm(data.lastLog.date)} w={60}>{data.lastLog.note}</KV></Card>}
          <div className="flex gap-2">
            <Button icon={BookOpen} to={`/staff/care-log?elderly=${e.id}`}>Ghi nhật ký hôm nay</Button>
            <Button variant="neutral" icon={MessageCircle} to={`/staff/messages?to=${e.familyUserId}`}>Nhắn gia đình</Button>
          </div>
          <Note>Chỉ xem. Hồ sơ do Quản lý trung tâm cập nhật.</Note>
        </div>
      </div>
    </Page>
  );
}
