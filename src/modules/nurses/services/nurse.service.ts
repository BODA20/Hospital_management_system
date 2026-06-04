import * as nurseRepo from '../repositories/nurse.repository';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as deptRepo from '../../department/repositories/department.repo';
import { appError } from '../../../common/errors/AppError';

// ─── Create Nurse ──────────────────────────────────────────────────────────────
export const createNurse = async (body: {
  user_id: number;
  department_id: number;
  shift: 'morning' | 'evening' | 'night';
  years_of_experience?: number;
  notes?: string;
}) => {
  const { department_id } = body;

  // 1. Ensure the target department exists (404 guard — business logic)
  const department = await deptRepo.findById(department_id);
  if (!department) {
    throw new appError(`Department with ID ${department_id} not found`, 404);
  }

  // DB UNIQUE constraints on nurses.user_id handle
  // duplicates automatically. The errorHandler catches pg 23505 → clean 409.
  return nurseRepo.createNurse(body);
};

// ─── Get All Nurses ────────────────────────────────────────────────────────────
export const getAllNurses = async () => {
  return nurseRepo.getNurses();
};

// ─── Get Single Nurse ──────────────────────────────────────────────────────────
export const getNurseById = async (id: number) => {
  const nurse = await nurseRepo.findById(id);
  if (!nurse) {
    throw new appError(`Nurse with ID ${id} not found`, 404);
  }
  return nurse;
};


// ─── Update Nurse ──────────────────────────────────────────────────────────────
export const updateNurse = async (
  id: number,
  body: Partial<{
    department_id: number;
    shift: 'morning' | 'evening' | 'night';
    years_of_experience: number;
    notes: string;
  }>,
) => {
  const nurse = await getNurseById(id);

  if (body.department_id) {
    const department = await deptRepo.findById(body.department_id);
    if (!department) {
      throw new appError(`Department with ID ${body.department_id} not found`, 404);
    }
  }

  return nurseRepo.updateNurse(id, body);
};

// ─── Delete Nurse ──────────────────────────────────────────────────────────────
export const deleteNurse = async (id: number) => {
  await getNurseById(id);
  await nurseRepo.deleteNurse(id);
  return { message: 'Nurse profile deleted successfully' };
};
