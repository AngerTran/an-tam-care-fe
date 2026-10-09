// Domain models for the single day-care centre (docs/phan-tich-nghiep-vu-v2.md, mục 8).
// One business, one centre: there is no `centers` table, the centre lives in CenterSettings.

export type Role = "ADMIN" | "MANAGER" | "STAFF" | "FAMILY";
export type Position = "NURSE" | "CAREGIVER";
/** Hạng, thời hạn, nhóm đối tượng do Quản lý thêm/sửa/xóa (mục 4.1) → id là chuỗi. Bản mẫu: BASIC/STANDARD/PREMIUM, DAY/M3/MONTH/Q/Y, MOBILE/CHRONIC/REHAB/DEMENTIA/STROKE. */
export type Tier = string;
export type Cycle = string;
export type TargetGroup = string;
export type CatalogStatus = "ACTIVE" | "HIDDEN";
/** Hạng dịch vụ. rank: thấp → cao. */
export interface TierDef {
  id: Tier;
  label: string;
  tone: "blue" | "teal" | "purple" | "orange" | "green" | "red" | "gray";
  rank: number;
  /** "Phổ biến" trên trang giới thiệu */
  highlight?: boolean;
  status: CatalogStatus;
}
/** Thời hạn gói. DAY = chọn từng ngày; WEEKLY = số buổi cố định mỗi tuần (tính theo tháng); PERIOD = đi T2–T7 trong N tháng. */
export interface CycleDef {
  id: Cycle;
  label: string;
  desc: string;
  kind: "DAY" | "WEEKLY" | "PERIOD";
  /** số tháng của một kỳ (DAY = 0) */
  months: number;
  /** % giảm so với giá tháng × số tháng (0–0.5) */
  discount: number;
  /** WEEKLY: các bộ ngày cố định (1 = T2 … 6 = T7) */
  weekdayOptions?: number[][];
  rank: number;
  status: CatalogStatus;
}
/** Nhóm đối tượng (mục 4.1). Phụ phí cố định nằm ở groupSurcharges. */
export interface GroupDef {
  id: TargetGroup;
  label: string;
  tone: "blue" | "teal" | "purple" | "orange" | "green" | "red" | "gray";
  who: string;
  care: string[];
  watch: string;
  report: string;
  limits: string;
  owner: string;
  reassessMonths: number;
  /** hạng tối thiểu được mua (BR-11) */
  minTier: Tier;
  /** nhóm bệnh: dịch vụ ⚠ cần điều dưỡng cho phép */
  disease: boolean;
  rank: number;
  status: CatalogStatus;
}
/** Dòng quyền lợi tự thêm (ngoài các quyền lợi chuẩn của TierEntitlement). */
export interface CustomPerk {
  id: number;
  label: string;
  values: Record<Tier, string>;
}

export interface User {
  id: number;
  role: Role;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  status: "ACTIVE" | "INVITED" | "LOCKED";
  lastLoginAt?: string;
}

/** staff_profiles */
export interface StaffProfile {
  userId: number;
  position: Position;
  certificate: string;
  joinedAt: string;
}

// ------------------------------------------------------------------ packages & services
/** service_packages: one row per tier × cycle. Manager sets the price. */
export interface ServicePackage {
  id: number;
  tier: Tier;
  cycle: Cycle;
  basePrice: number;
  /** M3 only: fixed weekdays (1 = Monday … 6 = Saturday) */
  weekdayOptions?: number[][];
  status: "ACTIVE" | "HIDDEN";
}

/** package_entitlements, grouped by tier (Manager edits the values). */
export interface TierEntitlement {
  tier: Tier;
  dailyPrice: number;
  staffRatio: number;
  meals: string;
  menu: string;
  napRoom: string;
  fixedBed: boolean;
  vitalsPerDay: number;
  monthlyHealthReport: boolean;
  glucose: string;
  weight: string;
  optionalPool: number;
  optionalMax: number;
  photoPerDay: number | null;
  aiAlertFamily: "URGENT_ONLY" | "ALL";
  chat: string;
  waitlistPriority: boolean;
}

export type ServiceKind = "INCLUDED" | "OPTIONAL" | "ADDON";

