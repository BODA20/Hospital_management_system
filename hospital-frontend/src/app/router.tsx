import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RoleShell } from '../components/layout/RoleShell';

// Auth Pages
import { LoginPage } from '../features/auth/LoginPage';
import { SignUpPage } from '../features/auth/SignUpPage';
import { VerifyOtpPage } from '../features/auth/VerifyOtpPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';

// Shared Profile
import { ProfileView } from '../features/profile/ProfileView';

// Admin Console
import { AdminDashboard } from '../features/admin/AdminDashboard';
import { UsersManagement } from '../features/admin/UsersManagement';
import { DepartmentsManager } from '../features/admin/DepartmentsManager';
import { StaffApplicationsView } from '../features/admin/StaffApplicationsView';
import { OperationalRequestsView } from '../features/admin/OperationalRequestsView';
import { AuditLogsView } from '../features/admin/AuditLogsView';
import { MetricsView } from '../features/admin/MetricsView';

// Doctor Workspace
import { DoctorDashboard } from '../features/doctor/DoctorDashboard';
import { TodayScheduleView } from '../features/doctor/TodayScheduleView';
import { DoctorAppointmentsView } from '../features/doctor/DoctorAppointmentsView';

// Nurse Workspace
import { NurseDashboard } from '../features/nurse/NurseDashboard';
import { VitalsQueueView } from '../features/nurse/VitalsQueueView';
import { BedsView } from '../features/nurse/BedsView';
import { TasksView } from '../features/nurse/TasksView';

// Patient Portal
import { PatientDashboard } from '../features/patient/PatientDashboard';
import { DoctorDirectoryView } from '../features/patient/DoctorDirectoryView';
import { DepartmentDirectoryView } from '../features/patient/DepartmentDirectoryView';
import { PatientAppointmentsView } from '../features/patient/PatientAppointmentsView';
import { MedicalRecordsView } from '../features/patient/MedicalRecordsView';
import { CheckoutView } from '../features/patient/CheckoutView';

// Reception Workspace
import { ReceptionDashboard } from '../features/reception/ReceptionDashboard';
import { LiveQueueBoard } from '../features/reception/LiveQueueBoard';

// Billing & Stripe Callbacks
import { BillingDashboard } from '../features/billing/BillingDashboard';
import { StripeSuccessPage, StripeCancelPage } from '../features/billing/StripeCallbackPages';
import { ConfirmAppointmentPage } from '../features/appointments/ConfirmAppointmentPage';
import { CancelAppointmentPage } from '../features/appointments/CancelAppointmentPage';
import { AppointmentActionPage } from '../features/appointments/AppointmentActionPage';

const router = createBrowserRouter([
  // Public Auth Routes
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/verify-otp', element: <VerifyOtpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password/:token', element: <ResetPasswordPage /> },
  { path: '/verify-email/:token', element: <VerifyEmailPage /> },

  // Public Appointment Action Routes
  { path: '/appointments/confirm', element: <ConfirmAppointmentPage /> },
  { path: '/appointments/cancel', element: <CancelAppointmentPage /> },
  { path: '/appointment-action', element: <AppointmentActionPage /> },

  // Stripe Redirect Callbacks
  { path: '/billing/success', element: <StripeSuccessPage /> },
  { path: '/billing/cancel', element: <StripeCancelPage /> },


  // Admin Workspace (`/admin/*`)
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <RoleShell><AdminDashboard /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <RoleShell><UsersManagement /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/departments',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <RoleShell><DepartmentsManager /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/applications',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <RoleShell><StaffApplicationsView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/requests',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <RoleShell><OperationalRequestsView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/audit-logs',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <RoleShell><AuditLogsView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/metrics',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <RoleShell><MetricsView /></RoleShell>
      </ProtectedRoute>
    ),
  },

  // Doctor Workspace (`/doctor/*`)
  {
    path: '/doctor/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['doctor']}>
        <RoleShell><DoctorDashboard /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor/schedule',
    element: (
      <ProtectedRoute allowedRoles={['doctor']}>
        <RoleShell><TodayScheduleView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor/appointments',
    element: (
      <ProtectedRoute allowedRoles={['doctor']}>
        <RoleShell><DoctorAppointmentsView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/doctor/profile',
    element: (
      <ProtectedRoute allowedRoles={['doctor']}>
        <RoleShell><ProfileView /></RoleShell>
      </ProtectedRoute>
    ),
  },

  // Nurse Workspace (`/nurse/*`)
  {
    path: '/nurse/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['nurse']}>
        <RoleShell><NurseDashboard /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/nurse/vitals-queue',
    element: (
      <ProtectedRoute allowedRoles={['nurse']}>
        <RoleShell><VitalsQueueView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/nurse/beds',
    element: (
      <ProtectedRoute allowedRoles={['nurse']}>
        <RoleShell><BedsView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/nurse/tasks',
    element: (
      <ProtectedRoute allowedRoles={['nurse']}>
        <RoleShell><TasksView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/nurse/profile',
    element: (
      <ProtectedRoute allowedRoles={['nurse']}>
        <RoleShell><ProfileView /></RoleShell>
      </ProtectedRoute>
    ),
  },

  // Patient Portal (`/patient/*`)
  {
    path: '/patient/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><PatientDashboard /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/doctors',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><DoctorDirectoryView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/departments',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><DepartmentDirectoryView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/my-appointments',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><PatientAppointmentsView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/medical-records',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><MedicalRecordsView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/checkout',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><CheckoutView /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/billing',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><BillingDashboard /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/patient/profile',
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <RoleShell><ProfileView /></RoleShell>
      </ProtectedRoute>
    ),
  },

  // Reception Workspace (`/reception/*`)
  {
    path: '/reception/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
        <RoleShell><ReceptionDashboard /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/reception/queue',
    element: (
      <ProtectedRoute allowedRoles={['receptionist', 'admin', 'nurse']}>
        <RoleShell><LiveQueueBoard /></RoleShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/reception/profile',
    element: (
      <ProtectedRoute allowedRoles={['receptionist', 'admin']}>
        <RoleShell><ProfileView /></RoleShell>
      </ProtectedRoute>
    ),
  },

  // Billing Module
  {
    path: '/billing',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'receptionist', 'patient', 'doctor']}>
        <RoleShell><BillingDashboard /></RoleShell>
      </ProtectedRoute>
    ),
  },

  // Default Fallback
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
