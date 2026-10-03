import request from 'supertest';
import { app } from '../../../../app';
import db from '../../../config/db';
import jwt from 'jsonwebtoken';

let adminToken: string;
let nurseToken: string;
let receptionistToken: string;
let doctorToken: string;
let testPatientId: number;
let testDoctorId: number;
let testAppointmentId: number;
let testNurseId: number;

const generateToken = (id: number, role: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
};

beforeAll(async () => {
  const patient = await db('patients').first();
  const doctor = await db('doctors').first();
  const nurseUser = await db('users').where({ role: 'nurse' }).first();
  const adminUser = await db('users').where({ role: 'admin' }).first();
  const recepUser = await db('users').where({ role: 'receptionist' }).first();

  testPatientId = patient?.id || 1;
  testDoctorId = doctor?.id || 1;
  
  if (adminUser?.id) adminToken = generateToken(adminUser.id, 'admin');
  if (nurseUser?.id) nurseToken = generateToken(nurseUser.id, 'nurse');
  if (recepUser?.id) receptionistToken = generateToken(recepUser.id, 'receptionist');
});

afterAll(async () => {
  await db.destroy();
});

describe('Appointment Check-In State Machine Integration', () => {
  it('should successfully check in an appointment (receptionist)', async () => {
    if (!receptionistToken) return;

    // 1. Create a dummy appointment
    const futureDate = new Date(Date.now() + 2 * 3600 * 1000);
    const [appt] = await db('appointments').insert({
      doctor_id: testDoctorId,
      patient_id: testPatientId,
      appointment_date: futureDate.toISOString().split('T')[0],
      starts_at: futureDate,
      ends_at: new Date(futureDate.getTime() + 30 * 60000),
      status: 'pending',
      queue_status: 'scheduled',
      booking_source: 'online',
    }).returning('*');

    // 2. Perform check-in via API
    const res = await request(app)
      .patch(`/api/v1/appointments/${appt.id}/check-in`)
      .set('Authorization', `Bearer ${receptionistToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('checked_in');
    expect(res.body.data.queue_status).toBe('ready_for_vitals');
    
    // 3. Nurse Creates Visit via check-in (simulate frontend behavior for appointments)
    if (nurseToken) {
       const visitRes = await request(app)
         .post(`/api/v1/visits/check-in`)
         .set('Authorization', `Bearer ${nurseToken}`)
         .send({
           appointment_id: appt.id,
           patient_id: testPatientId,
           doctor_id: testDoctorId,
           chief_complaint: 'Routine checkup'
         });
       
       expect(visitRes.status).toBe(201);
       const visitId = visitRes.body.data.id;
       
       // 4. Nurse records vitals
       const vitalsRes = await request(app)
         .patch(`/api/v1/visits/${visitId}/vitals`)
         .set('Authorization', `Bearer ${nurseToken}`)
         .send({
           vitals: { bp: '120/80', pulse: 75, temperature: 36.6, weight: 70 }
         });
         
       expect(vitalsRes.status).toBe(200);
       
       // Verify appointment queue_status is with_nurse
       const updatedAppt = await db('appointments').where({ id: appt.id }).first();
       expect(updatedAppt.status).toBe('in_progress');
       expect(updatedAppt.queue_status).toBe('with_nurse');
       
       await db('visits').where({ id: visitId }).delete();
    }

    // Cleanup
    await db('appointments').where({ id: appt.id }).delete();
  });
});
