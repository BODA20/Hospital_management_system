import * as authService from '../../src/modules/auth/services/auth.service';
import { mockedUsersRepo } from '../mocks/usersRepo.mock';
import { mockedPatientRepo } from '../mocks/patientsRepo.mock';
import { mockedSessionService, MOCK_SESSION } from '../mocks/authRepo.mock';
import bcrypt from 'bcrypt';

process.env.JWT_SECRET = 'test_secret';

jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/auth/services/session.service', () => require('../mocks/authRepo.mock').mockedSessionService);

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password_mock'),
  compare: jest.fn(),
}));

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

describe('SERVICE: authService (Business Logic Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signup()', () => {
    beforeEach(() => {
      mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);
      mockedUsersRepo.createUser.mockResolvedValue(MOCK_PUBLIC_USER as any);
      if (mockedPatientRepo.createBasePatient) {
        mockedPatientRepo.createBasePatient.mockResolvedValue(MOCK_PATIENT as any);
      }
    });

    it('should call bcrypt.hash with the plain-text password to produce a hash', async () => {
      await authService.signup(VALID_SIGNUP_BODY);
      expect(mockedBcrypt.hash).toHaveBeenCalledTimes(1);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(VALID_SIGNUP_BODY.password, expect.any(Number));
    });

    it('should throw appError(409) when the email is already registered', async () => {
      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
      await expect(authService.signup(VALID_SIGNUP_BODY)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already in use',
      });
    });

    it('should return the new user and a success message', async () => {
      const result = await authService.signup(VALID_SIGNUP_BODY);
      expect(result.message).toBe('User created successfully, please log in');
      expect(result.user).toMatchObject({
        id: MOCK_PUBLIC_USER.id,
        email: MOCK_PUBLIC_USER.email,
      });
    });

    it('should invoke createBasePatient inside the same transaction as createUser', async () => {
      await authService.signup(VALID_SIGNUP_BODY);
      expect(mockedUsersRepo.createUser).toHaveBeenCalledTimes(1);
      expect(mockedPatientRepo.createBasePatient).toHaveBeenCalledTimes(1);

      const userTrx = (mockedUsersRepo.createUser.mock.calls[0] as any[])[1];
      const patientTrx = (mockedPatientRepo.createBasePatient.mock.calls[0] as any[])[1];
      expect(userTrx).toBe(patientTrx);
    });
  });

  describe('login()', () => {
    beforeEach(() => {
      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockedSessionService.createSession.mockResolvedValue(MOCK_SESSION as any);
    });

    it('should throw appError(401) when the user does not exist', async () => {
      mockedUsersRepo.findUserByEmail.mockResolvedValue(undefined);
      await expect(authService.login(VALID_LOGIN_BODY)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should throw appError(401) on password mismatch', async () => {
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(authService.login(VALID_LOGIN_BODY)).rejects.toMatchObject({
        statusCode: 401,
      });
    });

    it('should call sessionService.createSession with the user id on success', async () => {
      await authService.login(VALID_LOGIN_BODY);
      expect(mockedSessionService.createSession).toHaveBeenCalledTimes(1);
      expect(mockedSessionService.createSession).toHaveBeenCalledWith(MOCK_DB_USER.id);
    });

    it('should return accessToken, refreshToken, and a clean public user', async () => {
      const result = await authService.login(VALID_LOGIN_BODY);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBe(MOCK_SESSION.refreshToken);
      expect(result.user).not.toHaveProperty('password');
      expect(result.user).not.toHaveProperty('password_hash');
    });
  });

  describe('Token Rotation — session.createSession()', () => {
    it('should return the RAW refresh token to the client, not the stored hash', async () => {
      const rawToken = 'raw_64_byte_hex_token_abc123def456';
      const storedHash = 'sha256_hash_of_that_token_xyz789';

      mockedUsersRepo.findUserByEmail.mockResolvedValue(MOCK_DB_USER as any);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockedSessionService.createSession.mockResolvedValue({
        refreshToken: rawToken,
        session: { id: 99, user_id: 1, token_hash: storedHash } as any,
      });

      const result = await authService.login(VALID_LOGIN_BODY);
      expect(result.refreshToken).toBe(rawToken);
      expect(result.refreshToken).not.toBe(storedHash);
      expect(mockedSessionService.createSession).toHaveBeenCalledWith(MOCK_DB_USER.id);
    });
  });
});
