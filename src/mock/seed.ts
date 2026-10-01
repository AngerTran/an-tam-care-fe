// Seed data for the mock API. Values match the Figma screens so the demo tells one story:
// Day-Care Hoa Sen (centre 1), manager Trần Thị Mai, nurse Lê Thu Hạnh, family Nguyễn Lan Anh.
// Demo password for every account: demo1234
import type {
  AbsenceRequest, ActivitySchedule, AiShiftSuggestion, Attendance, AuditLog, CareLog, CareLogService,
  Center, CenterSettings, ElderlyMember, Invoice, Menu, Message, Notification, PackageService, Payment,
  Photo, Refund, Registration, Service, ServicePackage, Shift, ShiftAssignment, SystemSettings, User,
} from "../types/models";

export const DEMO_TODAY = "2026-10-01";
const PW = "demo1234";

const centers: Center[] = [
  { id: 1, name: "Day-Care Hoa Sen", address: "25 Nguyễn Thị Thập, Q.7, TP.HCM", district: "Q.7", phone: "028 3777 1234", email: "hoasen@antamcare.vn", status: "ACTIVE", contractStart: "2026-01-01", contractEnd: "2026-12-31" },
  { id: 2, name: "Day-Care Bình An", address: "12 Võ Văn Tần, Q.3, TP.HCM", district: "Q.3", phone: "028 3999 8888", email: "binhan@antamcare.vn", status: "ACTIVE", contractStart: "2026-07-01", contractEnd: "2027-06-30" },
  { id: 3, name: "Day-Care Phúc Lộc", address: "8 Võ Văn Ngân, Thủ Đức, TP.HCM", district: "Thủ Đức", phone: "028 3722 6677", email: "phucloc@antamcare.vn", status: "ACTIVE", contractStart: "2025-11-15", contractEnd: "2026-11-15" },
  { id: 4, name: "Day-Care Sen Vàng", address: "40 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP.HCM", district: "Bình Thạnh", phone: "028 3511 2233", email: "senvang@antamcare.vn", status: "PENDING" },
  { id: 5, name: "Day-Care An Phú", address: "102 Ba Tháng Hai, Q.10, TP.HCM", district: "Q.10", phone: "028 3866 4455", email: "anphu@antamcare.vn", status: "SUSPENDED", contractStart: "2026-03-01", contractEnd: "2027-03-01" },
];

const users: User[] = [
  { id: 1, centerId: null, role: "ADMIN", fullName: "Admin hệ thống", email: "admin@antamcare.vn", phone: "028 3888 0000", password: PW, status: "ACTIVE", lastLoginAt: "2026-10-01T07:30:00" },
  { id: 2, centerId: 1, role: "MANAGER", fullName: "Trần Thị Mai", email: "mai.tran@hoasen.vn", phone: "0901 234 567", password: PW, status: "ACTIVE", lastLoginAt: "2026-10-01T08:12:00" },
  { id: 3, centerId: 1, role: "STAFF", fullName: "Lê Thu Hạnh", email: "hanh.le@hoasen.vn", phone: "0901 111 222", position: "Điều dưỡng", password: PW, status: "ACTIVE" },
  { id: 4, centerId: 1, role: "STAFF", fullName: "Phạm Quốc Bảo", email: "bao.pham@hoasen.vn", phone: "0902 222 333", position: "Hộ lý", password: PW, status: "ACTIVE" },
  { id: 5, centerId: 1, role: "STAFF", fullName: "Nguyễn Thị Cúc", email: "cuc.nguyen@hoasen.vn", phone: "0903 333 444", position: "Điều dưỡng", password: PW, status: "ACTIVE" },
  { id: 6, centerId: 1, role: "STAFF", fullName: "Trương Văn Hải", email: "hai.truong@hoasen.vn", phone: "0904 444 555", position: "Hộ lý", password: PW, status: "ACTIVE" },
  { id: 7, centerId: 1, role: "STAFF", fullName: "Đặng Minh Châu", email: "chau.dang@hoasen.vn", phone: "0905 555 666", position: "Hoạt động viên", password: PW, status: "ACTIVE" },
  { id: 8, centerId: 1, role: "STAFF", fullName: "Võ Thanh Tâm", email: "tam.vo@hoasen.vn", phone: "0906 666 777", position: "Hộ lý", password: PW, status: "INVITED" },
  { id: 10, centerId: null, role: "FAMILY", fullName: "Nguyễn Lan Anh", email: "lan.nguyen@gmail.com", phone: "0903 456 789", password: PW, status: "ACTIVE" },
  { id: 11, centerId: null, role: "FAMILY", fullName: "Lê Văn Phúc", email: "phuc.le@gmail.com", phone: "0912 345 678", password: PW, status: "ACTIVE" },
  { id: 12, centerId: null, role: "FAMILY", fullName: "Võ Minh Quân", email: "quan.vo@gmail.com", phone: "0913 222 333", password: PW, status: "ACTIVE" },
  { id: 13, centerId: null, role: "FAMILY", fullName: "Hoàng Gia Bảo", email: "bao.hoang@gmail.com", phone: "0914 333 444", password: PW, status: "ACTIVE" },
  { id: 14, centerId: null, role: "FAMILY", fullName: "Phạm Thị Thu", email: "thu.pham@gmail.com", phone: "0915 444 555", password: PW, status: "ACTIVE" },
  { id: 15, centerId: null, role: "FAMILY", fullName: "Đỗ Thanh Tùng", email: "tung.do@gmail.com", phone: "0916 555 666", password: PW, status: "ACTIVE" },
  { id: 16, centerId: null, role: "FAMILY", fullName: "Bùi Thị Ngọc", email: "ngoc.bui@gmail.com", phone: "0938 222 111", password: PW, status: "ACTIVE" },
  { id: 17, centerId: null, role: "FAMILY", fullName: "Ngô Văn Lực", email: "luc.ngo@gmail.com", phone: "0939 111 000", password: PW, status: "ACTIVE" },
  { id: 20, centerId: 2, role: "MANAGER", fullName: "Lê Văn Khoa", email: "khoa.le@binhan.vn", phone: "0907 000 111", password: PW, status: "ACTIVE", lastLoginAt: "2026-09-30T17:40:00" },
  { id: 21, centerId: 3, role: "MANAGER", fullName: "Phạm Thị Lệ", email: "le.pham@phucloc.vn", phone: "0907 000 222", password: PW, status: "ACTIVE", lastLoginAt: "2026-09-28T09:05:00" },
  { id: 22, centerId: 4, role: "MANAGER", fullName: "Hồ Minh Tuấn", email: "tuan.ho@senvang.vn", phone: "0907 000 333", password: PW, status: "INVITED" },
  { id: 23, centerId: 5, role: "MANAGER", fullName: "Vũ Quang Huy", email: "huy.vu@anphu.vn", phone: "0907 000 444", password: PW, status: "LOCKED", lastLoginAt: "2026-09-12T14:20:00" },
];

