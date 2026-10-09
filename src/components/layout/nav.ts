import {
  Activity, BedDouble, Bell, BookOpen, Bot, Boxes, Building, CalendarClock, CalendarDays, CalendarRange, ChartColumn, CircleCheck, ClipboardCheck,
  ClipboardList, CreditCard, Dumbbell, FileBarChart, Globe, HeartPulse, House, Hourglass, KeyRound, ListChecks, MessageCircle, Package, PauseCircle,
  Pill, QrCode, Receipt, ShieldCheck, Siren, Stethoscope, TriangleAlert, User, UserRound, Users, Wrench, type LucideIcon,
} from "lucide-react";
import type { Position, Role } from "../../types/models";

export type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean; only?: Position };
export type NavSection = { title?: string; items: NavItem[] };

export const NAV: Record<Role, NavSection[]> = {
  MANAGER: [
    { title: "Vận hành hôm nay", items: [
      { label: "Vận hành trong ngày", to: "/manager", icon: ChartColumn, end: true },
      { label: "Điểm danh & đón cụ", to: "/manager/attendance", icon: CircleCheck },
      { label: "Care log", to: "/manager/care-logs", icon: BookOpen },
      { label: "Cảnh báo sức khỏe", to: "/manager/alerts", icon: HeartPulse },
      { label: "Sự cố & chuyển viện", to: "/manager/incidents", icon: Siren },
    ] },
    { title: "Người cao tuổi", items: [
      { label: "Hồ sơ cụ", to: "/manager/members", icon: UserRound },
      { label: "Đăng ký & đánh giá", to: "/manager/registrations", icon: ClipboardList },
      { label: "Danh sách chờ", to: "/manager/waitlist", icon: Hourglass },
      { label: "Báo nghỉ", to: "/manager/absences", icon: CalendarDays },
      { label: "Bảo lưu & chấm dứt", to: "/manager/pauses", icon: PauseCircle },
    ] },
    { title: "Dịch vụ & lịch", items: [
      { label: "Gói & giá (xem)", to: "/manager/packages", icon: Package },
      { label: "Danh mục dịch vụ", to: "/manager/services", icon: ListChecks },
      { label: "Lịch hoạt động & thực đơn", to: "/manager/schedule", icon: CalendarRange },
      { label: "Lịch VLTL & massage", to: "/manager/therapy", icon: Dumbbell },
      { label: "Ngày lễ & thông báo", to: "/manager/calendar", icon: Bell },
    ] },
    { title: "Nhân sự", items: [
      { label: "Nhân viên & phân công", to: "/manager/staff", icon: Users },
      { label: "Xếp ca (AI) & duyệt nghỉ", to: "/manager/shifts", icon: CalendarClock },
    ] },
    { title: "Cơ sở vật chất", items: [
      { label: "Giường nghỉ trưa", to: "/manager/facilities/beds", icon: BedDouble },
      { label: "Báo hỏng & sửa chữa", to: "/manager/facilities/damage", icon: Wrench },
      { label: "Kiểm kê", to: "/manager/facilities/inventory", icon: ClipboardCheck },
    ] },
    { title: "Tài chính & báo cáo", items: [
      { label: "Hóa đơn & nhắc đóng tiền", to: "/manager/payments", icon: CreditCard },
      { label: "Báo cáo gửi Admin", to: "/manager/reports", icon: FileBarChart },
    ] },
    { items: [
      { label: "Tin nhắn", to: "/manager/messages", icon: MessageCircle },
      { label: "Cài đặt vận hành", to: "/manager/settings", icon: Globe },
    ] },
  ],
  STAFF: [
    { title: "Ca hôm nay", items: [
      { label: "Ca hôm nay", to: "/staff", icon: ChartColumn, end: true },
      { label: "Check-in / check-out", to: "/staff/checkin", icon: QrCode },
      { label: "Lịch hôm nay", to: "/staff/schedule", icon: CalendarDays },
      { label: "Cụ hôm nay", to: "/staff/elderly", icon: UserRound },
      { label: "Ghi nhanh cả nhóm", to: "/staff/group-log", icon: Users },
      { label: "Đo chỉ số", to: "/staff/vitals", icon: Activity, only: "NURSE" },
      { label: "Thuốc đến hạn", to: "/staff/meds", icon: Pill, only: "NURSE" },
      { label: "Cảnh báo", to: "/staff/alerts", icon: HeartPulse },
      { label: "Sự cố", to: "/staff/incidents", icon: TriangleAlert },
    ] },
    { title: "Khác", items: [
      { label: "Đánh giá đầu vào", to: "/staff/assessments", icon: Stethoscope, only: "NURSE" },
      { label: "Lịch ca & xin nghỉ", to: "/staff/shifts", icon: CalendarClock },
      { label: "Báo hỏng thiết bị", to: "/staff/damage", icon: Wrench },
      { label: "Đồ cá nhân gửi lại", to: "/staff/belongings", icon: Boxes },
      { label: "Tin nhắn", to: "/staff/messages", icon: MessageCircle },
    ] },
  ],
  FAMILY: [
    { title: "Theo dõi cụ", items: [
      { label: "Hôm nay của cụ", to: "/family", icon: House, end: true },
      { label: "Tổng kết ngày", to: "/family/summary", icon: BookOpen },
      { label: "Sức khỏe", to: "/family/health", icon: HeartPulse },
      { label: "Cảnh báo & sự cố", to: "/family/alerts", icon: TriangleAlert },
      { label: "Thuốc gửi kèm", to: "/family/meds", icon: Pill },
      { label: "Lịch & thực đơn", to: "/family/schedule", icon: CalendarRange },
    ] },
    { title: "Gói & thanh toán", items: [
      { label: "Gói của tôi", to: "/family/packages", icon: Package },
      { label: "Đăng ký gói", to: "/family/register", icon: ClipboardList },
      { label: "Hóa đơn & số dư", to: "/family/invoices", icon: Receipt },
      { label: "Báo nghỉ", to: "/family/absence", icon: CalendarDays },
    ] },
    { title: "Khác", items: [
      { label: "Người thân", to: "/family/relatives", icon: UserRound },
      { label: "Đồ gửi tại trung tâm", to: "/family/belongings", icon: Boxes },
      { label: "Trợ lý tư vấn", to: "/family/chat", icon: Bot },
      { label: "Tin nhắn", to: "/family/messages", icon: MessageCircle },
      { label: "Tài khoản", to: "/family/account", icon: User },
    ] },
  ],
  ADMIN: [
    { title: "Tổng quan", items: [
      { label: "Tổng quan doanh nghiệp", to: "/admin", icon: ChartColumn, end: true },
      { label: "Báo cáo từ Quản lý", to: "/admin/reports", icon: FileBarChart },
    ] },
    { title: "Kinh doanh", items: [
      { label: "Gói & giá", to: "/admin/packages", icon: Package },
      { label: "Doanh thu & thanh toán", to: "/admin/finance", icon: CreditCard },
      { label: "Duyệt hoàn tiền", to: "/admin/refunds", icon: Receipt },
    ] },
    { title: "Nhân sự", items: [
      { label: "Nhân viên & tài khoản", to: "/admin/accounts", icon: KeyRound },
    ] },
    { title: "Tài sản", items: [
      { label: "Cơ sở vật chất", to: "/admin/facilities", icon: Building },
      { label: "Khu & phòng", to: "/admin/rooms", icon: House },
      { label: "Thiết bị", to: "/admin/equipment", icon: Boxes },
    ] },
    { title: "Hệ thống", items: [
      { label: "Cấu hình trung tâm & hệ thống", to: "/admin/settings", icon: Globe },
      { label: "Nhật ký hệ thống", to: "/admin/audit", icon: ShieldCheck },
    ] },
  ],
};
