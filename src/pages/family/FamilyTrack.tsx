// Family · following the elderly: G1 today, G2 day summary, G3 health, G4 alerts & incidents, G5 medication,
// schedule & menu, belongings, chatbot, G6 notification settings.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, BedDouble, Camera, ClipboardList, Clock, HeartPulse, Lock, MessageCircle, Moon, Pill, Plus, Smile, Utensils } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { family, NOW, TODAY, useLiveRefresh } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { AttBadge, ElderlyPicker, GroupBadge, Stat, SubBadge, TierBadge, Timeline, useFamilyElderly } from "../../components/domain";
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorText, Field, KV, Loading, Modal, Note, Photo, SelectField, Table, Tabs, TextArea, Toggle, cn } from "../../components/ui";
import { CYCLE_LABEL, isDayCycle, TIER_LABEL, tierHasBreakfast } from "../../domain/catalog";
import type { HealthMetric } from "../../types/models";
import { addDays, daysBetween, dm, dmy, hm, weekday } from "../../lib/format";
import { INC_TYPE, LEVEL, SEVERITY } from "../manager/ManagerOps";
import { ChatWidget } from "../public/PublicHome";
import { GroupBlocks, SCREEN } from "../staff/CareLogScreens";

function NoElderly() {
  return <Card><EmptyState icon={ClipboardList} title="Chưa có cụ nào đang đi" desc="Thêm hồ sơ người thân và đăng ký gói. Sau buổi đánh giá và thanh toán, bạn sẽ theo dõi cụ tại đây." action={<><Button to="/family/relatives/new" icon={Plus}>Thêm người thân</Button><Button variant="outline" to="/family/register">Đăng ký gói</Button></>} /></Card>;
}

/** Liều chưa ghi: còn trước giờ uống thì "Chưa tới giờ", đã qua giờ thì "Chưa ghi nhận". */
const pendingLabel = (date: string, time: string) =>
  date < TODAY ? "Không có ghi nhận" : date > TODAY || time > NOW ? "Chưa tới giờ" : "Chưa ghi nhận";
/** Màu nhãn liều: đã uống xanh, còn chờ trong hôm nay xám, ngày đã qua mà không ai ghi / từ chối / thiếu thuốc cam. */
const doseTone = (d: { status: string; date: string }) => (d.status === "GIVEN" ? "green" : d.status === "PENDING" && d.date >= TODAY ? "gray" : "orange");

