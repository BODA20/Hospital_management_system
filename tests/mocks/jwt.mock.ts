import jwt from 'jsonwebtoken';
import { mockedUsersRepo, makeUser } from './usersRepo.mock';

// ─── 1. Mock: jsonwebtoken ────────────────────────────────────────────────────
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(),
}));

// ─── 5. Mock: Session + Refresh-Token Repos ───────────────────────────────────
jest.mock('../../src/modules/auth/services/session.service', () => ({
  createSession:         jest.fn(),
  validateSession:       jest.fn(),
  rotateSession:         jest.fn(),
  revokeSession:         jest.fn(),
  revokeAllUserSessions: jest.fn(),
}));

jest.mock('../../src/modules/auth/repositories/refreshToken.repo', () => ({
  createToken:         jest.fn(),
  findTokenByHash:     jest.fn(),
  findTokenById:       jest.fn(),
  revokeToken:         jest.fn(),
  replaceToken:        jest.fn(),
  revokeUserTokens:    jest.fn(),
  deleteExpiredTokens: jest.fn(),
}));

// ─── 6. Mock: Email utility ───────────────────────────────────────────────────
jest.mock('../../src/common/utils/email', () => ({
  Email: jest.fn().mockImplementation(() => ({
    sendPasswordReset:           jest.fn().mockResolvedValue(undefined),
    sendEmailChangeVerification: jest.fn().mockResolvedValue(undefined),
  })),
}));

export const mockedJwt = jwt as jest.Mocked<typeof jwt>;

export const bearerHeader = () => ({ Authorization: 'Bearer mock_token_value' });

export const loginAs = (user: ReturnType<typeof makeUser>) => {
  (mockedJwt.verify as jest.Mock).mockReturnValue({
    id:   user.id,
    role: user.role,
    iat:  Math.floor(Date.now() / 1000) - 10,
    exp:  Math.floor(Date.now() / 1000) + 3600,
  });
  mockedUsersRepo.findUserById.mockResolvedValue(user as any);
  mockedUsersRepo.findUserForAuth.mockResolvedValue({ id: user.id, role: user.role, is_active: user.is_active, password_change_at: user.password_change_at } as any);
};