/** services (danh mục dịch vụ do Manager quản lý) */
export interface Service {
  id: number;
  name: string;
  kind: ServiceKind;
  description: string;
  durationMin?: number;
  roomId?: number;
  equipmentIds: number[];
  owner: Position;
  needsNurseOk: boolean;
  /** per-tier quota, e.g. "2 buổi/tuần"; null = not available in that tier */
  quota: Partial<Record<Tier, string | null>>;
  addonPrice?: number;
  addonUnit?: string;
  healthNote?: string;
  status: "ACTIVE" | "PAUSED";
}

// ------------------------------------------------------------------ elderly & subscriptions
export interface ElderlyMember {
  id: number;
  familyUserId: number;
  fullName: string;
  dateOfBirth: string;
  gender: "Nam" | "Nữ";
  address: string;
  phone?: string;
  /** what the family declared when registering */
  declaredGroup: TargetGroup;
  /** set by Manager after the nurse's assessment; locked for the family afterwards */
  targetGroup?: TargetGroup;
  conditions: string[];
  allergies: string[];
  diet: string;
  hobbies: string;
  careNote: string;
  caregiverId?: number;
  nurseId?: number;
  qrCode: string;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "SUSPENDED" | "TERMINATED";
  /** behaviour tags for DEMENTIA, recurrence checklist for STROKE */
  tone: "blue" | "orange" | "green" | "purple";
}

/** authorized_pickups */
export interface AuthorizedPickup {
  id: number;
  elderlyId: number;
  fullName: string;
  relationship: string;
  phone: string;
  idLast4: string;
  isPrimary: boolean;
}

export type SubStatus = "PENDING_ASSESSMENT" | "AWAITING_PAYMENT" | "ACTIVE" | "PAUSED" | "SUSPENDED" | "TERMINATED" | "EXPIRED" | "REJECTED";

/** subscriptions (đổi tên từ registrations) */
export interface Subscription {
  id: number;
  elderlyId: number;
  packageId: number;
  targetGroup: TargetGroup;
  /** tier/cycle copied for history even if the package price changes later */
  tier: Tier;
  cycle: Cycle;
  weekdays?: number[];
  /** DAY cycle: the booked dates */
  dayDates?: string[];
  startDate: string;
  endDate: string;
  basePrice: number;
  discount: number;
  surchargeAmount: number;
  surchargeNote?: string;
  familyConfirmedAt?: string;
  status: SubStatus;
  pausedUntil?: string;
  createdAt: string;
  createdBy: number;
  /** subscription this one renews / upgrades */
  previousId?: number;
  /** BR-79: family read the service terms and committed that the declaration is true */
  commitmentAt?: string;
  /** BR-80: first-day check found a wrong declaration */
  violation?: "WRONG_GROUP" | "NOT_ACCEPTED";
  violationHandled?: boolean;
}

/** subscription_service_choices */
export interface ServiceChoice {
  subscriptionId: number;
  serviceId: number;
  effectiveFrom: string;
}

/** subscription_add_ons */
export interface AddOn {
  id: number;
  subscriptionId: number;
  serviceId: number;
  quantity: number;
  price: number;
  createdAt: string;
}

/** service_permissions (dịch vụ ⚠ do điều dưỡng cho phép) */
export interface ServicePermission {
  elderlyId: number;
  serviceId: number;
  allowed: boolean;
  reason: string;
  nurseId: number;
  date: string;
}

/** assessments: đánh giá đầu vào và định kỳ */
export interface Assessment {
  id: number;
  elderlyId: number;
  subscriptionId?: number;
  /** FIRST_DAY = online registration with commitment, nurse checks on the first morning (BR-79) */
  kind: "INITIAL" | "PERIODIC" | "FIRST_DAY";
  scheduledAt: string;
  nurseId?: number;
  barthel?: number;
  proposedGroup?: TargetGroup;
  baseline?: string;
  diagnosisDocs?: string;
  nurseNote?: string;
  /** nurse found the elderly belongs to the not-accepted cases (BR-18) */
  notAccepted?: boolean;
  doneAt?: string;
  status: "SCHEDULED" | "DONE" | "APPROVED";
  approvedBy?: number;
  approvedAt?: string;
}

