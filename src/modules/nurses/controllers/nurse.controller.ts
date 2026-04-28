import { Request, Response } from 'express';
import * as nurseService from '../services/nurse.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const createNurse = asyncHandler(async (req: Request, res: Response) => {
  const nurse = await nurseService.createNurse(req.body);
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

export const getNursesByDoctor = asyncHandler(async (req: Request, res: Response) => {
  const data = await nurseService.getNursesByDoctor(req.user.id);
  res.json({ status: 'success', data });
});

export const updateNurse = asyncHandler(async (req: Request, res: Response) => {
  const updated = await nurseService.updateNurse(Number(req.params.id), req.body);
  res.json({ status: 'success', data: updated });
});

export const deleteNurse = asyncHandler(async (req: Request, res: Response) => {
  const result = await nurseService.deleteNurse(Number(req.params.id));
  res.json({ status: 'success', data: result });
});
