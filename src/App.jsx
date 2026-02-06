import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import EmployeeDashboard from "@/pages/EmployeeDashboard";
import EmployeeManagement from "@/pages/EmployeeManagement";
import EmployeeDetail from "@/pages/EmployeeDetail";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminAnnouncements from "@/pages/AdminAnnouncements";
import EmployeeProfile from "@/pages/EmployeeProfile";
import AdminLeaveManagement from "@/pages/AdminLeaveManagement";
import EmployeeLeaveRequest from "@/pages/EmployeeLeaveRequest";
import AdminOrgChart from "@/pages/AdminOrgChart";
import AdminAttendanceManagement from "@/pages/AdminAttendanceManagement";
import SuccessModal from "@/components/ui/SuccessModal";
import {
  SuccessModalProvider,
  useSuccessModal,
} from "@/contexts/SuccessModalContext";
import AdminSettings from "@/pages/AdminSettings";
import AdminActivityLog from "@/pages/AdminActivityLog";
import DirectManagerView from "@/pages/DirectManagerView";
import AdminContractManagement from "@/pages/AdminContractManagement";
import BirthdayCard from "@/components/admin/dashboard/BirthdayCard";
import BirthdayDialog from "@/components/admin/dashboard/BirthdayDialog";
import EmployeeAttendancePage from "@/pages/EmployeeAttendancePage";
import TeamAttendancePage from "@/pages/TeamAttendancePage";
import EmployeeTeamPage from "@/pages/EmployeeTeamPage";
import ForbiddenPage from "./pages/ForbiddenPage";

function AppContent() {
  const { successModalProps, showSuccessModal, hideSuccessModal } =
    useSuccessModal();

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRoles={["Super Admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <EmployeeManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees/:id"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <EmployeeDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <AdminAnnouncements />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leave-management"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <AdminLeaveManagement showSuccessModal={showSuccessModal} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/contract-management"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <AdminContractManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organization-chart"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <AdminOrgChart />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/direct-manager"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <DirectManagerView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance-management"
            element={
              <ProtectedRoute requiredRoles={["Admin", "Super Admin"]}>
                <AdminAttendanceManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <ProtectedRoute requiredRoles={["Super Admin"]}>
                <AdminSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/activity-log"
            element={
              <ProtectedRoute requiredRoles={[ "Super Admin"]}>
                <AdminActivityLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute
                requiredRoles={["employee", "Admin", "Super Admin", "PM"]}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/profile"
            element={
              <ProtectedRoute
                requiredRoles={["employee", "Admin", "Super Admin", "PM"]}>
                <EmployeeProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/leave-request"
            element={
              <ProtectedRoute
                requiredRoles={["employee", "Admin", "Super Admin", "PM"]}>
                <EmployeeLeaveRequest showSuccessModal={showSuccessModal} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/attendance"
            element={
              <ProtectedRoute
                requiredRoles={["employee", "Admin", "Super Admin", "PM"]}>
                <EmployeeAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/pm-attendance"
            element={
              <ProtectedRoute
                requiredRoles={["employee", "Admin", "Super Admin", "PM"]}>
                <TeamAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/my-team"
            element={
              <ProtectedRoute
                requiredRoles={["employee", "Admin", "Super Admin", "PM"]}>
                <EmployeeTeamPage />
              </ProtectedRoute>
            }
          />
          <Route path="/403" element={<ForbiddenPage />} />
        </Routes>
        <Toaster />
        <SuccessModal
          isOpen={successModalProps.isOpen}
          onClose={hideSuccessModal}
          title={successModalProps.title}
          description={successModalProps.description}
          leaveRequestNumber={successModalProps.leaveRequestNumber}
        />
      </div>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SuccessModalProvider>
          <Router>
            <AppContent />
          </Router>
        </SuccessModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
