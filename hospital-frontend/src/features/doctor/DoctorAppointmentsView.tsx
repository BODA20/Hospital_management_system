import React, { useEffect, useState } from 'react';
import { appointmentService } from '../../services/appointmentService';
import { Appointment } from '../../types/appointment.types';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';

export const DoctorAppointmentsView: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    appointmentService
      .getDoctorAppointments()
      .then((res) => setAppointments(res.data || []))
      .catch(() => toast.error('Error', 'Failed to fetch doctor appointments history.'))
      .finally(() => setIsLoading(false));
  }, []);

  const columns: Column<Appointment>[] = [
    { header: 'ID', accessorKey: 'id', className: 'w-16 font-mono text-xs' },
    {
      header: 'Patient',
      cell: (a) => (
        <div>
          <p className="font-bold text-slate-900">{a.patient_name || `Patient #${a.patient_id}`}</p>
          <p className="text-xs text-slate-400">{a.patient_phone || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Date & Time',
      cell: (a) => (
        <div>
          <p className="font-semibold text-slate-900">{formatDate(a.appointment_date)}</p>
          <p className="text-xs text-slate-400 font-mono">{a.time_slot || '08:00'}</p>
        </div>
      ),
    },
    {
      header: 'Reason',
      cell: (a) => <span className="text-xs text-slate-600">{a.reason || 'General Consult'}</span>,
    },
    {
      header: 'Booking Source',
      cell: (a) => <span className="text-xs uppercase font-bold text-slate-400">{a.booking_source || 'online'}</span>,
    },
    {
      header: 'Status',
      cell: (a) => <Badge status={a.status}>{a.status}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">All Doctor Appointments History</h1>
        <p className="text-xs text-slate-500 mt-1">Complete historical record of all assigned patient appointments</p>
      </div>

      <Table columns={columns} data={appointments} isLoading={isLoading} emptyMessage="No appointments recorded." />
    </div>
  );
};
