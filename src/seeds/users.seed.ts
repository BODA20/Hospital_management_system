import bcrypt from 'bcrypt';
import db from '../config/db';
import { UserRole } from '../modules/users/user.types';
import logger from '../common/utils/logger';

export async function seed() {
  logger.info('🔄 Starting Comprehensive Database Reset...');

  try {
    // ── Step 1: Full wipe in FK-safe dependency order ────────────────────────
    await db.raw(`
      TRUNCATE TABLE
        security_logs,
        staff_operational_requests,
        staff_applications,
        invoice_items,
        invoices,
        patient_vitals,
        appointments,
        visits,
        staff_requests,
        doctors,
        nurses,
        patients,
        users,
        departments
      RESTART IDENTITY CASCADE
    `);
    logger.info('🧹 Database wiped ✅');

    // ── Step 2: Departments ──────────────────────────────────────────────────
    // Required NOT-NULL columns: name, code (UNIQUE), name_en, name_ar
    const deptRows = await db('departments')
      .insert([
        {
          name:        'Cardiology',
          code:        'CARD',
          name_en:     'Cardiology',
          name_ar:     'طب القلب',
          description: 'Heart and blood vessel specialists',
        },
        {
          name:        'Pediatrics',
          code:        'PEDS',
          name_en:     'Pediatrics',
          name_ar:     'طب الأطفال',
          description: 'Children medical care',
        },
        {
          name:        'Neurology',
          code:        'NEUR',
          name_en:     'Neurology',
          name_ar:     'طب الأعصاب',
          description: 'Brain and nervous system',
        },
        {
          name:        'General Medicine',
          code:        'GENM',
          name_en:     'General Medicine',
          name_ar:     'الطب العام',
          description: 'General health care',
        },
      ])
      .returning(['id', 'name']);

    logger.info(`🏢 ${deptRows.length} Departments seeded ✅`);

    // ── Step 3: Password (shared by all seed users) ──────────────────────────
    const passwordHash = await bcrypt.hash('User123!', 12);

    // Helper: users.full_name (NOT `name`) is the actual column name
    const insertUser = async (
      fullName: string,
      email: string,
      role: UserRole,
    ): Promise<any> => {
      const result = await db.raw<{ rows: any[] }>(
        `INSERT INTO users (full_name, email, password_hash, role, is_active, phone)
         VALUES (?, ?, ?, ?, true, 'NOT_PROVIDED')
         RETURNING *`,
        [fullName, email, passwordHash, role],
      );
      return result.rows[0];
    };

    // ── Step 4: Admin ────────────────────────────────────────────────────────
    await insertUser('Admin User', 'admin@hospital.com', UserRole.ADMIN);
    logger.info('👑 Admin created ✅');

    // ── Step 5: Doctors ──────────────────────────────────────────────────────
    const doctorData = [
      { name: 'Dr. Ahmed Hassan',    email: 'doctor1@hospital.com', spec: 'Cardiology',  license: 'LIC-DOC-0001' },
      { name: 'Dr. Sara Ali',        email: 'doctor2@hospital.com', spec: 'Pediatrics',  license: 'LIC-DOC-0002' },
      { name: 'Dr. Mohamed Youssef', email: 'doctor3@hospital.com', spec: 'Neurology',   license: 'LIC-DOC-0003' },
    ];

    for (let i = 0; i < doctorData.length; i++) {
      const { name, email, spec, license } = doctorData[i];
      const user = await insertUser(name, email, UserRole.DOCTOR);
      await db('doctors').insert({
        user_id:             Number(user.id),
        department_id:       Number(deptRows[i % deptRows.length].id),
        specialization:      spec,
        license_number:      license,
        years_of_experience: 0,
        consultation_fee:    0,
      });
    }
    logger.info('🩺 3 Doctors seeded ✅');

    // ── Step 6: Nurses ───────────────────────────────────────────────────────
    // nurses.shift is NOT NULL (enum: morning | evening | night)
    const nurseData = [
      { name: 'Nurse Aisha Kareem', email: 'nurse1@hospital.com', shift: 'morning' as const, license: 'LIC-NUR-0001' },
      { name: 'Nurse Layla Nour',   email: 'nurse2@hospital.com', shift: 'evening' as const, license: 'LIC-NUR-0002' },
    ];

    for (let i = 0; i < nurseData.length; i++) {
      const { name, email, shift, license } = nurseData[i];
      const user = await insertUser(name, email, UserRole.NURSE);
      await db('nurses').insert({
        user_id:             Number(user.id),
        department_id:       Number(deptRows[i % deptRows.length].id),
        shift,
        license_number:      license,
        years_of_experience: 0,
      });
    }
    logger.info('💉 2 Nurses seeded ✅');

    // ── Step 7: Patients ─────────────────────────────────────────────────────
    // patients table only requires user_id
    const patientNames = ['Ali Hassan', 'Nour Mohamed', 'Sara Ahmed', 'Khaled Ibrahim', 'Fatima Youssef'];
    for (let i = 0; i < patientNames.length; i++) {
      const user = await insertUser(
        patientNames[i],
        `patient${i + 1}@hospital.com`,
        UserRole.PATIENT,
      );
      await db('patients').insert({ user_id: Number(user.id) });
    }
    logger.info('👥 5 Patients seeded ✅');

    logger.info('✨ Seed completed successfully!');
    logger.info('🔑 Login credentials (password: User123!):');
    logger.info('   admin@hospital.com     → Admin');
    logger.info('   doctor1@hospital.com   → Doctor');
    logger.info('   nurse1@hospital.com    → Nurse');
    logger.info('   patient1@hospital.com  → Patient');
  } catch (error) {
    logger.error('❌ Seeding error', { error: error instanceof Error ? error.message : error });
    throw error;
  }
}
