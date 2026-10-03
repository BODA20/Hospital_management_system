import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { appointmentService } from '../../services/appointmentService';
import { DoctorProfile } from '../../types/user.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../hooks/useToast';
import { Stethoscope, Calendar, Clock, DollarSign, Award, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Generate every 30-min slot from 09:00 to 17:00 as HH:mm 24h strings */
const generateWorkingHourSlots = (): string[] => {
  const slots: string[] = [];
  for (let h = 9; h <= 17; h++) {
    for (const m of [0, 30]) {
      if (h === 17 && m === 30) break;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
};

const DEFAULT_SLOTS = generateWorkingHourSlots();

/** Convert a 24h "HH:mm" string to a human-readable "hh:mm AM/PM" label */
const fmt12h = (time24: string): string => {
  if (!time24) return '';
  const clean = time24.split('-')[0].trim();
  const [hStr, mStr = '00'] = clean.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${mStr} ${period}`;
};

/** True if the given HH:mm slot on `date` (YYYY-MM-DD) is in the past */
const isSlotInPast = (date: string, slot: string): boolean => {
  const today = new Date().toISOString().split('T')[0];
  if (date !== today) return false;
  const now = new Date();
  const [h, m] = slot.split(':').map(Number);
  const slotDate = new Date();
  slotDate.setHours(h, m, 0, 0);
  return slotDate <= now;
};

// ─── Component ──────────────────────────────────────────────────────────────────

export const DoctorDirectoryView: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Booking Modal state
  const [selectedDoc, setSelectedDoc] = useState<DoctorProfile | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('');
  const [allSlots, setAllSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    userService
      .getAllDoctors()
      .then((res) => setDoctors(res.data || []))
      .catch(() => toast.error('Error', 'Failed to fetch doctor directory.'))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Slot status derivation ───────────────────────────────────────────────────
  /** Find the first available (not past, not booked) slot and select it */
  const pickFirstAvailable = (slots: string[], booked: string[], date: string) => {
    const first = slots.find(
      (s) => !isSlotInPast(date, s) && !booked.includes(s)
    );
    setTimeSlot(first ?? '');
  };

  const fetchSlots = (docId: number, date: string) => {
    userService
      .getAvailableSlots(docId, date)
      .then((res) => {
        // API returns: { status, data: [{ slot: 'HH:mm', isBooked: bool, isPast: bool }] }
        // res is already res.data from Axios, so res.data is the array
        const slotInfos: { slot: string; isBooked: boolean; isPast: boolean }[] =
          Array.isArray((res as any).data) ? (res as any).data : [];

        const grid = slotInfos.length > 0 ? slotInfos.map((s) => s.slot) : DEFAULT_SLOTS;
        const booked = slotInfos.filter((s) => s.isBooked).map((s) => s.slot);

        setAllSlots(grid);
        setBookedSlots(booked);
        pickFirstAvailable(grid, booked, date);
      })
      .catch(() => {
        setAllSlots(DEFAULT_SLOTS);
        setBookedSlots([]);
        pickFirstAvailable(DEFAULT_SLOTS, [], date);
      });
  };

  const handleOpenBooking = (doc: DoctorProfile) => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDoc(doc);
    setAppointmentDate(today);
    setIsBookingModalOpen(true);
    fetchSlots(doc.id, today);
  };

  const handleDateChange = (newDate: string) => {
    setAppointmentDate(newDate);
    if (selectedDoc) fetchSlots(selectedDoc.id, newDate);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!timeSlot) {
      toast.error('No Slot Selected', 'Please select an available time slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await appointmentService.createAppointment({
        doctor_id: selectedDoc.id,
        appointment_date: appointmentDate,
        time_slot: timeSlot,
        reason,
      });
      const appt = res.data;
      setIsBookingModalOpen(false);
      setReason('');
      navigate('/patient/checkout', {
        state: {
          appointmentId:  appt?.id,
          doctorName:     `Dr. ${selectedDoc.full_name || selectedDoc.name || 'Doctor'}`,
          doctorSpecialty: selectedDoc.specialization || 'Specialist',
          timeSlot:       fmt12h(timeSlot),
          appointmentDate,
          fee:            selectedDoc.consultation_fee || 150,
        },
      });
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('Slot Unavailable ⚠️', 'This time slot is already booked. Please choose another time.');
        if (selectedDoc) {
          fetchSlots(selectedDoc.id, appointmentDate);
        }
      } else {
        toast.error('Booking Error', err.response?.data?.message || 'Failed to book appointment.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Slot chip state per slot ─────────────────────────────────────────────────
  const getSlotState = (slot: string): 'selected' | 'booked' | 'past' | 'available' => {
    if (slot === timeSlot) return 'selected';
    if (bookedSlots.includes(slot)) return 'booked';
    if (isSlotInPast(appointmentDate, slot)) return 'past';
    return 'available';
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Doctor Directory & Specialist Booking</h1>
        <p className="text-xs text-slate-500 mt-1">Browse hospital medical specialists and reserve consultation time slots</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <Card key={doc.id} padding="lg" className="flex flex-col justify-between hover:border-teal-500/50 transition-colors">
            <div>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 font-bold flex items-center justify-center text-xl shrink-0">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Dr. {doc.full_name || doc.name || 'Doctor'}</h3>
                  <p className="text-xs font-semibold text-teal-700 mt-0.5">{doc.specialization}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{doc.department_name || 'General Medicine'}</p>
                </div>
              </div>

              {doc.bio && <p className="text-xs text-slate-600 mb-4 line-clamp-2">{doc.bio}</p>}

              <div className="space-y-2 py-3 border-t border-b border-slate-100 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><Award className="w-3.5 h-3.5" /> Experience</span>
                  <span className="font-semibold text-slate-900">{doc.years_of_experience || 5} Years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500"><DollarSign className="w-3.5 h-3.5" /> Consultation Fee</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(doc.consultation_fee || 150)}</span>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full mt-4"
              leftIcon={<Calendar className="w-4 h-4" />}
              onClick={() => handleOpenBooking(doc)}
            >
              Book Consultation
            </Button>
          </Card>
        ))}
      </div>

      {/* ── Booking Modal ──────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Book with Dr. ${selectedDoc?.full_name || selectedDoc?.name || 'Doctor'}`}
        subtitle={selectedDoc?.specialization ? `${selectedDoc.specialization} · ${selectedDoc.department_name || 'General Medicine'}` : undefined}
      >
        <form onSubmit={handleBook} className="space-y-5">
          {/* Date picker */}
          <Input
            label="Appointment Date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={appointmentDate}
            onChange={(e) => handleDateChange(e.target.value)}
            required
          />

          {/* ── Time Slot Grid ──────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Available Time Slots
              </label>
              {timeSlot && (
                <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5">
                  {fmt12h(timeSlot)} selected
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {allSlots.map((slot) => {
                const state = getSlotState(slot);
                const isDisabled = state === 'booked' || state === 'past';

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setTimeSlot(slot)}
                    className={[
                      'relative rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal-400/50',
                      state === 'selected'
                        ? 'bg-teal-600 border-teal-600 text-white font-semibold shadow-md scale-[1.02]'
                        : state === 'booked'
                        ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed opacity-50 blur-[0.4px] pointer-events-none'
                        : state === 'past'
                        ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-40 pointer-events-none line-through'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700 cursor-pointer active:scale-95',
                    ].join(' ')}
                  >
                    <span className="block leading-tight">{fmt12h(slot)}</span>
                    {state === 'selected' && (
                      <CheckCircle2 className="w-3 h-3 absolute top-1 right-1 text-teal-200" />
                    )}
                    {state === 'booked' && (
                      <span className="block text-[9px] font-semibold text-slate-400 mt-0.5 leading-none">Booked</span>
                    )}
                    {state === 'past' && (
                      <span className="block text-[9px] font-semibold text-slate-300 mt-0.5 leading-none">Past</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block" /> Selected</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300 inline-block" /> Available</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-100 inline-block" /> Booked</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-50 inline-block" /> Past</span>
            </div>
          </div>

          {/* Reason */}
          <Input
            label="Reason for Appointment"
            placeholder="e.g. Annual Checkup, Severe Headache..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />

          {/* Summary card */}
          <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-600 border border-slate-200">
            <div className="flex justify-between">
              <span>Consultation Fee:</span>
              <span className="font-bold text-slate-900">{formatCurrency(selectedDoc?.consultation_fee || 150)}</span>
            </div>
            {timeSlot && (
              <div className="flex justify-between text-teal-700 font-medium">
                <span>Selected Slot:</span>
                <span>{fmt12h(timeSlot)}</span>
              </div>
            )}
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Booking Status:</span>
              <span>Instant Confirmation</span>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isSubmitting}
            disabled={!timeSlot}
          >
            Confirm Appointment Booking
          </Button>
        </form>
      </Modal>
    </div>
  );
};
