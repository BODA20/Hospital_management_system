import * as patientRepo from '../repositories/patient.repository';
import * as usersRepo from '../../users/repositories/user.repo';
import * as appoRepo from '../../appointments/repositories/appo.repo';
import db from '../../../config/db';
import { appError } from '../../../common/errors/AppError';
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PaginationParams,
  PaginatedResult,
  PatientProfile,
} from '../patient.types';

// ─── Helper: Calculate Age from date_of_birth ──────────────────────────────────
export const calculateAge = (dateOfBirth: Date | string | null): number | null => {
  if (!dateOfBirth) return null;

  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();

  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());

  if (!hasHadBirthdayThisYear) age -= 1;

  return age;
};

// ─── Attach age to a patient profile ──────────────────────────────────────────
const withAge = (patient: PatientProfile) => ({
  ...patient,
  age: calculateAge(patient.date_of_birth),
});

// ─── Create Patient ────────────────────────────────────────────────────────────
export const createPatient = async (body: CreatePatientInput) => {
  // Validate user exists (business logic — cannot be inferred from DB error)
  const user = await usersRepo.findUserById(body.user_id);
  if (!user) {
    throw new appError(`User with ID ${body.user_id} not found`, 404);
  }

  // Prevent duplicate patient profile for the same user
  // (Different from a UNIQUE column — this checks the relationship)
  const existingProfile = await patientRepo.findByUserId(body.user_id);
  if (existingProfile) {
    throw new appError(
      `User ID ${body.user_id} already has a patient profile (patient ID: ${existingProfile.id})`,
      409,
    );
  }

  // DB UNIQUE constraints on users.email and patients.phone handle duplicates.
  // The errorHandler catches pg error 23505 and returns a clean 409 response.
  const patient = await patientRepo.createPatient(body);
  const profile = await patientRepo.findById(patient.id);
  return withAge(profile as PatientProfile);
};

// ─── Get All Patients (Paginated + Search) ─────────────────────────────────────
export const getAllPatients = async (
  params: PaginationParams,
): Promise<PaginatedResult<PatientProfile>> => {
  const { data, total } = await patientRepo.findAll(params);

  return {
    data: data.map(withAge),
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  };
};

// ─── Get Single Patient ────────────────────────────────────────────────────────
export const getPatientById = async (id: number) => {
  const patient = await patientRepo.findById(id);
  if (!patient) {
    throw new appError(`Patient with ID ${id} not found`, 404);
  }
  return withAge(patient as PatientProfile);
};

// ─── Get My Profile (Patient logged in) ───────────────────────────────────────
export const getMyProfile = async (userId: number) => {
  const patient = await patientRepo.findByUserId(userId);
  if (!patient) {
    throw new appError('Patient profile not found for this user', 404);
  }
  return withAge(patient as PatientProfile);
};

// ─── Update Patient ────────────────────────────────────────────────────────────
export const updatePatient = async (id: number, body: UpdatePatientInput) => {
  const existing = await getPatientById(id);

  await patientRepo.updatePatient(id, body);

  if (body.phone || (body as any).full_name || (body as any).email) {
    const userUpdates: Record<string, any> = {};
    if (body.phone) userUpdates.phone = body.phone;
    if ((body as any).full_name) userUpdates.full_name = (body as any).full_name;
    if ((body as any).email) userUpdates.email = (body as any).email;
    await db('users').where({ id: existing.user_id }).update(userUpdates);
  }

  const updated = await patientRepo.findById(id);
  return withAge(updated as PatientProfile);
};

// ─── Delete Patient ────────────────────────────────────────────────────────────
export const deletePatient = async (id: number) => {
  await getPatientById(id);
  await patientRepo.deletePatient(id);
  return { message: 'Patient profile deleted successfully' };
};

// ─── Get Patient Appointments ──────────────────────────────────────────────────
export const getPatientAppointments = async (patientId: number) => {
  await getPatientById(patientId);
  const appointments = await patientRepo.getPatientAppointments(patientId);
  return {
    patient_id: patientId,
    total: appointments.length,
    appointments,
  };
};

// ─── Get My Appointments (Patient logged in) — with Live Queue Stats ──────────
export const getMyAppointments = async (userId: number) => {
  const patient = await patientRepo.findByUserId(userId);
  if (!patient) {
    throw new appError('Patient profile not found for this user', 404);
  }
  const appointments = await patientRepo.getPatientAppointments(patient.id);

  // Enrich each appointment with live queue stats if it has a queue_number
  const enriched = await Promise.all(
    appointments.map(async (appt: any) => {
      if (!appt.queue_number) {
        return { ...appt, queue_stats: null };
      }

      // Determine the appointment date string (YYYY-MM-DD)
      const apptDateStr =
        appt.appointment_date ??
        (appt.starts_at ? new Date(appt.starts_at).toISOString().split('T')[0] : null);

      if (!apptDateStr) {
        return { ...appt, queue_stats: null };
      }

      const currentServingNumber = await appoRepo.getCurrentServingNumber(
        appt.doctor_id,
        apptDateStr,
      );

      const myQueueNumber: number = appt.queue_number;
      const patientsAhead =
        currentServingNumber !== null
          ? Math.max(0, myQueueNumber - currentServingNumber - 1)
          : Math.max(0, myQueueNumber - 1);

      return {
        ...appt,
        queue_stats: {
          my_queue_number: myQueueNumber,
          current_serving_number: currentServingNumber,
          patients_ahead: patientsAhead,
        },
      };
    }),
  );

  return {
    patient_id: patient.id,
    total: enriched.length,
    appointments: enriched,
  };
};

export const getMyMedicalRecords = async (userId: number) => {
  return patientRepo.getPatientMedicalRecords(userId);
};

