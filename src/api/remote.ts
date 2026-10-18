// API thật (BE ASP.NET) cho đăng nhập + care log của Staff/Family.
// Giữ đúng tên hàm và hình dạng dữ liệu của mock (staff.ts / family.ts / shared.ts) để các màn không phải đổi.
// Quy tắc nghiệp vụ (CL-01…CL-19) do BE kiểm tra; lỗi trả về được hiển thị nguyên văn.
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { CareLogEntry, CareModule, DailyTask, ElderlyMember, HealthMetric, Incident, Position, Role, User } from "../types/models";
import { api, API_LIVE, tokenStore, vnToday } from "./http";
import type { family as mockFamily } from "./family";
import type { auth as mockAuth, inbox as mockInbox } from "./shared";
import type { staff as mockStaff } from "./staff";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
const iso = (date: string, hhmm?: string | null) => (hhmm ? `${date}T${hhmm}:00` : undefined);

// ------------------------------------------------------------------ DTO của BE → kiểu FE
function toElderly(d: Row): ElderlyMember {
  return {
    id: d.id, familyUserId: 0, fullName: d.fullName, dateOfBirth: d.dateOfBirth, gender: d.gender === "FEMALE" ? "Nữ" : "Nam", address: "",
    declaredGroup: d.targetGroup ?? "", targetGroup: d.targetGroup ?? undefined, conditions: d.conditions ?? [], allergies: d.allergies ?? [],
    diet: d.diet ?? "Bình thường", hobbies: d.hobbies ?? "", careNote: d.careNote ?? "", caregiverId: d.caregiverId ?? undefined, nurseId: d.nurseId ?? undefined,
    qrCode: d.code, status: d.status, tone: "blue", careModules: (d.careModules ?? []) as CareModule[],
    affectedSide: d.affectedSide === "LEFT" ? "Trái" : d.affectedSide === "RIGHT" ? "Phải" : undefined, likes: d.likes ?? undefined, avoid: d.avoid ?? undefined,
  };
}
const toSub = (elderlyId: number, tier?: string | null) =>
  tier ? { id: 0, elderlyId, tier, status: "ACTIVE", cycle: "MONTH", startDate: "2000-01-01", endDate: "2999-12-31" } : undefined;
const toAtt = (elderlyId: number, date: string, a?: Row | null) =>
  a ? { id: 0, elderlyId, date, status: a.status, checkIn: a.arrivedAt ?? undefined, checkOut: a.leftAt ?? undefined } : undefined;
const toDay = (elderlyId: number, date: string, d?: Row | null) =>
  d ? { elderlyId, date, status: d.status, medicalDoneAt: iso(date, d.medicalDoneAt), closedAt: iso(date, d.closedAt), closedByManager: d.closedByManager } : undefined;
type Entry = CareLogEntry & { staff?: { fullName: string } };
const toEntry = (elderlyId: number) => (x: Row): Entry => ({
  id: x.id, elderlyId, date: x.date, time: x.time, kind: x.kind, title: x.title, detail: x.detail, staffId: 0,
  important: x.isImportant, internalOnly: x.internalOnly, data: x.data ?? {}, tone: x.data?.tone, staff: x.recordedBy ? { fullName: x.recordedBy } : undefined,
});
const toTask = (elderlyId: number, date: string) => (t: Row) => ({
  id: t.id, elderlyId, date, time: t.time, type: t.type, title: t.title, owner: t.ownerPosition as Position, entryKind: t.entryKind ?? undefined,
  status: t.status, skipReason: t.skipReason ?? undefined, doneAt: t.doneAt ?? undefined, by: t.doneBy ? { id: 0, fullName: t.doneBy } : undefined,
}) as DailyTask & { by?: { id: number; fullName: string } };
const toMetric = (elderlyId: number) => (m: Row): HealthMetric => ({
  id: m.id, elderlyId, at: m.at, sys: m.sys ?? undefined, dia: m.dia ?? undefined, pulse: m.pulse ?? undefined, temp: m.temp ?? undefined,
  spo2: m.spo2 ?? undefined, glucose: m.glucose ?? undefined, weight: m.weight ?? undefined, by: 0,
});
const toDose = (elderlyId: number) => (d: Row) => ({
  id: d.id, planId: d.planId, elderlyId, date: d.date, time: d.time, status: d.status, reason: d.reason ?? undefined, at: d.givenAt ?? undefined,
  plan: { id: d.planId, elderlyId, name: d.name, dose: d.dose, note: d.note ?? "", times: [], active: true },
  nurse: d.givenBy ? { id: 0, fullName: d.givenBy } : undefined,
});
const toThresholds = (t: Row) => ({ sysMax: t.sysMax, diaMax: t.diaMax, sysMin: t.sysMin, pulseMin: t.pulseMin, pulseMax: t.pulseMax, tempMax: t.tempMax, spo2Min: t.spo2Min, glucoseMax: t.glucoseMax });
const toAlert = (a: Row) => ({
  id: a.id, elderlyId: a.elderlyId, at: a.createdAt, source: a.source, level: a.level, title: a.title, detail: a.detail ?? "", status: a.status,
  result: a.result ?? undefined,
});
const toIncident = (i: Row): Incident => ({
  id: i.id, elderlyId: i.elderlyId, at: i.at, type: i.type, severity: i.severity, description: i.description, action: i.action,
  familyNotified: i.familyNotified, transfer: i.transfer ?? undefined, reportedBy: 0, status: i.status,
});
/** Tên cụ cho các danh sách chỉ cần hiện tên. */
const nameOnly = (id: number, fullName?: string | null) => ({ id, fullName: fullName ?? "" }) as ElderlyMember;
const toPlan = (elderlyId: number) => (p: Row) => ({
  id: p.id, elderlyId, name: p.name, dose: p.dose, times: p.times, note: p.note ?? "", startDate: p.startDate, endDate: p.endDate ?? undefined, active: p.active,
});

