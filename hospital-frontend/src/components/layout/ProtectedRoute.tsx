import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth.types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-teal-700">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their assigned default dashboard if accessing unauthorized route
    const defaultDashboard: Record<UserRole, string> = {
      admin: '/admin/dashboard',
      doctor: '/doctor/dashboard',
      nurse: '/nurse/dashboard',
      patient: '/patient/dashboard',
      receptionist: '/reception/dashboard',
    };
    return <Navigate to={defaultDashboard[user.role] || '/'} replace />;
  }

  return <>{children}</>;
};
