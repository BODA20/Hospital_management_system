import * as doctorsRepo from '../repositories/doctor.repo';
import * as usersRepo from '../../users/repositories/user.repo';
import { appError } from '../../../common/errors/AppError';
import { UpdateDoctorInput } from '../doctor.schema';

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
  const doctor = await doctorsRepo.findByUserId(userId);

  if (!doctor) {
    throw new appError('Doctor profile not found', 404);
  }

  return doctorsRepo.updateByUserId(userId, body);
};

// PUBLIC: GET ALL DOCTORS
export const getAllDoctors = async () => {
  return doctorsRepo.getAllDoctors();
};
