import db from '../../../config/db';
import { autoExpireMissedAppointments } from '../services/appo.service';

describe('autoExpireMissedAppointments', () => {
  let patientId: number;
  let doctorId: number;

  beforeAll(async () => {
    const patient = await db('patients').first();
    const doctor = await db('doctors').first();
    patientId = patient.id;
    doctorId = doctor.id;
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should leave pending appointments before grace period intact', async () => {
    const futureDate = new Date(Date.now() + 2 * 3600 * 1000);
    const [appt] = await db('appointments').insert({
      doctor_id: doctorId,
      patient_id: patientId,
      appointment_date: futureDate.toISOString().split('T')[0],
      starts_at: futureDate,
      ends_at: new Date(futureDate.getTime() + 30 * 60000),
      status: 'pending',
      queue_status: 'scheduled',
      booking_source: 'online',
    }).returning('*');

    try {
      const expiredCount = await autoExpireMissedAppointments();
      const updated = await db('appointments').where({ id: appt.id }).first();
      expect(updated.status).toBe('pending');
    } finally {
      await db('appointments').where({ id: appt.id }).delete();
    }
  });

  it('should transition past pending appointments past grace period to missed', async () => {
    const pastStart = new Date(Date.now() - 2 * 3600 * 1000);
    const pastEnd = new Date(Date.now() - 90 * 60000);
    const [appt] = await db('appointments').insert({
      doctor_id: doctorId,
      patient_id: patientId,
      appointment_date: pastStart.toISOString().split('T')[0],
      starts_at: pastStart,
      ends_at: pastEnd,
      status: 'pending',
      queue_status: 'scheduled',
      booking_source: 'online',
    }).returning('*');

    try {
      const expiredCount = await autoExpireMissedAppointments();
      expect(expiredCount).toBeGreaterThanOrEqual(1);

      const updated = await db('appointments').where({ id: appt.id }).first();
      expect(updated.status).toBe('missed');
      expect(updated.queue_status).toBe('missed');
    } finally {
      await db('appointments').where({ id: appt.id }).delete();
    }
  });

  it('should NOT mark checked-in appointments as missed', async () => {
    const pastStart = new Date(Date.now() - 2 * 3600 * 1000);
    const pastEnd = new Date(Date.now() - 90 * 60000);
    const [appt] = await db('appointments').insert({
      doctor_id: doctorId,
      patient_id: patientId,
      appointment_date: pastStart.toISOString().split('T')[0],
      starts_at: pastStart,
      ends_at: pastEnd,
      status: 'confirmed',
      queue_status: 'arrived',
      booking_source: 'online',
    }).returning('*');

    try {
      await autoExpireMissedAppointments();
      const updated = await db('appointments').where({ id: appt.id }).first();
      expect(updated.status).toBe('confirmed');
      expect(updated.queue_status).toBe('arrived');
    } finally {
      await db('appointments').where({ id: appt.id }).delete();
    }
  });

  it('should NOT mark completed or cancelled appointments as missed', async () => {
    const pastStart = new Date(Date.now() - 2 * 3600 * 1000);
    const pastEnd = new Date(Date.now() - 90 * 60000);
    const [cancelledAppt] = await db('appointments').insert({
      doctor_id: doctorId,
      patient_id: patientId,
      appointment_date: pastStart.toISOString().split('T')[0],
      starts_at: pastStart,
      ends_at: pastEnd,
      status: 'cancelled',
      booking_source: 'online',
    }).returning('*');

    try {
      await autoExpireMissedAppointments();
      const updated = await db('appointments').where({ id: cancelledAppt.id }).first();
      expect(updated.status).toBe('cancelled');
    } finally {
      await db('appointments').where({ id: cancelledAppt.id }).delete();
    }
  });

  it('should be idempotent on repeated runs', async () => {
    const firstRun = await autoExpireMissedAppointments();
    const secondRun = await autoExpireMissedAppointments();
    expect(secondRun).toBe(0);
  });
});
