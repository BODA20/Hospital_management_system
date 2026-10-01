import { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import * as receptionService from './reception.service';
import { logAuditEvent } from '../audit/services/audit.service';

// ─── Patient Search (typeahead) ─────────────────────────────────────────────────
export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const rawQuery =
    req.query.query ??
    req.query.search ??
    req.query.q ??
    req.query.term ??
    req.query.name ??
    req.query.phone ??
    '';

  const queryStr = String(rawQuery).trim();
  const cleanQuery = ['undefined', 'null'].includes(queryStr.toLowerCase()) ? '' : queryStr;

  const results = await receptionService.searchPatients(cleanQuery);

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: results,
  });
});

// ─── Quick Patient Registration ─────────────────────────────────────────────────
export const registerPatient = asyncHandler(async (req: Request, res: Response) => {
  const { full_name, phone, national_id } = req.body;

  if (!full_name || !phone) {
    res.status(400).json({ status: 'fail', message: 'full_name and phone are required' });
    return;
  }

  const result = await receptionService.registerPatient({ full_name, phone, national_id });

  const actor = req.user as any;
  logAuditEvent(req, {
    action_type: 'WALKIN_PATIENT_REGISTERED',
    user_id: actor?.id ?? null,
    actor_name: actor?.full_name ?? actor?.email ?? 'Receptionist',
    description: `Receptionist registered walk-in patient: ${full_name} (phone: ${phone})${result.already_existed ? ' [existing record returned]' : ''}`,
  });

  res.status(result.already_existed ? 200 : 201).json({
    status: 'success',
    data: result,
  });
});

// ─── Walk-In Appointment Booking ────────────────────────────────────────────────
export const bookWalkIn = asyncHandler(async (req: Request, res: Response) => {
  const { patient_id, full_name, phone, doctor_id, appointment_date, time_slot, payment_status } = req.body;

  // Must have either a known patient_id OR name+phone to find/create one
  const hasPatientId = patient_id != null && String(patient_id).trim() !== '';
  const hasNamePhone = full_name && phone;

  if (!hasPatientId && !hasNamePhone) {
    res.status(400).json({
      status: 'fail',
      message: 'Provide either patient_id or both full_name and phone to identify the patient.',
    });
    return;
  }

  if (!doctor_id || !appointment_date) {
    res.status(400).json({
      status: 'fail',
      message: 'doctor_id and appointment_date are required',
    });
    return;
  }

  const result = await receptionService.bookWalkIn({
    patient_id: hasPatientId ? Number(patient_id) : undefined,
    full_name: hasPatientId ? undefined : full_name,
    phone: hasPatientId ? undefined : phone,
    doctor_id: Number(doctor_id),
    appointment_date,
    time_slot,
    payment_status: payment_status ?? 'paid_cash',
  });

  const actor = req.user as any;
  const patientLabel = hasPatientId ? `#${patient_id}` : `${full_name} (${phone})`;
  logAuditEvent(req, {
    action_type: 'WALKIN_APPOINTMENT_BOOKED',
    user_id: actor?.id ?? null,
    actor_name: actor?.full_name ?? actor?.email ?? 'Receptionist',
    description: `Walk-in booked for patient ${patientLabel} with doctor #${doctor_id} on ${appointment_date}. Queue #${result.queue_number}. Payment: ${payment_status ?? 'paid_cash'}.`,
  });

  res.status(201).json({
    status: 'success',
    data: result,
  });
});


// ─── Today's Live Queue Board ───────────────────────────────────────────────────
export const getTodayQueue = asyncHandler(async (req: Request, res: Response) => {
  const dateQuery = typeof req.query.date === 'string' ? req.query.date : undefined;
  const queue = await receptionService.getTodayQueue(dateQuery);

  res.status(200).json({
    status: 'success',
    results: queue.length,
    data: queue,
  });
});

// ─── Mark Appointment Paid ──────────────────────────────────────────────────────
export const markPaid = asyncHandler(async (req: Request, res: Response) => {
  const appointmentId = Number(req.params.id);
  const { payment_status } = req.body;

  if (!['paid_cash', 'paid_online'].includes(payment_status)) {
    res.status(400).json({ status: 'fail', message: 'payment_status must be paid_cash or paid_online' });
    return;
  }

  const updated = await receptionService.markAppointmentPaid(appointmentId, payment_status);

  const actor = req.user as any;
  logAuditEvent(req, {
    action_type: 'PAYMENT_PROCESSED',
    user_id: actor?.id ?? null,
    actor_name: actor?.full_name ?? actor?.email ?? 'Receptionist',
    description: `Appointment #${appointmentId} marked as ${payment_status} by receptionist.`,
  });

  res.status(200).json({ status: 'success', data: updated });
});

// ─── Check-In Patient (arrived at desk) ────────────────────────────────────────
export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const appointmentId = Number(req.params.id);

  const updated = await receptionService.checkInAppointment(appointmentId);

  const actor = req.user as any;
  logAuditEvent(req, {
    action_type: 'APPOINTMENT_STATUS_UPDATED',
    user_id: actor?.id ?? null,
    actor_name: actor?.full_name ?? actor?.email ?? 'Receptionist',
    description: `Appointment #${appointmentId} checked-in (patient arrived at desk).`,
  });

  res.status(200).json({ status: 'success', data: updated });
});

// ─── Get Available Doctors ──────────────────────────────────────────────────────
export const getDoctors = asyncHandler(async (_req: Request, res: Response) => {
  const doctors = await receptionService.getDoctors();

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: doctors,
  });
});

// ─── Get Booked Slots for a Doctor on a Date ──────────────────────────────
// GET /api/v1/reception/doctors/:id/booked-slots?date=YYYY-MM-DD
// Returns { bookedSlots: string[], shift: 'Morning' | 'Night' }
export const getBookedSlots = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = Number(req.params.id);
  const date = String(req.query.date ?? '');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ status: 'fail', message: 'date query param is required (YYYY-MM-DD)' });
    return;
  }

  const { bookedSlots, shift } = await receptionService.getBookedSlots(doctorId, date);

  res.status(200).json({
    status: 'success',
    data: { bookedSlots, shift },
  });
});
