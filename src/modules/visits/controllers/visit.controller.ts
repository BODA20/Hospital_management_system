import { Request, Response } from 'express';
import * as visitService from '../services/visit.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';

// ─── Create Visit ──────────────────────────────────────────────────────────────
export const createVisit = asyncHandler(async (req: Request, res: Response) => {
  const visit = await visitService.createVisit(req.body);
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
  const result = await visitService.deleteVisit(Number(req.params.id));
  res.json({ status: 'success', data: result });
});

// ─── Record Vitals (nurse action) ─────────────────────────────────────────────
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
