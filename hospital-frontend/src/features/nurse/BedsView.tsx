import React, { useEffect, useState } from 'react';
import { nurseService } from '../../services/nurseService';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Bed, UserCheck } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const BedsView: React.FC = () => {
  const [beds, setBeds] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    nurseService
      .getMyBeds()
      .then((res) => setBeds(res.data || []))
      .catch(() => setBeds([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nurse Bed Wards & Occupancy</h1>
        <p className="text-xs text-slate-500 mt-1">Ward bed allocations, patient admission status, and bed telemetry</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { bed: 'Bed A-101', ward: 'General Ward 1', status: 'occupied', patient: 'John Smith' },
          { bed: 'Bed A-102', ward: 'General Ward 1', status: 'available', patient: null },
          { bed: 'Bed B-201', ward: 'ICU Ward 2', status: 'occupied', patient: 'Mary Johnson' },
          { bed: 'Bed B-202', ward: 'ICU Ward 2', status: 'cleaning', patient: null },
        ].map((item, idx) => (
          <Card key={idx} padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <Bed className="w-5 h-5" />
              </div>
              <Badge status={item.status}>{item.status}</Badge>
            </div>
            <h3 className="font-bold text-slate-900">{item.bed}</h3>
            <p className="text-xs text-slate-500">{item.ward}</p>
            {item.patient && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>{item.patient}</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