/** Phần dữ liệu chung của màn CL (staff) và Hôm nay của cụ (family). */
function bundle(d: Row) {
  const e = toElderly(d.elderly);
  const entries = (d.entries as Row[]).map(toEntry(e.id));
  const metrics14 = (d.metrics14 as Row[]).map(toMetric(e.id));
  return {
    elderly: e, sub: toSub(e.id, d.elderly.tier), a: toAtt(e.id, d.date, d.attendance), day: toDay(e.id, d.date, d.day),
    closer: d.day?.closedBy ? { id: 0, fullName: d.day.closedBy } : undefined, medicalDoner: d.day?.medicalDoneBy ? { id: 0, fullName: d.day.medicalDoneBy } : undefined,
    entitlement: { photoPerDay: d.photoLimit ?? null }, entries, photos: entries.filter((x) => x.kind === "PHOTO"),
    doses: (d.doses as Row[]).map(toDose(e.id)), modules: e.careModules ?? [], history: (d.history as Row[]).map(toEntry(e.id)),
    barthel: [] as { date: string; score: number }[], nextAssessment: undefined, metrics14, latest: metrics14.filter((m) => m.sys).pop(),
    thresholds: toThresholds(d.thresholds),
  };
}

const toUser = (u: Row): User => ({ id: u.id, role: u.role as Role, fullName: u.fullName, email: u.email, phone: u.phone ?? "", password: "", status: "ACTIVE", position: u.position ?? undefined });

// ------------------------------------------------------------------ auth
export const remoteAuth: Partial<typeof mockAuth> = {
  async login(email: string, password: string) {
    const r = await api<Row>("POST", "/auth/login", { email: email.trim(), password });
    tokenStore.set({ accessToken: r.accessToken, refreshToken: r.refreshToken, expiresAt: r.expiresAt });
    const user = toUser(r.user);
    if (user.role !== "STAFF" && user.role !== "FAMILY") {
      tokenStore.set(null);
      throw new Error("Bản kết nối BE hiện chỉ mở cho tài khoản Staff và Family");
    }
    return user as any;
  },
};
export async function remoteLogout() {
  const t = tokenStore.get();
  tokenStore.set(null);
  if (t?.refreshToken) await api("POST", "/auth/logout", { refreshToken: t.refreshToken }).catch(() => {});
}

