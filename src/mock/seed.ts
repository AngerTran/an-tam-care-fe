// Seed data for the mock API, following docs/phan-tich-nghiep-vu-v2.md.
// Story: one private day-care centre "An Tâm Care" (Q.7). Demo day is Friday 09/10/2026 at 10:15.
// Demo password for every account: demo1234
import type {
  AbsenceRequest, AccountCredit, ActivitySchedule, AddOn, Announcement, Assessment, Attendance, AuditLog, AuthorizedPickup, Availability,
  BedAssignment, Belonging, CareLogDay, CareLogEdit, CareLogEntry, CenterSettings, Compensation, DailyTask, DamageReport, ElderlyMember,
  Equipment, GroupSurcharge, HealthAlert, HealthMetric, Holiday, Incident, InventoryCheck, Invoice, LeaveRequest, ManagerReport, MedicationDose,
  MedicationPlan, Menu, Message, NapBed, Notification, NotificationPref, PauseRequest, Payment, Refund, Room, Service, ServiceChoice,
  ServicePackage, ServicePermission, Shift, ShiftAssignment, StaffProfile, Subscription, SystemSettings, TherapySlot, TierEntitlement,
  User, VisitBooking, WaitlistEntry,
} from "../types/models";

export const DEMO_TODAY = "2026-10-09";
export const DEMO_NOW = "10:15";
const PW = "demo1234";

const pad = (n: number) => String(n).padStart(2, "0");
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dow = (iso: string) => new Date(iso + "T00:00:00").getDay();
const t = (d: string, h: string) => `${d}T${h}:00`;
let seedRnd = 7;
const rnd = () => ((seedRnd = (seedRnd * 9301 + 49297) % 233280) / 233280);
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));

// ------------------------------------------------------------------ people
const users: User[] = [
  { id: 1, role: "ADMIN", fullName: "Phạm Minh Đức", email: "admin@antamcare.vn", phone: "0908 000 111", password: PW, status: "ACTIVE", lastLoginAt: t(DEMO_TODAY, "07:30") },
  { id: 2, role: "MANAGER", fullName: "Trần Thị Mai", email: "mai.tran@antamcare.vn", phone: "0901 234 567", password: PW, status: "ACTIVE", lastLoginAt: t(DEMO_TODAY, "07:05") },
  { id: 3, role: "STAFF", fullName: "Lê Thu Hạnh", email: "hanh.le@antamcare.vn", phone: "0901 111 222", password: PW, status: "ACTIVE" },
  { id: 4, role: "STAFF", fullName: "Phạm Quốc Bảo", email: "bao.pham@antamcare.vn", phone: "0902 222 333", password: PW, status: "ACTIVE" },
  { id: 5, role: "STAFF", fullName: "Nguyễn Thị Cúc", email: "cuc.nguyen@antamcare.vn", phone: "0903 333 444", password: PW, status: "ACTIVE" },
  { id: 6, role: "STAFF", fullName: "Trương Văn Hải", email: "hai.truong@antamcare.vn", phone: "0904 444 555", password: PW, status: "ACTIVE" },
  { id: 7, role: "STAFF", fullName: "Đặng Minh Châu", email: "chau.dang@antamcare.vn", phone: "0905 555 666", password: PW, status: "ACTIVE" },
  { id: 8, role: "STAFF", fullName: "Võ Thanh Tâm", email: "tam.vo@antamcare.vn", phone: "0906 666 777", password: PW, status: "INVITED" },
  { id: 10, role: "FAMILY", fullName: "Nguyễn Lan Anh", email: "lan.nguyen@gmail.com", phone: "0903 456 789", password: PW, status: "ACTIVE" },
  { id: 11, role: "FAMILY", fullName: "Lê Văn Phúc", email: "phuc.le@gmail.com", phone: "0912 345 678", password: PW, status: "ACTIVE" },
  { id: 12, role: "FAMILY", fullName: "Võ Minh Quân", email: "quan.vo@gmail.com", phone: "0913 222 333", password: PW, status: "ACTIVE" },
  { id: 13, role: "FAMILY", fullName: "Hoàng Gia Bảo", email: "bao.hoang@gmail.com", phone: "0914 333 444", password: PW, status: "ACTIVE" },
  { id: 14, role: "FAMILY", fullName: "Phạm Thị Thu", email: "thu.pham@gmail.com", phone: "0915 444 555", password: PW, status: "ACTIVE" },
  { id: 15, role: "FAMILY", fullName: "Đỗ Thanh Tùng", email: "tung.do@gmail.com", phone: "0916 555 666", password: PW, status: "ACTIVE" },
  { id: 16, role: "FAMILY", fullName: "Bùi Thị Ngọc", email: "ngoc.bui@gmail.com", phone: "0938 222 111", password: PW, status: "ACTIVE" },
  { id: 17, role: "FAMILY", fullName: "Ngô Văn Lực", email: "luc.ngo@gmail.com", phone: "0939 111 000", password: PW, status: "ACTIVE" },
  { id: 18, role: "FAMILY", fullName: "Trịnh Minh Khang", email: "khang.trinh@gmail.com", phone: "0937 888 999", password: PW, status: "ACTIVE" },
];

const staffProfiles: StaffProfile[] = [
  { userId: 3, position: "NURSE", certificate: "Cử nhân Điều dưỡng · CCHN 012345", joinedAt: "2025-03-01" },
  { userId: 4, position: "CAREGIVER", certificate: "Chứng chỉ chăm sóc người cao tuổi", joinedAt: "2025-05-15" },
  { userId: 5, position: "NURSE", certificate: "Cao đẳng Điều dưỡng · CCHN 023456", joinedAt: "2025-08-01" },
  { userId: 6, position: "CAREGIVER", certificate: "Chứng chỉ chăm sóc người cao tuổi", joinedAt: "2025-06-10" },
  { userId: 7, position: "CAREGIVER", certificate: "Chứng chỉ sơ cấp cứu", joinedAt: "2026-01-05" },
  { userId: 8, position: "CAREGIVER", certificate: "Đang học chứng chỉ", joinedAt: "2026-10-01" },
];

type ElderlyInput = Partial<ElderlyMember> & Pick<ElderlyMember, "id" | "fullName" | "familyUserId" | "dateOfBirth" | "gender" | "declaredGroup">;
const em = (e: ElderlyInput): ElderlyMember => ({
  address: "Q.7, TP.HCM", conditions: [], allergies: [], diet: "Bình thường", hobbies: "", careNote: "", status: "ACTIVE", qrCode: `ATC-${String(e.id).padStart(4, "0")}`, tone: "blue", ...e,
});
const elderly: ElderlyMember[] = [
  em({ id: 1, fullName: "Nguyễn Thị Lan", familyUserId: 10, dateOfBirth: "1947-03-12", gender: "Nữ", address: "45 Lê Văn Lương, Q.7", declaredGroup: "CHRONIC", targetGroup: "CHRONIC", conditions: ["Tiểu đường type 2", "Cao huyết áp"], allergies: ["Hải sản"], diet: "Ít đường, ít muối, không hải sản", hobbies: "Nghe nhạc xưa, đánh cờ caro", careNote: "Đau gối phải khi đi bộ lâu. Đo đường huyết trước ăn sáng.", caregiverId: 4, nurseId: 3, tone: "orange" }),
  em({ id: 2, fullName: "Trần Văn Minh", familyUserId: 10, dateOfBirth: "1944-06-02", gender: "Nam", address: "45 Lê Văn Lương, Q.7", declaredGroup: "REHAB", targetGroup: "REHAB", conditions: ["Thoái hóa khớp gối", "Sau mổ thay khớp háng (03/2026)"], diet: "Bình thường, nhiều canxi", hobbies: "Cờ tướng, đọc báo", careNote: "Đi bằng khung tập đi. Cần người đỡ khi lên xuống bậc.", caregiverId: 4, nurseId: 3, tone: "blue" }),
  em({ id: 3, fullName: "Lê Thị Hoa", familyUserId: 11, dateOfBirth: "1951-05-12", gender: "Nữ", address: "12 Lê Lợi, Q.1", declaredGroup: "CHRONIC", targetGroup: "CHRONIC", conditions: ["Cao huyết áp", "Rối loạn mỡ máu"], allergies: ["Penicillin"], diet: "Ít muối", hobbies: "Cắm hoa, hát", careNote: "Hay quên uống thuốc ở nhà, gia đình gửi thuốc theo ngày.", caregiverId: 6, nurseId: 3, tone: "green" }),
  em({ id: 4, fullName: "Phạm Văn Đức", familyUserId: 14, dateOfBirth: "1946-01-20", gender: "Nam", address: "7 Hoàng Diệu, Q.4", declaredGroup: "MOBILE", targetGroup: "MOBILE", hobbies: "Cờ tướng", careNote: "Tự đi lại tốt. Đi T2-4-6.", caregiverId: 6, nurseId: 5, tone: "blue" }),
  em({ id: 5, fullName: "Võ Thị Bích", familyUserId: 12, dateOfBirth: "1941-09-09", gender: "Nữ", address: "3 Nguyễn Hữu Thọ, Q.7", declaredGroup: "STROKE", targetGroup: "STROKE", conditions: ["Sau tai biến (12/2025), yếu nửa người phải", "Cao huyết áp"], diet: "Thức ăn mềm, cắt nhỏ", careNote: "Đang nằm viện từ 02/10 do dấu hiệu tái phát. Bảo lưu tới 20/10.", caregiverId: 7, nurseId: 5, status: "PAUSED", tone: "purple" }),
  em({ id: 6, fullName: "Đỗ Văn Hải", familyUserId: 15, dateOfBirth: "1949-11-30", gender: "Nam", address: "19 Phạm Hùng, Q.8", declaredGroup: "MOBILE", targetGroup: "MOBILE", hobbies: "Đọc báo", careNote: "Đi theo gói ngày khi con đi công tác.", caregiverId: 7, nurseId: 5, tone: "orange" }),
  em({ id: 7, fullName: "Hoàng Thị Mai", familyUserId: 13, dateOfBirth: "1947-04-18", gender: "Nữ", address: "60 Huỳnh Tấn Phát, Q.7", declaredGroup: "DEMENTIA", targetGroup: "DEMENTIA", conditions: ["Alzheimer giai đoạn nhẹ"], diet: "Bình thường", hobbies: "Âm nhạc, cắm hoa", careNote: "Đeo vòng tay nhận diện. Hay hỏi giờ về, cần trấn an. Không để một mình gần cửa ra vào.", caregiverId: 4, nurseId: 3, tone: "purple" }),
  em({ id: 8, fullName: "Lê Thị Huệ", familyUserId: 10, dateOfBirth: "1951-08-08", gender: "Nữ", address: "45 Lê Văn Lương, Q.7", declaredGroup: "MOBILE", hobbies: "Làm bánh, xem phim", status: "PENDING", tone: "green" }),
  em({ id: 9, fullName: "Bùi Văn Tâm", familyUserId: 16, dateOfBirth: "1945-02-08", gender: "Nam", address: "88 Trần Hưng Đạo, Q.5", declaredGroup: "MOBILE", conditions: ["Cao huyết áp"], diet: "Ăn mềm", careNote: "Gia đình khai đi lại được; điều dưỡng ghi nhận huyết áp không ổn định.", status: "PENDING", tone: "blue" }),
  em({ id: 10, fullName: "Ngô Thị Sen", familyUserId: 17, dateOfBirth: "1950-12-01", gender: "Nữ", address: "5 Lý Thường Kiệt, Q.10", declaredGroup: "REHAB", targetGroup: "REHAB", conditions: ["Sau gãy cổ xương đùi (06/2026)"], careNote: "Đi bằng nạng, cần tập đi.", status: "PENDING", tone: "orange" }),
  em({ id: 11, fullName: "Võ Văn Long", familyUserId: 12, dateOfBirth: "1943-07-15", gender: "Nam", address: "3 Nguyễn Hữu Thọ, Q.7", declaredGroup: "MOBILE", targetGroup: "MOBILE", careNote: "Gói tháng 9 đã hết hạn, chưa gia hạn.", caregiverId: 6, nurseId: 5, status: "SUSPENDED", tone: "green" }),
  em({ id: 12, fullName: "Trịnh Văn Phước", familyUserId: 18, dateOfBirth: "1948-03-03", gender: "Nam", address: "21 Nguyễn Văn Linh, Q.7", declaredGroup: "MOBILE", targetGroup: "MOBILE", conditions: [], careNote: "Muốn hạng Cao cấp (phòng 2 người). Đang trong danh sách chờ.", status: "PENDING", tone: "blue" }),
  em({ id: 13, fullName: "Lê Văn Thịnh", familyUserId: 11, dateOfBirth: "1938-01-01", gender: "Nam", address: "12 Lê Lợi, Q.1", declaredGroup: "CHRONIC", targetGroup: "CHRONIC", conditions: ["Suy tim"], status: "TERMINATED", tone: "blue" }),
];

const pickups: AuthorizedPickup[] = [
  { id: 1, elderlyId: 1, fullName: "Nguyễn Lan Anh", relationship: "Con dâu", phone: "0903 456 789", idLast4: "4521", isPrimary: true },
  { id: 2, elderlyId: 1, fullName: "Nguyễn Văn Hùng", relationship: "Con trai", phone: "0909 112 233", idLast4: "0987", isPrimary: false },
  { id: 3, elderlyId: 2, fullName: "Nguyễn Lan Anh", relationship: "Con dâu", phone: "0903 456 789", idLast4: "4521", isPrimary: true },
  { id: 4, elderlyId: 2, fullName: "Trần Minh Khoa", relationship: "Cháu nội", phone: "0977 554 433", idLast4: "7710", isPrimary: false },
  { id: 5, elderlyId: 3, fullName: "Lê Văn Phúc", relationship: "Con trai", phone: "0912 345 678", idLast4: "3322", isPrimary: true },
  { id: 6, elderlyId: 4, fullName: "Phạm Thị Thu", relationship: "Con gái", phone: "0915 444 555", idLast4: "1188", isPrimary: true },
  { id: 7, elderlyId: 5, fullName: "Võ Minh Quân", relationship: "Cháu trai", phone: "0913 222 333", idLast4: "6060", isPrimary: true },
  { id: 8, elderlyId: 6, fullName: "Đỗ Thanh Tùng", relationship: "Con trai", phone: "0916 555 666", idLast4: "2468", isPrimary: true },
  { id: 9, elderlyId: 6, fullName: "Đỗ Thị Hằng", relationship: "Con dâu", phone: "0918 777 000", idLast4: "1357", isPrimary: false },
  { id: 10, elderlyId: 7, fullName: "Hoàng Gia Bảo", relationship: "Cháu trai", phone: "0914 333 444", idLast4: "9090", isPrimary: true },
  { id: 11, elderlyId: 8, fullName: "Nguyễn Lan Anh", relationship: "Con dâu", phone: "0903 456 789", idLast4: "4521", isPrimary: true },
  { id: 12, elderlyId: 9, fullName: "Bùi Thị Ngọc", relationship: "Con gái", phone: "0938 222 111", idLast4: "5544", isPrimary: true },
  { id: 13, elderlyId: 10, fullName: "Ngô Văn Lực", relationship: "Con trai", phone: "0939 111 000", idLast4: "8899", isPrimary: true },
  { id: 14, elderlyId: 11, fullName: "Võ Minh Quân", relationship: "Cháu trai", phone: "0913 222 333", idLast4: "6060", isPrimary: true },
  { id: 15, elderlyId: 12, fullName: "Trịnh Minh Khang", relationship: "Con trai", phone: "0937 888 999", idLast4: "3030", isPrimary: true },
];

