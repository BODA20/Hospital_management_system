import db from '../../../config/db';
import * as visitRepo from '../repositories/visit.repository';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as patientRepo from '../../patients/repositories/patient.repository';
import * as appoRepo from '../../appointments/repositories/appo.repo';
import * as nurseRepo from '../../nurses/repositories/nurse.repository';
import * as billingService from '../../billing/services/billing.service';
import { appError } from '../../../common/errors/AppError';
import type { CreateVisitInput, UpdateVisitInput, Vitals } from '../visit.types';

// ─── Create Visit ──────────────────────────────────────────────────────────────
export const createVisit = async (body: CreateVisitInput) => {
  const { patient_id, doctor_id, appointment_id } = body;

  // 1. Verify patient exists (FK guard with meaningful 404)
  const patient = await patientRepo.findById(patient_id);
  if (!patient) {
    throw new appError(`Patient with ID ${patient_id} not found`, 404);
  }

  // 2. Verify doctor exists (FK guard with meaningful 404)
  const doctor = await doctorRepo.findById(doctor_id);
  if (!doctor) {
    throw new appError(`Doctor with ID ${doctor_id} not found`, 404);
  }

  // 3. If appointment_id provided, validate it belongs to the same patient/doctor
  if (appointment_id) {
    const appointment = await appoRepo.findById(appointment_id);

    if (!appointment) {
      throw new appError(`Appointment with ID ${appointment_id} not found`, 404);
    }
    if (appointment.patient_id !== patient_id) {
      throw new appError(
        `Appointment ${appointment_id} does not belong to patient ${patient_id}`,
        422,
      );
    }
    if (appointment.doctor_id !== doctor_id) {
      throw new appError(
        `Appointment ${appointment_id} is not with doctor ${doctor_id}`,
        422,
      );
    }
    if (appointment.status === 'cancelled') {
      throw new appError(
        `Cannot create a visit for a cancelled appointment`,
        422,
      );
    }
  }

  // 4. Create the visit — remaining FK errors bubble to the global error handler
  const visit = await visitRepo.createVisit(body);

  // 5. If appointment_id provided, auto-complete the appointment
  if (appointment_id) {
    await appoRepo.updateStatus(appointment_id, 'completed');
  }

  // Return enriched visit details
  return visitRepo.getVisitDetails(visit.id);
};

// ─── Get All Visits ────────────────────────────────────────────────────────────
export const getAllVisits = async () => {
  return visitRepo.getAllVisits();
};

// ─── Get Single Visit Details ──────────────────────────────────────────────────
export const getVisitById = async (id: number) => {
  const visit = await visitRepo.getVisitDetails(id);
  if (!visit) {
    throw new appError(`Visit with ID ${id} not found`, 404);
  }
  return visit;
};

// ─── Get Patient Visit History ─────────────────────────────────────────────────
export const getPatientHistory = async (patientId: number) => {
  const patient = await patientRepo.findById(patientId);
  if (!patient) {
    throw new appError(`Patient with ID ${patientId} not found`, 404);
  }

  const visits = await visitRepo.getPatientHistory(patientId);
  return {
    patient_id: patientId,
    patient_name: patient.full_name,
    total: visits.length,
    visits,
  };
};

// ─── Get Doctor's Visits ───────────────────────────────────────────────────────
export const getDoctorVisits = async (doctorUserId: number) => {
  const doctor = await doctorRepo.findByUserId(doctorUserId);
  if (!doctor) {
    throw new appError('Doctor profile not found', 404);
  }

  const visits = await visitRepo.getVisitsByDoctor(doctor.id);
  return {
    doctor_id: doctor.id,
    total: visits.length,
    visits,
  };
};

