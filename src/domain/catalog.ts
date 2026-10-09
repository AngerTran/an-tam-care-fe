// Vocabularies shown in every portal. Hạng, thời hạn và nhóm đối tượng do Quản lý thêm/sửa/xóa
// (mục 4.1) nên được đọc trực tiếp từ DB: TIERS, TIER_LABEL, GROUP_INFO… là "live view",
// luôn phản ánh dữ liệu mới nhất mà không cần sửa nơi dùng.
import { db } from "../mock/db";
import type { Cycle, CycleDef, GroupDef, Position, SubStatus, TargetGroup, Tier, TierDef, Zone } from "../types/models";
import type { Tone } from "../components/ui";

const byRank = <T extends { rank: number }>(xs: T[]) => [...xs].sort((a, b) => a.rank - b.rank);
export const tierDefs = () => byRank(db().tierDefs);
export const cycleDefs = () => byRank(db().cycleDefs);
export const groupDefs = () => byRank(db().groupDefs);
export const tierDef = (t?: Tier) => db().tierDefs.find((x) => x.id === t);
export const cycleDef = (c?: Cycle) => db().cycleDefs.find((x) => x.id === c);
export const groupDef = (g?: TargetGroup) => db().groupDefs.find((x) => x.id === g);
const active = <T extends { status: string }>(xs: T[]) => xs.filter((x) => x.status === "ACTIVE");

/** Array that always mirrors `get()` (used for TIERS, CYCLES, GROUPS…). */
function liveList<T>(get: () => T[]): T[] {
  return new Proxy([] as T[], {
    get: (_, k) => { const a = get() as unknown as Record<PropertyKey, unknown>; const v = a[k]; return typeof v === "function" ? (v as (...x: unknown[]) => unknown).bind(a) : v; },
    has: (_, k) => k in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_, k) => { const d = Object.getOwnPropertyDescriptor(get(), k); return d && (k === "length" ? d : { ...d, configurable: true }); },
  });
}
/** Record keyed by id that always mirrors the DB list. */
function liveMap<V, D extends { id: string }>(list: () => D[], pick: (d: D) => V): Record<string, V> {
  const find = (k: PropertyKey) => (typeof k === "string" ? list().find((d) => d.id === k) : undefined);
  return new Proxy({} as Record<string, V>, {
    get: (_, k) => { const d = find(k); return d ? pick(d) : undefined; },
    has: (_, k) => !!find(k),
    ownKeys: () => list().map((d) => d.id),
    getOwnPropertyDescriptor: (_, k) => { const d = find(k); return d ? { value: pick(d), enumerable: true, configurable: true, writable: false } : undefined; },
  });
}

// ---------------- hạng
/** Hạng đang bán (thấp → cao). ALL_TIERS gồm cả hạng đã ngừng. */
export const TIERS: Tier[] = liveList(() => active(tierDefs()).map((t) => t.id));
export const ALL_TIERS: Tier[] = liveList(() => tierDefs().map((t) => t.id));
export const TIER_LABEL: Record<Tier, string> = liveMap(() => db().tierDefs, (t: TierDef) => t.label);
export const TIER_TONE: Record<Tier, Tone> = liveMap(() => db().tierDefs, (t: TierDef) => t.tone as Tone);
export const tierRank = (t: Tier) => tierDefs().findIndex((x) => x.id === t);
export const topTier = () => TIERS[TIERS.length - 1];

