import bcrypt from 'bcrypt';
import db from '../config/db';
import { UserRole } from '../modules/users/user.types';
import logger from '../common/utils/logger';
import { faker } from '@faker-js/faker';

export async function seedUsers() {
  logger.info('🔄 Starting Comprehensive Database Reset...');

  try {
    // Step 1: Data Cleanup (The Wipe)
    await db.raw('TRUNCATE TABLE appointments, visits, invoices, staff_requests, doctors, nurses, patients, users, departments RESTART IDENTITY CASCADE');
    logger.info('🧹 Database wiped and IDs reset ✅');

    // Step 2: Seed Foundations (Departments)
    const departments = [
      { name: 'Cardiology', code: 'CARD', description: 'Heart and blood vessel specialist' },
      { name: 'Pediatrics', code: 'PEDS', description: 'Children medical care' },
      { name: 'Neurology', code: 'NEUR', description: 'Brain and nervous system' },
      { name: 'General Medicine', code: 'GEN', description: 'General health care' },
    ];
    const deptIds = await db('departments').insert(departments).returning('id');
    logger.info('🏢 Departments seeded ✅');

    // Step 3: Create 10 Test Users (All initially Patients)
    const password = await bcrypt.hash('User123!', 12);
    const usersData = Array.from({ length: 10 }).map(() => ({
      full_name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      password_hash: password,
      is_active: true,
      role: UserRole.PATIENT,
    }));

    const insertedUsers = await db('users').insert(usersData).returning('*');
    
    // Create patient entries for ALL 10 users
    const patientsData = insertedUsers.map((user) => ({
      user_id: user.id,
      date_of_birth: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
    }));
    await db('patients').insert(patientsData);
    logger.info('👥 10 Initial patients seeded ✅');

    // Step 4: Staff Promotion (The Transition)
    // Pick 3 for Doctors
    const doctorUsers = insertedUsers.slice(0, 3);
    for (const user of doctorUsers) {
      await db('users').where({ id: user.id }).update({ role: UserRole.DOCTOR });
      
      await db('doctors').insert({
        user_id: user.id,
        salary: faker.number.int({ min: 5000, max: 15000 }),
        department_id: faker.helpers.arrayElement(deptIds).id,
        specialization: faker.helpers.arrayElement(['Surgery', 'Consultation', 'Emergency']),
        bio: faker.lorem.paragraph(),
        listen_number: faker.number.int({ min: 1000, max: 9999 }),
      });
      
      await db('patients').where({ user_id: user.id }).delete();
    }

    // Pick 2 for Nurses
    const nurseUsers = insertedUsers.slice(3, 5);
    for (const user of nurseUsers) {
      await db('users').where({ id: user.id }).update({ role: UserRole.NURSE });
      
      await db('nurses').insert({
        user_id: user.id,
        salary: faker.number.int({ min: 3000, max: 7000 }),
        department_id: faker.helpers.arrayElement(deptIds).id,
        shift: faker.helpers.arrayElement(['morning', 'evening', 'night']),
      });
      
      await db('patients').where({ user_id: user.id }).delete();
    }
    logger.info('🩺 3 Doctors and 2 Nurses promoted from patients ✅');

    // Remaining 5 stay as patients for testing
    const patientRecords = await db('patients').select('id');
    const doctorRecords = await db('doctors').select('id');

    // Step 5: Activity Data
    // Staff Requests
    const staffRequests = [
      { user_id: insertedUsers[5].id, requested_role: 'doctor', status: 'pending' },
      { user_id: insertedUsers[6].id, requested_role: 'nurse', status: 'approved', approved_at: new Date() },
      { user_id: insertedUsers[7].id, requested_role: 'doctor', status: 'rejected', rejection_reason: 'Missing credentials' },
    ];
    await db('staff_requests').insert(staffRequests);

    // Appointments & Visits for Doctors
    for (const doc of doctorRecords) {
      for (let j = 0; j < 2; j++) {
        const patient = faker.helpers.arrayElement(patientRecords);
        const starts_at = faker.date.recent({ days: 10 });
        const ends_at = new Date(starts_at.getTime() + 30 * 60000); // 30 mins later

        const [app] = await db('appointments').insert({
          doctor_id: doc.id,
          patient_id: patient.id,
          starts_at,
          ends_at,
          status: 'completed',
          notes: faker.lorem.sentence(),
        }).returning('id');

        const [visit] = await db('visits').insert({
          patient_id: patient.id,
          doctor_id: doc.id,
          appointment_id: app.id,
          status: 'completed',
          check_in_at: starts_at,
          check_out_at: ends_at,
          diagnosis: faker.lorem.sentence(),
          treatment_plan: faker.lorem.sentence(),
        }).returning('id');

        // Invoices
        await db('invoices').insert({
          invoice_no: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
          patient_id: patient.id,
          visit_id: visit.id,
          total_amount: 500,
          discount: 0,
          tax: 50,
          final_amount: 550,
          status: 'pending',
          payment_method: 'cash',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    logger.info('📊 Activity data (Requests, Appointments, Visits, Invoices) seeded ✅');
    logger.info('✨ Comprehensive seed completed successfully!');
  } catch (error) {
    logger.error('❌ Error during seeding', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}