const em = (e: Partial<ElderlyMember> & Pick<ElderlyMember, "id" | "fullName" | "familyUserId" | "dateOfBirth" | "gender">): ElderlyMember => ({
  centerId: 1, address: "TP.HCM", emergencyContactName: "", emergencyContactPhone: "", emergencyContactRelationship: "", careNote: "", healthTags: [], status: "ACTIVE", ...e,
});
const elderly: ElderlyMember[] = [
  em({ id: 1, fullName: "Nguyễn Thị Lan", familyUserId: 10, dateOfBirth: "1947-03-12", gender: "Nữ", address: "45 Lê Văn Lương, Q.7", emergencyContactName: "Nguyễn Văn Hùng", emergencyContactPhone: "0903 456 789", emergencyContactRelationship: "Con trai", careNote: "Ăn ít đường, không hải sản. Đo huyết áp sáng và chiều. Hỗ trợ khi đi bộ đường dài (đau gối).", healthTags: ["Tiểu đường type 2", "Cao huyết áp", "Dị ứng hải sản"], assignedStaffId: 3 }),
  em({ id: 2, fullName: "Trần Văn Minh", familyUserId: 10, dateOfBirth: "1944-06-02", gender: "Nam", address: "45 Lê Văn Lương, Q.7", emergencyContactName: "Nguyễn Lan Anh", emergencyContactPhone: "0903 456 789", emergencyContactRelationship: "Con dâu", careNote: "Đi lại chậm, cần hỗ trợ lên xuống cầu thang.", healthTags: ["Thoái hoá khớp"], assignedStaffId: 3 }),
  em({ id: 3, fullName: "Lê Thị Hoa", familyUserId: 11, dateOfBirth: "1951-05-12", gender: "Nữ", address: "12 Lê Lợi, Q.1", emergencyContactName: "Lê Văn Phúc", emergencyContactPhone: "0912 345 678", emergencyContactRelationship: "Con trai", careNote: "Ăn ít đường, theo dõi huyết áp 2 lần/ngày.", healthTags: ["Tiểu đường", "Dị ứng hải sản", "Huyết áp cao"], assignedStaffId: 3 }),
  em({ id: 4, fullName: "Phạm Văn Đức", familyUserId: 14, dateOfBirth: "1946-01-20", gender: "Nam", address: "7 Hoàng Diệu, Q.4", emergencyContactName: "Phạm Thị Thu", emergencyContactPhone: "0915 444 555", emergencyContactRelationship: "Con gái", careNote: "Chỉ đến buổi sáng.", healthTags: [], assignedStaffId: 4 }),
  em({ id: 5, fullName: "Võ Thị Bích", familyUserId: 12, dateOfBirth: "1941-09-09", gender: "Nữ", address: "3 Nguyễn Hữu Thọ, Q.7", emergencyContactName: "Võ Minh Quân", emergencyContactPhone: "0913 222 333", emergencyContactRelationship: "Cháu trai", careNote: "Đang tạm nghỉ sau đợt ốm.", healthTags: ["Loãng xương"], assignedStaffId: 4, status: "PAUSED" }),
  em({ id: 6, fullName: "Đỗ Văn Hải", familyUserId: 15, dateOfBirth: "1949-11-30", gender: "Nam", address: "19 Phạm Hùng, Q.8", emergencyContactName: "Đỗ Thanh Tùng", emergencyContactPhone: "0916 555 666", emergencyContactRelationship: "Con trai", careNote: "Cẩn thận khi đi lại, từng trượt chân.", healthTags: [], assignedStaffId: 4 }),
  em({ id: 7, fullName: "Hoàng Thị Mai", familyUserId: 13, dateOfBirth: "1947-04-18", gender: "Nữ", address: "60 Huỳnh Tấn Phát, Q.7", emergencyContactName: "Hoàng Gia Bảo", emergencyContactPhone: "0914 333 444", emergencyContactRelationship: "Cháu trai", careNote: "Thích hoạt động âm nhạc.", healthTags: [], assignedStaffId: 3 }),
  em({ id: 8, fullName: "Lê Thị Huệ", familyUserId: 10, dateOfBirth: "1951-08-08", gender: "Nữ", centerId: null, address: "45 Lê Văn Lương, Q.7", careNote: "", status: "PENDING" }),
  em({ id: 10, fullName: "Bùi Văn Tâm", familyUserId: 16, dateOfBirth: "1945-02-08", gender: "Nam", address: "88 Trần Hưng Đạo, Q.5", emergencyContactName: "Bùi Thị Ngọc", emergencyContactPhone: "0938 222 111", emergencyContactRelationship: "Con gái", careNote: "Cao huyết áp, đi lại cần hỗ trợ, ăn mềm.", healthTags: ["Cao huyết áp"], status: "PENDING" }),
  em({ id: 11, fullName: "Ngô Thị Sen", familyUserId: 17, dateOfBirth: "1950-12-01", gender: "Nữ", address: "5 Lý Thường Kiệt, Q.10", emergencyContactName: "Ngô Văn Lực", emergencyContactPhone: "0939 111 000", emergencyContactRelationship: "Con trai", careNote: "", status: "PENDING" }),
];