// ---------------- thời hạn
export const CYCLES: Cycle[] = liveList(() => active(cycleDefs()).map((c) => c.id));
export const ALL_CYCLES: Cycle[] = liveList(() => cycleDefs().map((c) => c.id));
export const CYCLE_LABEL: Record<Cycle, string> = liveMap(() => db().cycleDefs, (c: CycleDef) => c.label);
export const CYCLE_DESC: Record<Cycle, string> = liveMap(() => db().cycleDefs, (c: CycleDef) => c.desc);
export const CYCLE_DISCOUNT: Record<Cycle, number> = liveMap(() => db().cycleDefs, (c: CycleDef) => c.discount);
export const CYCLE_MONTHS: Record<Cycle, number> = liveMap(() => db().cycleDefs, (c: CycleDef) => c.months);
/** Đơn vị giá: ngày / tháng / quý / năm / N tháng */
export const cycleUnit = (c?: Cycle) => {
  const d = cycleDef(c);
  if (!d || d.kind === "DAY") return "ngày";
  return d.months === 1 ? "tháng" : d.months === 3 ? "quý" : d.months === 12 ? "năm" : `${d.months} tháng`;
};
export const CYCLE_UNIT: Record<Cycle, string> = liveMap(() => db().cycleDefs, (c: CycleDef) => cycleUnit(c.id));
export const isDayCycle = (c?: Cycle) => cycleDef(c)?.kind === "DAY";
export const isWeeklyCycle = (c?: Cycle) => cycleDef(c)?.kind === "WEEKLY";
/** số tháng tính tiền (gói ngày = 0, theo buổi/tuần = 1) */
export const cycleMonths = (c?: Cycle) => cycleDef(c)?.months ?? 1;
/** Thời hạn tham chiếu "giá tháng" (PERIOD 1 tháng). */
export const monthCycle = (): Cycle => (cycleDefs().find((c) => c.kind === "PERIOD" && c.months === 1) ?? cycleDefs().find((c) => c.kind === "PERIOD"))?.id ?? "MONTH";
export const LONG_TERM: Cycle[] = liveList(() => cycleDefs().filter((c) => c.kind === "PERIOD").map((c) => c.id));

// ---------------- nhóm đối tượng
export const GROUPS: TargetGroup[] = liveList(() => active(groupDefs()).map((g) => g.id));
export const ALL_GROUPS: TargetGroup[] = liveList(() => groupDefs().map((g) => g.id));
export const GROUP_LABEL: Record<TargetGroup, string> = liveMap(() => db().groupDefs, (g: GroupDef) => g.label);
export const GROUP_TONE: Record<TargetGroup, Tone> = liveMap(() => db().groupDefs, (g: GroupDef) => g.tone as Tone);
export const GROUP_INFO: Record<TargetGroup, GroupDef> = liveMap(() => db().groupDefs, (g: GroupDef) => g);
export const DISEASE_GROUPS: TargetGroup[] = liveList(() => groupDefs().filter((g) => g.disease).map((g) => g.id));
export const isDiseaseGroup = (g?: TargetGroup) => !!groupDef(g)?.disease;
export const minTierFor = (g: TargetGroup): Tier => groupDef(g)?.minTier ?? TIERS[0];
/** Nhóm mặc định khi gia đình chưa chọn: nhóm đầu tiên đang nhận. */
export const defaultGroup = () => GROUPS[0];
export const tierHasBreakfast = (t?: Tier) => /sáng/i.test(db().entitlements.find((e) => e.tier === t)?.meals ?? "");
export const entitlementFixedBed = (t?: Tier) => !!db().entitlements.find((e) => e.tier === t)?.fixedBed;
export const NOT_ACCEPTED = ["Nằm liệt giường hoàn toàn", "Sa sút trí tuệ nặng (kích động mạnh, không kiểm soát được)", "Cần chăm sóc tích cực (ăn qua sonde, mở khí quản, loét nặng, giai đoạn cuối)"];

export const POSITION_LABEL: Record<Position, string> = { NURSE: "Điều dưỡng", CAREGIVER: "Hộ lý" };

export const SUB_STATUS: Record<SubStatus, [Tone, string]> = {
  PENDING_ASSESSMENT: ["orange", "Chờ đánh giá"],
  AWAITING_PAYMENT: ["blue", "Chờ xác nhận & thanh toán"],
  ACTIVE: ["green", "Đang hiệu lực"],
  PAUSED: ["purple", "Bảo lưu"],
  SUSPENDED: ["red", "Tạm ngưng (chưa đóng)"],
  TERMINATED: ["gray", "Đã chấm dứt"],
  EXPIRED: ["gray", "Hết hạn"],
  REJECTED: ["red", "Không tiếp nhận"],
};

export const ZONE_LABEL: Record<Zone, string> = {
  LOBBY: "Sảnh đón trả", MEDICAL: "Phòng y tế", COMMON: "Sinh hoạt chung", THERAPY: "Vật lý trị liệu", DINING: "Phòng ăn",
  NAP: "Nghỉ trưa", MASSAGE: "Khu ghế massage", SECURE: "Kiểm soát ra vào", GARDEN: "Sân vườn",
};
export const EQUIP_CAT: Record<"MEDICAL" | "THERAPY" | "LIVING" | "SAFETY", string> = { MEDICAL: "Y tế", THERAPY: "Tập VLTL", LIVING: "Sinh hoạt", SAFETY: "An toàn" };

