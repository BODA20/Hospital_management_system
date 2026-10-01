import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import db from '../../../config/db';
import { logAuditEvent } from '../../audit/services/audit.service';
import { appError } from '../../../common/errors/AppError';

export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  const departments = await db('departments').select('*').orderBy('id', 'asc');
  res.status(200).json({
    status: 'success',
    data: departments
  });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { name_en, name_ar } = req.body;

  if (!name_en || !name_ar) {
    throw new appError('Both English and Arabic department names are required', 400);
  }

  // Check if department name already exists in name or name_en
  const existingDept = await db('departments')
    .where('name', name_en)
    .orWhere('name_en', name_en)
    .first();

  if (existingDept) {
    throw new appError('Department name already exists', 400);
  }

  // Generate a unique code
  let baseCode = name_en.trim().substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (baseCode.length < 2) baseCode = 'DEPT';
  let code = baseCode;
  let attempts = 0;
  
  while (attempts < 10) {
    const codeCheck = await db('departments').where('code', code).first();
    if (!codeCheck) break;
    code = `${baseCode}${Math.floor(Math.random() * 900) + 100}`;
    attempts++;
  }

  const [newDepartment] = await db('departments')
    .insert({
      name: name_en,
      name_en,
      name_ar,
      code,
      description: `Hospital specialty department: ${name_en}`
    })
    .returning('*');

  const adminUser = req.user as any;
  // Trigger security audit log
  await logAuditEvent(req, {
    action_type: 'DEPARTMENT_CREATED',
    user_id: adminUser?.id ?? null,
    actor_name: adminUser?.full_name ?? adminUser?.email ?? 'Admin',
    description: `Admin created a new hospital department: ${name_en}`
  });

  res.status(201).json({
    status: 'success',
    data: newDepartment
  });
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const deptId = parseInt(req.params.id as string, 10);

  if (!deptId || isNaN(deptId)) {
    throw new appError('Valid numeric Department ID is required', 400);
  }

  try {
    // Find another department to reassign doctors and nurses to (to prevent RESTRICT constraint violation)
    const otherDept = await db('departments').whereNot({ id: deptId }).first();
    if (otherDept) {
      await db('doctors').where({ department_id: deptId }).update({ department_id: otherDept.id });
      await db('nurses').where({ department_id: deptId }).update({ department_id: otherDept.id });
    } else {
      const docCount = await db('doctors').where({ department_id: deptId }).count('id as count').first();
      const nurseCount = await db('nurses').where({ department_id: deptId }).count('id as count').first();
      const docsNum = parseInt(docCount?.count as string || '0', 10);
      const nursesNum = parseInt(nurseCount?.count as string || '0', 10);
      if (docsNum > 0 || nursesNum > 0) {
        throw new appError('Cannot delete department. It is the last department and has assigned doctors/nurses.', 400);
      }
    }

    // Nullify or handle foreign key constraints on 'users' table before deleting
    await db<any>('users').where({ department_id: deptId }).update({ department_id: null });

    // Delete the department
    const deletedCount = await db('departments').where({ id: deptId }).del();

    if (!deletedCount) {
      throw new appError('Referenced record does not exist. Check your IDs and try again.', 404);
    }

    const adminUser = req.user as any;
    // Trigger telemetry audit log
    await logAuditEvent(req, {
      action_type: 'DEPARTMENT_DELETED',
      user_id: adminUser?.id ?? null,
      actor_name: adminUser?.full_name ?? adminUser?.email ?? 'Admin',
      description: `Admin deleted hospital department ID: ${req.params.id}`
    });

    res.status(200).json({
      status: 'success',
      message: 'Department removed successfully'
    });
  } catch (err: any) {
    if (err.statusCode) throw err;
    throw new appError(err.message || 'Referenced record does not exist. Check your IDs and try again.', 400);
  }
});


export const getDoctorsByDepartment = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = parseInt((req.params.departmentId || req.params.id) as string, 10);

  if (!departmentId || isNaN(departmentId)) {
    throw new appError('Valid numeric Department ID is required', 400);
  }

  const doctors = await db('doctors as d')
    .leftJoin('users as u', 'd.user_id', 'u.id')
    .leftJoin('departments as dept', 'd.department_id', 'dept.id')
    .select(
      'd.id',
      'd.user_id',
      'd.specialization',
      'd.years_of_experience',
      'd.bio',
      'd.consultation_fee',
      'd.license_number',
      'd.department_id',
      'u.full_name',
      'u.email',
      'u.phone',
      'dept.name_en as department_name'
    )
    .where('d.department_id', departmentId)
    .orWhere('u.department_id', departmentId)
    .orderBy('d.id', 'asc');

  res.status(200).json({
    status: 'success',
    results: doctors.length,
    data: doctors,
  });
});
