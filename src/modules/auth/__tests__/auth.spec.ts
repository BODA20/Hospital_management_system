import request from 'supertest';
import { app } from '../../../../app';

// ─── 1. Mock: bcrypt ──────────────────────────────────────────────────────────
// Hashing is intentionally slow — we never test the algorithm itself.
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock'),
  compare: jest.fn(),
}));

// ─── 2. Mock: jsonwebtoken ────────────────────────────────────────────────────
// Returns a predictable token so assertions don't depend on crypto randomness.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(),
}));

// ─── 3. Mock: Email utility ───────────────────────────────────────────────────
// Prevents any real SMTP connections during the test run.
jest.mock('../../../common/utils/email', () => ({
  Email: jest.fn().mockImplementation(() => ({
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ─── 4. Mock: Knex db ────────────────────────────────────────────────────────
// db.transaction() executes the callback with a stub transaction object.
// In real integration tests swap this block for a real transaction + rollback.
jest.mock('../../../config/db', () => {
  // Minimal Knex transaction stub — repos are fully mocked so trx is never
  // actually queried; it is just passed through as a reference.
  const mockTrx = {
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    first: jest.fn().mockResolvedValue(null),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
  };

  const mockDb = jest.fn() as any;
  mockDb.transaction = jest
    .fn()
    .mockImplementation(async (callback: Function) => callback(mockTrx));
  mockDb.fn = { now: jest.fn().mockReturnValue(new Date()) };

  return { default: mockDb, __esModule: true };
});

// ─── 5. Mock: Users Repository ───────────────────────────────────────────────
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

// ─── 6. Mock: Patient Repository ─────────────────────────────────────────────
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

// ─── 7. Mock: Auth Repository ─────────────────────────────────────────────────
jest.mock('../repositories/auth.repo', () => ({
  saveResetToken: jest.fn(),
  findByResetToken: jest.fn(),
  UpdatePassword: jest.fn(),
  ClearResetToken: jest.fn(),
  changepassword: jest.fn(),
}));

// ─── 8. Mock: Session Service ─────────────────────────────────────────────────
// Wraps refreshToken.repo — mocked to keep session logic predictable.
jest.mock('../services/session.service', () => ({
  createSession: jest.fn(),
  validateSession: jest.fn(),
  rotateSession: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllUserSessions: jest.fn(),
}));

// ─── 9. Mock: Refresh Token Repository ───────────────────────────────────────
jest.mock('../repositories/refreshToken.repo', () => ({
  createToken: jest.fn(),
  findTokenByHash: jest.fn(),
  findTokenById: jest.fn(),
  revokeToken: jest.fn(),
  replaceToken: jest.fn(),
  revokeUserTokens: jest.fn(),
  deleteExpiredTokens: jest.fn(),
}));

// ─── Typed imports (resolved AFTER jest.mock hoisting) ───────────────────────
import bcrypt from 'bcrypt';
import * as usersRepo from '../../users/repositories/user.repo';
import * as patientRepo from '../../patients/repositories/patient.repository';
import * as sessionService from '../services/session.service';

// Typed mock helpers for auto-complete and type safety
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedUsersRepo = usersRepo as jest.Mocked<typeof usersRepo>;
const mockedPatientRepo = patientRepo as jest.Mocked<typeof patientRepo>;
const mockedSessionService = sessionService as jest.Mocked<typeof sessionService>;

// ─── Shared Test Fixtures ─────────────────────────────────────────────────────

/** A valid signup body that passes ALL Zod rules */
const VALID_SIGNUP_BODY = {
  full_name: 'Jane Doe',
  email: 'jane.doe@example.com',
  password: 'SecurePass1!',
  role: 'patient' as const,
};

/** A valid login body */
const VALID_LOGIN_BODY = {
  email: 'jane.doe@example.com',
  password: 'SecurePass1!',
};

/**
 * Full user record as returned by findUserByEmail.
 * Note: the DB column is `password` (not `password_hash`), matching the actual
 * SELECT in user.repo.ts.
 */
const MOCK_DB_USER = {
  id: 1,
  full_name: 'Jane Doe',
  email: 'jane.doe@example.com',
  password_hash: 'hashed_password_mock', // raw DB column name
  role: 'patient' as const,
  is_active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
  phone: null,
  password_change_at: null,
  password_reset_token: null,
  password_reset_expires: null,
  email_change_token: null,
  pending_email: null,
  email_change_expires: null,
};

/** Public user shape returned by createUser / login response */
const MOCK_PUBLIC_USER = {
  id: 1,
  full_name: 'Jane Doe',
  email: 'jane.doe@example.com',
  role: 'patient' as const,
  is_active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
  phone: null,
};

/** Minimal patient row created during signup */
const MOCK_PATIENT = {
  id: 1,
  user_id: 1,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

/** Default session returned by sessionService.createSession */
const MOCK_SESSION = {
  refreshToken: 'mock_refresh_token',
  session: { id: 1, user_id: 1 } as any,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  POST /api/v1/auth/signup
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/signup', () => {
  // Default happy-path mocks — individual tests override as needed
  beforeEach(() => {
    mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);
    mockedUsersRepo.createUser.mockResolvedValue(MOCK_PUBLIC_USER as any);
    mockedPatientRepo.createBasePatient.mockResolvedValue(MOCK_PATIENT as any);
  });

  // ─── ✅ Signup Success ────────────────────────────────────────────────────
  describe('✅ Success — valid payload', () => {
    it('should return 201 Created', async () => {
      // Arrange — see beforeEach

      // Act
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send(VALID_SIGNUP_BODY);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.message).toBe(
        'User created successfully, please log in',
      );
    });

    it('should call bcrypt.hash exactly once to hash the plain-text password', async () => {
      // Arrange + Act
      await request(app).post('/api/v1/auth/signup').send(VALID_SIGNUP_BODY);

      // Assert — password is never stored in plain text
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        VALID_SIGNUP_BODY.password,
        expect.any(Number), // BCRYPT_SALT_ROUNDS
      );
    });

    it('(Atomic) should create a user record AND a patient record', async () => {
      // Arrange + Act
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send(VALID_SIGNUP_BODY);

      // Assert — both side-effects occurred inside the same transaction
      expect(res.status).toBe(201);
      expect(mockedUsersRepo.createUser).toHaveBeenCalledTimes(1);
      expect(mockedPatientRepo.createBasePatient).toHaveBeenCalledTimes(1);
    });

    it('(Atomic) patient record should be linked to the newly created user id', async () => {
      // Arrange + Act
      await request(app).post('/api/v1/auth/signup').send(VALID_SIGNUP_BODY);

      // Assert — createBasePatient receives the user id as the first arg
      expect(mockedPatientRepo.createBasePatient).toHaveBeenCalledWith(
        MOCK_PUBLIC_USER.id,
        expect.anything(), // Knex transaction reference
      );
    });

    it('should NOT expose the password hash in the response body', async () => {
      // Arrange + Act
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send(VALID_SIGNUP_BODY);

      // Assert
      const body = JSON.stringify(res.body);
      expect(body).not.toMatch(/hashed_password_mock/);
      expect(body).not.toMatch(/password_hash/);
      expect(body).not.toMatch(/"password"/);
    });
  });

  // ─── ❌ Failure: Duplicate Email ──────────────────────────────────────────
  describe('❌ Failure — duplicate email', () => {
    it('should return 409 Conflict when the email is already registered', async () => {
      // Arrange — email already in use
      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);

      // Act
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send(VALID_SIGNUP_BODY);

      // Assert
      expect(res.status).toBe(409);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/email already in use/i);
    });

    it('should NOT create a user or patient record when the email is taken', async () => {
      // Arrange
      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);

      // Act
      await request(app).post('/api/v1/auth/signup').send(VALID_SIGNUP_BODY);

      // Assert — zero side-effects on duplicate
      expect(mockedUsersRepo.createUser).not.toHaveBeenCalled();
      expect(mockedPatientRepo.createBasePatient).not.toHaveBeenCalled();
    });
  });

  // ─── ❌ Failure: Zod Validation ───────────────────────────────────────────
  describe('❌ Failure — Zod validation errors', () => {
    it('should return 400 when email format is invalid', async () => {
      // Arrange
      const payload = { ...VALID_SIGNUP_BODY, email: 'not-an-email' };

      // Act
      const res = await request(app).post('/api/v1/auth/signup').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Validation Error');
    });

    it('should return 400 when password is too short (< 8 characters)', async () => {
      // Arrange
      const payload = { ...VALID_SIGNUP_BODY, password: 'Ab1!' };

      // Act
      const res = await request(app).post('/api/v1/auth/signup').send(payload);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(
        res.body.errors.some((e: { path: string }) => e.path === 'password'),
      ).toBe(true);
    });

    it('should return 400 when password has no uppercase letter', async () => {
      // Arrange
      const payload = { ...VALID_SIGNUP_BODY, password: 'lowercase1!' };

      // Act + Assert
      const res = await request(app).post('/api/v1/auth/signup').send(payload);
      expect(res.status).toBe(400);
    });

    it('should return 400 when password has no number', async () => {
      // Arrange
      const payload = { ...VALID_SIGNUP_BODY, password: 'NoNumber!!' };

      // Act + Assert
      const res = await request(app).post('/api/v1/auth/signup').send(payload);
      expect(res.status).toBe(400);
    });

    it('should return 400 when password has no symbol', async () => {
      // Arrange
      const payload = { ...VALID_SIGNUP_BODY, password: 'NoSymbol123' };

      // Act + Assert
      const res = await request(app).post('/api/v1/auth/signup').send(payload);
      expect(res.status).toBe(400);
    });

    it('should return 400 when full_name is missing', async () => {
      // Arrange — destructure to remove full_name
      const { full_name: _removed, ...payload } = VALID_SIGNUP_BODY;

      // Act + Assert
      const res = await request(app).post('/api/v1/auth/signup').send(payload);
      expect(res.status).toBe(400);
    });

    it('should return 400 when role is not one of the allowed enum values', async () => {
      // Arrange
      const payload = { ...VALID_SIGNUP_BODY, role: 'hacker' };

      // Act + Assert
      const res = await request(app).post('/api/v1/auth/signup').send(payload);
      expect(res.status).toBe(400);
    });
  });

  // ─── 🔒 Security: SQL Injection ──────────────────────────────────────────
  describe("🔒 Security — SQL injection in 'email' field", () => {
    it("should treat \" ' OR 1=1 -- \" as a Zod validation failure, never hitting the DB", async () => {
      // Arrange — classic injection string as the email value
      const payload = { ...VALID_SIGNUP_BODY, email: "' OR 1=1 --" };

      // Act
      const res = await request(app).post('/api/v1/auth/signup').send(payload);

      // Assert — Zod rejects the malformed email before any repo is called
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
      expect(mockedUsersRepo.findUserByEmail).not.toHaveBeenCalled();
      expect(mockedUsersRepo.createUser).not.toHaveBeenCalled();
    });
  });

  // ─── 🔒 Security: Empty Body ──────────────────────────────────────────────
  describe('🔒 Security — empty / missing request body', () => {
    it('should return 400 gracefully without crashing the server', async () => {
      // Arrange — completely empty body

      // Act
      const res = await request(app).post('/api/v1/auth/signup').send({});

      // Assert — globalErrorHandler must handle it cleanly
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  POST /api/v1/auth/login
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/login', () => {
  // Default happy-path setup
  beforeEach(() => {
    mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
    (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockedSessionService.createSession.mockResolvedValue(MOCK_SESSION);
  });

  // ─── ✅ Login Success ──────────────────────────────────────────────────────
  describe('✅ Success — valid credentials', () => {
    it('should return 200 OK', async () => {
      // Arrange — see beforeEach

      // Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(VALID_LOGIN_BODY);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should return accessToken and refreshToken in the response body', async () => {
      // Arrange — see beforeEach

      // Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(VALID_LOGIN_BODY);

      // Assert — both token fields exist and carry predictable mock values
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.accessToken).toBe('mock_access_token');
      expect(res.body.data.refreshToken).toBe(MOCK_SESSION.refreshToken);
    });

    it('should return a public user profile (no password fields)', async () => {
      // Arrange + Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(VALID_LOGIN_BODY);

      // Assert
      const user = res.body.data.user;
      expect(user).toBeDefined();
      expect(user.id).toBe(MOCK_DB_USER.id);
      expect(user.email).toBe(MOCK_DB_USER.email);
      expect(user.full_name).toBe(MOCK_DB_USER.full_name);
      // Security: no password-related field in response
      const responseStr = JSON.stringify(user);
      expect(responseStr).not.toMatch(/password/);
    });

    it('should call bcrypt.compare with the submitted password and the stored hash', async () => {
      // Arrange + Act
      await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);

      // Assert
      expect(mockedBcrypt.compare).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        VALID_LOGIN_BODY.password,
        MOCK_DB_USER.password_hash, // hashed value from DB
      );
    });

    it('should call sessionService.createSession to persist the refresh token hash', async () => {
      // Arrange + Act
      await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);

      // Assert — session creation always runs on successful auth
      expect(mockedSessionService.createSession).toHaveBeenCalledTimes(1);
      expect(mockedSessionService.createSession).toHaveBeenCalledWith(
        MOCK_DB_USER.id,
      );
    });
  });

  // ─── ❌ Failure: Wrong Password ───────────────────────────────────────────
  describe('❌ Failure — wrong password', () => {
    it('should return 401 Unauthorized', async () => {
      // Arrange — password mismatch
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ ...VALID_LOGIN_BODY, password: 'WrongPass1!' });

      // Assert — generic message (never leak which field failed)
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should NOT create a session when the password is wrong', async () => {
      // Arrange
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      await request(app)
        .post('/api/v1/auth/login')
        .send({ ...VALID_LOGIN_BODY, password: 'WrongPass1!' });

      // Assert — no refresh token persisted
      expect(mockedSessionService.createSession).not.toHaveBeenCalled();
    });
  });

  // ─── ❌ Failure: Non-existent User ────────────────────────────────────────
  describe('❌ Failure — non-existent user', () => {
    it('should return 401 Unauthorized when email is not registered', async () => {
      // Arrange — email not in DB
      mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);

      // Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(VALID_LOGIN_BODY);

      // Assert — same 401, same message (prevent user enumeration)
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should NOT call bcrypt.compare if the user is not found (early-exit)', async () => {
      // Arrange
      mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);

      // Act
      await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);

      // Assert — bcrypt never reached; avoids unnecessary computation
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });
  });

  // ─── ❌ Failure: Deactivated Account ─────────────────────────────────────
  describe('❌ Failure — deactivated account', () => {
    it('should return 403 Forbidden when is_active is false', async () => {
      // Arrange — user exists but is deactivated
      mockedUsersRepo.findUserByEmail.mockResolvedValue({
        ...MOCK_DB_USER,
        is_active: false,
      } as any);

      // Act
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(VALID_LOGIN_BODY);

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/deactivated/i);
    });
  });

  // ─── ❌ Failure: Zod Validation ───────────────────────────────────────────
  describe('❌ Failure — Zod validation errors', () => {
    it('should return 400 when email format is invalid', async () => {
      // Arrange
      const payload = { ...VALID_LOGIN_BODY, email: 'not-an-email' };

      // Act + Assert
      const res = await request(app).post('/api/v1/auth/login').send(payload);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation Error');
    });

    it('should return 400 when password field is missing', async () => {
      // Arrange
      const { password: _removed, ...payload } = VALID_LOGIN_BODY;

      // Act + Assert
      const res = await request(app).post('/api/v1/auth/login').send(payload);
      expect(res.status).toBe(400);
    });
  });

  // ─── 🔒 Security: SQL Injection ──────────────────────────────────────────
  describe("🔒 Security — SQL injection in 'email' field", () => {
    it("should treat \" ' OR 1=1 -- \" as a Zod validation failure at login", async () => {
      // Arrange
      const payload = { ...VALID_LOGIN_BODY, email: "' OR 1=1 --" };

      // Act
      const res = await request(app).post('/api/v1/auth/login').send(payload);

      // Assert — Zod validates email format BEFORE any DB call
      expect(res.status).toBe(400);
      expect(mockedUsersRepo.findUserByEmail).not.toHaveBeenCalled();
    });
  });

  // ─── 🔒 Security: Empty Body ──────────────────────────────────────────────
  describe('🔒 Security — empty request body', () => {
    it('should return 400 gracefully without crashing the server', async () => {
      // Act
      const res = await request(app).post('/api/v1/auth/login').send({});

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — Auth Service Logic (direct service calls, no HTTP)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: authService', () => {
  // Import the real service (all its dependencies are already mocked above)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authService = require('../services/auth.service');

  // ─── signup() ─────────────────────────────────────────────────────────────
  describe('signup()', () => {
    beforeEach(() => {
      mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);
      mockedUsersRepo.createUser.mockResolvedValue(MOCK_PUBLIC_USER as any);
      mockedPatientRepo.createBasePatient.mockResolvedValue(MOCK_PATIENT as any);
    });

    it('should call bcrypt.hash with the plain-text password to produce a hash', async () => {
      // Arrange — see beforeEach

      // Act
      await authService.signup(VALID_SIGNUP_BODY);

      // Assert — password hashing is always performed before storage
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        VALID_SIGNUP_BODY.password,
        expect.any(Number),
      );
    });

    it('should throw appError(409) when the email is already registered', async () => {
      // Arrange
      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);

      // Act + Assert
      await expect(authService.signup(VALID_SIGNUP_BODY)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already in use',
      });
    });

    it('should return the new user and a success message', async () => {
      // Arrange — see beforeEach

      // Act
      const result = await authService.signup(VALID_SIGNUP_BODY);

      // Assert
      expect(result.message).toBe('User created successfully, please log in');
      expect(result.user).toMatchObject({
        id: MOCK_PUBLIC_USER.id,
        email: MOCK_PUBLIC_USER.email,
      });
    });

    it('should invoke createBasePatient inside the same transaction as createUser', async () => {
      // Arrange — see beforeEach

      // Act
      await authService.signup(VALID_SIGNUP_BODY);

      // Assert — both repo calls happened; both received a trx reference
      expect(mockedUsersRepo.createUser).toHaveBeenCalledTimes(1);
      expect(mockedPatientRepo.createBasePatient).toHaveBeenCalledTimes(1);

      const userTrx = (mockedUsersRepo.createUser.mock.calls[0] as any[])[1];
      const patientTrx = (
        mockedPatientRepo.createBasePatient.mock.calls[0] as any[]
      )[1];

      // The same transaction object must be passed to both calls
      expect(userTrx).toBe(patientTrx);
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────
  describe('login()', () => {
    beforeEach(() => {
      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockedSessionService.createSession.mockResolvedValue(MOCK_SESSION);
    });

    it('should throw appError(401) when the user does not exist', async () => {
      // Arrange
      mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);

      // Act + Assert
      await expect(authService.login(VALID_LOGIN_BODY)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should throw appError(401) on password mismatch', async () => {
      // Arrange
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act + Assert
      await expect(authService.login(VALID_LOGIN_BODY)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('should call sessionService.createSession with the user id on success', async () => {
      // Arrange — see beforeEach

      // Act
      await authService.login(VALID_LOGIN_BODY);

      // Assert — session (and its hashed refresh token) is persisted
      expect(mockedSessionService.createSession).toHaveBeenCalledTimes(1);
      expect(mockedSessionService.createSession).toHaveBeenCalledWith(
        MOCK_DB_USER.id,
      );
    });

    it('should return accessToken, refreshToken, and a clean public user', async () => {
      // Arrange — see beforeEach

      // Act
      const result = await authService.login(VALID_LOGIN_BODY);

      // Assert
      expect(result.accessToken).toBe('mock_access_token');
      expect(result.refreshToken).toBe(MOCK_SESSION.refreshToken);
      // Public user must not contain any password field
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(result.user).toMatchObject({
        id: MOCK_DB_USER.id,
        email: MOCK_DB_USER.email,
        role: MOCK_DB_USER.role,
      });
    });
  });

  // ─── Token Rotation — createSession stores a hash, returns raw token ──────
  describe('Token Rotation — session.createSession()', () => {
    it('should return the RAW refresh token to the client, not the stored hash', async () => {
      // Arrange — simulate session with a different raw vs stored value
      const rawToken = 'raw_64_byte_hex_token_abc123def456';
      const storedHash = 'sha256_hash_of_that_token_xyz789';

      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockedSessionService.createSession.mockResolvedValue({
        refreshToken: rawToken,
        session: { id: 99, user_id: 1, token_hash: storedHash } as any,
      });

      // Act
      const result = await authService.login(VALID_LOGIN_BODY);

      // Assert — client receives the RAW token (used to re-authenticate)
      expect(result.refreshToken).toBe(rawToken);

      // The raw token must NOT equal the stored hash (hashing was applied)
      expect(result.refreshToken).not.toBe(storedHash);

      // createSession was called, meaning the hashed version is in the DB
      expect(mockedSessionService.createSession).toHaveBeenCalledWith(
        MOCK_DB_USER.id,
      );
    });
  });
});
