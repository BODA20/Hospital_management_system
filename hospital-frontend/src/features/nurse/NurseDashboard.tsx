import React, { useEffect, useState } from 'react';
import { nurseService } from '../../services/nurseService';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HeartPulse, Bed, CheckSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NurseDashboard: React.FC = () => {
  const [vitalsQueueCount, setVitalsQueueCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    nurseService
      .getVitalsQueue()
      .then((res) => setVitalsQueueCount(res.data?.length || 0))
      .catch(() => setVitalsQueueCount(0))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nurse Station Command Center</h1>
          <p className="text-xs text-slate-500 mt-1">Patient triage, vitals recording queue, bed allocations, and shift tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Awaiting Vitals Queue"
          value={isLoading ? '...' : vitalsQueueCount}
          icon={<HeartPulse className="w-5 h-5" />}
          color="rose"
        />
        <StatCard
          title="Assigned Bed Wards"
          value={4}
          icon={<Bed className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="Shift Care Tasks"
          value={8}
          icon={<CheckSquare className="w-5 h-5" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Vitals Queue</span> <HeartPulse className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Record BP, pulse, temp, weight, and respiratory rate for today's arriving patients.</p>
          <Button variant="primary" size="sm" className="w-full justify-between" onClick={() => navigate('/nurse/vitals-queue')}>
            <span>Open Vitals Queue ({vitalsQueueCount})</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Bed Ward Assignments</span> <Bed className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Manage ward bed availability, patient bed assignments, and occupancy status.</p>
          <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => navigate('/nurse/beds')}>
            <span>View Assigned Beds</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>

        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center justify-between"><span>Nurse Tasks</span> <CheckSquare className="w-4 h-4 text-teal-600" /></div>}>
          <p className="text-xs text-slate-500 mb-4">Shift duties, medication administration schedules, and patient monitoring checkups.</p>
          <Button variant="outline" size="sm" className="w-full justify-between" onClick={() => navigate('/nurse/tasks')}>
            <span>View Shift Tasks</span> <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    </div>
  );
};