const services: Service[] = ([
  [1, "Thể dục nhẹ", "ACTIVITY", "Vận động nhẹ buổi sáng ở sân vườn"], [2, "Vẽ tranh nhóm", "ACTIVITY", "Hoạt động sáng tạo theo nhóm"], [3, "Âm nhạc", "ACTIVITY", "Hát và nghe nhạc"], [4, "Trò chơi trí nhớ", "ACTIVITY", "Rèn luyện trí nhớ"],
  [5, "Làm vườn trị liệu", "ACTIVITY", "Chăm cây tại sân vườn"], [6, "Đọc báo", "ACTIVITY", "Đọc và thảo luận tin tức"], [7, "Karaoke", "ACTIVITY", "Giao lưu ca hát"], [8, "Yoga cho người cao tuổi", "ACTIVITY", "Chưa xếp vào gói"],
  [9, "Bữa sáng", "MEAL", "Cháo, sữa"], [10, "Bữa trưa", "MEAL", "Cơm, món mặn, canh, rau"], [11, "Bữa xế", "MEAL", "Chè, sữa chua ít đường"], [12, "Bữa tối", "MEAL", "Theo đăng ký"],
  [13, "Đo sinh hiệu hằng ngày", "SERVICE", "Huyết áp, nhiệt độ, đường huyết"], [14, "Vật lý trị liệu nhẹ", "SERVICE", "Bài tập phục hồi chức năng"], [15, "Tư vấn dinh dưỡng", "SERVICE", "Điều chỉnh thực đơn theo bệnh lý"],
  [16, "Hỗ trợ vệ sinh cá nhân", "SERVICE", "Hỗ trợ tắm, thay đồ"], [17, "Đưa đón tại nhà", "SERVICE", "Chưa triển khai"], [18, "Cờ tướng", "ACTIVITY", "Chơi cờ theo cặp, rèn trí nhớ"],
] as const).map(([id, name, type, description]) => ({ id, centerId: 1, name, type, description, status: id === 8 || id === 17 ? "INACTIVE" : "ACTIVE" }));

const packages: ServicePackage[] = [
  { id: 1, centerId: 1, name: "Cơ bản", billingPeriod: "MONTHLY", price: 3500000, description: "Chăm sóc ban ngày, bữa ăn và hoạt động nhóm.", status: "ACTIVE" },
  { id: 2, centerId: 1, name: "Chăm sóc nâng cao", billingPeriod: "MONTHLY", price: 5200000, description: "Chăm sóc ban ngày đầy đủ, có theo dõi sức khoẻ hằng ngày, vật lý trị liệu nhẹ và tư vấn dinh dưỡng.", status: "ACTIVE" },
  { id: 3, centerId: 1, name: "Linh hoạt theo ngày", billingPeriod: "DAILY", price: 250000, description: "Đăng ký theo ngày cần gửi.", status: "ACTIVE" },
  { id: 4, centerId: 2, name: "Tiêu chuẩn", billingPeriod: "MONTHLY", price: 3200000, description: "Chăm sóc ban ngày và bữa trưa.", status: "ACTIVE" },
  { id: 5, centerId: 2, name: "Cao cấp", billingPeriod: "MONTHLY", price: 4800000, description: "Thêm yoga, làm vườn và theo dõi sức khoẻ.", status: "ACTIVE" },
  { id: 6, centerId: 3, name: "Theo ngày", billingPeriod: "DAILY", price: 280000, description: "Gửi theo ngày.", status: "ACTIVE" },
  { id: 7, centerId: 3, name: "Theo tháng", billingPeriod: "MONTHLY", price: 3900000, description: "Chăm sóc trọn tháng.", status: "ACTIVE" },
];

const packageServices: PackageService[] = [
  ...[10, 11, 1, 3, 2, 4].map((serviceId) => ({ packageId: 1, serviceId })),
  ...[1, 2, 3, 4, 5, 6, 9, 10, 11, 13, 14, 15].map((serviceId) => ({ packageId: 2, serviceId })),
  ...[10, 11, 1, 3].map((serviceId) => ({ packageId: 3, serviceId })),
];

