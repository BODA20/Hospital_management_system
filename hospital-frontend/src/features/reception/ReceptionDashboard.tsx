import React, { useEffect, useState } from 'react';
import { receptionService } from '../../services/receptionService';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, UserPlus, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ReceptionDashboard: React.FC = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    receptionService
      .getTodayQueue()
      .then((res) => setQueue(res.data || []))
      .catch(() => setQueue([]))
      .finally(() => setIsLoading(false));
  }, []);

  const totalPatients = queue.reduce((acc, doc) => acc + (doc.appointments?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Front Desk Reception Workspace</h1>
          <p className="text-xs text-slate-500 mt-1">Walk-in patient registration, atomic queue allocation, and live queue board</p>
        </div>
        <Button variant="primary" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => navigate('/reception/queue')}>
          Open Live Queue Board
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Doctors On Duty"
          value={isLoading ? '...' : queue.length}
          icon={<Users className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="Today's Total Queue"
          value={isLoading ? '...' : totalPatients}
          icon={<Calendar className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Reception Desk Status"
          value="Online"
          icon={<UserPlus className="w-5 h-5" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Live Queue Board & Walk-in Booking</span> <Users className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Register new walk-in patients without OTP, assign atomic queue numbers, and monitor doctor queues.</p>
          <Button variant="primary" size="sm" className="w-full justify-between" onClick={() => navigate('/reception/queue')}>
            <span>Open Queue Board</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Billing & Invoices</span> <Users className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Process cash/card payments for walk-in patient consultations and invoice items.</p>
          <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => navigate('/billing')}>
            <span>Open Billing Console</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
};
