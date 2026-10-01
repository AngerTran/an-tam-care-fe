export const vnd = (n: number) => n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";

export const millions = (n: number) => (n / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " triệu";

/** "2026-10-01" -> "01/10/2026" */
export const dmy = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");

/** "2026-10-01" -> "01/10" */
export const dm = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");

/** "2026-10-01T09:44:00" -> "09:44" */
export const hm = (iso?: string) => (iso ? iso.slice(11, 16) : "—");

export const age = (dob: string, today = "2026-10-01") => {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
};

const WD = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const weekday = (iso: string) => WD[new Date(iso + "T00:00:00").getDay()];

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86_400_000);

export const refundCode = (id: number) => `RF-${String(id).padStart(4, "0")}`;