/** waitlist_entries */
export interface WaitlistEntry {
  id: number;
  elderlyId: number;
  tier: Tier;
  requestedAt: string;
  reason: "FULL" | "UPGRADE" | "SECURE_ZONE";
  holdUntil?: string;
  status: "WAITING" | "HOLDING" | "CONVERTED" | "EXPIRED" | "CANCELLED";
}

// ------------------------------------------------------------------ money
export interface InvoiceLine {
  label: string;
  amount: number;
}
export interface Invoice {
  id: number;
  subscriptionId: number;
  number: string;
  kind: "NEW" | "RENEWAL" | "UPGRADE" | "ADDON" | "DAY_BOOKING" | "VIOLATION";
  /** UPGRADE: hạng đích */
  upgradeTo?: Tier;
  lines: InvoiceLine[];
  creditUsed: number;
  total: number;
  issueDate: string;
  dueDate: string;
  status: "UNPAID" | "PAID" | "REFUNDED" | "VOID";
}
export type PaymentMethod = "VNPAY" | "MOMO";
export interface Payment {
  id: number;
  invoiceId: number;
  payerId: number;
  amount: number;
  method: PaymentMethod;
  transactionCode: string;
  status: "SUCCESS" | "FAILED";
  paidAt: string;
}
/** refunds: only used when the elderly passes away (5.9) */
export interface Refund {
  id: number;
  subscriptionId: number;
  paymentId: number;
  amount: number;
  reason: string;
  status: "PENDING" | "DONE";
  createdAt: string;
  processedBy?: number;
}
/** account_credits: DAY package absences reported before 17:00 the day before */
export interface AccountCredit {
  id: number;
  familyUserId: number;
  elderlyId: number;
  amount: number;
  reason: string;
  createdAt: string;
  usedInvoiceId?: number;
}

// ------------------------------------------------------------------ requests
/** absence_requests (báo nghỉ) */
export interface AbsenceRequest {
  id: number;
  elderlyId: number;
  requestedBy: number;
  fromDate: string;
  toDate: string;
  reason: string;
  note: string;
  createdAt: string;
  /** DAY package & reported in time → kept as credit */
  creditAmount: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
}
/** subscription_pauses + termination (qua đời) */
export interface PauseRequest {
  id: number;
  subscriptionId: number;
  kind: "HOSPITAL" | "DEATH";
  fromDate: string;
  toDate?: string;
  document: string;
  note: string;
  requestedBy: number;
  createdAt: string;
  refundAmount?: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: number;
}

// ------------------------------------------------------------------ daily operation
export interface Attendance {
  id: number;
  elderlyId: number;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: "EXPECTED" | "PRESENT" | "LEFT" | "ABSENT";
  checkedInBy?: number;
  checkedOutBy?: number;
  pickupId?: number;
  manualReason?: string;
}

export type TaskType = "MEAL" | "VITALS" | "MEDICATION" | "ACTIVITY" | "NAP" | "HYGIENE" | "CHECKOUT" | "GLUCOSE";
/** daily_tasks: tạo tự động mỗi sáng */
export interface DailyTask {
  id: number;
  elderlyId: number;
  date: string;
  time: string;
  type: TaskType;
  title: string;
  owner: Position;
  serviceId?: number;
  status: "TODO" | "DONE" | "SKIPPED";
  skipReason?: string;
  doneBy?: number;
  doneAt?: string;
}

export type EntryKind = "CHECKIN" | "CHECKOUT" | "MEAL" | "HYGIENE" | "ACTIVITY" | "NAP" | "MOOD" | "PHOTO" | "NOTE" | "VITALS" | "MEDICATION" | "INCIDENT";
/** care_log_entries */
export interface CareLogEntry {
  id: number;
  elderlyId: number;
  date: string;
  time: string;
  kind: EntryKind;
  title: string;
  detail: string;
  staffId: number;
  /** PHOTO entries */
  tone?: "blue" | "orange" | "green";
  important?: boolean;
}
/** care_log_days */
export interface CareLogDay {
  elderlyId: number;
  date: string;
  status: "OPEN" | "CLOSED";
  closedBy?: number;
  closedAt?: string;
  closedByManager?: boolean;
}
/** care_log_edits */
export interface CareLogEdit {
  id: number;
  entryId: number;
  elderlyId: number;
  date: string;
  editedBy: number;
  editedAt: string;
  before: string;
  after: string;
  reason: string;
}