// ------------------------------------------------------------------ STAFF
export const remoteStaff: Partial<typeof mockStaff> = {
  async elderlyToday() {
    const rows = await api<Row[]>("GET", "/staff/elderly/today");
    const today = vnToday();
    return rows.map((r) => {
      const e = toElderly(r.elderly);
      return { elderly: e, sub: toSub(e.id, r.elderly.tier), a: toAtt(e.id, today, r.attendance), progress: r.progress, alerts: r.openAlerts, restricted: 0, day: toDay(e.id, today, r.day) };
    }) as any;
  },
  async careLog(_me: User, elderlyId: number) {
    const d = await api<Row>("GET", `/staff/care-logs/${elderlyId}`);
    const b = bundle(d);
    return {
      ...b, photos: d.photosToday, tasks: (d.tasks as Row[]).map(toTask(elderlyId, d.date)),
      permissions: [], choices: [], pickups: [], meds: [], belongings: [], bed: undefined,
    } as any;
  },
  async addEntry(_me: User, elderlyId: number, input: { kind: CareLogEntry["kind"]; title: string; detail: string; important?: boolean; tone?: "blue" | "orange" | "green"; data?: Record<string, unknown>; internalOnly?: boolean; taskId?: number }) {
    await api("POST", `/staff/care-logs/${elderlyId}/entries`, {
      kind: input.kind, title: input.title, detail: input.detail, data: { ...(input.data ?? {}), ...(input.tone ? { tone: input.tone } : {}) },
      isImportant: !!input.important, internalOnly: !!input.internalOnly, taskId: input.taskId ?? null,
    });
  },
  async setTask(_me: User, taskId: number, status: DailyTask["status"], skipReason?: string) {
    await api("PATCH", `/staff/tasks/${taskId}`, { status, skipReason: skipReason ?? null });
  },
  async closeLog(_me: User, elderlyId: number) {
    await api("POST", `/staff/care-logs/${elderlyId}/close`);
  },
  async markMedicalDone(_me: User, elderlyId: number) {
    await api("POST", `/staff/care-logs/${elderlyId}/medical-done`);
  },
  async urgent(_me: User, elderlyId: number, kind: "STROKE" | "LOST", detail: string) {
    await api("POST", `/staff/care-logs/${elderlyId}/urgent`, { kind, detail });
  },
  async recordVitals(_me: User, elderlyId: number, m: Omit<HealthMetric, "id" | "elderlyId" | "at" | "by">) {
    await api("POST", `/staff/care-logs/${elderlyId}/vitals`, { sys: m.sys ?? null, dia: m.dia ?? null, pulse: m.pulse ?? null, temp: m.temp ?? null, spo2: m.spo2 ?? null, glucose: m.glucose ?? null, weight: m.weight ?? null });
    return [];
  },
  async giveDose(_me: User, doseId: number, status: "GIVEN" | "REFUSED" | "MISSING", reason?: string) {
    await api("PATCH", `/staff/doses/${doseId}`, { status, reason: reason ?? null });
  },
  /** BE lưu sự cố thành mục care log: điều dưỡng ghi INCIDENT, hộ lý ghi "Báo nhanh sự cố"; tự tạo cảnh báo. */
  async reportIncident(_me: User, input: Omit<Incident, "id" | "at" | "reportedBy" | "status"> & { time: string }) {
    await api("POST", "/staff/incidents", {
      elderlyId: input.elderlyId, type: input.type, severity: input.severity, time: input.time, description: input.description,
      action: input.action || null, familyNotified: input.familyNotified, transfer: input.transfer ?? null,
    });
  },
  async incidents() {
    const rows = await api<Row[]>("GET", "/staff/incidents");
    return rows.map((i) => ({ incident: toIncident(i), elderly: nameOnly(i.elderlyId, i.elderlyName), reporter: i.reportedBy ? { id: 0, fullName: i.reportedBy } : undefined })) as any;
  },
  async vitalsBoard() {
    const rows = await api<Row[]>("GET", "/staff/vitals/today");
    return rows.map((r) => {
      const e = toElderly(r.elderly);
      return { elderly: e, sub: toSub(e.id, r.elderly.tier), todays: Array.from({ length: r.todayCount }), per: r.perDay, due: r.due, diabetic: r.diabetic, latest: r.latest ? toMetric(e.id)(r.latest) : undefined };
    }) as any;
  },
  async meds() {
    const rows = await api<Row[]>("GET", "/staff/doses/today");
    return rows.map((r) => {
      const e = toElderly(r.elderly);
      const dose = toDose(e.id)(r.dose);
      return { dose, plan: dose.plan, elderly: e, overdue: r.overdue, present: r.present };
    }) as any;
  },
  async alerts() {
    const rows = await api<Row[]>("GET", "/staff/alerts");
    return rows.map((a) => ({ alert: toAlert(a), elderly: nameOnly(a.elderlyId, a.elderlyName), handler: a.handledBy ? { id: 0, fullName: a.handledBy } : undefined })) as any;
  },
  async handleAlert(_me: User, id: number, status: "IN_PROGRESS" | "CLOSED", result?: string) {
    await api("PATCH", `/staff/alerts/${id}`, { status, result: result || null });
  },
  async daySummary(_me: User, elderlyId: number, date: string) {
    const d = await api<Row>("GET", `/staff/care-logs/${elderlyId}/summary?date=${date}`);
    return { ...summaryOf(d), tasks: (d.tasks as Row[]).map(toTask(elderlyId, d.date)) } as any;
  },
};

/** Tổng kết 1 ngày (BE: DaySummaryDto) → dữ liệu chung cho Lịch sử care log (staff) và Tổng kết ngày (family). */
function summaryOf(d: Row) {
  const e = toElderly(d.elderly);
  const entries = (d.entries as Row[]).map(toEntry(e.id));
  return {
    elderly: e, date: d.date, a: toAtt(e.id, d.date, d.attendance), day: toDay(e.id, d.date, d.day), entries,
    vitals: (d.vitals as Row[]).map(toMetric(e.id)), doses: (d.doses as Row[]).map(toDose(e.id)),
    dates: [...new Set([vnToday(), d.date, ...(d.dates as string[])])].sort().reverse(),
  };
}

