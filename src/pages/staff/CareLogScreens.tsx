// Care log theo nhóm (đặc tả WF Care Log, mục 5–11): 5 màn CL-MOB / CL-CHR / CL-REH / CL-DEM / CL-STR
// dùng chung khung 3 cột (việc hôm nay · khối riêng của nhóm · ghi nhanh + module phụ + dòng thời gian).
// GroupBlocks cũng được Manager (M2) và Gia đình (G1) dùng ở chế độ chỉ đọc.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, Bath, Camera, CircleCheck, History, Lock, Moon, NotebookPen, Plus, ShieldAlert, Siren, Smile, Stethoscope, Trash2, TriangleAlert, Utensils } from "lucide-react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { lookups, NOW, staff, TODAY, useLiveRefresh } from "../../api";
import { useMe } from "../../auth/AuthContext";
import { Page } from "../../components/layout/PortalLayout";
import { ElderlyCell, GroupBadge, TierBadge, Timeline } from "../../components/domain";
import { Badge, Button, Chip, ErrorText, Field, Loading, Modal, Note, SelectField, Tabs, TextArea, cn } from "../../components/ui";
import { dmy, hm, weekday } from "../../lib/format";
import type { Assessment, CareLogEntry, CareModule, DailyTask, ElderlyMember, HealthMetric, MedicationDose, MedicationPlan, Service, Thresholds, Tier } from "../../types/models";
import { EntryModal, IncidentModal, taskKind, vitalsExtras, VitalsModal, type EntryKindUI } from "./StaffForms";
import { DoseButtons } from "./StaffNurse";

// ------------------------------------------------------------------ shared types & helpers
type Entry = CareLogEntry & { staff?: { fullName: string } };
type Dx = Record<string, unknown>;
/** Everything a group block needs; staff, manager and family APIs all return these fields. */
export type CareCtx = {
  elderly: ElderlyMember;
  entries: Entry[];
  history: CareLogEntry[];
  barthel: { date: string; score: number }[];
  nextAssessment?: Assessment;
  metrics14: HealthMetric[];
  modules: CareModule[];
  doses?: (MedicationDose & { plan?: MedicationPlan })[];
  choices?: Service[];
  tier?: Tier;
  thresholds?: Thresholds;
};
/** taskFor: which daily task a save completes; `hint` matches the task title (e.g. "lần 2", "bữa trưa", "12h"). */
type Mode = { readOnly: boolean; nurse: boolean; taskFor?: (kind: CareLogEntry["kind"], hint?: string) => number | undefined; onVitals?: () => void };

export const SCREEN: Record<string, { code: string; tab: string }> = {
  MOBILE: { code: "CL-MOB", tab: "Vận động" },
  CHRONIC: { code: "CL-CHR", tab: "Bệnh mãn tính" },
  REHAB: { code: "CL-REH", tab: "Phục hồi" },
  DEMENTIA: { code: "CL-DEM", tab: "Trí nhớ & hành vi" },
  STROKE: { code: "CL-STR", tab: "Sau tai biến" },
};
/** Tab của màn care log; khối nào nằm ở tab Chỉ số và thuốc (còn lại ở Chăm sóc riêng). */
type ClTab = "vitals" | "care" | "timeline";
const VITALS_KINDS = ["VITALS", "MEDICATION", "FAST_CHECK"];
const MODULE_LABEL: Record<CareModule, string> = { GLUCOSE: "Đường huyết", BP: "Huyết áp tăng cường", CARDIO: "Tim mạch", FALL: "Phòng té ngã", JOINT: "Khớp & vận động", MEMORY: "Trí nhớ nhẹ", SWALLOW: "Nuốt" };
const EXERCISES = ["Tập đi thanh song song", "Tập đi có khung", "Gập duỗi gối", "Nâng chân thẳng", "Đạp xe tại chỗ", "Ròng rọc tập vai", "Cầm nắm bóng mềm", "Với đồ trên bàn", "Đứng thăng bằng", "Ngồi – đứng dậy"];
const dx = (e?: CareLogEntry) => (e?.data ?? {}) as Dx;
const ofKind = (list: CareLogEntry[], k: CareLogEntry["kind"], type?: string) => list.filter((x) => x.kind === k && (!type || dx(x).type === type));
const last = <T,>(a: T[]) => a[a.length - 1];
const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : undefined);
const yesNo = (v: unknown) => (v ? "✓" : "✗");

/**
 * Form nào đang mở trên màn care log của staff: mỗi khối chỉ hiện phần đã ghi + nút Ghi, bấm mới mở form.
 * null (không có provider, vd. màn gia đình / quản lý) = form luôn hiện như trước.
 */
const FormCtx = createContext<{ open?: string; setOpen: (id?: string) => void } | null>(null);
/** Khối đang chứa form: id + chỗ đặt nút Ghi trên đầu khối. */
const BlockCtx = createContext<{ id: string; slot: HTMLElement | null }>({ id: "", slot: null });

function useSave(elderlyId: number, onDone?: () => void) {
  const me = useMe();
  const qc = useQueryClient();
  const form = useContext(FormCtx);
  return useMutation({
    mutationFn: (input: Parameters<typeof staff.addEntry>[2]) => staff.addEntry(me, elderlyId, input),
    onSuccess: () => { qc.invalidateQueries(); form?.setOpen(undefined); onDone?.(); },
  });
}

