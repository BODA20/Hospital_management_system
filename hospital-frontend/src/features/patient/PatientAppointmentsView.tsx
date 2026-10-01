import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import { Appointment } from '../../types/appointment.types';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/formatters';
import { XCircle, CheckCircle2, Calendar, Clock, DollarSign } from 'lucide-react';

// Booking confirmation banner — shown when navigated from DoctorDirectoryView
interface BookingState {
  justBooked?: boolean;
  doctorName?: string;
  timeSlot?: string;
  appointmentDate?: string;
  fee?: number;
}

export const PatientAppointmentsView: React.FC = () => {
  const location = useLocation();
  const bookingState = (location.state as BookingState) || {};
  const [showBanner, setShowBanner] = useState(!!bookingState.justBooked);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await appointmentService.getMyAppointments();
      setAppointments(res.data || []);
    } catch {
      toast.error('Error', 'Failed to load appointments history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // Auto-dismiss banner after 8 seconds
    if (bookingState.justBooked) {
      const t = setTimeout(() => setShowBanner(false), 8000);
      return () => clearTimeout(t);
    }
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await appointmentService.updateAppointmentStatus(id, 'cancelled', 'Cancelled by patient');
      toast.info('Cancelled', 'Appointment cancelled successfully.');
      fetchAppointments();
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to cancel appointment.');
    }
  };

  const columns: Column<Appointment>[] = [
    { header: 'ID', accessorKey: 'id', className: 'w-16 font-mono text-xs' },
    {
      header: 'Doctor Specialist',
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
      header: 'Queue Position',
      cell: (a) => <span className="font-mono font-bold text-teal-700">#{a.queue_number || '—'}</span>,
    },
    {
      header: 'Status',
      cell: (a) => <Badge status={a.status}>{a.status}</Badge>,
    },
    {
      header: 'Actions',
      cell: (a) =>
        a.status === 'confirmed' || a.status === 'pending' ? (
          <Button variant="danger" size="sm" onClick={() => handleCancel(a.id)}>
            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">My Appointments</h1>
        <p className="text-xs text-slate-500 mt-1">Full history and upcoming appointment bookings</p>
      </div>

      {/* ── Post-booking Confirmation Banner ─────────────────────────────────── */}
      {showBanner && bookingState.justBooked && (
        <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-4 shadow-sm animate-fade-in">
          {/* Green pulse icon */}
          <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-emerald-900 text-sm">Appointment Confirmed! 🎉</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Your booking with <strong>{bookingState.doctorName}</strong> has been successfully placed.
            </p>

            <div className="flex flex-wrap gap-4 mt-2.5 text-xs text-emerald-800">
              {bookingState.appointmentDate && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {bookingState.appointmentDate}
                </span>
              )}
              {bookingState.timeSlot && (
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {bookingState.timeSlot}
                </span>
              )}
              {bookingState.fee !== undefined && (
                <span className="flex items-center gap-1.5 font-medium">
                  <DollarSign className="w-3.5 h-3.5" />
                  Fee: ${bookingState.fee}
                </span>
              )}
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setShowBanner(false)}
            className="shrink-0 text-emerald-400 hover:text-emerald-600 transition-colors p-1"
            aria-label="Dismiss"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <Table columns={columns} data={appointments} isLoading={isLoading} emptyMessage="No appointments found." />
    </div>
  );
};
