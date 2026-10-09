// Nút chọn giao diện Sáng / Tối / Theo hệ thống (đặt ở thanh trên cùng).
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme, type ThemePref } from "../lib/theme";
import { cn } from "./ui";

const OPTS: [ThemePref, typeof Sun, string][] = [["light", Sun, "Sáng"], ["dark", Moon, "Tối"], ["system", Monitor, "Theo hệ thống"]];

export function ThemeToggle({ className }: { className?: string }) {
  const { pref, mode, setPref } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const Icon = mode === "dark" ? Moon : Sun;
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen(!open)} aria-label="Giao diện sáng / tối" aria-haspopup="menu" aria-expanded={open} title="Giao diện" className="rounded-lg p-1.5 text-muted hover:bg-canvas hover:text-orange">
        <Icon size={18} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          {OPTS.map(([v, I, label]) => (
            <button key={v} role="menuitemradio" aria-checked={pref === v} onClick={() => { setPref(v); setOpen(false); }} className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-canvas", pref === v ? "font-semibold text-orange" : "text-body")}>
              <I size={15} />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
