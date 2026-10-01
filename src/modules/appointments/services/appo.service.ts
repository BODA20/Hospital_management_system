import * as appointmentsRepo from '../repositories/appo.repo';
import * as doctorsRepo from '../../doctors/repositories/doctor.repo';
import * as patientRepo from '../../patients/repositories/patient.repository';
import { appError } from '../../../common/errors/AppError';
import { Email } from '../../../common/utils/email';
import logger from '../../../common/utils/logger';
import db from '../../../config/db';

// ─── Auto-Expire: Bulk-update past pending appointments → 'missed' ────────────
/**
 * Sets status = 'missed' for all appointments whose scheduled datetime is in
 * the past and whose current status is still 'pending' (never confirmed/acted on).
 * Optionally scoped to a single patient or doctor to keep the query cheap.
 */
export const autoExpireMissedAppointments = async (scope?: {
  patient_id?: number;
  doctor_id?: number;
}): Promise<number> => {
  const query = db('appointments')
    .where('status', 'pending')
    .andWhere(function () {
      this.whereRaw("appointment_date < CURRENT_DATE")
        .orWhereRaw("ends_at < (NOW() - interval '12 hours')");
    });

  // Apply scope filters BEFORE .update() so they are included in the WHERE clause
  if (scope?.patient_id) query.where('patient_id', scope.patient_id);
  if (scope?.doctor_id)  query.where('doctor_id',  scope.doctor_id);

  console.log('[AutoExpire] Running missed-appointment sweep', scope ?? '(global)');

  const count = await query.update({ status: 'missed', updated_at: db.fn.now() });

  if (count > 0) {
    const msg = `[AutoExpire] ✅ Marked ${count} appointment(s) as 'missed'`;
    logger.info(msg);
    console.log(msg);
  } else {
    console.log('[AutoExpire] No stale pending appointments found.');
  }
  return count;
};



// Helper: Calculate starts_at & ends_at from appointment_date (YYYY-MM-DD) and time_slot (HH:mm - HH:mm)
function parseSlotToDates(appointmentDate: string, timeSlot: string) {
  const [startStr] = timeSlot.split('-').map((s) => s.trim());
  const [hours, minutes] = startStr.split(':').map(Number);
  
  const padH = String(hours).padStart(2, '0');
  const padM = String(minutes).padStart(2, '0');
  const localIso = `${appointmentDate}T${padH}:${padM}:00`;
  const startsAt = new Date(localIso);
  const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
  
  return { startsAt, endsAt };
}