// ------------------------------------------------------------------ packages & services
const PRICE = {
  BASIC: { DAY: 350000, M3: 4200000, MONTH: 8500000 },
  STANDARD: { DAY: 420000, M3: 5000000, MONTH: 10200000 },
  PREMIUM: { DAY: 520000, M3: 6200000, MONTH: 12600000 },
} as const;
const packages: ServicePackage[] = [];
let pkid = 1;
for (const tier of ["BASIC", "STANDARD", "PREMIUM"] as const)
  for (const cycle of ["DAY", "M3", "MONTH", "Q", "Y"] as const) {
    const m = PRICE[tier].MONTH;
    const basePrice = cycle === "Q" ? Math.round((m * 3 * 0.95) / 1000) * 1000 : cycle === "Y" ? Math.round((m * 12 * 0.9) / 1000) * 1000 : PRICE[tier][cycle];
    packages.push({ id: pkid++, tier, cycle, basePrice, weekdayOptions: cycle === "M3" ? [[1, 3, 5], [2, 4, 6]] : undefined, status: "ACTIVE" });
  }
export const pkgId = (tier: "BASIC" | "STANDARD" | "PREMIUM", cycle: "DAY" | "M3" | "MONTH" | "Q" | "Y") => packages.find((p) => p.tier === tier && p.cycle === cycle)!.id;

const entitlements: TierEntitlement[] = [
  { tier: "BASIC", dailyPrice: 350000, staffRatio: 8, meals: "Trưa + xế", menu: "Chung", napRoom: "Phòng chung", fixedBed: false, vitalsPerDay: 1, monthlyHealthReport: false, glucose: "Mua thêm", weight: "Hằng tháng", optionalPool: 8, optionalMax: 5, photoPerDay: 3, aiAlertFamily: "URGENT_ONLY", chat: "Trong giờ hành chính", waitlistPriority: false },
  { tier: "STANDARD", dailyPrice: 420000, staffRatio: 6, meals: "Sáng + trưa + xế", menu: "Chung, có món thay khi kiêng", napRoom: "Phòng 4–6 người", fixedBed: false, vitalsPerDay: 2, monthlyHealthReport: false, glucose: "Hằng ngày", weight: "2 tuần/lần", optionalPool: 10, optionalMax: 7, photoPerDay: 5, aiAlertFamily: "ALL", chat: "Trong ca", waitlistPriority: false },
  { tier: "PREMIUM", dailyPrice: 520000, staffRatio: 4, meals: "Sáng + trưa + xế", menu: "Riêng theo bệnh lý", napRoom: "Phòng 2 người", fixedBed: true, vitalsPerDay: 2, monthlyHealthReport: true, glucose: "Hằng ngày", weight: "Hằng tuần", optionalPool: 10, optionalMax: 10, photoPerDay: null, aiAlertFamily: "ALL", chat: "Trong ca, ưu tiên phản hồi", waitlistPriority: true },
];

const all = (q: string) => ({ BASIC: q, STANDARD: q, PREMIUM: q });
const sv = (s: Partial<Service> & Pick<Service, "id" | "name" | "kind" | "description" | "owner" | "quota">): Service => ({ equipmentIds: [], needsNurseOk: false, status: "ACTIVE", ...s });
const services: Service[] = [
  sv({ id: 1, name: "Đo chỉ số (huyết áp, mạch, nhiệt độ)", kind: "INCLUDED", description: "Điều dưỡng đo tại phòng y tế.", owner: "NURSE", roomId: 2, equipmentIds: [1, 2], quota: { BASIC: "1 lần/ngày", STANDARD: "2 lần/ngày", PREMIUM: "2 lần/ngày + báo cáo tháng" } }),
  sv({ id: 2, name: "Dưỡng sinh, thở, khởi động khớp", kind: "INCLUDED", description: "Cả nhóm, ngồi hoặc đứng tùy sức.", durationMin: 30, owner: "CAREGIVER", roomId: 13, quota: all("Hằng ngày") }),
  sv({ id: 3, name: "Thư giãn tự do", kind: "INCLUDED", description: "TV, nhạc xưa, báo, cờ, trà.", owner: "CAREGIVER", roomId: 3, quota: all("Cả ngày") }),
  sv({ id: 4, name: "Sinh nhật tháng, lễ Tết", kind: "INCLUDED", description: "Tổ chức cuối mỗi tháng.", owner: "CAREGIVER", roomId: 3, quota: all("Theo lịch") }),
  sv({ id: 5, name: "Nhắc và ghi nhận uống thuốc", kind: "INCLUDED", description: "Gia đình gửi thuốc kèm hướng dẫn.", owner: "NURSE", quota: all("Theo giờ uống") }),
  sv({ id: 6, name: "Theo dõi cân nặng", kind: "INCLUDED", description: "Điều dưỡng cân và ghi lại.", owner: "NURSE", roomId: 2, quota: { BASIC: "Hằng tháng", STANDARD: "2 tuần/lần", PREMIUM: "Hằng tuần" } }),
  sv({ id: 7, name: "Đo đường huyết hằng ngày (cụ tiểu đường)", kind: "INCLUDED", description: "5 phút, trước ăn sáng.", durationMin: 5, owner: "NURSE", roomId: 2, equipmentIds: [3], quota: { BASIC: null, STANDARD: "Hằng ngày", PREMIUM: "Hằng ngày" } }),
  sv({ id: 11, name: "Vật lý trị liệu bằng máy", kind: "OPTIONAL", description: "Xe đạp tập, thanh song song tập đi, ròng rọc tập tay vai.", durationMin: 30, owner: "NURSE", roomId: 4, equipmentIds: [6, 7, 8], healthNote: "Đo huyết áp trước khi tập", quota: { BASIC: null, STANDARD: "2 buổi/tuần", PREMIUM: "Hằng ngày" } }),
  sv({ id: 12, name: "Ghế massage", kind: "OPTIONAL", description: "Massage lưng, vai, chân bằng ghế, chế độ nhẹ.", durationMin: 20, owner: "CAREGIVER", roomId: 11, equipmentIds: [9], needsNurseOk: true, healthNote: "Không dùng khi huyết áp cao, mới tai biến, loãng xương nặng", quota: { BASIC: "1 lượt/tuần", STANDARD: "3 lượt/tuần", PREMIUM: "Hằng ngày" } }),
  sv({ id: 13, name: "Máy massage chân", kind: "OPTIONAL", description: "Massage bàn chân và bắp chân.", durationMin: 15, owner: "CAREGIVER", roomId: 11, equipmentIds: [10], needsNurseOk: true, healthNote: "Nhẹ hơn ghế massage, hợp cụ hay tê chân", quota: { BASIC: "1 lượt/tuần", STANDARD: "3 lượt/tuần", PREMIUM: "Hằng ngày" } }),
  sv({ id: 14, name: "Ngâm chân thảo dược", kind: "OPTIONAL", description: "Nước ấm với gừng, ngải, sả.", durationMin: 20, owner: "CAREGIVER", roomId: 11, equipmentIds: [11], needsNurseOk: true, healthNote: "Nước tối đa 40°C; cụ tiểu đường kiểm tra vết thương ở chân", quota: { BASIC: null, STANDARD: "2 lượt/tuần", PREMIUM: "Hằng ngày" } }),
  sv({ id: 15, name: "Thể dục trên ghế", kind: "OPTIONAL", description: "Nâng tay, duỗi chân, xoay khớp theo nhạc.", durationMin: 20, owner: "CAREGIVER", roomId: 3, healthNote: "Hợp cả cụ ngồi xe lăn", quota: { BASIC: "2 buổi/tuần", STANDARD: "3 buổi/tuần", PREMIUM: "Hằng ngày" } }),
  sv({ id: 16, name: "Đi bộ có người dìu", kind: "OPTIONAL", description: "Đi chậm quanh sân có tay vịn.", durationMin: 15, owner: "CAREGIVER", roomId: 13, healthNote: "Giày chống trơn, phòng té ngã", quota: all("Hằng ngày") }),
  sv({ id: 17, name: "Âm nhạc, hát nhẹ", kind: "OPTIONAL", description: "Nghe nhạc xưa, hát nhẹ nhàng, vỗ tay theo nhịp. Không hát karaoke.", durationMin: 30, owner: "CAREGIVER", roomId: 3, healthNote: "Âm lượng vừa phải", quota: all("Theo lịch") }),
  sv({ id: 18, name: "Đọc báo, kể chuyện nhóm", kind: "OPTIONAL", description: "Staff đọc to tin tức nhẹ nhàng, cả nhóm trò chuyện.", durationMin: 30, owner: "CAREGIVER", roomId: 3, healthNote: "Tránh tin tiêu cực", quota: all("Theo lịch") }),
  sv({ id: 19, name: "Cắm hoa đơn giản", kind: "OPTIONAL", description: "Cắm hoa đã cắt sẵn cành vào bình.", durationMin: 30, owner: "CAREGIVER", roomId: 3, healthNote: "Không dùng kéo", quota: all("Theo lịch") }),
  sv({ id: 20, name: "Cờ tướng, cờ caro", kind: "OPTIONAL", description: "Chơi theo cặp, staff ghép cặp.", durationMin: 30, owner: "CAREGIVER", roomId: 3, equipmentIds: [12], quota: all("Theo lịch") }),
  sv({ id: 31, name: "Thêm buổi vật lý trị liệu", kind: "ADDON", description: "Gói 4 buổi, xếp vào khung còn trống.", owner: "NURSE", roomId: 4, addonPrice: 600000, addonUnit: "gói 4 buổi", quota: all("Mua thêm") }),
  sv({ id: 32, name: "Đo đường huyết hằng ngày", kind: "ADDON", description: "Chỉ hạng Cơ bản; Tiêu chuẩn và Cao cấp đã có sẵn.", owner: "NURSE", addonPrice: 300000, addonUnit: "tháng", quota: { BASIC: "Mua thêm", STANDARD: null, PREMIUM: null } }),
  sv({ id: 33, name: "Phục hồi chức năng 1-1 sau tai biến", kind: "ADDON", description: "Buổi 45 phút, điều dưỡng hướng dẫn.", owner: "NURSE", roomId: 4, addonPrice: 250000, addonUnit: "buổi", quota: all("Mua thêm") }),
  sv({ id: 34, name: "Cắt tóc, gội đầu", kind: "ADDON", description: "Thợ đến trung tâm thứ Bảy hằng tuần.", owner: "CAREGIVER", addonPrice: 60000, addonUnit: "lần", quota: all("Mua thêm") }),
  sv({ id: 35, name: "Cắt móng tay chân", kind: "ADDON", description: "Cụ tiểu đường do điều dưỡng làm.", owner: "CAREGIVER", needsNurseOk: true, addonPrice: 40000, addonUnit: "lần", quota: all("Mua thêm") }),
  sv({ id: 36, name: "Sữa dinh dưỡng, suất ăn thêm", kind: "ADDON", description: "Một hộp sữa buổi xế mỗi ngày.", owner: "CAREGIVER", addonPrice: 450000, addonUnit: "tháng", quota: all("Mua thêm") }),
  sv({ id: 37, name: "Đi cùng cụ tới phòng khám", kind: "ADDON", description: "Hộ lý đi kèm, gia đình trả chi phí đi lại.", owner: "CAREGIVER", addonPrice: 200000, addonUnit: "lần", quota: all("Mua thêm") }),
];

// ------------------------------------------------------------------ subscriptions
type SubInput = Omit<Subscription, "basePrice" | "discount" | "createdBy" | "packageId"> & { createdBy?: number };
const sub = (s: SubInput): Subscription => {
  const p = packages.find((x) => x.tier === s.tier && x.cycle === s.cycle)!;
  const base = s.cycle === "DAY" ? p.basePrice * (s.dayDates?.length ?? 1) : p.basePrice;
  return { packageId: p.id, basePrice: base, discount: 0, createdBy: 0, ...s } as Subscription;
};
const subscriptions: Subscription[] = [
  sub({ id: 1, elderlyId: 1, targetGroup: "CHRONIC", tier: "STANDARD", cycle: "MONTH", startDate: "2026-10-01", endDate: "2026-10-31", surchargeAmount: 600000, surchargeNote: "Theo dõi đường huyết + huyết áp, nhắc thuốc 2 lần/ngày", familyConfirmedAt: t("2026-09-27", "20:10"), status: "ACTIVE", createdAt: t("2026-09-26", "09:00"), createdBy: 10, previousId: 21 }),
  sub({ id: 2, elderlyId: 2, targetGroup: "REHAB", tier: "PREMIUM", cycle: "MONTH", startDate: "2026-09-15", endDate: "2026-10-14", surchargeAmount: 1000000, surchargeNote: "VLTL phục hồi sau thay khớp háng, cần 1 người đỡ", familyConfirmedAt: t("2026-09-12", "19:40"), status: "ACTIVE", createdAt: t("2026-09-08", "10:00"), createdBy: 10 }),
  sub({ id: 3, elderlyId: 3, targetGroup: "CHRONIC", tier: "STANDARD", cycle: "Q", startDate: "2026-09-01", endDate: "2026-11-30", surchargeAmount: 1500000, surchargeNote: "500.000đ/tháng · theo dõi huyết áp 2 lần/ngày", familyConfirmedAt: t("2026-08-29", "21:00"), status: "ACTIVE", createdAt: t("2026-08-25", "09:00"), createdBy: 11 }),
  sub({ id: 4, elderlyId: 4, targetGroup: "MOBILE", tier: "BASIC", cycle: "M3", weekdays: [1, 3, 5], startDate: "2026-10-01", endDate: "2026-10-31", surchargeAmount: 0, familyConfirmedAt: t("2026-09-28", "18:00"), status: "ACTIVE", createdAt: t("2026-09-26", "11:00"), createdBy: 14 }),
  sub({ id: 5, elderlyId: 5, targetGroup: "STROKE", tier: "PREMIUM", cycle: "MONTH", startDate: "2026-10-01", endDate: "2026-11-18", surchargeAmount: 1200000, surchargeNote: "VLTL phục hồi hằng ngày, đo huyết áp 3 lần/ngày, hỗ trợ ăn", familyConfirmedAt: t("2026-09-29", "20:00"), status: "PAUSED", pausedUntil: "2026-10-20", createdAt: t("2026-09-25", "09:00"), createdBy: 12 }),
  sub({ id: 6, elderlyId: 6, targetGroup: "MOBILE", tier: "BASIC", cycle: "DAY", dayDates: ["2026-10-07", "2026-10-09", "2026-10-14"], startDate: "2026-10-07", endDate: "2026-10-14", surchargeAmount: 0, familyConfirmedAt: t("2026-10-05", "08:00"), status: "ACTIVE", createdAt: t("2026-10-05", "07:50"), createdBy: 15 }),
  sub({ id: 7, elderlyId: 7, targetGroup: "DEMENTIA", tier: "STANDARD", cycle: "MONTH", startDate: "2026-09-20", endDate: "2026-10-19", surchargeAmount: 800000, surchargeNote: "Khu kiểm soát ra vào, vòng tay nhận diện, ghi hành vi", familyConfirmedAt: t("2026-09-17", "21:30"), status: "ACTIVE", createdAt: t("2026-09-14", "09:00"), createdBy: 13 }),
  sub({ id: 8, elderlyId: 8, targetGroup: "MOBILE", tier: "BASIC", cycle: "MONTH", startDate: "2026-10-15", endDate: "2026-11-14", surchargeAmount: 0, status: "PENDING_ASSESSMENT", createdAt: t("2026-10-07", "21:05"), createdBy: 10 }),
  sub({ id: 9, elderlyId: 9, targetGroup: "MOBILE", tier: "BASIC", cycle: "MONTH", startDate: "2026-10-12", endDate: "2026-11-11", surchargeAmount: 0, status: "PENDING_ASSESSMENT", createdAt: t("2026-10-03", "10:10"), createdBy: 16 }),
  sub({ id: 10, elderlyId: 10, targetGroup: "REHAB", tier: "STANDARD", cycle: "MONTH", startDate: "2026-10-12", endDate: "2026-11-11", surchargeAmount: 800000, surchargeNote: "Tập đi với nạng 3 buổi/tuần, điều dưỡng hướng dẫn", status: "AWAITING_PAYMENT", createdAt: t("2026-10-01", "10:58"), createdBy: 17 }),
  sub({ id: 11, elderlyId: 11, targetGroup: "MOBILE", tier: "BASIC", cycle: "MONTH", startDate: "2026-09-01", endDate: "2026-09-30", surchargeAmount: 0, familyConfirmedAt: t("2026-08-28", "09:00"), status: "SUSPENDED", createdAt: t("2026-08-27", "09:00"), createdBy: 12 }),
  sub({ id: 12, elderlyId: 12, targetGroup: "MOBILE", tier: "PREMIUM", cycle: "MONTH", startDate: "2026-10-15", endDate: "2026-11-14", surchargeAmount: 0, status: "PENDING_ASSESSMENT", createdAt: t("2026-10-01", "08:30"), createdBy: 18 }),
  sub({ id: 13, elderlyId: 13, targetGroup: "CHRONIC", tier: "STANDARD", cycle: "Q", startDate: "2026-07-01", endDate: "2026-09-30", surchargeAmount: 1500000, familyConfirmedAt: t("2026-06-28", "09:00"), status: "TERMINATED", createdAt: t("2026-06-25", "09:00"), createdBy: 11 }),
  sub({ id: 21, elderlyId: 1, targetGroup: "CHRONIC", tier: "STANDARD", cycle: "MONTH", startDate: "2026-09-01", endDate: "2026-09-30", surchargeAmount: 600000, familyConfirmedAt: t("2026-08-28", "09:00"), status: "EXPIRED", createdAt: t("2026-08-26", "09:00"), createdBy: 10 }),
];