/** health_metrics */
export interface HealthMetric {
  id: number;
  elderlyId: number;
  at: string;
  sys?: number;
  dia?: number;
  pulse?: number;
  temp?: number;
  spo2?: number;
  glucose?: number;
  weight?: number;
  strokeChecklistOk?: boolean;
  by: number;
}
export interface Thresholds {
  sysMax: number;
  diaMax: number;
  sysMin: number;
  pulseMin: number;
  pulseMax: number;
  tempMax: number;
  spo2Min: number;
  glucoseMax: number;
}

/** health_alerts */
export interface HealthAlert {
  id: number;
  elderlyId: number;
  at: string;
  source: "THRESHOLD" | "AI" | "RULE";
  level: "INFO" | "WARNING" | "URGENT";
  title: string;
  detail: string;
  status: "NEW" | "IN_PROGRESS" | "CLOSED";
  handledBy?: number;
  result?: string;
}

/** incidents (+ hospital_transfers, late_pickup_incidents) */
export interface Incident {
  id: number;
  elderlyId: number;
  at: string;
  type: "FALL" | "HEALTH" | "BEHAVIOR" | "LATE_PICKUP" | "FACILITY" | "OTHER";
  severity: "LOW" | "MEDIUM" | "HIGH";
  description: string;
  action: string;
  familyNotified: boolean;
  transfer?: { hospital: string; time: string; escort: string };
  reportedBy: number;
  status: "OPEN" | "RESOLVED";
}

/** medication_plans */
export interface MedicationPlan {
  id: number;
  elderlyId: number;
  name: string;
  dose: string;
  times: string[];
  startDate: string;
  endDate?: string;
  note: string;
  active: boolean;
}
/** medication_administrations */
export interface MedicationDose {
  id: number;
  planId: number;
  elderlyId: number;
  date: string;
  time: string;
  status: "PENDING" | "GIVEN" | "REFUSED" | "MISSING";
  by?: number;
  at?: string;
  reason?: string;
}

/** personal_belongings */
export interface Belonging {
  id: number;
  elderlyId: number;
  item: string;
  receivedAt: string;
  receivedBy: number;
  returnedAt?: string;
  returnedBy?: number;
  tone: "blue" | "orange" | "green";
}

// ------------------------------------------------------------------ schedule, menu, shifts
export interface ActivitySchedule {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  serviceId?: number;
  roomId: number;
  staffId?: number;
  tiers: Tier[];
}

export interface Menu {
  id: number;
  date: string;
  breakfast: string;
  lunch: string;
  snack: string;
  lowSugar: string;
  lowSalt: string;
  soft: string;
  status: "AI_SUGGESTED" | "APPROVED";
}

/** therapy_slots + therapy_bookings */
export interface TherapySlot {
  id: number;
  date: string;
  startTime: string;
  serviceId: number;
  roomId: number;
  capacity: number;
  bookings: { elderlyId: number; status: "PLANNED" | "DONE" | "ABSENT" | "MAKEUP" }[];
}

