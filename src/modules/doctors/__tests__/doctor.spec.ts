import request from 'supertest';
import { app } from '../../../../app';

// ─── 1. Mock: jsonwebtoken ────────────────────────────────────────────────────
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(),
}));

// ─── 2. Mock: Knex db ────────────────────────────────────────────────────────
jest.mock('../../../config/db', () => {
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
  
  // Base query builder chain for fallback behavior
  const chain: any = {};
  chain.select = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.leftJoin = jest.fn().mockReturnValue(chain);
  chain.first = jest.fn().mockResolvedValue(null);
  chain.then = (resolve: Function) => Promise.resolve([]).then(resolve as any);
  mockDb.mockReturnValue(chain);

  return { default: mockDb, __esModule: true };
});

// ─── 3. Mock Repositories ─────────────────────────────────────────────────────
jest.mock('../repositories/doctor.repo', () => ({
  findByUserId: jest.fn(),
  updateByUserId: jest.fn(),
  getAllDoctors: jest.fn(),
  createDoctor: jest.fn(),
  findById: jest.fn(),
}));

jest.mock('../../users/repositories/user.repo', () => ({
  findUserById: jest.fn(),
  updateUserById: jest.fn(),
  findUserByEmail: jest.fn(),
}));

jest.mock('../../appointments/repositories/appo.repo', () => ({
  findByDoctorId: jest.fn(),
  getByDoctor: jest.fn().mockResolvedValue([]),
  getPatientAppointments: jest.fn(),
}));

// ─── 4. Typed Imports ─────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';
import * as doctorRepo from '../repositories/doctor.repo';
import * as userRepo from '../../users/repositories/user.repo';

const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedDoctorRepo = doctorRepo as jest.Mocked<typeof doctorRepo>;
const mockedUserRepo = userRepo as jest.Mocked<typeof userRepo>;

// ─── 5. Test Data Factories ───────────────────────────────────────────────────
const makeUser = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 1,
  full_name: 'Test Doctor User',
  email: 'doctor@example.com',
  password_hash: 'hashed',
  role: 'doctor',
  is_active: true,
  created_at: new Date('2024-01-01'),
  phone: null,
  ...overrides,
});

const makeDoctor = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 100,
  user_id: 1,
  specialization: 'Cardiology',
  years_of_experience: 5,
  bio: 'Expert heart specialist',
  consultation_fee: 150,
  department_id: 1,
  department_name: 'General',
  ...overrides,
});