/** One block on the screen. `main` = the group's signature block (accent border). */
function Block({ id, title, main, aside, children }: { id: string; title: ReactNode; main?: boolean; aside?: ReactNode; children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <section id={`blk-${id}`} className={cn("scroll-mt-32 rounded-xl bg-surface p-4 shadow-[0_2px_6px_rgba(18,35,89,0.06)] transition", main && "ring-2 ring-blue/50")}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="flex-1 text-[14px] font-semibold text-navy">{title}</h3>
        {aside}
        <span ref={setSlot} className="empty:hidden" />
      </div>
      <BlockCtx.Provider value={{ id, slot }}>{children}</BlockCtx.Provider>
    </section>
  );
}
/** Phần nhập của 1 khối: trên màn care log chỉ mở khi bấm Ghi (nút nằm trên đầu khối), lưu xong tự gập. */
function FormArea({ className, children }: { className: string; children: ReactNode }) {
  const form = useContext(FormCtx);
  const { id, slot } = useContext(BlockCtx);
  if (!form) return <div className={className}>{children}</div>;
  const open = form.open === id;
  const toggle = slot && createPortal(
    <Button size="sm" variant={open ? "neutral" : "outline"} icon={open ? undefined : Plus} onClick={() => form.setOpen(open ? undefined : id)}>{open ? "Đóng" : "Ghi"}</Button>, slot);
  return <>{toggle}{open && <div className={className}>{children}</div>}</>;
}
/** Phần con nằm trong 1 khối khác (cùng props với Block, không có khung riêng). */
function SubBlock({ id, title, aside, children }: { id: string; title: ReactNode; main?: boolean; aside?: ReactNode; children: ReactNode }) {
  return (
    <div id={`blk-${id}`} className="scroll-mt-32">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="flex-1 text-[13px] font-semibold text-navy">{title}</h4>
        {aside}
      </div>
      {children}
    </div>
  );
}
function Pick<T extends string>({ label, value, options, onChange }: { label?: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div>
      {label && <div className="mb-1 text-[11px] text-subtle">{label}</div>}
      <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o} active={value === o} onClick={() => onChange(o)}>{o}</Chip>)}</div>
    </div>
  );
}
function Checks({ items, value, onChange }: { items: [string, string][]; value: Dx; onChange: (v: Dx) => void }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map(([k, l]) => (
        <label key={k} className="flex items-center gap-1.5 text-[12.5px] text-body">
          <input type="checkbox" checked={!!value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} />{l}
        </label>
      ))}
    </div>
  );
}
function Rows({ list, empty = "Chưa ghi hôm nay" }: { list: CareLogEntry[]; empty?: string }) {
  if (!list.length) return <div className="text-[12px] text-subtle">{empty}</div>;
  return (
    <ul className="space-y-1">
      {list.map((x) => (
        <li key={x.id} className="text-[12.5px]">
          <span className="mr-2 font-semibold text-navy">{x.time}</span>{x.detail}
          {x.important && <Badge tone="red" className="ml-1">Lưu ý</Badge>}{x.internalOnly && <Badge tone="gray" className="ml-1">Nội bộ</Badge>}
        </li>
      ))}
    </ul>
  );
}
function Tile({ label, value, sub, tone = "gray" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "gray" | "green" | "orange" | "red" }) {
  const ring = { gray: "border-line", green: "border-green", orange: "border-orange", red: "border-red-ink" }[tone];
  return (
    <div className={cn("rounded-lg border bg-surface px-3 py-2 text-center", ring, tone !== "gray" && "border-2")}>
      <div className="text-[11px] text-subtle">{label}</div>
      <div className="text-[16px] font-bold text-navy">{value}</div>
      {sub && <div className="text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
function SaveBar({ save, label = "Lưu", disabled, hint }: { save: ReturnType<typeof useSave> & { run: () => void }; label?: string; disabled?: boolean; hint?: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button size="sm" icon={CircleCheck} disabled={disabled} loading={save.isPending} onClick={save.run}>{label}</Button>
      {hint && <span className="text-[11px] text-subtle">{hint}</span>}
      <ErrorText error={save.error} />
    </div>
  );
}
/** useSave + a bound `run` for one block. */
function useBlock(ctx: CareCtx, mode: Mode, kind: CareLogEntry["kind"], build: () => Parameters<typeof staff.addEntry>[2], reset?: () => void, hint?: () => string) {
  const s = useSave(ctx.elderly.id, reset);
  return Object.assign(s, { run: () => s.mutate({ ...build(), taskId: mode.taskFor?.(kind, hint?.()) }) });
}

// ------------------------------------------------------------------ CL-MOB
function WalkBlock({ ctx, mode, main }: { ctx: CareCtx; mode: Mode; main?: boolean }) {
  const [f, setF] = useState({ minutes: "15", aid: "Cầm tay", gait: "Vững", tired: false, dizzy: false });
  const save = useBlock(ctx, mode, "MOBILITY", () => ({ kind: "MOBILITY", title: "Đi bộ", detail: `${f.minutes} phút · ${f.aid} · dáng đi ${f.gait.toLowerCase()}${f.tired ? " · mệt, khó thở" : ""}${f.dizzy ? " · chóng mặt khi đứng dậy" : ""}`, important: f.tired || f.dizzy, data: { ...f, minutes: Number(f.minutes) } }));
  return (
    <Block id="MOBILITY" title="Đi bộ và vận động" main={main}>
      <Rows list={ofKind(ctx.entries, "MOBILITY")} />
      {!mode.readOnly && <FormArea className="mt-3 space-y-2 border-t border-line-soft pt-3">
        <div className="flex flex-wrap gap-3"><Field label="Thời lượng (phút)" type="number" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} className="w-32" /></div>
        <Pick label="Hỗ trợ" value={f.aid} options={["Tự đi", "Cầm tay", "Gậy", "Khung"]} onChange={(aid) => setF({ ...f, aid })} />
        <Pick label="Dáng đi" value={f.gait} options={["Vững", "Loạng choạng"]} onChange={(gait) => setF({ ...f, gait })} />
        <Checks items={[["tired", "Mệt, khó thở"], ["dizzy", "Chóng mặt khi đứng dậy"]]} value={f} onChange={(v) => setF(v as typeof f)} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}
function FallBlock({ ctx, mode, compact }: { ctx: CareCtx; mode: Mode; compact?: boolean }) {
  const [f, setF] = useState<Dx>({ shoes: true, escort: false, dizzy: false, nearFall: false });
  const near7 = [...ctx.history, ...ctx.entries].filter((x) => x.kind === "CARE_CHECK" && dx(x).type === "FALL" && dx(x).nearFall).length;
  const save = useBlock(ctx, mode, "CARE_CHECK", () => ({ kind: "CARE_CHECK", title: "Phòng té ngã", detail: `Giày an toàn ${yesNo(f.shoes)} · đi vệ sinh có người kèm ${yesNo(f.escort)} · chóng mặt ${f.dizzy ? "có" : "không"} · suýt ngã: ${f.nearFall ? "CÓ" : "không"}`, important: !!f.nearFall, data: { type: "FALL", ...f } }), undefined, () => "té ngã");
  return (
    <Block id={compact ? "MOD-FALL" : "CARE_CHECK-FALL"} title="Phòng té ngã" aside={<Badge tone={near7 >= 2 ? "red" : "gray"}>Suýt ngã 14 ngày: {near7}</Badge>}>
      <Rows list={ofKind(ctx.entries, "CARE_CHECK", "FALL")} />
      {!mode.readOnly && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        <Checks items={[["shoes", "Giày dép an toàn"], ["escort", "Đi vệ sinh có người kèm"], ["dizzy", "Chóng mặt"], ["nearFall", "Suýt ngã hôm nay"]]} value={f} onChange={setF} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}
function OptionalBlock({ ctx }: { ctx: CareCtx }) {
  const week = [...ctx.history.filter((x) => x.date > new Date(Date.parse(TODAY) - 7 * 864e5).toISOString().slice(0, 10)), ...ctx.entries];
  if (!ctx.choices?.length) return null;
  return (
    <Block id="OPTIONAL" title="Hoạt động tự chọn tuần này">
      <div className="flex flex-wrap gap-1.5">
        {ctx.choices.map((s) => {
          const n = week.filter((x) => x.kind === "ACTIVITY" && x.title.includes(s.name.split(",")[0])).length;
          return <Badge key={s.id} tone={n ? "green" : "gray"}>{s.name}: {n} lượt · {ctx.tier ? s.quota[ctx.tier] ?? "—" : ""}</Badge>;
        })}
      </div>
    </Block>
  );
}
function SocialBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [who, setWho] = useState("");
  const [alone, setAlone] = useState(false);
  const save = useBlock(ctx, mode, "CARE_CHECK", () => ({ kind: "CARE_CHECK", title: "Giao tiếp", detail: `Nói chuyện với: ${who || "—"} · ngồi riêng lẻ: ${alone ? "có" : "không"}`, important: alone, data: { type: "SOCIAL", who, alone } }), () => setWho(""));
  return (
    <Block id="CARE_CHECK-SOCIAL" title="Giao tiếp">
      <Rows list={ofKind(ctx.entries, "CARE_CHECK", "SOCIAL")} />
      {!mode.readOnly && <FormArea className="mt-2 flex flex-wrap items-end gap-3 border-t border-line-soft pt-2">
        <Field label="Nói chuyện với" value={who} onChange={(e) => setWho(e.target.value)} className="w-64" />
        <Checks items={[["alone", "Ngồi riêng lẻ"]]} value={{ alone }} onChange={(v) => setAlone(!!v.alone)} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}

// ------------------------------------------------------------------ chỉ số hôm nay (chung cho cả 5 màn)
type Tone = "gray" | "green" | "orange" | "red";
/** Số lần đo HA cần mỗi ngày: sau tai biến 3, hạng Cơ bản 1, còn lại 2. */
const vitalsPerDay = (ctx: CareCtx) => (ctx.elderly.targetGroup === "STROKE" ? 3 : ctx.tier === "BASIC" ? 1 : 2);
/** Màu ô theo ngưỡng (CL-17): đỏ = nguy hiểm, cam = vượt ngưỡng, xanh = trong ngưỡng. */
function vitalTone(k: "sys" | "pulse" | "spo2" | "temp" | "glucose" | "weight", m: HealthMetric, t?: Thresholds): Tone {
  if (!t) return "green";
  switch (k) {
    case "sys": return m.sys! >= 180 || m.dia! >= 110 || m.sys! < 90 ? "red" : m.sys! > t.sysMax || m.dia! > t.diaMax || m.sys! < t.sysMin ? "orange" : "green";
    case "pulse": return m.pulse! < t.pulseMin || m.pulse! > t.pulseMax ? "orange" : "green";
    case "spo2": return m.spo2! < 90 ? "red" : m.spo2! < t.spo2Min ? "orange" : "green";
    case "temp": return m.temp! > t.tempMax ? "orange" : "green";
    case "glucose": return m.glucose! < 3.9 ? "red" : m.glucose! > t.glucoseMax ? "orange" : "green";
    default: return "green";
  }
}
const VITAL_TILES: { k: "sys" | "pulse" | "spo2" | "temp" | "glucose" | "weight"; label: string; fmt: (m: HealthMetric) => string }[] = [
  { k: "sys", label: "Huyết áp", fmt: (m) => `${m.sys}/${m.dia}` },
  { k: "pulse", label: "Mạch", fmt: (m) => `${m.pulse}` },
  { k: "spo2", label: "SpO₂", fmt: (m) => `${m.spo2}%` },
  { k: "temp", label: "Nhiệt độ", fmt: (m) => `${m.temp}°C` },
  { k: "glucose", label: "Đường huyết", fmt: (m) => `${m.glucose} mmol/L` },
  { k: "weight", label: "Cân nặng", fmt: (m) => `${m.weight} kg` },
];
const vitalsLine = (m: HealthMetric) =>
  [m.sys && `HA ${m.sys}/${m.dia}`, m.pulse && `mạch ${m.pulse}`, m.spo2 && `SpO₂ ${m.spo2}%`, m.temp && `${m.temp}°C`, m.glucose && `ĐH ${m.glucose}`, m.weight && `${m.weight} kg`].filter(Boolean).join(" · ");

/** Khung "Chỉ số hôm nay": cùng bố cục ở cả 5 màn — 4 ô chung + ô thêm theo bệnh; sau tai biến có thêm 3 lần HA + FAST. */
function VitalsPanel({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const extras = vitalsExtras({ conditions: ctx.elderly.conditions, careModules: ctx.modules });
  const today = ctx.metrics14.filter((m) => m.at.startsWith(TODAY));
  const done = today.filter((m) => m.sys).length;
  const per = vitalsPerDay(ctx);
  const tiles = VITAL_TILES.filter((x) => (x.k !== "glucose" || extras.glucose) && (x.k !== "weight" || extras.weight));
  const canMeasure = mode.nurse && !mode.readOnly && mode.onVitals;
  return (
    <Block id="VITALS" title={<span className="flex flex-wrap items-center gap-2">Chỉ số hôm nay <Badge tone={done >= per ? "green" : "orange"}>đã đo {done}/{per} lần</Badge></span>} main
      aside={canMeasure ? <Button size="sm" variant="ai" icon={Activity} onClick={mode.onVitals}>Đo chỉ số</Button> : !mode.readOnly && !mode.nurse ? <span className="text-[11px] text-subtle">Chỉ điều dưỡng đo (CL-03)</span> : undefined}>
      <div className={cn("grid gap-2 grid-cols-2 sm:grid-cols-3", tiles.length > 4 ? "xl:grid-cols-6" : "xl:grid-cols-4")}>
        {tiles.map(({ k, label, fmt }) => {
          const m = last(today.filter((x) => x[k] != null));
          // chưa đo hôm nay: ghi rõ lần đo trước là ngày nào, tránh nhầm với số hôm nay
          const prev = !m ? last(ctx.metrics14.filter((x) => !x.at.startsWith(TODAY) && x[k] != null)) : undefined;
          return <Tile key={k} label={label} value={m ? fmt(m) : "chưa đo"} tone={m ? vitalTone(k, m, ctx.thresholds) : "gray"}
            sub={m ? hm(m.at) : prev ? `lần trước ${fmt(prev)} · ${prev.at.slice(8, 10)}/${prev.at.slice(5, 7)}` : "hôm nay"} />;
        })}
      </div>
      <div className="mt-3 text-[11px] font-semibold text-subtle uppercase">Các lần đo hôm nay</div>
      {today.length ? (
        <ul className="mt-1 space-y-0.5 text-[12.5px]">{today.map((m) => <li key={m.id}><b className="mr-2 text-navy">{hm(m.at)}</b>{vitalsLine(m)}</li>)}</ul>
      ) : <div className="mt-1 text-[12px] text-subtle">Chưa đo lần nào</div>}
      {ctx.elderly.targetGroup === "STROKE" && <div className="mt-3 border-t border-line-soft pt-3"><FastBlock ctx={ctx} mode={mode} embedded /></div>}
    </Block>
  );
}
function MedsBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  if (!ctx.doses) return null;
  return (
    <Block id="MEDICATION" title="Thuốc theo giờ">
      {!ctx.doses.length ? <div className="text-[12px] text-subtle">Không có thuốc gửi kèm hôm nay</div> : (
        <ul className="divide-y divide-line-soft">
          {ctx.doses.map((m) => (
            <li key={m.id} className={cn("flex flex-wrap items-center gap-2 py-1.5 text-[12.5px]", m.status !== "PENDING" && "opacity-70")}>
              <b className="w-12 text-navy">{m.time}</b><span className="flex-1">{m.plan?.name} {m.plan?.dose}</span>
              {m.status === "PENDING" ? (mode.nurse && !mode.readOnly ? <DoseButtons doseId={m.id} /> : <Badge tone={m.time < NOW ? "red" : "gray"}>{m.time < NOW ? "Quá giờ" : "Chưa đến giờ"}</Badge>)
                : <Badge tone={m.status === "GIVEN" ? "green" : "orange"}>{({ GIVEN: "Đã uống", REFUSED: "Từ chối", MISSING: "Chưa có thuốc" } as Record<string, string>)[m.status]}{m.reason ? ` · ${m.reason}` : ""}</Badge>}
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
function DietBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [meal, setMeal] = useState("Bữa trưa");
  const [c, setC] = useState("Đúng");
  const save = useBlock(ctx, mode, "DIET_CHECK", () => ({ kind: "DIET_CHECK", title: `Ăn đúng chế độ · ${meal.toLowerCase()}`, detail: c === "Đúng" ? `Đúng chế độ ${ctx.elderly.diet.toLowerCase()}` : c, important: c !== "Đúng", data: { meal, compliance: c === "Đúng" ? "OK" : c === "Ăn thêm đồ ngoài" ? "EXTRA_FOOD" : "SKIPPED" } }), undefined, () => meal.toLowerCase());
  return (
    <Block id="DIET_CHECK" title={`Ăn đúng chế độ (${ctx.elderly.diet || "bình thường"})`}>
      <Rows list={ofKind(ctx.entries, "DIET_CHECK")} />
      {!mode.readOnly && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        <Pick value={meal} options={["Bữa sáng", "Bữa trưa", "Bữa xế"]} onChange={setMeal} />
        <Pick value={c} options={["Đúng", "Ăn thêm đồ ngoài", "Bỏ bữa"]} onChange={setC} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}
function FootBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [f, setF] = useState<Dx>({});
  const [h, setH] = useState<Dx>({});
  const hypo = Object.values(h).some(Boolean);
  const save = useBlock(ctx, mode, "CARE_CHECK", () => ({ kind: "CARE_CHECK", title: "Bàn chân và triệu chứng", detail: `Vết xước ${f.scratch ? "có" : "không"} · đỏ ${f.red ? "có" : "không"} · mất cảm giác ${f.numb ? "có" : "không"} → ngâm chân: ${f.scratch || f.red || f.numb ? "không cho" : "cho phép"}${hypo ? ` · triệu chứng hạ đường huyết: ${Object.keys(h).filter((k) => h[k]).join(", ")}` : ""}`, important: hypo || !!f.scratch, data: { type: "FOOT", ...f, hypo: h } }), () => { setF({}); setH({}); }, () => "bàn chân");
  return (
    <Block id="CARE_CHECK-FOOT" title="Bàn chân và triệu chứng">
      <Rows list={ofKind(ctx.entries, "CARE_CHECK", "FOOT")} />
      {!mode.readOnly && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        {mode.nurse && <Checks items={[["scratch", "Vết xước"], ["red", "Đỏ, phồng"], ["numb", "Mất cảm giác"]]} value={f} onChange={setF} />}
        <div className="text-[11px] text-subtle">Triệu chứng hạ đường huyết (hộ lý báo nhanh)</div>
        <Checks items={[["vã mồ hôi", "Vã mồ hôi"], ["run tay", "Run tay"], ["lả đi", "Lả đi"], ["lú lẫn", "Lú lẫn"]]} value={h} onChange={setH} />
        {hypo && <Note tone="red">Đo đường huyết ngay; nếu &lt; 3,9 mmol/L cho ăn đường nhanh, đo lại sau 15 phút.</Note>}
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}
function CardioBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [edema, setEdema] = useState("Không");
  const [f, setF] = useState<Dx>({});
  const save = useBlock(ctx, mode, "CARE_CHECK", () => ({ kind: "CARE_CHECK", title: "Tim mạch", detail: `Phù chân: ${edema.toLowerCase()} · khó thở khi gắng sức ${f.dyspnea ? "có" : "không"}${f.chest ? " · ĐAU NGỰC" : ""}`, important: !!f.chest || edema === "Rõ", data: { type: "CARDIO", edema, ...f } }));
  return (
    <Block id="CARE_CHECK-CARDIO" title="Tim mạch">
      <Rows list={ofKind(ctx.entries, "CARE_CHECK", "CARDIO")} />
      {!mode.readOnly && mode.nurse && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        <Pick label="Phù chân" value={edema} options={["Không", "Nhẹ", "Rõ"]} onChange={setEdema} />
        <Checks items={[["dyspnea", "Khó thở khi gắng sức"], ["chest", "Đau ngực (→ báo sự cố khẩn cấp)"]]} value={f} onChange={setF} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}

// ------------------------------------------------------------------ CL-REH (+ STROKE dùng chung phiếu VLTL)
function ProgressBlock({ ctx }: { ctx: CareCtx }) {
  const walks = [...ctx.history, ...ctx.entries].filter((x) => x.kind === "MOBILITY" && typeof dx(x).distance === "number");
  const sessions = [...ctx.history, ...ctx.entries].filter((x) => x.kind === "REHAB_SESSION").slice(-7);
  const b = last(ctx.barthel);
  const b0 = ctx.barthel[ctx.barthel.length - 2];
  const dist = last(walks);
  const first = walks[0];
  const pain = avg(sessions.map((s) => Number(dx(s).painAfter)).filter((n) => !Number.isNaN(n)));
  return (
    <Block id="PROGRESS" title="Tiến triển" main aside={ctx.nextAssessment && <Badge tone="blue">Chấm lại {dmy(ctx.nextAssessment.scheduledAt.slice(0, 10))}</Badge>}>
      <div className="grid gap-2 sm:grid-cols-3">
        <Tile label="Barthel" value={b ? b.score : "—"} sub={b ? (b0 ? `${b0.score} → ${b.score} (${b.score - b0.score >= 0 ? "+" : ""}${b.score - b0.score})` : `đánh giá ${dmy(b.date)}`) : "chưa đánh giá"} tone={b0 && b && b.score - b0.score <= -10 ? "red" : "gray"} />
        <Tile label="Quãng đi gần nhất" value={dist ? `${dx(dist).distance} m` : "—"} sub={first && dist && first !== dist ? `ngày ${first.date.slice(8)}/${first.date.slice(5, 7)}: ${dx(first).distance} m` : undefined} tone={first && dist && Number(dx(dist).distance) > Number(dx(first).distance) ? "green" : "gray"} />
        <Tile label="Đau sau tập (TB 7 buổi)" value={pain !== undefined ? `${pain}/10` : "—"} tone={pain !== undefined && pain >= 7 ? "red" : "gray"} />
      </div>
    </Block>
  );
}
type Ex = { name: string; side: string; sets: string; reps: string };
/** Bài tập trong data.exercises: dạng đầy đủ {name, side, sets, reps} hoặc chỉ tên bài (dữ liệu nhập tay / seed). */
const exercisesOf = (e: CareLogEntry): Ex[] =>
  ((dx(e).exercises as unknown[] | undefined) ?? []).map((x) => (typeof x === "string" ? { name: x, side: "Hai bên", sets: "", reps: "" } : (x as Ex)));
const exLabel = (x: Ex) => `${x.name}${x.side && x.side !== "Hai bên" ? ` (${x.side.toLowerCase()})` : ""}${x.sets && x.reps ? ` · ${x.sets}×${x.reps}` : ""}`;
function SessionBlock({ ctx, mode, title = "Phiếu buổi VLTL" }: { ctx: CareCtx; mode: Mode; title?: string }) {
  const [start, setStart] = useState("08:45");
  const [end, setEnd] = useState("09:15");
  const [ex, setEx] = useState<Ex[]>([{ name: EXERCISES[1], side: "Hai bên", sets: "1", reps: "10" }]);
  const [pb, setPb] = useState("3");
  const [pa, setPa] = useState("3");
  const [coop, setCoop] = useState("Tốt");
  const [stop, setStop] = useState("");
  const [home, setHome] = useState(false);
  const save = useBlock(ctx, mode, "REHAB_SESSION", () => ({
    kind: "REHAB_SESSION", title: "Phiếu buổi VLTL",
    detail: `${ex.map((x) => `${x.name.toLowerCase()} ${x.side !== "Hai bên" ? `(${x.side.toLowerCase()}) ` : ""}${x.sets}×${x.reps}`).join(" · ")} · đau ${pb} → ${pa}${stop ? ` · dừng sớm: ${stop}` : ""}`,
    important: Number(pa) >= 7 || !!stop,
    data: { start, end, exercises: ex, painBefore: Number(pb), painAfter: Number(pa), cooperation: coop, stoppedEarly: !!stop, reason: stop, home },
  }));
  const set = (i: number, p: Partial<Ex>) => setEx(ex.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const sessions = ofKind(ctx.entries, "REHAB_SESSION") as Entry[];
  const homeEx = last([...ctx.history, ...ctx.entries].filter((x) => x.kind === "REHAB_SESSION" && dx(x).home));
  return (
    <Block id="REHAB_SESSION" title={title} aside={!mode.nurse && !mode.readOnly && <Badge tone="gray">Chỉ điều dưỡng ghi (CL-14)</Badge>}>
      {sessions.length === 0 ? <div className="text-[12px] text-subtle">Chưa có buổi tập hôm nay</div> : sessions.map((s) => (
        <div key={s.id} className="mb-2 rounded-lg bg-canvas p-2 text-[12.5px]">
          <div className="font-semibold text-navy">{String(dx(s).start ?? s.time)}–{String(dx(s).end ?? "")} · {s.staff?.fullName}</div>
          {exercisesOf(s).map((x, i) => <div key={i}>• {exLabel(x)}</div>)}
          <div className="text-muted">Đau {String(dx(s).painBefore)} → {String(dx(s).painAfter)} · hợp tác {String(dx(s).cooperation ?? "").toLowerCase()}{dx(s).stoppedEarly ? ` · dừng sớm: ${String(dx(s).reason)}` : ""}</div>
        </div>
      ))}
      {homeEx && <Note tone="green">Bài tập về nhà đang giao: {exercisesOf(homeEx).map(exLabel).join(" · ")}</Note>}
      {!mode.readOnly && mode.nurse && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        <div className="flex flex-wrap gap-2"><Field label="Bắt đầu" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" /><Field label="Kết thúc" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" /></div>
        {ex.map((x, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <SelectField label={i === 0 ? "Bài tập (danh mục M4)" : undefined} value={x.name} onChange={(e) => set(i, { name: e.target.value })} className="w-56">{EXERCISES.map((n) => <option key={n}>{n}</option>)}</SelectField>
            <SelectField label={i === 0 ? "Bên" : undefined} value={x.side} onChange={(e) => set(i, { side: e.target.value })} className="w-28">{["Hai bên", "Trái", "Phải"].map((n) => <option key={n}>{n}</option>)}</SelectField>
            <Field label={i === 0 ? "Hiệp" : undefined} value={x.sets} onChange={(e) => set(i, { sets: e.target.value })} className="w-16" />
            <Field label={i === 0 ? "Lần / m / phút" : undefined} value={x.reps} onChange={(e) => set(i, { reps: e.target.value })} className="w-28" />
            {ex.length > 1 && <button className="mb-2 text-red-ink" onClick={() => setEx(ex.filter((_, j) => j !== i))} aria-label="Xóa bài"><Trash2 size={15} /></button>}
          </div>
        ))}
        <Button size="sm" variant="neutral" icon={Plus} onClick={() => setEx([...ex, { name: EXERCISES[3], side: "Hai bên", sets: "2", reps: "10" }])}>Thêm bài tập</Button>
        <div className="flex flex-wrap gap-2"><Field label="Đau trước (0–10)" type="number" min={0} max={10} value={pb} onChange={(e) => setPb(e.target.value)} className="w-32" /><Field label="Đau sau (0–10)" type="number" min={0} max={10} value={pa} onChange={(e) => setPa(e.target.value)} className="w-32" /></div>
        <Pick label="Hợp tác" value={coop} options={["Tốt", "Cần động viên", "Từ chối"]} onChange={setCoop} />
        <Field label="Dừng sớm vì (để trống nếu tập đủ)" value={stop} onChange={(e) => setStop(e.target.value)} />
        <Checks items={[["home", "Giao các bài này làm bài tập về nhà (gửi gia đình, G3)"]]} value={{ home }} onChange={(v) => setHome(!!v.home)} />
        <SaveBar save={save} hint="Đau sau ≥ 7 hoặc tăng ≥ 3 điểm sẽ tạo cảnh báo" />
      </FormArea>}
    </Block>
  );
}
function DistanceBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [f, setF] = useState({ distance: "12", aid: "Khung", helpers: "1", rests: "1" });
  const save = useBlock(ctx, mode, "MOBILITY", () => ({ kind: "MOBILITY", title: "Đi lại", detail: `${f.distance} m · ${f.aid.toLowerCase()} · ${f.helpers} người dìu · nghỉ ${f.rests} lần`, data: { distance: Number(f.distance), aid: f.aid, helpers: Number(f.helpers), rests: Number(f.rests) } }));
  return (
    <Block id="MOBILITY" title="Đi lại">
      <Rows list={ofKind(ctx.entries, "MOBILITY")} />
      {!mode.readOnly && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        <div className="flex flex-wrap gap-2">
          <Field label="Quãng đường (m)" type="number" value={f.distance} onChange={(e) => setF({ ...f, distance: e.target.value })} className="w-32" />
          <Field label="Người dìu" type="number" value={f.helpers} onChange={(e) => setF({ ...f, helpers: e.target.value })} className="w-24" />
          <Field label="Số lần nghỉ" type="number" value={f.rests} onChange={(e) => setF({ ...f, rests: e.target.value })} className="w-24" />
        </div>
        <Pick label="Dụng cụ" value={f.aid} options={["Không", "Gậy", "Khung", "Xe lăn"]} onChange={(aid) => setF({ ...f, aid })} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}

// ------------------------------------------------------------------ CL-DEM
const PLACES = ["Phòng sinh hoạt", "Phòng ăn", "Hành lang", "Sân vườn", "Phòng nghỉ trưa", "Nhà vệ sinh"];
const TRIGGERS = ["Đông người", "Ồn", "Đói", "Đau", "Đổi người chăm", "Bị từ chối đòi hỏi", "Chiều tối"];
const BEHAVIORS = ["Lo âu", "Hỏi lặp lại", "Đi lang thang", "Cố ra cửa", "La hét", "Đập phá", "Từ chối chăm sóc", "Ảo giác"];
const INTERVENTIONS = ["Đánh lạc hướng", "Đưa ra chỗ yên tĩnh", "Âm nhạc", "Cho ăn uống", "Gọi gia đình", "Báo điều dưỡng"];
function BehaviorBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const blank = { place: PLACES[0], triggers: [] as string[], behaviors: [] as string[], severity: "Nhẹ", minutes: "5", interventions: [] as string[], outcome: "Đã dịu" };
  const [f, setF] = useState(blank);
  const tog = (k: "triggers" | "behaviors" | "interventions", v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const save = useBlock(ctx, mode, "BEHAVIOR", () => ({
    kind: "BEHAVIOR", title: `Hành vi: ${f.behaviors.join(", ").toLowerCase()}`,
    detail: `A: ${f.place.toLowerCase()}${f.triggers.length ? `, ${f.triggers.join(", ").toLowerCase()}` : ""} · B: ${f.behaviors.join(", ").toLowerCase()} (${f.severity.toLowerCase()}, ${f.minutes} phút) · C: ${f.interventions.join(", ").toLowerCase()} → ${f.outcome.toLowerCase()}`,
    important: f.severity !== "Nhẹ" || f.outcome !== "Đã dịu",
    internalOnly: f.severity === "Nhẹ", // Q1: mức nhẹ chỉ nội bộ
    data: { place: f.place, triggers: f.triggers, behaviors: f.behaviors, severity: f.severity, minutes: Number(f.minutes), interventions: f.interventions, outcome: f.outcome === "Đã dịu" ? "CALMED" : "NOT_CALMED" },
  }), () => setF(blank));
  return (
    <Block id="BEHAVIOR" title="Nhật ký hành vi (ABC)" main>
      <Rows list={ofKind(ctx.entries, "BEHAVIOR")} empty="Chưa có hành vi nào hôm nay" />
      {!mode.readOnly && <FormArea className="mt-3 space-y-2.5 border-t border-line-soft pt-3">
        <div className="text-[12px] font-semibold text-navy">A · Điều gì xảy ra trước</div>
        <Pick value={f.place} options={PLACES} onChange={(place) => setF({ ...f, place })} />
        <div className="flex flex-wrap gap-1.5">{TRIGGERS.map((x) => <Chip key={x} active={f.triggers.includes(x)} onClick={() => tog("triggers", x)}>{x}</Chip>)}</div>
        <div className="text-[12px] font-semibold text-navy">B · Hành vi</div>
        <div className="flex flex-wrap gap-1.5">{BEHAVIORS.map((x) => <Chip key={x} active={f.behaviors.includes(x)} onClick={() => tog("behaviors", x)}>{x}</Chip>)}</div>
        <div className="flex flex-wrap items-end gap-3"><Pick label="Mức độ" value={f.severity} options={["Nhẹ", "Vừa", "Nặng"]} onChange={(severity) => setF({ ...f, severity })} /><Field label="Kéo dài (phút)" type="number" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} className="w-28" /></div>
        <div className="text-[12px] font-semibold text-navy">C · Cách xử lý và kết quả</div>
        <div className="flex flex-wrap gap-1.5">{INTERVENTIONS.map((x) => <Chip key={x} active={f.interventions.includes(x)} onClick={() => tog("interventions", x)}>{x}</Chip>)}</div>
        <Pick value={f.outcome} options={["Đã dịu", "Chưa dịu"]} onChange={(outcome) => setF({ ...f, outcome })} />
        <SaveBar save={save} disabled={!f.behaviors.length || !f.interventions.length} hint={f.severity === "Nhẹ" ? "Mức nhẹ chỉ lưu nội bộ, gia đình thấy trong báo cáo tuần (Q1)" : "Mức vừa trở lên gia đình thấy ngay"} />
      </FormArea>}
    </Block>
  );
}
function ZoneBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const me = useMe();
  const qc = useQueryClient();
  const checks = ofKind(ctx.entries, "ZONE_CHECK");
  const at = (slot: string) => checks.find((x) => dx(x).slot === slot);
  const wrist = last(checks.filter((x) => dx(x).wristband !== undefined));
  const [exits, setExits] = useState("0");
  const save = useSave(ctx.elderly.id);
  const lost = useMutation({ mutationFn: () => staff.urgent(me, ctx.elderly.id, "LOST", "Không thấy cụ trong khu"), onSuccess: () => qc.invalidateQueries() });
  const mark = (slot: string) => save.mutate({ kind: "ZONE_CHECK", title: slot === "07" ? "Kiểm tra vòng tay" : `Điểm danh trong khu ${slot}h`, detail: `Có mặt ✓ · vòng tay ✓${Number(exits) ? ` · cố ra khỏi khu ${exits} lần` : ""}`, data: { slot, present: true, wristband: true, exitAttempts: Number(exits) }, taskId: mode.taskFor?.("ZONE_CHECK", slot === "07" ? "vòng tay" : `${slot}h`) });
  return (
    <Block id="ZONE_CHECK" title="An toàn trong khu" aside={<Badge tone={wrist && dx(wrist).wristband ? "green" : "orange"}>Vòng tay: {wrist ? (dx(wrist).wristband ? "đang đeo ✓" : "KHÔNG ĐEO") : "chưa kiểm tra"}</Badge>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {["07", "10", "12", "14", "16"].map((s) => {
          const x = at(s);
          return (
            <div key={s} className={cn("rounded-lg border p-2 text-center", x ? "border-green bg-green-soft/40" : s < NOW.slice(0, 2) ? "border-orange" : "border-line")}>
              <div className="text-[12px] font-semibold text-navy">{s === "07" ? "7h · vòng tay" : `${s}h`}</div>
              {x ? <div className="text-[11.5px] text-green-ink">✓ {x.time}</div> : !mode.readOnly ? <button className="mt-0.5 text-[11.5px] font-semibold text-orange hover:underline" onClick={() => mark(s)}>Có mặt ✓</button> : <div className="text-[11.5px] text-subtle">chưa</div>}
            </div>
          );
        })}
      </div>
      {!mode.readOnly && <FormArea className="mt-2 flex flex-wrap items-end gap-2">
        <Field label="Số lần cố ra khỏi khu (từ lần trước)" type="number" value={exits} onChange={(e) => setExits(e.target.value)} className="w-56" />
        <Button size="sm" variant="danger" icon={Siren} loading={lost.isPending} onClick={() => lost.mutate()}>Mất dấu cụ</Button>
        <ErrorText error={save.error ?? lost.error} />
      </FormArea>}
    </Block>
  );
}
function OrientationBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [f, setF] = useState<Dx>({ day: false, place: false, person: false });
  const n = [f.day, f.place, f.person].filter(Boolean).length;
  const save = useBlock(ctx, mode, "ORIENTATION", () => ({ kind: "ORIENTATION", title: "Định hướng", detail: `Thứ mấy ${f.day ? "✓" : "✗"} · Ở đâu ${f.place ? "✓" : "✗"} · Nhận ra người chăm ${f.person ? "✓" : "✗"} (${n}/3)`, data: f }));
  return (
    <Block id="ORIENTATION" title="Định hướng · 9h00">
      <Rows list={ofKind(ctx.entries, "ORIENTATION")} />
      {!mode.readOnly && <FormArea className="mt-2 flex flex-wrap items-center gap-3 border-t border-line-soft pt-2">
        <Checks items={[["day", "Biết hôm nay thứ mấy"], ["place", "Biết đang ở đâu"], ["person", "Nhận ra người chăm"]]} value={f} onChange={setF} />
        <SaveBar save={save} label={`Lưu (${n}/3)`} />
      </FormArea>}
    </Block>
  );
}
function SundownBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [f, setF] = useState<Dx>({});
  const any = Object.values(f).some(Boolean);
  const save = useBlock(ctx, mode, "CARE_CHECK", () => ({ kind: "CARE_CHECK", title: "Đổi tính về chiều", detail: any ? `Có: ${[f.restless && "bồn chồn", f.home && "đòi về", f.pacing && "đi lại liên tục"].filter(Boolean).join(", ")}` : "Không có biểu hiện", important: any, data: { type: "SUNDOWN", ...f } }), undefined, () => "về chiều");
  return (
    <Block id="CARE_CHECK-SUNDOWN" title="Đổi tính về chiều · 15h00–16h30">
      <Rows list={ofKind(ctx.entries, "CARE_CHECK", "SUNDOWN")} />
      {!mode.readOnly && <FormArea className="mt-2 flex flex-wrap items-center gap-3 border-t border-line-soft pt-2">
        <Checks items={[["restless", "Bồn chồn"], ["home", "Đòi về"], ["pacing", "Đi lại liên tục"]]} value={f} onChange={setF} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}

// ------------------------------------------------------------------ CL-STR
function FastBlock({ ctx, mode, embedded }: { ctx: CareCtx; mode: Mode; embedded?: boolean }) {
  // embedded: nằm trong khung Chỉ số hôm nay (CL-STR) thay vì thành khối riêng
  const Wrap = embedded ? SubBlock : Block;
  const me = useMe();
  const qc = useQueryClient();
  const rounds = ofKind(ctx.entries, "FAST_CHECK");
  const [open, setOpen] = useState<number>();
  const [v, setV] = useState({ sys: "", dia: "", pulse: "" });
  const [s, setS] = useState<Dx>({});
  const [suspect, setSuspect] = useState(false);
  const [signs, setSigns] = useState<string[]>([]);
  const positive = Object.values(s).some(Boolean);
  const save = useBlock(ctx, mode, "FAST_CHECK", () => ({
    kind: "FAST_CHECK", title: `HA + FAST lần ${open}`,
    detail: `HA ${v.sys}/${v.dia} · mạch ${v.pulse} · ${positive ? `FAST DƯƠNG TÍNH: ${Object.keys(s).filter((k) => s[k]).join(", ")}` : "FAST âm tính"}`,
    important: positive, data: { round: open, sys: Number(v.sys), dia: Number(v.dia), pulse: Number(v.pulse), face: !!s["méo miệng"], arm: !!s["yếu tay chân"], speech: !!s["nói khó"], extra: Object.keys(s).filter((k) => s[k] && !["méo miệng", "yếu tay chân", "nói khó"].includes(k)), positive },
  }), () => { setOpen(undefined); setV({ sys: "", dia: "", pulse: "" }); setS({}); }, () => `lần ${open}`);
  const urgent = useMutation({ mutationFn: () => staff.urgent(me, ctx.elderly.id, "STROKE", signs.join(", ")), onSuccess: () => { qc.invalidateQueries(); setSuspect(false); setSigns([]); } });
  const slots: [number, string][] = [[1, "Sáng 7h45"], [2, "Trưa 13h30"], [3, "Chiều 15h30"]];
  return (
    <Wrap id="FAST_CHECK" title="HA + FAST · 3 lần/ngày" main aside={!mode.readOnly && <Button size="sm" variant="danger" icon={ShieldAlert} onClick={() => setSuspect(true)}>Nghi tái phát</Button>}>
      <div className="grid gap-2 sm:grid-cols-3">
        {slots.map(([r, label]) => {
          const x = rounds.find((e) => dx(e).round === r);
          const d = dx(x);
          return (
            <button key={r} disabled={!!x || mode.readOnly || !mode.nurse} onClick={() => setOpen(r)} className={cn("rounded-lg border px-3 py-2 text-center", x ? (d.positive ? "border-2 border-red-ink bg-red-soft/40" : "border-green bg-green-soft/30") : "border-line", !x && mode.nurse && !mode.readOnly && "hover:border-orange", open === r && "ring-2 ring-orange")}>
              <div className="text-[12px] font-semibold text-navy">{label}</div>
              <div className="text-[12.5px] text-muted">{x ? `${d.sys}/${d.dia} · FAST ${d.positive ? "⚠" : "✓"}` : "chưa đo"}</div>
            </button>
          );
        })}
      </div>
      {open && !mode.readOnly && mode.nurse && <div className="mt-3 space-y-2 border-t border-line-soft pt-3">
        <div className="flex flex-wrap gap-2">
          <Field label="HA tâm thu" type="number" value={v.sys} onChange={(e) => setV({ ...v, sys: e.target.value })} className="w-28" />
          <Field label="HA tâm trương" type="number" value={v.dia} onChange={(e) => setV({ ...v, dia: e.target.value })} className="w-28" />
          <Field label="Mạch" type="number" value={v.pulse} onChange={(e) => setV({ ...v, pulse: e.target.value })} className="w-24" />
        </div>
        <div className="text-[11px] text-subtle">Checklist FAST — dấu hiệu MỚI hoặc nặng hơn</div>
        <Checks items={[["méo miệng", "F · Méo miệng"], ["yếu tay chân", "A · Yếu tay chân"], ["nói khó", "S · Nói khó, nói ngọng"], ["chóng mặt dữ dội", "Chóng mặt dữ dội"], ["nhìn mờ", "Nhìn mờ"], ["đau đầu dữ dội", "Đau đầu dữ dội"], ["lơ mơ", "Lơ mơ"]]} value={s} onChange={setS} />
        {positive && <Note tone="red">Một mục "Có" = khẩn cấp: hệ thống báo điều dưỡng, Manager, gia đình ngay. Ghi giờ phát hiện, chuẩn bị chuyển viện.</Note>}
        <SaveBar save={save} label={`Lưu lần ${open}`} disabled={!v.sys || !v.dia} />
      </div>}
      <Modal open={suspect} onClose={() => setSuspect(false)} title="Nghi tái phát tai biến" footer={<><Button variant="neutral" onClick={() => setSuspect(false)}>Hủy</Button><Button variant="danger" icon={Siren} loading={urgent.isPending} disabled={!signs.length} onClick={() => urgent.mutate()}>Báo khẩn cấp</Button></>}>
        <div className="mb-2 text-[12.5px] text-muted">Ai cũng bấm được (CL-15). Hệ thống báo điều dưỡng, Manager, gia đình ngay; điều dưỡng bổ sung sự cố chuyển viện sau.</div>
        <div className="flex flex-wrap gap-1.5">{["Méo miệng", "Yếu tay chân mới", "Nói khó", "Chóng mặt dữ dội", "Nhìn mờ", "Lơ mơ"].map((x) => <Chip key={x} active={signs.includes(x)} onClick={() => setSigns(signs.includes(x) ? signs.filter((y) => y !== x) : [...signs, x])}>{x}</Chip>)}</div>
        <ErrorText error={urgent.error} />
      </Modal>
    </Wrap>
  );
}
function SwallowBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [f, setF] = useState({ meal: "Bữa trưa", texture: "Mềm", fluid: "Sánh", cough: "Không", minutes: "20" });
  const [c, setC] = useState<Dx>({ upright: true });
  const save = useBlock(ctx, mode, "SWALLOW", () => ({
    kind: "SWALLOW", title: `Nuốt · ${f.meal.toLowerCase()}`,
    detail: `${f.texture} · nước ${f.fluid.toLowerCase()} · ${c.upright ? "ngồi thẳng" : "chưa ngồi thẳng"} · ho/sặc: ${f.cough.toLowerCase()}${c.wet ? " · giọng ướt" : ""}${c.pocket ? " · đọng thức ăn" : ""} · ${f.minutes} phút`,
    important: f.cough !== "Không" || !!c.wet,
    data: { meal: f.meal, texture: f.texture, fluid: f.fluid, upright: !!c.upright, cough: f.cough === "Không" ? "NONE" : f.cough === "1 lần" ? "ONCE" : "MANY", wetVoice: !!c.wet, pocketing: !!c.pocket, minutes: Number(f.minutes) },
  }), undefined, () => f.meal.toLowerCase());
  return (
    <Block id="SWALLOW" title="Nuốt và bữa ăn" aside={<Badge tone="orange">{ctx.elderly.diet}</Badge>}>
      <Rows list={ofKind(ctx.entries, "SWALLOW")} />
      {!mode.readOnly && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        <Pick value={f.meal} options={["Bữa sáng", "Bữa trưa", "Bữa xế"]} onChange={(meal) => setF({ ...f, meal })} />
        <div className="flex flex-wrap gap-4"><Pick label="Kết cấu" value={f.texture} options={["Thường", "Mềm", "Xay", "Sệt"]} onChange={(texture) => setF({ ...f, texture })} /><Pick label="Nước" value={f.fluid} options={["Thường", "Sánh"]} onChange={(fluid) => setF({ ...f, fluid })} /></div>
        <div className="flex flex-wrap items-end gap-4"><Pick label="Ho / sặc khi ăn" value={f.cough} options={["Không", "1 lần", "Nhiều lần"]} onChange={(cough) => setF({ ...f, cough })} /><Field label="Thời gian ăn (phút)" type="number" value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} className="w-32" /></div>
        <Checks items={[["upright", "Ngồi thẳng khi ăn"], ["wet", "Giọng ướt sau nuốt"], ["pocket", "Thức ăn đọng trong miệng"]]} value={c} onChange={setC} />
        <SaveBar save={save} hint="Sặc nhiều lần → cảnh báo điều dưỡng xem lại kết cấu thức ăn" />
      </FormArea>}
    </Block>
  );
}
function PostureBlock({ ctx, mode }: { ctx: CareCtx; mode: Mode }) {
  const [f, setF] = useState<Dx>({ arm: true, turned: true });
  const [skin, setSkin] = useState("Bình thường");
  const save = useBlock(ctx, mode, "CARE_CHECK", () => ({ kind: "CARE_CHECK", title: "Tư thế và bên liệt", detail: `Kê tay liệt ${yesNo(f.arm)} · đổi tư thế ${yesNo(f.turned)} · da tỳ đè: ${skin.toLowerCase()}${f.shoulder ? " · đau vai bên liệt" : ""}`, important: skin !== "Bình thường" || !!f.shoulder, data: { type: "POSITION", ...f, skin } }), undefined, () => "tư thế");
  return (
    <Block id="CARE_CHECK-POSITION" title={`Tư thế và bên liệt (${(ctx.elderly.affectedSide ?? "—").toLowerCase()})`}>
      <Rows list={ofKind(ctx.entries, "CARE_CHECK", "POSITION")} />
      {!mode.readOnly && <FormArea className="mt-2 space-y-2 border-t border-line-soft pt-2">
        <Checks items={[["arm", "Kê tay liệt đúng"], ["turned", "Đã đổi tư thế"], ["shoulder", "Đau vai bên liệt"]]} value={f} onChange={setF} />
        <Pick label="Da vùng tỳ đè" value={skin} options={["Bình thường", "Đỏ"]} onChange={setSkin} />
        <SaveBar save={save} />
      </FormArea>}
    </Block>
  );
}

// ------------------------------------------------------------------ module phụ (cột phải)
function ModuleCard({ m, ctx, mode }: { m: CareModule; ctx: CareCtx; mode: Mode }) {
  const today = ctx.metrics14.filter((x) => x.at.startsWith(TODAY));
  const g = last(today.filter((x) => x.glucose));
  const bp = last(today.filter((x) => x.sys));
  const [pain, setPain] = useState("3");
  const save = useBlock(ctx, mode, "CARE_CHECK", () => ({ kind: "CARE_CHECK", title: "Khớp: mức đau", detail: `Đau khớp ${pain}/10`, important: Number(pain) >= 7, data: { type: "JOINT", pain: Number(pain) } }));
  const joint = last(ofKind(ctx.entries, "CARE_CHECK", "JOINT"));
  return (
    <div className="rounded-lg border border-line p-2.5 text-[12.5px]">
      <div className="mb-1 font-semibold text-navy">{MODULE_LABEL[m]}</div>
      {m === "GLUCOSE" && <div className="flex items-center justify-between gap-2"><span>{g ? `${g.glucose} mmol/L · ${hm(g.at)}` : "Chưa đo hôm nay"}</span>{mode.nurse && !mode.readOnly && mode.onVitals && <Button size="sm" variant="ai" onClick={mode.onVitals}>Đo</Button>}</div>}
      {m === "BP" && <div className="flex items-center justify-between gap-2"><span>{bp ? `HA ${bp.sys}/${bp.dia} · ${hm(bp.at)}` : "Chưa đo hôm nay"}</span>{mode.nurse && !mode.readOnly && mode.onVitals && <Button size="sm" variant="ai" onClick={mode.onVitals}>Đo</Button>}</div>}
      {m === "JOINT" && <div className="space-y-1.5"><div className="text-muted">{joint ? `${joint.time} · ${joint.detail}` : "Chưa ghi mức đau hôm nay"}</div>{!mode.readOnly && <div className="flex items-end gap-2"><Field label="Đau (0–10)" type="number" value={pain} onChange={(e) => setPain(e.target.value)} className="w-24" /><Button size="sm" loading={save.isPending} onClick={save.run}>Lưu</Button></div>}</div>}
      {m === "FALL" && <div className="text-muted">Suýt ngã 14 ngày: {[...ctx.history, ...ctx.entries].filter((x) => x.kind === "CARE_CHECK" && dx(x).nearFall).length} · {ofKind(ctx.entries, "CARE_CHECK", "FALL").length ? "đã kiểm tra hôm nay ✓" : <a href="#blk-MOD-FALL" className="font-semibold text-orange">ghi checklist ↓</a>}</div>}
      {(m === "CARDIO" || m === "MEMORY" || m === "SWALLOW") && <div className="text-muted">Ghi ở khối {MODULE_LABEL[m].toLowerCase()} phía dưới.</div>}
    </div>
  );
}

// ------------------------------------------------------------------ vùng giữa theo nhóm (dùng chung staff / manager / family)
/**
 * Các khối của màn CL theo nhóm. section: "vitals" = chỉ số + thuốc, "care" = khối chăm sóc riêng + module phụ,
 * bỏ trống = cả hai (màn gia đình, quản lý).
 */
export function GroupBlocks({ ctx, mode, section }: { ctx: CareCtx; mode: Mode; section?: "vitals" | "care" }) {
  const g = ctx.elderly.targetGroup;
  const diabetic = ctx.elderly.conditions.some((c) => c.includes("Tiểu đường"));
  const cardio = ctx.elderly.conditions.some((c) => /tim|suy tim/i.test(c)) || ctx.modules.includes("CARDIO");
  const vitals = section !== "care" && g && (
    <>
      <VitalsPanel ctx={ctx} mode={mode} />
      {(g === "CHRONIC" || (ctx.doses?.length ?? 0) > 0) && <MedsBlock ctx={ctx} mode={mode} />}
    </>
  );
  const care = section !== "vitals" && (
    <>
      {g === "MOBILE" && <><WalkBlock ctx={ctx} mode={mode} main /><FallBlock ctx={ctx} mode={mode} /><OptionalBlock ctx={ctx} /><SocialBlock ctx={ctx} mode={mode} /></>}
      {g === "CHRONIC" && <><DietBlock ctx={ctx} mode={mode} />{diabetic && <FootBlock ctx={ctx} mode={mode} />}{cardio && <CardioBlock ctx={ctx} mode={mode} />}</>}
      {g === "REHAB" && <><ProgressBlock ctx={ctx} /><SessionBlock ctx={ctx} mode={mode} /><DistanceBlock ctx={ctx} mode={mode} /></>}
      {g === "DEMENTIA" && <><BehaviorBlock ctx={ctx} mode={mode} /><ZoneBlock ctx={ctx} mode={mode} /><OrientationBlock ctx={ctx} mode={mode} /><SundownBlock ctx={ctx} mode={mode} /></>}
      {g === "STROKE" && <><SwallowBlock ctx={ctx} mode={mode} /><PostureBlock ctx={ctx} mode={mode} /><SessionBlock ctx={ctx} mode={mode} title="VLTL phục hồi (tập đi, tập tay)" /></>}
      {!g && <Note>Cụ chưa được xếp nhóm, dùng các nút Ghi nhanh.</Note>}
      {ctx.modules.includes("FALL") && g !== "MOBILE" && <FallBlock ctx={ctx} mode={mode} compact />}
      {ctx.modules.includes("SWALLOW") && g !== "STROKE" && <SwallowBlock ctx={ctx} mode={mode} />}
      {ctx.modules.includes("MEMORY") && g !== "DEMENTIA" && <OrientationBlock ctx={ctx} mode={mode} />}
      {ctx.modules.includes("CARDIO") && g !== "CHRONIC" && <CardioBlock ctx={ctx} mode={mode} />}
    </>
  );
  return <div className="space-y-3">{vitals}{care}</div>;
}

// ------------------------------------------------------------------ màn CL của staff
const QUICK: [EntryKindUI, typeof Utensils, string][] = [["MEAL", Utensils, "Ăn"], ["MEAL", Utensils, "Nước"], ["HYGIENE", Bath, "Vệ sinh"], ["NAP", Moon, "Ngủ trưa"], ["MOOD", Smile, "Tâm trạng"], ["ACTIVITY", Activity, "Hoạt động"], ["PHOTO", Camera, "Ảnh"]];
export function CareLogScreen() {
  const me = useMe();
  const qc = useQueryClient();
  const id = Number(useParams().id);
  const [kind, setKind] = useState<EntryKindUI>();
  const [taskFor, setTaskFor] = useState<{ id: number; title: string; time: string }>();
  const [careTask, setCareTask] = useState<DailyTask>();
  const [vitals, setVitals] = useState(false);
  const [incident, setIncident] = useState(false);
  const [skip, setSkip] = useState<number>();
  const [reason, setReason] = useState("");
  const [openForm, setOpenForm] = useState<string>();
  const { data, isLoading, error } = useQuery({ queryKey: ["s-cl", id], queryFn: () => staff.careLog(me, id) });
  useLiveRefresh(id);
  // 3 tab, giữ trên URL (?tab=) để F5 vẫn ở đúng tab; mặc định điều dưỡng vào Chỉ số và thuốc, hộ lý vào Chăm sóc riêng
  const [params, setParams] = useSearchParams();
  const nurseMe = lookups.myPosition(me) === "NURSE";
  const tabParam = params.get("tab");
  const tab: ClTab = tabParam === "vitals" || tabParam === "care" || tabParam === "timeline" ? tabParam : nurseMe ? "vitals" : "care";
  const setTab = (v: ClTab) => setParams((p) => { p.set("tab", v); return p; }, { replace: true });
  /** Mở đúng tab, mở form của khối và cuộn tới đó (bấm việc ở cột trái, hoặc mở từ màn Việc hôm nay với #blk-<khối>). */
  const goToBlock = (kind: string) => {
    setTab(VITALS_KINDS.includes(kind) ? "vitals" : "care");
    setTimeout(() => {
      const el = document.querySelector(`[id^="blk-${kind}"]`);
      if (!el) return;
      setOpenForm(el.id.slice(4));
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };
  const { hash } = useLocation();
  const loaded = !!data;
  useEffect(() => {
    if (loaded && hash.startsWith("#blk-")) goToBlock(hash.slice(5));
    // chỉ chạy khi dữ liệu vừa tải hoặc hash đổi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, hash]);
  const inv = () => qc.invalidateQueries();
  const setTask = useMutation({ mutationFn: ({ t, s, r }: { t: number; s: "DONE" | "SKIPPED"; r?: string }) => staff.setTask(me, t, s, r), onSuccess: () => { inv(); setSkip(undefined); setReason(""); } });
  const close = useMutation({ mutationFn: () => staff.closeLog(me, id), onSuccess: inv });
  const medical = useMutation({ mutationFn: () => staff.markMedicalDone(me, id), onSuccess: inv });
  if (isLoading) return <Page title="Care log" back="/staff/elderly"><Loading /></Page>;
  if (!data) return <Page title="Care log" back="/staff/elderly"><ErrorText error={error} /></Page>;
  const e = data.elderly;
  const nurse = lookups.myPosition(me) === "NURSE";
  const closed = data.day?.status === "CLOSED";
  const present = data.a?.status === "PRESENT";
  const canWrite = !closed && present;
  const photoLimit = data.entitlement?.photoPerDay;
  const scr = SCREEN[e.targetGroup ?? ""] ?? { code: "CL", tab: "Chung" };
  const tasks = data.tasks.filter((t) => t.type !== "CHECKOUT");
  const done = tasks.filter((t) => t.status !== "TODO").length;
  const acts = [...new Set([...data.choices.map((c) => c.name), "Dưỡng sinh, khởi động khớp", "Thư giãn tự do"])];
  const ctx: CareCtx = { ...data, tier: data.sub?.tier, entries: data.entries };
  const mode: Mode = {
    readOnly: !canWrite, nurse, onVitals: () => setVitals(true),
    taskFor: (k, hint) => {
      const open = tasks.filter((t) => t.type === "CARE" && t.entryKind === k && t.status === "TODO" && (t.owner === "NURSE") === nurse);
      if (hint) return open.find((t) => t.title.toLowerCase().includes(hint.toLowerCase()))?.id;
      return careTask?.entryKind === k && careTask.status === "TODO" ? careTask.id : open.find((t) => t.time <= NOW)?.id;
    },
  };
  const openTask = (t: DailyTask) => {
    if (t.type === "CARE" && t.entryKind) {
      setCareTask(t);
      return goToBlock(t.entryKind);
    }
    if (t.type === "VITALS" || t.type === "GLUCOSE") return setVitals(true);
    if (t.type === "MEDICATION") return goToBlock("MEDICATION");
    const k = taskKind(t);
    if (k) { setTaskFor({ id: t.id, title: t.title, time: t.time }); setKind(k); }
  };
  return (
    <Page title={`${scr.code} · Care log ${scr.tab.toLowerCase()}`} back="/staff/elderly" sub={`${weekday(TODAY)} ${dmy(TODAY)} · ${e.targetGroup ? `màn riêng nhóm ${scr.tab}` : "chưa xếp nhóm, chờ điều dưỡng đánh giá"}`}>
      {/* Đầu trang cố định (mục 5.1) */}
      <div className="sticky top-14 z-20 -mx-1 rounded-xl bg-surface p-3 shadow-[0_4px_12px_rgba(18,35,89,0.08)]">
        <div className="flex flex-wrap items-center gap-3">
          <ElderlyCell e={e} size={44} />
          <div className="flex flex-wrap gap-1"><GroupBadge group={e.targetGroup} /><TierBadge tier={data.sub?.tier} />{data.modules.map((m) => <Badge key={m} tone="gray">+ {MODULE_LABEL[m]}</Badge>)}</div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {closed ? <Badge tone="green">Đã chốt · {data.closer?.fullName} {hm(data.day?.closedAt)}</Badge> : <Badge tone="orange">Đang mở</Badge>}
            {data.day?.medicalDoneAt && <Badge tone="teal">Xong phần y tế ✓ {data.medicalDoner?.fullName}</Badge>}
            <Button size="sm" variant="neutral" icon={History} to={`/staff/elderly/${id}/history`}>Lịch sử</Button>
            {!closed && <Button size="sm" variant="danger" icon={TriangleAlert} onClick={() => setIncident(true)}>Báo sự cố</Button>}
            {!closed && nurse && !data.day?.medicalDoneAt && <Button size="sm" variant="outline" icon={Stethoscope} loading={medical.isPending} onClick={() => medical.mutate()}>Xong phần y tế</Button>}
            {!closed && e.caregiverId === me.id && <Button size="sm" icon={Lock} loading={close.isPending} onClick={() => close.mutate()}>Chốt care log</Button>}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span><b className="text-red-ink">Dị ứng:</b> {e.allergies.join(", ") || "không"}</span>
          <span><b className="text-navy">Ăn:</b> {e.diet || "bình thường"}</span>
          {e.affectedSide && <span><b className="text-navy">Bên liệt:</b> {e.affectedSide.toLowerCase()}</span>}
          {e.likes && <span><b className="text-green-ink">Thích:</b> {e.likes}</span>}
          {e.avoid && <span><b className="text-amber-ink">Tránh:</b> {e.avoid}</span>}
          <span><b className="text-navy">Ảnh:</b> {data.photos}/{photoLimit ?? "∞"}</span>
          {data.permissions.map((p) => <Badge key={p.serviceId} tone={p.allowed ? "green" : "red"}>{p.allowed ? "✓" : "✗"} {p.service?.name}</Badge>)}
        </div>
        {/* Ghi nhanh chung: luôn thấy, không phụ thuộc tab */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-2">
          <span className="mr-1 text-[11.5px] font-semibold text-subtle">Ghi nhanh</span>
          {QUICK.map(([k, Icon, l]) => <Button key={l} size="sm" variant="neutral" icon={Icon} disabled={!canWrite || (k === "PHOTO" && photoLimit != null && data.photos >= photoLimit)} onClick={() => { setTaskFor(undefined); setKind(k); }}>{l}</Button>)}
          <Button size="sm" variant="outline" icon={NotebookPen} disabled={!canWrite} onClick={() => { setTaskFor(undefined); setKind("NOTE"); }}>Lưu ý</Button>
        </div>
        <ErrorText error={close.error ?? medical.error} />
      </div>
      {!present && !closed && <Note>Cụ {data.a?.status === "LEFT" ? "đã về" : "chưa có mặt"} — các khối ở chế độ chỉ xem (CL-01).</Note>}

      <div className="grid items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Cột trái: việc hôm nay */}
        <aside className="rounded-xl bg-surface p-3 shadow-[0_2px_6px_rgba(18,35,89,0.06)] lg:sticky lg:top-44">
          <div className="mb-2 flex items-center justify-between"><h3 className="text-[14px] font-semibold text-navy">Việc hôm nay</h3><span className="text-[11.5px] text-subtle">{done}/{tasks.length}</span></div>
          <ul className="space-y-0.5">
            {tasks.map((t) => {
              const mine = (t.owner === "NURSE") === nurse;
              const late = t.status === "TODO" && t.time < NOW;
              return (
                <li key={t.id} className={cn("group flex items-start gap-1.5 rounded-lg px-1.5 py-1 text-[12px]", careTask?.id === t.id && "bg-orange-soft", !mine && "opacity-60")}>
                  <span className={cn("mt-0.5 w-3 shrink-0", t.status === "DONE" ? "text-green-ink" : t.status === "SKIPPED" ? "text-subtle" : late ? "text-orange" : "text-subtle")}>{t.status === "DONE" ? "✓" : t.status === "SKIPPED" ? "–" : "○"}</span>
                  <button disabled={!canWrite || !mine || t.status !== "TODO"} onClick={() => openTask(t)} className={cn("min-w-0 flex-1 text-left", t.status !== "TODO" ? "text-subtle" : late ? "font-semibold text-amber-ink" : "text-body", canWrite && mine && t.status === "TODO" && "hover:underline")}>
                    <b className="mr-1">{t.time}</b>{t.title}{t.type === "CARE" && <span className="ml-1 text-[10px] text-blue">●</span>}
                    {t.skipReason && <span className="block text-[11px] text-amber-ink">Bỏ qua: {t.skipReason}</span>}
                  </button>
                  {canWrite && mine && t.status === "TODO" && t.type !== "CARE" && <button className="hidden text-[11px] text-orange group-hover:block" onClick={() => setTask.mutate({ t: t.id, s: "DONE" })}>✓</button>}
                  {canWrite && mine && t.status === "TODO" && <button className="hidden text-[11px] text-subtle group-hover:block" onClick={() => setSkip(t.id)}>bỏ</button>}
                </li>
              );
            })}
          </ul>
          <div className="mt-2 text-[10.5px] text-subtle">● = ghi ở khối riêng của nhóm · cam = quá giờ</div>
        </aside>

        {/* Vùng chính: 3 tab */}
        <main className="min-w-0 space-y-3">
          <Tabs value={tab} onChange={(v) => { setOpenForm(undefined); setTab(v); }} items={[
            { value: "vitals", label: "Chỉ số và thuốc" },
            { value: "care", label: "Chăm sóc riêng" },
            { value: "timeline", label: `Dòng thời gian (${data.entries.length})` },
          ]} />
          <FormCtx.Provider value={{ open: openForm, setOpen: setOpenForm }}>
            {tab === "vitals" && (e.targetGroup ? <GroupBlocks ctx={ctx} mode={mode} section="vitals" /> : <Note>Cụ chưa được xếp nhóm, chưa có khung chỉ số.</Note>)}
            {tab === "care" && (
              <>
                <GroupBlocks ctx={ctx} mode={mode} section="care" />
                {data.modules.length > 0 && (
                  <Block id="MODULES" title="Module phụ">
                    <div className="grid gap-2 sm:grid-cols-2">{data.modules.map((m) => <ModuleCard key={m} m={m} ctx={ctx} mode={mode} />)}</div>
                  </Block>
                )}
              </>
            )}
          </FormCtx.Provider>
          {tab === "timeline" && (
            <Block id="TIMELINE" title="Dòng thời gian hôm nay" aside={<span className="text-[11px] text-subtle">Mới nhất ở trên</span>}>
              <Timeline entries={data.entries} showStaff />
            </Block>
          )}
        </main>
      </div>

      <EntryModal key={`${kind}-${taskFor?.id ?? "free"}`} kind={kind} task={taskFor} elderly={e} activities={acts} photoInfo={`${data.photos}/${photoLimit ?? "không giới hạn"} ảnh hôm nay`} onClose={() => { setKind(undefined); setTaskFor(undefined); }} />
      <VitalsModal open={vitals} onClose={() => setVitals(false)} elderly={e} thresholds={data.thresholds} />
      {incident && <IncidentModal open onClose={() => setIncident(false)} elderlyOptions={[e]} defaultElderly={e.id} />}
      <Modal open={!!skip} onClose={() => setSkip(undefined)} title="Bỏ qua việc" footer={<><Button variant="neutral" onClick={() => setSkip(undefined)}>Hủy</Button><Button loading={setTask.isPending} onClick={() => setTask.mutate({ t: skip!, s: "SKIPPED", r: reason })}>Bỏ qua</Button></>}>
        <TextArea label="Lý do (bắt buộc, CL-02)" value={reason} onChange={(ev) => setReason(ev.target.value)} />
        <div className="mt-2 flex flex-wrap gap-1.5">{["Cụ mệt, xin nghỉ", "Cụ từ chối", "Thiết bị đang hỏng", "Đang ở phòng y tế"].map((r) => <Chip key={r} onClick={() => setReason(r)}>{r}</Chip>)}</div>
        <ErrorText error={setTask.error} />
      </Modal>
    </Page>
  );
}
