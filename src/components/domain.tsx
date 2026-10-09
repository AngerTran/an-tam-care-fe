// Domain widgets shared by every portal: tier / group / status badges, the care-log timeline,
// small SVG charts and the family's "which elderly" picker.
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, Bath, Camera, CircleCheck, DoorOpen, LogIn, Moon, NotebookPen, Pill, Search, Smile, Utensils, type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { family } from "../api";
import { useMe } from "../auth/AuthContext";
import { GROUP_LABEL, GROUP_TONE, POSITION_LABEL, SERVICE_TERMS, SUB_STATUS, TIER_LABEL, TIER_TONE } from "../domain/catalog";
import { age } from "../lib/format";
import type { Attendance, CareLogEntry, ElderlyMember, Position, SubStatus, TargetGroup, Tier } from "../types/models";
import { Avatar, Badge, cn, Photo, SelectField, type Tone } from "./ui";

export const TierBadge = ({ tier }: { tier?: Tier }) => (tier ? <Badge tone={TIER_TONE[tier]}>{TIER_LABEL[tier]}</Badge> : null);
export const GroupBadge = ({ group }: { group?: TargetGroup }) => (group ? <Badge tone={GROUP_TONE[group]}>{GROUP_LABEL[group]}</Badge> : <Badge tone="gray">Chưa xếp nhóm</Badge>);
export const SubBadge = ({ status }: { status?: SubStatus }) => (status ? <Badge tone={SUB_STATUS[status][0]}>{SUB_STATUS[status][1]}</Badge> : <Badge tone="gray">Chưa có gói</Badge>);
export const PositionBadge = ({ position }: { position?: Position }) => (position ? <Badge tone={position === "NURSE" ? "teal" : "blue"}>{POSITION_LABEL[position]}</Badge> : null);

export const attBadge = (a?: Attendance, absent?: boolean): [Tone, string] =>
  absent ? ["purple", "Báo nghỉ"] : !a ? ["gray", "Chưa đến"] : a.status === "PRESENT" ? ["green", "Đang ở trung tâm"] : a.status === "LEFT" ? ["blue", "Đã về"] : a.status === "ABSENT" ? ["purple", "Vắng"] : ["orange", "Chưa đến"];
export const AttBadge = ({ a, absent }: { a?: Attendance; absent?: boolean }) => {
  const [t, l] = attBadge(a, absent);
  return <Badge tone={t}>{l}</Badge>;
};

export function ElderlyCell({ e, sub, size = 30 }: { e: ElderlyMember; sub?: ReactNode; size?: number }) {
  const tone = e.tone === "green" ? "teal" : e.tone;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={e.fullName} size={size} tone={tone as "blue" | "teal" | "purple" | "orange"} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-navy">{e.fullName}</span>
        <span className="block truncate text-[11px] text-subtle">{sub ?? `${age(e.dateOfBirth)} tuổi · ${e.gender}`}</span>
      </span>
    </span>
  );
}

export function Progress({ value, tone = "green" }: { value: number; tone?: "green" | "orange" | "red" | "blue" }) {
  const c = { green: "bg-green", orange: "bg-orange", red: "bg-[#e05a5a]", blue: "bg-blue" }[tone];
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
      <span className={cn("block h-full rounded-full", c)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={cn("flex h-9 items-center gap-2 rounded-[10px] border-[1.5px] border-input-line bg-white px-2.5", className ?? "w-64")}>
      <Search size={14} className="text-subtle" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 text-[12.5px] outline-none" />
    </label>
  );
}

export const ENTRY_ICON: Record<CareLogEntry["kind"], [LucideIcon, Tone]> = {
  CHECKIN: [LogIn, "blue"], CHECKOUT: [DoorOpen, "blue"], MEAL: [Utensils, "orange"], HYGIENE: [Bath, "teal"], ACTIVITY: [Activity, "green"], NAP: [Moon, "purple"],
  MOOD: [Smile, "orange"], PHOTO: [Camera, "teal"], NOTE: [NotebookPen, "red"], VITALS: [Activity, "red"], MEDICATION: [Pill, "purple"], INCIDENT: [AlertTriangle, "red"],
};
const toneBg: Record<Tone, string> = { green: "bg-green-soft text-green-ink", orange: "bg-amber-soft text-amber-ink", red: "bg-red-soft text-red-ink", blue: "bg-blue-soft text-blue", teal: "bg-teal-soft text-teal-ink", purple: "bg-purple-soft text-purple-ink", gray: "bg-line-soft text-subtle" };

