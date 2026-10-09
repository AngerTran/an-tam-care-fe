// Giao diện sáng / tối. Lựa chọn lưu trên trình duyệt; "system" theo cài đặt của máy.
import { useEffect, useState } from "react";

export type ThemePref = "light" | "dark" | "system";
const KEY = "atc-theme";
const media = () => window.matchMedia?.("(prefers-color-scheme: dark)");

export function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}
const resolve = (p: ThemePref) => (p === "system" ? (media()?.matches ? "dark" : "light") : p);

export function applyTheme(p: ThemePref = readPref()) {
  const mode = resolve(p);
  document.documentElement.classList.toggle("dark", mode === "dark");
  document.documentElement.style.colorScheme = mode;
}

/** Gọi một lần lúc khởi động: áp theme ngay và theo dõi khi máy đổi sáng/tối. */
export function initTheme() {
  applyTheme();
  media()?.addEventListener("change", () => readPref() === "system" && applyTheme());
}

const listeners = new Set<(p: ThemePref) => void>();
export function setPref(p: ThemePref) {
  try {
    if (p === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, p);
  } catch {
    /* private mode: chỉ áp cho phiên này */
  }
  applyTheme(p);
  listeners.forEach((f) => f(p));
}

export function useTheme() {
  const [pref, set] = useState<ThemePref>(readPref);
  useEffect(() => {
    listeners.add(set);
    return () => void listeners.delete(set);
  }, []);
  return { pref, mode: resolve(pref), setPref };
}