const choose = (subscriptionId: number, ids: number[], effectiveFrom: string) => ids.map((serviceId) => ({ subscriptionId, serviceId, effectiveFrom }));
const serviceChoices: ServiceChoice[] = [
  ...choose(1, [11, 12, 15, 16, 17, 18, 20], "2026-10-01"),
  ...choose(2, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "2026-09-15"),
  ...choose(3, [11, 13, 15, 16, 17, 19, 20], "2026-09-01"),
  ...choose(4, [12, 13, 15, 16, 20], "2026-10-01"),
  ...choose(5, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "2026-10-01"),
  ...choose(6, [15, 16, 17, 18, 20], "2026-10-07"),
  ...choose(7, [13, 15, 16, 17, 18, 19, 20], "2026-09-20"),
  ...choose(8, [15, 16, 17, 18, 19], "2026-10-15"),
  ...choose(9, [12, 13, 15, 16, 17], "2026-10-12"),
  ...choose(10, [11, 13, 15, 16, 17, 18, 20], "2026-10-12"),
  ...choose(11, [15, 16, 18, 20], "2026-09-01"),
  ...choose(12, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20], "2026-10-15"),
];
const addOns: AddOn[] = [
  { id: 1, subscriptionId: 1, serviceId: 34, quantity: 1, price: 60000, createdAt: t("2026-09-26", "09:00") },
  { id: 2, subscriptionId: 2, serviceId: 36, quantity: 1, price: 450000, createdAt: t("2026-09-08", "10:00") },
  { id: 3, subscriptionId: 5, serviceId: 33, quantity: 4, price: 1000000, createdAt: t("2026-09-25", "09:00") },
];

const servicePermissions: ServicePermission[] = [
  { elderlyId: 1, serviceId: 12, allowed: true, reason: "Huyết áp ổn định dưới 140/90 trong 2 tuần", nurseId: 3, date: "2026-09-26" },
  { elderlyId: 1, serviceId: 14, allowed: false, reason: "Tiểu đường, da chân khô nứt — chưa dùng ngâm chân", nurseId: 3, date: "2026-09-26" },
  { elderlyId: 2, serviceId: 12, allowed: true, reason: "Đã qua 6 tháng sau mổ, chỉ chế độ nhẹ phần lưng", nurseId: 3, date: "2026-09-12" },
  { elderlyId: 2, serviceId: 13, allowed: true, reason: "Không chống chỉ định", nurseId: 3, date: "2026-09-12" },
  { elderlyId: 2, serviceId: 14, allowed: false, reason: "Vết mổ cũ ở hông, tránh ngồi lâu cúi người", nurseId: 3, date: "2026-09-12" },
  { elderlyId: 3, serviceId: 13, allowed: true, reason: "Huyết áp kiểm soát được", nurseId: 3, date: "2026-08-28" },
  { elderlyId: 5, serviceId: 12, allowed: false, reason: "Chưa qua giai đoạn cấp sau tái phát", nurseId: 5, date: "2026-10-02" },
  { elderlyId: 5, serviceId: 13, allowed: true, reason: "Chân trái, chế độ nhẹ", nurseId: 5, date: "2026-09-28" },
  { elderlyId: 5, serviceId: 14, allowed: false, reason: "Giảm cảm giác bên liệt, nguy cơ bỏng", nurseId: 5, date: "2026-09-28" },
  { elderlyId: 7, serviceId: 13, allowed: true, reason: "Không chống chỉ định", nurseId: 3, date: "2026-09-18" },
];

const assessments: Assessment[] = [
  { id: 1, elderlyId: 1, subscriptionId: 21, kind: "INITIAL", scheduledAt: t("2026-08-27", "09:00"), nurseId: 3, barthel: 90, proposedGroup: "CHRONIC", baseline: "HA 135/85 · ĐH đói 7,4 mmol/L · 58kg", diagnosisDocs: "Sổ khám tiểu đường BV Nhân dân 115", nurseNote: "Tự đi lại, đau gối phải. Cần nhắc thuốc.", doneAt: t("2026-08-27", "09:40"), status: "APPROVED", approvedBy: 3, approvedAt: t("2026-08-27", "09:40") },
  { id: 2, elderlyId: 2, subscriptionId: 2, kind: "INITIAL", scheduledAt: t("2026-09-10", "09:00"), nurseId: 3, barthel: 70, proposedGroup: "REHAB", baseline: "HA 128/80 · 64kg · đi 10m với khung", diagnosisDocs: "Giấy ra viện BV Chợ Rẫy 03/2026", nurseNote: "Cần hỗ trợ khi di chuyển, tập đi hằng ngày.", doneAt: t("2026-09-10", "09:50"), status: "APPROVED", approvedBy: 3, approvedAt: t("2026-09-10", "09:50") },
  { id: 3, elderlyId: 3, subscriptionId: 3, kind: "INITIAL", scheduledAt: t("2026-08-26", "14:00"), nurseId: 3, barthel: 95, proposedGroup: "CHRONIC", baseline: "HA 145/90 · 52kg", nurseNote: "Huyết áp dao động, quên thuốc.", doneAt: t("2026-08-26", "14:30"), status: "APPROVED", approvedBy: 3, approvedAt: t("2026-08-26", "14:30") },
  { id: 4, elderlyId: 4, subscriptionId: 4, kind: "INITIAL", scheduledAt: t("2026-09-27", "09:00"), nurseId: 5, barthel: 100, proposedGroup: "MOBILE", baseline: "HA 125/78 · 60kg", nurseNote: "Hoàn toàn tự lập.", doneAt: t("2026-09-27", "09:20"), status: "APPROVED", approvedBy: 5, approvedAt: t("2026-09-27", "09:20") },
  { id: 5, elderlyId: 5, subscriptionId: 5, kind: "INITIAL", scheduledAt: t("2026-09-26", "09:00"), nurseId: 5, barthel: 55, proposedGroup: "STROKE", baseline: "HA 150/90 · 48kg · yếu tay chân phải", diagnosisDocs: "Giấy ra viện BV Nhân dân 115 (12/2025)", nurseNote: "Nói chậm, nuốt chậm. Cần thức ăn mềm.", doneAt: t("2026-09-26", "09:50"), status: "APPROVED", approvedBy: 5, approvedAt: t("2026-09-26", "09:50") },
  { id: 6, elderlyId: 6, subscriptionId: 6, kind: "INITIAL", scheduledAt: t("2026-10-05", "07:30"), nurseId: 5, barthel: 100, proposedGroup: "MOBILE", baseline: "HA 122/80 · 66kg", nurseNote: "Đi thử gói ngày.", doneAt: t("2026-10-05", "07:45"), status: "APPROVED", approvedBy: 5, approvedAt: t("2026-10-05", "07:45") },
  { id: 7, elderlyId: 7, subscriptionId: 7, kind: "INITIAL", scheduledAt: t("2026-09-15", "09:00"), nurseId: 3, barthel: 85, proposedGroup: "DEMENTIA", baseline: "MMSE 21/30 · HA 130/80", diagnosisDocs: "Kết luận BV Đại học Y Dược", nurseNote: "Hay hỏi lặp lại, có lúc muốn đi về. Không kích động.", doneAt: t("2026-09-15", "09:45"), status: "APPROVED", approvedBy: 3, approvedAt: t("2026-09-15", "09:45") },
  { id: 8, elderlyId: 8, subscriptionId: 8, kind: "INITIAL", scheduledAt: t("2026-10-10", "09:00"), nurseId: 3, status: "SCHEDULED" },
  { id: 9, elderlyId: 9, subscriptionId: 9, kind: "INITIAL", scheduledAt: t(DEMO_TODAY, "10:30"), nurseId: 3, status: "SCHEDULED" },
  { id: 10, elderlyId: 10, subscriptionId: 10, kind: "INITIAL", scheduledAt: t("2026-10-03", "09:00"), nurseId: 5, barthel: 75, proposedGroup: "REHAB", baseline: "HA 130/85 · 55kg · đi 15m với nạng", diagnosisDocs: "Giấy ra viện BV Chấn thương chỉnh hình", nurseNote: "Tập đi 3 buổi/tuần.", doneAt: t("2026-10-03", "09:40"), status: "APPROVED", approvedBy: 5, approvedAt: t("2026-10-03", "09:40") },
  { id: 11, elderlyId: 12, subscriptionId: 12, kind: "INITIAL", scheduledAt: t("2026-10-13", "09:00"), nurseId: 5, status: "SCHEDULED" },
  { id: 12, elderlyId: 2, kind: "PERIODIC", scheduledAt: t("2026-10-12", "09:00"), nurseId: 3, status: "SCHEDULED" },
];

const waitlist: WaitlistEntry[] = [
  { id: 1, elderlyId: 12, tier: "PREMIUM", requestedAt: t("2026-10-01", "08:30"), reason: "FULL", status: "WAITING" },
  { id: 2, elderlyId: 1, tier: "PREMIUM", requestedAt: t("2026-10-05", "20:00"), reason: "UPGRADE", status: "WAITING" },
];

// ------------------------------------------------------------------ money
const inv = (id: number, subscriptionId: number, number: string, kind: Invoice["kind"], lines: [string, number][], issueDate: string, status: Invoice["status"], creditUsed = 0): Invoice => {
  const total = lines.reduce((s, [, a]) => s + a, 0) - creditUsed;
  return { id, subscriptionId, number, kind, lines: lines.map(([label, amount]) => ({ label, amount })), creditUsed, total, issueDate, dueDate: addDays(issueDate, 3), status };
};
const P = (tier: "BASIC" | "STANDARD" | "PREMIUM", cycle: "DAY" | "M3" | "MONTH" | "Q" | "Y") => packages.find((p) => p.tier === tier && p.cycle === cycle)!.basePrice;
const invoices: Invoice[] = [
  inv(1, 1, "HD-2609-0101", "RENEWAL", [["Gói tháng · Tiêu chuẩn (01/10–31/10)", P("STANDARD", "MONTH")], ["Phụ phí nhóm Bệnh mãn tính", 600000], ["Cắt tóc, gội đầu × 1", 60000]], "2026-09-26", "PAID"),
  inv(2, 2, "HD-2609-0088", "NEW", [["Gói tháng · Cao cấp (15/09–14/10)", P("PREMIUM", "MONTH")], ["Phụ phí nhóm Phục hồi chức năng", 1000000], ["Sữa dinh dưỡng × 1 tháng", 450000]], "2026-09-12", "PAID"),
  inv(3, 3, "HD-2608-0061", "NEW", [["Gói quý · Tiêu chuẩn (01/09–30/11)", P("STANDARD", "Q")], ["Phụ phí nhóm Bệnh mãn tính (3 tháng)", 1500000]], "2026-08-29", "PAID"),
  inv(4, 4, "HD-2609-0097", "NEW", [["Tháng 3 buổi/tuần · Cơ bản (T2-4-6)", P("BASIC", "M3")]], "2026-09-28", "PAID"),
  inv(5, 5, "HD-2609-0099", "NEW", [["Gói tháng · Cao cấp (01/10–31/10)", P("PREMIUM", "MONTH")], ["Phụ phí nhóm Sau tai biến", 1200000], ["Phục hồi chức năng 1-1 × 4 buổi", 1000000]], "2026-09-29", "PAID"),
  inv(6, 6, "HD-2610-0104", "DAY_BOOKING", [["Gói ngày · Cơ bản × 3 ngày (07, 09, 14/10)", P("BASIC", "DAY") * 3]], "2026-10-05", "PAID"),
  inv(7, 7, "HD-2609-0092", "NEW", [["Gói tháng · Tiêu chuẩn (20/09–19/10)", P("STANDARD", "MONTH")], ["Phụ phí nhóm Sa sút trí tuệ", 800000]], "2026-09-17", "PAID"),
  inv(8, 10, "HD-2610-0106", "NEW", [["Gói tháng · Tiêu chuẩn (12/10–11/11)", P("STANDARD", "MONTH")], ["Phụ phí nhóm Phục hồi chức năng", 800000]], "2026-10-03", "UNPAID"),
  inv(9, 11, "HD-2608-0070", "NEW", [["Gói tháng · Cơ bản (01/09–30/09)", P("BASIC", "MONTH")]], "2026-08-28", "PAID"),
  inv(10, 11, "HD-2609-0102", "RENEWAL", [["Gói tháng · Cơ bản (01/10–31/10)", P("BASIC", "MONTH")]], "2026-09-24", "UNPAID"),
  inv(11, 2, "HD-2610-0107", "RENEWAL", [["Gói tháng · Cao cấp (15/10–14/11)", P("PREMIUM", "MONTH")], ["Phụ phí nhóm Phục hồi chức năng", 1000000]], "2026-10-07", "UNPAID"),
  inv(12, 13, "HD-2606-0040", "NEW", [["Gói quý · Tiêu chuẩn (01/07–30/09)", P("STANDARD", "Q")], ["Phụ phí nhóm Bệnh mãn tính (3 tháng)", 1500000]], "2026-06-28", "REFUNDED"),
  inv(13, 21, "HD-2608-0066", "NEW", [["Gói tháng · Tiêu chuẩn (01/09–30/09)", P("STANDARD", "MONTH")], ["Phụ phí nhóm Bệnh mãn tính", 600000]], "2026-08-28", "PAID"),
];
const pay = (id: number, invoiceId: number, payerId: number, method: Payment["method"], code: string, paidAt: string, status: Payment["status"] = "SUCCESS"): Payment =>
  ({ id, invoiceId, payerId, amount: invoices.find((i) => i.id === invoiceId)!.total, method, transactionCode: code, status, paidAt });
