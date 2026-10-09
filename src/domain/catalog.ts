// Fixed vocabularies from the analysis doc (mục 4.1). Labels, ordering and pricing rules live
// here so every portal shows the same words.
import type { Cycle, Position, SubStatus, TargetGroup, Tier, Zone } from "../types/models";
import type { Tone } from "../components/ui";

export const TIERS: Tier[] = ["BASIC", "STANDARD", "PREMIUM"];
export const TIER_LABEL: Record<Tier, string> = { BASIC: "Cơ bản", STANDARD: "Tiêu chuẩn", PREMIUM: "Cao cấp" };
export const TIER_TONE: Record<Tier, Tone> = { BASIC: "blue", STANDARD: "teal", PREMIUM: "purple" };
export const tierRank = (t: Tier) => TIERS.indexOf(t);

export const CYCLES: Cycle[] = ["DAY", "M3", "MONTH", "Q", "Y"];
export const CYCLE_LABEL: Record<Cycle, string> = { DAY: "Gói ngày", M3: "Tháng 3 buổi/tuần", MONTH: "Gói tháng", Q: "Gói quý", Y: "Gói năm" };
export const CYCLE_UNIT: Record<Cycle, string> = { DAY: "ngày", M3: "tháng", MONTH: "tháng", Q: "quý", Y: "năm" };
export const CYCLE_DESC: Record<Cycle, string> = {
  DAY: "Đặt trước từng ngày. Báo nghỉ trước 17h hôm trước thì giữ tiền thành số dư.",
  M3: "12–13 buổi/tháng, cố định T2-4-6 hoặc T3-5-7. Hợp cụ mới làm quen.",
  MONTH: "Đi cả tháng, thứ 2 đến thứ 7. Giá cố định, nghỉ vẫn tính tiền.",
  Q: "Như gói tháng, giảm 5%.",
  Y: "Như gói tháng, giảm 10%.",
};
export const CYCLE_DISCOUNT: Record<Cycle, number> = { DAY: 0, M3: 0, MONTH: 0, Q: 0.05, Y: 0.1 };
export const CYCLE_MONTHS: Record<Cycle, number> = { DAY: 0, M3: 1, MONTH: 1, Q: 3, Y: 12 };
export const LONG_TERM: Cycle[] = ["MONTH", "Q", "Y"];

export const GROUPS: TargetGroup[] = ["MOBILE", "CHRONIC", "REHAB", "DEMENTIA", "STROKE"];
export const GROUP_LABEL: Record<TargetGroup, string> = {
  MOBILE: "Vận động được",
  CHRONIC: "Bệnh mãn tính",
  REHAB: "Phục hồi chức năng",
  DEMENTIA: "Sa sút trí tuệ nhẹ–vừa",
  STROKE: "Sau tai biến",
};
export const GROUP_TONE: Record<TargetGroup, Tone> = { MOBILE: "green", CHRONIC: "orange", REHAB: "blue", DEMENTIA: "purple", STROKE: "red" };
export const GROUP_INFO: Record<TargetGroup, { who: string; care: string[]; watch: string; report: string; limits: string; owner: string; reassessMonths: number }> = {
  MOBILE: {
    who: "Tự đi lại, tự ăn, tự vệ sinh hoặc chỉ cần nhắc nhở; không có bệnh cần theo dõi đặc biệt.",
    care: [], watch: "Chỉ số định kỳ theo hạng", report: "Theo hạng", limits: "—", owner: "Hộ lý", reassessMonths: 3,
  },
  CHRONIC: {
    who: "Tiểu đường, cao huyết áp, tim mạch; cần theo dõi chỉ số và thuốc.",
    care: ["Đo chỉ số và đường huyết theo bệnh", "Nhắc thuốc đúng giờ", "Thực đơn ít đường, ít muối"],
    watch: "Xu hướng chỉ số; AI cảnh báo khi vượt ngưỡng", report: "Biểu đồ chỉ số hằng tháng", limits: "Ngâm chân ⚠ nếu tiểu đường", owner: "Điều dưỡng", reassessMonths: 3,
  },
  REHAB: {
    who: "Yếu cơ, thoái hóa khớp, sau gãy xương hoặc phẫu thuật, đi lại khó cần tập lại.",
    care: ["VLTL tăng cường: Tiêu chuẩn 3 buổi/tuần, Cao cấp hằng ngày", "Bài tập về nhà gửi qua app"],
    watch: "Chấm lại Barthel, khả năng đi lại hằng tháng", report: "Báo cáo tiến triển hằng tháng", limits: "Massage, ngâm chân ⚠", owner: "Điều dưỡng hướng dẫn VLTL", reassessMonths: 1,
  },
  DEMENTIA: {
    who: "Giảm trí nhớ, dễ đi lạc; còn đi lại được, không kích động nặng.",
    care: ["Sinh hoạt ở khu có kiểm soát ra vào", "Thẻ hoặc vòng tay nhận diện chống đi lạc", "Âm nhạc, đọc báo kể chuyện nhóm hằng ngày"],
    watch: "Ghi hành vi: lo âu, kích động, đi lang thang", report: "Báo cáo hành vi và sinh hoạt hằng tuần", limits: "Không dùng vật sắc nhọn; check-out kiểm tra kỹ người đón", owner: "Điều dưỡng, hộ lý", reassessMonths: 3,
  },
  STROKE: {
    who: "Đã qua giai đoạn cấp ở bệnh viện; còn yếu liệt một bên, nói hoặc nuốt khó.",
    care: ["VLTL phục hồi (tập đi, tập tay) hằng ngày", "Đo huyết áp 3 lần/ngày", "Thức ăn mềm, hỗ trợ khi ăn để phòng sặc"],
    watch: "Dấu hiệu tái phát (méo miệng, yếu tay, nói khó): cảnh báo khẩn cấp", report: "Báo cáo huyết áp và tiến triển hằng tháng", limits: "Ghế massage ⚠, ngâm chân ⚠", owner: "Điều dưỡng hướng dẫn VLTL", reassessMonths: 1,
  },
};
export const DISEASE_GROUPS: TargetGroup[] = ["CHRONIC", "REHAB", "DEMENTIA", "STROKE"];
export const minTierFor = (g: TargetGroup): Tier => (g === "MOBILE" ? "BASIC" : "STANDARD");
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
export const weekdaysLabel = (w?: number[]) => (w ? w.map((d) => WEEKDAY_LABEL[d]).join("-") : "T2–T7");

export const MOODS = ["Vui", "Bình thường", "Buồn", "Lo âu", "Kích động"] as const;
export const MEAL_AMOUNTS = ["Hết", "3/4", "1/2", "1/4", "Không ăn"] as const;
export const PARTICIPATION = ["Tích cực", "Có tham gia", "Từ chối"] as const;

/** Giá kỳ = giá gốc − giảm giá thời hạn + phụ phí thỏa thuận + dịch vụ lẻ (mục 4.4). */
export function priceOf(basePrice: number, cycle: Cycle, surcharge = 0, addons = 0, days = 1) {
  const gross = cycle === "DAY" ? basePrice * days : basePrice;
  return { gross, discount: 0, surcharge, addons, total: gross + surcharge + addons };
}
