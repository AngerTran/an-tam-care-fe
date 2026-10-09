import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { PortalLayout } from "./components/layout/PortalLayout";
import type { Role } from "./types/models";
import { ForgotPasswordPage, LoginPage, RegisterPage, VerifyEmailPage } from "./pages/auth/AuthPages";
import { PublicHome } from "./pages/public/PublicHome";
import { ForbiddenPage, MessagesPage, NotFoundPage, NotificationsPage, ProfilePage } from "./pages/shared/SharedPages";
import { AlertsPage, AttendancePage, CareLogDetailPage, CareLogsPage, IncidentsPage, ManagerDashboard } from "./pages/manager/ManagerOps";
import { AbsencesPage, MemberDetailPage, MemberEditPage, MembersPage, PausesPage, RegistrationsPage, WaitlistPage } from "./pages/manager/ManagerElderly";
import { CalendarPage, PackagesPage, SchedulePage, ServicesPage, TherapyPage } from "./pages/manager/ManagerCatalog";
import { ShiftsPage, StaffFormPage, StaffPage } from "./pages/manager/ManagerStaff";
import { BedsPage, DamagePage, EquipmentPage, FacilitiesOverview, InventoryDetailPage, InventoryPage, RoomsPage } from "./pages/manager/ManagerFacilities";
import { InvoiceDetail, PaymentsPage, ReportsPage, SettingsPage } from "./pages/manager/ManagerFinance";
import { StaffCareLog, StaffCheckin, StaffElderly, StaffGroupLog, StaffToday } from "./pages/staff/StaffDay";
import { StaffSchedule } from "./pages/staff/StaffSchedule";
import { StaffAlerts, StaffAssessments, StaffIncidents, StaffMeds, StaffVitals } from "./pages/staff/StaffNurse";
import { StaffBelongings, StaffDamage, StaffShifts } from "./pages/staff/StaffOther";
import { FamilyAccountExtras, FamilyAlerts, FamilyBelongings, FamilyChat, FamilyHealth, FamilyHome, FamilyMeds, FamilySchedule, FamilySummary } from "./pages/family/FamilyTrack";
import { CheckoutPage, FamilyAbsencePage, FamilyInvoicesPage, MyPackagesPage, RegisterWizard, RelativeFormPage, RelativesPage } from "./pages/family/FamilyPackages";
import { AccountsPage, AdminDashboard, AdminFacilities, AdminReports, AuditPage, SystemSettingsPage } from "./pages/admin/AdminPages";

/** Route guard: not signed in → /login, wrong role → 403 (data scoping is enforced again in the API). */
function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (user.role !== role) return <ForbiddenPage />;
  return <PortalLayout role={role} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/xac-thuc" element={<VerifyEmailPage />} />
      <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />

      <Route path="/manager" element={<RequireRole role="MANAGER" />}>
        <Route index element={<ManagerDashboard />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="care-logs" element={<CareLogsPage />} />
        <Route path="care-logs/:id/:date" element={<CareLogDetailPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/:id" element={<MemberDetailPage />} />
        <Route path="members/:id/edit" element={<MemberEditPage />} />
        <Route path="registrations" element={<RegistrationsPage />} />
        <Route path="waitlist" element={<WaitlistPage />} />
        <Route path="absences" element={<AbsencesPage />} />
        <Route path="pauses" element={<PausesPage />} />
        <Route path="packages" element={<PackagesPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="therapy" element={<TherapyPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/new" element={<StaffFormPage />} />
        <Route path="staff/:id" element={<StaffFormPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="facilities" element={<FacilitiesOverview />} />
        <Route path="facilities/rooms" element={<RoomsPage />} />
        <Route path="facilities/beds" element={<BedsPage />} />
        <Route path="facilities/equipment" element={<EquipmentPage />} />
        <Route path="facilities/damage" element={<DamagePage />} />
        <Route path="facilities/inventory" element={<InventoryPage />} />
        <Route path="facilities/inventory/:id" element={<InventoryDetailPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="invoices/:id" element={<InvoiceDetail back="/manager/payments" />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/staff" element={<RequireRole role="STAFF" />}>
        <Route index element={<StaffToday />} />
        <Route path="checkin" element={<StaffCheckin />} />
        <Route path="schedule" element={<StaffSchedule />} />
        <Route path="elderly" element={<StaffElderly />} />
        <Route path="elderly/:id" element={<StaffCareLog />} />
        <Route path="group-log" element={<StaffGroupLog />} />
        <Route path="vitals" element={<StaffVitals />} />
        <Route path="meds" element={<StaffMeds />} />
        <Route path="incidents" element={<StaffIncidents />} />
        <Route path="alerts" element={<StaffAlerts />} />
        <Route path="assessments" element={<StaffAssessments />} />
        <Route path="shifts" element={<StaffShifts />} />
        <Route path="damage" element={<StaffDamage />} />
        <Route path="belongings" element={<StaffBelongings />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/family" element={<RequireRole role="FAMILY" />}>
        <Route index element={<FamilyHome />} />
        <Route path="summary" element={<FamilySummary />} />
        <Route path="health" element={<FamilyHealth />} />
        <Route path="alerts" element={<FamilyAlerts />} />
        <Route path="meds" element={<FamilyMeds />} />
        <Route path="schedule" element={<FamilySchedule />} />
        <Route path="packages" element={<MyPackagesPage />} />
        <Route path="register" element={<RegisterWizard />} />
        <Route path="checkout/:id" element={<CheckoutPage />} />
        <Route path="invoices" element={<FamilyInvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetail back="/family/invoices" family />} />
        <Route path="absence" element={<FamilyAbsencePage />} />
        <Route path="relatives" element={<RelativesPage />} />
        <Route path="relatives/new" element={<RelativeFormPage />} />
        <Route path="relatives/:id" element={<RelativeFormPage />} />
        <Route path="belongings" element={<FamilyBelongings />} />
        <Route path="chat" element={<FamilyChat />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="account" element={<ProfilePage extra={<FamilyAccountExtras />} />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/admin" element={<RequireRole role="ADMIN" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="facilities" element={<AdminFacilities />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