const payments: Payment[] = [
  pay(1, 1, 10, "VNPAY", "VNP-88231", t("2026-09-27", "20:12")),
  pay(2, 2, 10, "MOMO", "MOMO-77120", t("2026-09-12", "19:45")),
  pay(3, 3, 11, "VNPAY", "VNP-87650", t("2026-08-29", "21:05")),
  pay(4, 4, 14, "VNPAY", "VNP-88010", t("2026-09-28", "18:03")),
  pay(5, 5, 12, "MOMO", "MOMO-77502", t("2026-09-29", "20:04")),
  pay(6, 6, 15, "VNPAY", "VNP-88302", t("2026-10-05", "08:02")),
  pay(7, 7, 13, "VNPAY", "VNP-87990", t("2026-09-17", "21:33")),
  pay(8, 9, 12, "VNPAY", "VNP-87001", t("2026-08-28", "09:10")),
  pay(9, 12, 11, "VNPAY", "VNP-85500", t("2026-06-28", "09:20")),
  pay(10, 13, 10, "VNPAY", "VNP-87120", t("2026-08-28", "09:15")),
  pay(11, 8, 17, "MOMO", "MOMO-78110", t("2026-10-04", "22:01"), "FAILED"),
];
const refunds: Refund[] = [
  { id: 1, subscriptionId: 13, paymentId: 9, amount: 6500000, reason: "Cụ qua đời ngày 05/09. Hoàn phần chưa dùng của gói quý (26 ngày).", status: "DONE", createdAt: t("2026-09-08", "10:00"), processedBy: 2 },
];
const credits: AccountCredit[] = [
  { id: 1, familyUserId: 15, elderlyId: 6, amount: 350000, reason: "Báo nghỉ ngày 14/10 trước 17h hôm trước (gói ngày)", createdAt: t("2026-10-09", "07:20") },
];

// ------------------------------------------------------------------ requests
const absences: AbsenceRequest[] = [
  { id: 1, elderlyId: 1, requestedBy: 10, fromDate: "2026-10-12", toDate: "2026-10-13", reason: "Việc gia đình", note: "Cả nhà về quê dự đám cưới.", createdAt: t("2026-10-08", "21:00"), creditAmount: 0, status: "PENDING" },
  { id: 2, elderlyId: 6, requestedBy: 15, fromDate: "2026-10-14", toDate: "2026-10-14", reason: "Việc gia đình", note: "Con đi công tác về sớm.", createdAt: t("2026-10-09", "07:20"), creditAmount: 350000, status: "APPROVED" },
  { id: 3, elderlyId: 7, requestedBy: 13, fromDate: "2026-10-05", toDate: "2026-10-05", reason: "Đi khám", note: "Tái khám thần kinh.", createdAt: t("2026-10-03", "18:00"), creditAmount: 0, status: "APPROVED" },
  { id: 4, elderlyId: 3, requestedBy: 11, fromDate: "2026-10-16", toDate: "2026-10-16", reason: "Đi khám", note: "Khám tim mạch định kỳ.", createdAt: t("2026-10-09", "08:40"), creditAmount: 0, status: "PENDING" },
];
const pauses: PauseRequest[] = [
  { id: 1, subscriptionId: 5, kind: "HOSPITAL", fromDate: "2026-10-03", toDate: "2026-10-20", document: "giay-nhap-vien-bv115.pdf", note: "Nhập viện theo dõi sau dấu hiệu tái phát ngày 02/10.", requestedBy: 12, createdAt: t("2026-10-03", "09:00"), status: "APPROVED", reviewedBy: 2 },
  { id: 2, subscriptionId: 13, kind: "DEATH", fromDate: "2026-09-05", document: "giay-chung-tu.pdf", note: "Gia đình báo cụ mất ngày 05/09.", requestedBy: 11, createdAt: t("2026-09-07", "09:00"), refundAmount: 6500000, status: "APPROVED", reviewedBy: 2 },
];

// ------------------------------------------------------------------ facilities
const rooms: Room[] = [
  { id: 1, name: "Sảnh đón trả", zone: "LOBBY", floor: "Tầng trệt", area: 40, capacity: 20, tiers: ["BASIC", "STANDARD", "PREMIUM"], status: "ACTIVE", description: "Quầy tiếp nhận, check-in bằng QR, ghế chờ đón.", tone: "blue" },
  { id: 2, name: "Phòng y tế", zone: "MEDICAL", floor: "Tầng trệt", area: 20, capacity: 3, tiers: ["BASIC", "STANDARD", "PREMIUM"], status: "ACTIVE", description: "Đo chỉ số, sơ cứu, 2 giường theo dõi.", tone: "green" },
  { id: 3, name: "Phòng sinh hoạt chung", zone: "COMMON", floor: "Tầng trệt", area: 90, capacity: 30, tiers: ["BASIC", "STANDARD", "PREMIUM"], status: "ACTIVE", description: "TV, nhạc xưa, bàn cờ, góc đọc báo.", tone: "orange" },
  { id: 4, name: "Phòng vật lý trị liệu", zone: "THERAPY", floor: "Tầng 1", area: 45, capacity: 6, tiers: ["STANDARD", "PREMIUM"], status: "ACTIVE", description: "Xe đạp tập, thanh song song, ròng rọc.", tone: "blue" },
  { id: 5, name: "Phòng ăn", zone: "DINING", floor: "Tầng trệt", area: 70, capacity: 30, tiers: ["BASIC", "STANDARD", "PREMIUM"], status: "ACTIVE", description: "Bữa sáng, trưa, xế.", tone: "orange" },
  { id: 6, name: "Phòng nghỉ chung N101", zone: "NAP", floor: "Tầng 1", area: 60, capacity: 10, tiers: ["BASIC"], status: "ACTIVE", description: "10 giường xếp theo ngày.", tone: "green" },
  { id: 7, name: "Phòng nghỉ N102", zone: "NAP", floor: "Tầng 1", area: 36, capacity: 6, tiers: ["STANDARD"], status: "ACTIVE", description: "Phòng 6 người.", tone: "green" },
  { id: 8, name: "Phòng nghỉ N103", zone: "NAP", floor: "Tầng 1", area: 36, capacity: 6, tiers: ["STANDARD"], status: "ACTIVE", description: "Phòng 6 người.", tone: "green" },
  { id: 9, name: "Phòng nghỉ P201", zone: "NAP", floor: "Tầng 2", area: 20, capacity: 2, tiers: ["PREMIUM"], status: "ACTIVE", description: "Phòng 2 người, giường cố định.", tone: "blue" },
  { id: 10, name: "Phòng nghỉ P202", zone: "NAP", floor: "Tầng 2", area: 20, capacity: 2, tiers: ["PREMIUM"], status: "CLOSED", closedReason: "Máy lạnh hỏng, chờ thay block (dự kiến 14/10)", description: "Phòng 2 người, giường cố định.", tone: "blue" },
  { id: 11, name: "Khu ghế massage", zone: "MASSAGE", floor: "Tầng 1", area: 25, capacity: 4, tiers: ["BASIC", "STANDARD", "PREMIUM"], status: "ACTIVE", description: "4 ghế massage, 3 máy massage chân, 4 bồn ngâm chân.", tone: "orange" },
  { id: 12, name: "Khu kiểm soát ra vào", zone: "SECURE", floor: "Tầng trệt", area: 40, capacity: 6, tiers: ["STANDARD", "PREMIUM"], status: "ACTIVE", description: "Cửa từ, dành cho nhóm sa sút trí tuệ.", tone: "green" },
  { id: 13, name: "Sân vườn", zone: "GARDEN", floor: "Tầng trệt", area: 120, capacity: 30, tiers: ["BASIC", "STANDARD", "PREMIUM"], status: "ACTIVE", description: "Lối đi bộ có tay vịn, khu tắm nắng.", tone: "green" },
];
const beds: NapBed[] = [];
let bid = 1;
for (let i = 1; i <= 10; i++) beds.push({ id: bid++, roomId: 6, code: `B${pad(i)}`, tier: "BASIC", status: i === 10 ? "BROKEN" : "ACTIVE" });
for (let i = 1; i <= 12; i++) beds.push({ id: bid++, roomId: i <= 6 ? 7 : 8, code: `S${pad(i)}`, tier: "STANDARD", status: "ACTIVE" });
beds.push({ id: bid++, roomId: 9, code: "P01", tier: "PREMIUM", status: "ACTIVE", fixedElderlyId: 2 });
beds.push({ id: bid++, roomId: 9, code: "P02", tier: "PREMIUM", status: "ACTIVE", fixedElderlyId: 5 });
beds.push({ id: bid++, roomId: 10, code: "P03", tier: "PREMIUM", status: "ACTIVE" });
beds.push({ id: bid++, roomId: 10, code: "P04", tier: "PREMIUM", status: "ACTIVE" });
const bedOf = (code: string) => beds.find((b) => b.code === code)!.id;
const bedAssignments: BedAssignment[] = [
  { date: DEMO_TODAY, bedId: bedOf("S01"), elderlyId: 1 },
  { date: DEMO_TODAY, bedId: bedOf("S02"), elderlyId: 3 },
  { date: DEMO_TODAY, bedId: bedOf("S07"), elderlyId: 7 },
  { date: DEMO_TODAY, bedId: bedOf("B01"), elderlyId: 4 },
  { date: DEMO_TODAY, bedId: bedOf("B02"), elderlyId: 6 },
];

const equipment: Equipment[] = [
  { id: 1, name: "Máy đo huyết áp điện tử", category: "MEDICAL", roomId: 2, total: 5, minStock: 4, broken: 0, repairing: 0, concurrent: 1, note: "Omron HEM-7156" },
  { id: 2, name: "Máy đo SpO₂", category: "MEDICAL", roomId: 2, total: 4, minStock: 3, broken: 0, repairing: 0, concurrent: 1, note: "" },
  { id: 3, name: "Máy đo đường huyết", category: "MEDICAL", roomId: 2, total: 3, minStock: 2, broken: 1, repairing: 0, concurrent: 1, note: "Que thử còn 2 hộp" },
  { id: 4, name: "Bình oxy di động", category: "MEDICAL", roomId: 2, total: 2, minStock: 2, broken: 0, repairing: 0, concurrent: 1, note: "Kiểm tra áp suất hằng tuần" },
  { id: 5, name: "Xe lăn", category: "SAFETY", roomId: 1, total: 6, minStock: 4, broken: 0, repairing: 0, concurrent: 1, note: "" },
  { id: 6, name: "Xe đạp tập", category: "THERAPY", roomId: 4, total: 3, minStock: 2, broken: 0, repairing: 1, concurrent: 1, note: "" },
  { id: 7, name: "Thanh song song tập đi", category: "THERAPY", roomId: 4, total: 1, minStock: 1, broken: 0, repairing: 0, concurrent: 1, note: "" },
  { id: 8, name: "Máy tập ròng rọc", category: "THERAPY", roomId: 4, total: 2, minStock: 1, broken: 0, repairing: 0, concurrent: 1, note: "" },
  { id: 9, name: "Ghế massage", category: "LIVING", roomId: 11, total: 4, minStock: 3, broken: 1, repairing: 1, concurrent: 1, note: "" },
  { id: 10, name: "Máy massage chân", category: "LIVING", roomId: 11, total: 3, minStock: 2, broken: 0, repairing: 0, concurrent: 1, note: "" },
  { id: 11, name: "Bồn ngâm chân", category: "LIVING", roomId: 11, total: 4, minStock: 2, broken: 0, repairing: 0, concurrent: 1, note: "Có nhiệt kế, tối đa 40°C" },
  { id: 12, name: "Bàn cờ (tướng, caro)", category: "LIVING", roomId: 3, total: 6, minStock: 4, broken: 0, repairing: 0, concurrent: 2, note: "" },
  { id: 13, name: "Tay vịn lối đi, thảm chống trượt", category: "SAFETY", roomId: 13, total: 10, minStock: 10, broken: 0, repairing: 0, concurrent: 1, note: "Bộ" },
];
const damageReports: DamageReport[] = [
  { id: 1, equipmentId: 9, quantity: 1, description: "Ghế số 2 không chạy chế độ lưng, kêu to ở mô-tơ.", reportedBy: 4, reportedAt: t("2026-10-03", "14:20"), status: "REPAIRING", handledBy: 2 },
  { id: 2, equipmentId: 6, quantity: 1, description: "Bàn đạp trái bị gãy chốt.", reportedBy: 3, reportedAt: t("2026-10-06", "09:10"), status: "REPAIRING", handledBy: 2 },
  { id: 3, roomId: 10, quantity: 1, description: "Máy lạnh phòng P202 chảy nước, không lạnh.", reportedBy: 7, reportedAt: t("2026-10-07", "12:30"), status: "REPAIRING", handledBy: 2 },
  { id: 4, equipmentId: 9, quantity: 1, description: "Ghế số 4 bị rách da tựa tay, có cạnh sắc.", reportedBy: 6, reportedAt: t("2026-10-08", "15:00"), status: "NEW" },
  { id: 5, equipmentId: 3, quantity: 1, description: "Máy báo lỗi E-3 khi đo.", reportedBy: 3, reportedAt: t("2026-10-09", "07:50"), status: "NEW" },
  { id: 6, equipmentId: 12, quantity: 1, description: "Thiếu 3 quân cờ tướng.", reportedBy: 4, reportedAt: t("2026-09-25", "15:30"), status: "FIXED", handledBy: 2 },
];
const inventoryChecks: InventoryCheck[] = [
  {
    id: 1, title: "Kiểm kê tháng 9/2026", createdAt: t("2026-09-30", "16:40"), createdBy: 2, status: "CLOSED", closedAt: t("2026-09-30", "17:30"),
    items: equipment.map((e) => ({ equipmentId: e.id, system: e.id === 12 ? 6 : e.total, counted: e.id === 12 ? 6 : e.id === 5 ? 5 : e.total, reason: e.id === 5 ? "1 xe lăn cho gia đình cụ Minh mượn về, đã nhắc trả" : undefined })),
  },
  { id: 2, title: "Kiểm kê tháng 10/2026", createdAt: t("2026-10-09", "08:00"), createdBy: 2, status: "DRAFT", items: equipment.map((e) => ({ equipmentId: e.id, system: e.total, counted: e.id <= 4 ? e.total : undefined })) },
];
const compensations: Compensation[] = [
  { id: 1, elderlyId: 2, date: "2026-10-07", reason: "Xe đạp tập hỏng, thiếu chỗ trong khung VLTL 08:45", form: "Bù 1 buổi VLTL vào tuần sau (13/10)", notified: true },
];

