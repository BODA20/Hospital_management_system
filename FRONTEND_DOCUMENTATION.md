# CareOS Hospital Management System — Frontend Architecture & Developer Guide

> **Version:** 1.0.0 | **Stack:** React 18 + TypeScript + Vite + Tailwind CSS
> **Last Updated:** October 2026 | **Status:** Production-Ready

---

## Table of Contents

1. [Executive Overview & Tech Stack](#1-executive-overview--tech-stack)
2. [Directory & Component Architecture](#2-directory--component-architecture)
3. [Application Bootstrap & Provider Tree](#3-application-bootstrap--provider-tree)
4. [Authentication & RBAC Authorization Flow](#4-authentication--rbac-authorization-flow)
5. [Routing Architecture & Route Protection Matrix](#5-routing-architecture--route-protection-matrix)
6. [Axios HTTP Client & Interceptor Pipeline](#6-axios-http-client--interceptor-pipeline)
7. [Role-Based Workspaces & Feature Breakdown](#7-role-based-workspaces--feature-breakdown)
8. [Service Layer API Reference](#8-service-layer-api-reference)
9. [UI Design System & Component Reference](#9-ui-design-system--component-reference)
10. [Global State Management](#10-global-state-management)
11. [TypeScript Type System](#11-typescript-type-system)
12. [Utility Functions Reference](#12-utility-functions-reference)
13. [Environment Variables & Configuration](#13-environment-variables--configuration)
14. [Development Setup & Build Commands](#14-development-setup--build-commands)
15. [Vite Proxy & WSL Networking](#15-vite-proxy--wsl-networking)
16. [Docker & Production Deployment](#16-docker--production-deployment)
17. [Coding Conventions & Developer Guidelines](#17-coding-conventions--developer-guidelines)

---

## 1. Executive Overview & Tech Stack

CareOS is a full-stack hospital management system. This document covers the **React/TypeScript SPA frontend** (`hospital-frontend/`) that communicates with the Node.js/Express backend via a versioned REST API (`/api/v1`).

### Core Technology Stack

| Category | Technology | Version | Purpose |
|---|---|---|---|
| **UI Framework** | React | ^18.2.0 | Component-based UI rendering |
| **Language** | TypeScript | ^5.0.2 | Static typing, interfaces, type safety |
| **Build Tool** | Vite | ^4.4.5 | Fast HMR dev server, optimized production builds |
| **Styling** | Tailwind CSS | ^3.4.19 | Utility-first CSS, design tokens |
| **Routing** | React Router DOM | ^6.30.4 | Client-side SPA routing, protected routes |
| **HTTP Client** | Axios | ^1.18.1 | API requests, interceptors, token management |
| **Icon Library** | Lucide React | ^1.27.0 | Consistent, accessible SVG icon set |
| **Class Utilities** | clsx + tailwind-merge | ^2.1.1 / ^3.6.0 | Conditional class composition |
| **Linting** | ESLint + TypeScript ESLint | ^8.45.0 | Code quality enforcement |
| **CSS Processing** | PostCSS + Autoprefixer | ^8.5.23 | Cross-browser CSS compatibility |

### Architectural Philosophy

- **Feature-First Organization:** Code is grouped by domain feature (admin, doctor, nurse, patient, reception) rather than by technical layer.
- **Centralized HTTP Client:** A single Axios instance (`apiClient`) handles all API calls with automatic token injection and silent token refresh.
- **Context-Driven Auth State:** React Context API (`AuthContext`) serves as the single source of truth for authentication state, eliminating prop drilling.
- **Role-Based Workspaces:** Each user role renders a completely separate navigation tree and page set, enforced at the router level.
- **Reusable UI Primitives:** A shared component library (`src/components/ui/`) provides consistent, typed UI building blocks across all features.

---

## 2. Directory & Component Architecture

### Full Source Tree

```
hospital-frontend/
├── index.html                      # Vite HTML entry point
├── package.json                    # Dependencies and npm scripts
├── vite.config.ts                  # Vite build config + dev proxy
├── tailwind.config.js              # Tailwind design tokens & theme
├── postcss.config.js               # PostCSS plugin pipeline
├── tsconfig.json                   # TypeScript compiler options
├── tsconfig.node.json              # TypeScript config for Vite node env
├── .eslintrc.cjs                   # ESLint rules
│
└── src/
    ├── main.tsx                    # React DOM entry — mounts <App />
    ├── App.tsx                     # Root provider composition
    ├── App.css                     # App-scoped base styles
    ├── index.css                   # Global Tailwind base + custom animations
    ├── vite-env.d.ts               # Vite import.meta.env type augmentation
    │
    ├── app/
    │   ├── AuthContext.tsx          # Authentication state + token lifecycle
    │   ├── ToastContext.tsx         # Global notification/toast system
    │   └── router.tsx              # All app routes + ProtectedRoute wrappers
    │
    ├── assets/
    │   └── react.svg               # Static assets
    │
    ├── components/
    │   ├── layout/
    │   │   ├── ProtectedRoute.tsx   # Auth + RBAC enforcement wrapper
    │   │   ├── RoleShell.tsx        # Page chrome: Sidebar + Topbar + main content
    │   │   ├── Sidebar.tsx          # Role-aware navigation sidebar
    │   │   ├── Topbar.tsx           # Header bar with workspace label
    │   │   └── Breadcrumbs.tsx      # URL-derived breadcrumb navigation
    │   │
    │   ├── prescription/
    │   │   └── PrescriptionPrint.tsx # Printable prescription document component
    │   │
    │   └── ui/                      # Reusable primitive components
    │       ├── Badge.tsx            # Status/label badges
    │       ├── Button.tsx           # Polymorphic action button
    │       ├── Card.tsx             # Content container card
    │       ├── Input.tsx            # Accessible form text input
    │       ├── Modal.tsx            # Portal-based dialog/modal
    │       ├── Select.tsx           # Accessible dropdown select
    │       ├── Skeleton.tsx         # Loading placeholder animation
    │       ├── StatCard.tsx         # KPI metric display card
    │       ├── Table.tsx            # Generic typed data table
    │       └── Tabs.tsx             # Tab bar with active indicator
    │
    ├── features/                    # Domain feature modules (pages)
    │   ├── admin/
    │   │   ├── AdminDashboard.tsx
    │   │   ├── AuditLogsView.tsx
    │   │   ├── DepartmentsManager.tsx
    │   │   ├── MetricsView.tsx
    │   │   ├── OperationalRequestsView.tsx
    │   │   ├── StaffApplicationsView.tsx
    │   │   └── UsersManagement.tsx
    │   ├── appointments/
    │   │   ├── AppointmentActionPage.tsx
    │   │   ├── CancelAppointmentPage.tsx
    │   │   └── ConfirmAppointmentPage.tsx
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── SignUpPage.tsx
    │   │   ├── VerifyOtpPage.tsx
    │   │   ├── ForgotPasswordPage.tsx
    │   │   ├── ResetPasswordPage.tsx
    │   │   └── VerifyEmailPage.tsx
    │   ├── billing/
    │   │   ├── BillingDashboard.tsx
    │   │   └── StripeCallbackPages.tsx
    │   ├── doctor/
    │   │   ├── DoctorDashboard.tsx
    │   │   ├── TodayScheduleView.tsx
    │   │   └── DoctorAppointmentsView.tsx
    │   ├── nurse/
    │   │   ├── NurseDashboard.tsx
    │   │   ├── VitalsQueueView.tsx
    │   │   ├── BedsView.tsx
    │   │   └── TasksView.tsx
    │   ├── patient/
    │   │   ├── PatientDashboard.tsx
    │   │   ├── DoctorDirectoryView.tsx
    │   │   ├── DepartmentDirectoryView.tsx
    │   │   ├── PatientAppointmentsView.tsx
    │   │   ├── MedicalRecordsView.tsx
    │   │   └── CheckoutView.tsx
    │   ├── profile/
    │   │   └── ProfileView.tsx
    │   └── reception/
    │       ├── ReceptionDashboard.tsx
    │       └── LiveQueueBoard.tsx
    │
    ├── hooks/
    │   ├── useAuth.ts              # Re-export of useAuthContext
    │   └── useToast.ts             # Toast notification helper
    │
    ├── services/
    │   ├── api.ts                  # Re-exports apiClient
    │   ├── apiClient.ts            # Axios instance + interceptors
    │   ├── authService.ts
    │   ├── adminService.ts
    │   ├── appointmentService.ts
    │   ├── billingService.ts
    │   ├── nurseService.ts
    │   ├── receptionService.ts
    │   ├── userService.ts
    │   └── visitService.ts
    │
    ├── types/
    │   ├── api.types.ts
    │   ├── auth.types.ts
    │   ├── appointment.types.ts
    │   ├── billing.types.ts
    │   ├── dashboard.types.ts
    │   ├── user.types.ts
    │   └── visit.types.ts
    │
    └── utils/
        ├── constants.ts
        └── formatters.ts
```

---

## 3. Application Bootstrap & Provider Tree

### Entry Point — `src/main.tsx`

```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Root Provider Composition — `src/App.tsx`

The root `App` component establishes the global provider hierarchy. Order matters: `ToastProvider` wraps `AuthProvider` so that auth events (e.g., logout) can emit toast notifications.

```
<ToastProvider>         ← Global notification system
  <AuthProvider>        ← Authentication state (user, tokens, session)
    <AppRouter />       ← React Router DOM browser router + all routes
  </AuthProvider>
</ToastProvider>
```

### Provider Responsibilities

| Provider | Location | Responsibility |
|---|---|---|
| `ToastProvider` | `app/ToastContext.tsx` | Manages toast queue, renders toast UI, auto-dismiss (4s) |
| `AuthProvider` | `app/AuthContext.tsx` | Token storage, user hydration on refresh, login/logout actions |
| `AppRouter` | `app/router.tsx` | Route definitions, `ProtectedRoute` wrappers, role redirects |

---

## 4. Authentication & RBAC Authorization Flow

### 4.1 Token Storage Strategy

CareOS uses **`localStorage`** for JWT persistence across browser sessions. Three keys are used:

| Key | Value | Written By |
|---|---|---|
| `accessToken` | Short-lived JWT (15–60 min) | `AuthContext.login()` |
| `refreshToken` | Long-lived refresh JWT | `AuthContext.login()` |
| `user` | Serialized `User` object (JSON) | `AuthContext.login()` |

> **Security Note:** `localStorage` is XSS-accessible. The backend enforces `HttpOnly` refresh cookies as an additional layer. The frontend also sends `withCredentials: true` on the Axios instance to support cookie-based refresh.

### 4.2 Session Hydration on Page Refresh

When the application loads, `AuthContext` immediately checks for an existing `accessToken`. If found, it validates it via `GET /users/me` and re-populates the user object:

```
App mounts
  └── AuthContext useEffect fires
        ├── localStorage.getItem('accessToken') found?
        │     YES → authService.getMe() → setUser(res.data) → setIsLoading(false)
        │     NO  → setIsLoading(false)
        └── On getMe() error (token invalid/expired):
              └── Clear all keys → setUser(null) → setIsLoading(false)
```

During `isLoading: true`, `ProtectedRoute` renders a centered spinner to prevent premature route rendering.

### 4.3 AuthContext API

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;       // Derived: !!user
  isLoading: boolean;             // True during session hydration
  login(accessToken, refreshToken, user): void;
  logout(): Promise<void>;
  setUser: Dispatch<...>;         // For profile update side-effects
  hasRole(role: UserRole | UserRole[]): boolean;
}
```

#### `hasRole()` Usage

```typescript
const { hasRole } = useAuth();

if (hasRole('admin')) { /* admin-only UI */ }
if (hasRole(['admin', 'receptionist'])) { /* shared access */ }
```

### 4.4 Authentication Flow Diagrams

#### Login Flow

```
LoginPage
  └── authService.login({ email, password })
        └── POST /api/v1/auth/login
              ├── Success → AuthContext.login(accessToken, refreshToken, user)
              │     ├── Persist to localStorage
              │     └── setUser(user) → navigate to /{role}/dashboard
              └── Error → toast.error("Invalid credentials")
```

#### Registration Flow

```
SignUpPage → POST /auth/signup
  └── navigate('/verify-otp', { state: { email } })

VerifyOtpPage → POST /auth/verify-otp
  └── navigate('/login')
```

#### Password Reset Flow

```
ForgotPasswordPage → POST /auth/forgot-password
  └── Email sent with /reset-password/:token link

ResetPasswordPage → PATCH /auth/reset-password/:token
  └── navigate('/login')
```

### 4.5 Logout Flow

```
User clicks logout (Sidebar)
  └── logout() from useAuth()
        ├── POST /api/v1/auth/logout { refreshToken }
        └── Finally: clear localStorage → setUser(null) → Router → /login
```

---

## 5. Routing Architecture & Route Protection Matrix

### 5.1 ProtectedRoute Component

**File:** `src/components/layout/ProtectedRoute.tsx`

Enforces two access control layers before rendering any protected page:

1. **Authentication check:** Unauthenticated users → redirect to `/login` (preserving `{ from: location }` state).
2. **Authorization check:** Wrong role → redirect to the user's own default dashboard.

```tsx
<ProtectedRoute allowedRoles={['admin', 'receptionist']}>
  <RoleShell>
    <SomePage />
  </RoleShell>
</ProtectedRoute>
```

#### Default Dashboard Redirects by Role

| Role | Default Redirect |
|---|---|
| `admin` | `/admin/dashboard` |
| `doctor` | `/doctor/dashboard` |
| `nurse` | `/nurse/dashboard` |
| `patient` | `/patient/dashboard` |
| `receptionist` | `/reception/dashboard` |

### 5.2 Route Protection Matrix

| Route Path | Allowed Roles | Feature Component |
|---|---|---|
| `/login` | Public | `LoginPage` |
| `/signup` | Public | `SignUpPage` |
| `/verify-otp` | Public | `VerifyOtpPage` |
| `/forgot-password` | Public | `ForgotPasswordPage` |
| `/reset-password/:token` | Public | `ResetPasswordPage` |
| `/verify-email/:token` | Public | `VerifyEmailPage` |
| `/appointments/confirm` | Public | `ConfirmAppointmentPage` |
| `/appointments/cancel` | Public | `CancelAppointmentPage` |
| `/appointment-action` | Public | `AppointmentActionPage` |
| `/billing/success` | Public | `StripeSuccessPage` |
| `/billing/cancel` | Public | `StripeCancelPage` |
| `/admin/dashboard` | `admin` | `AdminDashboard` |
| `/admin/users` | `admin` | `UsersManagement` |
| `/admin/departments` | `admin` | `DepartmentsManager` |
| `/admin/applications` | `admin` | `StaffApplicationsView` |
| `/admin/requests` | `admin` | `OperationalRequestsView` |
| `/admin/audit-logs` | `admin` | `AuditLogsView` |
| `/admin/metrics` | `admin` | `MetricsView` |
| `/doctor/dashboard` | `doctor` | `DoctorDashboard` |
| `/doctor/schedule` | `doctor` | `TodayScheduleView` |
| `/doctor/appointments` | `doctor` | `DoctorAppointmentsView` |
| `/doctor/profile` | `doctor` | `ProfileView` |
| `/nurse/dashboard` | `nurse` | `NurseDashboard` |
| `/nurse/vitals-queue` | `nurse` | `VitalsQueueView` |
| `/nurse/beds` | `nurse` | `BedsView` |
| `/nurse/tasks` | `nurse` | `TasksView` |
| `/nurse/profile` | `nurse` | `ProfileView` |
| `/patient/dashboard` | `patient` | `PatientDashboard` |
| `/patient/doctors` | `patient` | `DoctorDirectoryView` |
| `/patient/departments` | `patient` | `DepartmentDirectoryView` |
| `/patient/my-appointments` | `patient` | `PatientAppointmentsView` |
| `/patient/medical-records` | `patient` | `MedicalRecordsView` |
| `/patient/checkout` | `patient` | `CheckoutView` |
| `/patient/billing` | `patient` | `BillingDashboard` |
| `/patient/profile` | `patient` | `ProfileView` |
| `/reception/dashboard` | `receptionist`, `admin` | `ReceptionDashboard` |
| `/reception/queue` | `receptionist`, `admin`, `nurse` | `LiveQueueBoard` |
| `/reception/profile` | `receptionist`, `admin` | `ProfileView` |
| `/billing` | `admin`, `receptionist`, `patient`, `doctor` | `BillingDashboard` |
| `*` (catch-all) | — | Redirect to `/login` |

### 5.3 RoleShell Layout Wrapper

**File:** `src/components/layout/RoleShell.tsx`

All protected pages are wrapped in `RoleShell`, which provides the standard page chrome:

```
RoleShell
├── <Sidebar />       — Fixed left navigation (role-aware nav links + logout)
└── <div flex-col>
      ├── <Topbar />        — Top header bar
      └── <main>
            ├── <Breadcrumbs />   — URL-based breadcrumb trail
            └── {children}        — Feature page content
```

### 5.4 Sidebar Navigation by Role

#### Admin Navigation

| Label | Route | Lucide Icon |
|---|---|---|
| Overview | `/admin/dashboard` | `LayoutDashboard` |
| Users & Staff | `/admin/users` | `Users` |
| Departments | `/admin/departments` | `Building2` |
| Staff Applications | `/admin/applications` | `UserCheck` |
| Operational Requests | `/admin/requests` | `ClipboardList` |
| Audit Logs | `/admin/audit-logs` | `ShieldAlert` |
| Metrics | `/admin/metrics` | `Activity` |

#### Doctor Navigation

| Label | Route | Lucide Icon |
|---|---|---|
| Dashboard | `/doctor/dashboard` | `LayoutDashboard` |
| Today's Schedule | `/doctor/schedule` | `Calendar` |
| My Appointments | `/doctor/appointments` | `Stethoscope` |
| My Profile | `/doctor/profile` | `User` |

#### Nurse Navigation

| Label | Route | Lucide Icon |
|---|---|---|
| Dashboard | `/nurse/dashboard` | `LayoutDashboard` |
| Vitals Queue | `/nurse/vitals-queue` | `HeartPulse` |
| My Beds | `/nurse/beds` | `Bed` |
| My Tasks | `/nurse/tasks` | `CheckSquare` |
| Nurse Profile | `/nurse/profile` | `User` |

#### Patient Navigation

| Label | Route | Lucide Icon |
|---|---|---|
| Dashboard | `/patient/dashboard` | `LayoutDashboard` |
| Doctors | `/patient/doctors` | `Stethoscope` |
| Departments | `/patient/departments` | `Building2` |
| My Appointments | `/patient/my-appointments` | `Calendar` |
| Medical Records | `/patient/medical-records` | `FileText` |
| Invoices & Billing | `/patient/billing` | `Receipt` |
| My Profile | `/patient/profile` | `User` |

#### Receptionist Navigation

| Label | Route | Lucide Icon |
|---|---|---|
| Dashboard | `/reception/dashboard` | `LayoutDashboard` |
| Live Queue Board | `/reception/queue` | `Users` |
| Billing Invoices | `/billing` | `Receipt` |
| Reception Profile | `/reception/profile` | `User` |

---

## 6. Axios HTTP Client & Interceptor Pipeline

**File:** `src/services/apiClient.ts`

All API communication goes through a single configured Axios instance.

### 6.1 Instance Configuration

```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,    // Defaults to '/api/v1' (proxied by Vite)
  withCredentials: true,    // Send cookies with cross-origin requests
  headers: { 'Content-Type': 'application/json' },
});
```

### 6.2 Request Interceptor — Token Injection

```
Outgoing Request
  └── Check: localStorage['accessToken'] || localStorage['token']
             || sessionStorage['accessToken'] || sessionStorage['token']
        ├── Found → config.headers.Authorization = `Bearer ${token}`
        └── Not Found + protected URL → console.warn(...)
```

Public endpoints skip the warning: `/login`, `/signup`, `/verify-otp`, `/resend-otp`, `/forgot-password`, `/refresh`, `/reset-password`, `/verify-email`.

### 6.3 Response Interceptor — Silent Token Refresh

```
API Response 401
  ├── Is auth endpoint? → Skip retry, reject
  ├── Already retried (_retry)? → Skip retry, reject
  └── Attempt silent refresh:
        POST /api/v1/auth/refresh { refreshToken }
          ├── Success → update accessToken → retry original request
          └── Failure → clear storage → window.location.href = '/login'
```

### 6.4 Error Handling Matrix

| Error | Behavior | User Experience |
|---|---|---|
| `401` on protected route | Silent token refresh + retry | Transparent |
| `401` refresh fails | Clear storage + redirect `/login` | Login page |
| `401` on auth endpoints | Pass through | Form error message |
| `403 Forbidden` | Pass through | Access denied message |
| `400` Validation | Pass through | Field-level errors |
| `500` Server | Pass through | Toast error message |
| Network error | Pass through | Connection error toast |

---

## 7. Role-Based Workspaces & Feature Breakdown

### 7.1 Admin Portal (`/admin/*`)

#### `AdminDashboard` — `/admin/dashboard`
- High-level KPI summary: total users, doctors, nurses, patients, departments, active appointments.
- Source: `adminService.getAdminSummary()` → `GET /dashboard/admin-summary`.
- `StatCard` components with color-coded trend indicators.

#### `UsersManagement` — `/admin/users`
- Full user directory with search and filtering.
- **Create Staff Account:** Modal with name, email, phone, role, shift (Morning/Night), and optional department.
- **Assign Department:** Links a doctor to a department → `PUT /admins/assign-department`.
- **Reassign Shift:** Inline shift change → `PATCH /shifts`.
- **Deactivate User:** Soft-delete → `DELETE /users/:id`.

#### `DepartmentsManager` — `/admin/departments`
- Lists departments with bilingual names (`name_en`, `name_ar`).
- **Create:** `POST /departments` | **Delete:** `DELETE /departments/:id` with confirmation.

#### `StaffApplicationsView` — `/admin/applications`
- External hiring application review pipeline.
- Tabs: All, Pending, Approved, Rejected.
- **Approve/Reject:** `PATCH /staff-applications/:id` with optional rejection reason.

#### `OperationalRequestsView` — `/admin/requests`
- Operational request queue from staff (leave, scheduling).
- **Approve:** `PATCH /staff-requests/:id/approve` | **Reject:** `PATCH /staff-requests/:id/reject`.

#### `AuditLogsView` — `/admin/audit-logs`
- Searchable security event log with action-type filter.
- Source: `GET /audit/security-logs`.
- Color-coded severity via `Badge` status variants.

#### `MetricsView` — `/admin/metrics`
- System-wide analytics: appointment volumes, revenue, staff utilization, visit statistics.
- Source: `GET /metrics/summary`.

---

### 7.2 Reception Workspace (`/reception/*`)

#### `ReceptionDashboard` — `/reception/dashboard`
- Today's scheduled appointments overview.
- **Register Patient:** `POST /reception/patients` (name, phone, national ID).
- **Book Walk-In:** Select doctor → fetch booked slots → pick time → submit → `POST /reception/book-walk-in`.

#### `LiveQueueBoard` — `/reception/queue`
- Real-time view of today's patient queue.
- Shows: queue number, patient name, appointment time, doctor, visit status.
- **Check In:** `PATCH /reception/queue/:appointmentId/check-in`.
- Accessible to: `receptionist`, `admin`, `nurse`.

---

### 7.3 Doctor Portal (`/doctor/*`)

#### `DoctorDashboard` — `/doctor/dashboard`
- KPIs: total appointments, today's count, completed this month.

#### `TodayScheduleView` — `/doctor/schedule`
- Today's appointments in chronological order.
- **Complete Appointment:** `PATCH /appointments/:id/complete`.
- **Update Status:** Confirm, cancel, no-show via `PATCH /appointments/:id/status`.

#### `DoctorAppointmentsView` — `/doctor/appointments`
- Full appointment history with status filter tabs.
- **Reschedule:** `PATCH /appointments/:id/reschedule`.
- Tabs: All, Pending, Confirmed/Scheduled, Completed, Cancelled.

---

### 7.4 Nurse Portal (`/nurse/*`)

#### `NurseDashboard` — `/nurse/dashboard`
- Summary of pending vitals and active bed assignments.

#### `VitalsQueueView` — `/nurse/vitals-queue`
- Patients awaiting vital sign recording (status: `awaiting_vitals`).
- **Record Vitals Fields:** BP, Pulse (bpm), Temperature (°C), Weight (kg), Respiratory Rate.
- Submit: `PATCH /visits/:visitId/vitals` → status transitions to `ready_for_doctor`.
- **Nurse Check-In:** `POST /visits/check-in` — creates a new visit for walk-in patients.

#### `BedsView` — `/nurse/beds`
- Nurse's bed assignments. Source: `GET /nurses/me/beds`.

#### `TasksView` — `/nurse/tasks`
- Assigned care tasks. Source: `GET /nurses/me/tasks`.

---

### 7.5 Patient Portal (`/patient/*`)

#### `PatientDashboard` — `/patient/dashboard`
- Overview of upcoming appointments and recent activity.

#### `DoctorDirectoryView` — `/patient/doctors`
- Browsable doctor list with specialization, fee, and department.
- **Book Appointment Flow:**
  1. Select date
  2. Fetch available slots: `GET /doctors/:id/available-slots`
  3. Select time slot
  4. Enter reason
  5. Submit: `POST /appointments`
- Confirmation email sent with token links.

#### `DepartmentDirectoryView` — `/patient/departments`
- All departments with bilingual names. Source: `GET /departments`.

#### `PatientAppointmentsView` — `/patient/my-appointments`
- Full appointment history with status-filtered tabs.
- Cancel upcoming appointments via `PATCH /appointments/:id/status`.

#### `MedicalRecordsView` — `/patient/medical-records`
- Visit history with vitals and clinical notes.
- Source: `GET /visits/my-records`.
- Shows: diagnosis, treatment plan, vitals (BP, pulse, temp, weight), doctor, visit date.

#### `BillingDashboard` — `/patient/billing`
- Patient invoices with itemized breakdowns.
- Source: `GET /billing/my-bills`.
- **Pay Cash:** `POST /billing/:id/pay` with `payment_method: 'cash'`.
- **Pay Online (Stripe):** `POST /billing/:id/create-checkout-session` → redirect to Stripe Checkout.

---

### 7.6 Shared Features

#### `ProfileView` — `/{role}/profile`
- Shared across all roles.
- **Update Profile:** `PATCH /users/me` (name, phone).
- **Change Password:** `PATCH /auth/change-password`.
- **Request Email Change:** `PATCH /auth/change-email` (sends verification link).

#### Email-Based Appointment Actions (Public)

| Route | Component | Action |
|---|---|---|
| `/appointments/confirm?token=...` | `ConfirmAppointmentPage` | Confirm via email link |
| `/appointments/cancel?token=...` | `CancelAppointmentPage` | Cancel via email link |
| `/appointment-action?action=...` | `AppointmentActionPage` | Generic action router |

---

## 8. Service Layer API Reference

All services use the shared `apiClient` Axios instance. All responses follow `ApiResponse<T>`.

### 8.1 `authService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `signup(data)` | POST | `/auth/signup` | Register new user |
| `verifyOtp(email, otp)` | POST | `/auth/verify-otp` | Verify email OTP |
| `resendOtp(email)` | POST | `/auth/resend-otp` | Resend OTP code |
| `login(credentials)` | POST | `/auth/login` | Authenticate + receive tokens |
| `logout()` | POST | `/auth/logout` | Invalidate refresh token |
| `forgotPassword(email)` | POST | `/auth/forgot-password` | Send reset email |
| `resetPassword(token, password)` | PATCH | `/auth/reset-password/:token` | Set new password |
| `changePassword(current, new)` | PATCH | `/auth/change-password` | Change own password |
| `requestChangeEmail(newEmail)` | PATCH | `/auth/change-email` | Request email change |
| `verifyNewEmail(token)` | GET | `/auth/verify-email/:token` | Confirm email change |
| `getMe()` | GET | `/users/me` | Fetch current user profile |
| `updateProfile(data)` | PATCH | `/users/me` | Update name/phone |

### 8.2 `adminService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `getStaffMembers()` | GET | `/admins/staff` | All staff accounts |
| `createStaffAccount(data)` | POST | `/admins/staff/create` | Create staff member |
| `assignDepartment(doctor_id, dept_id)` | PUT | `/admins/assign-department` | Link doctor to dept |
| `reassignShift(userId, shift)` | PATCH | `/shifts` | Update staff shift |
| `getSecurityLogs(params)` | GET | `/audit/security-logs` | Audit log entries |
| `getAdminSummary()` | GET | `/dashboard/admin-summary` | KPI stats |
| `getDashboardStats(params)` | GET | `/dashboard/stats` | Detailed stats |
| `getMetricsSummary()` | GET | `/metrics/summary` | System metrics |
| `submitStaffApplication(data)` | POST | `/staff-applications` | Submit application |
| `getMyApplications()` | GET | `/staff-applications/me` | Own applications |
| `getAllApplications()` | GET | `/staff-applications` | All applications |
| `processApplication(id, status, reason)` | PATCH | `/staff-applications/:id` | Approve or reject |
| `getStaffRequests()` | GET | `/staff-requests` | Operational requests |
| `createOperationalRequest(role)` | POST | `/staff-requests` | Submit new request |
| `approveStaffRequest(id)` | PATCH | `/staff-requests/:id/approve` | Approve request |
| `rejectStaffRequest(id, reason)` | PATCH | `/staff-requests/:id/reject` | Reject request |

### 8.3 `appointmentService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `createAppointment(data)` | POST | `/appointments` | Book appointment |
| `getMyAppointments()` | GET | `/appointments/me` | Patient's appointments |
| `getDoctorScheduleToday()` | GET | `/appointments/doctor/schedule/today` | Today's schedule |
| `getDoctorAppointments()` | GET | `/appointments/doctor` | All doctor appointments |
| `getAllAppointments()` | GET | `/appointments` | Admin: all appointments |
| `updateAppointmentStatus(id, status)` | PATCH | `/appointments/:id/status` | Change status |
| `completeAppointment(id)` | PATCH | `/appointments/:id/complete` | Mark complete |
| `rescheduleAppointment(id, data)` | PATCH | `/appointments/:id/reschedule` | Reschedule |
| `confirmByToken(token, id)` | POST | `/appointments/confirm` | Token-based confirm |
| `cancelByToken(token, id)` | POST | `/appointments/cancel` | Token-based cancel |

### 8.4 `billingService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `getMyInvoices()` | GET | `/billing/my-bills` | Patient's invoices |
| `getPatientInvoices(patientId)` | GET | `/billing/patient/:id` | Staff: patient invoices |
| `getDailyRevenue()` | GET | `/billing/reports/daily-revenue` | Revenue report |
| `getInvoiceById(id)` | GET | `/billing/:id` | Single invoice |
| `addInvoiceItem(invoiceId, data)` | POST | `/billing/:id/items` | Add line item |
| `processPayment(invoiceId, method)` | POST | `/billing/:id/pay` | Pay cash or card |
| `createCheckoutSession(invoiceId)` | POST | `/billing/:id/create-checkout-session` | Stripe session |

### 8.5 `nurseService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `getVitalsQueue()` | GET | `/nurses/vitals-queue` | Patients needing vitals |
| `getMyBeds()` | GET | `/nurses/me/beds` | Nurse bed assignments |
| `getMyTasks()` | GET | `/nurses/me/tasks` | Nurse task list |

### 8.6 `receptionService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `getDoctors()` | GET | `/reception/doctors` | Available doctors |
| `getTodayQueue(date)` | GET | `/reception/queue/today` | Today's queue |
| `registerPatient(data)` | POST | `/reception/patients` | Walk-in registration |
| `bookWalkIn(data)` | POST | `/reception/book-walk-in` | Book walk-in |
| `getBookedSlots(doctorId, date)` | GET | `/reception/doctors/:id/booked-slots` | Availability |
| `checkIn(appointmentId)` | PATCH | `/reception/queue/:id/check-in` | Patient check-in |

### 8.7 `visitService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `getPendingVisits()` | GET | `/visits/pending` | Awaiting action |
| `getMyVisits()` | GET | `/visits/my-visits` | User's visits |
| `getMyRecords()` | GET | `/visits/my-records` | Patient: medical records |
| `getAllVisits()` | GET | `/visits` | Admin: all visits |
| `getVisitById(id)` | GET | `/visits/:id` | Single visit |
| `getPatientVisitHistory(patientId)` | GET | `/visits/patient/:id` | Patient visit history |
| `createVisit(data)` | POST | `/visits` | Create visit |
| `recordVitals(visitId, vitals)` | PATCH | `/visits/:id/vitals` | Submit vitals |
| `completeVisit(id)` | PATCH | `/visits/:id/complete` | Complete visit |
| `updateVisit(id, data)` | PATCH | `/visits/:id` | Update visit fields |
| `nurseCheckIn(data)` | POST | `/visits/check-in` | Nurse creates visit |
| `getVisitByAppointmentId(apptId)` | GET | `/visits/by-appointment/:id` | Visit by appointment |

### 8.8 `userService`

| Method | HTTP | Endpoint | Description |
|---|---|---|---|
| `getAllUsers()` | GET | `/users` | All users |
| `getUserById(id)` | GET | `/users/:id` | Single user |
| `adminUpdateUser(id, data)` | PATCH | `/users/:id` | Admin update |
| `deactivateUser(id)` | DELETE | `/users/:id` | Soft deactivate |
| `getAllDoctors()` | GET | `/doctors` | All doctor profiles |
| `getDoctorById(id)` | GET | `/doctors/:id` | Single doctor |
| `getMyDoctorProfile()` | GET | `/doctors/me` | Own doctor profile |
| `updateMyDoctorProfile(data)` | PATCH | `/doctors/me` | Update doctor profile |
| `getAvailableSlots(doctorId, date)` | GET | `/doctors/:id/available-slots` | Booking slots |
| `getAllNurses()` | GET | `/nurses` | All nurse profiles |
| `createNurse(data)` | POST | `/nurses` | Create nurse |
| `getMyPatientProfile()` | GET | `/patients/me` | Own patient profile |
| `getAllPatients(params)` | GET | `/patients` | Paginated patients |
| `createPatient(data)` | POST | `/patients` | Create patient |
| `getPatientById(id)` | GET | `/patients/:id` | Single patient |
| `getDepartments()` | GET | `/departments` | All departments |
| `createDepartment(data)` | POST | `/departments` | Create department |
| `deleteDepartment(id)` | DELETE | `/departments/:id` | Delete department |

---

## 9. UI Design System & Component Reference

### 9.1 Color Palette & Design Tokens

CareOS uses a **medical-grade teal/slate color system** defined in `tailwind.config.js`:

#### Primary Brand Colors

| Token | Hex | Usage |
|---|---|---|
| `teal-600` | `#0D9488` | Primary actions, active nav, focus rings |
| `teal-700` | `#0F766E` | Button primary background |
| `teal-800` | `#115E59` | Button primary hover |
| `slate-900` | `#0F172A` | Sidebar background |
| `slate-50` | `#F8FAFC` | Page/body background |

#### Semantic Status Color System

| Category | Statuses | Tailwind Classes |
|---|---|---|
| **Success/Active** | `confirmed`, `completed`, `paid`, `paid_cash`, `paid_online`, `approved`, `verified`, `active` | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| **Warning/In-Progress** | `pending`, `scheduled`, `awaiting_vitals`, `in_progress`, `ready_for_doctor` | `bg-amber-50 text-amber-700 border-amber-200` |
| **Danger/Failed** | `cancelled`, `no_show`, `rejected`, `unpaid`, `deactivated`, `inactive`, `missed` | `bg-rose-50 text-rose-700 border-rose-200` |
| **Info/Default** | Any other status | `bg-teal-50 text-teal-700 border-teal-200` |
| **Neutral/Empty** | null/undefined | `bg-slate-100 text-slate-700 border-slate-200` |

#### Custom Box Shadows

| Token | Usage |
|---|---|
| `shadow-subtle` | Cards, table containers |
| `shadow-card` | Floating panel cards |
| `shadow-floating` | Toasts, dropdowns, tooltips |

#### Typography

- **Font Family:** `Inter` → `system-ui` → `-apple-system` fallback chain
- **Applied globally** in `index.css`: `@apply font-sans antialiased`
- Section labels use `text-xs uppercase tracking-wider font-semibold` for clinical structure

### 9.2 Component API Reference

---

#### `Button`
**File:** `src/components/ui/Button.tsx`

```tsx
<Button
  variant="primary"          // 'primary' | 'teal' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size="md"                  // 'sm' | 'md' | 'lg'
  isLoading={saving}         // Shows Loader2 spinner, disables button
  leftIcon={<Plus />}        // Icon before label
  rightIcon={<ChevronRight />}
  onClick={handleClick}
>
  Save Changes
</Button>
```

| Variant | Background | Text | Use Case |
|---|---|---|---|
| `primary` | `teal-700` | white | Default actions |
| `teal` | `teal-600` | white | Accent actions |
| `secondary` | `slate-100` | `slate-800` | Secondary actions |
| `outline` | white | `slate-700` | Tertiary/alternative |
| `danger` | `rose-600` | white | Destructive actions |
| `ghost` | transparent | `slate-600` | Minimal chrome |

---

#### `Badge`
**File:** `src/components/ui/Badge.tsx`

```tsx
// Auto-mapped status badge (uses getStatusBadgeStyle internally)
<Badge status="completed">Completed</Badge>
<Badge status="pending">Pending</Badge>

// Explicit color variants
<Badge variant="emerald">Approved</Badge>
<Badge variant="amber">In Queue</Badge>
<Badge variant="rose">Rejected</Badge>
<Badge variant="teal">Info</Badge>
<Badge variant="slate">Unknown</Badge>
```

---

#### `Modal`
**File:** `src/components/ui/Modal.tsx`

Portal-rendered dialog. Supports Escape key, backdrop click to close, and scroll locking via `document.body.style.overflow`.

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Create Department"
  subtitle="Add a new hospital department"
  maxWidth="lg"                  // 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  footer={
    <>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button variant="primary" isLoading={saving}>Save</Button>
    </>
  }
>
  {/* Form content */}
</Modal>
```

---

#### `Table<T>`
**File:** `src/components/ui/Table.tsx`

Generic, fully-typed data table with animated loading skeletons and empty state messaging.

```tsx
<Table<User>
  columns={[
    { header: 'Name', accessorKey: 'full_name' },
    { header: 'Role', cell: (row) => <Badge status={row.role}>{row.role}</Badge> },
    { header: 'Actions', cell: (row) => (
      <Button size="sm" onClick={() => edit(row)}>Edit</Button>
    )},
  ]}
  data={users}
  isLoading={loading}
  emptyMessage="No users found"
  onRowClick={(row) => navigate(`/admin/users/${row.id}`)}
/>
```

| Prop | Type | Description |
|---|---|---|
| `columns` | `Column<T>[]` | Header, `accessorKey` or `cell` renderer |
| `data` | `T[]` | Array of typed data objects |
| `isLoading` | `boolean` | Renders 4 skeleton rows while true |
| `emptyMessage` | `string` | Shown when data is empty |
| `onRowClick` | `(row: T) => void` | Optional; adds `cursor-pointer` |

---

#### `Input`
**File:** `src/components/ui/Input.tsx`

Accessible form input with label, error state, helper text, and icon slots. Uses `forwardRef`.

```tsx
<Input
  label="Email Address"
  type="email"
  placeholder="doctor@careos.com"
  error={errors.email}
  helperText="We'll never share your email."
  leftIcon={<Mail className="w-4 h-4" />}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

---

#### `Select`
**File:** `src/components/ui/Select.tsx`

Accessible dropdown with typed options, label, error state. Uses `forwardRef`.

```tsx
<Select
  label="Department"
  options={departments.map(d => ({ label: d.name_en, value: d.id }))}
  placeholder="Select a department..."
  error={errors.department_id}
  value={formData.department_id}
  onChange={(e) => setField('department_id', e.target.value)}
/>
```

---

#### `Card`
**File:** `src/components/ui/Card.tsx`

Content container with optional header, footer, and configurable padding.

```tsx
<Card
  padding="md"                   // 'none' | 'sm' | 'md' | 'lg'
  header={<h2 className="font-semibold">Patient Info</h2>}
  footer={<Button size="sm">Save</Button>}
>
  {/* Content */}
</Card>
```

---

#### `StatCard`
**File:** `src/components/ui/StatCard.tsx`

KPI metric display card for dashboards.

```tsx
<StatCard
  title="Total Appointments"
  value={248}
  icon={<Calendar className="w-5 h-5" />}
  color="teal"                   // 'teal' | 'emerald' | 'amber' | 'rose' | 'slate'
  trend="+12% this month"
  trendType="positive"           // 'positive' | 'negative' | 'neutral'
  subtitle="Since last month"
/>
```

---

#### `Tabs`
**File:** `src/components/ui/Tabs.tsx`

Underline-style tab navigation with optional count badges.

```tsx
<Tabs
  tabs={[
    { id: 'all', label: 'All', count: 48 },
    { id: 'pending', label: 'Pending', count: 12 },
    { id: 'completed', label: 'Completed' },
  ]}
  activeTab={activeTab}
  onChange={setActiveTab}
/>
```

---

#### `Skeleton`
**File:** `src/components/ui/Skeleton.tsx`

Animated loading placeholder — compose multiples to mimic content layout.

```tsx
<Skeleton className="h-4 w-3/4 mb-2" />
<Skeleton className="h-4 w-1/2" />
```

---

### 9.3 Toast Notification System

**File:** `src/app/ToastContext.tsx` | **Hook:** `src/hooks/useToast.ts`

Renders in a fixed bottom-right container. Auto-dismissed after 4 seconds.

```tsx
const toast = useToast();

toast.success('Appointment booked', 'Confirmed for 9:00 AM.');
toast.error('Save failed', 'Please check your connection.');
toast.warning('Session expiring', 'You will be logged out soon.');
toast.info('Queue updated', 'Latest patient arrivals loaded.');
```

| Type | Icon | Border | Use Case |
|---|---|---|---|
| `success` | `CheckCircle2` (emerald) | `emerald-200` | Action completed |
| `error` | `AlertCircle` (rose) | `rose-200` | API failure |
| `warning` | `AlertTriangle` (amber) | `amber-200` | Non-blocking alert |
| `info` | `Info` (teal) | `teal-200` | Informational update |

---

### 9.4 Global CSS & Animations

**File:** `src/index.css`

```css
body {
  @apply bg-slate-50 text-slate-900 font-sans antialiased min-h-screen
    selection:bg-teal-500 selection:text-white;
}

/* Medical-grade custom scrollbars */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #94A3B8; }

/* Page + toast fade animation */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

Applied to `<main>` in `RoleShell` and to every toast notification for a consistent micro-animation.

---

## 10. Global State Management

CareOS uses **React Context API** — no Redux or Zustand. State surface is intentionally minimal.

### State Layers

| Layer | Context | Scope |
|---|---|---|
| Authentication | `AuthContext` | Persisted (localStorage) |
| Notifications | `ToastContext` | Ephemeral, in-memory |
| Page/Feature State | Component `useState` | Local per-page |
| Form State | Component `useState` | Local per-form |

### Custom Hooks

| Hook | Source | Returns |
|---|---|---|
| `useAuth()` | `hooks/useAuth.ts` | `{ user, isAuthenticated, isLoading, login, logout, setUser, hasRole }` |
| `useToast()` | `hooks/useToast.ts` | `{ success, error, warning, info }` |

---

## 11. TypeScript Type System

### `auth.types.ts`

```typescript
type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient' | 'receptionist';

interface User {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  assigned_shift?: 'Morning' | 'Night' | null;
  created_at?: string;
}
```

### `api.types.ts`

```typescript
interface ApiResponse<T = any> {
  status: 'success' | 'fail' | 'error';
  message?: string;
  results?: number;
  data?: T;
}

interface ApiErrorResponse {
  status: 'fail' | 'error';
  message: string;
  errors?: Record<string, string[]>;
}
```

### `appointment.types.ts`

```typescript
type AppointmentStatus =
  | 'pending' | 'confirmed' | 'scheduled'
  | 'completed' | 'cancelled' | 'no_show';

interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  department_id?: number | null;
  appointment_date?: string | null;
  time_slot?: string | null;
  starts_at?: string | null;
  reason?: string | null;
  notes?: string | null;
  status: AppointmentStatus;
  booking_source?: 'online' | 'walk_in';
  queue_number?: number | null;
  payment_status?: 'unpaid' | 'paid_cash' | 'paid_online' | 'paid';
  // Joined fields:
  patient_name?: string;
  doctor_name?: string;
  department_name?: string;
}
```

### `visit.types.ts`

```typescript
type VisitStatus =
  | 'awaiting_vitals' | 'ready_for_doctor'
  | 'in_progress' | 'completed' | 'cancelled';

interface Vitals {
  bp?: string;
  pulse?: number;
  temperature?: number;
  weight?: number;
  respiratory_rate?: number;
}

interface Visit {
  id: number;
  patient_id: number;
  doctor_id: number;
  appointment_id?: number | null;
  reason_for_visit: string;
  diagnosis: string;
  treatment_plan?: string | null;
  notes?: string | null;
  status?: VisitStatus;
  vitals?: Vitals | null;
  check_in_at?: string | null;
  check_out_at?: string | null;
}
```

### `billing.types.ts`

```typescript
type PaymentMethod = 'cash' | 'card' | 'stripe';

interface Invoice {
  id: number;
  patient_id: number;
  visit_id?: number | null;
  total_amount: number;
  final_amount: number;
  status: 'unpaid' | 'paid' | 'cancelled';
  paid_at?: string | null;
  payment_method?: PaymentMethod | null;
  items?: InvoiceItem[];
}
```

### `user.types.ts`

```typescript
interface DoctorProfile {
  id: number;
  user_id: number;
  specialization: string;
  years_of_experience: number;
  consultation_fee: number;
  department_id?: number | null;
  license_number?: string | null;
}

interface PatientProfile {
  id: number;
  user_id: number;
  full_name: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  date_of_birth: string;
  blood_group?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  emergency_contact: string;
}

interface Department {
  id: number;
  name_en: string;
  name_ar?: string | null;
}
```

---

## 12. Utility Functions Reference

**File:** `src/utils/formatters.ts`

| Function | Input Example | Output Example |
|---|---|---|
| `formatDate(dateString?)` | `"2026-10-01T09:30:00Z"` | `"Oct 1, 2026"` |
| `formatDateTime(dateString?)` | `"2026-10-01T09:30:00Z"` | `"Oct 1, 2026, 09:30 AM"` |
| `formatCurrency(amount?)` | `150.5` | `"$150.50"` |
| `formatPhone(phone?)` | `"+1-555-0100"` | `"+1-555-0100"` |
| `getStatusBadgeStyle(status?)` | `"completed"` | `"bg-emerald-50 text-emerald-700 border-emerald-200"` |

**File:** `src/utils/constants.ts`

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const USER_ROLES = {
  ADMIN: 'admin', DOCTOR: 'doctor', NURSE: 'nurse',
  PATIENT: 'patient', RECEPTIONIST: 'receptionist',
} as const;

export const APPOINTMENT_STATUSES = {
  PENDING: 'pending', CONFIRMED: 'confirmed', SCHEDULED: 'scheduled',
  COMPLETED: 'completed', CANCELLED: 'cancelled', NO_SHOW: 'no_show',
} as const;

export const VISIT_STATUSES = {
  AWAITING_VITALS: 'awaiting_vitals', READY_FOR_DOCTOR: 'ready_for_doctor',
  IN_PROGRESS: 'in_progress', COMPLETED: 'completed', CANCELLED: 'cancelled',
} as const;

export const PAYMENT_STATUSES = {
  UNPAID: 'unpaid', PAID_CASH: 'paid_cash',
  PAID_ONLINE: 'paid_online', PAID: 'paid',
} as const;
```

---

## 13. Environment Variables & Configuration

Create a `.env` file in the `hospital-frontend/` directory:

```env
# Only required when NOT using the Vite proxy
# Leave unset in development to use '/api/v1' proxy path
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

> **Note:** In WSL development, leave `VITE_API_BASE_URL` **unset** to let the Vite proxy handle routing. Set it explicitly only for production deployments.

### Environment File Reference

| File | Purpose | Git-tracked? |
|---|---|---|
| `.env` | Local overrides | No (`.gitignore`) |
| `.env.example` | Template for new devs | Yes |
| `.env.production` | Production values | No |

> All browser-accessible vars must be prefixed with `VITE_`.

---

## 14. Development Setup & Build Commands

### Prerequisites

- Node.js ≥ 18.x
- npm ≥ 9.x
- Backend running on `http://localhost:3000` (Docker or local)

### Setup

```bash
cd hospital-frontend
npm install
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server on port `3001` with HMR |
| `npm run build` | Type-check + production bundle → `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run lint` | ESLint across all `.ts`/`.tsx` files |

### Dev Server Details

- **URL:** `http://localhost:3001`
- **Binding:** `0.0.0.0` (Windows browser can access WSL server)
- **Path alias:** `@` → `./src` (e.g., `import { Button } from '@/components/ui/Button'`)

---

## 15. Vite Proxy & WSL Networking

**File:** `hospital-frontend/vite.config.ts`

```typescript
server: {
  port: 3001,
  host: true,      // Bind to 0.0.0.0 for Windows→WSL access
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',  // Backend Express (Docker port 3000)
      changeOrigin: true,
    },
  },
},
```

**Request flow:**

```
Windows Browser (port 3001)
  └── GET /api/v1/users
        └── Vite Dev Server (WSL :3001)
              └── Proxy → http://127.0.0.1:3000/api/v1/users
                    └── Express Backend (Docker :3000)
```

**Benefits:**
- No CORS configuration needed in development
- `withCredentials: true` works (same origin from browser's perspective)
- No `VITE_API_BASE_URL` needed in `.env`

---

## 16. Docker & Production Deployment

### Development with Docker Backend

```bash
# From project root — start all backend services
docker-compose up -d

# Then in WSL — start frontend dev server
cd hospital-frontend && npm run dev
```

### Production Nginx Deployment

```dockerfile
# hospital-frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`nginx.conf` — Required for SPA routing:**

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # React Router — serve index.html for all unknown paths
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend service
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

> **Critical:** `try_files $uri /index.html` is **required** for React Router to handle client-side navigation on page refresh. Without it, any non-root URL refresh returns 404.

---

## 17. Coding Conventions & Developer Guidelines

### File Naming

| Item | Convention | Example |
|---|---|---|
| React components | `PascalCase.tsx` | `UsersManagement.tsx` |
| Custom hooks | `use` prefix + `camelCase.ts` | `useAuth.ts` |
| Service modules | `camelCase` + `Service.ts` | `authService.ts` |
| Type definition files | `camelCase.types.ts` | `auth.types.ts` |
| Utility files | `camelCase.ts` | `formatters.ts` |

### Component Pattern

All feature components use **named exports**:

```tsx
// Correct
export const MyComponent: React.FC<MyComponentProps> = ({ prop }) => {
  return <div>{prop}</div>;
};

// Avoid (only App.tsx and main.tsx use default exports)
export default MyComponent;
```

### Data Fetching Pattern

```tsx
const [data, setData] = useState<User[]>([]);
const [loading, setLoading] = useState(true);
const toast = useToast();

useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await userService.getAllUsers();
      if (res.data) setData(res.data);
    } catch (err: any) {
      toast.error('Failed to load', err?.response?.data?.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### Class Composition

Use `clsx` for conditional Tailwind classes:

```tsx
// Correct
<div className={clsx('base', isActive && 'active', disabled && 'opacity-50')} />

// Avoid
<div className={`base ${isActive ? 'active' : ''}`} />
```

### Import Path Aliases

Use the `@` alias to avoid deep relative imports:

```tsx
// Correct
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

// Avoid
import { useAuth } from '../../../hooks/useAuth';
```

### TypeScript Guidelines

- All component props must have explicit interface definitions.
- Avoid `any` except for untyped third-party data shapes — add a `// TODO: type this` comment.
- Use `ApiResponse<T>` return types on all service methods.
- Prefer `type` for union types and `interface` for object shapes.

---

*This documentation covers the complete CareOS Hospital Management System frontend implementation. For backend API documentation, refer to `API_DOCUMENTATION.md` in the project root.*