// ─── Create Appointment ────────────────────────────────────────────────────────
export const createAppointment = async (user: any, body: any) => {
  if (typeof user === 'number') {
    user = { id: user, role: 'patient' };
  }
  const { doctor_id, department_id, reason, notes } = body;
  let { patient_id, appointment_date, time_slot, starts_at } = body;

  // 1. Resolve Patient ID
  if (user.role === 'patient') {
    const patient = await patientRepo.findByUserId(user.id);
    if (!patient) {
      throw new appError(
        'Patient profile not found. Please complete your registration profile.',
        404,
      );
    }
    patient_id = patient.id;
  } else if (!patient_id) {
    throw new appError('patient_id is required when booking as staff/admin', 400);
  }

  // 2. Resolve Doctor
  const doctor = await doctorsRepo.findById(doctor_id);
  if (!doctor) {
    throw new appError('Doctor not found', 404);
  }
  if (doctor.is_available === false) {
    throw new appError('This doctor is currently not available for bookings.', 400);
  }

  // 3. Normalize Date & Time Slot
  let computedStartsAt: Date;
  let computedEndsAt: Date;

  if (appointment_date && time_slot) {
    const parsed = parseSlotToDates(appointment_date, time_slot);
    computedStartsAt = parsed.startsAt;
    computedEndsAt = parsed.endsAt;
  } else if (starts_at) {
    const cleanIso = String(starts_at).replace('Z', '').split('.')[0];
    computedStartsAt = new Date(cleanIso);
    computedEndsAt = new Date(computedStartsAt.getTime() + 30 * 60_000);
    const dateParts = cleanIso.split('T');
    appointment_date = dateParts[0];
    const timeParts = (dateParts[1] || '09:00:00').split(':');
    const startH = timeParts[0].padStart(2, '0');
    const startM = timeParts[1].padStart(2, '0');
    // Always store just the start time "HH:mm" (consistent with walk-in format)
    time_slot = `${startH}:${startM}`;
  } else {
    throw new appError('Must provide either appointment_date & time_slot or starts_at', 400);
  }

  if (computedStartsAt <= new Date()) {
    throw new appError('Appointment must be scheduled for a future date and time', 400);
  }

  // 4. CONCURRENCY GUARD: Check Doctor Availability & Double-Booking
  const isAvailable = await appointmentsRepo.checkAvailability(
    doctor_id,
    computedStartsAt,
    appointment_date,
    time_slot,
  );
  if (!isAvailable) {
    throw new appError(
      'Double Booking Conflict: This doctor already has an active appointment at the selected date and time slot.',
      409,
    );
  }

  // 5. Derive Department ID if not explicitly provided
  const deptId = department_id ?? doctor.department_id ?? null;

  // 6. Normalise time_slot to canonical "HH:mm" format for consistent collision detection
  // (walk-in always stores "HH:mm"; patient requests that arrive with a range "HH:mm - HH:mm"
  //  or trailing seconds are trimmed here so the exact-match index can always fire).
  time_slot = time_slot ? time_slot.split('-')[0].trim().slice(0, 5) : time_slot;

  // 6. Create Record
  const initialStatus = user.role === 'patient' ? 'pending' : 'confirmed';

  const created = await appointmentsRepo.createAppointment({
    patient_id,
    doctor_id,
    department_id: deptId,
    appointment_date,
    time_slot,
    starts_at: computedStartsAt,
    ends_at: computedEndsAt,
    status: initialStatus,
    booking_source: user?.role === 'patient' ? 'online' : (body.booking_source || 'online'),
    reason: reason || null,
    notes: notes || null,
  });

  const fullRecord = await appointmentsRepo.findById(created.id);

  // 7. REQ 1: Booking Confirmation Email ONLY for confirmed appointments (staff or paid)
  if (initialStatus === 'confirmed') {
    setImmediate(async () => {
      try {
        const patientUser = await db('patients as p')
          .join('users as u', 'p.user_id', 'u.id')
          .where('p.id', patient_id)
          .select('u.email', 'u.full_name')
          .first();

        if (patientUser?.email && created.booking_source !== 'walk_in') {
          const doctorName = fullRecord?.doctor_name || doctor?.user?.full_name || 'Doctor';
          const deptName = fullRecord?.department_name || null;
          const mailer = new Email(
            { email: patientUser.email, name: patientUser.full_name },
            process.env.FRONTEND_URL || 'http://localhost:3000',
          );
          await mailer.sendBookingConfirmation({
            doctorName,
            department: deptName,
            appointmentDate: appointment_date,
            timeSlot: time_slot,
            reason: reason || null,
            bookingSource: created.booking_source,
          });
          logger.info(`[AppointmentService] Booking confirmation email sent to ${patientUser.email} for appointment #${created.id}`);
        }
      } catch (mailErr: any) {
        logger.error(`[AppointmentService] Failed to send booking confirmation for appointment #${created.id}: ${mailErr.message}`);
      }
    });
  }

  return fullRecord;
};

// ─── Get My Appointments (Patient) ────────────────────────────────────────────
export const getMyAppointments = async (userId: number) => {
  const patient = await patientRepo.findByUserId(userId);
  if (!patient) return [];

  // Auto-expire any past-pending appointments for this patient before returning
  await autoExpireMissedAppointments({ patient_id: patient.id });

  return appointmentsRepo.getByPatient(patient.id);
};

