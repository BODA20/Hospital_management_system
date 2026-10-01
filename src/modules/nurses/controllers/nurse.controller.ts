import { Request, Response } from 'express';
import * as nurseService from '../services/nurse.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { logAuditEvent } from '../../audit/services/audit.service';

export const createNurse = asyncHandler(async (req: Request, res: Response) => {
  const nurse = await nurseService.createNurse(req.body);

  const adminUser = req.user as any;
  logAuditEvent(req, {
    action_type: 'NURSE_CREATED',
    user_id:     adminUser?.id ?? null,
    actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
    description: `Admin manually created nurse record (Nurse ID: ${nurse?.id ?? 'N/A'})`,
  });

  res.status(201).json({ status: 'success', data: nurse });
});

export const getAllNurses = asyncHandler(async (_req: Request, res: Response) => {
  const nurses = await nurseService.getAllNurses();
  res.json({ status: 'success', results: nurses.length, data: nurses });
});

export const getNurseById = asyncHandler(async (req: Request, res: Response) => {
  const nurse = await nurseService.getNurseById(Number(req.params.id));
  res.json({ status: 'success', data: nurse });
});


export const updateNurse = asyncHandler(async (req: Request, res: Response) => {
  const updated = await nurseService.updateNurse(Number(req.params.id), req.body);

  const adminUser = req.user as any;
  logAuditEvent(req, {
    action_type: 'NURSE_UPDATED',
    user_id:     adminUser?.id ?? null,
    actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
    description: `Admin updated nurse record ID: ${req.params.id} (fields: ${Object.keys(req.body).join(', ')})`,
  });

  res.json({ status: 'success', data: updated });
});

export const deleteNurse = asyncHandler(async (req: Request, res: Response) => {
  const result = await nurseService.deleteNurse(Number(req.params.id));

  const adminUser = req.user as any;
  logAuditEvent(req, {
    action_type: 'NURSE_DELETED',
    user_id:     adminUser?.id ?? null,
    actor_name:  adminUser?.full_name ?? adminUser?.email ?? 'Admin',
    description: `Admin deleted nurse record ID: ${req.params.id}`,
  });

  res.json({ status: 'success', data: result });
});

export const getMyBeds = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: [
      { id: 201, bed_number: 'Bed-12A', ward_name: 'Intensive Care Unit (ICU)', status: 'occupied', patient_name: 'John Doe' },
      { id: 202, bed_number: 'Bed-12B', ward_name: 'Intensive Care Unit (ICU)', status: 'available' },
      { id: 203, bed_number: 'Bed-05C', ward_name: 'General Ward A', status: 'cleaning' }
    ]
  });
});

export const getMyTasks = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: [
      { id: 1, description: 'Administer IV fluids to Bed-12A', status: 'pending', due_time: '14:30' },
      { id: 2, description: 'Check post-op vitals for Sarah Smith', status: 'completed', due_time: '12:00' }
    ]
  });
});

export const getVitalsQueue = asyncHandler(async (_req: Request, res: Response) => {
  const queue = await nurseService.getVitalsQueue();
  res.status(200).json({
    status: 'success',
    results: queue.length,
    data: queue,
  });
});
