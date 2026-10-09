// Form validation shared by the UI (inline errors) and the mock API (rejects bad data).
// Each function returns { field: message } — empty object means valid.
import { DEMO_TODAY } from "../mock/seed";
import { addDays, age, daysBetween } from "./format";

export type Errors = Record<string, string>;
/** Luật Người cao tuổi: từ đủ 60 tuổi. Trên 110 coi như nhập sai năm. */
export const MIN_AGE = 60;
export const MAX_AGE = 110;
export const dobMax = () => `${Number(DEMO_TODAY.slice(0, 4)) - MIN_AGE}${DEMO_TODAY.slice(4)}`;
export const dobMin = () => `${Number(DEMO_TODAY.slice(0, 4)) - MAX_AGE}${DEMO_TODAY.slice(4)}`;

const isDate = (v?: string) => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};
const name = (v: string | undefined, label = "Họ tên") => {
  const s = (v ?? "").trim();
  if (!s) return `Nhập ${label.toLowerCase()}`;
  if (s.length < 2) return `${label} quá ngắn`;
  if (s.length > 60) return `${label} tối đa 60 ký tự`;
  if (/[\d@#$%^&*_=+<>{}[\]\\/|~`!?]/.test(s)) return `${label} chỉ gồm chữ cái và khoảng trắng`;
  return "";
};
export const phoneOk = (v: string) => /^0\d{9}$/.test(v.replace(/[\s.]/g, ""));

/** Hồ sơ người cao tuổi (gia đình thêm/sửa). */
export function validateRelative(v: { fullName?: string; dateOfBirth?: string; address?: string; phone?: string }): Errors {
  const e: Errors = {};
  const n = name(v.fullName);
  if (n) e.fullName = n;
  if (!v.dateOfBirth) e.dateOfBirth = "Nhập ngày sinh";
  else if (!isDate(v.dateOfBirth)) e.dateOfBirth = "Ngày sinh không hợp lệ";
  else if (v.dateOfBirth > DEMO_TODAY) e.dateOfBirth = "Ngày sinh không được ở tương lai";
  else if (age(v.dateOfBirth, DEMO_TODAY) < MIN_AGE) e.dateOfBirth = `Trung tâm nhận người cao tuổi từ đủ ${MIN_AGE} tuổi (hiện ${age(v.dateOfBirth, DEMO_TODAY)} tuổi)`;
  else if (age(v.dateOfBirth, DEMO_TODAY) > MAX_AGE) e.dateOfBirth = `Tuổi trên ${MAX_AGE}, kiểm tra lại năm sinh`;
  const a = (v.address ?? "").trim();
  if (!a) e.address = "Nhập địa chỉ";
  else if (a.length < 5) e.address = "Địa chỉ quá ngắn";
  if (v.phone && v.phone.trim() && !phoneOk(v.phone)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
  return e;
}

/** Người được phép đón. */
export function validatePickup(v: { fullName?: string; relationship?: string; phone?: string; idLast4?: string }): Errors {
  const e: Errors = {};
  const n = name(v.fullName);
  if (n) e.fullName = n;
  if (!(v.relationship ?? "").trim()) e.relationship = "Nhập quan hệ với cụ";
  if (!(v.phone ?? "").trim()) e.phone = "Nhập số điện thoại";
  else if (!phoneOk(v.phone!)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0";
  if (!/^\d{4}$/.test(v.idLast4 ?? "")) e.idLast4 = "Nhập đúng 4 chữ số cuối CCCD";
  return e;
}

/** Ngày bắt đầu gói: từ hôm nay trở đi, không quá 60 ngày, không phải Chủ nhật. */
export function validateStartDate(v?: string): string {
  if (!isDate(v)) return "Chọn ngày bắt đầu";
  if (v! < DEMO_TODAY) return "Ngày bắt đầu không được ở quá khứ";
  if (v! > addDays(DEMO_TODAY, 60)) return "Chỉ đăng ký trước tối đa 60 ngày";
  if (new Date(v + "T00:00:00").getDay() === 0) return "Trung tâm nghỉ Chủ nhật";
  return "";
}

/** Báo nghỉ: từ hôm nay trở đi, đến ngày ≥ từ ngày, tối đa 30 ngày. */
export function validateAbsence(v: { fromDate?: string; toDate?: string }): Errors {
  const e: Errors = {};
  if (!isDate(v.fromDate)) e.fromDate = "Chọn ngày bắt đầu nghỉ";
  else if (v.fromDate! < DEMO_TODAY) e.fromDate = "Không báo nghỉ cho ngày đã qua";
  if (!isDate(v.toDate)) e.toDate = "Chọn ngày kết thúc";
  else if (v.fromDate && v.toDate! < v.fromDate) e.toDate = "Đến ngày phải sau hoặc bằng từ ngày";
  else if (v.fromDate && daysBetween(v.fromDate, v.toDate!) + 1 > 30) e.toDate = "Nghỉ dài hơn 30 ngày thì dùng Bảo lưu";
  return e;
}

/** Bảo lưu / báo qua đời. */
export function validatePause(v: { kind: "HOSPITAL" | "DEATH"; fromDate?: string; toDate?: string; document?: string }, maxDays: number): Errors {
  const e: Errors = {};
  if (!isDate(v.fromDate)) e.fromDate = "Chọn ngày";
  else if (v.kind === "DEATH" && v.fromDate! > DEMO_TODAY) e.fromDate = "Ngày mất không được ở tương lai";
  else if (v.kind === "HOSPITAL" && v.fromDate! < addDays(DEMO_TODAY, -30)) e.fromDate = "Ngày nhập viện quá 30 ngày trước, liên hệ Quản lý";
  if (v.kind === "HOSPITAL") {
    if (!isDate(v.toDate)) e.toDate = "Chọn ngày kết thúc";
    else if (v.fromDate && v.toDate! < v.fromDate) e.toDate = "Đến ngày phải sau hoặc bằng từ ngày";
    else if (v.fromDate && daysBetween(v.fromDate, v.toDate!) + 1 > maxDays) e.toDate = `Bảo lưu tối đa ${maxDays} ngày (BR-22)`;
  }
  if (!(v.document ?? "").trim()) e.document = v.kind === "HOSPITAL" ? "Đính kèm giấy nhập viện" : "Đính kèm giấy chứng tử";
  return e;
}

/** Barthel Index chuẩn: 10 mục, mỗi mục 0/5/10/15 → tổng 0–100, luôn là bội số của 5. ≤ 20 = phụ thuộc hoàn toàn → không nhận (BR-18). */
export const BARTHEL_NOT_ACCEPTED = 20;
export function validateBarthel(v: string | number | undefined): string {
  if (v === undefined || v === "") return "Nhập điểm Barthel";
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100) return "Điểm Barthel từ 0 đến 100";
  if (n % 5 !== 0) return "Điểm Barthel là bội số của 5 (cộng từ 10 mục)";
  return "";
}

/** Throw the first message (used by the mock API). */
export function assertValid(errors: Errors) {
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
}

/** Chỉ số sức khỏe: chặn số nhập nhầm (ngoài khoảng sinh lý), không phải ngưỡng cảnh báo. */
export const VITAL_RANGE: Record<string, [number, number, string]> = {
  sys: [60, 260, "HA tâm thu"], dia: [30, 160, "HA tâm trương"], pulse: [30, 200, "Mạch"], temp: [34, 42, "Nhiệt độ"],
  spo2: [70, 100, "SpO₂"], glucose: [1, 35, "Đường huyết"], weight: [25, 150, "Cân nặng"],
};
export function validateVitals(m: Record<string, number | undefined>): Errors {
  const e: Errors = {};
  for (const [k, [lo, hi, label]] of Object.entries(VITAL_RANGE)) {
    const v = m[k];
    if (v === undefined || Number.isNaN(v)) continue;
    if (v < lo || v > hi) e[k] = `${label} phải trong khoảng ${lo}–${hi}`;
  }
  if ((m.sys === undefined) !== (m.dia === undefined)) e[m.sys === undefined ? "sys" : "dia"] = "Nhập đủ cả huyết áp tâm thu và tâm trương";
  else if (m.sys !== undefined && m.dia !== undefined && m.dia >= m.sys) e.dia = "Tâm trương phải nhỏ hơn tâm thu";
  if (!Object.values(m).some((v) => v !== undefined && !Number.isNaN(v))) e._ = "Nhập ít nhất một chỉ số";
  return e;
}
