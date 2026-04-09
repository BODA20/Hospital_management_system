import { Response } from 'express';
import * as service from '../services/appo.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';

// ─── Create Appointment (Patient) ──────────────────────────────────────────────
export const createAppointment = asyncHandler(
  async (req: any, res: Response) => {
    const appointment = await service.createAppointment(req.user.id, req.body);

    res.status(201).json({
      status: 'success',
      data: appointment,
    });
  },
);

// ─── My Appointments (Patient) ─────────────────────────────────────────────────
export const getMyAppointments = asyncHandler(
  async (req: any, res: Response) => {
    const data = await service.getMyAppointments(req.user.id);

    res.json({
      status: 'success',
      results: data.length,
      data,
    });
  },
);

// ─── All Doctor Appointments ───────────────────────────────────────────────────
export const getDoctorAppointments = asyncHandler(
  async (req: any, res: Response) => {
    const data = await service.getDoctorAppointments(req.user.id);

    res.json({
      status: 'success',
      results: data.length,
      data,
    });
  },
);

// ─── Doctor Daily Schedule ─────────────────────────────────────────────────────
export const getDailySchedule = asyncHandler(
  async (req: any, res: Response) => {
    const schedule = await service.getDoctorDailySchedule(req.user.id);

    res.json({
      status: 'success',
      data: schedule,
    });
  },
);

// ─── Update Appointment Status ─────────────────────────────────────────────────
export const updateStatus = asyncHandler(async (req: any, res: Response) => {
  const updated = await service.updateStatus(
    Number(req.params.id),
    req.body.status,
    req.user,
  );

  res.json({
    status: 'success',
    data: updated,
  });
});
