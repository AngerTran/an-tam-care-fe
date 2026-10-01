import {
  BookOpen, Building, Building2, Calendar, CalendarDays, ChartColumn, CircleCheck, ClipboardList, CreditCard, Globe, House, KeyRound,
  ListChecks, MessageCircle, Puzzle, Receipt, ShieldCheck, TrendingUp, User, UserRound, Users, type LucideIcon,
} from "lucide-react";
import type { Role } from "../../types/models";

export type NavItem = { label: string; to: string; icon: LucideIcon; end?: boolean };

// Mirrors the Sidebar component variants in Figma (Role × Active).
export const NAV: Record<Role, NavItem[]> = {
  MANAGER: [
    { label: "Tổng quan", to: "/manager", icon: ChartColumn, end: true },
    { label: "Người cao tuổi", to: "/manager/members", icon: UserRound },
    { label: "Đăng ký mới", to: "/manager/registrations", icon: ClipboardList },
    { label: "Gói dịch vụ", to: "/manager/packages", icon: Receipt },
    { label: "Dịch vụ & hoạt động", to: "/manager/services", icon: ListChecks },
    { label: "Điểm danh", to: "/manager/attendance", icon: CircleCheck },
    { label: "Lịch & thực đơn", to: "/manager/schedule", icon: Calendar },
    { label: "Nhật ký chăm sóc", to: "/manager/care-logs", icon: BookOpen },
    { label: "Xếp ca (AI)", to: "/manager/shifts", icon: Puzzle },
    { label: "Nhân viên", to: "/manager/staff", icon: Users },
    { label: "Tin nhắn", to: "/manager/messages", icon: MessageCircle },
    { label: "Thanh toán", to: "/manager/payments", icon: CreditCard },
    { label: "Báo cáo", to: "/manager/reports", icon: TrendingUp },
    { label: "Cài đặt trung tâm", to: "/manager/settings", icon: Building },
  ],
  STAFF: [
    { label: "Điểm danh", to: "/staff", icon: CircleCheck, end: true },
    { label: "Lịch & thực đơn", to: "/staff/today", icon: Calendar },
    { label: "Nhật ký chăm sóc", to: "/staff/care-logs", icon: BookOpen },
    { label: "Ca làm của tôi", to: "/staff/shifts", icon: CalendarDays },
    { label: "Tin nhắn", to: "/staff/messages", icon: MessageCircle },
  ],
  ADMIN: [
    { label: "Tổng quan hệ thống", to: "/admin", icon: ChartColumn, end: true },
    { label: "Trung tâm", to: "/admin/centers", icon: Building2 },
    { label: "Tài khoản quản lý", to: "/admin/accounts", icon: KeyRound },
    { label: "Phân quyền", to: "/admin/roles", icon: ListChecks },
    { label: "Tin nhắn với trung tâm", to: "/admin/messages", icon: MessageCircle },
    { label: "Cấu hình hệ thống", to: "/admin/settings", icon: Globe },
    { label: "Nhật ký hệ thống", to: "/admin/audit", icon: ShieldCheck },
  ],
  FAMILY: [
    { label: "Trang chủ", to: "/family", icon: House, end: true },
    { label: "Người thân", to: "/family/relatives", icon: UserRound },
    { label: "Tìm trung tâm", to: "/family/centers", icon: Building2 },
    { label: "Gói của tôi", to: "/family/packages", icon: Receipt },
    { label: "Nhật ký", to: "/family/care-log", icon: BookOpen },
    { label: "Lịch & thực đơn", to: "/family/schedule", icon: Calendar },
    { label: "Tin nhắn", to: "/family/messages", icon: MessageCircle },
    { label: "Tài khoản", to: "/family/account", icon: User },
  ],
};
