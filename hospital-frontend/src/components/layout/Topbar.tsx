import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ShieldCheck, User as UserIcon, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';

interface TopbarProps {
  /** Called when hamburger icon is pressed on mobile */
  onMobileMenuClick?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMobileMenuClick }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getProfilePath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin':        return '/admin/users';
      case 'doctor':       return '/doctor/profile';
      case 'nurse':        return '/nurse/profile';
      case 'patient':      return '/patient/profile';
      case 'receptionist': return '/reception/profile';
      default:             return '/';
    }
  };

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
      {/* Left side: hamburger (mobile) + status pill (hidden on small) */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible below lg breakpoint */}
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          aria-label="Open navigation menu"
          id="mobile-menu-button"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Status pill — hidden on smallest screens to save space */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden md:inline">System Online • API v1</span>
          <span className="md:hidden">Online</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Bell — connected to /api/v1/notifications */}
        <NotificationBell />

        <div className="h-4 w-px bg-slate-200" />

        {/* Profile Button */}
        {user && (
          <button
            onClick={() => navigate(getProfilePath())}
            className="flex items-center gap-2 sm:gap-2.5 hover:opacity-90 transition-opacity"
            aria-label="Go to profile"
          >
            {/* Name + role — hidden on small phones */}
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">{user.full_name}</p>
              <p className="text-[10px] text-slate-500 capitalize flex items-center justify-end gap-1">
                {user.is_verified && <ShieldCheck className="w-3 h-3 text-teal-600" />}
                {user.role}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center text-sm shadow-subtle">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
