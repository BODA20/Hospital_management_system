import React, { useEffect, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { userService } from '../../services/userService';
import { Appointment } from '../../types/appointment.types';
import { PatientProfile } from '../../types/user.types';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, Column } from '../../components/ui/Table';
import { Calendar, Stethoscope, FileText, Plus, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '../../utils/formatters';

export const PatientDashboard: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      appointmentService.getMyAppointments().catch(() => ({ data: [] })),
      userService.getMyPatientProfile().catch(() => ({ data: null })),
    ])
      .then(([appRes, profRes]) => {
        setAppointments(appRes.data || []);
        setProfile(profRes.data || null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const upcomingCount = appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending').length;

  const columns: Column<Appointment>[] = [
    {
      header: 'Doctor Name',
      cell: (a) => (
        <div>
          <p className="font-bold text-slate-900">{a.doctor_name || `Doctor #${a.doctor_id}`}</p>
          <p className="text-xs text-slate-400">{a.doctor_specialization || 'Specialist'}</p>
        </div>
      ),
    },
    {
      header: 'Date & Time',
      cell: (a) => (
        <div>
          <p className="font-semibold text-slate-900">{formatDate(a.appointment_date)}</p>
          <p className="text-xs text-slate-400 font-mono">{a.time_slot || '09:00'}</p>
        </div>
      ),
    },
    {
      header: 'Queue #',
      cell: (a) => <span className="font-mono font-bold text-teal-700">#{a.queue_number || '—'}</span>,
    },
    {
      header: 'Status',
      cell: (a) => <Badge status={a.status}>{a.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Patient Health Portal</h1>
          <p className="text-xs text-slate-500 mt-1">Book appointments, track live queue status, and access medical records</p>
        </div>

        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => navigate('/patient/doctors')}>
          Book New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Upcoming Appointments"
          value={isLoading ? '...' : upcomingCount}
          icon={<Calendar className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="Total Consultations"
          value={isLoading ? '...' : appointments.length}
          icon={<Stethoscope className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Medical Profile Status"
          value={profile?.blood_group ? `Blood Group ${profile.blood_group}` : 'Registered'}
          icon={<User className="w-5 h-5" />}
          color="amber"
        />
      </div>

      <Card header={<div className="font-bold text-slate-900 text-sm">My Scheduled Appointments</div>}>
        <Table columns={columns} data={appointments} isLoading={isLoading} emptyMessage="No appointments booked yet." />
      </Card>
    </div>
  );
};
