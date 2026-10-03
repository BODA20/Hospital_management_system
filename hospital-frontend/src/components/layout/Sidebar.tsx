import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCheck,
  Building2,
  Receipt,
  FileText,
  ShieldAlert,
  Activity,
  Bed,
  CheckSquare,
  Stethoscope,
  ClipboardList,
  User,
  HeartPulse,
  LogOut,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  /** Whether the mobile overlay is open */
  mobileOpen?: boolean;
  /** Called when the user dismisses the mobile sidebar */
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onMobileClose }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const role = user.role;

  const navItemsByRole: Record<string, { label: string; to: string; icon: React.ReactNode }[]> = {
    admin: [
      { label: 'Overview', to: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Users & Staff', to: '/admin/users', icon: <Users className="w-4 h-4" /> },
      { label: 'Departments', to: '/admin/departments', icon: <Building2 className="w-4 h-4" /> },
      { label: 'Staff Applications', to: '/admin/applications', icon: <UserCheck className="w-4 h-4" /> },
      { label: 'Operational Requests', to: '/admin/requests', icon: <ClipboardList className="w-4 h-4" /> },
      { label: 'Audit Logs', to: '/admin/audit-logs', icon: <ShieldAlert className="w-4 h-4" /> },
      { label: 'Metrics', to: '/admin/metrics', icon: <Activity className="w-4 h-4" /> },
    ],
    doctor: [
      { label: 'Dashboard', to: '/doctor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Today's Schedule", to: '/doctor/schedule', icon: <Calendar className="w-4 h-4" /> },
      { label: 'My Appointments', to: '/doctor/appointments', icon: <Stethoscope className="w-4 h-4" /> },
      { label: 'My Profile', to: '/doctor/profile', icon: <User className="w-4 h-4" /> },
    ],
    nurse: [
      { label: 'Dashboard', to: '/nurse/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Vitals Queue', to: '/nurse/vitals-queue', icon: <HeartPulse className="w-4 h-4" /> },
      { label: 'My Beds', to: '/nurse/beds', icon: <Bed className="w-4 h-4" /> },
      { label: 'My Tasks', to: '/nurse/tasks', icon: <CheckSquare className="w-4 h-4" /> },
      { label: 'Nurse Profile', to: '/nurse/profile', icon: <User className="w-4 h-4" /> },
    ],
    patient: [
      { label: 'Dashboard', to: '/patient/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Doctors', to: '/patient/doctors', icon: <Stethoscope className="w-4 h-4" /> },
      { label: 'Departments', to: '/patient/departments', icon: <Building2 className="w-4 h-4" /> },
      { label: 'My Appointments', to: '/patient/my-appointments', icon: <Calendar className="w-4 h-4" /> },
      { label: 'Medical Records', to: '/patient/medical-records', icon: <FileText className="w-4 h-4" /> },
      { label: 'Invoices & Billing', to: '/patient/billing', icon: <Receipt className="w-4 h-4" /> },
      { label: 'My Profile', to: '/patient/profile', icon: <User className="w-4 h-4" /> },
    ],
    receptionist: [
      { label: 'Dashboard', to: '/reception/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: 'Live Queue Board', to: '/reception/queue', icon: <Users className="w-4 h-4" /> },
      { label: 'Billing Invoices', to: '/billing', icon: <Receipt className="w-4 h-4" /> },
      { label: 'Reception Profile', to: '/reception/profile', icon: <User className="w-4 h-4" /> },
    ],
  };

  const currentNav = navItemsByRole[role] || [];

  const sidebarContent = (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between h-full border-r border-slate-800">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold shadow-sm">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white text-base leading-tight tracking-tight">CareOS</h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Hospital Mgmt System</p>
          </div>
          {/* Close button — only shown on mobile */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Workspace Role Label */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Workspace</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 capitalize">
            {role}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {currentNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onMobileClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]',
                  isActive
                    ? 'bg-teal-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                )
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-teal-400 text-xs shrink-0">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop: static sidebar ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-64 shrink-0 h-screen sticky top-0 z-30">
        {sidebarContent}
      </div>

      {/* ── Mobile: overlay sidebar ──────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Sidebar panel */}
          <div className="relative z-50 flex h-full w-64 max-w-[80vw]">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