const registrations: Registration[] = [
  { id: 1, elderlyId: 1, packageId: 2, registeredBy: 10, startDate: "2026-10-01", endDate: "2026-10-31", status: "ACTIVE", registeredAt: "2026-09-25T09:00:00" },
  { id: 2, elderlyId: 1, packageId: 2, registeredBy: 10, startDate: "2026-09-01", endDate: "2026-09-30", status: "EXPIRED", registeredAt: "2026-08-25T09:00:00" },
  { id: 3, elderlyId: 2, packageId: 1, registeredBy: 10, startDate: "2026-08-15", endDate: "2026-11-15", status: "ACTIVE", registeredAt: "2026-08-10T09:00:00" },
  { id: 4, elderlyId: 3, packageId: 2, registeredBy: 11, startDate: "2026-10-01", endDate: "2026-10-31", status: "PENDING", registeredAt: "2026-10-01T09:30:00" },
  { id: 5, elderlyId: 4, packageId: 3, registeredBy: 14, startDate: "2026-09-01", endDate: "2026-12-31", status: "ACTIVE", registeredAt: "2026-08-28T09:00:00" },
  { id: 6, elderlyId: 5, packageId: 1, registeredBy: 12, startDate: "2026-09-20", endDate: "2026-10-20", status: "ACTIVE", registeredAt: "2026-09-18T09:00:00" },
  { id: 7, elderlyId: 6, packageId: 2, registeredBy: 15, startDate: "2026-09-01", endDate: "2026-11-30", status: "ACTIVE", registeredAt: "2026-08-29T09:00:00" },
  { id: 8, elderlyId: 7, packageId: 1, registeredBy: 13, startDate: "2026-09-12", endDate: "2026-10-12", status: "ACTIVE", registeredAt: "2026-09-10T09:00:00" },
  { id: 9, elderlyId: 10, packageId: 1, registeredBy: 16, startDate: "2026-10-15", endDate: "2026-11-14", status: "PENDING", registeredAt: "2026-10-01T10:10:00" },
  { id: 10, elderlyId: 11, packageId: 3, registeredBy: 17, startDate: "2026-10-05", endDate: "2026-10-05", status: "PENDING", registeredAt: "2026-10-01T10:58:00" },
  { id: 11, elderlyId: 1, packageId: 1, registeredBy: 10, startDate: "2026-02-01", endDate: "2026-07-31", status: "EXPIRED", registeredAt: "2026-01-25T09:00:00" },
];

const inv = (id: number, registrationId: number, number: string, subtotal: number, extra: number, issueDate: string, status: Invoice["status"]): Invoice =>
  ({ id, registrationId, number, subtotal, discount: 0, additionalCharge: extra, total: subtotal + extra, issueDate, dueDate: issueDate.slice(0, 8) + "05", status });
const invoices: Invoice[] = [
  inv(482, 1, "HD-2610-00482", 5200000, 300000, "2026-10-01", "PAID"),
  inv(391, 2, "HD-2609-00391", 5200000, 0, "2026-09-01", "PAID"),
  inv(277, 3, "HD-2608-00277", 10500000, 0, "2026-08-15", "PAID"),
  inv(511, 4, "HD-2610-00511", 5200000, 300000, "2026-10-01", "PAID"),
  inv(300, 5, "HD-2609-00300", 6000000, 0, "2026-09-01", "PAID"),
  inv(350, 6, "HD-2609-00350", 3500000, 0, "2026-09-20", "PAID"),
  inv(310, 7, "HD-2609-00310", 15600000, 0, "2026-09-01", "PAID"),
  inv(360, 8, "HD-2609-00360", 3500000, 0, "2026-09-12", "PAID"),
  inv(520, 9, "HD-2610-00520", 3500000, 300000, "2026-10-01", "PAID"),
  inv(521, 10, "HD-2610-00521", 250000, 0, "2026-10-01", "UNPAID"),
];

const pay = (id: number, invoiceId: number, payerId: number, amount: number, method: Payment["method"], code: string, paidAt: string): Payment =>
  ({ id, invoiceId, payerId, amount, method, transactionCode: code, status: "SUCCESS", paidAt });
const payments: Payment[] = [
  pay(1, 482, 10, 5500000, "VNPAY", "VNP-88231", "2026-10-01T09:44:00"),
  pay(2, 391, 10, 5200000, "MOMO", "MOMO-77120", "2026-09-01T10:02:00"),
  pay(3, 277, 10, 10500000, "VNPAY", "VNP-87650", "2026-08-15T08:30:00"),
  pay(4, 511, 11, 5500000, "VNPAY", "VNP-88302", "2026-10-01T09:50:00"),
  pay(5, 300, 14, 6000000, "VNPAY", "VNP-86001", "2026-09-01T07:55:00"),
  pay(6, 350, 12, 3500000, "MOMO", "MOMO-77500", "2026-09-20T11:00:00"),
  pay(7, 310, 15, 15600000, "VNPAY", "VNP-86110", "2026-09-01T12:15:00"),
  pay(8, 360, 13, 3500000, "VNPAY", "VNP-87001", "2026-09-12T09:10:00"),
  pay(9, 520, 16, 3800000, "VNPAY", "VNP-88410", "2026-10-01T10:12:00"),
];

const refunds: Refund[] = [
  { id: 31, paymentId: 2, requestedBy: 10, amount: 250000, reason: "Bà nghỉ ốm 2 ngày (05–06/10).", status: "REQUESTED", createdAt: "2026-10-01T09:15:00" },
  { id: 29, paymentId: 6, requestedBy: 12, processedBy: 2, amount: 1200000, reason: "Tạm nghỉ 1 tháng sau đợt ốm.", status: "APPROVED", createdAt: "2026-09-25T10:00:00", refundedAt: "2026-09-26T10:00:00" },
  { id: 27, paymentId: 8, requestedBy: 13, processedBy: 2, amount: 250000, reason: "Nghỉ ngày lễ.", status: "REJECTED", createdAt: "2026-09-15T10:00:00" },
];