// ------------------------------------------------------------------ schedule, menus, therapy
const WEEK = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];
const NEXT = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"];
const ALL_T = ["BASIC", "STANDARD", "PREMIUM"] as const;
const schedules: ActivitySchedule[] = [];
let schid = 1;
for (const date of [...WEEK, ...NEXT]) {
  const odd = [1, 3, 5].includes(dow(date));
  const S = (startTime: string, endTime: string, title: string, roomId: number, serviceId?: number, staffId?: number, tiers: readonly ("BASIC" | "STANDARD" | "PREMIUM")[] = ALL_T) =>
    schedules.push({ id: schid++, date, startTime, endTime, title, roomId, serviceId, staffId, tiers: [...tiers] });
  S("07:00", "07:45", "Đón cụ, check-in · ăn sáng", 5, undefined, 4, ["STANDARD", "PREMIUM"]);
  S("07:45", "08:15", "Đo chỉ số sáng, nhắc thuốc, đo đường huyết", 2, 1, 3);
  S("08:15", "08:45", "Dưỡng sinh, thở, khởi động khớp", 13, 2, 6);
  S("08:45", "10:30", "Khung sáng: VLTL, ghế massage, máy massage chân, thể dục trên ghế theo lượt", 4, 11, 3);
  S("08:45", "10:30", odd ? "Đọc báo, kể chuyện nhóm" : "Cắm hoa đơn giản", 3, odd ? 18 : 19, 7);
  S("10:30", "11:00", "Đi bộ có người dìu ở sân vườn, uống nước", 13, 16, 6);
  S("11:00", "12:00", "Ăn trưa", 5, undefined, 4);
  S("12:00", "13:30", "Nghỉ trưa", 6, undefined, 7);
  S("13:30", "14:00", "Đo chỉ số chiều", 2, 1, 5, ["STANDARD", "PREMIUM"]);
  S("14:00", "15:00", "Khung chiều: ngâm chân, ghế massage, máy massage chân, VLTL theo lượt", 11, 14, 4);
  S("14:00", "15:00", "Âm nhạc, hát nhẹ · Cờ tướng, cờ caro", 3, 17, 7);
  S("15:00", "15:30", "Ăn xế", 5, undefined, 6);
  S("15:30", "16:30", "Thư giãn tự do, chốt care log, trả cụ", 3, 3, 4);
  S("16:30", "19:30", "Chờ gia đình đón (không hoạt động, không ăn uống)", 1, undefined, 7);
}
const MENU_B = ["Cháo thịt bằm, sữa đậu nành", "Phở gà", "Bún riêu", "Cháo cá lóc", "Bánh mì trứng, sữa", "Cháo gà, sữa đậu nành"];
const MENU_L = ["Cơm, cá kho, canh bí đỏ", "Cơm, gà luộc, canh rau ngót", "Cơm, đậu hũ sốt cà, canh cải", "Cơm, thịt kho trứng, canh bầu", "Cơm, cá hấp gừng, canh mướp", "Cơm, tôm rim (thay thịt rim cho cụ dị ứng), canh bí"];
const MENU_S = ["Chè đậu xanh ít đường", "Sữa chua không đường", "Trái cây (đu đủ)", "Bánh flan ít đường", "Khoai lang luộc", "Sữa chua không đường"];
const menus: Menu[] = [...WEEK, ...NEXT].map((date, i) => ({
  id: i + 1, date, breakfast: MENU_B[i % 6], lunch: MENU_L[i % 6], snack: MENU_S[i % 6],
  lowSugar: "Cơm gạo lứt nửa chén, không chè — thay bằng trái cây ít ngọt", lowSalt: "Canh và món mặn nêm nhạt, bỏ nước chấm", soft: "Cháo/cơm nát, thịt cá xay nhuyễn",
  status: i < 6 ? "APPROVED" : "AI_SUGGESTED",
}));
const therapySlots: TherapySlot[] = [
  { id: 1, date: DEMO_TODAY, startTime: "08:45", serviceId: 11, roomId: 4, capacity: 2, bookings: [{ elderlyId: 2, status: "DONE" }] },
  { id: 2, date: DEMO_TODAY, startTime: "09:15", serviceId: 11, roomId: 4, capacity: 2, bookings: [{ elderlyId: 1, status: "DONE" }] },
  { id: 3, date: DEMO_TODAY, startTime: "09:45", serviceId: 12, roomId: 11, capacity: 2, bookings: [{ elderlyId: 1, status: "DONE" }, { elderlyId: 2, status: "DONE" }] },
  { id: 4, date: DEMO_TODAY, startTime: "10:15", serviceId: 12, roomId: 11, capacity: 2, bookings: [{ elderlyId: 4, status: "PLANNED" }] },
  { id: 5, date: DEMO_TODAY, startTime: "10:15", serviceId: 15, roomId: 3, capacity: 10, bookings: [{ elderlyId: 3, status: "PLANNED" }, { elderlyId: 7, status: "PLANNED" }, { elderlyId: 6, status: "PLANNED" }] },
  { id: 6, date: DEMO_TODAY, startTime: "14:00", serviceId: 13, roomId: 11, capacity: 3, bookings: [{ elderlyId: 3, status: "PLANNED" }, { elderlyId: 7, status: "PLANNED" }, { elderlyId: 2, status: "PLANNED" }] },
  { id: 7, date: DEMO_TODAY, startTime: "14:30", serviceId: 11, roomId: 4, capacity: 2, bookings: [{ elderlyId: 2, status: "PLANNED" }] },
  { id: 8, date: DEMO_TODAY, startTime: "14:30", serviceId: 14, roomId: 11, capacity: 4, bookings: [] },
  { id: 9, date: "2026-10-07", startTime: "08:45", serviceId: 11, roomId: 4, capacity: 2, bookings: [{ elderlyId: 2, status: "MAKEUP" }, { elderlyId: 3, status: "DONE" }] },
];

// ------------------------------------------------------------------ attendance & care log
const ACTIVE_IDS = [1, 2, 3, 4, 6, 7];
const goesOn = (id: number, date: string) => {
  const d = dow(date);
  if (d === 0) return false;
  if (id === 4) return [1, 3, 5].includes(d);
  if (id === 6) return ["2026-10-07", "2026-10-09"].includes(date);
  return true;
};
const attendance: Attendance[] = [];
let aid = 1;
const PICK: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 6, 6: 8, 7: 10 };
const CG: Record<number, number> = { 1: 4, 2: 4, 3: 6, 4: 6, 6: 7, 7: 4 };
for (let i = 14; i >= 1; i--) {
  const date = addDays(DEMO_TODAY, -i);
  for (const id of ACTIVE_IDS) {
    if (!goesOn(id, date)) continue;
    if (id === 7 && date === "2026-10-05") { attendance.push({ id: aid++, elderlyId: id, date, status: "ABSENT" }); continue; }
    if (id === 2 && date < "2026-09-26") continue;
    attendance.push({ id: aid++, elderlyId: id, date, checkIn: `07:${pad(between(30, 59))}`, checkOut: `16:${pad(between(5, 45))}`, status: "LEFT", checkedInBy: CG[id], checkedOutBy: CG[id], pickupId: PICK[id] });
  }
}
attendance.push(
  { id: aid++, elderlyId: 1, date: DEMO_TODAY, checkIn: "07:35", status: "PRESENT", checkedInBy: 4 },
  { id: aid++, elderlyId: 2, date: DEMO_TODAY, checkIn: "07:50", status: "PRESENT", checkedInBy: 4 },
  { id: aid++, elderlyId: 3, date: DEMO_TODAY, checkIn: "07:42", status: "PRESENT", checkedInBy: 6 },
  { id: aid++, elderlyId: 4, date: DEMO_TODAY, status: "EXPECTED" },
  { id: aid++, elderlyId: 6, date: DEMO_TODAY, checkIn: "08:05", status: "PRESENT", checkedInBy: 7, manualReason: "Quên thẻ QR" },
  { id: aid++, elderlyId: 7, date: DEMO_TODAY, checkIn: "07:55", status: "PRESENT", checkedInBy: 4 },
);
// Late pickup on 24/09 for Đức
const late = attendance.find((a) => a.elderlyId === 4 && a.date === "2026-09-28");
if (late) late.checkOut = "19:52";

/** Daily task template (mục 4.2E + 5.11). */
function taskTemplate(e: ElderlyMember, s: Subscription, choices: number[]) {
  const T: Omit<DailyTask, "id" | "elderlyId" | "date" | "status">[] = [];
  const add = (time: string, type: DailyTask["type"], title: string, owner: DailyTask["owner"], serviceId?: number) => T.push({ time, type, title, owner, serviceId });
  if (s.tier !== "BASIC") add("07:30", "MEAL", "Ăn sáng", "CAREGIVER");
  if (e.conditions.some((c) => c.includes("Tiểu đường"))) add("07:45", "GLUCOSE", "Đo đường huyết trước ăn", "NURSE", 7);
  add("07:50", "VITALS", "Đo chỉ số sáng", "NURSE", 1);
  if ([1, 2, 3, 7].includes(e.id)) add("08:00", "MEDICATION", "Thuốc buổi sáng", "NURSE", 5);
  add("08:15", "ACTIVITY", "Dưỡng sinh, khởi động khớp", "CAREGIVER", 2);
  const slot = therapySlots.filter((x) => x.date === DEMO_TODAY && x.bookings.some((b) => b.elderlyId === e.id));
  for (const x of slot) add(x.startTime, "ACTIVITY", services.find((v) => v.id === x.serviceId)!.name, x.serviceId === 11 ? "NURSE" : "CAREGIVER", x.serviceId);
  if (e.id === 2) add("09:30", "MEDICATION", "Paracetamol khi đau khớp", "NURSE", 5);
  if (choices.includes(16)) add("10:30", "ACTIVITY", "Đi bộ có người dìu", "CAREGIVER", 16);
  add("11:00", "MEAL", "Ăn trưa", "CAREGIVER");
  if (e.id === 1) add("12:30", "MEDICATION", "Thuốc sau ăn trưa", "NURSE", 5);
  add("12:00", "NAP", "Nghỉ trưa", "CAREGIVER");
  add("13:00", "HYGIENE", "Vệ sinh sau nghỉ trưa", "CAREGIVER");
  if (s.tier !== "BASIC") add("13:30", "VITALS", "Đo chỉ số chiều", "NURSE", 1);
  if (choices.includes(17)) add("14:00", "ACTIVITY", "Âm nhạc, hát nhẹ", "CAREGIVER", 17);
  if (choices.includes(20)) add("14:30", "ACTIVITY", "Cờ tướng, cờ caro", "CAREGIVER", 20);
  add("15:00", "MEAL", "Ăn xế", "CAREGIVER");
  add("16:00", "CHECKOUT", "Trả cụ, xác nhận người đón, chốt care log", "CAREGIVER");
  return T.sort((a, b) => a.time.localeCompare(b.time));
}
const dailyTasks: DailyTask[] = [];
let tid = 1;
for (const id of [1, 2, 3, 6, 7]) {
  const e = elderly.find((x) => x.id === id)!;
  const s = subscriptions.find((x) => x.elderlyId === id && x.status === "ACTIVE")!;
  const ch = serviceChoices.filter((c) => c.subscriptionId === s.id).map((c) => c.serviceId);
  for (const tk of taskTemplate(e, s, ch)) {
    const past = tk.time < DEMO_NOW;
    let status: DailyTask["status"] = past ? "DONE" : "TODO";
    let skipReason: string | undefined;
    if (id === 3 && tk.type === "MEDICATION") { status = "SKIPPED"; skipReason = "Cụ từ chối, nói đã uống ở nhà — đã gọi gia đình xác nhận"; }
    if (id === 2 && tk.time === "09:30") status = "TODO";
    if (id === 6 && tk.type === "VITALS" && tk.time === "07:50") { status = "DONE"; }
    dailyTasks.push({ id: tid++, elderlyId: id, date: DEMO_TODAY, ...tk, status, skipReason, doneBy: status === "DONE" ? (tk.owner === "NURSE" ? (id === 6 ? 5 : 3) : CG[id]) : undefined, doneAt: status === "DONE" ? tk.time : undefined });
  }
}
// Đức (expected, not yet arrived) gets his tasks too; they drop if he is marked absent (CL-05)
{
  const e = elderly.find((x) => x.id === 4)!;
  const s = subscriptions.find((x) => x.id === 4)!;
  for (const tk of taskTemplate(e, s, [12, 13, 15, 16, 20])) dailyTasks.push({ id: tid++, elderlyId: 4, date: DEMO_TODAY, ...tk, status: "TODO" });
}

const careLogEntries: CareLogEntry[] = [];
let ceid = 1;
const E = (elderlyId: number, date: string, time: string, kind: CareLogEntry["kind"], title: string, detail: string, staffId: number, extra: Partial<CareLogEntry> = {}) =>
  careLogEntries.push({ id: ceid++, elderlyId, date, time, kind, title, detail, staffId, ...extra });
