import { Response } from 'express';
import * as service from '../services/appo.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { logAuditEvent } from '../../audit/services/audit.service';

// ─── Create Appointment (Patient / Staff / Admin) ─────────────────────────────
export const createAppointment = asyncHandler(
  async (req: any, res: Response) => {
    const appointment = await service.createAppointment(req.user, req.body);
    
    await logAuditEvent(req, {
      action_type: 'APPOINTMENT_BOOKED',
      actor_name:  req.user?.full_name ?? req.user?.email ?? 'User',
      description: `Appointment #${appointment.id} booked for Patient: '${appointment.patient_name}' with Doctor: '${appointment.doctor_name}' on ${appointment.appointment_date || appointment.starts_at} (${appointment.time_slot || 'N/A'})`,
    });

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

// ─── All Doctor Appointments (Doctor) ──────────────────────────────────────────
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

// ─── All Appointments (Admin Master View) ──────────────────────────────────────
export const getAllAppointments = asyncHandler(
  async (req: any, res: Response) => {
    const data = await service.getAllAppointments(req.query);

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
  const appointmentId = Number(req.params.id);
  const updated = await service.updateStatus(
    appointmentId,
    req.body.status,
    req.user,
    req.body.notes,
  );

  await logAuditEvent(req, {
    action_type: 'APPOINTMENT_STATUS_UPDATED',
    user_id:     req.user?.id ?? null,
    actor_name:  req.user?.full_name ?? req.user?.email ?? 'User',
    description: `Appointment #${appointmentId} status changed to '${req.body.status}' by ${req.user?.role?.toUpperCase()}`,
  });

  res.json({
    status: 'success',
    data: updated,
  });
});

// ─── Complete Appointment Endpoint Action ─────────────────────────────────────
export const completeAppointment = asyncHandler(async (req: any, res: Response) => {
  const appointmentId = Number(req.params.id);
  const updated = await service.completeAppointment(appointmentId, req.user);

  await logAuditEvent(req, {
    action_type: 'APPOINTMENT_STATUS_UPDATED',
    user_id:     req.user?.id ?? null,
    actor_name:  req.user?.full_name ?? req.user?.email ?? 'User',
    description: `Appointment #${appointmentId} status completed by ${req.user?.role?.toUpperCase()}`,
  });

  res.json({
    status: 'success',
    data: updated,
  });
});

export const checkInAppointment = asyncHandler(async (req: any, res: Response) => {
  const appointmentId = Number(req.params.id);
  const updated = await service.checkInAppointment(appointmentId, req.user);

  await logAuditEvent(req, {
    action_type: 'APPOINTMENT_STATUS_UPDATED',
    user_id:     req.user?.id ?? null,
    actor_name:  req.user?.full_name ?? req.user?.email ?? 'User',
    description: `Appointment #${appointmentId} checked in by ${req.user?.role?.toUpperCase()}`,
  });

  res.json({
    status: 'success',
    data: updated,
  });
});

export const publicAppointmentAction = asyncHandler(async (req: any, res: Response) => {
  const result = await service.publicAppointmentAction(req.body);
  res.json({
    status: 'success',
    data: result,
  });
});

export const confirmByToken = asyncHandler(async (req: any, res: Response) => {
  const result = await service.confirmByToken(req.body);
  res.json({
    status: 'success',
    data: result,
  });
});

export const cancelByToken = asyncHandler(async (req: any, res: Response) => {
  const result = await service.cancelByToken(req.body);
  res.json({
    status: 'success',
    data: result,
  });
});



// ─── Reschedule Appointment (Admin / Staff) ────────────────────────────────────
export const rescheduleAppointment = asyncHandler(async (req: any, res: Response) => {
  const appointmentId = Number(req.params.id);
  const updated = await service.rescheduleAppointment(
    appointmentId,
    req.user,
    req.body,
  );

  await logAuditEvent(req, {
    action_type: 'APPOINTMENT_STATUS_UPDATED',
    user_id:     req.user?.id ?? null,
    actor_name:  req.user?.full_name ?? req.user?.email ?? 'User',
    description: `Appointment #${appointmentId} rescheduled to Date: '${updated.appointment_date}', Time: '${updated.time_slot}'`,
  });

  res.json({
    status: 'success',
    data: updated,
  });
});

// ─── REQ 3: Confirm Attendance (email CTA – no auth required) ─────────────────
export const confirmAttendance = asyncHandler(async (req: any, res: Response) => {
  const appointmentId = Number(req.params.id);
  if (!appointmentId || isNaN(appointmentId)) {
    res.status(400).send('<h2 style="font-family:sans-serif;color:#dc2626;">Invalid appointment link.</h2>');
    return;
  }

  await service.setAttendanceStatus(appointmentId, 'confirmed_by_patient');

  res.status(200).send(`
    <html><body style="font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f0fdf4;margin:0;">
      <div style="text-align:center;background:white;padding:40px 48px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:440px;">
        <div style="font-size:56px;margin-bottom:16px;">✅</div>
        <h2 style="color:#166534;margin:0 0 8px;font-size:22px;">Attendance Confirmed</h2>
        <p style="color:#475569;font-size:15px;margin:0;">Your appointment attendance has been confirmed. Please arrive 10 minutes early at the clinic reception.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px;">Medicare Hospital Management System</p>
      </div>
    </body></html>
  `);
});

// ─── REQ 3: Cancel Appointment by Patient (email CTA – no auth required) ──────
export const cancelByPatient = asyncHandler(async (req: any, res: Response) => {
  const appointmentId = Number(req.params.id);
  if (!appointmentId || isNaN(appointmentId)) {
    res.status(400).send('<h2 style="font-family:sans-serif;color:#dc2626;">Invalid appointment link.</h2>');
    return;
  }

  await service.cancelByPatientEmail(appointmentId);

  res.status(200).send(`
    <html><body style="font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fef2f2;margin:0;">
      <div style="text-align:center;background:white;padding:40px 48px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:440px;">
        <div style="font-size:56px;margin-bottom:16px;">❌</div>
        <h2 style="color:#991b1b;margin:0 0 8px;font-size:22px;">Appointment Cancelled</h2>
        <p style="color:#475569;font-size:15px;margin:0;">Your appointment has been cancelled and the time slot has been freed. You can book a new appointment from your patient dashboard.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:20px;">Medicare Hospital Management System</p>
      </div>
    </body></html>
  `);
});