// ─── Get Doctor Appointments (Doctor) ─────────────────────────────────────────
export const getDoctorAppointments = async (userId: number) => {
  const doctor = await doctorsRepo.findByUserId(userId);
  if (!doctor) throw new appError('Doctor profile not found', 404);

  return appointmentsRepo.getByDoctor(doctor.id);
};

// ─── Get All Appointments (Admin Global) ──────────────────────────────────────
export const getAllAppointments = async (filters: any) => {
  // Auto-expire globally before building the admin list
  await autoExpireMissedAppointments();

  const appointments = await appointmentsRepo.getAllAppointments(filters);
  const now = new Date();

  return appointments.map((a: any) => {
    let isPastDate = false;
    if (a.starts_at) {
      isPastDate = new Date(a.starts_at).getTime() < now.getTime();
    } else if (a.appointment_date) {
      const dateOnly = String(a.appointment_date).includes('T') ? String(a.appointment_date).split('T')[0] : String(a.appointment_date);
      const slotStart = a.time_slot ? a.time_slot.split('-')[0].trim() : '23:59';
      const formattedSlot = slotStart.length === 5 ? `${slotStart}:00` : slotStart;
      const apptDateTime = new Date(`${dateOnly}T${formattedSlot}`);
      isPastDate = !isNaN(apptDateTime.getTime()) && apptDateTime.getTime() < now.getTime();
    }

    if (isPastDate && a.status !== 'completed' && a.status !== 'cancelled') {
      return { ...a, status: 'missed' };
    }

    return a;
  });
};

// ─── Get Doctor Daily Schedule ─────────────────────────────────────────────────
export const getDoctorDailySchedule = async (userId: number) => {
  const doctor = await doctorsRepo.findByUserId(userId);
  if (!doctor) throw new appError('Doctor profile not found', 404);

  const today = new Date();
  const rawAppointments = await appointmentsRepo.getDoctorDailySchedule(doctor.id, today);
  const appointments = rawAppointments.map((a: any) => {
    const hasContact = a.patient_phone || a.phone || a.patient_email || a.email;
    if (!hasContact) {
      return { ...a, _warning: 'no contact info provided' };
    }
    return a;
  });

  const now = new Date();
  const remaining = appointments.filter(
    (a: any) => new Date(a.starts_at) >= now && ['pending', 'scheduled', 'confirmed'].includes(a.status),
  ).length;
  const completed = appointments.filter(
    (a: any) => a.status === 'completed',
  ).length;

  return {
    date: today.toISOString().split('T')[0],
    total: appointments.length,
    remaining,
    completed,
    appointments,
  };
};

// ─── Update Appointment Status ─────────────────────────────────────────────────
export const updateStatus = async (
  appointmentId: number,
  status: string,
  user: any,
  notes?: string | null,
) => {
  const appointment = await appointmentsRepo.findById(appointmentId);
  if (!appointment) {
    throw new appError('Appointment not found', 404);
  }

  // 1. Patient Access & State Machine Rules
  if (user.role?.toLowerCase() === 'patient') {
    const patient = await patientRepo.findByUserId(user.id);
    const resolvedPatientId = patient ? patient.id : user.id;

    if (appointment.patient_id !== resolvedPatientId && appointment.patient_id !== user.id) {
      throw new appError('You are not authorized to update this appointment', 403);
    }
    if (status !== 'cancelled') {
      throw new appError('Patients can only cancel their appointments', 403);
    }

    let apptStartTime: Date;
    if (appointment.starts_at) {
      apptStartTime = new Date(appointment.starts_at);
    } else if (appointment.appointment_date && appointment.time_slot) {
      const dateStr = typeof appointment.appointment_date === 'string'
        ? appointment.appointment_date.split('T')[0]
        : new Date(appointment.appointment_date).toISOString().split('T')[0];
      const startTimeStr = appointment.time_slot.split('-')[0].trim();
      apptStartTime = new Date(`${dateStr}T${startTimeStr}:00`);
    } else {
      apptStartTime = new Date(appointment.starts_at || appointment.created_at);
    }

    const diffMs = apptStartTime.getTime() - Date.now();
    const fiveHoursMs = 5 * 60 * 60 * 1000;

    if (diffMs < fiveHoursMs) {
      throw new appError(
        'Cancellation Window Expired: Appointments can only be cancelled up to 5 hours prior to the scheduled time.',
        400
      );
    }
  }

  // 2. Doctor Access Rules
  if (user.role === 'doctor' || (!user.role && user.id)) {
    const doctor = await doctorsRepo.findByUserId(user.id);
    if (doctor && appointment.doctor_id !== doctor.id) {
      throw new appError('You are not authorized to update this appointment', 403);
    }
    if (user.role === 'doctor' && !['confirmed', 'completed', 'cancelled'].includes(status)) {
      throw new appError('Doctors can only set status to confirmed, completed, or cancelled', 403);
    }
  }

  // 3. State Machine Guard (No re-opening completed/cancelled appointments)
  if (
    ['completed', 'cancelled'].includes(appointment.status) &&
    ['pending', 'scheduled', 'confirmed'].includes(status)
  ) {
    throw new appError(
      `Cannot move a '${appointment.status}' appointment back to '${status}'`,
      422,
    );
  }

  const [updated] = await appointmentsRepo.updateStatus(appointmentId, status, notes);
  return appointmentsRepo.findById(updated.id);
};

