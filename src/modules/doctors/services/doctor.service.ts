import * as doctorsRepo from '../repositories/doctor.repo';
import * as usersRepo from '../../users/repositories/user.repo';
import * as appointmentsRepo from '../../appointments/repositories/appo.repo';
import { appError } from '../../../common/errors/AppError';
import { UpdateDoctorInput } from '../doctor.schema';
import db from '../../../config/db';

export const createDoctorProfile = async (userId: number) => {
  const user = await usersRepo.findUserById(userId);

  if (!user || user.role !== 'doctor') {
    throw new appError('Only doctors allowed', 403);
  }

  const existing = await doctorsRepo.findByUserId(userId);

  if (existing) {
    throw new appError('A doctor profile already exists for this user', 409);
  }

  return doctorsRepo.createDoctor({
    user_id: userId,
    specialization: null,
    years_of_experience: 0,
    bio: '',
    consultation_fee: 0,
  });
};

// GET MY PROFILE
export const getMyProfile = async (userId: number) => {
  const doctor = await doctorsRepo.findByUserId(userId);

  if (!doctor) {
    throw new appError('Doctor profile not found', 404);
  }

  return doctor;
};

// UPDATE MY PROFILE
export const updateMyProfile = async (userId: number, body: any) => {
  return db.transaction(async (trx) => {
    // Check if profile exists
    const doctor = await doctorsRepo.findByUserId(userId, trx);
    if (!doctor) throw new appError('Doctor profile not found', 404);

    // Data Consistency: Strip restricted fields to prevent overwriting context
    const { user_id, role, ...updateData } = body;

    // Formatting: Handle years_of_experience / experience_years (TDD requirement)
    if (updateData.experience_years !== undefined) {
      updateData.years_of_experience = updateData.experience_years;
      delete updateData.experience_years;
    }

    if (updateData.years_of_experience !== undefined) {
      updateData.years_of_experience = Math.round(Number(updateData.years_of_experience));
    }
    
    return doctorsRepo.updateByUserId(userId, updateData as UpdateDoctorInput, trx);
  });
};

// ADMIN OVERRIDE
export const adminUpdateDoctor = async (doctorId: number, body: UpdateDoctorInput) => {
  const doctor = await doctorsRepo.findById(doctorId);
  if (!doctor) throw new appError('Doctor profile not found', 404);

  return doctorsRepo.updateByUserId(doctor.user_id, body);
};

// PUBLIC: GET ALL DOCTORS
export const getAllDoctors = async (query: any = {}) => {
  const filters = {
    specialization: query.specialization as string,
    name: query.name as string,
  };
  return doctorsRepo.getAllDoctors(filters);
};

// PUBLIC: GET DOCTOR BY ID
export const getDoctorById = async (id: number) => {
  const doctor = await doctorsRepo.findById(id);
  if (!doctor) throw new appError('Doctor not found', 404);
  return doctor;
};

// PROTECTED: GET DOCTOR APPOINTMENTS
export const getDoctorAppointments = async (userId: number) => {
  const doctor = await doctorsRepo.findByUserId(userId);
  if (!doctor) throw new appError('Doctor profile not found', 404);
  
  return appointmentsRepo.getByDoctor(doctor.id);
};
