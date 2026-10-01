import { Request, Response } from 'express';
import * as visitService from '../services/visit.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { logAuditEvent } from '../../audit/services/audit.service';

// ─── Create Visit ──────────────────────────────────────────────────────────────
export const createVisit = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitService.createVisit(req.body);

  // Audit: a new clinical visit was recorded
  const actor = req.user as any;
  logAuditEvent(req, {
    action_type: 'VISIT_CREATED',
    user_id:     actor?.id ?? null,
    actor_name:  actor?.full_name ?? actor?.email ?? 'Staff',
    description: `New visit record created (Visit ID: ${visit?.id ?? 'N/A'}, Patient ID: ${req.body.patient_id ?? 'N/A'})`,
  });

  res.status(201).json({ status: 'success', data: visit });
});

// ─── Get All Visits ────────────────────────────────────────────────────────────
export const getAllVisits = asyncHandler(async (_req: Request, res: Response) => {
  const visits = await visitService.getAllVisits();
  res.json({ status: 'success', results: visits.length, data: visits });
});

// ─── Get Single Visit Details ──────────────────────────────────────────────────
export const getVisitById = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitService.getVisitById(Number(req.params.id));
  res.json({ status: 'success', data: visit });
});

// ─── Get Patient Visit History ─────────────────────────────────────────────────
export const getPatientHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await visitService.getPatientHistory(
      Number(req.params.patientId),
    );
    res.json({ status: 'success', data: result });
  },
);

// ─── Get My Visits (logged-in doctor) ─────────────────────────────────────────
export const getMyVisits = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.getDoctorVisits(req.user.id);
  res.json({ status: 'success', data: result });
});

// ─── Get My Visits (logged-in patient) ────────────────────────────────────────
export const getMyRecordsAsPatient = asyncHandler(async (req: Request, res: Response) => {
  // Resolve the patient's profile row from the authenticated user's ID
  const { findByUserId } = await import('../../patients/repositories/patient.repository');
  const patient = await findByUserId(req.user.id);
  if (!patient) {
    res.status(404).json({ status: 'fail', message: 'Patient profile not found for this account' });
    return;
  }
  const result = await visitService.getPatientHistory(patient.id);
  res.json({ status: 'success', data: result });
});


// ─── Update Visit ──────────────────────────────────────────────────────────────
export const updateVisit = asyncHandler(async (req: Request, res: Response) => {
  const updated = await visitService.updateVisit(
    Number(req.params.id),
    req.body,
  );
  res.json({ status: 'success', data: updated });
});

// ─── Delete Visit ──────────────────────────────────────────────────────────────
export const deleteVisit = asyncHandler(async (req: Request, res: Response) => {
  const visitId = Number(req.params.id);
  const result = await visitService.deleteVisit(visitId);

  // Audit: a visit record was permanently deleted
  const actor = req.user as any;
  logAuditEvent(req, {
    action_type: 'VISIT_DELETED',
    user_id:     actor?.id ?? null,
    actor_name:  actor?.full_name ?? actor?.email ?? 'Admin',
    description: `Visit record ID: ${visitId} was deleted from the system`,
  });

  res.json({ status: 'success', data: result });
});

// ─── Record Vitals (nurse action) ─────────────────────────────────────────────

// ─── Nurse: Check-In Patient (creates visit in awaiting_vitals) ───────────────

// ─── Get Visit by Appointment ID ─────────────────────────────────────────────
export const getByAppointmentId = asyncHandler(async (req: Request, res: Response) => {
  const appointmentId = Number(req.params.appointmentId);

  // Use already-imported visitService to get all visits, then find by appointment
  const visits = await visitService.getAllVisits();
  const visit = (Array.isArray(visits) ? visits : []).find(
    (v: any) => Number(v.appointment_id) === appointmentId
  );

  if (!visit) {
    res.json({ status: 'success', data: null });
    return;
  }

  res.json({ status: 'success', data: visit });
});

export const nurseCheckIn = asyncHandler(async (req: any, res: Response) => {
  const { appointment_id, patient_id, doctor_id, chief_complaint } = req.body;

  if (!patient_id || !doctor_id) {
    res.status(400).json({ status: 'error', message: 'patient_id and doctor_id are required' });
    return;
  }

  const visit = await visitService.createVisit({
    patient_id: Number(patient_id),
    doctor_id: Number(doctor_id),
    appointment_id: appointment_id ? Number(appointment_id) : undefined,
    reason_for_visit: chief_complaint || 'Walk-in consultation',
    diagnosis: 'Pending — to be completed by doctor',
    notes: 'Patient checked in by nurse.',
  });

  res.status(201).json({ status: 'success', data: visit });
});

export const recordVitals = asyncHandler(async (req: Request, res: Response) => {
  const visitId = Number(req.params.id);
  const { vitals } = req.body;

  const visit = await visitService.recordVitals(visitId, vitals, req.user.id);
  res.json({ status: 'success', data: visit });
});

// ─── Get Pending Visits Dashboard (doctor) ────────────────────────────────────
export const getPendingVisits = asyncHandler(async (req: Request, res: Response) => {
  const result = await visitService.getPendingVisits(req.user.id);
  res.json({ status: 'success', data: result });
});

// ─── Complete Visit Action (doctor) ──────────────────────────────────────────
export const completeVisit = asyncHandler(async (req: Request, res: Response) => {
  const visitId = Number(req.params.id);
  const updated = await visitService.completeVisit(visitId, req.user);

  const actor = req.user as any;
  logAuditEvent(req, {
    action_type: 'APPOINTMENT_STATUS_UPDATED',
    user_id:     actor?.id ?? null,
    actor_name:  actor?.full_name ?? actor?.email ?? 'Doctor',
    description: `Clinical visit ID: ${visitId} was completed by Doctor`,
  });

  res.json({ status: 'success', data: updated });
});