// ─── Reschedule Appointment (Admin / Doctor / Patient) ─────────────────────────
export const rescheduleAppointment = async (
  appointmentId: number,
  user: any,
  body: any,
) => {
  const appointment = await appointmentsRepo.findById(appointmentId);
  if (!appointment) {
    throw new appError('Appointment not found', 404);
  }

  if (['completed', 'cancelled'].includes(appointment.status)) {
    throw new appError(`Cannot reschedule a ${appointment.status} appointment.`, 422);
  }

  const doctorId = body.doctor_id || appointment.doctor_id;
  const apptDate = body.appointment_date || appointment.appointment_date;
  const timeSlot = body.time_slot || appointment.time_slot;

  let computedStartsAt: Date;
  let computedEndsAt: Date;

  if (body.starts_at) {
    computedStartsAt = new Date(body.starts_at);
    computedEndsAt = new Date(computedStartsAt.getTime() + 30 * 60_000);
  } else if (apptDate && timeSlot) {
    const parsed = parseSlotToDates(apptDate, timeSlot);
    computedStartsAt = parsed.startsAt;
    computedEndsAt = parsed.endsAt;
  } else {
    throw new appError('Must provide date and time slot to reschedule.', 400);
  }

  const isAvailable = await appointmentsRepo.checkAvailability(
    doctorId,
    computedStartsAt,
    apptDate,
    timeSlot,
    appointmentId,
  );
  if (!isAvailable) {
    throw new appError('Double Booking Conflict: Selected doctor is unavailable at that time.', 409);
  }

  await appointmentsRepo.reschedule(appointmentId, {
    doctor_id: doctorId,
    appointment_date: apptDate,
    time_slot: timeSlot,
    starts_at: computedStartsAt,
    ends_at: computedEndsAt,
    reason: body.reason || appointment.reason,
  });

  return appointmentsRepo.findById(appointmentId);
};

// ─── REQ 3: Set Attendance Status (email CTA – Confirm button) ────────────────
export const setAttendanceStatus = async (
  appointmentId: number,
  attendanceStatus: 'confirmed_by_patient' | 'cancelled_by_patient',
) => {
  const appointment = await appointmentsRepo.findById(appointmentId);
  if (!appointment) {
    throw new appError('Appointment not found', 404);
  }
  if (['completed', 'cancelled'].includes(appointment.status)) {
    // Already in a terminal state – silently succeed so email link doesn't error
    return appointment;
  }
  await db('appointments')
    .where({ id: appointmentId })
    .update({ attendance_status: attendanceStatus, updated_at: db.fn.now() });
  return appointmentsRepo.findById(appointmentId);
};

