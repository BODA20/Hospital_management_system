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
    experience_years: 0,
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
export const updateMyProfile = async (userId: number, body: UpdateDoctorInput) => {
  const { user_id, role, ...allowedUpdates } = body as any;

  if (allowedUpdates.experience_years !== undefined) {
    allowedUpdates.experience_years = Math.floor(allowedUpdates.experience_years);
    allowedUpdates.years_of_experience = allowedUpdates.experience_years;
    delete allowedUpdates.experience_years;
  }

  return db.transaction(async (trx) => {
    if (allowedUpdates.phone !== undefined) {
      const { phone, ...doctorUpdates } = allowedUpdates;
      await usersRepo.updateUserById(userId, { phone }, trx);
      
      const doctor = await doctorsRepo.findByUserId(userId, trx);
      if (!doctor) throw new appError('Doctor profile not found', 404);
      
      return doctorsRepo.updateByUserId(userId, doctorUpdates, trx);
    } else {
      const doctor = await doctorsRepo.findByUserId(userId, trx);
      if (!doctor) throw new appError('Doctor profile not found', 404);
      
      return doctorsRepo.updateByUserId(userId, allowedUpdates, trx);
    }
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
