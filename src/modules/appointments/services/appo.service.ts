import * as appointmentsRepo from '../repositories/appo.repo';
import * as doctorsRepo from '../../doctors/repositories/doctor.repo';
import { appError } from '../../../common/errors/AppError';

// ─── Create Appointment ────────────────────────────────────────────────────────
export const createAppointment = async (userId: number, body: any) => {
  const { doctor_id, starts_at, notes } = body;

  // Find doctor by their doctors.id (PK), not user_id
  const doctor = await doctorsRepo.findById(doctor_id);
  if (!doctor) throw new appError('Doctor not found', 404);

  if (!doctor.is_available) {
    throw new appError('This doctor is currently not available for bookings', 400);
  }

  const isAvailable = await appointmentsRepo.checkAvailability(doctor_id, starts_at);
  if (!isAvailable) {
    throw new appError(
      'This time slot is already booked. Please choose a different time.',
      409,
    );
  }

  return appointmentsRepo.createAppointment({
    patient_id: userId,
    doctor_id,
    starts_at,
    status: 'scheduled',
    notes,
  });
};

// ─── Get My Appointments (Patient) ────────────────────────────────────────────
export const getMyAppointments = (userId: number) => {
  return appointmentsRepo.getByPatient(userId);
};

// ─── Get All Doctor Appointments ──────────────────────────────────────────────
export const getDoctorAppointments = async (userId: number) => {
  const doctor = await doctorsRepo.findByUserId(userId);
  if (!doctor) throw new appError('Doctor profile not found', 404);

  return appointmentsRepo.getByDoctor(doctor.id);
};

// ─── Get Doctor Daily Schedule ─────────────────────────────────────────────────
// Returns today's patient list and counts (total vs remaining for today).
export const getDoctorDailySchedule = async (userId: number) => {
  const doctor = await doctorsRepo.findByUserId(userId);
  if (!doctor) throw new appError('Doctor profile not found', 404);

  const today = new Date();

  const appointments = await appointmentsRepo.getDoctorDailySchedule(
    doctor.id,
    today,
  );

  if (appointments.length === 0) {
    return {
      date: today.toISOString().split('T')[0],
      total: 0,
      remaining: 0,
      completed: 0,
      message: 'No appointments scheduled for today.',
      appointments: [],
    };
  }

  // Validate each appointment record for missing critical fields
  const validated = appointments.map((appt: any, index: number) => {
    if (!appt.patient_name) {
      appt._warning = `Appointment #${appt.id}: patient name is missing`;
    }
    if (!appt.patient_email && !appt.patient_phone) {
      appt._warning =
        (appt._warning ? appt._warning + '; ' : '') +
        `Appointment #${appt.id}: no contact info (email or phone) on record`;
    }
    return appt;
  });

  const now = new Date();
  const remaining = validated.filter(
    (a: any) => new Date(a.starts_at) >= now && a.status === 'scheduled',
  ).length;
  const completed = validated.filter(
    (a: any) => a.status === 'completed',
  ).length;

  return {
    date: today.toISOString().split('T')[0],
    total: validated.length,
    remaining,
    completed,
    appointments: validated,
  };
};

// ─── Update Appointment Status ─────────────────────────────────────────────────
export const updateStatus = async (
  appointmentId: number,
  status: string,
  user: any,
) => {
  const appointment = await appointmentsRepo.findById(appointmentId);
  if (!appointment) {
    throw new appError('Appointment not found', 404);
  }

  const doctor = await doctorsRepo.findByUserId(user.id);
  if (!doctor) {
    throw new appError('Doctor profile not found', 404);
  }

  if (appointment.doctor_id !== doctor.id) {
    throw new appError(
      'You are not authorized to update this appointment',
      403,
    );
  }

  // Business rule: cannot re-open a completed/cancelled appointment to scheduled
  if (
    ['completed', 'cancelled'].includes(appointment.status) &&
    status === 'scheduled'
  ) {
    throw new appError(
      `Cannot move a '${appointment.status}' appointment back to 'scheduled'`,
      422,
    );
  }

  const [updated] = await appointmentsRepo.updateStatus(appointmentId, status);
  return updated;
};
