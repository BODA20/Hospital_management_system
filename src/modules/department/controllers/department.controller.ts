import { Request, Response } from 'express';
import * as deptService from '../services/department.service';
import { asyncHandler } from '../../../common/utils/asyncHandler';

// ─── Create Department (admin only) ───────────────────────────────────────────
export const createDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const department = await deptService.createDepartment(req.body);

    res.status(201).json({
      status: 'success',
      data: department,
    });
  },
);

// ─── Get All Departments ───────────────────────────────────────────────────────
export const getAllDepartments = asyncHandler(
  async (_req: Request, res: Response) => {
    const departments = await deptService.getAllDepartments();

    res.json({
      status: 'success',
      results: departments.length,
      data: departments,
    });
  },
);

// ─── Get Single Department ─────────────────────────────────────────────────────
export const getDepartmentById = asyncHandler(
  async (req: Request, res: Response) => {
    const department = await deptService.getDepartmentById(
      Number(req.params.id),
    );

    res.json({
      status: 'success',
      data: department,
    });
  },
);

// ─── Update Department (admin only) ───────────────────────────────────────────
export const updateDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const updated = await deptService.updateDepartment(
      Number(req.params.id),
      req.body,
    );

    res.json({
      status: 'success',
      data: updated,
    });
  },
);

// ─── Delete Department (admin only) ───────────────────────────────────────────
export const deleteDepartment = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await deptService.deleteDepartment(Number(req.params.id));

    res.json({
      status: 'success',
      data: result,
    });
  },
);
