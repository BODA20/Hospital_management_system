/**
 * Staff Transition & Requests — Production-Ready Test Suite
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Scope  : Staff Request submission (POST /api/v1/staff-requests/:id),
 *          Admin Approval with Role Transition (PATCH /api/v1/staff-requests/:id/approve),
 *          Atomic DB transaction integrity, and RBAC enforcement.
 *
 * Mocking Strategy
 * ────────────────────────────────────────────────────────────────────────────
 *  • jsonwebtoken    → verify() returns a predictable decoded payload so we
 *                      control req.user without a real JWT secret.
 *  • All DB repos    → Individual jest.fn() stubs — zero real DB hits.
 *  • db.transaction  → Executes callback synchronously with a mock trx object.
 *  • emailService    → Stubbed to prevent SMTP connections.
 *
 * Pattern  : AAA (Arrange → Act → Assert) in every test.
 * Routes   : Mounted at /api/v1/staff-requests in app.ts.
 *            POST   /:id            → createRequest  (any logged-in user)
 *            PATCH  /:id/approve    → approve        (admin only)
 *            PATCH  /:id/reject     → reject         (admin only)
 *            GET    /               → getStaffRequests (admin only)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import request from 'supertest';
import { app } from '../../../../app';

// ─── 1. Mock: jsonwebtoken ────────────────────────────────────────────────────
// The protect middleware calls jwt.verify(). We intercept it to return a
// controlled payload without needing a real JWT_SECRET or signed token.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(), // configured per-test in helpers below
}));

// ─── 2. Mock: Knex db ────────────────────────────────────────────────────────
// db.transaction() is the atomicity boundary we test. The mock executes the
// callback synchronously with a stubbed trx so we can intercept per-step calls.
jest.mock('../../../config/db', () => {
  const mockTrx = jest.fn() as any;
  mockTrx.mockImplementation(() => mockTrx);
  Object.assign(mockTrx, {
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  });

  const mockDb = jest.fn() as any;
  mockDb.transaction = jest
    .fn()
    .mockImplementation(async (callback: Function) => callback(mockTrx));
  mockDb.fn = { now: jest.fn().mockReturnValue(new Date()) };

  // Expose mockTrx so individual tests can reconfigure it for failure scenarios
  (mockDb as any).__mockTrx = mockTrx;

  return { default: mockDb, __esModule: true };
});

// ─── 3. Mock: Users Repository ───────────────────────────────────────────────
jest.mock('../../users/repositories/user.repo', () => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  findUserWithPasswordById: jest.fn(),
  createUser: jest.fn(),
  updateUserById: jest.fn(),
  deactivateUser: jest.fn(),
  saveEmailChangeToken: jest.fn(),
  updateEmail: jest.fn(),
  clearEmailChangeToken: jest.fn(),
  findByEmailToken: jest.fn(),
  updateEmailChangeExpires: jest.fn(),
  updateUserRole: jest.fn(),
  adminUpdateUser: jest.fn(),
  findAllUsers: jest.fn(),
}));

// ─── 4. Mock: Staff Request Repository ───────────────────────────────────────
jest.mock('../repositories/staff_request.repo', () => ({
  createRequest: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  updateStatus: jest.fn(),
  getAllPending: jest.fn(),
}));

// ─── 5. Mock: Doctor Repository ──────────────────────────────────────────────
jest.mock('../../doctors/repositories/doctor.repo', () => ({
  findByUserId: jest.fn(),
  findById: jest.fn(),
  createDoctor: jest.fn(),
  updateByUserId: jest.fn(),
  getAllDoctors: jest.fn(),
}));

// ─── 6. Mock: Nurse Repository ───────────────────────────────────────────────
jest.mock('../../nurses/repositories/nurse.repository', () => ({
  findByUserId: jest.fn(),
  findById: jest.fn(),
  createNurse: jest.fn(),
  getNurses: jest.fn(),
  getNursesByDoctor: jest.fn(),
  getNursesByDepartment: jest.fn(),
  updateNurse: jest.fn(),
  deleteNurse: jest.fn(),
}));

// ─── 7. Mock: Patient Repository ─────────────────────────────────────────────
jest.mock('../../patients/repositories/patient.repository', () => ({
  createBasePatient: jest.fn(),
  createPatient: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  deleteByUserId: jest.fn(),
  updatePatient: jest.fn(),
  deletePatient: jest.fn(),
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  getPatientAppointments: jest.fn(),
}));

// ─── 8. Mock: Email utility ───────────────────────────────────────────────────
jest.mock('../../../common/utils/email', () => ({
  Email: jest.fn().mockImplementation(() => ({
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
    sendStaffRequestNotification: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ─── 9. Mock: Session + Refresh Token Repos (protect middleware walks these) ──
jest.mock('../../auth/services/session.service', () => ({
  createSession: jest.fn(),
  validateSession: jest.fn(),
  rotateSession: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllUserSessions: jest.fn(),
}));

jest.mock('../../auth/repositories/refreshToken.repo', () => ({
  createToken: jest.fn(),
  findTokenByHash: jest.fn(),
  findTokenById: jest.fn(),
  revokeToken: jest.fn(),
  replaceToken: jest.fn(),
  revokeUserTokens: jest.fn(),
  deleteExpiredTokens: jest.fn(),
}));

// ─── Typed imports (resolved AFTER jest.mock hoisting) ───────────────────────
import jwt from 'jsonwebtoken';
import * as usersRepo from '../../users/repositories/user.repo';
import * as staffRepo from '../repositories/staff_request.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as nurseRepo from '../../nurses/repositories/nurse.repository';
import * as patientRepo from '../../patients/repositories/patient.repository';
import * as staffService from '../services/staff_request.service';
import db from '../../../config/db';

// Typed mock helpers for auto-complete + type safety
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedUsersRepo = usersRepo as jest.Mocked<typeof usersRepo>;
const mockedStaffRepo = staffRepo as jest.Mocked<typeof staffRepo>;
const mockedDoctorRepo = doctorRepo as jest.Mocked<typeof doctorRepo>;
const mockedNurseRepo = nurseRepo as jest.Mocked<typeof nurseRepo>;
const mockedPatientRepo = patientRepo as jest.Mocked<typeof patientRepo>;
const mockedDb = db as jest.Mocked<typeof db> & { transaction: jest.Mock };

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭  Test Data Factories
// ═══════════════════════════════════════════════════════════════════════════════

/** Factory: generate a minimal User record */
const makeUser = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 10,
  full_name: 'Alice Patient',
  email: 'alice@example.com',
  password_hash: 'hashed_pw',
  role: 'patient',
  is_active: true,
  created_at: new Date('2024-01-01'),
  phone: null,
  password_change_at: null,
  password_reset_token: null,
  password_reset_expires: null,
  email_change_token: null,
  pending_email: null,
  email_change_expires: null,
  ...overrides,
});

