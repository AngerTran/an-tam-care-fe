// UI kit matching the Figma "UI Components" page: Button, Badge, Chip, Input, plus Card, Table,
// Toggle, Avatar, Modal, Note, Kpi, EmptyState used across every portal.
import clsx from "clsx";
import { Info, Loader2, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { initials as toInitials } from "../lib/format";

export const cn = clsx;

// ------------------------------------------------------------------ Button
type BtnVariant = "primary" | "outline" | "neutral" | "danger" | "success" | "ai" | "navy";
type BtnSize = "lg" | "md" | "sm";
const btnVariant: Record<BtnVariant, string> = {
  primary: "bg-orange text-white hover:brightness-95",
  outline: "bg-surface text-orange border-[1.5px] border-orange hover:bg-orange-soft",
  neutral: "bg-surface text-muted border-[1.5px] border-input-line hover:bg-canvas",
  danger: "bg-surface text-red-ink border-[1.5px] border-red-line hover:bg-red-soft/40",
  success: "bg-green text-white hover:brightness-95",
  ai: "bg-teal text-white hover:brightness-95",
  navy: "bg-navy text-white hover:brightness-110",
};
const btnSize: Record<BtnSize, string> = {
  lg: "h-12 px-5 text-sm font-bold rounded-[14px] gap-2",
  md: "h-9 px-3.5 text-[12.5px] font-semibold rounded-[10px] gap-1.5",
  sm: "h-7 px-2.5 text-[11.5px] font-semibold rounded-[9px] gap-1",
};
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize; icon?: LucideIcon; to?: string; loading?: boolean; block?: boolean };
export function Button({ variant = "primary", size = "md", icon: Icon, to, loading, block, className, children, disabled, ...rest }: BtnProps) {
  const cls = cn("inline-flex items-center justify-center whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange", btnVariant[variant], btnSize[size], block && "w-full", className);
  const iconSize = size === "lg" ? 16 : size === "md" ? 14 : 12;
  const inner = (
    <>
      {loading ? <Loader2 size={iconSize} className="animate-spin" /> : Icon && <Icon size={iconSize} strokeWidth={2.2} />}
      {children}
    </>
  );
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button className={cls} disabled={disabled || loading} {...rest}>{inner}</button>;
}

// ------------------------------------------------------------------ Badge / Chip
export type Tone = "green" | "orange" | "red" | "blue" | "teal" | "purple" | "gray";
const toneCls: Record<Tone, string> = {
  green: "bg-green-soft text-green-ink", orange: "bg-amber-soft text-amber-ink", red: "bg-red-soft text-red-ink", blue: "bg-blue-soft text-blue",
  teal: "bg-teal-soft text-teal-ink", purple: "bg-purple-soft text-purple-ink", gray: "bg-line-soft text-subtle",
};
export function Badge({ tone = "blue", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", toneCls[tone], className)}>{children}</span>;
}
export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition", active ? "bg-navy text-white" : "bg-blue-soft text-blue hover:brightness-95")}>
      {children}
    </button>
  );
}

// ------------------------------------------------------------------ form fields (label sits inside the box, like Figma "Input")
const boxCls = "group block rounded-[10px] border-[1.5px] border-input-line bg-surface px-3 py-1.5 focus-within:border-orange transition";
const labelCls = "block text-[10px] text-subtle leading-4";
const ctrlCls = "w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-faint";
type FieldExtra = { label?: string; error?: string; className?: string };
export function Field({ label, error, className, ...p }: InputHTMLAttributes<HTMLInputElement> & FieldExtra) {
  return (
    <label className={cn("block", className)}>
      <span className={cn(boxCls, error && "border-red-line")}>
        {label && <span className={labelCls}>{label}</span>}
        <input className={cn(ctrlCls, !label && "py-1")} {...p} />
      </span>
      {error && <span className="mt-1 block text-[11px] text-red-ink">{error}</span>}
    </label>
  );
}
export function SelectField({ label, error, className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement> & FieldExtra) {
  return (
    <label className={cn("block", className)}>
      <span className={cn(boxCls, error && "border-red-line")}>
        {label && <span className={labelCls}>{label}</span>}
        <select className={cn(ctrlCls, "cursor-pointer")} {...p}>{children}</select>
      </span>
      {error && <span className="mt-1 block text-[11px] text-red-ink">{error}</span>}
    </label>
  );
}
export function TextArea({ label, error, className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldExtra) {
  return (
    <label className={cn("block", className)}>
      <span className={cn(boxCls, error && "border-red-line")}>
        {label && <span className={labelCls}>{label}</span>}
        <textarea className={cn(ctrlCls, "min-h-16 resize-y")} {...p} />
      </span>
      {error && <span className="mt-1 block text-[11px] text-red-ink">{error}</span>}
    </label>
  );
}

// ------------------------------------------------------------------ layout pieces
export function Card({ title, actions, children, className, bodyClass }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("rounded-xl bg-surface p-4 shadow-[0_2px_6px_rgba(18,35,89,0.06)]", className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-[14px] font-bold text-navy">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Kpi({ label, value, sub, color = "blue" }: { label: string; value: ReactNode; sub?: ReactNode; color?: "blue" | "green" | "orange" | "red" | "teal" | "gray" }) {
  const bar = { blue: "border-blue", green: "border-green", orange: "border-orange", red: "border-[#e05a5a]", teal: "border-teal", gray: "border-subtle" }[color];
  return (
    <div className={cn("min-w-0 flex-1 rounded-xl border-l-4 bg-surface px-4 py-3 shadow-[0_2px_6px_rgba(18,35,89,0.06)]", bar)}>
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="text-2xl leading-tight font-bold text-navy">{value}</div>
      {sub && <div className="text-[11px] text-green">{sub}</div>}
    </div>
  );
}

export type Column<T> = { key: string; header: ReactNode; render: (row: T) => ReactNode; className?: string };
export function Table<T>({ columns, rows, rowKey, onRowClick, empty = "Chưa có dữ liệu" }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string | number; onRowClick?: (r: T) => void; empty?: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b-[1.5px] border-line text-left">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-2.5 py-2 text-[10.5px] font-semibold tracking-wide text-subtle uppercase", c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-2.5 py-8 text-center text-subtle">{empty}</td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined} className={cn("border-b border-line-soft last:border-0", onRowClick && "cursor-pointer hover:bg-canvas")}>
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2.5 py-2.5 align-middle text-body", c.className)}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Toggle({ checked, onChange, label, sub }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; sub?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      {label && (
        <span className="min-w-0">
          <span className="block text-[12.5px] font-medium text-ink">{label}</span>
          {sub && <span className="block text-[11px] text-subtle">{sub}</span>}
        </span>
      )}
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={cn("relative h-5 w-9 shrink-0 rounded-full transition", checked ? "bg-green" : "bg-switch-off")}>
        <span className={cn("absolute top-[3px] size-3.5 rounded-full bg-surface transition-all", checked ? "left-[19px]" : "left-[3px]")} />
      </button>
    </label>
  );
}