// ─── Update Visit ──────────────────────────────────────────────────────────────
export const updateVisit = async (id: number, body: UpdateVisitInput) => {
  const visit = await visitRepo.findRawById(id);
  if (!visit) {
    throw new appError(`Visit with ID ${id} not found`, 404);
  }

  // Business rule: cannot reopen a completed/cancelled visit
  if (
    ['completed', 'cancelled'].includes(visit.status) &&
    body.status === 'in_progress'
  ) {
    throw new appError(
      `Cannot move a '${visit.status}' visit back to 'in_progress'`,
      422,
    );
  }

  // If marking as completed and check_out_at not provided, set it to now
  const updateData: UpdateVisitInput = { ...body };
  if (body.status === 'completed' && !body.check_out_at) {
    updateData.check_out_at = new Date().toISOString();
  }

  // ─── Atomicity Fix: Wrap completion in transaction ────────────────────────
  if (visit.status !== 'completed' && body.status === 'completed') {
    return await db.transaction(async (trx) => {
      // 1. Update visit status
      const updatedVisit = await visitRepo.updateVisit(id, updateData, trx);

      // 2. Fetch doctor for fee
      const doctor = await doctorRepo.findById(visit.doctor_id, trx);
      const consultation_fee = doctor
        ? Number(doctor.consultation_fee) || 0
        : 0;

      // 3. Create invoice
      await billingService.createInitialInvoice(
        id,
        visit.patient_id,
        consultation_fee,
        trx,
      );

      return visitRepo.getVisitDetails(id);
    });
  }

  // Regular update (non-completion)
  await visitRepo.updateVisit(id, updateData);
  return visitRepo.getVisitDetails(id);
};

// ─── Delete Visit (admin only) ─────────────────────────────────────────────────
export const deleteVisit = async (id: number) => {
  const visit = await visitRepo.findRawById(id);
  if (!visit) {
    throw new appError(`Visit with ID ${id} not found`, 404);
  }

  if (visit.status === 'in_progress') {
    throw new appError(
      `Cannot delete a visit that is still in progress. Cancel it first.`,
      422,
    );
  }

  await visitRepo.updateVisit(id, { status: 'cancelled' });
  return { message: 'Visit cancelled successfully' };
};

// ─── Format Vitals Summary (helper) ───────────────────────────────────────────────────────────
const formatVitalsSummary = (vitals: Vitals | null): string | null => {
  if (!vitals) return null;
  const parts: string[] = [];
  if (vitals.bp)          parts.push(`BP: ${vitals.bp}`);
  if (vitals.pulse)       parts.push(`Pulse: ${vitals.pulse} bpm`);
  if (vitals.temperature) parts.push(`Temp: ${vitals.temperature}°C`);
  if (vitals.weight)      parts.push(`Weight: ${vitals.weight} kg`);
  return parts.length > 0 ? parts.join(' | ') : null;
};

// ─── Record Vitals (nurse action) ───────────────────────────────────────────────────────────
export const recordVitals = async (
  visitId: number,
  vitalsData: Vitals,
  nurseUserId: number,
) => {
  // 1. Resolve the nurse profile from the authenticated user's ID
  const nurse = await nurseRepo.findByUserId(nurseUserId);
  if (!nurse) {
    throw new appError('Nurse profile not found for this user', 404);
  }

  // 2. Verify the visit exists
  const visit = await visitRepo.findRawById(visitId);
  if (!visit) {
    throw new appError(`Visit with ID ${visitId} not found`, 404);
  }

  // 3. Business rule: vitals can only be recorded when visit is awaiting_vitals
  if (visit.status !== 'awaiting_vitals') {
    throw new appError(
      `Cannot record vitals: visit status is '${visit.status}', expected 'awaiting_vitals'`,
      422,
    );
  }

  // 4. Save vitals and transition status → ready_for_doctor
  await visitRepo.recordVitals(visitId, vitalsData, nurse.id);

  // Return enriched visit detail
  return visitRepo.getVisitDetails(visitId);
};

// ─── Get Pending Visits (doctor dashboard) ──────────────────────────────────────────────
export const getPendingVisits = async (doctorUserId: number) => {
  const doctor = await doctorRepo.findByUserId(doctorUserId);
  if (!doctor) {
    throw new appError('Doctor profile not found', 404);
  }

  const visits = await visitRepo.getPendingVisitsForDoctor(doctor.id);

  // Attach a pre-formatted vitals summary string for frontend display
  const visitsWithSummary = visits.map((v: any) => ({
    ...v,
    vitals_summary: formatVitalsSummary(v.vitals),
  }));

  return {
    doctor_id: doctor.id,
    total: visitsWithSummary.length,
    visits: visitsWithSummary,
  };
};
