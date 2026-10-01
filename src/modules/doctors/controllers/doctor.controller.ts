import { Request, Response } from 'express';
import * as doctorsService from '../services/doctor.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { logAuditEvent } from '../../audit/services/audit.service';

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await doctorsService.getMyProfile(req.user.id);

  res.status(200).json({
    status: 'success',
    data: doctor,
  });
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const updated = await doctorsService.updateMyProfile(req.user.id, req.body);

  res.status(200).json({
    status: 'success',
    data: updated,
  });
});

export const adminUpdateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = parseInt(req.params.id as string, 10);
  const updated = await doctorsService.adminUpdateDoctor(doctorId, req.body);

  // Audit: admin updated a doctor's profile/metadata
  const adminUser = req.user as any;
  logAuditEvent(req, {
    action_type: 'DOCTOR_UPDATED',
    user_id:     adminUser?.id ?? null,
    actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
    description: `Admin updated doctor record ID: ${doctorId} (fields: ${Object.keys(req.body).join(', ')})`,
  });

  res.status(200).json({
    status: 'success',
    data: updated,
  });
});

export const getAllDoctors = asyncHandler(async (req: Request, res: Response) => {
  const doctors = await doctorsService.getAllDoctors(req.query);

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: doctors,
  });
});

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = parseInt(req.params.id as string, 10);
  const doctor = await doctorsService.getDoctorById(doctorId);

  res.status(200).json({
    status: 'success',
    data: doctor,
  });
});

export const getMyAppointments = asyncHandler(async (req: Request, res: Response) => {
  const appointments = await doctorsService.getDoctorAppointments(req.user.id);

  res.status(200).json({
    status: 'success',
    results: appointments?.length || 0,
    data: appointments,
  });
});

export const getAvailableSlots = asyncHandler(async (req: Request, res: Response) => {
  const doctorId = parseInt(req.params.doctorId as string, 10);
  const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const slots = await doctorsService.getAvailableSlots(doctorId, dateStr);

  res.status(200).json({
    status: 'success',
    date: dateStr,
    results: slots.length,
    data: slots,
  });
});

export const saveDoctorNotes = asyncHandler(async (req: Request, res: Response) => {
  const result = await doctorsService.saveDoctorNotes(req.user.id, req.body);

  logAuditEvent(req, {
    action_type: 'VISIT_CREATED',
    user_id: req.user.id,
    actor_name: (req.user as any)?.full_name || (req.user as any)?.email || 'Doctor',
    description: `Doctor saved diagnosis & prescriptions for patient ID ${req.body.patient_id}`,
  });

  res.status(200).json({
    status: 'success',
    message: 'Diagnosis and prescriptions saved successfully',
    data: result,
  });
});

