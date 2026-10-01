import React, { useCallback, useEffect, useRef, useState } from 'react';
import { receptionService } from '../../services/receptionService';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../hooks/useToast';
import {
  UserPlus, Calendar, Stethoscope, Clock, CheckCircle2,
  Printer, Smartphone, UserCheck, RefreshCw, Wifi,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { visitService } from '../../services/visitService';
import { PrescriptionPrint, PrescriptionData } from '../../components/prescription/PrescriptionPrint';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatSlot12H = (slot: string): string => {
  if (!slot) return '';
  const [hStr, mStr = '00'] = slot.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return slot;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${mStr} ${ampm}`;
};

const generateShiftSlots = (shift?: string): string[] => {
  const isNight = shift === 'Night';
  const startHour = isNight ? 16 : 8;
  const endHour = isNight ? 24 : 16;
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    const hStr = h < 10 ? `0${h}` : `${h}`;
    slots.push(`${hStr}:00`);
    slots.push(`${hStr}:30`);
  }
  return slots;
};

// ─── Source Badge ─────────────────────────────────────────────────────────────

const isOnlineSource = (src?: string) =>
  ['online', 'app'].includes(String(src || '').toLowerCase().trim());

const SourceBadge: React.FC<{ source: string; checkedIn?: boolean }> = ({ source, checkedIn }) => {
  const isOnline = isOnlineSource(source);
  return (
    <span
      className={[
        'inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
        isOnline
          ? 'bg-violet-50 text-violet-700 border-violet-200'
          : 'bg-slate-100 text-slate-500 border-slate-200',
      ].join(' ')}
    >
      {isOnline ? <Smartphone className="w-2.5 h-2.5" /> : <UserCheck className="w-2.5 h-2.5" />}
      {isOnline ? 'App Booking' : 'Walk-in'}
      {isOnline && checkedIn && (
        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
      )}
    </span>
  );
};

// ─── Appointment Row ──────────────────────────────────────────────────────────

interface AppointmentRowProps {
  app: any;
  docQueue: any;
  onCheckIn: (id: number) => void;
  isCheckingIn: boolean;
  onPrintRx: (app: any, docQueue: any) => void;
  rxLoading: number | null;
}

const AppointmentRow: React.FC<AppointmentRowProps> = ({
  app, docQueue, onCheckIn, isCheckingIn, onPrintRx, rxLoading,
}) => {
  const isOnline = isOnlineSource(app.booking_source);
  const isArrived = app.queue_status === 'arrived';
  const needsCheckIn = isOnline && !isArrived && !['completed', 'in_progress', 'missed'].includes(app.status);

  return (
    <div
      className={[
        'p-3 rounded-xl border flex items-start gap-3 text-xs transition-all duration-200',
        needsCheckIn
          ? 'bg-violet-50/60 border-violet-200'
          : 'bg-slate-50 border-slate-200/60',
      ].join(' ')}
    >
      {/* Queue number bubble */}
      <span
        className={[
          'min-w-[2rem] h-8 rounded-lg font-mono font-bold flex items-center justify-center text-xs flex-shrink-0',
          app.status === 'completed'
            ? 'bg-emerald-100 text-emerald-700'
            : needsCheckIn
            ? 'bg-violet-100 text-violet-700'
            : 'bg-teal-600 text-white',
        ].join(' ')}
      >
        #{app.queue_number ?? '—'}
      </span>

      {/* Patient info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-bold text-slate-900 truncate">{app.patient_name}</p>
          <SourceBadge source={app.booking_source} checkedIn={isArrived} />
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5">{app.patient_phone}</p>

        {/* Scheduled slot */}
        {app.time_slot && (
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <span className={[
              'text-[10px] font-semibold',
              needsCheckIn ? 'text-violet-600' : 'text-slate-500',
            ].join(' ')}>
              {needsCheckIn ? 'Scheduled: ' : ''}{formatSlot12H(app.time_slot)}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Check-In button — only for unconfirmed online patients */}
        {needsCheckIn && (
          <button
            onClick={() => onCheckIn(app.id)}
            disabled={isCheckingIn}
            className="flex items-center gap-1 text-[10px] font-bold text-white bg-violet-600 hover:bg-violet-700 active:scale-95 border border-violet-600 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
            title="Mark patient as arrived at desk"
          >
            <CheckCircle2 className="w-3 h-3" />
            {isCheckingIn ? 'Checking...' : 'Check-In'}
          </button>
        )}

        {/* Arrived chip — already checked in */}
        {isOnline && isArrived && !['completed', 'in_progress'].includes(app.status) && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
            <CheckCircle2 className="w-3 h-3" /> Arrived
          </span>
        )}

        {/* Print Rx for completed appointments */}
        {app.status === 'completed' && (
          <button
            onClick={() => onPrintRx(app, docQueue)}
            disabled={rxLoading === app.id}
            className="flex items-center gap-1 text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
            title="Print Prescription"
          >
            <Printer className="w-3 h-3" />
            {rxLoading === app.id ? '...' : 'Print Rx'}
          </button>
        )}

        <Badge status={app.status}>{app.status}</Badge>
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 10_000; // 10-second auto-refresh

export const LiveQueueBoard: React.FC = () => {
  const [queueData, setQueueData] = useState<any[]>([]);
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [checkingInId, setCheckingInId] = useState<number | null>(null);

  // Quick Register Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNationalId, setRegNationalId] = useState('');

  // Walk-in Booking Modal
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [bookPatientName, setBookPatientName] = useState('');
  const [bookPatientPhone, setBookPatientPhone] = useState('');
  const [bookDoctorId, setBookDoctorId] = useState('');
  const [bookDate, setBookDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookSlot, setBookSlot] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid_cash' | 'unpaid' | 'paid_online'>('paid_cash');
  const [availableSlots, setAvailableSlots] = useState<{ value: string; label: string; disabled: boolean }[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);

  // Prescription print overlay
  const [rxData, setRxData] = useState<PrescriptionData | null>(null);
  const [rxLoading, setRxLoading] = useState<number | null>(null);

  const toast = useToast();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data fetcher ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const localDate = `${year}-${month}-${day}`;

      const [qRes, dRes] = await Promise.all([
        receptionService.getTodayQueue(localDate),
        receptionService.getDoctors(),
      ]);
      setQueueData(qRes.data || []);
      setDoctorsList(dRes.data || []);
      setLastRefreshed(new Date());
    } catch {
      if (!silent) toast.error('Error', 'Failed to load live queue board data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load + auto-poll every 10 s
  useEffect(() => {
    fetchData();
    pollingRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchData]);

  // Dynamic slot availability fetch when Doctor or Date changes
  useEffect(() => {
    if (!bookDoctorId || !bookDate) {
      setAvailableSlots([]);
      return;
    }

    setIsFetchingSlots(true);
    receptionService
      .getBookedSlots(Number(bookDoctorId), bookDate)
      .then((res) => {
        const { bookedSlots = [], shift = 'Morning' } = res.data || {};
        const allSlots = generateShiftSlots(shift);
        const bookedNormalized = (bookedSlots as string[]).map((s) => s.slice(0, 5));

        const slotOptions = allSlots.map((s) => {
          const isBooked = bookedNormalized.includes(s);
          return {
            value: s,
            label: `${formatSlot12H(s)} ${isBooked ? '(Already Booked)' : ''}`,
            disabled: isBooked,
          };
        });

        setAvailableSlots(slotOptions);
        const firstAvailable = slotOptions.find((opt) => !opt.disabled);
        if (firstAvailable) {
          setBookSlot(firstAvailable.value);
        } else {
          setBookSlot('');
        }
      })
      .catch(() => {
        setAvailableSlots([]);
      })
      .finally(() => setIsFetchingSlots(false));
  }, [bookDoctorId, bookDate]);

  // ── Check-In handler ──────────────────────────────────────────────────────
  const handleCheckIn = async (appointmentId: number) => {
    setCheckingInId(appointmentId);
    try {
      await receptionService.checkIn(appointmentId);
      toast.success('Patient Checked In ✅', 'Patient has been marked as arrived and added to the nurse queue.');
      // Optimistic refresh
      await fetchData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to check in patient.';
      toast.error('Check-In Error', msg);
    } finally {
      setCheckingInId(null);
    }
  };

  // ── Registration handler ──────────────────────────────────────────────────
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await receptionService.registerPatient({
        full_name: regName,
        phone: regPhone,
        national_id: regNationalId,
      });

      const patData = res.data?.patient;
      toast.success('Patient Registered', `Patient #${patData?.id} registered successfully.`);
      setBookPatientName(patData?.full_name || regName);
      setBookPatientPhone(patData?.phone || regPhone);
      setIsRegisterOpen(false);
      setIsBookOpen(true);
    } catch (err: any) {
      toast.error('Registration Failed', err.response?.data?.message || 'Failed to register walk-in patient.');
    }
  };

  // ── Walk-in booking handler ───────────────────────────────────────────────
  const handleBookWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await receptionService.bookWalkIn({
        full_name: bookPatientName.trim(),
        phone: bookPatientPhone.trim(),
        doctor_id: Number(bookDoctorId),
        appointment_date: bookDate,
        time_slot: bookSlot,
        payment_status: paymentStatus,
      });

      const queueNum = res.data?.queue_number;
      toast.success('Walk-In Booked!', `Queue #${queueNum} assigned for ${bookPatientName}.`);
      setBookPatientName('');
      setBookPatientPhone('');
      setBookDoctorId('');
      setIsBookOpen(false);
      fetchData(true);
    } catch (err: any) {
      toast.error('Booking Error', err.response?.data?.message || 'Failed to book walk-in appointment.');
    }
  };

  // ── Print Rx ──────────────────────────────────────────────────────────────
  const handlePrintRx = async (app: any, docQueue?: any) => {
    setRxLoading(app.id);
    try {
      const res = await visitService.getVisitByAppointmentId(app.id);
      const visit = res.data;
      setRxData({
        appointmentId:        app.id,
        appointmentDate:      app.appointment_date || app.starts_at?.split('T')[0],
        queueNumber:          app.queue_number,
        doctorName:           app.doctor_name || docQueue?.doctor_name || 'Doctor',
        doctorSpecialization: app.doctor_specialization || docQueue?.doctor_specialization,
        doctorDepartment:     app.department_name || docQueue?.department_name,
        patientName:          app.patient_name || `Patient #${app.patient_id}`,
        patientPhone:         app.patient_phone,
        reasonForVisit:       (visit as any)?.chief_complaint ?? (visit as any)?.reason_for_visit ?? undefined,
        diagnosis:            (visit as any)?.diagnosis ?? 'See clinical notes',
        treatmentPlan:        (visit as any)?.treatment_plan ?? undefined,
        notes:                (visit as any)?.notes ?? undefined,
        printedAt:            new Date().toISOString(),
      });
    } catch {
      toast.error('Print Error', 'Could not load the prescription. Please try again.');
    } finally {
      setRxLoading(null);
    }
  };

  // ── Summary counters ──────────────────────────────────────────────────────
  const allAppts = queueData.flatMap((d) => d.appointments ?? []);
  const onlineCount = allAppts.filter((a) => isOnlineSource(a.booking_source)).length;
  const awaitingCheckIn = allAppts.filter(
    (a) => isOnlineSource(a.booking_source) && a.queue_status !== 'arrived' && !['completed', 'in_progress', 'cancelled', 'missed'].includes(String(a.status || '').toLowerCase())
  ).length;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Today's Live Queue Board</h1>
          <p className="text-xs text-slate-500 mt-1">Real-time doctor queue tracking and walk-in patient booking desk</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live indicator + last-refresh */}
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
            Auto-refresh · {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchData()}
          >
            Refresh
          </Button>
          <Button variant="outline" leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setIsRegisterOpen(true)}>
            Quick Register Patient
          </Button>
          <Button variant="primary" leftIcon={<Calendar className="w-4 h-4" />} onClick={() => setIsBookOpen(true)}>
            Book Walk-In Appointment
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      {allAppts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <p className="text-lg font-bold text-slate-900">{allAppts.length}</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Total Today</p>
          </div>
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-center">
            <p className="text-lg font-bold text-violet-700">{onlineCount}</p>
            <p className="text-[10px] text-violet-500 font-semibold uppercase tracking-wide flex items-center justify-center gap-1">
              <Smartphone className="w-3 h-3" /> App Bookings
            </p>
          </div>
          <div className={['p-3 rounded-xl border text-center', awaitingCheckIn > 0 ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'].join(' ')}>
            <p className={['text-lg font-bold', awaitingCheckIn > 0 ? 'text-amber-700' : 'text-slate-400'].join(' ')}>{awaitingCheckIn}</p>
            <p className={['text-[10px] font-semibold uppercase tracking-wide', awaitingCheckIn > 0 ? 'text-amber-600' : 'text-slate-400'].join(' ')}>
              Awaiting Check-In
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : queueData.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Stethoscope className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No appointments today.</p>
          <p className="text-xs mt-1">Walk-in and app bookings will appear here automatically.</p>
        </div>
      ) : (
        /* Doctor Queues Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {queueData.map((docQueue) => {
            const docOnlineAwait = (docQueue.appointments ?? []).filter(
              (a: any) => a.booking_source === 'online' && a.queue_status !== 'arrived' && !['completed', 'in_progress', 'cancelled', 'missed'].includes(a.status)
            ).length;

            return (
              <Card
                key={docQueue.doctor_id}
                header={
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center">
                        <Stethoscope className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{docQueue.doctor_name}</h3>
                        <p className="text-xs text-slate-400">{docQueue.doctor_specialization} • {docQueue.department_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {docOnlineAwait > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-2 py-0.5">
                          <Clock className="w-2.5 h-2.5" /> {docOnlineAwait} pending arrival
                        </span>
                      )}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase block">Serving</span>
                        <span className="text-sm font-bold text-emerald-700 font-mono">
                          {docQueue.current_serving ? `#${docQueue.current_serving}` : 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              >
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {docQueue.appointments?.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No patients in queue today.</p>
                  ) : (
                    docQueue.appointments?.map((app: any) => (
                      <AppointmentRow
                        key={app.id}
                        app={app}
                        docQueue={docQueue}
                        onCheckIn={handleCheckIn}
                        isCheckingIn={checkingInId === app.id}
                        onPrintRx={handlePrintRx}
                        rxLoading={rxLoading}
                      />
                    ))
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Patient Registration Modal */}
      <Modal isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} title="Quick Patient Registration (No OTP)">
        <form onSubmit={handleRegisterPatient} className="space-y-4">
          <Input label="Full Patient Name" placeholder="e.g. John Walk-in" value={regName} onChange={(e) => setRegName(e.target.value)} required />
          <Input label="Phone Number" type="tel" placeholder="+1 555 000 0000" value={regPhone} onChange={(e) => setRegPhone(e.target.value)} required />
          <Input label="National ID (Optional)" placeholder="1234567890" value={regNationalId} onChange={(e) => setRegNationalId(e.target.value)} />

          <Button type="submit" variant="primary" className="w-full">
            Register &amp; Continue to Booking
          </Button>
        </form>
      </Modal>

      {/* Walk-in Booking Modal */}
      <Modal isOpen={isBookOpen} onClose={() => setIsBookOpen(false)} title="Book Walk-in Appointment">
        <form onSubmit={handleBookWalkIn} className="space-y-4">

          {/* Patient identity — auto-register on unknown phone */}
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs text-teal-700 font-medium">
            Enter the patient's name and phone. If they're already registered their record will be linked automatically — otherwise a new patient file is created on the spot.
          </div>

          <Input
            label="Patient Full Name"
            placeholder="e.g. Ahmed Ali Hassan"
            value={bookPatientName}
            onChange={(e) => setBookPatientName(e.target.value)}
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+20 10 0000 0000"
            value={bookPatientPhone}
            onChange={(e) => setBookPatientPhone(e.target.value)}
            required
          />

          <Select
            label="Doctor Specialist"
            value={bookDoctorId}
            onChange={(e) => setBookDoctorId(e.target.value)}
            options={doctorsList.map((d) => ({ label: `${d.name} (${d.specialization}) - ${formatCurrency(d.consultation_fee)}`, value: d.id }))}
            placeholder="Choose Doctor"
            required
          />

          <Input label="Appointment Date" type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} required />

          <Select
            label="Available Time Slot"
            value={bookSlot}
            onChange={(e) => setBookSlot(e.target.value)}
            options={availableSlots.map((s) => ({ label: s.label, value: s.value, disabled: s.disabled }))}
            placeholder={isFetchingSlots ? 'Loading available slots...' : (availableSlots.length === 0 ? 'Select Doctor & Date first' : 'Select Time Slot')}
            required
          />

          <Select
            label="Payment Collection Status"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as any)}
            options={[
              { label: 'Paid Cash at Front Desk', value: 'paid_cash' },
              { label: 'Unpaid (Collect Later)', value: 'unpaid' },
              { label: 'Paid Online', value: 'paid_online' },
            ]}
          />

          <Button type="submit" variant="primary" className="w-full">
            Generate Queue Number &amp; Book Appointment
          </Button>
        </form>
      </Modal>

      {/* ── Prescription Print Overlay ── */}
      {rxData && (
        <PrescriptionPrint
          data={rxData}
          onClose={() => setRxData(null)}
        />
      )}
    </div>
  );
};