// ------------------------------------------------------------------ G1
type FamilyTab = "overview" | "vitals" | "care" | "timeline";
export function FamilyHome() {
  const me = useMe();
  const fe = useFamilyElderly();
  const { data, isLoading } = useQuery({ queryKey: ["f-home", fe.id], queryFn: () => family.home(me, fe.id!), enabled: !!fe.id });
  useLiveRefresh(fe.id);
  // 4 tab giống màn care log của staff, giữ trên URL (?tab=) để F5 vẫn ở đúng tab
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab: FamilyTab = tabParam === "vitals" || tabParam === "care" || tabParam === "timeline" ? tabParam : "overview";
  const setTab = (v: FamilyTab) => setParams((p) => { if (v === "overview") p.delete("tab"); else p.set("tab", v); return p; }, { replace: true });
  const pending = fe.all.filter((r) => ["PENDING"].includes(r.elderly.status));
  if (fe.isLoading) return <Page title="Hôm nay của cụ"><Loading /></Page>;
  return (
    <Page title="Hôm nay của cụ" sub={`${weekday(TODAY)}, ${dmy(TODAY)}`} actions={<ElderlyPicker rows={fe.rows} value={fe.id} onChange={fe.pick} />}>
      {pending.map((r) => (
        <Note key={r.elderly.id}>
          <b>{r.elderly.fullName}</b>: <SubBadge status={r.sub?.status} /> {r.sub?.status === "PENDING_ASSESSMENT" && r.assessment?.status === "SCHEDULED" && <>Lịch đánh giá {dmy(r.assessment.scheduledAt.slice(0, 10))} lúc {hm(r.assessment.scheduledAt)}.</>}{r.sub?.status === "AWAITING_PAYMENT" && <> Đã có kết quả đánh giá. <Link to="/family/packages" className="font-semibold text-orange">Xác nhận giá & thanh toán</Link></>}
        </Note>
      ))}
      {fe.id && <Tabs value={tab} onChange={setTab} items={[
        { value: "overview", label: "Tổng quan" },
        { value: "vitals", label: "Chỉ số và thuốc" },
        { value: "care", label: "Chăm sóc riêng" },
        { value: "timeline", label: `Dòng thời gian${data ? ` (${data.entries.length})` : ""}` },
      ]} />}
      {!fe.id ? <NoElderly /> : isLoading || !data ? <Loading /> : tab === "timeline" ? (
        <Card title="Dòng thời gian hôm nay" actions={<span className="text-[11px] text-subtle">Mới nhất ở trên · tự cập nhật khi nhân viên ghi</span>}>
          <Timeline entries={data.entries} />
        </Card>
      ) : tab === "vitals" || tab === "care" ? (
        !data.elderly.targetGroup ? <Note>Cụ chưa được xếp nhóm, chưa có khối chăm sóc riêng.</Note> : (
          <div className="space-y-2">
            {tab === "care" && SCREEN[data.elderly.targetGroup] && <div className="text-[12.5px] text-subtle">Chăm sóc riêng nhóm {SCREEN[data.elderly.targetGroup].tab} · chỉ xem</div>}
            <GroupBlocks ctx={{ ...data, tier: data.sub?.tier }} mode={{ readOnly: true, nurse: false }} section={tab} />
          </div>
        )
      ) : (
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-navy to-blue text-white">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar name={data.elderly.fullName} size={52} tone="orange" />
              <div className="min-w-0 flex-1">
                <div className="text-[18px] font-bold">{data.elderly.gender === "Nữ" ? "Bà" : "Ông"} {data.elderly.fullName}</div>
                <div className="flex flex-wrap gap-1"><TierBadge tier={data.sub?.tier} /><GroupBadge group={data.elderly.targetGroup} /><AttBadge a={data.a} /></div>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-white/10 p-3">
              <div className="text-[11px] tracking-wide text-white/70 uppercase">Cụ đang làm gì</div>
              <div className="text-[20px] font-bold">{data.doing.label}</div>
              {data.doing.since && <div className="text-[12px] text-white/80">từ {data.doing.since}</div>}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-white/85">
              {data.a?.checkIn && <span className="flex items-center gap-1"><Clock size={13} />Đến {data.a.checkIn}{data.checkedInBy ? ` · ${data.checkedInBy.fullName} tiếp nhận` : ""}</span>}
              {data.a?.checkOut && <span>Về {data.a.checkOut}{data.pickup ? ` · ${data.pickup.fullName} đón` : ""}</span>}
              {!data.scheduledToday && <span>Hôm nay không thuộc lịch gói</span>}
            </div>
          </Card>
          {data.sub && daysBetween(TODAY, data.sub.endDate) <= 7 && !isDayCycle(data.sub.cycle) && <Note tone="orange">Gói {CYCLE_LABEL[data.sub.cycle]} hết hạn {dmy(data.sub.endDate)}. <Link to="/family/packages" className="font-semibold">Gia hạn</Link></Note>}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card title="Chỉ số mới nhất" actions={<button className="text-[11.5px] font-semibold text-orange" onClick={() => setTab("vitals")}>Xem chi tiết</button>}>
              {data.latest ? (
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Huyết áp" value={`${data.latest.sys}/${data.latest.dia}`} tone={data.latest.sys! > ((data as { thresholds?: { sysMax: number } }).thresholds?.sysMax ?? 150) ? "red" : "navy"} />
                  <Stat label="Mạch" value={data.latest.pulse ?? "—"} />
                  {data.latest.spo2 && <Stat label="SpO₂" value={`${data.latest.spo2}%`} />}
                  {data.latest.temp && <Stat label="Nhiệt độ" value={`${data.latest.temp}°C`} />}
                </div>
              ) : <div className="text-[12.5px] text-subtle">Chưa đo</div>}
              {data.latest && <div className="mt-1 text-[11px] text-subtle">Lúc {hm(data.latest.at)} {data.latest.at.startsWith(TODAY) ? "hôm nay" : dm(data.latest.at.slice(0, 10))}</div>}
            </Card>
            <Card title={<span className="flex items-center gap-2"><HeartPulse size={16} className="text-red-ink" />Cảnh báo</span>}>
              {data.alerts.length === 0 ? <div className="text-[12.5px] text-subtle">Không có cảnh báo đang mở</div> : data.alerts.map((a) => <div key={a.id} className="py-1 text-[12.5px]"><Badge tone={LEVEL[a.level][0]}>{LEVEL[a.level][1]}</Badge> <b>{a.title}</b><span className="block text-muted">{a.detail}</span></div>)}
            </Card>
            <Card title="Sắp tới hôm nay">
              {!data.therapy.length && !data.next.length && <div className="text-[12.5px] text-subtle">Không còn việc nào trong hôm nay</div>}
              {data.therapy.map((x) => <div key={x.id} className="flex items-center gap-2 py-1 text-[12.5px]"><Badge tone="teal">{x.startTime}</Badge>{x.service?.name}</div>)}
              {data.next.map((x) => <div key={x.id} className="flex items-center gap-2 py-1 text-[12.5px]"><Badge tone="blue">{x.startTime}</Badge>{x.title}</div>)}
            </Card>
            <Card title="Ảnh hôm nay" actions={<span className="text-[11px] text-subtle">{data.photos.length}/{data.entitlement?.photoPerDay ?? "∞"}</span>}>
              <div className="grid grid-cols-2 gap-2">{data.photos.map((p) => <Photo key={p.id} tone={p.tone ?? "blue"} caption={`${p.time} · ${p.detail}`} />)}</div>
              {!data.photos.length && <div className="text-[12.5px] text-subtle">Chưa có ảnh</div>}
            </Card>
            <Card title="Người phụ trách" className="md:col-span-2 xl:col-span-2">
              {[data.nurse && ["Điều dưỡng", data.nurse], data.caregiver && ["Hộ lý", data.caregiver]].filter(Boolean).map((x) => {
                const [l, u] = x as [string, { id: number; fullName: string }];
                return <div key={u.id} className="flex items-center gap-2 py-1"><Avatar name={u.fullName} size={28} tone="teal" /><span className="flex-1 text-[12.5px]"><b>{u.fullName}</b><span className="block text-[11px] text-subtle">{l}</span></span><Button size="sm" variant="outline" icon={MessageCircle} to={`/family/messages?to=${u.id}`}>Nhắn</Button></div>;
              })}
              <Note className="mt-2">Gia đình không bình luận vào care log; nhắn tin với nhân viên phụ trách.</Note>
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ G2
export function FamilySummary() {
  const me = useMe();
  const fe = useFamilyElderly();
  const [date, setDate] = useState(TODAY);
  const { data, isLoading } = useQuery({ queryKey: ["f-sum", fe.id, date], queryFn: () => family.summary(me, fe.id!, date), enabled: !!fe.id });
  const Row = ({ icon: I, title, children }: { icon: typeof Utensils; title: string; children: React.ReactNode }) => <Card title={<span className="flex items-center gap-2"><I size={16} className="text-orange" />{title}</span>}>{children}</Card>;
  return (
    <Page title="Nhật ký các ngày" sub="Chọn ngày để xem lại: ăn uống, hoạt động, chỉ số, thuốc, lưu ý. Hệ thống tự gom số liệu đã ghi, không dùng AI viết tóm tắt." actions={<><ElderlyPicker rows={fe.rows} value={fe.id} onChange={fe.pick} />{data && <SelectField label="Ngày" value={date} onChange={(e) => setDate(e.target.value)} className="w-44">{data.dates.map((d) => <option key={d} value={d}>{weekday(d)} {dmy(d)}</option>)}</SelectField>}</>}>
      {!fe.id ? <NoElderly /> : isLoading || !data ? <Loading /> : (
        <>
          <Card>
            <div className="flex flex-wrap gap-4 text-[12.5px]">
              <span>Đến <b>{data.a?.checkIn ?? "—"}</b></span><span>Về <b>{data.a?.checkOut ?? "—"}</b>{data.pickup ? ` · ${data.pickup.fullName} đón` : ""}</span>
              <span>{data.day?.status === "CLOSED" ? <Badge tone="green">Care log đã chốt</Badge> : <Badge tone="orange">Đang cập nhật</Badge>}</span>
            </div>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Row icon={Utensils} title="Ăn uống">{data.meals.length ? data.meals.map((x) => <KV key={x.id} label={x.title} w={90}>{x.detail}</KV>) : <span className="text-subtle">Chưa ghi</span>}</Row>
            <Row icon={Activity} title={`Hoạt động (${data.activities.length})`}>{data.activities.map((x) => <KV key={x.id} label={x.time} w={50}>{x.title} · {x.detail}</KV>)}</Row>
            <Row icon={Smile} title="Tâm trạng">{data.moods.map((x) => <KV key={x.id} label={x.time} w={50}>{x.detail}</KV>)}{data.naps.map((x) => <KV key={x.id} label={<Moon size={12} />} w={50}>{x.detail}</KV>)}</Row>
            <Row icon={HeartPulse} title="Chỉ số">{data.vitals.map((m) => <KV key={m.id} label={hm(m.at)} w={50}>{[m.sys && `HA ${m.sys}/${m.dia}`, m.pulse && `mạch ${m.pulse}`, m.temp && `${m.temp}°C`, m.spo2 && `SpO₂ ${m.spo2}%`, m.glucose && `ĐH ${m.glucose}`].filter(Boolean).join(" · ")}</KV>)}</Row>
            <Row icon={Pill} title="Thuốc">{data.meds.length ? data.meds.map((m) => <KV key={m.id} label={m.time} w={50}>{m.plan?.name} · <Badge tone={doseTone(m)}>{({ GIVEN: "Đã uống", REFUSED: "Từ chối", MISSING: "Chưa có thuốc", PENDING: pendingLabel(m.date, m.time) })[m.status]}</Badge>{m.reason ? ` ${m.reason}` : ""}</KV>) : <span className="text-subtle">Không có</span>}</Row>
            <Row icon={ClipboardList} title="Lưu ý">{data.notes.length ? data.notes.map((x) => <KV key={x.id} label={x.time} w={50}>{x.title}: {x.detail}</KV>) : <span className="text-subtle">Không có gì bất thường</span>}</Row>
          </div>
          {data.photos.length > 0 && <Card title={<span className="flex items-center gap-2"><Camera size={16} />Ảnh</span>}><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{data.photos.map((p) => <Photo key={p.id} tone={p.tone ?? "blue"} caption={`${p.time} · ${p.detail}`} />)}</div></Card>}
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ G3
type HealthThresholds = { sysMax: number; diaMax: number; spo2Min: number; tempMax: number; glucoseMax: number };
type VitalKey = "sys" | "pulse" | "spo2" | "temp" | "glucose";
/** 1 chỉ số của lần đo có vượt ngưỡng không (tô đỏ đúng ô đó). */
const overField = (k: VitalKey, m: HealthMetric, t: HealthThresholds) =>
  k === "sys" ? m.sys != null && (m.sys > t.sysMax || (m.dia ?? 0) > t.diaMax)
  : k === "spo2" ? m.spo2 != null && m.spo2 < t.spo2Min
  : k === "temp" ? m.temp != null && m.temp > t.tempMax
  : k === "glucose" ? m.glucose != null && m.glucose > t.glucoseMax
  : false;
/** Lần đo có ít nhất 1 chỉ số vượt ngưỡng (để đếm). */
const overVitals = (m: HealthMetric, t: HealthThresholds) => (["sys", "spo2", "temp", "glucose"] as const).some((k) => overField(k, m, t));

/** G3: chỉ số dạng bảng số theo ngày (không biểu đồ) + 3 số tóm tắt + báo cáo tháng. */
export function FamilyHealth() {
  const me = useMe();
  const fe = useFamilyElderly();
  const [range, setRange] = useState<7 | 30>(7);
  const { data, isLoading } = useQuery({ queryKey: ["f-health", fe.id], queryFn: () => family.health(me, fe.id!), enabled: !!fe.id });
  const from = addDays(TODAY, -range);
  const t = data?.thresholds as HealthThresholds | undefined;
  const metrics = (data?.metrics ?? []).filter((m) => m.at >= from);
  // mỗi ngày 1 dòng: lần đo đầu tiên trong ngày của từng chỉ số (thường là buổi sáng), số lần đo trong ngày
  const days = [...new Set(metrics.map((m) => m.at.slice(0, 10)))].sort().reverse().map((d) => {
    const ofDay = metrics.filter((m) => m.at.startsWith(d));
    const first = <K extends keyof HealthMetric>(k: K) => ofDay.find((m) => m[k] != null);
    return { d, count: ofDay.length, bp: first("sys"), pulse: first("pulse"), spo2: first("spo2"), temp: first("temp"), glucose: first("glucose") };
  });
  const bps = metrics.filter((m) => m.sys);
  const avgOf = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined);
  const over = t ? metrics.filter((m) => overVitals(m, t)).length : 0;
  const due = (data?.doses ?? []).filter((x) => x.date >= from && (x.date < TODAY || x.time <= NOW));
  const givenPct = due.length ? Math.round((100 * due.filter((x) => x.status === "GIVEN").length) / due.length) : undefined;
  const hasGlucose = days.some((x) => x.glucose);
  const cell = (k: VitalKey, m: HealthMetric | undefined, text: (m: HealthMetric) => string) =>
    !m ? <span className="text-faint">—</span> : <span className={cn(t && overField(k, m, t) && "font-semibold text-red-ink")}>{text(m)}</span>;
  return (
    <Page title="Sức khỏe" sub="Số đo theo ngày, ô đỏ = vượt ngưỡng của cụ." actions={<ElderlyPicker rows={fe.rows} value={fe.id} onChange={fe.pick} />}>
      {!fe.id ? <NoElderly /> : isLoading || !data ? <Loading /> : (
        <>
          <div className="flex gap-1.5"><Chip active={range === 7} onClick={() => setRange(7)}>7 ngày</Chip><Chip active={range === 30} onClick={() => setRange(30)}>30 ngày</Chip></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label={`Huyết áp trung bình ${range} ngày`} value={bps.length ? `${avgOf(bps.map((m) => m.sys!))}/${avgOf(bps.map((m) => m.dia ?? 0))}` : "—"} />
            <Stat label="Số lần vượt ngưỡng" value={over} tone={over > 0 ? "red" : "green"} />
            <Stat label="Uống thuốc đủ" value={givenPct !== undefined ? `${givenPct}%` : "—"} tone={givenPct === undefined ? "navy" : givenPct >= 90 ? "green" : "orange"} />
          </div>
          <Card title={`Chỉ số ${range} ngày`} actions={t && <span className="text-[11px] text-subtle">Ngưỡng: HA ≤ {t.sysMax}/{t.diaMax} · SpO₂ ≥ {t.spo2Min}% · ĐH ≤ {t.glucoseMax}</span>}>
            <Table rows={days} rowKey={(x) => x.d} empty={`Chưa có số đo trong ${range} ngày`} columns={[
              { key: "d", header: "Ngày", render: (x) => <span>{weekday(x.d)} {dm(x.d)}<span className="block text-[11px] text-subtle">{x.count} lần đo</span></span> },
              { key: "bp", header: "Huyết áp", render: (x) => cell("sys", x.bp, (m) => `${m.sys}/${m.dia}`) },
              { key: "p", header: "Mạch", render: (x) => cell("pulse", x.pulse, (m) => `${m.pulse}`) },
              { key: "s", header: "SpO₂", render: (x) => cell("spo2", x.spo2, (m) => `${m.spo2}%`) },
              { key: "t", header: "Nhiệt độ", render: (x) => cell("temp", x.temp, (m) => `${m.temp}°C`) },
              ...(hasGlucose ? [{ key: "g", header: "Đường huyết", render: (x: (typeof days)[number]) => cell("glucose", x.glucose, (m) => `${m.glucose} mmol/L`) }] : []),
            ]} />
          </Card>
          <Card title="Báo cáo sức khỏe tháng">
            {data.monthlyReport ? <MonthlyReport metrics={data.metrics.filter((m) => m.at >= addDays(TODAY, -30))} /> : <div className="flex items-start gap-2 text-[12.5px] text-subtle"><Lock size={14} className="mt-0.5" />Báo cáo sức khỏe tháng có ở hạng Cao cấp. <Link to="/family/packages" className="font-semibold text-orange">Nâng hạng</Link></div>}
          </Card>
        </>
      )}
    </Page>
  );
}

/** Báo cáo tháng gom từ chỉ số 30 ngày đã đo — không dùng AI. */
function MonthlyReport({ metrics }: { metrics: HealthMetric[] }) {
  const avg = (vals: (number | undefined)[]) => { const v = vals.filter((x): x is number => x != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : undefined; };
  const sys = avg(metrics.map((m) => m.sys));
  const dia = avg(metrics.map((m) => m.dia));
  const glucose = avg(metrics.map((m) => m.glucose));
  const weights = metrics.filter((m) => m.weight);
  if (!metrics.length) return <div className="text-[12.5px] text-subtle">Chưa có số đo trong 30 ngày</div>;
  return (
    <div className="text-[12.5px]">
      <KV label="Số lần đo" w={110}>{metrics.length} lần / 30 ngày</KV>
      {sys && <KV label="HA trung bình" w={110}>{Math.round(sys)}/{Math.round(dia ?? 0)}</KV>}
      {glucose && <KV label="ĐH trung bình" w={110}>{glucose} mmol/L</KV>}
      {weights.length > 1 && <KV label="Cân nặng" w={110}>{weights[0].weight} → {weights[weights.length - 1].weight} kg</KV>}
    </div>
  );
}

// ------------------------------------------------------------------ G4
export function FamilyAlerts() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["f-alerts", me.id], queryFn: () => family.alerts(me) });
  return (
    <Page title="Cảnh báo & sự cố" sub="Cảnh báo theo quyền lợi của hạng; mức khẩn cấp luôn hiện (CL-08).">
      {isLoading || !data ? <Loading /> : (
        <>
          {data.hidden > 0 && <Note>Có {data.hidden} cảnh báo mức thường không gửi gia đình theo hạng Cơ bản. Nâng hạng để nhận đủ cảnh báo AI.</Note>}
          <Card title="Cảnh báo sức khỏe">
            {data.alerts.length === 0 ? <div className="text-[12.5px] text-subtle">Không có</div> : data.alerts.map(({ alert: a, elderly }) => (
              <div key={a.id} className="flex gap-3 border-b border-line-soft py-2.5 last:border-0">
                <Badge tone={LEVEL[a.level][0]}>{LEVEL[a.level][1]}</Badge>
                <div className="flex-1 text-[12.5px]"><b className="text-navy">{elderly?.fullName} · {a.title}</b><div className="text-muted">{a.detail}</div><div className="text-[11px] text-subtle">{dmy(a.at.slice(0, 10))} {hm(a.at)}{a.status === "CLOSED" ? ` · đã xử lý: ${a.result}` : a.status === "IN_PROGRESS" ? " · điều dưỡng đang xử lý" : ""}</div></div>
              </div>
            ))}
          </Card>
          <Card title="Sự cố">
            {data.incidents.length === 0 ? <div className="text-[12.5px] text-subtle">Không có</div> : data.incidents.map(({ incident: i, elderly }) => (
              <div key={i.id} className="border-b border-line-soft py-2.5 text-[12.5px] last:border-0">
                <div className="flex flex-wrap items-center gap-2"><Badge tone={SEVERITY[i.severity][0]}>{INC_TYPE[i.type]}</Badge><b className="text-navy">{elderly?.fullName}</b><span className="text-[11px] text-subtle">{dmy(i.at.slice(0, 10))} {hm(i.at)}</span></div>
                <div className="mt-0.5">{i.description}</div>
                <div className="text-muted">Xử lý: {i.action || "điều dưỡng đang xử lý"}</div>
                {i.transfer && <Note tone="red" className="mt-1">Chuyển viện {i.transfer.hospital} lúc {i.transfer.time} · người đi kèm {i.transfer.escort}. Nếu cụ nằm viện nhiều ngày, gửi giấy nhập viện để bảo lưu gói.</Note>}
              </div>
            ))}
          </Card>
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ G5
export function FamilyMeds() {
  const me = useMe();
  const qc = useQueryClient();
  const fe = useFamilyElderly();
  const [form, setForm] = useState<{ replaceId?: number; name: string; dose: string; times: string; startDate: string; endDate: string; note: string } | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["f-meds", fe.id], queryFn: () => family.meds(me, fe.id!), enabled: !!fe.id });
  const save = useMutation({ mutationFn: () => family.saveMed(me, { elderlyId: fe.id!, name: form!.name, dose: form!.dose, times: form!.times.split(",").map((x) => x.trim()).filter(Boolean), startDate: form!.startDate, endDate: form!.endDate || undefined, note: form!.note, replaceId: form!.replaceId }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["f-meds"] }); setForm(null); } });
  const stop = useMutation({ mutationFn: (id: number) => family.stopMed(me, id), onSuccess: () => qc.invalidateQueries({ queryKey: ["f-meds"] }) });
  // lịch sử 30 ngày (trước hôm nay) lấy từ dữ liệu sức khỏe, mới nhất trước
  const history = useQuery({ queryKey: ["f-health", fe.id], queryFn: () => family.health(me, fe.id!), enabled: !!fe.id });
  const past = (history.data?.doses ?? []).filter((d) => d.date < TODAY).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  return (
    <Page title="Thuốc của cụ" sub="Gia đình khai tên thuốc, liều, giờ uống. Đổi đơn có lưu lịch sử. Điều dưỡng cho uống và ghi lại." actions={<><ElderlyPicker rows={fe.rows} value={fe.id} onChange={fe.pick} /><Button size="sm" icon={Plus} disabled={!fe.id} onClick={() => setForm({ name: "", dose: "1 viên", times: "08:00", startDate: TODAY, endDate: "", note: "" })}>Thêm thuốc</Button></>}>
      {!fe.id ? <NoElderly /> : isLoading || !data ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <Card title="Danh sách thuốc">
            <Table rows={data.plans} rowKey={(p) => p.id} columns={[
              { key: "n", header: "Thuốc", render: (p) => <span className={cn(!p.active && "text-faint line-through")}><b className="text-navy">{p.name}</b> · {p.dose}<span className="block text-[11px] text-subtle">{p.note}</span></span> },
              { key: "t", header: "Giờ uống", render: (p) => p.times.join(", ") },
              { key: "d", header: "Thời gian", render: (p) => `${dm(p.startDate)} → ${p.endDate ? dm(p.endDate) : "…"}` },
              { key: "s", header: "", render: (p) => p.active ? <span className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setForm({ replaceId: p.id, name: p.name, dose: p.dose, times: p.times.join(", "), startDate: TODAY, endDate: "", note: p.note })}>Đổi đơn</Button><Button size="sm" variant="danger" onClick={() => stop.mutate(p.id)}>Ngừng</Button></span> : <Badge tone="gray">Đã ngừng</Badge> },
            ]} />
          </Card>
          <Card title="Hôm nay">
            {data.today.length === 0 ? <div className="text-[12.5px] text-subtle">Không có liều</div> : data.today.map((d) => <KV key={d.id} label={d.time} w={50}>{d.plan?.name} · <Badge tone={doseTone(d)}>{({ GIVEN: `Đã uống ${d.at}`, REFUSED: "Cụ từ chối", MISSING: "Chưa có thuốc", PENDING: pendingLabel(d.date, d.time) })[d.status]}</Badge>{d.reason && <span className="block text-[11px] text-subtle">{d.reason}</span>}</KV>)}
          </Card>
          <Card title="Lịch sử uống thuốc 30 ngày" className="lg:col-span-2" actions={past.length > 0 && <span className="text-[11px] text-subtle">Đã uống {past.filter((d) => d.status === "GIVEN").length}/{past.length} liều</span>}>
            <Table rows={past} rowKey={(d) => d.id} empty="Chưa có liều nào trước hôm nay" columns={[
              { key: "d", header: "Ngày", render: (d) => `${weekday(d.date)} ${dm(d.date)}` },
              { key: "t", header: "Giờ", render: (d) => d.time },
              { key: "n", header: "Thuốc", render: (d) => <span><b className="text-navy">{d.plan?.name}</b> · {d.plan?.dose}</span> },
              { key: "s", header: "Kết quả", render: (d) => <span><Badge tone={doseTone(d)}>{({ GIVEN: `Đã uống${d.at ? ` ${d.at}` : ""}`, REFUSED: "Cụ từ chối", MISSING: "Chưa có thuốc", PENDING: pendingLabel(d.date, d.time) })[d.status]}</Badge>{d.reason && <span className="block text-[11px] text-subtle">{d.reason}</span>}</span> },
              { key: "b", header: "Điều dưỡng", render: (d) => d.nurse?.fullName ?? <span className="text-faint">—</span> },
            ]} />
          </Card>
        </div>
      )}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.replaceId ? "Đổi đơn thuốc" : "Thêm thuốc"} width={480} footer={<><Button variant="neutral" onClick={() => setForm(null)}>Hủy</Button><Button loading={save.isPending} onClick={() => save.mutate()}>Lưu</Button></>}>
        {form && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Tên thuốc" className="sm:col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field label="Liều" value={form.dose} onChange={(e) => setForm({ ...form, dose: e.target.value })} />
            <Field label="Giờ uống (phẩy)" value={form.times} onChange={(e) => setForm({ ...form, times: e.target.value })} />
            <Field label="Bắt đầu" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Field label="Kết thúc (nếu có)" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            <TextArea label="Hướng dẫn" className="sm:col-span-2" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <Button variant="neutral" size="sm" className="sm:col-span-2" icon={Camera}>Chụp ảnh vỉ thuốc</Button>
            {form.replaceId && <Note className="sm:col-span-2">Đơn cũ được ngừng và lưu vào lịch sử.</Note>}
            <div className="sm:col-span-2"><ErrorText error={save.error} /></div>
          </div>
        )}
      </Modal>
    </Page>
  );
}

// ------------------------------------------------------------------ schedule & menu
const WEEKS = { now: ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"], next: ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"] };
export function FamilySchedule() {
  const me = useMe();
  const fe = useFamilyElderly();
  const [week, setWeek] = useState<"now" | "next">("now");
  const [day, setDay] = useState(TODAY);
  const dates = WEEKS[week];
  const { data, isLoading } = useQuery({ queryKey: ["f-sched", fe.id, week], queryFn: () => family.schedule(me, fe.id!, dates), enabled: !!fe.id });
  const cur = dates.includes(day) ? day : dates[0];
  const menu = data?.menus.find((m) => m.date === cur);
  return (
    <Page title="Lịch & thực đơn" sub="Giờ VLTL và massage do trung tâm xếp, gia đình xem được ở đây." actions={<ElderlyPicker rows={fe.rows} value={fe.id} onChange={fe.pick} />}>
      {!fe.id ? <NoElderly /> : isLoading || !data ? <Loading /> : (
        <>
          <div className="flex flex-wrap items-center gap-2"><Chip active={week === "now"} onClick={() => { setWeek("now"); setDay(TODAY); }}>Tuần này</Chip><Chip active={week === "next"} onClick={() => { setWeek("next"); setDay(WEEKS.next[0]); }}>Tuần sau</Chip>{data.bed && <Badge tone="purple"><BedDouble size={11} />Giường {data.bed.code} · {data.bedRoom?.name}{data.bed.fixedElderlyId ? " (cố định)" : " (hôm nay)"}</Badge>}</div>
          <div className="flex gap-1.5 overflow-x-auto">{dates.map((d) => <button key={d} onClick={() => setDay(d)} className={cn("min-w-20 rounded-xl border px-3 py-2 text-center text-[12px]", d === cur ? "border-orange bg-orange-soft font-semibold text-orange" : "border-line bg-surface text-muted")}>{weekday(d)}<span className="block text-[15px] font-bold">{dm(d)}</span>{data.scheduledDays.includes(d) ? <span className="text-[10px] text-green-ink">Cụ đi</span> : <span className="text-[10px] text-faint">Không lịch</span>}</button>)}</div>
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Card title={`Lịch ${weekday(cur)} ${dm(cur)}`}>
              <ul className="divide-y divide-line-soft">
                {data.items.filter((x) => x.date === cur).sort((a, b) => a.startTime.localeCompare(b.startTime)).map((x) => (
                  <li key={x.id} className={cn("flex gap-3 py-2 text-[12.5px]", !x.forMe && "opacity-45")}>
                    <span className="w-24 shrink-0 font-semibold text-navy">{x.startTime}–{x.endTime}</span>
                    <span className="flex-1">{x.title}<span className="block text-[11px] text-subtle">{x.room?.name}</span></span>
                    {!x.forMe && <span className="text-[10.5px] text-subtle">{x.tiers.length < 3 ? `Hạng ${x.tiers.map((t) => TIER_LABEL[t]).join(", ")}` : "Không chọn"}</span>}
                  </li>
                ))}
              </ul>
            </Card>
            <div className="space-y-4">
              <Card title="Lịch VLTL & massage của cụ">
                {data.therapy.filter((x) => x.date === cur).length === 0 ? <div className="text-[12.5px] text-subtle">Không có trong ngày</div> : data.therapy.filter((x) => x.date === cur).map((x) => <div key={x.id} className="flex items-center gap-2 py-1 text-[12.5px]"><Badge tone="teal">{x.startTime}</Badge>{x.service?.name}<span className="text-subtle">· {x.room?.name}</span>{x.mine?.status === "MAKEUP" && <Badge tone="purple">Buổi bù</Badge>}</div>)}
              </Card>
              <Card title="Thực đơn">
                {menu ? (
                  <>
                    {tierHasBreakfast(data.sub?.tier) && <KV label="Sáng" w={50}>{menu.breakfast}</KV>}
                    <KV label="Trưa" w={50}>{menu.lunch}</KV>
                    <KV label="Xế" w={50}>{menu.snack}</KV>
                    {data.diet && <Note className="mt-2">Món thay cho cụ: {menu[data.diet]}</Note>}
                  </>
                ) : <div className="text-[12.5px] text-subtle">Thực đơn chưa được duyệt</div>}
              </Card>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

// ------------------------------------------------------------------ belongings, chatbot, notification prefs
export function FamilyBelongings() {
  const me = useMe();
  const { data, isLoading } = useQuery({ queryKey: ["f-bel", me.id], queryFn: () => family.belongings(me) });
  return (
    <Page title="Đồ gửi tại trung tâm" sub="Nhân viên ghi nhận khi nhận và khi trả, có ảnh.">
      {isLoading ? <Loading /> : !data?.length ? <Card><EmptyState icon={ClipboardList} title="Chưa có đồ gửi" /></Card> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.map(({ item, elderly, receiver }) => (
            <Card key={item.id}>
              <Photo tone={item.tone} />
              <div className="mt-2 text-[13px] font-semibold text-navy">{item.item}</div>
              <div className="text-[11.5px] text-subtle">{elderly?.fullName} · nhận {dm(item.receivedAt.slice(0, 10))} {hm(item.receivedAt)} ({receiver?.fullName})</div>
              <div className="mt-1">{item.returnedAt ? <Badge tone="green">Đã trả {dm(item.returnedAt.slice(0, 10))}</Badge> : <Badge tone="orange">Đang giữ</Badge>}</div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}

export function FamilyChat() {
  return (
    <Page title="Trợ lý tư vấn" sub="Trả lời từ FAQ và thông tin gói Quản lý nhập. Câu nào chưa trả lời được sẽ chuyển thành tin nhắn tới Quản lý (BR-52).">
      <div className="mx-auto max-w-2xl"><ChatWidget inline /></div>
    </Page>
  );
}

const PREF: [string, string][] = [["CHECKIN", "Cụ đến trung tâm"], ["MEAL", "Ăn xong mỗi bữa"], ["ACTIVITY", "Bắt đầu hoạt động"], ["PHOTO", "Có ảnh mới"], ["VITALS", "Có chỉ số mới"], ["MEDICATION", "Đã uống thuốc"], ["READY", "Cụ sẵn sàng về"], ["CHECKOUT", "Cụ đã về"]];
export function FamilyAccountExtras() {
  const me = useMe();
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["f-prefs", me.id], queryFn: () => family.prefs(me) });
  const [off, setOff] = useState<string[]>();
  const cur = off ?? data ?? [];
  const save = useMutation({ mutationFn: () => family.savePrefs(me, cur), onSuccess: () => { qc.invalidateQueries({ queryKey: ["f-prefs"] }); setOff(undefined); } });
  return (
    <Card title="Cài đặt thông báo (G6)">
      <div className="grid gap-2 sm:grid-cols-2">
        {PREF.map(([k, l]) => <Toggle key={k} checked={!cur.includes(k)} onChange={(v) => setOff(v ? cur.filter((x) => x !== k) : [...cur, k])} label={l} />)}
      </div>
      <Note className="mt-3">Không tắt được thông báo bất thường, sự cố và khẩn cấp.</Note>
      <Button className="mt-3" size="sm" disabled={!off} loading={save.isPending} onClick={() => save.mutate()}>Lưu cài đặt</Button>
    </Card>
  );
}
