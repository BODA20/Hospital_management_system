import * as nurseRepo from '../repositories/nurse.repository';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as deptRepo from '../../department/repositories/department.repo';
import { appError } from '../../../common/errors/AppError';

// ─── Create Nurse ──────────────────────────────────────────────────────────────
export const createNurse = async (body: {
  user_id: number;
  department_id: number;
  doctor_id: number;
  license_number: string;
  shift: 'morning' | 'evening' | 'night';
  years_of_experience?: number;
  notes?: string;
}) => {
  const { department_id, doctor_id } = body;

  // 1. Ensure the target department exists (404 guard — business logic)
  const department = await deptRepo.findById(department_id);
  if (!department) {
    throw new appError(`Department with ID ${department_id} not found`, 404);
  }

  // 2. Ensure the target doctor exists (404 guard — business logic)
  const doctor = await doctorRepo.findById(doctor_id);
  if (!doctor) {
    throw new appError(`Doctor with ID ${doctor_id} not found`, 404);
  }

  // 3. BUSINESS RULE: Doctor must belong to the same department as the nurse
  if (doctor.department_id !== department_id) {
    throw new appError(
      `Doctor (ID: ${doctor_id}) belongs to department "${doctor.department_name ?? doctor.department_id}", ` +
        `not to the requested department "${department.name}". ` +
        `A nurse can only be assigned to a doctor within the same department.`,
      422,
    );
  }

  // DB UNIQUE constraints on nurses.user_id and nurses.license_number handle
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

// ─── Get Nurses by Doctor ──────────────────────────────────────────────────────
export const getNursesByDoctor = async (doctorUserId: number) => {
  const doctor = await doctorRepo.findByUserId(doctorUserId);
  if (!doctor) {
    throw new appError('Doctor profile not found', 404);
  }

  const nurses = await nurseRepo.getNursesByDoctor(doctor.id);
  return {
    doctor_id: doctor.id,
    doctor_name: doctor.full_name ?? null,
    total: nurses.length,
    nurses,
  };
};

// ─── Update Nurse ──────────────────────────────────────────────────────────────
export const updateNurse = async (
  id: number,
  body: Partial<{
    department_id: number;
    doctor_id: number;
    license_number: string;
    shift: 'morning' | 'evening' | 'night';
    years_of_experience: number;
    notes: string;
  }>,
) => {
  const nurse = await getNurseById(id);

  const newDepartmentId = body.department_id ?? nurse.department_id;
  const newDoctorId = body.doctor_id ?? nurse.doctor_id;

  // Re-apply business rule if either doctor or department is changing
  if (body.department_id || body.doctor_id) {
    const doctor = await doctorRepo.findById(newDoctorId);
    if (!doctor) {
      throw new appError(`Doctor with ID ${newDoctorId} not found`, 404);
    }

    if (doctor.department_id !== newDepartmentId) {
      const department = await deptRepo.findById(newDepartmentId);
      throw new appError(
        `Doctor (ID: ${newDoctorId}) is in department "${doctor.department_name ?? doctor.department_id}", ` +
          `not "${department?.name ?? newDepartmentId}". ` +
          `A nurse must be in the same department as their assigned doctor.`,
        422,
      );
    }
  }

  // DB UNIQUE constraint on license_number handles duplicates → errorHandler catches 23505.
  return nurseRepo.updateNurse(id, body);
};

// ─── Delete Nurse ──────────────────────────────────────────────────────────────
export const deleteNurse = async (id: number) => {
  await getNurseById(id);
  await nurseRepo.deleteNurse(id);
  return { message: 'Nurse profile deleted successfully' };
};
