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
const toDose = (elderlyId: number, date: string) => (d: Row) => ({
  id: d.id, planId: 0, elderlyId, date, time: d.time, status: d.status, reason: d.reason ?? undefined,
  plan: { id: 0, elderlyId, name: d.name, dose: d.dose, times: [], active: true },
});
const toThresholds = (t: Row) => ({ sysMax: t.sysMax, diaMax: t.diaMax, sysMin: t.sysMin, pulseMin: t.pulseMin, pulseMax: t.pulseMax, tempMax: t.tempMax, spo2Min: t.spo2Min, glucoseMax: t.glucoseMax });
const toAlert = (a: Row) => ({ id: a.id, elderlyId: a.elderlyId, at: a.createdAt, source: a.source, level: a.level, title: a.title, detail: a.detail ?? "", status: a.status });

/** Phần dữ liệu chung của màn CL (staff) và Hôm nay của cụ (family). */
function bundle(d: Row) {
  const e = toElderly(d.elderly);
  const entries = (d.entries as Row[]).map(toEntry(e.id));
  const metrics14 = (d.metrics14 as Row[]).map(toMetric(e.id));
  return {
    elderly: e, sub: toSub(e.id, d.elderly.tier), a: toAtt(e.id, d.date, d.attendance), day: toDay(e.id, d.date, d.day),
    closer: d.day?.closedBy ? { id: 0, fullName: d.day.closedBy } : undefined, medicalDoner: d.day?.medicalDoneBy ? { id: 0, fullName: d.day.medicalDoneBy } : undefined,
    entitlement: { photoPerDay: d.photoLimit ?? null }, entries, photos: entries.filter((x) => x.kind === "PHOTO"),
    doses: (d.doses as Row[]).map(toDose(e.id, d.date)), modules: e.careModules ?? [], history: (d.history as Row[]).map(toEntry(e.id)),
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
  /** BE chưa có bảng incidents: điều dưỡng ghi mục INCIDENT, hộ lý ghi "Báo nhanh sự cố" (quan trọng). */
  async reportIncident(me: User, input: Omit<Incident, "id" | "at" | "reportedBy" | "status"> & { time: string }) {
    const nurse = me.position === "NURSE";
    await api("POST", `/staff/care-logs/${input.elderlyId}/entries`, {
      kind: nurse ? "INCIDENT" : "NOTE", title: nurse ? `Sự cố: ${input.description.slice(0, 40)}` : "Báo nhanh sự cố",
      detail: `${input.description}${input.action ? ` · Xử lý: ${input.action}` : ""}${input.transfer ? ` · Chuyển viện ${input.transfer.hospital} lúc ${input.transfer.time}` : ""}`,
      isImportant: true, internalOnly: false, data: { type: input.type, severity: input.severity, time: input.time, transfer: input.transfer ?? null },
    });
  },
};

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
      ...b, doing: { label: d.doing.label, since: d.doing.since ?? undefined }, pickup: undefined, checkedInBy: undefined, next: [], therapy: [],
      alerts: (d.alerts as Row[]).map(toAlert), caregiver: person(d.elderly.caregiverId, d.elderly.caregiverName), nurse: person(d.elderly.nurseId, d.elderly.nurseName),
      scheduledToday: true,
    } as any;
  },
};

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