// today, up to 10:15
E(1, DEMO_TODAY, "07:35", "CHECKIN", "Đã đến trung tâm", "Check-in bằng QR · người đưa: Nguyễn Lan Anh", 4);
E(1, DEMO_TODAY, "07:40", "MEAL", "Ăn sáng", "Cháo cá lóc · ăn 3/4 · 1 cốc nước ấm", 4);
E(1, DEMO_TODAY, "07:45", "VITALS", "Đường huyết trước ăn", "9,4 mmol/L (cao hơn ngưỡng 8,0)", 3, { important: true });
E(1, DEMO_TODAY, "07:52", "VITALS", "Chỉ số sáng", "HA 138/86 · mạch 78 · 36,6°C · SpO₂ 97%", 3);
E(1, DEMO_TODAY, "08:05", "MEDICATION", "Đã uống thuốc sáng", "Metformin 500mg, Amlodipin 5mg", 3);
E(1, DEMO_TODAY, "08:20", "ACTIVITY", "Dưỡng sinh", "Tham gia tích cực · 25 phút", 4);
E(1, DEMO_TODAY, "09:15", "ACTIVITY", "Vật lý trị liệu bằng máy", "Xe đạp tập 20 phút, ròng rọc 10 phút · có tham gia", 3);
E(1, DEMO_TODAY, "09:20", "PHOTO", "Ảnh mới", "Bà tập xe đạp", 4, { tone: "blue" });
E(1, DEMO_TODAY, "09:45", "ACTIVITY", "Ghế massage", "Chế độ nhẹ lưng-vai 20 phút · bà thích", 4);
E(1, DEMO_TODAY, "10:00", "MOOD", "Tâm trạng", "Vui", 4);
E(1, DEMO_TODAY, "10:05", "PHOTO", "Ảnh mới", "Đọc báo cùng nhóm", 4, { tone: "orange" });
E(2, DEMO_TODAY, "07:50", "CHECKIN", "Đã đến trung tâm", "Check-in bằng QR · người đưa: Trần Minh Khoa", 4);
E(2, DEMO_TODAY, "07:55", "MEAL", "Ăn sáng", "Phở gà · ăn hết · 1 cốc sữa", 4);
E(2, DEMO_TODAY, "08:00", "VITALS", "Chỉ số sáng", "HA 126/80 · mạch 72 · 36,5°C · SpO₂ 98%", 3);
E(2, DEMO_TODAY, "08:05", "MEDICATION", "Đã uống thuốc sáng", "Glucosamine 1 viên", 3);
E(2, DEMO_TODAY, "08:45", "ACTIVITY", "Vật lý trị liệu bằng máy", "Thanh song song 15 phút, đi được 14m (tuần trước 12m)", 3);
E(2, DEMO_TODAY, "09:45", "ACTIVITY", "Ghế massage", "Chế độ lưng nhẹ 15 phút", 4);
E(2, DEMO_TODAY, "09:50", "PHOTO", "Ảnh mới", "Ông tập đi thanh song song", 4, { tone: "green" });
E(3, DEMO_TODAY, "07:42", "CHECKIN", "Đã đến trung tâm", "Check-in bằng QR · người đưa: Lê Văn Phúc", 6);
E(3, DEMO_TODAY, "07:48", "MEAL", "Ăn sáng", "Cháo cá lóc · ăn 1/2 · than đau đầu", 6);
E(3, DEMO_TODAY, "07:55", "VITALS", "Chỉ số sáng", "HA 160/95 · mạch 88 · 36,8°C — vượt ngưỡng", 3, { important: true });
E(3, DEMO_TODAY, "08:00", "MEDICATION", "Cụ từ chối thuốc", "Losartan 50mg · cụ nói đã uống ở nhà, gia đình xác nhận đã uống 6:30", 3);
E(3, DEMO_TODAY, "08:30", "VITALS", "Đo lại huyết áp", "HA 148/90 sau 30 phút nghỉ", 3);
E(3, DEMO_TODAY, "08:35", "NOTE", "Lưu ý", "Cho bà nghỉ ở phòng y tế, chưa tập dưỡng sinh. Hẹn đo lại 10:30.", 3, { important: true });
E(6, DEMO_TODAY, "08:05", "CHECKIN", "Đã đến trung tâm", "Check-in hộ (quên thẻ QR) · người đưa: Đỗ Thanh Tùng", 7);
E(6, DEMO_TODAY, "08:10", "VITALS", "Chỉ số sáng", "HA 124/78 · mạch 70 · 36,5°C", 5);
E(6, DEMO_TODAY, "08:20", "ACTIVITY", "Dưỡng sinh", "Có tham gia · 20 phút", 7);
E(7, DEMO_TODAY, "07:55", "CHECKIN", "Đã đến trung tâm", "Check-in bằng QR · người đưa: Hoàng Gia Bảo", 4);
E(7, DEMO_TODAY, "08:00", "MEAL", "Ăn sáng", "Bánh mì trứng, sữa · ăn hết", 4);
E(7, DEMO_TODAY, "08:05", "VITALS", "Chỉ số sáng", "HA 128/80 · mạch 76 · 36,6°C", 3);
E(7, DEMO_TODAY, "08:10", "MEDICATION", "Đã uống thuốc sáng", "Vitamin B tổng hợp", 3);
E(7, DEMO_TODAY, "08:50", "ACTIVITY", "Đọc báo, kể chuyện nhóm", "Tích cực · kể chuyện quê Nam Định", 4);
E(7, DEMO_TODAY, "09:30", "MOOD", "Tâm trạng", "Lo âu — hỏi giờ về 3 lần, đã trấn an bằng nhạc", 4, { important: true });
E(7, DEMO_TODAY, "09:35", "PHOTO", "Ảnh mới", "Bà nghe nhạc xưa", 4, { tone: "orange" });
// previous days (closed) — compact
const history = (id: number, date: string, staff: number, nurse: number) => {
  const a = attendance.find((x) => x.elderlyId === id && x.date === date);
  if (!a || a.status !== "LEFT") return;
  E(id, date, a.checkIn!, "CHECKIN", "Đã đến trung tâm", "Check-in bằng QR", staff);
  E(id, date, "07:50", "VITALS", "Chỉ số sáng", `HA ${between(120, 142)}/${between(76, 88)} · mạch ${between(68, 84)} · 36,${between(4, 8)}°C`, nurse);
  E(id, date, "08:20", "ACTIVITY", "Dưỡng sinh", "Có tham gia · 25 phút", staff);
  E(id, date, "11:30", "MEAL", "Ăn trưa", `Ăn ${["hết", "3/4", "hết", "1/2"][between(0, 3)]} · 2 cốc nước`, staff);
  E(id, date, "12:05", "NAP", "Nghỉ trưa", "12:05–13:20 · ngủ ngon", staff);
  E(id, date, "14:10", "ACTIVITY", "Âm nhạc, hát nhẹ", "Tích cực", staff);
  if (between(0, 2) === 0) E(id, date, "14:15", "PHOTO", "Ảnh mới", "Hoạt động buổi chiều", staff, { tone: (["blue", "orange", "green"] as const)[between(0, 2)] });
  E(id, date, "15:10", "MEAL", "Ăn xế", "Ăn hết", staff);
  E(id, date, "15:30", "MOOD", "Tâm trạng", id === 7 && between(0, 1) ? "Lo âu" : "Vui", staff);
  E(id, date, a.checkOut!, "CHECKOUT", "Đã về nhà", "Người đón đã xác nhận", staff);
};
for (let i = 1; i <= 6; i++) for (const id of [1, 2, 3, 7]) history(id, addDays(DEMO_TODAY, -i), CG[id], 3);
E(1, "2026-10-08", "13:40", "NOTE", "Lưu ý", "Bà than mỏi gối sau đi bộ, đã chườm ấm 10 phút.", 4, { important: true });
E(7, "2026-10-08", "10:20", "INCIDENT", "Sự cố hành vi", "Bà đi ra hành lang tìm cửa về nhà, hộ lý đưa về khu sinh hoạt sau 3 phút.", 4, { important: true });

const careLogDays: CareLogDay[] = [];
for (let i = 1; i <= 6; i++)
  for (const id of [1, 2, 3, 7]) {
    const date = addDays(DEMO_TODAY, -i);
    if (!attendance.some((a) => a.elderlyId === id && a.date === date && a.status === "LEFT")) continue;
    const byMgr = id === 3 && i === 2;
    careLogDays.push({ elderlyId: id, date, status: "CLOSED", closedBy: byMgr ? 2 : CG[id], closedAt: t(date, byMgr ? "20:00" : "16:40"), closedByManager: byMgr });
  }
careLogDays.push({ elderlyId: 6, date: "2026-10-07", status: "OPEN" });
for (const id of [1, 2, 3, 6, 7]) careLogDays.push({ elderlyId: id, date: DEMO_TODAY, status: "OPEN" });
const careLogEdits: CareLogEdit[] = [
  { id: 1, entryId: careLogEntries.find((x) => x.elderlyId === 3 && x.date === addDays(DEMO_TODAY, -2) && x.kind === "MEAL")?.id ?? 1, elderlyId: 3, date: addDays(DEMO_TODAY, -2), editedBy: 2, editedAt: t(addDays(DEMO_TODAY, -1), "08:30"), before: "Ăn hết · 2 cốc nước", after: "Ăn 1/2 · 2 cốc nước", reason: "Hộ lý ghi nhầm với cụ khác, đã đối chiếu sổ phòng ăn" },
];

// health metrics: 30 days morning, afternoon for Standard/Premium
const healthMetrics: HealthMetric[] = [];
let hmid = 1;
const BASE: Record<number, { s: number; d: number; g?: number; w: number }> = { 1: { s: 132, d: 82, g: 7.4, w: 58 }, 2: { s: 126, d: 80, w: 64 }, 3: { s: 142, d: 88, w: 52 }, 4: { s: 124, d: 78, w: 60 }, 5: { s: 146, d: 88, w: 48 }, 6: { s: 122, d: 78, w: 66 }, 7: { s: 128, d: 80, w: 50 } };
for (let i = 30; i >= 1; i--) {
  const date = addDays(DEMO_TODAY, -i);
  for (const id of [1, 2, 3, 4, 5, 7]) {
    if (!goesOn(id, date) || (id === 5 && date >= "2026-10-02") || (id === 2 && date < "2026-09-15")) continue;
    const b = BASE[id];
    const trend = id === 1 && i <= 4 ? (5 - i) * 0.5 : 0;
    healthMetrics.push({ id: hmid++, elderlyId: id, at: t(date, "07:50"), sys: b.s + between(-8, 10), dia: b.d + between(-5, 6), pulse: between(66, 86), temp: 36.4 + between(0, 4) / 10, spo2: between(95, 99), glucose: b.g ? Math.round((b.g + trend + between(-4, 6) / 10) * 10) / 10 : undefined, weight: dow(date) === 1 ? b.w + between(-1, 1) / 2 : undefined, strokeChecklistOk: id === 5 ? true : undefined, by: 3 });
    if (id !== 4) healthMetrics.push({ id: hmid++, elderlyId: id, at: t(date, "13:35"), sys: b.s + between(-10, 6), dia: b.d + between(-6, 4), pulse: between(64, 82), by: 5 });
  }
}
healthMetrics.push(
  { id: hmid++, elderlyId: 1, at: t(DEMO_TODAY, "07:45"), glucose: 9.4, by: 3 },
  { id: hmid++, elderlyId: 1, at: t(DEMO_TODAY, "07:52"), sys: 138, dia: 86, pulse: 78, temp: 36.6, spo2: 97, by: 3 },
  { id: hmid++, elderlyId: 2, at: t(DEMO_TODAY, "08:00"), sys: 126, dia: 80, pulse: 72, temp: 36.5, spo2: 98, by: 3 },
  { id: hmid++, elderlyId: 3, at: t(DEMO_TODAY, "07:55"), sys: 160, dia: 95, pulse: 88, temp: 36.8, spo2: 97, by: 3 },
  { id: hmid++, elderlyId: 3, at: t(DEMO_TODAY, "08:30"), sys: 148, dia: 90, pulse: 82, by: 3 },
  { id: hmid++, elderlyId: 6, at: t(DEMO_TODAY, "08:10"), sys: 124, dia: 78, pulse: 70, temp: 36.5, by: 5 },
  { id: hmid++, elderlyId: 7, at: t(DEMO_TODAY, "08:05"), sys: 128, dia: 80, pulse: 76, temp: 36.6, by: 3 },
);

const alerts: HealthAlert[] = [
  { id: 1, elderlyId: 3, at: t(DEMO_TODAY, "07:55"), source: "THRESHOLD", level: "WARNING", title: "Huyết áp vượt ngưỡng", detail: "160/95 mmHg (ngưỡng 150/90). Đo lại 08:30: 148/90.", status: "IN_PROGRESS", handledBy: 3 },
  { id: 2, elderlyId: 1, at: t(DEMO_TODAY, "07:46"), source: "AI", level: "WARNING", title: "Đường huyết tăng 4 ngày liền", detail: "Đường huyết trước ăn sáng: 7,6 → 8,1 → 8,7 → 9,4 mmol/L. Gợi ý: báo gia đình xem lại chế độ ăn tối và liều thuốc với bác sĩ.", status: "NEW" },
  { id: 3, elderlyId: 4, at: t(DEMO_TODAY, "08:30"), source: "RULE", level: "INFO", title: "8:30 chưa đến, chưa báo nghỉ", detail: "Cụ có lịch hôm nay (T6, gói T2-4-6). Hệ thống đã nhắn gia đình.", status: "NEW" },
  { id: 4, elderlyId: 2, at: t(DEMO_TODAY, "10:00"), source: "RULE", level: "WARNING", title: "Thuốc quá giờ 30 phút", detail: "Paracetamol 500mg lúc 09:30 chưa ghi nhận.", status: "NEW" },
  { id: 5, elderlyId: 7, at: t(DEMO_TODAY, "09:30"), source: "RULE", level: "INFO", title: "Tâm trạng lo âu", detail: "Hộ lý ghi tâm trạng Lo âu (nhóm sa sút trí tuệ).", status: "CLOSED", handledBy: 4, result: "Đã trấn an bằng nhạc xưa, bà bình tĩnh lại." },
  { id: 6, elderlyId: 5, at: t("2026-10-02", "14:05"), source: "RULE", level: "URGENT", title: "Dấu hiệu tái phát tai biến", detail: "Nói khó hơn, yếu tay phải tăng. Checklist tái phát: 2/4 dấu hiệu.", status: "CLOSED", handledBy: 5, result: "Chuyển viện BV Nhân dân 115 lúc 14:20, gia đình đã được báo." },
];
const incidents: Incident[] = [
  { id: 1, elderlyId: 5, at: t("2026-10-02", "14:05"), type: "HEALTH", severity: "HIGH", description: "Bà nói khó, méo miệng nhẹ, tay phải yếu hơn buổi sáng.", action: "Gọi cấp cứu 115, đo HA 178/100, theo dõi tư thế nằm nghiêng.", familyNotified: true, transfer: { hospital: "BV Nhân dân 115", time: "14:20", escort: "Nguyễn Thị Cúc (điều dưỡng)" }, reportedBy: 5, status: "RESOLVED" },
  { id: 2, elderlyId: 7, at: t("2026-10-08", "10:20"), type: "BEHAVIOR", severity: "LOW", description: "Bà đi ra hành lang tìm cửa về nhà.", action: "Hộ lý đưa về khu sinh hoạt, cho nghe nhạc. Đã báo gia đình.", familyNotified: true, reportedBy: 4, status: "OPEN" },
  { id: 3, elderlyId: 4, at: t("2026-09-28", "19:35"), type: "LATE_PICKUP", severity: "MEDIUM", description: "Quá 19:30 chưa có người đón. Đã gọi 2 người được phép đón.", action: "Hộ lý trực ở lại. Con gái đón lúc 19:52.", familyNotified: true, reportedBy: 7, status: "RESOLVED" },
  { id: 4, elderlyId: 6, at: t("2026-09-27", "10:40"), type: "FALL", severity: "LOW", description: "Trượt chân nhẹ ở hành lang ướt, không chấn thương.", action: "Kiểm tra, cho nghỉ 15 phút. Lót thêm thảm chống trượt.", familyNotified: true, reportedBy: 7, status: "RESOLVED" },
];