export interface Shift {
  id: number;
  date: string;
  label: "Sáng" | "Chiều" | "Trực chờ đón";
  startTime: string;
  endTime: string;
  needNurse: number;
  needCaregiver: number;
  note?: string;
}
export interface ShiftAssignment {
  id: number;
  shiftId: number;
  staffId: number;
  source: "AI" | "MANAGER";
  status: "SUGGESTED" | "APPROVED" | "REJECTED";
  reason?: string;
  conflict?: boolean;
}
/** staff_availability */
export interface Availability {
  staffId: number;
  date: string;
  slots: ("Sáng" | "Chiều" | "Trực chờ đón")[];
}
/** leave_requests */
export interface LeaveRequest {
  id: number;
  staffId: number;
  kind: "LEAVE" | "SWAP";
  shiftId: number;
  reason: string;
  replacementId?: number;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

// ------------------------------------------------------------------ facilities
export type Zone = "LOBBY" | "MEDICAL" | "COMMON" | "THERAPY" | "DINING" | "NAP" | "MASSAGE" | "SECURE" | "GARDEN";
export interface Room {
  id: number;
  name: string;
  zone: Zone;
  floor: string;
  area: number;
  capacity: number;
  tiers: Tier[];
  status: "ACTIVE" | "CLOSED";
  closedReason?: string;
  description: string;
  tone: "blue" | "orange" | "green";
}
export interface NapBed {
  id: number;
  roomId: number;
  code: string;
  tier: Tier;
  status: "ACTIVE" | "BROKEN";
  /** Premium: fixed owner */
  fixedElderlyId?: number;
}
/** nap_bed_assignments (theo ngày) */
export interface BedAssignment {
  date: string;
  bedId: number;
  elderlyId: number;
}
export interface Equipment {
  id: number;
  name: string;
  category: "MEDICAL" | "THERAPY" | "LIVING" | "SAFETY";
  roomId: number;
  total: number;
  minStock: number;
  broken: number;
  repairing: number;
  /** số chỗ phục vụ cùng lúc */
  concurrent: number;
  note: string;
}
export interface DamageReport {
  id: number;
  equipmentId?: number;
  roomId?: number;
  quantity: number;
  description: string;
  reportedBy: number;
  reportedAt: string;
  status: "NEW" | "REPAIRING" | "FIXED" | "DISPOSED";
  handledBy?: number;
}
export interface InventoryCheck {
  id: number;
  title: string;
  createdAt: string;
  createdBy: number;
  status: "DRAFT" | "CLOSED";
  closedAt?: string;
  items: { equipmentId: number; system: number; counted?: number; reason?: string }[];
}
/** entitlement_compensations */
export interface Compensation {
  id: number;
  elderlyId: number;
  date: string;
  reason: string;
  form: string;
  notified: boolean;
}

// ------------------------------------------------------------------ communication & admin
export interface Notification {
  id: number;
  userId: number;
  type: "ATTENDANCE" | "CARE_LOG" | "HEALTH" | "PAYMENT" | "MESSAGE" | "SHIFT" | "FACILITY" | "SYSTEM";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}
export interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  elderlyId?: number;
  channel: "FAMILY_STAFF" | "INTERNAL" | "CHATBOT_HANDOFF";
  text: string;
  sentAt: string;
  isRead: boolean;
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
/** center_holidays */
export interface Holiday {
  id: number;
  date: string;
  name: string;
  announced: boolean;
}
/** announcements */
export interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: "ALL" | Tier | TargetGroup;
  sentAt: string;
  sentBy: number;
}
/** manager_reports */
export interface ManagerReport {
  id: number;
  period: "WEEK" | "MONTH";
  label: string;
  from: string;
  to: string;
  generatedAt: string;
  metrics: { label: string; value: string }[];
  managerNote: string;
  sentAt?: string;
}
/** notification_preferences: loại thông báo gia đình đã tắt */
export interface NotificationPref {
  userId: number;
  off: string[];
}
/** visit bookings from guests (đặt lịch tham quan) */
export interface VisitBooking {
  id: number;
  fullName: string;
  phone: string;
  date: string;
  time: string;
  note: string;
  createdAt: string;
  status: "NEW" | "CONFIRMED" | "DONE";
}

/** group_surcharges: fixed monthly surcharge per target group, published on the web (BR-17) */
export interface GroupSurcharge {
  group: TargetGroup;
  monthly: number;
}

/** center_settings: one row */
export interface CenterSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  openDays: string;
  careStart: string;
  careEnd: string;
  closingTime: string;
  pickupReminders: string[];
  absentAlertAt: string;
  closeReminderAt: string;
  managerCloseAt: string;
  dayCancelCutoff: string;
  renewalReminderDays: number;
  maxPauseDays: number;
  thresholds: Thresholds;
  faqs: { q: string; a: string }[];
  aiEnabled: boolean;
  vnpayConnected: boolean;
  momoConnected: boolean;
}

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
