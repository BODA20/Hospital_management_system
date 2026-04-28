import * as authRepo from '../../src/modules/auth/repositories/auth.repo';
import * as sessionService from '../../src/modules/auth/services/session.service';
import * as refreshTokenRepo from '../../src/modules/auth/repositories/refreshToken.repo';

export const mockedAuthRepo = {
  saveResetToken: jest.fn(),
  findByResetToken: jest.fn(),
  UpdatePassword: jest.fn(),
  ClearResetToken: jest.fn(),
  changepassword: jest.fn(),
};

export const mockedSessionService = {
  createSession: jest.fn(),
  validateSession: jest.fn(),
  rotateSession: jest.fn(),
  revokeSession: jest.fn(),
  revokeAllUserSessions: jest.fn(),
};

export const mockedRefreshTokenRepo = {
  createToken: jest.fn(),
  findTokenByHash: jest.fn(),
  findTokenById: jest.fn(),
  revokeToken: jest.fn(),
  replaceToken: jest.fn(),
  revokeUserTokens: jest.fn(),
  deleteExpiredTokens: jest.fn(),
};

export const MOCK_SESSION = {
  refreshToken: 'mock_refresh_token',
  session: { id: 1, user_id: 1 } as any,
};