const medPlans: MedicationPlan[] = [
  { id: 1, elderlyId: 1, name: "Metformin 500mg", dose: "1 viên", times: ["08:00", "12:30"], startDate: "2026-09-01", note: "Uống sau ăn", active: true },
  { id: 2, elderlyId: 1, name: "Amlodipin 5mg", dose: "1 viên", times: ["08:00"], startDate: "2026-09-01", note: "", active: true },
  { id: 3, elderlyId: 2, name: "Glucosamine 1500mg", dose: "1 gói", times: ["08:00"], startDate: "2026-09-15", note: "Pha với nước ấm", active: true },
  { id: 4, elderlyId: 2, name: "Paracetamol 500mg", dose: "1 viên", times: ["09:30"], startDate: "2026-10-01", endDate: "2026-10-15", note: "Trước giờ tập VLTL", active: true },
  { id: 5, elderlyId: 3, name: "Losartan 50mg", dose: "1 viên", times: ["08:00"], startDate: "2026-09-01", note: "Gia đình gửi theo ngày", active: true },
  { id: 6, elderlyId: 7, name: "Vitamin B tổng hợp", dose: "1 viên", times: ["08:00"], startDate: "2026-09-20", note: "", active: true },
  { id: 7, elderlyId: 1, name: "Gliclazide 30mg", dose: "1 viên", times: ["08:00"], startDate: "2026-06-01", endDate: "2026-08-31", note: "Đã đổi sang Metformin", active: false },
];
const medDoses: MedicationDose[] = [
  { id: 1, planId: 1, elderlyId: 1, date: DEMO_TODAY, time: "08:00", status: "GIVEN", by: 3, at: "08:05" },
  { id: 2, planId: 2, elderlyId: 1, date: DEMO_TODAY, time: "08:00", status: "GIVEN", by: 3, at: "08:05" },
  { id: 3, planId: 1, elderlyId: 1, date: DEMO_TODAY, time: "12:30", status: "PENDING" },
  { id: 4, planId: 3, elderlyId: 2, date: DEMO_TODAY, time: "08:00", status: "GIVEN", by: 3, at: "08:05" },
  { id: 5, planId: 4, elderlyId: 2, date: DEMO_TODAY, time: "09:30", status: "PENDING" },
  { id: 6, planId: 5, elderlyId: 3, date: DEMO_TODAY, time: "08:00", status: "REFUSED", by: 3, at: "08:00", reason: "Cụ nói đã uống ở nhà; gia đình xác nhận đã uống 06:30" },
  { id: 7, planId: 6, elderlyId: 7, date: DEMO_TODAY, time: "08:00", status: "GIVEN", by: 3, at: "08:10" },
];
const belongings: Belonging[] = [
  { id: 1, elderlyId: 2, item: "Khung tập đi cá nhân (màu xám)", receivedAt: t("2026-09-15", "07:50"), receivedBy: 4, tone: "blue" },
  { id: 2, elderlyId: 1, item: "Áo khoác len xám", receivedAt: t(DEMO_TODAY, "07:35"), receivedBy: 4, tone: "orange" },
  { id: 3, elderlyId: 7, item: "Máy trợ thính 2 bên + hộp đựng", receivedAt: t(DEMO_TODAY, "07:55"), receivedBy: 4, tone: "green" },
  { id: 4, elderlyId: 1, item: "Hộp thuốc theo ngày (T2–T7)", receivedAt: t("2026-10-05", "07:40"), receivedBy: 3, returnedAt: t("2026-10-08", "16:20"), returnedBy: 4, tone: "blue" },
];

// ------------------------------------------------------------------ shifts
const SHIFT_DEF = [["Sáng", "07:00", "12:00", 1, 2], ["Chiều", "12:00", "16:30", 1, 2], ["Trực chờ đón", "16:30", "19:30", 0, 1]] as const;
const shifts: Shift[] = [];
const shiftAssignments: ShiftAssignment[] = [];
let shid = 1, said = 1;
const ROSTER_NOW: Record<string, number[]> = { "Sáng": [3, 4, 6], "Chiều": [5, 4, 7], "Trực chờ đón": [7] };
for (const date of WEEK)
  for (const [label, s, e, n, c] of SHIFT_DEF) {
    const id = shid++;
    shifts.push({ id, date, label, startTime: s, endTime: e, needNurse: n, needCaregiver: c, note: label === "Sáng" && date === DEMO_TODAY ? "Cụ Hoa huyết áp cao, theo dõi sát" : undefined });
    for (const staffId of ROSTER_NOW[label]) shiftAssignments.push({ id: said++, shiftId: id, staffId: label === "Trực chờ đón" && dow(date) % 2 ? 6 : staffId, source: "AI", status: "APPROVED" });
  }
const AI_PLAN: Record<string, number[][]> = {
  "Sáng": [[3, 4, 6], [3, 4, 7], [5, 4, 6], [3, 6, 7], [5, 4, 6], [3, 4, 7]],
  "Chiều": [[5, 7, 6], [5, 6, 4], [3, 7, 4], [5, 4, 7], [3, 7, 6], [5, 6, 4]],
  "Trực chờ đón": [[7], [6], [4], [6], [7], [4]],
};
NEXT.forEach((date, i) => {
  for (const [label, s, e, n, c] of SHIFT_DEF) {
    const id = shid++;
    shifts.push({ id, date, label, startTime: s, endTime: e, needNurse: n, needCaregiver: c });
    for (const staffId of AI_PLAN[label][i]) {
      const conflict = staffId === 6 && label === "Chiều" && i === 2;
      shiftAssignments.push({ id: said++, shiftId: id, staffId, source: "AI", status: "SUGGESTED", conflict, reason: conflict ? "Hải xin đổi ca chiều 14/10 (chờ duyệt)" : `${[3, 5].includes(staffId) ? "Điều dưỡng" : "Hộ lý"} có lịch rảnh, ${between(3, 5)} ca trong tuần` });
    }
  }
});
const availability: Availability[] = [];
for (const date of NEXT)
  for (const staffId of [3, 4, 5, 6, 7]) availability.push({ staffId, date, slots: staffId === 5 && date === "2026-10-16" ? ["Chiều"] : staffId === 7 ? ["Sáng", "Chiều", "Trực chờ đón"] : ["Sáng", "Chiều", ...(staffId === 4 || staffId === 6 ? (["Trực chờ đón"] as const) : [])] });
const leaveRequests: LeaveRequest[] = [
  { id: 1, staffId: 6, kind: "SWAP", shiftId: shifts.find((s) => s.date === "2026-10-14" && s.label === "Chiều")!.id, reason: "Đưa con đi khám", replacementId: 7, createdAt: t("2026-10-08", "17:00"), status: "PENDING" },
  { id: 2, staffId: 5, kind: "LEAVE", shiftId: shifts.find((s) => s.date === "2026-10-16" && s.label === "Sáng")!.id, reason: "Thi chứng chỉ điều dưỡng", createdAt: t("2026-10-07", "09:00"), status: "PENDING" },
  { id: 3, staffId: 4, kind: "LEAVE", shiftId: shifts.find((s) => s.date === "2026-10-06" && s.label === "Chiều")!.id, reason: "Việc gia đình", replacementId: 7, createdAt: t("2026-10-02", "09:00"), status: "APPROVED" },
];

// ------------------------------------------------------------------ communication
const messages: Message[] = [
  { id: 1, senderId: 10, receiverId: 4, elderlyId: 1, channel: "FAMILY_STAFF", text: "Chào anh Bảo, hôm nay bà ăn sáng được không ạ?", sentAt: t(DEMO_TODAY, "08:10"), isRead: true },
  { id: 2, senderId: 4, receiverId: 10, elderlyId: 1, channel: "FAMILY_STAFF", text: "Dạ bà ăn được 3/4 tô cháo, uống 1 cốc nước ấm ạ.", sentAt: t(DEMO_TODAY, "08:14"), isRead: true },
  { id: 3, senderId: 3, receiverId: 10, elderlyId: 1, channel: "FAMILY_STAFF", text: "Chị Lan Anh ơi, đường huyết sáng nay của bà 9,4, tăng 4 ngày liền. Tối qua bà có ăn thêm gì ngọt không chị?", sentAt: t(DEMO_TODAY, "08:20"), isRead: true },
  { id: 4, senderId: 10, receiverId: 3, elderlyId: 1, channel: "FAMILY_STAFF", text: "Dạ mấy hôm nay bà ăn chè buổi tối, để em nhắc lại ạ. Cảm ơn cô Hạnh.", sentAt: t(DEMO_TODAY, "08:31"), isRead: false },
  { id: 5, senderId: 11, receiverId: 3, elderlyId: 3, channel: "FAMILY_STAFF", text: "Cô Hạnh ơi, huyết áp của mẹ tôi giờ sao rồi ạ?", sentAt: t(DEMO_TODAY, "09:02"), isRead: true },
  { id: 6, senderId: 3, receiverId: 11, elderlyId: 3, channel: "FAMILY_STAFF", text: "Dạ đo lại lúc 8:30 còn 148/90, bà đang nghỉ ở phòng y tế. 10:30 em đo lại và báo anh ạ.", sentAt: t(DEMO_TODAY, "09:05"), isRead: true },
  { id: 7, senderId: 11, receiverId: 3, elderlyId: 3, channel: "FAMILY_STAFF", text: "Có cần tôi đón mẹ sớm không ạ?", sentAt: t(DEMO_TODAY, "10:02"), isRead: false },
  { id: 8, senderId: 13, receiverId: 4, elderlyId: 7, channel: "FAMILY_STAFF", text: "Anh Bảo ơi bà có hỏi về nhà nhiều không?", sentAt: t(DEMO_TODAY, "09:40"), isRead: false },
  { id: 9, senderId: 4, receiverId: 2, channel: "INTERNAL", text: "Chị Mai ơi, ghế massage số 4 rách da tựa tay, em đã báo hỏng trên app.", sentAt: t("2026-10-08", "15:05"), isRead: true },
  { id: 10, senderId: 6, receiverId: 2, channel: "INTERNAL", text: "Em xin đổi ca chiều 14/10 với Châu ạ, em đã gửi yêu cầu.", sentAt: t("2026-10-08", "17:02"), isRead: false },
  { id: 11, senderId: 18, receiverId: 2, channel: "CHATBOT_HANDOFF", text: "[Chatbot chuyển] Khách hỏi: Phòng Cao cấp khi nào có chỗ trống? Tôi đã đăng ký danh sách chờ từ 01/10.", sentAt: t("2026-10-08", "20:15"), isRead: false },
  { id: 12, senderId: 14, receiverId: 6, elderlyId: 4, channel: "FAMILY_STAFF", text: "Sáng nay ba tôi hơi mệt, khoảng 10h tôi đưa ba đến ạ.", sentAt: t(DEMO_TODAY, "08:45"), isRead: false },
  { id: 13, senderId: 15, receiverId: 7, elderlyId: 6, channel: "FAMILY_STAFF", text: "Anh Châu ơi ba tôi quên thẻ QR, nhờ anh check-in giúp.", sentAt: t(DEMO_TODAY, "08:03"), isRead: true },
];
const nf = (id: number, userId: number, type: Notification["type"], title: string, message: string, createdAt: string, isRead = false, link?: string): Notification => ({ id, userId, type, title, message, createdAt, isRead, link });
const notifications: Notification[] = [
  nf(1, 10, "ATTENDANCE", "Bà Lan đã đến trung tâm", "Check-in 07:35 · người đưa: Nguyễn Lan Anh", t(DEMO_TODAY, "07:35"), true),
  nf(2, 10, "HEALTH", "Cảnh báo: đường huyết bà Lan tăng 4 ngày liền", "9,4 mmol/L sáng nay. Điều dưỡng sẽ nhắn chị.", t(DEMO_TODAY, "07:46"), false, "/family/alerts"),
  nf(3, 10, "CARE_LOG", "Ông Minh tập VLTL xong", "Đi được 14m với thanh song song", t(DEMO_TODAY, "09:15"), false, "/family"),
  nf(4, 10, "CARE_LOG", "Có 2 ảnh mới của bà Lan", "Tập xe đạp, đọc báo cùng nhóm", t(DEMO_TODAY, "10:05"), false, "/family"),
  nf(5, 10, "PAYMENT", "Nhắc gia hạn gói của ông Minh", "Gói Cao cấp hết hạn 14/10. Hóa đơn HD-2610-0107 đã sẵn sàng.", t("2026-10-07", "08:00"), false, "/family/packages"),
  nf(6, 10, "SYSTEM", "Lịch đánh giá đầu vào cho bà Huệ", "Thứ 7, 10/10 lúc 09:00 tại phòng y tế", t("2026-10-08", "09:00"), true),
  nf(7, 10, "SYSTEM", "Danh sách chờ hạng Cao cấp", "Bà Lan đang ở vị trí 2. Khi có chỗ, chị có 24 giờ để thanh toán.", t("2026-10-05", "20:01"), true),
  nf(11, 2, "HEALTH", "Cảnh báo: huyết áp bà Hoa 160/95", "Điều dưỡng Hạnh đang xử lý", t(DEMO_TODAY, "07:55"), false, "/manager/alerts"),
  nf(12, 2, "SYSTEM", "Đánh giá đầu vào xong: ông Bùi Văn Tâm", "Điều dưỡng đề xuất nhóm Bệnh mãn tính, cần nâng lên Tiêu chuẩn", t("2026-10-08", "09:41"), false, "/manager/registrations"),
  nf(13, 2, "FACILITY", "Ghế massage dưới định mức", "Dùng được 2/4, định mức tối thiểu 3", t("2026-10-08", "15:01"), false, "/manager/facilities/equipment"),
  nf(14, 2, "SHIFT", "AI đã gợi ý lịch ca tuần 12–17/10", "Có 1 xung đột cần xem", t("2026-10-09", "06:00"), false, "/manager/shifts"),
  nf(15, 2, "SYSTEM", "Báo nghỉ mới", "Bà Lan nghỉ 12–13/10 · Bà Hoa nghỉ 16/10", t(DEMO_TODAY, "08:40"), false, "/manager/absences"),
  nf(16, 2, "MESSAGE", "Chatbot chuyển câu hỏi", "Trịnh Minh Khang hỏi về chỗ trống hạng Cao cấp", t("2026-10-08", "20:15"), false, "/manager/messages"),
  nf(17, 2, "ATTENDANCE", "Ông Đức chưa đến lúc 8:30", "Chưa báo nghỉ", t(DEMO_TODAY, "08:30"), true, "/manager"),
  nf(21, 3, "HEALTH", "Thuốc quá giờ: ông Minh", "Paracetamol 09:30 chưa ghi nhận", t(DEMO_TODAY, "10:00"), false, "/staff/meds"),
  nf(22, 3, "MESSAGE", "Tin nhắn từ Lê Văn Phúc", "Có cần tôi đón mẹ sớm không ạ?", t(DEMO_TODAY, "10:02"), false, "/staff/messages"),
  nf(23, 3, "SYSTEM", "Lịch đánh giá đầu vào", "Bà Lê Thị Huệ · 10/10 09:00", t("2026-10-08", "09:00"), true, "/staff/assessments"),
  nf(31, 4, "MESSAGE", "Tin nhắn từ Hoàng Gia Bảo", "Anh Bảo ơi bà có hỏi về nhà nhiều không?", t(DEMO_TODAY, "09:40"), false, "/staff/messages"),
  nf(32, 4, "CARE_LOG", "Nhắc chốt care log", "Hôm qua còn 0 cụ chưa chốt", t("2026-10-08", "18:00"), true),
  nf(41, 1, "SYSTEM", "Báo cáo tuần 28/09–04/10 đã gửi", "Quản lý Trần Thị Mai đã thêm nhận xét", t("2026-10-05", "17:00"), false, "/admin/reports"),
];
const auditLogs: AuditLog[] = [
  { id: 1, userId: 2, action: "Đăng nhập thành công", entityName: "users", entityId: 2, ipAddress: "113.22.x.x", createdAt: t(DEMO_TODAY, "07:05") },
  { id: 2, userId: 2, action: "Duyệt đối tượng REHAB + phụ phí 800.000đ cho bà Ngô Thị Sen", entityName: "subscriptions", entityId: 10, ipAddress: "113.22.x.x", createdAt: t("2026-10-03", "15:00") },
  { id: 3, userId: 2, action: "Sửa care log đã chốt của bà Lê Thị Hoa (07/10)", entityName: "care_log_edits", entityId: 1, ipAddress: "113.22.x.x", createdAt: t("2026-10-08", "08:30") },
  { id: 4, userId: 2, action: "Tạm đóng phòng P202", entityName: "rooms", entityId: 10, ipAddress: "113.22.x.x", createdAt: t("2026-10-07", "13:00") },
  { id: 5, userId: 2, action: "Mở lịch sử tin nhắn gia đình Lê Văn Phúc (khiếu nại)", entityName: "messages", ipAddress: "113.22.x.x", createdAt: t("2026-10-06", "10:00") },
  { id: 6, userId: null, action: "Callback VNPay thành công VNP-88302", entityName: "payments", entityId: 6, ipAddress: "VNPay", createdAt: t("2026-10-05", "08:02") },
  { id: 7, userId: null, action: "5 lần đăng nhập thất bại", entityName: "users", ipAddress: "45.9.x.x", createdAt: t("2026-10-04", "10:03") },
  { id: 8, userId: 1, action: "Cập nhật giới hạn token AI", entityName: "system_settings", ipAddress: "14.176.x.x", createdAt: t("2026-10-01", "09:30") },
  { id: 9, userId: 2, action: "Duyệt bảo lưu 03/10–20/10 cho bà Võ Thị Bích", entityName: "subscription_pauses", entityId: 1, ipAddress: "113.22.x.x", createdAt: t("2026-10-03", "10:00") },
];
const holidays: Holiday[] = [
  { id: 1, date: "2027-01-01", name: "Tết Dương lịch", announced: true },
  { id: 2, date: "2027-02-05", name: "Tết Nguyên đán (29 Tết)", announced: false },
  { id: 3, date: "2027-02-06", name: "Tết Nguyên đán (Mùng 1)", announced: false },
  { id: 4, date: "2027-02-08", name: "Tết Nguyên đán (Mùng 3)", announced: false },
  { id: 5, date: "2027-02-09", name: "Tết Nguyên đán (Mùng 4)", announced: false },
];
const announcements: Announcement[] = [
  { id: 1, title: "Tạm đóng phòng nghỉ P202", body: "Máy lạnh phòng P202 đang sửa, dự kiến mở lại 14/10. Cụ hạng Cao cấp vẫn nghỉ tại P201.", audience: "PREMIUM", sentAt: t("2026-10-07", "13:05"), sentBy: 2 },
  { id: 2, title: "Lịch nghỉ Tết Dương lịch 2027", body: "Trung tâm nghỉ ngày 01/01/2027. Gói tháng được cộng bù 1 ngày.", audience: "ALL", sentAt: t("2026-10-01", "09:00"), sentBy: 2 },
];
const reports: ManagerReport[] = [
  {
    id: 1, period: "MONTH", label: "Tháng 9/2026", from: "2026-09-01", to: "2026-09-30", generatedAt: t("2026-10-01", "06:00"), sentAt: t("2026-10-02", "16:00"),
    metrics: [{ label: "Doanh thu", value: "71,2 triệu" }, { label: "Số cụ đang đi", value: "7" }, { label: "Tỷ lệ lấp giường", value: "68%" }, { label: "Tỷ lệ có mặt", value: "93%" }, { label: "Sự cố", value: "2 (1 té ngã nhẹ, 1 đón trễ)" }, { label: "Thiết bị dưới định mức", value: "0" }],
    managerNote: "Tháng đầu đủ 3 hạng. Hạng Cao cấp kín chỗ, đề xuất sửa nhanh P202 và cân nhắc thêm 1 phòng 2 người.",
  },
  {
    id: 2, period: "WEEK", label: "Tuần 28/09–04/10", from: "2026-09-28", to: "2026-10-04", generatedAt: t("2026-10-05", "06:00"), sentAt: t("2026-10-05", "17:00"),
    metrics: [{ label: "Doanh thu", value: "31,8 triệu" }, { label: "Tỷ lệ có mặt", value: "91%" }, { label: "Sự cố", value: "1 chuyển viện (bà Bích)" }, { label: "Care log chốt đúng hạn", value: "96%" }, { label: "Báo hỏng mới", value: "1" }],
    managerNote: "Bà Bích chuyển viện do tái phát, đã bảo lưu tới 20/10. Ghế massage số 2 đang sửa.",
  },
  {
    id: 3, period: "WEEK", label: "Tuần 05/10–11/10", from: "2026-10-05", to: "2026-10-11", generatedAt: t(DEMO_TODAY, "06:00"),
    metrics: [{ label: "Doanh thu (tới 09/10)", value: "1,05 triệu" }, { label: "Tỷ lệ có mặt", value: "89%" }, { label: "Sự cố", value: "1 hành vi (bà Mai)" }, { label: "Thiết bị dưới định mức", value: "1 (ghế massage)" }, { label: "Phòng tạm đóng", value: "P202" }, { label: "Danh sách chờ", value: "2 (Cao cấp)" }],
    managerNote: "",
  },
];
const notificationPrefs: NotificationPref[] = [{ userId: 10, off: ["MEAL"] }];
const visits: VisitBooking[] = [
  { id: 1, fullName: "Chị Hồ Thanh Vy", phone: "0909 333 222", date: "2026-10-10", time: "09:30", note: "Cho mẹ 74 tuổi, tiểu đường", createdAt: t("2026-10-08", "21:10"), status: "NEW" },
  { id: 2, fullName: "Anh Đặng Quốc Việt", phone: "0912 000 777", date: "2026-10-12", time: "15:00", note: "Ba sau tai biến 1 năm", createdAt: t("2026-10-07", "10:00"), status: "CONFIRMED" },
];