const WEEK = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-08"];
const AM = [2, 3, 2, 5, 3, 2, 2], PM = [4, 7, 4, 6, 7, 18, 4];
const schedules: ActivitySchedule[] = [];
let sid = 1;
WEEK.forEach((date, i) => {
  schedules.push({ id: sid++, centerId: 1, serviceId: 1, date, startTime: "08:30", endTime: "09:15", location: "Sân vườn", staffId: 3 });
  schedules.push({ id: sid++, centerId: 1, serviceId: AM[i], date, startTime: "10:00", endTime: "11:00", location: "Phòng sinh hoạt", staffId: 7 });
  schedules.push({ id: sid++, centerId: 1, serviceId: PM[i], date, startTime: "14:00", endTime: "15:00", location: "Phòng sinh hoạt", staffId: 7 });
});

const menus: Menu[] = WEEK.map((date, i) => ({
  id: i + 1, centerId: 1, date,
  breakfast: ["Cháo thịt bằm, sữa đậu nành", "Phở gà", "Cháo thịt bằm, sữa đậu nành", "Cháo thịt bằm, sữa đậu nành", "Bún riêu", "Bánh mì trứng, sữa", "Cháo gà, sữa đậu nành"][i],
  lunch: ["Cơm, cá kho, canh bí", "Cơm, gà luộc, canh rau ngót", "Cơm, cá kho, canh bí đỏ, rau luộc", "Cơm, cá kho, canh bí đỏ (ít muối)", "Cơm, đậu hũ sốt cà, canh cải", "Cơm, thịt kho, canh bí", "Cơm, thịt kho trứng, canh rau ngót"][i],
  snack: ["Chè đậu xanh ít đường", "Sữa chua ít đường", "Chè đậu xanh ít đường", "Chè đậu xanh ít đường", "Trái cây", "Bánh flan", "Sữa chua ít đường"][i],
  dinner: "", note: i === 3 ? "Bà Lan: ít đường, không hải sản" : undefined,
}));

const attendance: Attendance[] = [
  { id: 1, elderlyId: 1, date: DEMO_TODAY, checkIn: "07:52", status: "PRESENT", checkedInBy: 3 },
  { id: 2, elderlyId: 2, date: DEMO_TODAY, checkIn: "08:05", status: "PRESENT", checkedInBy: 3 },
  { id: 3, elderlyId: 3, date: DEMO_TODAY, checkIn: "07:40", checkOut: "15:10", status: "LEFT", checkedInBy: 3, checkedOutBy: 3 },
  { id: 4, elderlyId: 4, date: DEMO_TODAY, status: "EXPECTED" },
  { id: 5, elderlyId: 5, date: DEMO_TODAY, status: "ABSENT" },
  { id: 6, elderlyId: 6, date: DEMO_TODAY, checkIn: "08:20", status: "PRESENT", checkedInBy: 4 },
  { id: 7, elderlyId: 7, date: DEMO_TODAY, checkIn: "07:58", status: "PRESENT", checkedInBy: 3 },
];
let aid = 8;
for (const [date, st] of [["2026-09-30", "LEFT"], ["2026-09-29", "LEFT"], ["2026-09-28", "LEFT"], ["2026-09-27", "ABSENT"], ["2026-09-26", "LEFT"], ["2026-09-25", "ABSENT"]] as const)
  for (const elderlyId of [1, 2, 3, 6, 7]) attendance.push({ id: aid++, elderlyId, date, checkIn: st === "LEFT" ? "07:55" : undefined, checkOut: st === "LEFT" ? "16:30" : undefined, status: st });

