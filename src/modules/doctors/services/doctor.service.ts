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
export const getDoctorAppointments = async (userId: number, date?: string) => {
  const doctor = await doctorsRepo.findByUserId(userId);
  if (!doctor) throw new appError('Doctor profile not found', 404);
  
  return appointmentsRepo.getByDoctor(doctor.id, date);
};

export interface SlotInfo {
  slot: string;       // HH:mm (24h)
  isBooked: boolean;
  isPast: boolean;
}

export const getAvailableSlots = async (doctorId: number, dateStr: string): Promise<SlotInfo[]> => {
  const doctor = await doctorsRepo.findById(doctorId);
  if (!doctor) throw new appError('Doctor profile not found', 404);

  // 1. NATIVE COMPONENT PARSING (Bypasses format & UTC timezone mismatches)
  const now = new Date();
  
  let targetDate: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    targetDate = new Date(y, m - 1, d);
  } else {
    targetDate = new Date(dateStr);
  }

  const targetY = targetDate.getFullYear();
  const targetM = targetDate.getMonth();
  const targetD = targetDate.getDate();

  const currentY = now.getFullYear();
  const currentM = now.getMonth();
  const currentD = now.getDate();

  const isToday = targetY === currentY && targetM === currentM && targetD === currentD;
  const targetTime = new Date(targetY, targetM, targetD).getTime();
  const currentTimeBase = new Date(currentY, currentM, currentD).getTime();
  const isPastDate = targetTime < currentTimeBase;

  // 2. STRICT PAST DATE GUARD – return empty for past dates
  if (isPastDate) {
    return [];
  }

  const doctorUser = (doctor as any).user || await db('users').where({ id: doctor.user_id }).first();
  const rawShift = doctorUser?.assigned_shift || 'Morning';
  const isNightShift = String(rawShift).toLowerCase().includes('night');

  // 3. Generate ALL 30-minute slots based on shift
  const allSlots: string[] = [];
  if (isNightShift) {
    // Night Shift: 04:00 PM to 12:00 AM (16:00 to 24:00)
    for (let hour = 16; hour < 24; hour++) {
      const hStr = String(hour).padStart(2, '0');
      allSlots.push(`${hStr}:00`);
      allSlots.push(`${hStr}:30`);
    }
  } else {
    // Day Shift: 08:00 AM to 04:00 PM (08:00 to 16:00)
    for (let hour = 8; hour < 16; hour++) {
      const hStr = String(hour).padStart(2, '0');
      allSlots.push(`${hStr}:00`);
      allSlots.push(`${hStr}:30`);
    }
  }

  // 4. Compute current time in minutes for today's past-slot check
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMins = currentHour * 60 + currentMinute;

  // 5. Fetch booked slots
  const normalizedDateStr = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(targetD).padStart(2, '0')}`;
  const bookedSlots = await doctorsRepo.getBookedSlotsForDoctor(doctorId, normalizedDateStr);

  // 6. Return ALL slots with status flags (booked / past / available)
  return allSlots.map((slot) => {
    const isBooked = bookedSlots.some(
      (booked) => booked.startsWith(slot) || slot.startsWith(booked),
    );
    const [h, m] = slot.split(':').map(Number);
    const slotTimeInMins = h * 60 + m;
    const isPast = isToday && slotTimeInMins <= currentTimeInMins;

    return { slot, isBooked, isPast };
  });
};

// SAVE DOCTOR NOTES & DIAGNOSIS
export const saveDoctorNotes = async (userId: number, dto: { patient_id: number; diagnosis: string; prescriptions: string }) => {
  const doctor = await doctorsRepo.findByUserId(userId);
  if (!doctor) {
    throw new appError('Doctor profile not found', 404);
  }

  const patientId = Number(dto.patient_id);
  if (!patientId || isNaN(patientId)) {
    throw new appError('Valid patient_id is required', 400);
  }

  const diagnosis = dto.diagnosis || '';
  const treatmentPlan = dto.prescriptions || '';

  // Check if a visit already exists for today
  const existingVisit = await db('visits')
    .where('patient_id', patientId)
    .where('doctor_id', doctor.id)
    .andWhere(function(this: any) {
      this.whereRaw(
        "DATE(check_in_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date" +
        " OR DATE(created_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date"
      );
    })
    .orderBy('id', 'desc')
    .first();

  let visitId: number;

  if (existingVisit) {
    await db('visits')
      .where('id', existingVisit.id)
      .update({
        diagnosis,
        treatment_plan: treatmentPlan,
        notes: treatmentPlan,
        status: 'completed',
        check_out_at: db.raw("NOW() + INTERVAL '1 second'"),
      });
    visitId = existingVisit.id;
  } else {
    const [newVisit] = await db('visits')
      .insert({
        patient_id: patientId,
        doctor_id: doctor.id,
        diagnosis,
        treatment_plan: treatmentPlan,
        notes: treatmentPlan,
        status: 'completed',
        check_in_at: db.fn.now(),
        check_out_at: db.raw("NOW() + INTERVAL '1 second'"),
      })
      .returning('id');
    visitId = typeof newVisit === 'object' ? (newVisit.id || newVisit) : newVisit;
  }

  // Update matching appointment status to completed if applicable
  await db('appointments')
    .where('patient_id', patientId)
    .where('doctor_id', doctor.id)
    .andWhere(function(this: any) {
      this.whereRaw(
        "appointment_date = (NOW() AT TIME ZONE 'Africa/Cairo')::date" +
        " OR DATE(starts_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'Africa/Cairo')::date"
      );
    })
    .update({ status: 'completed' });

  return {
    visit_id: visitId,
    patient_id: patientId,
    doctor_id: doctor.id,
    diagnosis,
    treatment_plan: treatmentPlan,
    status: 'completed',
  };
};