const centerSettings: CenterSettings = {
  name: "An Tâm Care", address: "25 Nguyễn Thị Thập, P. Tân Phú, Q.7, TP.HCM", phone: "028 3777 1234", email: "lienhe@antamcare.vn",
  openDays: "Thứ 2 – Thứ 7", careStart: "07:00", careEnd: "16:30", closingTime: "19:30", pickupReminders: ["16:30", "17:00", "18:30"],
  absentAlertAt: "08:30", closeReminderAt: "18:00", managerCloseAt: "20:00", dayCancelCutoff: "17:00", renewalReminderDays: 7, maxPauseDays: 30,
  thresholds: { sysMax: 150, diaMax: 90, sysMin: 90, pulseMin: 50, pulseMax: 110, tempMax: 37.5, spo2Min: 94, glucoseMax: 8 },
  faqs: [
    { q: "Có xe đưa đón không?", a: "Trung tâm không có xe đưa đón. Gia đình đưa cụ đến từ 7h và đón trước 19h30." },
    { q: "Đón trễ sau 16h30 thì sao?", a: "16h30–19h30 cụ chờ ở sảnh có nhân viên trực, miễn phí, không có hoạt động và ăn uống." },
    { q: "Cụ nghỉ có được hoàn tiền không?", a: "Gói tháng, quý, năm không hoàn tiền khi nghỉ. Gói ngày báo trước 17h hôm trước thì giữ tiền thành số dư." },
    { q: "Có nhận cụ nằm liệt giường không?", a: "Không. Trung tâm không nhận cụ nằm liệt giường, sa sút trí tuệ nặng hoặc cần chăm sóc tích cực." },
    { q: "Thanh toán thế nào?", a: "Trả trước qua VNPay hoặc MoMo. Trung tâm không thu tiền mặt và không thu đặt cọc." },
  ],
  aiEnabled: true, vnpayConnected: true, momoConnected: true,
};
const groupSurcharges: GroupSurcharge[] = [
  { group: "MOBILE", monthly: 0 },
  { group: "CHRONIC", monthly: 600000 },
  { group: "REHAB", monthly: 1000000 },
  { group: "DEMENTIA", monthly: 800000 },
  { group: "STROKE", monthly: 1200000 },
];
const systemSettings: SystemSettings = { vnpayMode: "PRODUCTION", momoMode: "PRODUCTION", sessionTimeoutMinutes: 30, lockAfterFailedLogins: true, llmDailyTokenLimit: 50000, llmMaskPersonalData: true, emailEnabled: true, pushEnabled: true };

// ------------------------------------------------------------------ online registration with commitment (BR-79, BR-80)
elderly.push(
  em({ id: 14, fullName: "Trương Thị Nga", familyUserId: 16, dateOfBirth: "1950-06-21", gender: "Nữ", address: "88 Trần Hưng Đạo, Q.5", declaredGroup: "MOBILE", targetGroup: "MOBILE", hobbies: "Cắm hoa", careNote: "Đăng ký online, tự khai vận động được.", caregiverId: 6, nurseId: 3, tone: "green" }),
  em({ id: 15, fullName: "Lý Văn Bình", familyUserId: 17, dateOfBirth: "1946-09-14", gender: "Nam", address: "5 Lý Thường Kiệt, Q.10", declaredGroup: "MOBILE", targetGroup: "CHRONIC", conditions: ["Tự khai: không bệnh nền"], careNote: "Đăng ký online. Kiểm tra ngày đầu: HA 172/98, đang uống 2 loại thuốc huyết áp.", caregiverId: 6, nurseId: 3, tone: "orange" }),
);
pickups.push(
  { id: 16, elderlyId: 14, fullName: "Bùi Thị Ngọc", relationship: "Con gái", phone: "0938 222 111", idLast4: "5544", isPrimary: true },
  { id: 17, elderlyId: 15, fullName: "Ngô Văn Lực", relationship: "Con trai", phone: "0939 111 000", idLast4: "8899", isPrimary: true },
);
subscriptions.push(
  sub({ id: 24, elderlyId: 14, targetGroup: "MOBILE", tier: "BASIC", cycle: "MONTH", startDate: DEMO_TODAY, endDate: "2026-11-07", surchargeAmount: 0, commitmentAt: t("2026-10-08", "20:41"), familyConfirmedAt: t("2026-10-08", "20:41"), status: "ACTIVE", createdAt: t("2026-10-08", "20:40"), createdBy: 16 }),
  { ...sub({ id: 25, elderlyId: 15, targetGroup: "CHRONIC", tier: "STANDARD", cycle: "MONTH", startDate: "2026-10-08", endDate: "2026-11-06", surchargeAmount: 600000, surchargeNote: "Khai sai nhóm, kiểm tra ngày đầu: Bệnh mãn tính", commitmentAt: t("2026-10-06", "21:15"), familyConfirmedAt: t("2026-10-06", "21:15"), status: "ACTIVE", createdAt: t("2026-10-06", "21:14"), createdBy: 17, violation: "WRONG_GROUP", violationHandled: true }), basePrice: P("BASIC", "MONTH") },
);
serviceChoices.push(...choose(24, [15, 16, 17, 19, 20], DEMO_TODAY), ...choose(25, [12, 13, 15, 16, 20], "2026-10-08"));
invoices.push(
  inv(14, 24, "HD-2610-0115", "NEW", [["Gói tháng · Cơ bản (09/10–07/11)", P("BASIC", "MONTH")]], "2026-10-08", "PAID"),
  inv(15, 25, "HD-2610-0109", "NEW", [["Gói tháng · Cơ bản (08/10–06/11)", P("BASIC", "MONTH")]], "2026-10-06", "PAID"),
  inv(16, 25, "HD-2610-0116", "VIOLATION", [["Phụ phí nhóm Bệnh mãn tính (30/30 ngày còn lại)", 600000], ["Chênh lệch nâng hạng Cơ bản → Tiêu chuẩn (30 ngày)", P("STANDARD", "MONTH") - P("BASIC", "MONTH")]], "2026-10-08", "UNPAID"),
);
payments.push(pay(12, 14, 16, "MOMO", "MOMO-78400", t("2026-10-08", "20:43")), pay(13, 15, 17, "VNPAY", "VNP-88350", t("2026-10-06", "21:17")));
assessments.push(
  { id: 13, elderlyId: 14, subscriptionId: 24, kind: "FIRST_DAY", scheduledAt: t(DEMO_TODAY, "08:00"), nurseId: 3, status: "SCHEDULED" },
  { id: 14, elderlyId: 15, subscriptionId: 25, kind: "FIRST_DAY", scheduledAt: t("2026-10-08", "08:00"), nurseId: 3, barthel: 90, proposedGroup: "CHRONIC", baseline: "HA 172/98 (đo 2 lần) · 68kg", diagnosisDocs: "Hộp thuốc Amlodipin, Losartan mang theo", nurseNote: "Gia đình khai không bệnh nền nhưng cụ đang dùng 2 thuốc huyết áp, HA cao. Thuộc nhóm bệnh mãn tính.", doneAt: t("2026-10-08", "08:35"), status: "APPROVED", approvedBy: 3, approvedAt: t("2026-10-08", "08:35") },
);
attendance.push(
  { id: aid++, elderlyId: 15, date: "2026-10-08", checkIn: "07:40", checkOut: "16:20", status: "LEFT", checkedInBy: 6, checkedOutBy: 6, pickupId: 17 },
  { id: aid++, elderlyId: 14, date: DEMO_TODAY, checkIn: "07:45", status: "PRESENT", checkedInBy: 6 },
  { id: aid++, elderlyId: 15, date: DEMO_TODAY, checkIn: "07:50", status: "PRESENT", checkedInBy: 6 },
);
careLogDays.push({ elderlyId: 14, date: DEMO_TODAY, status: "OPEN" }, { elderlyId: 15, date: DEMO_TODAY, status: "OPEN" });
notifications.unshift(nf(18, 2, "SYSTEM", "Lê Thu Hạnh đã duyệt: Lý Văn Bình", "Khai Vận động được, thực tế Bệnh mãn tính · đã gửi hóa đơn phụ phí, hạn 3 ngày", t("2026-10-08", "08:36"), false, "/manager/registrations"));

export const seed = {
  users, staffProfiles, elderly, pickups, packages, entitlements, services, subscriptions, serviceChoices, addOns, servicePermissions,
  assessments, waitlist, invoices, payments, refunds, credits, absences, pauses, rooms, beds, bedAssignments, equipment, damageReports,
  inventoryChecks, compensations, schedules, menus, therapySlots, attendance, dailyTasks, careLogEntries, careLogDays, careLogEdits,
  healthMetrics, alerts, incidents, medPlans, medDoses, belongings, shifts, shiftAssignments, availability, leaveRequests, messages,
  notifications, auditLogs, holidays, announcements, reports, notificationPrefs, visits, centerSettings, systemSettings, groupSurcharges,
};
export type DB = typeof seed;
