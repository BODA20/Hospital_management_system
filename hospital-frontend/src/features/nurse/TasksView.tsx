import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CheckSquare, Clock } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Administer IV Antibiotics to Bed A-101', time: '10:00 AM', status: 'pending' },
    { id: 2, title: 'Post-op Vitals Check for Patient Mary Johnson', time: '11:30 AM', status: 'pending' },
    { id: 3, title: 'Shift Handover Notes Update', time: '02:00 PM', status: 'pending' },
  ]);

  const toast = useToast();

  const handleComplete = (id: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'completed' } : t)));
    toast.success('Task Completed', 'Nurse shift task marked complete.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Nurse Shift Tasks & Duty Checklist</h1>
        <p className="text-xs text-slate-500 mt-1">Scheduled patient checkups, medication administration, and ward duties</p>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card key={task.id} padding="sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{task.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> Due {task.time}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge status={task.status}>{task.status}</Badge>
                {task.status !== 'completed' && (
                  <Button variant="primary" size="sm" onClick={() => handleComplete(task.id)}>
                    Mark Done
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
