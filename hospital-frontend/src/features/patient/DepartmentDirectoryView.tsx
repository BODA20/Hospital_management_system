import React, { useEffect, useState } from 'react';
import { userService } from '../../services/userService';
import { Department } from '../../types/user.types';
import { Card } from '../../components/ui/Card';
import { Building2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const DepartmentDirectoryView: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    userService
      .getDepartments()
      .then((res) => setDepartments(res.data || []))
      .catch(() => toast.error('Error', 'Failed to load departments.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Hospital Departments</h1>
        <p className="text-xs text-slate-500 mt-1">Explore medical centers of excellence and clinical specialties</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <Card key={dept.id} padding="lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{dept.name_en}</h3>
                {dept.name_ar && <p className="text-xs text-slate-400 font-arabic">{dept.name_ar}</p>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
