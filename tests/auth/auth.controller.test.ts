import request from 'supertest';
import { app } from '../../app';

// Mock Dependencies - These must be hoisted and setup before imports using them
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(),
}));

jest.mock('../../src/common/utils/email', () => ({
  Email: jest.fn().mockImplementation(() => ({
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (callback: Function) => callback({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
  },
}));

jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/auth/services/session.service', () => require('../mocks/authRepo.mock').mockedSessionService);

import { mockedUsersRepo } from '../mocks/usersRepo.mock';
import { mockedPatientRepo } from '../mocks/patientsRepo.mock'; // Assuming we create this next, or use it here
import { mockedSessionService, MOCK_SESSION } from '../mocks/authRepo.mock';
import bcrypt from 'bcrypt';

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Shared Fixtures
const VALID_SIGNUP_BODY = {
  full_name: 'Jane Doe',
  email: 'jane.doe@example.com',
  password: 'SecurePass1!',
  role: 'patient' as const,
};

const VALID_LOGIN_BODY = {
  email: 'jane.doe@example.com',
  password: 'SecurePass1!',
};

const MOCK_DB_USER = {
  id: 1,
  full_name: 'Jane Doe',
  email: 'jane.doe@example.com',
  password_hash: 'hashed_password_mock',
  role: 'patient' as const,
  is_active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

const MOCK_PUBLIC_USER = {
  id: 1,
  full_name: 'Jane Doe',
  email: 'jane.doe@example.com',
  role: 'patient' as const,
  is_active: true,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

const MOCK_PATIENT = {
  id: 1,
  user_id: 1,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  AUTH CONTROLLER TESTS (API Layer)
// ═══════════════════════════════════════════════════════════════════════════════
describe('AUTH API CONTROLLER', () => {
  describe('POST /api/v1/auth/signup', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);
      mockedUsersRepo.createUser.mockResolvedValue(MOCK_PUBLIC_USER as any);
      if (mockedPatientRepo.createBasePatient) {
        mockedPatientRepo.createBasePatient.mockResolvedValue(MOCK_PATIENT as any);
      }
    });

    describe('✅ Success — valid payload', () => {
      it('should return 201 Created and success message', async () => {
        const res = await request(app).post('/api/v1/auth/signup').send(VALID_SIGNUP_BODY);
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
      });

      it('should NOT expose the password hash in the response body', async () => {
        const res = await request(app).post('/api/v1/auth/signup').send(VALID_SIGNUP_BODY);
        const body = JSON.stringify(res.body);
        expect(body).not.toMatch(/hashed_password_mock/);
        expect(body).not.toMatch(/password_hash/);
        expect(body).not.toMatch(/"password"/);
      });
    });

    describe('❌ Failure — duplicate email', () => {
      it('should return 409 Conflict when the email is already registered', async () => {
        mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
        const res = await request(app).post('/api/v1/auth/signup').send(VALID_SIGNUP_BODY);
        expect(res.status).toBe(409);
        expect(res.body.status).toBe('fail');
        expect(res.body.message).toMatch(/email already in use/i);
      });
    });

    describe('❌ Failure — Zod validation errors', () => {
      it('should return 400 when email format is invalid', async () => {
        const res = await request(app).post('/api/v1/auth/signup').send({ ...VALID_SIGNUP_BODY, email: 'not-an-email' });
        expect(res.status).toBe(400);
      });

      it('should return 400 when password is too short (< 8 characters)', async () => {
        const res = await request(app).post('/api/v1/auth/signup').send({ ...VALID_SIGNUP_BODY, password: 'Ab1!' });
        expect(res.status).toBe(400);
      });

      it('should return 400 when role is not one of the allowed enum values', async () => {
        const res = await request(app).post('/api/v1/auth/signup').send({ ...VALID_SIGNUP_BODY, role: 'hacker' });
        expect(res.status).toBe(400);
      });
    });

    describe("🔒 Security — SQL injection in 'email' field", () => {
      it("should treat \" ' OR 1=1 -- \" as a Zod validation failure, never hitting the DB", async () => {
        const res = await request(app).post('/api/v1/auth/signup').send({ ...VALID_SIGNUP_BODY, email: "' OR 1=1 --" });
        expect(res.status).toBe(400);
        expect(mockedUsersRepo.findUserByEmail).not.toHaveBeenCalled();
      });
    });

    describe('🔒 Security — empty / missing request body', () => {
      it('should return 400 gracefully without crashing the server', async () => {
        const res = await request(app).post('/api/v1/auth/signup').send({});
        expect(res.status).toBe(400);
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockedSessionService.createSession.mockResolvedValue(MOCK_SESSION as any);
    });

    describe('✅ Success — valid credentials', () => {
      it('should return 200 OK', async () => {
        const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
      });

      it('should return accessToken and refreshToken in the response body', async () => {
        const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.refreshToken).toBeDefined();
      });

      it('should return a public user profile (no password fields)', async () => {
        const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);
        const user = res.body.data.user;
        expect(user).toBeDefined();
        expect(user.id).toBe(MOCK_DB_USER.id);
        const responseStr = JSON.stringify(user);
        expect(responseStr).not.toMatch(/password/);
      });
    });

    describe('❌ Failure — wrong password', () => {
      it('should return 401 Unauthorized', async () => {
        (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);
        const res = await request(app).post('/api/v1/auth/login').send({ ...VALID_LOGIN_BODY, password: 'WrongPass1!' });
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid email or password/i);
      });
    });

    describe('❌ Failure — non-existent user', () => {
      it('should return 401 Unauthorized when email is not registered', async () => {
        mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);
        const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);
        expect(res.status).toBe(401);
      });
    });

    describe('❌ Failure — deactivated account', () => {
      it('should return 403 Forbidden when is_active is false', async () => {
        mockedUsersRepo.findUserByEmail.mockResolvedValue({ ...MOCK_DB_USER, is_active: false } as any);
        const res = await request(app).post('/api/v1/auth/login').send(VALID_LOGIN_BODY);
        expect(res.status).toBe(403);
      });
    });

    describe('❌ Failure — Zod validation errors', () => {
      it('should return 400 when email format is invalid', async () => {
        const res = await request(app).post('/api/v1/auth/login').send({ ...VALID_LOGIN_BODY, email: 'not-an-email' });
        expect(res.status).toBe(400);
      });
    });
  });
});