export function Timeline({ entries, showStaff, onEdit }: { entries: (CareLogEntry & { staff?: { fullName: string }; edited?: boolean })[]; showStaff?: boolean; onEdit?: (e: CareLogEntry) => void }) {
  if (!entries.length) return <div className="py-6 text-center text-[12.5px] text-subtle">Chưa có ghi chép</div>;
  return (
    <ol className="relative space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-line">
      {entries.map((x) => {
        const [Icon, tone] = ENTRY_ICON[x.kind];
        return (
          <li key={x.id} className="relative flex gap-3">
            <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white", toneBg[tone])}><Icon size={14} /></span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 text-[12.5px]">
                <span className="font-semibold text-navy">{x.title}</span>
                <span className="text-[11px] text-subtle">{x.time}</span>
                {x.important && <Badge tone="red">Lưu ý</Badge>}
                {x.edited && <Badge tone="gray">Đã sửa</Badge>}
                {showStaff && x.staff && <span className="text-[11px] text-subtle">· {x.staff.fullName}</span>}
                {onEdit && <button className="ml-auto text-[11px] font-semibold text-orange hover:underline" onClick={() => onEdit(x)}>Sửa</button>}
              </div>
              <div className="text-[12px] text-muted">{x.detail}</div>
              {x.kind === "PHOTO" && <div className="mt-1.5 w-40"><Photo tone={x.tone ?? "blue"} caption={x.detail} /></div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Minimal multi-series line chart (SVG). */
export function LineChart({ series, height = 180, min, max, bands, labels }: { series: { name: string; color: string; values: (number | undefined)[] }[]; height?: number; min?: number; max?: number; bands?: { from: number; to: number; label: string }[]; labels: string[] }) {
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== undefined));
  const lo = min ?? Math.floor(Math.min(...all) - 5);
  const hi = max ?? Math.ceil(Math.max(...all) + 5);
  const W = 600, H = height, P = 28;
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, labels.length - 1);
  const y = (v: number) => H - 20 - ((v - lo) / (hi - lo || 1)) * (H - 36);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
        {bands?.map((b) => <rect key={b.label} x={P} width={W - P * 2} y={y(Math.min(hi, b.to))} height={Math.max(0, y(Math.max(lo, b.from)) - y(Math.min(hi, b.to)))} fill="#fadcdc" opacity={0.5} />)}
        {[lo, (lo + hi) / 2, hi].map((v) => (
          <g key={v}>
            <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="#eef0f6" />
            <text x={4} y={y(v) + 3} fontSize="9" fill="#8b95a9">{Math.round(v * 10) / 10}</text>
          </g>
        ))}
        {series.map((s) => {
          const pts = s.values.map((v, i) => (v === undefined ? null : `${x(i)},${y(v)}`)).filter(Boolean);
          return (
            <g key={s.name}>
              <polyline points={pts.join(" ")} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
              {s.values.map((v, i) => v !== undefined && <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={s.color} />)}
            </g>
          );
        })}
        {labels.map((l, i) => (i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1) && <text key={i} x={x(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="#8b95a9">{l}</text>)}
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted">
        {series.map((s) => <span key={s.name} className="flex items-center gap-1"><span className="inline-block h-0.5 w-3" style={{ background: s.color }} />{s.name}</span>)}
        {bands?.map((b) => <span key={b.label} className="flex items-center gap-1"><span className="inline-block size-2.5 bg-red-soft" />{b.label}</span>)}
      </div>
    </div>
  );
}

export function Bars({ data, height = 150, format = (v: number) => String(v), highlightLast }: { data: { label: string; value: number }[]; height?: number; format?: (v: number) => string; highlightLast?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-around gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[10px] whitespace-nowrap text-subtle">{format(d.value)}</span>
          <div className={cn("w-full max-w-10 rounded-t-md", highlightLast && i === data.length - 1 ? "bg-orange" : "bg-blue")} style={{ height: `${(d.value / max) * (height - 40)}px` }} />
          <span className="truncate text-[10px] text-subtle">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Stat({ label, value, tone = "navy", icon: Icon }: { label: string; value: ReactNode; tone?: "navy" | "green" | "orange" | "red" | "purple"; icon?: LucideIcon }) {
  const c = { navy: "text-navy", green: "text-green-ink", orange: "text-amber-ink", red: "text-red-ink", purple: "text-purple-ink" }[tone];
  return (
    <div className="rounded-xl bg-canvas px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] text-subtle">{Icon && <Icon size={12} />}{label}</div>
      <div className={cn("text-[18px] font-bold", c)}>{value}</div>
    </div>
  );
}

export function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return <span className={cn("flex items-start gap-1.5 text-[12px]", ok ? "text-ink" : "text-faint line-through")}><CircleCheck size={14} className={cn("mt-0.5 shrink-0", ok ? "text-green" : "text-faint")} />{children}</span>;
}

/** "Quy định dịch vụ" (BR-79): shown on the public site and before the family commits and pays. */
export function ServiceTerms({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 text-[12.5px]", className)}>
      {SERVICE_TERMS.map((s, i) => (
        <div key={s.title}>
          <div className="font-bold text-navy">{i + 1}. {s.title}</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted">{s.items.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ family: selected elderly
const KEY = "atc-family-elderly";
export function useFamilyElderly() {
  const me = useMe();
  const { data = [], isLoading } = useQuery({ queryKey: ["f-relatives", me.id], queryFn: () => family.relatives(me) });
  const usable = data.filter((r) => ["ACTIVE", "PAUSED", "SUSPENDED"].includes(r.elderly.status));
  const [id, setId] = useState<number | undefined>(() => {
    try { return Number(localStorage.getItem(KEY)) || undefined; } catch { return undefined; }
  });
  useEffect(() => {
    if (!usable.length) return;
    if (!id || !usable.some((r) => r.elderly.id === id)) setId(usable[0].elderly.id);
  }, [usable, id]);
  const pick = (v: number) => {
    setId(v);
    try { localStorage.setItem(KEY, String(v)); } catch { /* ignore */ }
  };
  return { id: usable.some((r) => r.elderly.id === id) ? id : usable[0]?.elderly.id, rows: usable, all: data, pick, isLoading };
}
export function ElderlyPicker({ rows, value, onChange }: { rows: { elderly: ElderlyMember }[]; value?: number; onChange: (id: number) => void }) {
  if (rows.length <= 1) return null;
  return (
    <SelectField label="Người thân" value={value ?? ""} onChange={(e) => onChange(Number(e.target.value))} className="w-56">
      {rows.map((r) => <option key={r.elderly.id} value={r.elderly.id}>{r.elderly.gender === "Nữ" ? "Bà" : "Ông"} {r.elderly.fullName}</option>)}
    </SelectField>
  );
}