export function Avatar({ name, size = 32, tone = "blue" }: { name: string; size?: number; tone?: "blue" | "teal" | "purple" | "orange" }) {
  const bg = { blue: "bg-blue-chip text-navy", teal: "bg-teal-soft text-teal-ink", purple: "bg-purple-soft text-purple-ink", orange: "bg-amber-soft text-amber-ink" }[tone];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", bg)} style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}>
      {toInitials(name)}
    </span>
  );
}

export function Note({ tone = "orange", children, className }: { tone?: "orange" | "red" | "green"; children: ReactNode; className?: string }) {
  const cls = { orange: "bg-orange-soft border-orange-line text-orange-ink", red: "bg-red-note border-red-note-line text-red-ink", green: "bg-green-note border-green-note-line text-green-ink" }[tone];
  const Icon = tone === "red" ? TriangleAlert : Info;
  return (
    <div className={cn("flex items-start gap-2 rounded-[10px] border px-3 py-2 text-[12px] leading-relaxed", cls, className)}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex size-24 items-center justify-center rounded-full bg-blue-soft text-blue">
        <Icon size={40} />
      </span>
      <div className="text-[16px] font-bold text-navy">{title}</div>
      {desc && <p className="mt-1 max-w-sm text-[12.5px] text-muted">{desc}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function IconCircle({ icon: Icon, tone = "blue", size = 56 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full", toneCls[tone])} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.45)} />
    </span>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 420 }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,18,46,0.45)] p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal className="max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          {title && <h3 className="text-[16px] font-bold text-navy">{title}</h3>}
          <button onClick={onClose} className="-mt-1 -mr-2 rounded-lg p-1 text-subtle hover:bg-canvas" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="mt-3">{children}</div>
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, icon, tone = "green", title, desc, confirmLabel, confirmVariant = "success", loading }: { open: boolean; onClose: () => void; onConfirm: () => void; icon: LucideIcon; tone?: Tone; title: string; desc: ReactNode; confirmLabel: string; confirmVariant?: BtnVariant; loading?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} width={400}>
      <div className="flex flex-col items-center text-center">
        <IconCircle icon={icon} tone={tone} />
        <div className="mt-3 text-[16px] font-bold text-navy">{title}</div>
        <p className="mt-1 text-[12.5px] text-muted">{desc}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="neutral" onClick={onClose}>Huỷ</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function Loading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-subtle">
      <Loader2 size={18} className="animate-spin" /> {label}
    </div>
  );
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  return <Note tone="red">{error instanceof Error ? error.message : String(error)}</Note>;
}

export function KV({ label, children, w = 120 }: { label: ReactNode; children: ReactNode; w?: number }) {
  return (
    <div className="flex items-start gap-2 py-1 text-[12.5px]">
      <span className="shrink-0 text-subtle" style={{ width: w }}>{label}</span>
      <span className="min-w-0 font-semibold text-ink">{children}</span>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { value: T; label: ReactNode }[] }) {
  return (
    <div className="flex gap-1 border-b-[1.5px] border-line">
      {items.map((i) => (
        <button key={i.value} type="button" onClick={() => onChange(i.value)} className={cn("-mb-[1.5px] px-3.5 py-2 text-[12.5px] font-semibold transition", value === i.value ? "border-b-[2.5px] border-orange text-orange" : "text-subtle hover:text-muted")}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Photo({ tone, caption }: { tone: "blue" | "orange" | "green"; caption?: string }) {
  const bg = { blue: "from-[#cfe0f5] to-[#9db8e0]", orange: "from-[#fde1cc] to-[#f7b182]", green: "from-[#d3efdf] to-[#8ed2ae]" }[tone];
  return (
    <figure className={cn("flex aspect-[4/3] items-end rounded-[10px] bg-gradient-to-br p-2", bg)}>
      {caption && <figcaption className="rounded bg-surface/80 px-1.5 text-[10px] text-ink">{caption}</figcaption>}
    </figure>
  );
}
