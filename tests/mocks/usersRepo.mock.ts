import * as usersRepo from '../../src/modules/users/repositories/user.repo';

jest.mock('../../src/modules/users/repositories/user.repo', () => ({
  findUserByEmail:          jest.fn(),
  findUserById:             jest.fn(),
  findUserForAuth:          jest.fn(),
  findUserWithPasswordById: jest.fn(),
  createUser:               jest.fn(),
  updateUserById:           jest.fn(),
  deactivateUser:           jest.fn(),
  saveEmailChangeToken:     jest.fn(),
  updateEmail:              jest.fn(),
  clearEmailChangeToken:    jest.fn(),
  findByEmailToken:         jest.fn(),
  updateEmailChangeExpires: jest.fn(),
  updateUserRole:           jest.fn(),
  adminUpdateUser:          jest.fn(),
  findAllUsers:             jest.fn(),
}));

export const mockedUsersRepo = usersRepo as jest.Mocked<typeof usersRepo>;

export const makeUser = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 10,
  full_name: 'Test User',
  email: 'user@example.com',
  password_hash: 'hashed',
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

export const makeAdmin = (overrides: Partial<Record<string, any>> = {}) =>
  makeUser({ id: 1, full_name: 'Hospital Admin', email: 'admin@hospital.com', role: 'admin', ...overrides });

export const makeStaff = (role: 'doctor' | 'nurse', overrides: Partial<Record<string, any>> = {}) =>
  makeUser({ id: 20, role, email: `${role}@hospital.com`, ...overrides });

export const makeUserFull = makeUser;