// ------------------------------------------------------------------ FAMILY
export const remoteFamily: Partial<typeof mockFamily> = {
  async relatives() {
    const rows = await api<Row[]>("GET", "/family/elderly");
    return rows.map((r) => {
      const e = toElderly(r.elderly);
      return { elderly: e, sub: toSub(e.id, r.elderly.tier), assessment: undefined, pickups: [] };
    }) as any;
  },
  async home(_me: User, elderlyId: number) {
    const d = await api<Row>("GET", `/family/elderly/${elderlyId}/today`);
    const b = bundle(d);
    const person = (id?: number | null, name?: string | null) => (id && name ? { id, fullName: name } : undefined);
    return {
      ...b, doing: { label: d.doing.label, since: d.doing.since ?? undefined }, pickup: undefined, checkedInBy: undefined, therapy: [],
      next: (d.upcoming as Row[]).map((t) => ({ id: t.id, startTime: t.time, title: t.title })),
      alerts: (d.alerts as Row[]).map(toAlert), caregiver: person(d.elderly.caregiverId, d.elderly.caregiverName), nurse: person(d.elderly.nurseId, d.elderly.nurseName),
      scheduledToday: true,
    } as any;
  },
  async summary(_me: User, elderlyId: number, date: string) {
    const s = summaryOf(await api<Row>("GET", `/family/elderly/${elderlyId}/summary?date=${date}`));
    const by = (k: string) => s.entries.filter((x) => x.kind === k);
    return {
      ...s, meds: s.doses, meals: by("MEAL"), activities: by("ACTIVITY"), moods: by("MOOD"), naps: by("NAP"), photos: by("PHOTO"),
      notes: s.entries.filter((x) => x.important || x.kind === "NOTE" || x.kind === "INCIDENT"), pickup: undefined,
    } as any;
  },
  async health(_me: User, elderlyId: number) {
    const d = await api<Row>("GET", `/family/elderly/${elderlyId}/health`);
    const e = toElderly(d.elderly);
    return {
      elderly: e, sub: toSub(e.id, d.elderly.tier), metrics: (d.metrics as Row[]).map(toMetric(e.id)), thresholds: toThresholds(d.thresholds),
      doses: (d.doses as Row[]).map(toDose(e.id)), monthlyReport: d.monthlyReport,
    } as any;
  },
  async alerts() {
    const d = await api<Row>("GET", "/family/alerts");
    return {
      alerts: (d.alerts as Row[]).map((a) => ({ alert: toAlert(a), elderly: nameOnly(a.elderlyId, a.elderlyName), hidden: false })),
      hidden: d.hidden,
      incidents: (d.incidents as Row[]).map((i) => ({ incident: toIncident(i), elderly: nameOnly(i.elderlyId, i.elderlyName) })),
    } as any;
  },
  async meds(_me: User, elderlyId: number) {
    return medsOf(elderlyId, await api<Row>("GET", `/family/elderly/${elderlyId}/medications`));
  },
  async saveMed(_me: User, input: { elderlyId: number; name: string; dose: string; times: string[]; startDate: string; endDate?: string; note: string; replaceId?: number }) {
    await api("POST", `/family/elderly/${input.elderlyId}/medications`, {
      name: input.name, dose: input.dose, times: input.times, startDate: input.startDate, endDate: input.endDate || null, note: input.note || null, replaceId: input.replaceId ?? null,
    });
  },
  async stopMed(_me: User, id: number) {
    await api("POST", `/family/medications/${id}/stop`);
  },
};

function medsOf(elderlyId: number, d: Row) {
  return { plans: (d.plans as Row[]).map(toPlan(elderlyId)), today: (d.today as Row[]).map(toDose(elderlyId)) } as any;
}

// ------------------------------------------------------------------ thông báo
export const remoteInbox: Partial<typeof mockInbox> = {
  async notifications(me: User) {
    const rows = await api<Row[]>("GET", "/notifications");
    return rows.map((n) => ({ id: n.id, userId: me.id, type: n.type, title: n.title, message: n.message ?? "", link: n.link ?? undefined, isRead: n.isRead, createdAt: n.createdAt })) as any;
  },
  async markAllRead() {
    await api("POST", "/notifications/read-all");
  },
};

/** BE chưa có đẩy realtime: khi dùng API thật, tải lại màn đang mở mỗi 20 giây để thấy mục người khác vừa ghi. */
export function useLiveRefresh(elderlyId?: number) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!API_LIVE || !elderlyId) return;
    const t = setInterval(() => qc.invalidateQueries(), 20_000);
    return () => clearInterval(t);
  }, [elderlyId, qc]);
}
