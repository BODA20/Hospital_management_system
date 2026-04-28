import * as deptRepo from '../repositories/department.repo';
import { appError } from '../../../common/errors/AppError';

const MAX_DEPARTMENTS = 5;

// ─── Create Department ─────────────────────────────────────────────────────────
export const createDepartment = async (body: {
  name: string;
  code: string;
  description?: string;
  head_doctor_id?: number;
}) => {
  // Constraint: max 5 departments (cannot be expressed as a DB constraint)
  const count = await deptRepo.countDepartments();
  if (count >= MAX_DEPARTMENTS) {
    throw new appError(
      `Maximum number of departments (${MAX_DEPARTMENTS}) reached. Cannot create more departments.`,
      400,
    );
  }

  // DB UNIQUE constraints on (name, code) will reject duplicates automatically.
  // The errorHandler catches pg error 23505 and returns a clean 409 response.
  return deptRepo.createDepartment(body);
};

// ─── Get All Departments ───────────────────────────────────────────────────────
export const getAllDepartments = async () => {
  return deptRepo.getAllDepartments();
};

// ─── Get Department by ID ──────────────────────────────────────────────────────
export const getDepartmentById = async (id: number) => {
  const department = await deptRepo.findById(id);
  if (!department) {
    throw new appError(`Department with ID ${id} not found`, 404);
  }
  return department;
};

// ─── Update Department ─────────────────────────────────────────────────────────
export const updateDepartment = async (
  id: number,
  body: Partial<{
    name: string;
    code: string;
    description: string;
    head_doctor_id: number;
  }>,
) => {
  // Ensure department exists
  await getDepartmentById(id);

  // DB UNIQUE constraints handle name/code conflicts.
  // The errorHandler catches pg error 23505 and returns a clean 409 response.
  return deptRepo.updateDepartment(id, body);
};

// ─── Delete Department ─────────────────────────────────────────────────────────
export const deleteDepartment = async (id: number) => {
  await getDepartmentById(id);

  // Guard: cannot delete a department that still has assigned doctors
  const doctorCount = await deptRepo.countDoctorsInDepartment(id);
  if (doctorCount > 0) {
    throw new appError(
      `Cannot delete this department — ${doctorCount} doctor(s) are still assigned to it. Reassign them first.`,
      400,
    );
  }

  await deptRepo.deleteDepartment(id);
  return { message: 'Department deleted successfully' };
};