// ─── REQ 3: Cancel Appointment by Patient (email CTA – Cancel button) ─────────
export const cancelByPatientEmail = async (appointmentId: number) => {
  const appointment = await appointmentsRepo.findById(appointmentId);
  if (!appointment) {
    throw new appError('Appointment not found', 404);
  }
  if (['completed', 'cancelled'].includes(appointment.status)) {
    return appointment;
  }
  await db('appointments')
    .where({ id: appointmentId })
    .update({ status: 'cancelled', attendance_status: 'cancelled_by_patient', updated_at: db.fn.now() });
  logger.info(`[AppointmentService] Appointment #${appointmentId} cancelled by patient via email CTA`);
  return appointmentsRepo.findById(appointmentId);
};

// ─── Complete Appointment Service Action ─────────────────────────────────────
export const completeAppointment = async (appointmentId: number, user: any) => {
  const appointment = await appointmentsRepo.findById(appointmentId);
  if (!appointment) {
    throw new appError('Appointment not found', 404);
  }

  // State machine guard: if already completed, return the current record
  // instead of erroring or re-running the completion flow (prevents duplicate billing).
  if (appointment.status === 'completed') {
    return appointment;
  }

  await appointmentsRepo.updateStatus(appointmentId, 'completed');

  // If associated visit exists and is NOT already completed, complete it too.
  // Guarding here prevents duplicate billing invoice creation (root cause of the 500).
  const visit = await db('visits').where({ appointment_id: appointmentId }).first();
  if (visit && visit.status !== 'completed') {
    const visitService = await import('../../visits/services/visit.service');
    await visitService.completeVisit(visit.id, user);
  }

  return appointmentsRepo.findById(appointmentId);
};

export const verifyAndExtractAppointmentToken = (token?: string, passedId?: number | string): number | null => {
  const secret = process.env.JWT_SECRET || 'medicare_appointment_secret_key';

  let apptId = passedId ? Number(passedId) : null;
  let hashToVerify = token;

  if (token && token.includes('.')) {
    const [idStr, hash] = token.split('.');
    const parsed = Number(idStr);
    if (!isNaN(parsed) && parsed > 0) {
      apptId = parsed;
      hashToVerify = hash;
    }
  }

  if (!apptId || isNaN(apptId)) return null;

  if (hashToVerify) {
    const expectedHash = require('crypto').createHmac('sha256', secret).update(String(apptId)).digest('hex');
    if (hashToVerify !== expectedHash) {
      return null;
    }
  }

  return apptId;
};

export const confirmByToken = async (dto: { token?: string; id?: number | string }) => {
  const apptId = verifyAndExtractAppointmentToken(dto.token, dto.id);
  if (!apptId) {
    throw new appError('Invalid or expired confirmation token', 400);
  }

  const appointment = await appointmentsRepo.findById(apptId);
  if (!appointment) {
    throw new appError(`Appointment #${apptId} not found`, 404);
  }

  if (appointment.status !== 'confirmed') {
    await appointmentsRepo.updateStatus(apptId, 'confirmed');
  }

  const updated = await appointmentsRepo.findById(apptId);
  return {
    appointment: updated,
    message: 'Appointment Confirmed Successfully!',
  };
};

export const cancelByToken = async (dto: { token?: string; id?: number | string }) => {
  const apptId = verifyAndExtractAppointmentToken(dto.token, dto.id);
  if (!apptId) {
    throw new appError('Invalid or expired cancellation token', 400);
  }

  const appointment = await appointmentsRepo.findById(apptId);
  if (!appointment) {
    throw new appError(`Appointment #${apptId} not found`, 404);
  }

  if (appointment.status !== 'cancelled') {
    await appointmentsRepo.updateStatus(apptId, 'cancelled');
  }

  const updated = await appointmentsRepo.findById(apptId);
  return {
    appointment: updated,
    message: 'Appointment Cancelled Successfully.',
  };
};

export const publicAppointmentAction = async (dto: { id?: number; action: string; token?: string }) => {
  if (dto.action === 'cancel') {
    return cancelByToken(dto);
  }
  return confirmByToken(dto);
};




