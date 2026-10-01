import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Bell, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Topbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getProfilePath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'admin': return '/admin/users';
      case 'doctor': return '/doctor/profile';
      case 'nurse': return '/nurse/profile';
      case 'patient': return '/patient/profile';
      case 'receptionist': return '/reception/profile';
      default: return '/';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-subtle">
      {/* Left title / Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Online • API v1</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        <button
          title="Notifications"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600" />
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Profile Button */}
        {user && (
          <button
            onClick={() => navigate(getProfilePath())}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
          >
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-slate-900 leading-tight">{user.full_name}</p>
              <p className="text-[10px] text-slate-500 capitalize flex items-center justify-end gap-1">
                {user.is_verified && <ShieldCheck className="w-3 h-3 text-teal-600" />}
                {user.role}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center text-sm shadow-subtle">
              <UserIcon className="w-5 h-5" />
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