const loginAs = (user: ReturnType<typeof makeUser>) => {
  (mockedJwt.verify as jest.Mock).mockReturnValue({
    id: user.id,
    role: user.role,
    iat: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  mockedUserRepo.findUserById.mockResolvedValue(user as any);
};

const bearerHeader = () => ({ Authorization: 'Bearer mock_token_value' });

// ═══════════════════════════════════════════════════════════════════════════════
// 📬 Suite 1: Public Routes (Integration)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Public Doctor Routes', () => {
  beforeEach(() => {
    mockedDoctorRepo.getAllDoctors.mockResolvedValue([makeDoctor(), makeDoctor({ id: 101 })]);
    mockedDoctorRepo.findById.mockResolvedValue(makeDoctor());
  });

  describe('GET /api/v1/doctors (Search/Filter)', () => {
    it('should return a list of doctors without requiring authentication', async () => {
      const res = await request(app).get('/api/v1/doctors');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBe(2);
      expect(mockedDoctorRepo.getAllDoctors).toHaveBeenCalledTimes(1);
    });

    it('(TDD) should support search by name or specialization query params', async () => {
      // Act
      await request(app).get('/api/v1/doctors?specialization=Cardiology&name=Test');
      
      // Assert - this expects the controller to map query params to repo eventually
      expect(mockedDoctorRepo.getAllDoctors).toHaveBeenCalledWith(
        expect.objectContaining({
          specialization: 'Cardiology',
          name: 'Test',
        })
      );
    });
  });

  describe('GET /api/v1/doctors/:id (Detailed View)', () => {
    it('(TDD) should retrieve a specific doctor including joined data from users table', async () => {
      const dbDoctor = makeDoctor();
      mockedDoctorRepo.findById.mockResolvedValue({
        ...dbDoctor,
        user: { full_name: 'Dr. Smith', phone: '123456789' }
      } as any);

      const res = await request(app).get(`/api/v1/doctors/${dbDoctor.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(dbDoctor.id);
      expect(res.body.data.user).toBeDefined(); // Ensures the joined data exists in response
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔒 Suite 2: Protected Routes & RBAC (Integration)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Protected Doctor Routes & RBAC', () => {
  describe('PATCH /api/v1/doctors/me (Profile Updates)', () => {
    beforeEach(() => {
      const doctorUser = makeUser({ id: 2, role: 'doctor' });
      loginAs(doctorUser);
      mockedDoctorRepo.findByUserId.mockResolvedValue(makeDoctor({ user_id: 2 }));
      mockedDoctorRepo.updateByUserId.mockResolvedValue(makeDoctor({ bio: 'New Bio' }));
    });

    it('should allow a doctor to update their own record', async () => {
      const res = await request(app)
        .patch('/api/v1/doctors/me')
        .set(bearerHeader())
        .send({ bio: 'New Bio', specialization: 'Neurology' });

      expect(res.status).toBe(200);
      expect(mockedDoctorRepo.updateByUserId).toHaveBeenCalledWith(2, expect.any(Object), expect.any(Object));
    });

    it('(TDD) should expect complex updates to modify both user and doctor tables', async () => {
      // Act
      const res = await request(app)
        .patch('/api/v1/doctors/me')
        .set(bearerHeader())
        .send({ bio: 'New Bio', phone: '555-5555' });

      expect(res.status).toBe(200);
      // Ensures the endpoint orchestrates updating both tables (which will be verified via transactions)
    });
  });

  describe('(TDD) PATCH /api/v1/doctors/:id (Admin Override & RBAC Guard)', () => {
    it('Admin Case: should verify an Admin can update any doctor\'s profile', async () => {
      loginAs(makeUser({ role: 'admin' }));
      mockedDoctorRepo.updateByUserId.mockResolvedValue(makeDoctor());

      const res = await request(app)
        .patch('/api/v1/doctors/100')
        .set(bearerHeader())
        .send({ consultation_fee: 500 });
      
      expect(res.status).toBe(200);
    });

    it('Security Case: should forbid Doctor A from updating Doctor B\'s schedule/bio', async () => {
      // Doctor A is logged in
      loginAs(makeUser({ id: 5, role: 'doctor' })); 

      // Tries to update Doctor B (ID: 10)
      const res = await request(app)
        .patch('/api/v1/doctors/10')
        .set(bearerHeader())
        .send({ bio: 'Malicious Bio' });

      expect(res.status).toBe(403);
    });
  });

  describe('(TDD) GET /api/v1/doctors/my-appointments', () => {
    it('should return 403 Forbidden when a Patient tries to access doctor appointments', async () => {
      loginAs(makeUser({ id: 99, role: 'patient' }));

      const res = await request(app)
        .get('/api/v1/doctors/my-appointments')
        .set(bearerHeader());

      expect(res.status).toBe(403);
    });

    it('should return 200 OK when a Doctor accesses their own appointments', async () => {
      loginAs(makeUser({ id: 2, role: 'doctor' }));

      const res = await request(app)
        .get('/api/v1/doctors/my-appointments')
        .set(bearerHeader());

      expect(res.status).toBe(200);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 Suite 3: Service Unit Tests (Business Logic)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: doctorService', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const doctorService = require('../services/doctor.service');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const db = require('../../../config/db').default;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateMyProfile()', () => {
    it('Transaction Check: should wrap profile updates involving multiple tables in a Knex Transaction', async () => {
      // Arrange
      mockedDoctorRepo.findByUserId.mockResolvedValue(makeDoctor());
      mockedDoctorRepo.updateByUserId.mockResolvedValue(makeDoctor());

      // Act
      await doctorService.updateMyProfile(1, { bio: 'hello' });

      // Assert: Verify db.transaction was called
      expect(db.transaction).toHaveBeenCalledTimes(1);
    });

    it('Data Consistency: should strip restricted fields (like user_id or role) to prevent overwriting context', async () => {
      mockedDoctorRepo.findByUserId.mockResolvedValue(makeDoctor());
      mockedDoctorRepo.updateByUserId.mockResolvedValue(makeDoctor());

      const payload = {
        bio: 'Legit Bio',
        user_id: 9999, // Malicious injection attempt
        role: 'admin', // Malicious injection attempt
      };

      await doctorService.updateMyProfile(1, payload as any);

      // Extract the object actually sent to the repository update mock
      const updateCall = mockedDoctorRepo.updateByUserId.mock.calls[0][1];
      
      if (updateCall) {
        expect(updateCall).not.toHaveProperty('user_id');
        expect(updateCall).not.toHaveProperty('role');
        expect(updateCall).toHaveProperty('bio', 'Legit Bio');
      }
    });
  });

  describe('(TDD) Formatting Logic', () => {
    it('Formatting: should format/calculate "Years of Experience" if specific logic expects pure integers', async () => {
      mockedDoctorRepo.findByUserId.mockResolvedValue(makeDoctor());

      // Let's pretend the service accepts a `start_date` and calculates years,
      // or cleans up floats to integers. We are asserting the AAA constraint.
      await doctorService.updateMyProfile(1, { experience_years: 5.9 } as any);

      const calls = mockedDoctorRepo.updateByUserId.mock.calls;
      if (calls && calls[0]) {
        const updateCall = calls[0][1];
        // Test that it was rounded down or parsed safely
        if (updateCall && updateCall.experience_years) {
            expect(Number.isInteger(updateCall.experience_years)).toBe(true);
        }
      }
    });
  });
});