export const WEEKDAY_LABEL = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
export const M3_OPTIONS = [[1, 3, 5], [2, 4, 6]];
export const weekdayOptionsOf = (c?: Cycle) => cycleDef(c)?.weekdayOptions ?? M3_OPTIONS;
export const weekdaysLabel = (w?: number[]) => (w ? w.map((d) => WEEKDAY_LABEL[d]).join("-") : "T2–T7");

export const MOODS = ["Vui", "Bình thường", "Buồn", "Lo âu", "Kích động"] as const;
export const MEAL_AMOUNTS = ["Hết", "3/4", "1/2", "1/4", "Không ăn"] as const;
export const PARTICIPATION = ["Tích cực", "Có tham gia", "Từ chối"] as const;

/** BR-80: share kept by the centre when it stops serving an elderly declared falsely. */
export const VIOLATION_KEEP = 0.05;
/** "Quy định dịch vụ" shown to families before they commit and pay online (BR-79). */
export const SERVICE_TERMS: { title: string; items: string[] }[] = liveList(() => [
  { title: "Đối tượng", items: [`Trung tâm nhận ${GROUPS.length} nhóm: ${GROUPS.map((g) => GROUP_LABEL[g].toLowerCase()).join(", ")}.`, "Không nhận: cụ nằm liệt giường hoàn toàn, sa sút trí tuệ nặng (kích động mạnh), cần chăm sóc tích cực (ăn qua sonde, mở khí quản, loét nặng, giai đoạn cuối).", `Hạng tối thiểu theo nhóm: ${GROUPS.map((g) => `${GROUP_LABEL[g]} từ ${TIER_LABEL[minTierFor(g)]}`).join("; ")}.`] },
  { title: "Giờ chăm sóc và đón cụ", items: ["Chăm sóc 7h–16h30, Thứ 2 – Thứ 7. 16h30–19h30 chỉ chờ đón, miễn phí, không hoạt động và không ăn uống.", "Trung tâm chỉ giao cụ cho người có trong danh sách người được phép đón, đối chiếu ảnh và CCCD."] },
  { title: "Thanh toán và hoàn tiền", items: ["Trả trước qua VNPay/MoMo. Không thu tiền mặt, không đặt cọc.", "Nhóm bệnh cộng phụ phí cố định theo tháng, công bố trên trang Gói & giá.", "Gói tháng, quý, năm: cụ nghỉ vẫn tính tiền, gia đình tự dừng gói không hoàn tiền. Gói ngày báo nghỉ trước 17h hôm trước được giữ tiền thành số dư.", "Nhập viện có giấy tờ: bảo lưu tối đa 30 ngày. Cụ qua đời: hoàn phần chưa dùng của gói dài hạn."] },
  { title: "Cam kết khai đúng và kiểm tra ngày đầu", items: ["Gia đình cam kết thông tin khai (nhóm đối tượng, bệnh nền, giấy tờ) là đúng sự thật.", "Sáng ngày đầu, điều dưỡng kiểm tra: đo chỉ số nền, chấm thang Barthel, xem giấy tờ.", "Nếu kết quả kiểm tra khác nhóm đã khai: gia đình trả phụ phí nhóm và chênh lệch nâng hạng cho số ngày còn lại trong 3 ngày; không trả thì gói tạm ngưng.", "Nếu cụ thuộc diện không nhận: trung tâm ngừng nhận cụ vì an toàn. Phát hiện ở buổi kiểm tra ngày đầu: hoàn 95% tổng tiền đã đóng. Phát hiện sau ngày đầu: hoàn 95% phần chưa dùng. Dịch vụ mua thêm đã dùng không hoàn."] },
]);

/** Giá kỳ = giá gốc − giảm giá thời hạn + phụ phí cố định theo nhóm + dịch vụ lẻ (mục 4.4). */
export function priceOf(basePrice: number, cycle: Cycle, surcharge = 0, addons = 0, days = 1) {
  const gross = isDayCycle(cycle) ? basePrice * days : basePrice;
  return { gross, discount: 0, surcharge, addons, total: gross + surcharge + addons };
}
