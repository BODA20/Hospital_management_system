/**
 * tests/users/createStaff.test.ts
 *
 * Regression tests for POST /api/v1/admins/staff/create
 *
 * Critical invariant: creating a new staff member must NEVER modify the
 * logged-in admin's own row (ID, email, role, or password).
 *
 * Root cause of the original bug:
 *   The Knex query `.where('email', X).orWhere(callback)` was called with an
 *   empty callback when `phone` was blank. An empty orWhere() in Knex matches
 *   ALL rows, so `.first()` returned the first DB row (often the admin) and
 *   the UPDATE branch overwrote the admin's role instead of inserting a new row.
 */

import request from 'supertest';
import { app } from '../../app';
import db from '../../src/config/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// ── Helpers ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? 'test_secret';

/** Create a signed JWT for the given user payload (mirrors the production token shape). */
function makeToken(payload: { id: number; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

/** Clean up any test-inserted users by email patterns used in this suite. */
async function cleanup(...emails: string[]) {
  for (const email of emails) {
    const user = (await db('users').where({ email }).first()) as any;
    if (user) {
      await db('doctors').where({ user_id: user.id }).delete();
      await db('nurses').where({ user_id: user.id }).delete();
      await db('users').where({ id: user.id }).delete();
    }
  }
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_EMAIL      = 'regression_admin@test.hospital.internal';
const NEW_DOCTOR_EMAIL = 'new_doctor@test.hospital.internal';
const NEW_NURSE_EMAIL  = 'new_nurse@test.hospital.internal';

let adminId: number;
let adminToken: string;

// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await cleanup(ADMIN_EMAIL, NEW_DOCTOR_EMAIL, NEW_NURSE_EMAIL);
  // Seed a real admin row so the test hits the real DB path
  const hash = await bcrypt.hash('Admin123!', 4); // low rounds — speed only for tests
  const [admin] = await (db('users') as any)
    .insert({
      full_name: 'Regression Test Admin',
      email: ADMIN_EMAIL,
      phone: '+10000000001',
      password_hash: hash,
      role: 'admin',
      is_active: true,
      is_verified: true,
    })
    .returning(['id', 'email', 'role']);

  adminId = Number(admin.id);
  adminToken = makeToken({ id: adminId, role: 'admin' });
});

afterAll(async () => {
  await cleanup(ADMIN_EMAIL, NEW_DOCTOR_EMAIL, NEW_NURSE_EMAIL);
  await db.destroy();
});

afterEach(async () => {
  // Clean new staff entries after each test so tests are independent
  await cleanup(NEW_DOCTOR_EMAIL, NEW_NURSE_EMAIL);
  // Also remove any audit rows (security_logs) for our test admin
  if (adminId) {
    await db('security_logs').where({ user_id: adminId }).delete();
  }
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/admins/staff/create', () => {

  describe('✅ Success — new staff insert', () => {

    it('inserts a new doctor row when the email is not in the DB', async () => {
      const res = await request(app)
        .post('/api/v1/admins/staff/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name:      'Dr. New Doctor',
          email:          NEW_DOCTOR_EMAIL,
          role:           'doctor',
          assigned_shift: 'Morning',
          specialization: 'Cardiology',
          // intentionally omitting phone
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');

      // Confirm a brand-new user row was created
      const created = (await db('users').where({ email: NEW_DOCTOR_EMAIL }).first()) as any;
      expect(created).toBeDefined();
      expect(created.role).toBe('doctor');
      expect(created.email).toBe(NEW_DOCTOR_EMAIL);
    });

    it('also creates a doctors profile row for the new user', async () => {
      await request(app)
        .post('/api/v1/admins/staff/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name:      'Dr. New Doctor',
          email:          NEW_DOCTOR_EMAIL,
          role:           'doctor',
          assigned_shift: 'Morning',
          specialization: 'Neurology',
        });

      const user = (await db('users').where({ email: NEW_DOCTOR_EMAIL }).first()) as any;
      const doctor = (await db('doctors').where({ user_id: user.id }).first()) as any;
      expect(doctor).toBeDefined();
      expect(doctor.specialization).toBe('Neurology');
    });

  });

  // ── THE CRITICAL REGRESSION TEST ─────────────────────────────────────────

  describe('🔒 Regression — admin account must NEVER be overwritten', () => {

    it('does NOT modify the logged-in admin row when no phone is supplied', async () => {
      // Snapshot admin state before the request
      const adminBefore = (await db('users').where({ id: adminId }).first()) as any;

      await request(app)
        .post('/api/v1/admins/staff/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name:      'New Nurse Staff',
          email:          NEW_NURSE_EMAIL,    // ← different email, no phone
          role:           'nurse',
          assigned_shift: 'Night',
          // phone is intentionally absent — this triggered the bug
        });

      // Admin row must be bitwise-identical after the call
      const adminAfter = (await db('users').where({ id: adminId }).first()) as any;

      expect(adminAfter.id).toBe(adminBefore.id);
      expect(adminAfter.email).toBe(adminBefore.email);
      expect(adminAfter.role).toBe('admin');          // must NOT become 'nurse'
      expect(adminAfter.full_name).toBe(adminBefore.full_name);
      expect(adminAfter.password_hash).toBe(adminBefore.password_hash);
    });

    it('returns 400 when the submitted email belongs to the logged-in admin', async () => {
      const res = await request(app)
        .post('/api/v1/admins/staff/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          full_name: 'Attempt to overwrite admin',
          email:     ADMIN_EMAIL,              // ← same as the logged-in admin
          role:      'doctor',
          assigned_shift: 'Morning',
        });

      // Self-overwrite guard must reject the request
      expect(res.status).toBe(400);
      expect(res.body.message ?? res.body.error).toMatch(/logged-in admin/i);

      // Admin role must be unchanged
      const admin = (await db('users').where({ id: adminId }).first()) as any;
      expect(admin.role).toBe('admin');
    });

  });

  describe('❌ Validation errors', () => {

    it('returns 401 when no Bearer token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/admins/staff/create')
        .send({ full_name: 'Test', email: NEW_DOCTOR_EMAIL, role: 'doctor' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when required fields (full_name, email, role) are missing', async () => {
      const res = await request(app)
        .post('/api/v1/admins/staff/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+1000000000' }); // missing full_name, email, role

      expect(res.status).toBe(400);
    });

    it('returns 400 for an invalid role value', async () => {
      const res = await request(app)
        .post('/api/v1/admins/staff/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ full_name: 'Bad Role', email: NEW_DOCTOR_EMAIL, role: 'superuser' });

      expect(res.status).toBe(400);
    });

  });

});
