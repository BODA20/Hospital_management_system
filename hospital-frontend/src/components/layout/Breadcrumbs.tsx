import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length === 0) return null;

  const defaultDashboard: Record<string, string> = {
    admin: '/admin/dashboard',
    doctor: '/doctor/dashboard',
    nurse: '/nurse/dashboard',
    patient: '/patient/dashboard',
    receptionist: '/reception/dashboard',
  };

  const homePath = user?.role ? (defaultDashboard[user.role] || '/') : '/login';

  const sectionRouteMap: Record<string, string> = {
    admin: '/admin/dashboard',
    doctor: '/doctor/dashboard',
    nurse: '/nurse/dashboard',
    patient: '/patient/dashboard',
    reception: '/reception/dashboard',
    billing: '/billing',
  };

  return (
    <nav className="flex items-center text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
      <Link to={homePath} className="hover:text-teal-700 transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
      </Link>

      {pathnames.map((name, index) => {
        const rawRouteTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const routeTo = sectionRouteMap[name] || rawRouteTo;
        const isLast = index === pathnames.length - 1;
        const formattedName = name.replace(/-/g, ' ');

        return (
          <React.Fragment key={rawRouteTo}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-300 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-700 capitalize">{formattedName}</span>
            ) : (
              <Link to={routeTo} className="hover:text-teal-700 transition-colors capitalize">
                {formattedName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

