// Domain models mirroring the team's logical ERD (21 tables) plus the proposed additions
// marked "đề xuất" (absence_requests, center_settings, system_settings, messages.channel,
// messages.assigned_staff_id). See docs/erd-proposal.md.

export type Role = "ADMIN" | "MANAGER" | "STAFF" | "FAMILY";

export interface Center {
  id: number;
  name: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  status: "ACTIVE" | "PENDING" | "SUSPENDED";
  contractStart?: string;
  contractEnd?: string;
}

export interface User {
  id: number;
  centerId: number | null;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  position?: string;
  status: "ACTIVE" | "INVITED" | "LOCKED";
  lastLoginAt?: string;
}

export interface ElderlyMember {
  id: number;
  centerId: number | null;
  familyUserId: number;
  fullName: string;
  dateOfBirth: string;
  gender: "Nam" | "Nữ";
  phone?: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  careNote: string;
  healthTags: string[];
  assignedStaffId?: number;
  status: "ACTIVE" | "PAUSED" | "PENDING";
}

export type BillingPeriod = "DAILY" | "MONTHLY";

export interface ServicePackage {
  id: number;
  centerId: number;
  name: string;
  billingPeriod: BillingPeriod;
  price: number;
  description: string;
  status: "ACTIVE" | "HIDDEN";
}

export type ServiceType = "ACTIVITY" | "MEAL" | "SERVICE";

export interface Service {
  id: number;
  centerId: number;
  name: string;
  type: ServiceType;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface PackageService {
  packageId: number;
  serviceId: number;
}

export interface Registration {
  id: number;
  elderlyId: number;
  packageId: number;
  registeredBy: number;
  startDate: string;
  endDate: string;
  status: "PENDING" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  registeredAt: string;
}

export interface Attendance {
  id: number;
  elderlyId: number;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "EXPECTED" | "PRESENT" | "LEFT" | "ABSENT";
  checkedInBy?: number;
  checkedOutBy?: number;
}

export interface ActivitySchedule {
  id: number;
  centerId: number;
  serviceId: number;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  staffId?: number;
}

export interface Menu {
  id: number;
  centerId: number;
  date: string;
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  note?: string;
}

export type Condition = "GOOD" | "NORMAL" | "TIRED";
export type IssueStatus = "NONE" | "NEW" | "IN_PROGRESS" | "RESOLVED";

export interface CareLog {
  id: number;
  elderlyId: number;
  staffId: number;
  date: string;
  generalCondition: Condition;
  bloodPressure?: string;
  temperature?: string;
  lunch?: string;
  note: string;
  issueNote?: string;
  issueSeverity?: "LOW" | "HIGH";
  issueStatus: IssueStatus;
  managerNote?: string;
}

export interface CareLogService {
  careLogId: number;
  serviceId: number;
  status: "DONE" | "SKIPPED";
}

export interface Photo {
  id: number;
  careLogId: number;
  caption: string;
  tone: "blue" | "orange" | "green";
}

export interface Shift {
  id: number;
  centerId: number;
  date: string;
  label: "Sáng" | "Chiều" | "Cả ngày";
  startTime: string;
  endTime: string;
  requiredStaff: number;
}

export interface ShiftAssignment {
  id: number;
  shiftId: number;
  staffId: number;
  assignedBy: number;
}

export interface AiShiftSuggestion {
  id: number;
  shiftId: number;
  staffId: number;
  reason: string;
  conflict: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: number;
  managerNote?: string;
}

export interface Notification {
  id: number;
  userId: number;
  elderlyId?: number;
  type: "ATTENDANCE" | "CARE_LOG" | "PAYMENT" | "MESSAGE" | "SHIFT" | "SYSTEM";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

/** đề xuất: channel + assignedStaffId */
export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  elderlyId?: number;
  channel: "FAMILY_CENTER" | "CENTER_ADMIN" | "INTERNAL";
  text: string;
  sentAt: string;
  isRead: boolean;
}

export interface Invoice {
  id: number;
  registrationId: number;
  number: string;
  subtotal: number;
  discount: number;
  additionalCharge: number;
  total: number;
  issueDate: string;
  dueDate: string;
  status: "UNPAID" | "PAID" | "REFUNDED";
}

export type PaymentMethod = "VNPAY" | "MOMO";

export interface Payment {
  id: number;
  invoiceId: number;
  payerId: number;
  amount: number;
  method: PaymentMethod;
  transactionCode: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  paidAt: string;
}

export interface Refund {
  id: number;
  paymentId: number;
  requestedBy: number;
  processedBy?: number;
  amount: number;
  reason: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED";
  createdAt: string;
  refundedAt?: string;
}

export interface AuditLog {
  id: number;
  userId: number | null;
  action: string;
  entityName: string;
  entityId?: number;
  ipAddress: string;
  createdAt: string;
}

/** đề xuất: absence_requests */
export interface AbsenceRequest {
  id: number;
  elderlyId: number;
  requestedBy: number;
  fromDate: string;
  toDate: string;
  reason: string;
  note: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

/** đề xuất: center_settings */
export interface CenterSettings {
  centerId: number;
  openingHours: string;
  pickupPolicy: string;
  refundPolicy: string;
  faqs: { q: string; a: string }[];
  aiEnabled: boolean;
  vnpayConnected: boolean;
  momoConnected: boolean;
}

/** đề xuất: system_settings */
export interface SystemSettings {
  vnpayMode: "PRODUCTION" | "SANDBOX";
  momoMode: "PRODUCTION" | "SANDBOX";
  sessionTimeoutMinutes: number;
  lockAfterFailedLogins: boolean;
  llmDailyTokenLimit: number;
  llmMaskPersonalData: boolean;
  emailEnabled: boolean;
  pushEnabled: boolean;
}