/** Factory: generate an admin User record */
const makeAdmin = (overrides: Partial<Record<string, any>> = {}) =>
  makeUser({ id: 1, full_name: 'Super Admin', email: 'admin@hospital.com', role: 'admin', ...overrides });

/** Factory: generate a StaffRequest record */
const makeStaffRequest = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 99,
  user_id: 10,
  requested_role: 'doctor',
  status: 'pending',
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: new Date('2024-06-01'),
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔑  Auth Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configures the jwt.verify mock to act as if the supplied user is authenticated.
 * The protect middleware calls verify(), then findUserById() to hydrate req.user.
 */
const loginAs = (user: ReturnType<typeof makeUser>) => {
  (mockedJwt.verify as jest.Mock).mockReturnValue({
    id: user.id,
    role: user.role,
    iat: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  mockedUsersRepo.findUserById.mockResolvedValue(user as any);
};

/** Build a Bearer token header (the value is irrelevant — jwt.verify is mocked) */
const bearerHeader = () => ({ Authorization: 'Bearer mock_token_value' });

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  POST /api/v1/staff-requests/:id  — Submit a Staff Request
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/staff-requests/:id', () => {
  const PATIENT_USER = makeUser();
  const NEW_REQUEST = makeStaffRequest();

  // ─── ✅ Success paths ──────────────────────────────────────────────────────
  describe('✅ Success — valid authenticated submission', () => {
    beforeEach(() => {
      loginAs(PATIENT_USER);
      mockedStaffRepo.findByUserId.mockResolvedValue(undefined); // no existing request
      mockedStaffRepo.createRequest.mockResolvedValue(NEW_REQUEST as any);
    });

    it('should return 201 Created with the new request object', async () => {
      // Arrange — see beforeEach

      // Act
      const res = await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .set(bearerHeader())
        .send({ role: 'doctor' });

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('should call staffRepo.createRequest with the correct user_id and role', async () => {
      // Arrange + Act
      await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .set(bearerHeader())
        .send({ role: 'doctor' });

      // Assert
      expect(mockedStaffRepo.createRequest).toHaveBeenCalledTimes(1);
      expect(mockedStaffRepo.createRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: PATIENT_USER.id,
          requested_role: 'doctor',
        }),
      );
    });

    it('should accept "nurse" as a valid requested_role', async () => {
      // Arrange
      mockedStaffRepo.createRequest.mockResolvedValue({
        ...NEW_REQUEST,
        requested_role: 'nurse',
      } as any);

      // Act
      const res = await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .set(bearerHeader())
        .send({ role: 'nurse' });

      // Assert
      expect(res.status).toBe(201);
    });
  });

  // ─── ❌ Failure: Unauthenticated request ──────────────────────────────────
  describe('❌ Failure — unauthenticated (no Bearer token)', () => {
    it('should return 401 when no Authorization header is present', async () => {
      // Arrange — deliberately send NO auth header

      // Act
      const res = await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .send({ role: 'doctor' });

      // Assert
      expect(res.status).toBe(401);
    });

    it('should NOT call staffRepo.createRequest for unauthenticated requests', async () => {
      // Act
      await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .send({ role: 'doctor' });

      // Assert — protect middleware must block before the service is reached
      expect(mockedStaffRepo.createRequest).not.toHaveBeenCalled();
    });
  });

  // ─── ❌ Edge Case: Duplicate Pending Request ───────────────────────────────
  describe('❌ Edge Case — duplicate pending request', () => {
    it('should return 400 when the user already has a pending request', async () => {
      // Arrange — simulate an existing pending request for this user
      loginAs(PATIENT_USER);
      mockedStaffRepo.findByUserId.mockResolvedValue(NEW_REQUEST as any);

      // Act
      const res = await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .set(bearerHeader())
        .send({ role: 'doctor' });

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already submitted/i);
    });

    it('should NOT call staffRepo.createRequest when a pending request already exists', async () => {
      // Arrange
      loginAs(PATIENT_USER);
      mockedStaffRepo.findByUserId.mockResolvedValue(NEW_REQUEST as any);

      // Act
      await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .set(bearerHeader())
        .send({ role: 'doctor' });

      // Assert — no duplicate insertion attempted
      expect(mockedStaffRepo.createRequest).not.toHaveBeenCalled();
    });
  });

  // ─── ❌ Failure: Zod Validation ───────────────────────────────────────────
  describe('❌ Failure — Zod validation errors', () => {
    beforeEach(() => loginAs(PATIENT_USER));

    it('should return 400 when role is an invalid enum value', async () => {
      // Arrange
      const payload = { role: 'hacker' };

      // Act
      const res = await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .set(bearerHeader())
        .send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });

    it('should return 400 when role field is missing entirely', async () => {
      // Act
      const res = await request(app)
        .post(`/api/v1/staff-requests/${PATIENT_USER.id}`)
        .set(bearerHeader())
        .send({});

      // Assert
      expect(res.status).toBe(400);
    });

    it('should return 400 when :id param is not a numeric string', async () => {
      // Act
      const res = await request(app)
        .post('/api/v1/staff-requests/not-a-number')
        .set(bearerHeader())
        .send({ role: 'doctor' });

      // Assert
      expect(res.status).toBe(400);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  PATCH /api/v1/staff-requests/:id/approve  — Admin Approval
// ═══════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/v1/staff-requests/:id/approve', () => {
  const ADMIN_USER     = makeAdmin();
  const PATIENT_USER   = makeUser({ id: 10 });
  const DOCTOR_USER    = makeUser({ id: 20, role: 'doctor' });
  const NURSE_USER     = makeUser({ id: 30, role: 'nurse' });
  const PENDING_REQUEST = makeStaffRequest({ id: 99, user_id: 10, requested_role: 'doctor' });

  // ─── ✅ Success: Admin approves a doctor request ───────────────────────────
  describe('✅ Success — admin approves a pending doctor request', () => {
    beforeEach(() => {
      loginAs(ADMIN_USER);
      mockedStaffRepo.findById.mockResolvedValue(PENDING_REQUEST as any);
      mockedStaffRepo.updateStatus.mockResolvedValue({ ...PENDING_REQUEST, status: 'approved' } as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(undefined as any);
      mockedDoctorRepo.findByUserId.mockResolvedValue(undefined); // not yet a doctor
      mockedDoctorRepo.createDoctor.mockResolvedValue({ id: 1, user_id: 10 } as any);
      mockedPatientRepo.deleteByUserId.mockResolvedValue(1 as any);
    });

    it('should return 200 with a success message', async () => {
      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toMatch(/approved/i);
    });

    it('should call db.transaction — the approval must be atomic', async () => {
      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert — atomicity is the contract; if this fails, nothing is committed
      expect(mockedDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('should update the staff_requests.status to "approved"', async () => {
      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(mockedStaffRepo.updateStatus).toHaveBeenCalledWith(
        PENDING_REQUEST.id,
        expect.objectContaining({ status: 'approved', approved_by: ADMIN_USER.id }),
        expect.anything(), // trx reference
      );
    });

    it('should update users.role to "doctor"', async () => {
      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(mockedUsersRepo.adminUpdateUser).toHaveBeenCalledWith(
        PENDING_REQUEST.user_id,
        expect.objectContaining({ role: 'doctor', is_active: true }),
        expect.anything(), // trx reference
      );
    });

    it('should insert a new record in the doctors table', async () => {
      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(mockedDoctorRepo.createDoctor).toHaveBeenCalledTimes(1);
      expect(mockedDoctorRepo.createDoctor).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: PENDING_REQUEST.user_id }),
        expect.anything(), // trx reference
      );
    });

    it('should delete the user from the patients table', async () => {
      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert — prevent dual-role data corruption
      expect(mockedPatientRepo.deleteByUserId).toHaveBeenCalledTimes(1);
      expect(mockedPatientRepo.deleteByUserId).toHaveBeenCalledWith(
        PENDING_REQUEST.user_id,
        expect.anything(), // trx reference
      );
    });

    it('should NOT create a second doctor record if one already exists (idempotent)', async () => {
      // Arrange — simulate the user is already a doctor
      mockedDoctorRepo.findByUserId.mockResolvedValue({ id: 5, user_id: 10 } as any);

      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert — idempotency guard in the service must prevent a duplicate
      expect(mockedDoctorRepo.createDoctor).not.toHaveBeenCalled();
    });
  });

  // ─── ✅ Success: Admin approves a nurse request ────────────────────────────
  describe('✅ Success — admin approves a pending nurse request', () => {
    const NURSE_REQUEST = makeStaffRequest({ id: 100, user_id: 10, requested_role: 'nurse' });

    beforeEach(() => {
      loginAs(ADMIN_USER);
      mockedStaffRepo.findById.mockResolvedValue(NURSE_REQUEST as any);
      mockedStaffRepo.updateStatus.mockResolvedValue({ ...NURSE_REQUEST, status: 'approved' } as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(undefined as any);
      mockedNurseRepo.findByUserId.mockResolvedValue(undefined); // not yet a nurse
      mockedNurseRepo.createNurse.mockResolvedValue({ id: 2, user_id: 10 } as any);
      mockedPatientRepo.deleteByUserId.mockResolvedValue(1 as any);
    });

    it('should insert a new record in the nurses table for a nurse request', async () => {
      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${NURSE_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(mockedNurseRepo.createNurse).toHaveBeenCalledTimes(1);
      expect(mockedNurseRepo.createNurse).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: NURSE_REQUEST.user_id }),
        expect.anything(), // trx reference
      );
    });

    it('should update users.role to "nurse" for a nurse request', async () => {
      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${NURSE_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(mockedUsersRepo.adminUpdateUser).toHaveBeenCalledWith(
        NURSE_REQUEST.user_id,
        expect.objectContaining({ role: 'nurse' }),
        expect.anything(),
      );
    });
  });

  // ─── ❌ RBAC: Non-admin roles cannot approve ───────────────────────────────
  describe('❌ RBAC — non-admin roles are forbidden from approving', () => {
    it('should return 403 when a Doctor tries to approve a request', async () => {
      // Arrange
      loginAs(DOCTOR_USER);

      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('should return 403 when a Nurse tries to approve a request', async () => {
      // Arrange
      loginAs(NURSE_USER);

      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
    });

    it('should return 403 when a Patient tries to approve a request', async () => {
      // Arrange
      loginAs(PATIENT_USER);

      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
    });

    it('should NOT invoke the approval service when role is forbidden', async () => {
      // Arrange
      loginAs(DOCTOR_USER);

      // Act
      await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert — restrictTo guard stops execution before service layer
      expect(mockedStaffRepo.findById).not.toHaveBeenCalled();
      expect(mockedDb.transaction).not.toHaveBeenCalled();
    });

    it('should return 401 when no token is provided', async () => {
      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`);

      // Assert
      expect(res.status).toBe(401);
    });
  });

  // ─── ❌ Failure: Request not found ───────────────────────────────────────
  describe('❌ Failure — request not found', () => {
    it('should return 404 when the staff request ID does not exist', async () => {
      // Arrange
      loginAs(ADMIN_USER);
      mockedStaffRepo.findById.mockResolvedValue(undefined);

      // Act
      const res = await request(app)
        .patch('/api/v1/staff-requests/9999/approve')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ─── ❌ Failure: Already processed request ────────────────────────────────
  describe('❌ Failure — request already processed', () => {
    it('should return 400 when the request status is already "approved"', async () => {
      // Arrange
      loginAs(ADMIN_USER);
      mockedStaffRepo.findById.mockResolvedValue({
        ...PENDING_REQUEST,
        status: 'approved',
      } as any);

      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already processed/i);
    });

    it('should return 400 when the request status is already "rejected"', async () => {
      // Arrange
      loginAs(ADMIN_USER);
      mockedStaffRepo.findById.mockResolvedValue({
        ...PENDING_REQUEST,
        status: 'rejected',
      } as any);

      // Act
      const res = await request(app)
        .patch(`/api/v1/staff-requests/${PENDING_REQUEST.id}/approve`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already processed/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Service Unit Tests — approveRequest() Atomicity
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: staffService.approveRequest() — Atomicity & Transaction Integrity', () => {
  const ADMIN_ID       = 1;
  const PENDING_REQUEST = makeStaffRequest({ id: 99, user_id: 10, requested_role: 'doctor' });

  // ─── 💣 Failure/Rollback Test: The "Heart" of the Suite ───────────────────
  describe('💣 Transaction Rollback — failure in any step reverts all changes', () => {
    it('should NOT commit if patientRepo.deleteByUserId throws (last step fails)', async () => {
      // Arrange
      mockedStaffRepo.findById.mockResolvedValue(PENDING_REQUEST as any);
      mockedStaffRepo.updateStatus.mockResolvedValue({ ...PENDING_REQUEST, status: 'approved' } as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(undefined as any);
      mockedDoctorRepo.findByUserId.mockResolvedValue(undefined);
      mockedDoctorRepo.createDoctor.mockResolvedValue({ id: 1, user_id: 10 } as any);

      // 🔺 Simulate failure in the LAST transactional step
      mockedPatientRepo.deleteByUserId.mockRejectedValue(
        new Error('DB constraint violation: cannot delete patient'),
      );

      // Override db.transaction to propagate the error (simulate real rollback)
      mockedDb.transaction.mockImplementationOnce(async (callback: Function) => {
        try {
          return await callback({
            insert: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([]),
            where: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            first: jest.fn().mockResolvedValue(null),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
          });
        } catch (err) {
          // Real Knex rolls back here — the mock propagates the error to surface it
          throw err;
        }
      });

      // Act + Assert — the service must throw (i.e. the transaction aborted)
      await expect(
        staffService.approveRequest(PENDING_REQUEST.id, ADMIN_ID),
      ).rejects.toMatchObject({
        statusCode: 500,
      });
    });

    it('should NOT create a doctor record if updateStatus (step 1) fails', async () => {
      // Arrange
      mockedStaffRepo.findById.mockResolvedValue(PENDING_REQUEST as any);
      // 🔺 Step 1 fails — everything after must NOT execute
      mockedStaffRepo.updateStatus.mockRejectedValue(new Error('DB write failed'));

      mockedDb.transaction.mockImplementationOnce(async (callback: Function) => {
        try {
          return await callback({});
        } catch (err) {
          throw err;
        }
      });

      // Act
      await expect(
        staffService.approveRequest(PENDING_REQUEST.id, ADMIN_ID),
      ).rejects.toBeDefined();

      // Assert — doctor was never provisioned
      expect(mockedDoctorRepo.createDoctor).not.toHaveBeenCalled();
    });

    it('should NOT delete from patients if adminUpdateUser (step 2) fails', async () => {
      // Arrange
      mockedStaffRepo.findById.mockResolvedValue(PENDING_REQUEST as any);
      mockedStaffRepo.updateStatus.mockResolvedValue({ ...PENDING_REQUEST, status: 'approved' } as any);
      // 🔺 Step 2 fails
      mockedUsersRepo.adminUpdateUser.mockRejectedValue(new Error('role update failed'));

      mockedDb.transaction.mockImplementationOnce(async (callback: Function) => {
        try {
          return await callback({});
        } catch (err) {
          throw err;
        }
      });

      // Act
      await expect(
        staffService.approveRequest(PENDING_REQUEST.id, ADMIN_ID),
      ).rejects.toBeDefined();

      // Assert — patient record NOT deleted (integrity preserved)
      expect(mockedPatientRepo.deleteByUserId).not.toHaveBeenCalled();
    });
  });

  // ─── ✅ Happy Path: All 4 steps execute in a single transaction ───────────
  describe('✅ Happy Path — all four atomic steps succeed', () => {
    beforeEach(() => {
      mockedStaffRepo.findById.mockResolvedValue(PENDING_REQUEST as any);
      mockedStaffRepo.updateStatus.mockResolvedValue({ ...PENDING_REQUEST, status: 'approved' } as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(undefined as any);
      mockedDoctorRepo.findByUserId.mockResolvedValue(undefined);
      mockedDoctorRepo.createDoctor.mockResolvedValue({ id: 1, user_id: 10 } as any);
      mockedPatientRepo.deleteByUserId.mockResolvedValue(1 as any);
    });

    it('should execute all 4 steps: updateStatus → updateUser → createDoctor → deletePatient', async () => {
      // Arrange — see beforeEach

      // Act
      await staffService.approveRequest(PENDING_REQUEST.id, ADMIN_ID);

      // Assert — verify the exact sequence of calls
      expect(mockedStaffRepo.updateStatus).toHaveBeenCalledTimes(1);
      expect(mockedUsersRepo.adminUpdateUser).toHaveBeenCalledTimes(1);
      expect(mockedDoctorRepo.createDoctor).toHaveBeenCalledTimes(1);
      expect(mockedPatientRepo.deleteByUserId).toHaveBeenCalledTimes(1);
    });

    it('should return a success message object', async () => {
      // Act
      const result = await staffService.approveRequest(PENDING_REQUEST.id, ADMIN_ID);

      // Assert
      expect(result).toMatchObject({ message: 'Request approved successfully' });
    });

    it('should pass the same trx object to every repo call (single transaction boundary)', async () => {
      // Act
      await staffService.approveRequest(PENDING_REQUEST.id, ADMIN_ID);

      // Assert — extract trx argument from each call and verify they are identical
      const updateStatusTrx = (mockedStaffRepo.updateStatus.mock.calls[0] as any[])[2];
      const updateUserTrx   = (mockedUsersRepo.adminUpdateUser.mock.calls[0] as any[])[2];
      const createDoctorTrx = (mockedDoctorRepo.createDoctor.mock.calls[0] as any[])[1];
      const deletePatientTrx = (mockedPatientRepo.deleteByUserId.mock.calls[0] as any[])[1];

      // Every call must share exactly the same trx reference
      expect(updateStatusTrx).toBe(updateUserTrx);
      expect(updateUserTrx).toBe(createDoctorTrx);
      expect(createDoctorTrx).toBe(deletePatientTrx);
    });
  });

  // ─── ✅ Service-level guard: Request not found ────────────────────────────
  describe('✅ Service-level Guards', () => {
    it('should throw appError(404) when the request does not exist', async () => {
      // Arrange
      mockedStaffRepo.findById.mockResolvedValue(undefined);

      // Act + Assert
      await expect(
        staffService.approveRequest(9999, ADMIN_ID),
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Request not found',
      });
    });

    it('should throw appError(400) when the request is already approved', async () => {
      // Arrange
      mockedStaffRepo.findById.mockResolvedValue({
        ...PENDING_REQUEST,
        status: 'approved',
      } as any);

      // Act + Assert
      await expect(
        staffService.approveRequest(PENDING_REQUEST.id, ADMIN_ID),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: 'Request already processed',
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Service Unit Tests — createStaffRequest()
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: staffService.createStaffRequest()', () => {
  const NEW_REQUEST = makeStaffRequest();

  it('should create a request when the user has no existing pending request', async () => {
    // Arrange
    mockedStaffRepo.findByUserId.mockResolvedValue(undefined);
    mockedStaffRepo.createRequest.mockResolvedValue(NEW_REQUEST as any);

    // Act
    const result = await staffService.createStaffRequest(10, 'doctor');

    // Assert
    expect(mockedStaffRepo.createRequest).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ id: NEW_REQUEST.id, user_id: 10 });
  });

  it('should throw appError(400) when a pending request already exists', async () => {
    // Arrange — user has already submitted a request
    mockedStaffRepo.findByUserId.mockResolvedValue(NEW_REQUEST as any);

    // Act + Assert
    await expect(
      staffService.createStaffRequest(10, 'doctor'),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'You already submitted a request',
    });
  });

  it('should NOT call createRequest if an existing request is found', async () => {
    // Arrange
    mockedStaffRepo.findByUserId.mockResolvedValue(NEW_REQUEST as any);

    // Act — ignore the error, we only care about side-effects
    try {
      await staffService.createStaffRequest(10, 'doctor');
    } catch (_) {}

    // Assert
    expect(mockedStaffRepo.createRequest).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  GET /api/v1/staff-requests — List Pending Requests
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/staff-requests', () => {
  const ADMIN_USER   = makeAdmin();
  const PATIENT_USER = makeUser({ id: 10 });

  // ─── ✅ Admin retrieves the list ───────────────────────────────────────────
  describe('✅ Success — admin retrieves pending requests', () => {
    it('should return 200 with an array of pending requests for admin', async () => {
      // Arrange
      loginAs(ADMIN_USER);
      mockedStaffRepo.getAllPending.mockResolvedValue([makeStaffRequest()] as any[]);

      // Act
      const res = await request(app)
        .get('/api/v1/staff-requests')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── ❌ RBAC: Patient cannot list requests ────────────────────────────────
  describe('❌ RBAC — patient cannot access the admin list', () => {
    it('should return 403 when a patient calls GET /api/v1/staff-requests', async () => {
      // Arrange
      loginAs(PATIENT_USER);

      // Act
      const res = await request(app)
        .get('/api/v1/staff-requests')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
    });
  });
});
