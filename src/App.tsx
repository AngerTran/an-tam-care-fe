import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { HOME, useAuth } from "./auth/AuthContext";
import { PortalLayout } from "./components/layout/PortalLayout";
import type { Role } from "./types/models";
import { ForgotPasswordPage, LoginPage, RegisterPage, VerifyEmailPage } from "./pages/auth/AuthPages";
import { ForbiddenPage, MessagesPage, NotFoundPage, NotificationsPage, ProfilePage } from "./pages/shared/SharedPages";
import { ManagerDashboard, MemberDetailPage, MemberFormPage, MembersPage, RegistrationsPage } from "./pages/manager/ManagerCore";
import { AbsencesPage, AttendancePage, CareLogsPage, ScheduleFormPage, SchedulePage, ShiftDetailPage, ShiftSetupPage, ShiftsPage } from "./pages/manager/ManagerOps";
import { CenterSettingsPage, InvoiceDetail, PackageEditPage, PackagesPage, PaymentsPage, ReportsPage, ServicesPage, StaffFormPage, StaffPage } from "./pages/manager/ManagerBiz";
import { CareLogFormPage, MyShiftsPage, StaffAttendancePage, StaffElderlyPage, StaffLogsPage, StaffTodayPage } from "./pages/staff/StaffPages";
import { AccountsPage, AdminDashboard, AuditPage, CenterDetailPage, CentersPage, RolesPage, SystemSettingsPage } from "./pages/admin/AdminPages";
import { CenterPackagesPage, CheckoutPage, FamilyAccountExtras, FamilyCareLogPage, FamilyHome, FamilySchedulePage, FindCentersPage, MyPackagesPage, PackageDetailPage, RelativeFormPage, RelativesPage } from "./pages/family/FamilyPages";

/** Route guard: not signed in → /login, wrong role → 403 (data scoping is enforced again in the API). */
function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (user.role !== role) return <ForbiddenPage />;
  return <PortalLayout role={role} />;
}

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? HOME[user.role] : "/login"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dang-ky" element={<RegisterPage />} />
      <Route path="/xac-thuc" element={<VerifyEmailPage />} />
      <Route path="/quen-mat-khau" element={<ForgotPasswordPage />} />

      <Route path="/manager" element={<RequireRole role="MANAGER" />}>
        <Route index element={<ManagerDashboard />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="members/new" element={<MemberFormPage />} />
        <Route path="members/:id" element={<MemberDetailPage />} />
        <Route path="members/:id/edit" element={<MemberFormPage />} />
        <Route path="registrations" element={<RegistrationsPage />} />
        <Route path="packages" element={<PackagesPage />} />
        <Route path="packages/:id" element={<PackageEditPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="absences" element={<AbsencesPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="schedule/new" element={<ScheduleFormPage />} />
        <Route path="care-logs" element={<CareLogsPage />} />
        <Route path="shifts" element={<ShiftsPage />} />
        <Route path="shifts/setup" element={<ShiftSetupPage />} />
        <Route path="shifts/:shiftId" element={<ShiftDetailPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/new" element={<StaffFormPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="invoices/:id" element={<InvoiceDetail back="/manager/payments" />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<CenterSettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/staff" element={<RequireRole role="STAFF" />}>
        <Route index element={<StaffAttendancePage />} />
        <Route path="today" element={<StaffTodayPage />} />
        <Route path="care-log" element={<CareLogFormPage />} />
        <Route path="care-logs" element={<StaffLogsPage />} />
        <Route path="shifts" element={<MyShiftsPage />} />
        <Route path="elderly/:id" element={<StaffElderlyPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/admin" element={<RequireRole role="ADMIN" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="centers" element={<CentersPage />} />
        <Route path="centers/:id" element={<CenterDetailPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SystemSettingsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/family" element={<RequireRole role="FAMILY" />}>
        <Route index element={<FamilyHome />} />
        <Route path="relatives" element={<RelativesPage />} />
        <Route path="relatives/new" element={<RelativeFormPage />} />
        <Route path="relatives/:id" element={<RelativeFormPage />} />
        <Route path="centers" element={<FindCentersPage />} />
        <Route path="centers/:id" element={<CenterPackagesPage />} />
        <Route path="package/:id" element={<PackageDetailPage />} />
        <Route path="checkout/:id" element={<CheckoutPage />} />
        <Route path="packages" element={<MyPackagesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetail back="/family/packages" family />} />
        <Route path="care-log" element={<FamilyCareLogPage />} />
        <Route path="schedule" element={<FamilySchedulePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="account" element={<ProfilePage extra={<FamilyAccountExtras />} />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