const careLogs: CareLog[] = [
  { id: 1, elderlyId: 1, staffId: 3, date: DEMO_TODAY, generalCondition: "GOOD", bloodPressure: "125/80", temperature: "36,7°C", lunch: "3/4 suất", note: "Bà vui vẻ, uống đủ nước, có than đau gối nhẹ lúc đi bộ.", issueStatus: "NONE" },
  { id: 2, elderlyId: 3, staffId: 3, date: DEMO_TODAY, generalCondition: "TIRED", bloodPressure: "160/95", temperature: "36,9°C", lunch: "1/2 suất", note: "Bà than chóng mặt, đo huyết áp 160/95, đã cho nghỉ ngơi.", issueNote: "Huyết áp 160/95", issueSeverity: "HIGH", issueStatus: "NEW" },
  { id: 3, elderlyId: 2, staffId: 4, date: DEMO_TODAY, generalCondition: "NORMAL", bloodPressure: "130/85", lunch: "1/2 suất", note: "Ông ăn ít bữa trưa, kêu no.", issueNote: "Ăn ít bữa trưa", issueSeverity: "LOW", issueStatus: "NEW" },
  { id: 4, elderlyId: 1, staffId: 3, date: "2026-09-30", generalCondition: "GOOD", bloodPressure: "122/80", lunch: "Hết suất", note: "Ăn tốt, tham gia 3 hoạt động.", issueStatus: "NONE" },
  { id: 5, elderlyId: 1, staffId: 3, date: "2026-09-29", generalCondition: "TIRED", bloodPressure: "128/82", lunch: "1/2 suất", note: "Mệt nhẹ, ăn ít.", issueNote: "Mệt nhẹ, đau gối", issueSeverity: "LOW", issueStatus: "IN_PROGRESS", managerNote: "Đã báo gia đình, theo dõi thêm." },
  { id: 6, elderlyId: 1, staffId: 3, date: "2026-09-28", generalCondition: "GOOD", bloodPressure: "120/78", lunch: "Hết suất", note: "Ăn hết, 2 hoạt động.", issueStatus: "NONE" },
  { id: 7, elderlyId: 6, staffId: 4, date: "2026-09-27", generalCondition: "NORMAL", note: "Trượt chân nhẹ ở hành lang, không chấn thương.", issueNote: "Trượt chân nhẹ", issueSeverity: "HIGH", issueStatus: "RESOLVED", managerNote: "Đã lót thảm chống trượt." },
  { id: 8, elderlyId: 3, staffId: 4, date: "2026-09-30", generalCondition: "GOOD", bloodPressure: "135/85", lunch: "Hết suất", note: "Bình thường.", issueStatus: "NONE" },
  { id: 9, elderlyId: 3, staffId: 3, date: "2026-09-29", generalCondition: "GOOD", bloodPressure: "130/82", lunch: "3/4 suất", note: "Bình thường.", issueStatus: "NONE" },
];
const careLogServices: CareLogService[] = [
  { careLogId: 1, serviceId: 1, status: "DONE" }, { careLogId: 1, serviceId: 2, status: "DONE" }, { careLogId: 1, serviceId: 13, status: "DONE" }, { careLogId: 1, serviceId: 4, status: "SKIPPED" },
  { careLogId: 2, serviceId: 1, status: "DONE" }, { careLogId: 2, serviceId: 13, status: "DONE" },
];
const photos: Photo[] = [
  { id: 1, careLogId: 1, caption: "Vẽ tranh nhóm", tone: "blue" }, { id: 2, careLogId: 1, caption: "Thể dục nhẹ", tone: "orange" }, { id: 3, careLogId: 1, caption: "Bữa trưa", tone: "green" },
  { id: 4, careLogId: 2, caption: "Nghỉ ngơi", tone: "blue" }, { id: 5, careLogId: 2, caption: "Đo huyết áp", tone: "orange" },
];

// Week 05/10 – 10/10: shifts + AI suggestions (matches the Figma roster)
const NEXT = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"];
const shifts: Shift[] = [];
let shid = 1;
const shiftId: Record<string, number> = {};
NEXT.forEach((date, i) => {
  for (const [label, s, e, req] of [["Sáng", "07:00", "12:00", i === 5 ? 2 : 3], ["Chiều", "12:00", "17:00", [2, 2, 3, 2, 2, 1][i]], ["Cả ngày", "07:00", "17:00", i === 5 ? 0 : 1]] as const) {
    shiftId[`${date}|${label}`] = shid;
    shifts.push({ id: shid++, centerId: 1, date, label, startTime: s, endTime: e, requiredStaff: req });
  }
});
const ROSTER: Record<number, (string | null)[]> = {
  3: ["Sáng", "Sáng", "Cả ngày", "Sáng", "Sáng", null], 4: ["Chiều", "Chiều", "Chiều", "Cả ngày", "Chiều", "Sáng"], 5: [null, "Sáng", "Sáng", "Chiều", "Sáng", "Chiều"],
  6: ["Sáng", null, "Chiều", null, "Chiều", "Sáng"], 7: ["Chiều", "Sáng", null, "Sáng", "Sáng", null],
};
const REASON: Record<number, string> = { 3: "Rảnh ca này, phụ trách 8 người dự kiến có mặt", 4: "Hộ lý, đủ giờ trong tuần", 5: "Điều dưỡng, còn ca trống trong tuần", 6: "Có lịch rảnh, chưa vượt 5 ca", 7: "Hoạt động viên, hỗ trợ hoạt động nhóm" };
const aiSuggestions: AiShiftSuggestion[] = [];
let sgid = 1;
for (const [staff, days] of Object.entries(ROSTER)) days.forEach((label, i) => {
  if (!label) return;
  const staffId = Number(staff);
  const conflict = staffId === 7 && i === 4;
  aiSuggestions.push({ id: sgid++, shiftId: shiftId[`${NEXT[i]}|${label}`], staffId, reason: conflict ? "Trùng lịch hoạt động vẽ tranh 10:00" : REASON[staffId], conflict, status: staffId === 3 && i === 4 ? "APPROVED" : "PENDING" });
});

// Current week (29/09 – 04/10) approved assignments for the staff "my shifts" view
const curWeek = ["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03"];
const shiftAssignments: ShiftAssignment[] = [];
curWeek.forEach((date, i) => {
  for (const [label, s, e] of [["Sáng", "07:00", "12:00"], ["Chiều", "12:00", "17:00"]] as const) {
    const id = shid++;
    shifts.push({ id, centerId: 1, date, label, startTime: s, endTime: e, requiredStaff: label === "Sáng" ? 3 : 2 });
    if (label === "Sáng" && i < 5) shiftAssignments.push({ id: shiftAssignments.length + 1, shiftId: id, staffId: 3, assignedBy: 2 });
    if (label === "Chiều") shiftAssignments.push({ id: shiftAssignments.length + 1, shiftId: id, staffId: 4, assignedBy: 2 });
  }
});

