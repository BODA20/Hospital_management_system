import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { AdminSummaryStats } from '../../types/dashboard.types';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Users, Stethoscope, HeartPulse, Calendar, DollarSign, UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminSummaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    adminService
      .getAdminSummary()
      .then((res) => setStats(res.data || null))
      .catch(() => setStats(null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Operational Command Center</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time system stats, staff allocations, and clinical activity overview</p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
            Manage Users
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/metrics')}>
            View System Metrics
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Patients"
          value={isLoading ? '...' : stats?.total_patients ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="Active Doctors"
          value={isLoading ? '...' : stats?.total_doctors ?? 0}
          icon={<Stethoscope className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Nurse Staff"
          value={isLoading ? '...' : stats?.total_nurses ?? 0}
          icon={<HeartPulse className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Appointments Today"
          value={isLoading ? '...' : stats?.appointments_today ?? 0}
          icon={<Calendar className="w-5 h-5" />}
          color="slate"
        />
        <StatCard
          title="Monthly Revenue"
          value={isLoading ? '...' : formatCurrency(stats?.revenue_this_month ?? 0)}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Pending Staff Apps"
          value={isLoading ? '...' : stats?.pending_applications ?? 0}
          icon={<UserCheck className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Staff & User Administration</span> <Users className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Provision staff accounts, assign shifts, updates role access levels, and assign doctors/nurses to departments.</p>
          <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => navigate('/admin/users')}>
            <span>Open User Management</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Staff Applications</span> <UserCheck className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Review and process doctor & nurse join applications, approve licenses, and auto-provision profile rows.</p>
          <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => navigate('/admin/applications')}>
            <span>Review Applications ({stats?.pending_applications ?? 0})</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Audit & Security Logs</span> <ShieldAlert className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Monitor compliance, security events, authentication attempts, shift modifications, and billing actions.</p>
          <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => navigate('/admin/audit-logs')}>
            <span>View Audit Logs</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
};
