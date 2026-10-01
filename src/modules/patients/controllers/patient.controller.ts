import { Request, Response } from 'express';
import * as patientService from '../services/patient.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { logAuditEvent } from '../../audit/services/audit.service';

// ─── Create Patient (admin) ────────────────────────────────────────────────────
export const createPatient = asyncHandler(
  async (req: Request, res: Response) => {
    const patient = await patientService.createPatient(req.body);

    // Audit: admin manually created a patient record
    const adminUser = req.user as any;
    logAuditEvent(req, {
      action_type: 'PATIENT_CREATED',
      user_id:     adminUser?.id ?? null,
      actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
      description: `Admin created patient record (Patient ID: ${patient?.id ?? 'N/A'}, email: ${req.body.email ?? 'N/A'})`,
    });

    res.status(201).json({ status: 'success', data: patient });
  },
);

// ─── Get All Patients (admin/doctor) ──────────────────────────────────────────
export const getAllPatients = asyncHandler(
  async (req: Request, res: Response) => {
    const { page = 1, limit = 20, search } = req.query as any;

    const result = await patientService.getAllPatients({
      page: Number(page),
      limit: Number(limit),
      search: search as string | undefined,
    });

    res.json({
      status: 'success',
      results: result.data.length,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      data: result.data,
    });
  },
);

// ─── Get Single Patient (admin/doctor) ────────────────────────────────────────
export const getPatientById = asyncHandler(
  async (req: Request, res: Response) => {
    const patient = await patientService.getPatientById(Number(req.params.id));
    res.json({ status: 'success', data: patient });
  },
);

// ─── Get My Profile (patient) ─────────────────────────────────────────────────
export const getMyProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const patient = await patientService.getMyProfile(req.user.id);
    res.json({ status: 'success', data: patient });
  },
);

// ─── Update Patient (admin or self) ───────────────────────────────────────────
export const updatePatient = asyncHandler(
  async (req: Request, res: Response) => {
    const updated = await patientService.updatePatient(
      Number(req.params.id),
      req.body,
    );
    res.json({ status: 'success', data: updated });
  },
);

// ─── Delete Patient (admin) ───────────────────────────────────────────────────
export const deletePatient = asyncHandler(
  async (req: Request, res: Response) => {
    const patientId = Number(req.params.id);
    const result = await patientService.deletePatient(patientId);

    // Audit: admin deleted a patient record
    const adminUser = req.user as any;
    logAuditEvent(req, {
      action_type: 'PATIENT_DELETED',
      user_id:     adminUser?.id ?? null,
      actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
      description: `Admin deleted patient record ID: ${patientId}`,
    });

    res.json({ status: 'success', data: result });
  },
);

// ─── Get All Appointments for a Patient (admin/doctor) ────────────────────────
export const getPatientAppointments = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await patientService.getPatientAppointments(
      Number(req.params.id),
    );
    res.json({ status: 'success', data: result });
  },
);

// ─── Get My Appointments (patient — self-service) ─────────────────────────────
export const getMyAppointments = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await patientService.getMyAppointments(req.user.id);
    res.json({ status: 'success', data: result });
  },
);

export const getMyMedicalRecords = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await patientService.getMyMedicalRecords(req.user.id);
    res.json({ status: 'success', results: result.length, data: result });
  },
);