const t = (d: string, h: string) => `${d}T${h}:00`;
const messages: Message[] = [
  { id: 1, senderId: 10, receiverId: 3, elderlyId: 1, channel: "FAMILY_CENTER", text: "Chào cô Hạnh, hôm nay bà ăn sáng đủ không ạ?", sentAt: t(DEMO_TODAY, "08:10"), isRead: true },
  { id: 2, senderId: 3, receiverId: 10, elderlyId: 1, channel: "FAMILY_CENTER", text: "Dạ bà ăn hết suất cháo, huyết áp sáng 125/80 ạ.", sentAt: t(DEMO_TODAY, "08:25"), isRead: true },
  { id: 3, senderId: 10, receiverId: 3, elderlyId: 1, channel: "FAMILY_CENTER", text: "Bà có ngủ trưa được không cô?", sentAt: t(DEMO_TODAY, "12:58"), isRead: false },
  { id: 4, senderId: 11, receiverId: 2, elderlyId: 3, channel: "FAMILY_CENTER", text: "Chào chị Mai, nghe nói bà Hoa bị huyết áp cao phải không ạ?", sentAt: t(DEMO_TODAY, "10:30"), isRead: true },
  { id: 5, senderId: 2, receiverId: 11, elderlyId: 3, channel: "FAMILY_CENTER", text: "Dạ đúng anh, 160/95 lúc 10:00. Điều dưỡng đã cho bà nghỉ, đo lại còn 140/85.", sentAt: t(DEMO_TODAY, "10:38"), isRead: true },
  { id: 6, senderId: 11, receiverId: 2, elderlyId: 3, channel: "FAMILY_CENTER", text: "Tôi có cần đón bà sớm không ạ?", sentAt: t(DEMO_TODAY, "10:42"), isRead: false },
  { id: 7, senderId: 3, receiverId: 2, channel: "INTERNAL", text: "Bà Hoa đo lại 140/85 rồi chị", sentAt: t(DEMO_TODAY, "10:35"), isRead: false },
  { id: 8, senderId: 4, receiverId: 2, channel: "INTERNAL", text: "Em xin đổi ca chiều T6 ạ", sentAt: t("2026-09-30", "16:00"), isRead: true },
  { id: 9, senderId: 2, receiverId: 1, channel: "CENTER_ADMIN", text: "Chào Admin, trung tâm muốn đổi tài khoản nhận tiền VNPay sang tài khoản mới.", sentAt: t(DEMO_TODAY, "10:50"), isRead: true },
  { id: 10, senderId: 1, receiverId: 2, channel: "CENTER_ADMIN", text: "Chào chị Mai, chị gửi giúp giấy xác nhận tài khoản ngân hàng của trung tâm nhé.", sentAt: t(DEMO_TODAY, "11:02"), isRead: true },
  { id: 11, senderId: 2, receiverId: 1, channel: "CENTER_ADMIN", text: "Đã gửi file xác nhận tài khoản ạ. (xac-nhan-tai-khoan.pdf)", sentAt: t(DEMO_TODAY, "11:20"), isRead: false },
  { id: 12, senderId: 20, receiverId: 1, channel: "CENTER_ADMIN", text: "Báo cáo tháng 9 đã gửi", sentAt: t(DEMO_TODAY, "09:02"), isRead: true },
  { id: 13, senderId: 21, receiverId: 1, channel: "CENTER_ADMIN", text: "Xin gia hạn hợp đồng thêm 1 năm", sentAt: t("2026-09-30", "15:00"), isRead: false },
  { id: 14, senderId: 22, receiverId: 1, channel: "CENTER_ADMIN", text: "Khi nào trung tâm được duyệt ạ?", sentAt: t("2026-09-30", "10:00"), isRead: true },
  { id: 15, senderId: 12, receiverId: 4, elderlyId: 5, channel: "FAMILY_CENTER", text: "Mai bà đi lại bình thường ạ", sentAt: t(DEMO_TODAY, "10:20"), isRead: false },
  { id: 16, senderId: 13, receiverId: 3, elderlyId: 7, channel: "FAMILY_CENTER", text: "Cảm ơn cô đã gửi ảnh ạ", sentAt: t("2026-09-30", "17:00"), isRead: true },
  { id: 17, senderId: 14, receiverId: 4, elderlyId: 4, channel: "FAMILY_CENTER", text: "Chiều nay ông về sớm 15:00", sentAt: t("2026-09-30", "11:00"), isRead: true },
];

const n = (id: number, userId: number, type: Notification["type"], title: string, message: string, createdAt: string, isRead = false): Notification => ({ id, userId, type, title, message, createdAt, isRead });
const notifications: Notification[] = [
  n(1, 10, "ATTENDANCE", "Bà Lan đã đến trung tâm", "Check-in lúc 07:52", t(DEMO_TODAY, "07:52")),
  n(2, 10, "CARE_LOG", "Nhật ký hôm nay đã cập nhật", "Có 3 ảnh mới", t(DEMO_TODAY, "11:40")),
  n(3, 10, "MESSAGE", "Tin nhắn mới từ cô Hạnh", "Dạ bà ăn hết suất cháo…", t(DEMO_TODAY, "08:25"), true),
  n(4, 10, "ATTENDANCE", "Bà Lan đã về nhà", "Check-out lúc 16:30", t("2026-09-30", "16:30"), true),
  n(5, 10, "PAYMENT", "Hoá đơn tháng 10 đã phát hành", "HD-2610-00482 · 5.500.000đ", t(DEMO_TODAY, "07:00"), true),
  n(6, 10, "SYSTEM", "Sắp hết hạn gói dịch vụ", "Gói của Bà Lan hết hạn 31/10", t(DEMO_TODAY, "06:00"), true),
  n(11, 2, "SYSTEM", "Đăng ký mới chờ duyệt", "Bà Ngô Thị Sen · gói Linh hoạt theo ngày", t(DEMO_TODAY, "10:58")),
  n(12, 2, "PAYMENT", "Yêu cầu hoàn tiền RF-0031", "Nguyễn Lan Anh · 250.000đ · nghỉ ốm 2 ngày", t(DEMO_TODAY, "09:15")),
  n(13, 2, "SHIFT", "AI đã tạo gợi ý xếp ca", "Tuần 05/10 – 10/10 · chờ duyệt", t(DEMO_TODAY, "08:00")),
  n(14, 2, "CARE_LOG", "Nhật ký cần lưu ý", "Bà Lê Thị Hoa · huyết áp 160/95", t(DEMO_TODAY, "10:05"), true),
  n(15, 2, "ATTENDANCE", "Báo nghỉ từ gia đình", "Bà Nguyễn Thị Lan · 05–06/10", t("2026-09-30", "18:00"), true),
  n(16, 2, "MESSAGE", "Admin đã trả lời tin nhắn", "Cấu hình tài khoản VNPay", t(DEMO_TODAY, "11:02"), true),
  n(21, 3, "SHIFT", "Ca mới đã được duyệt", "Ca sáng T6 09/10 · 07:00 – 12:00", t(DEMO_TODAY, "08:30")),
  n(22, 3, "MESSAGE", "Tin nhắn từ gia đình", "Nguyễn Lan Anh: Bà có ngủ trưa được không cô?", t(DEMO_TODAY, "12:58")),
  n(23, 3, "ATTENDANCE", "Báo nghỉ hôm nay", "Bà Võ Thị Bích nghỉ đi khám", t(DEMO_TODAY, "07:10"), true),
  n(24, 3, "CARE_LOG", "Nhắc ghi nhật ký", "Còn 2 người chưa có nhật ký hôm nay", t(DEMO_TODAY, "15:30"), true),
];

const absences: AbsenceRequest[] = [
  { id: 1, elderlyId: 1, requestedBy: 10, fromDate: "2026-10-05", toDate: "2026-10-06", reason: "Ốm", note: "Bà bị cảm nhẹ, bác sĩ dặn nghỉ 2 ngày.", status: "PENDING" },
  { id: 2, elderlyId: 5, requestedBy: 12, fromDate: "2026-10-09", toDate: "2026-10-09", reason: "Đi khám", note: "Tái khám định kỳ.", status: "PENDING" },
  { id: 3, elderlyId: 4, requestedBy: 14, fromDate: "2026-09-30", toDate: "2026-09-30", reason: "Việc gia đình", note: "", status: "APPROVED" },
  { id: 4, elderlyId: 7, requestedBy: 13, fromDate: "2026-09-25", toDate: "2026-09-25", reason: "Khác", note: "", status: "REJECTED" },
];

const centerSettings: CenterSettings[] = [{
  centerId: 1, openingHours: "Thứ 2 – Thứ 7, 07:00 – 17:00", pickupPolicy: "Đón từ 16:00 – 17:00, báo trước nếu đón sớm", refundPolicy: "Hoàn theo ngày nếu báo nghỉ trước 1 ngày",
  faqs: [{ q: "Có xe đưa đón không?", a: "Chưa có, gia đình tự đưa đón." }, { q: "Có bữa tối không?", a: "Chỉ gói có đăng ký bữa tối." }],
  aiEnabled: true, vnpayConnected: true, momoConnected: false,
}];

const systemSettings: SystemSettings = { vnpayMode: "PRODUCTION", momoMode: "SANDBOX", sessionTimeoutMinutes: 30, lockAfterFailedLogins: true, llmDailyTokenLimit: 50000, llmMaskPersonalData: true, emailEnabled: true, pushEnabled: true };

const auditLogs: AuditLog[] = [
  { id: 1, userId: null, action: "Tạo hoá đơn HĐ-2610-00482", entityName: "invoices", entityId: 482, ipAddress: "—", createdAt: t(DEMO_TODAY, "09:44") },
  { id: 2, userId: 2, action: "Đăng nhập thành công", entityName: "users", entityId: 2, ipAddress: "113.22.x.x", createdAt: t(DEMO_TODAY, "08:12") },
  { id: 3, userId: 20, action: "Duyệt hoàn tiền RF-0029", entityName: "refunds", entityId: 29, ipAddress: "27.64.x.x", createdAt: t("2026-09-30", "17:55") },
  { id: 4, userId: 1, action: "Khoá trung tâm An Phú", entityName: "centers", entityId: 5, ipAddress: "14.176.x.x", createdAt: t("2026-09-30", "16:20") },
  { id: 5, userId: null, action: "5 lần đăng nhập thất bại", entityName: "users", ipAddress: "45.9.x.x", createdAt: t("2026-09-30", "10:03") },
  { id: 6, userId: 1, action: "Cấp tài khoản cho Sen Vàng", entityName: "users", entityId: 22, ipAddress: "14.176.x.x", createdAt: t("2026-09-29", "09:30") },
];

export const seed = {
  centers, users, elderly, services, packages, packageServices, registrations, invoices, payments, refunds, schedules, menus,
  attendance, careLogs, careLogServices, photos, shifts, shiftAssignments, aiSuggestions, messages, notifications, absences,
  centerSettings, systemSettings, auditLogs,
};
export type DB = typeof seed;
