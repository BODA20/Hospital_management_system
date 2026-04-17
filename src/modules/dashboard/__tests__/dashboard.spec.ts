import request from 'supertest';
import { app } from '../../../../app';

// ─── 1. Mock: jsonwebtoken ────────────────────────────────────────────────────
// protect middleware calls jwt.verify() — we return a predictable payload
// so we can control req.user without a real JWT_SECRET or signed token.
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(), // configured per-test via loginAs()
}));

// ─── 2. Mock: Knex db ────────────────────────────────────────────────────────
// Dashboard queries never go through db.transaction so only the query-builder
// surface matters. Individual tests override specific methods as needed.
jest.mock('../../../config/db', () => {
  const mockDb = jest.fn() as any;
  mockDb.transaction = jest.fn().mockImplementation(async (cb: Function) => cb(mockDb));
  mockDb.fn = { now: jest.fn().mockReturnValue(new Date()) };
  mockDb.raw = jest.fn();

  // Fluent-builder chain (most dashboard repo calls form a chain like this)
  const chain: any = {};
  chain.select    = jest.fn().mockReturnValue(chain);
  chain.count     = jest.fn().mockReturnValue(chain);
  chain.where     = jest.fn().mockReturnValue(chain);
  chain.andWhere  = jest.fn().mockReturnValue(chain);
  chain.whereIn   = jest.fn().mockReturnValue(chain);
  chain.whereRaw  = jest.fn().mockReturnValue(chain);
  chain.join      = jest.fn().mockReturnValue(chain);
  chain.groupBy   = jest.fn().mockReturnValue(chain);
  chain.orderBy   = jest.fn().mockReturnValue(chain);
  chain.limit     = jest.fn().mockReturnValue(chain);
  chain.first     = jest.fn().mockResolvedValue(null);
  // Default resolution — individual tests override per use-case
  chain.then = (resolve: Function) => Promise.resolve([]).then(resolve as any);

  mockDb.mockReturnValue(chain);

  return { default: mockDb, __esModule: true };
});

// ─── 3. Mock: Dashboard Repository ───────────────────────────────────────────
// Every public export of the repo module is replaced with a jest.fn() stub.
// Tests configure return values in beforeEach / individual test bodies.
jest.mock('../repositories/dashboard.repository', () => ({
  getGlobalStats:              jest.fn(),
  getRevenueForRange:          jest.fn(),
  getPatientCountForRange:     jest.fn(),
  getAppointmentCountForRange: jest.fn(),
  getTopDoctors:               jest.fn(),
  getDailyBreakdown:           jest.fn(),
}));

// ─── 4. Mock: Users Repository (needed by protect middleware) ─────────────────
jest.mock('../../users/repositories/user.repo', () => ({
  findUserByEmail:          jest.fn(),
  findUserById:             jest.fn(),
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

// ─── 5. Mock: Session + Refresh-Token Repos (protect middleware walks these) ──
jest.mock('../../auth/services/session.service', () => ({
  createSession:        jest.fn(),
  validateSession:      jest.fn(),
  rotateSession:        jest.fn(),
  revokeSession:        jest.fn(),
  revokeAllUserSessions: jest.fn(),
}));

jest.mock('../../auth/repositories/refreshToken.repo', () => ({
  createToken:          jest.fn(),
  findTokenByHash:      jest.fn(),
  findTokenById:        jest.fn(),
  revokeToken:          jest.fn(),
  replaceToken:         jest.fn(),
  revokeUserTokens:     jest.fn(),
  deleteExpiredTokens:  jest.fn(),
}));

// ─── 6. Mock: Email utility ───────────────────────────────────────────────────
jest.mock('../../../common/utils/email', () => ({
  Email: jest.fn().mockImplementation(() => ({
    sendPasswordReset:            jest.fn().mockResolvedValue(undefined),
    sendEmailChangeVerification:  jest.fn().mockResolvedValue(undefined),
  })),
}));

// ─── Typed imports (resolved AFTER jest.mock hoisting) ───────────────────────
import jwt from 'jsonwebtoken';
import * as usersRepo     from '../../users/repositories/user.repo';
import * as dashboardRepo from '../repositories/dashboard.repository';

// Pure utility functions under test (no HTTP, no mocking needed)
import {
  calcPercentageChange,
  resolveDateRange,
  formatGrowth,
  eachDay,
} from '../dashboard.utils';

// Typed mock helpers
const mockedJwt           = jwt          as jest.Mocked<typeof jwt>;
const mockedUsersRepo     = usersRepo    as jest.Mocked<typeof usersRepo>;
const mockedDashboardRepo = dashboardRepo as jest.Mocked<typeof dashboardRepo>;

// ═══════════════════════════════════════════════════════════════════════════════
// 🏭  Test Data Factories
// ═══════════════════════════════════════════════════════════════════════════════

/** ⏱  Fixed date anchor — prevents flaky tests that depend on "today" */
const FIXED_DATE = new Date('2025-06-15T00:00:00.000Z');

/** Factory: minimal User record */
const makeUser = (overrides: Partial<Record<string, any>> = {}) => ({
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

/** Factory: admin user */
const makeAdmin = (overrides: Partial<Record<string, any>> = {}) =>
  makeUser({ id: 1, full_name: 'Hospital Admin', email: 'admin@hospital.com', role: 'admin', ...overrides });

/** Factory: staff (nurse/doctor) user */
const makeStaff = (role: 'doctor' | 'nurse', overrides: Partial<Record<string, any>> = {}) =>
  makeUser({ id: 20, role, email: `${role}@hospital.com`, ...overrides });

/** Factory: complete global stats repo response */
const makeGlobalStats = (overrides: Partial<Record<string, any>> = {}) => ({
  total_patients:      42,
  total_doctors:       8,
  today_appointments:  10,
  today_attended:      7,
  dept_activity: [
    { department: 'Cardiology', code: 'CARD', appointment_count: 4 },
    { department: 'Neurology',  code: 'NEUR', appointment_count: 3 },
  ],
  ...overrides,
});

/** Factory: complete comparative stats repo responses */
const makeStatsRepoDefaults = () => ({
  currentRevenue:       5000,
  previousRevenue:      4000,
  currentPatients:      20,
  previousPatients:     10,
  currentAppointments:  15,
  previousAppointments: 12,
  topDoctors: [
    { id: 1, name: 'Dr. Smith', visitCount: 8 },
    { id: 2, name: 'Dr. Jones', visitCount: 5 },
  ],
  chartData: [
    { date: '2025-06-01', revenue: 500, patients: 2, appointments: 3 },
    { date: '2025-06-02', revenue: 750, patients: 3, appointments: 4 },
  ],
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🔑  Auth Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configures jwt.verify mock so protect middleware hydrates req.user correctly.
 * Uses a timestamp slightly in the past for iat to prevent "token not yet valid".
 */
const loginAs = (user: ReturnType<typeof makeUser>) => {
  (mockedJwt.verify as jest.Mock).mockReturnValue({
    id:   user.id,
    role: user.role,
    iat:  Math.floor(Date.now() / 1000) - 10,
    exp:  Math.floor(Date.now() / 1000) + 3600,
  });
  mockedUsersRepo.findUserById.mockResolvedValue(user as any);
};

/** Bearer header (value is irrelevant — jwt.verify is mocked) */
const bearerHeader = () => ({ Authorization: 'Bearer mock_token_value' });

/**
 * Configure all dashboard repo mocks for the "happy path" comparative stats call.
 * Accepts partial overrides for individual metrics.
 */
const setupStatsRepoMocks = (overrides: Partial<ReturnType<typeof makeStatsRepoDefaults>> = {}) => {
  const defaults = makeStatsRepoDefaults();
  const data = { ...defaults, ...overrides };

  mockedDashboardRepo.getRevenueForRange
    .mockResolvedValueOnce(data.currentRevenue)
    .mockResolvedValueOnce(data.previousRevenue);
  mockedDashboardRepo.getPatientCountForRange
    .mockResolvedValueOnce(data.currentPatients)
    .mockResolvedValueOnce(data.previousPatients);
  mockedDashboardRepo.getAppointmentCountForRange
    .mockResolvedValueOnce(data.currentAppointments)
    .mockResolvedValueOnce(data.previousAppointments);
  mockedDashboardRepo.getTopDoctors.mockResolvedValue(data.topDoctors as any);
  mockedDashboardRepo.getDailyBreakdown.mockResolvedValue(data.chartData as any);
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  GET /api/v1/dashboard/admin-summary
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/dashboard/admin-summary', () => {
  // ─── ✅ Success: Admin receives global stats ───────────────────────────────
  describe('✅ Success — admin retrieves global summary', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(makeGlobalStats());
    });

    it('should return 200 OK with status "success"', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should return data.counts with total_patients and total_doctors fields', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      const counts = res.body.data.counts;
      expect(counts).toBeDefined();
      expect(counts.total_patients).toBe(42);
      expect(counts.total_doctors).toBe(8);
    });

    it('should return data.counts with today_appointments and today_attended', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      const counts = res.body.data.counts;
      expect(counts.today_appointments).toBe(10);
      expect(counts.today_attended).toBe(7);
    });

    it('should compute today_missed as the difference (appointments − attended)', async () => {
      // Arrange: 10 appointments, 7 attended → 3 missed
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert — service-level derived calculation
      expect(res.body.data.counts.today_missed).toBe(3);
    });

    it('should compute a correct attendance_percentage (70%)', async () => {
      // Arrange: 7/10 → 70%
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      expect(res.body.data.analytics.attendance_percentage).toBe(70);
    });

    it('should include dept_activity as an array with numeric appointment_count', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      const { dept_activity } = res.body.data.analytics;
      expect(Array.isArray(dept_activity)).toBe(true);
      expect(dept_activity[0].appointment_count).toBe(4);
      expect(typeof dept_activity[0].appointment_count).toBe('number');
    });

    it('should call getGlobalStats exactly once', async () => {
      // Act
      await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      expect(mockedDashboardRepo.getGlobalStats).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 🔢 Edge Case: Zero appointments (attendance = 0%, no division by zero) ─
  describe('🔢 Edge Case — zero appointments today (division-by-zero guard)', () => {
    it('should return attendance_percentage of 0 when today_appointments is 0', async () => {
      // Arrange
      loginAs(makeAdmin());
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 0, today_attended: 0 }),
      );

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert — must return 0, NOT NaN / Infinity
      expect(res.status).toBe(200);
      expect(res.body.data.analytics.attendance_percentage).toBe(0);
    });

    it('should clamp today_missed at 0 even if attended > appointments (data anomaly)', async () => {
      // Arrange: attended (5) > appointments (3) — anomalous but must not go negative
      loginAs(makeAdmin());
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 3, today_attended: 5 }),
      );

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert — Math.max(0, …) guard in service
      expect(res.body.data.counts.today_missed).toBe(0);
    });
  });

  // ─── 🔢 Edge Case: Empty DB (no patients, no doctors) ──────────────────────
  describe('🔢 Edge Case — empty database', () => {
    it('should return 0 for all counts, not null or undefined', async () => {
      // Arrange
      loginAs(makeAdmin());
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({
          total_patients:     0,
          total_doctors:      0,
          today_appointments: 0,
          today_attended:     0,
          dept_activity:      [],
        }),
      );

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert — every numeric field is a real 0, never falsy-null
      const { counts, analytics } = res.body.data;
      expect(counts.total_patients).toBe(0);
      expect(counts.total_doctors).toBe(0);
      expect(counts.today_appointments).toBe(0);
      expect(counts.today_attended).toBe(0);
      expect(counts.today_missed).toBe(0);
      expect(analytics.attendance_percentage).toBe(0);
      expect(analytics.dept_activity).toEqual([]);
    });
  });

  // ─── 🔒 RBAC: Access Control ──────────────────────────────────────────────
  describe('🔒 RBAC — only admin can access the summary', () => {
    it('should return 403 Forbidden when a Patient requests the summary', async () => {
      // Arrange
      loginAs(makeUser({ role: 'patient' }));

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('should return 403 Forbidden when a Doctor requests the summary', async () => {
      // Arrange
      loginAs(makeStaff('doctor'));

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when a Nurse requests the summary', async () => {
      // Arrange
      loginAs(makeStaff('nurse'));

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
    });

    it('should NOT call getGlobalStats when a non-admin is forbidden', async () => {
      // Arrange
      loginAs(makeUser({ role: 'patient' }));

      // Act
      await request(app)
        .get('/api/v1/dashboard/admin-summary')
        .set(bearerHeader());

      // Assert — restrictTo() guard fires before any repo call
      expect(mockedDashboardRepo.getGlobalStats).not.toHaveBeenCalled();
    });

    it('should return 401 Unauthorized when no Authorization header is present', async () => {
      // Act — no .set(bearerHeader())
      const res = await request(app).get('/api/v1/dashboard/admin-summary');

      // Assert
      expect(res.status).toBe(401);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  GET /api/v1/dashboard/stats
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/dashboard/stats', () => {

  // ─── ✅ Success: Default (no query params → period=today) ──────────────────
  describe('✅ Success — no query params defaults to period=today', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks();
    });

    it('should return 200 OK with status "success"', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should include period, summary, topDoctors and chartData in the response', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — top-level response shape
      const { data } = res.body;
      expect(data).toHaveProperty('period');
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('topDoctors');
      expect(data).toHaveProperty('chartData');
    });

    it('should include revenue, patients and appointments inside summary', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      const { summary } = res.body.data;
      expect(summary).toHaveProperty('revenue');
      expect(summary).toHaveProperty('patients');
      expect(summary).toHaveProperty('appointments');
    });

    it('should include current, previous, change and growth inside each summary metric', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      const { revenue } = res.body.data.summary;
      expect(revenue).toHaveProperty('current');
      expect(revenue).toHaveProperty('previous');
      expect(revenue).toHaveProperty('change');
      expect(revenue).toHaveProperty('growth');
    });

    it('should compute correct revenue growth: ((5000-4000)/4000)*100 = 25%', async () => {
      // Arrange — see beforeEach (current=5000, previous=4000)

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — exact percentage
      expect(res.body.data.summary.revenue.change).toBe(25);
      expect(res.body.data.summary.revenue.growth).toBe('+25%');
    });

    it('should compute correct patients growth: ((20-10)/10)*100 = 100%', async () => {
      // Arrange — see beforeEach (current=20, previous=10)

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      expect(res.body.data.summary.patients.change).toBe(100);
      expect(res.body.data.summary.patients.growth).toBe('+100%');
    });

    it('should return topDoctors as an array', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      expect(Array.isArray(res.body.data.topDoctors)).toBe(true);
      expect(res.body.data.topDoctors).toHaveLength(2);
    });

    it('should return chartData as an array with date, revenue, patients and appointments', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      const firstPoint = res.body.data.chartData[0];
      expect(firstPoint).toHaveProperty('date');
      expect(firstPoint).toHaveProperty('revenue');
      expect(firstPoint).toHaveProperty('patients');
      expect(firstPoint).toHaveProperty('appointments');
    });
  });

  // ─── ✅ Success: ?period=week ──────────────────────────────────────────────
  describe('✅ Success — ?period=week', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks();
    });

    it('should return 200 OK and include a "week" label in period', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats?period=week')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.period.label).toBe('This Week');
    });
  });

  // ─── ✅ Success: ?period=month ─────────────────────────────────────────────
  describe('✅ Success — ?period=month', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks();
    });

    it('should return 200 OK and include "month" label in period', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats?period=month')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.period.label).toBe('This Month');
    });
  });

  // ─── ✅ Success: ?period=year ──────────────────────────────────────────────
  describe('✅ Success — ?period=year', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks();
    });

    it('should return 200 OK and include "year" label in period', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats?period=year')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
      expect(res.body.data.period.label).toBe('This Year');
    });
  });

  // ─── ✅ Success: Custom date range (?startDate=…&endDate=…) ───────────────
  describe('✅ Success — custom date range with ?startDate & ?endDate', () => {
    const START = '2025-01-01';
    const END   = '2025-01-31';

    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks();
    });

    it('should return 200 OK when valid startDate and endDate are supplied', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/dashboard/stats?startDate=${START}&endDate=${END}`)
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(200);
    });

    it('should forward startDate and endDate to the repo calls (date range filtering)', async () => {
      // Act
      await request(app)
        .get(`/api/v1/dashboard/stats?startDate=${START}&endDate=${END}`)
        .set(bearerHeader());

      // Assert — each "current" repo call must receive exactly START and END
      expect(mockedDashboardRepo.getRevenueForRange).toHaveBeenCalledWith(
        START, END,
      );
      expect(mockedDashboardRepo.getPatientCountForRange).toHaveBeenCalledWith(
        START, END,
      );
      expect(mockedDashboardRepo.getAppointmentCountForRange).toHaveBeenCalledWith(
        START, END,
      );
      expect(mockedDashboardRepo.getDailyBreakdown).toHaveBeenCalledWith(
        START, END,
      );
    });

    it('should compute a "previous" range that ends the day BEFORE startDate', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/dashboard/stats?startDate=${START}&endDate=${END}`)
        .set(bearerHeader());

      // Assert: previous.end must be 2024-12-31 (day before 2025-01-01)
      expect(res.body.data.period.previous.end).toBe('2024-12-31');
    });

    it('should show the custom date range label in period.label', async () => {
      // Act
      const res = await request(app)
        .get(`/api/v1/dashboard/stats?startDate=${START}&endDate=${END}`)
        .set(bearerHeader());

      // Assert
      expect(res.body.data.period.label).toBe(`${START} – ${END}`);
    });
  });

  // ─── ❌ Failure: Invalid query params ─────────────────────────────────────
  describe('❌ Failure — invalid query parameters rejected by Zod', () => {
    beforeEach(() => loginAs(makeAdmin()));

    it('should return 400 when period is an invalid enum value', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats?period=quarterly')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('fail');
    });

    it('should return 400 when startDate is supplied without endDate', async () => {
      // Act — Zod refine: both dates must be present
      const res = await request(app)
        .get('/api/v1/dashboard/stats?startDate=2025-01-01')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(400);
    });

    it('should return 400 when endDate is supplied without startDate', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats?endDate=2025-01-31')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(400);
    });

    it('should return 400 when endDate is before startDate', async () => {
      // Act — Zod refine: endDate >= startDate
      const res = await request(app)
        .get('/api/v1/dashboard/stats?startDate=2025-03-01&endDate=2025-01-01')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(400);
    });

    it('should return 400 when date format does not match YYYY-MM-DD', async () => {
      // Act — regex check
      const res = await request(app)
        .get('/api/v1/dashboard/stats?startDate=01-01-2025&endDate=01-31-2025')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(400);
    });

    it('should NOT call any repo method when query params are invalid', async () => {
      // Act
      await request(app)
        .get('/api/v1/dashboard/stats?period=bad')
        .set(bearerHeader());

      // Assert — validateQuery middleware blocks before service/repo
      expect(mockedDashboardRepo.getRevenueForRange).not.toHaveBeenCalled();
      expect(mockedDashboardRepo.getPatientCountForRange).not.toHaveBeenCalled();
    });
  });

  // ─── 🔒 RBAC: Access Control ──────────────────────────────────────────────
  describe('🔒 RBAC — only admin can access /stats', () => {
    it('should return 403 Forbidden when a Patient calls /stats', async () => {
      // Arrange
      loginAs(makeUser({ role: 'patient' }));

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/permission/i);
    });

    it('should return 403 Forbidden when a Doctor calls /stats', async () => {
      // Arrange
      loginAs(makeStaff('doctor'));

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when a Nurse calls /stats', async () => {
      // Arrange
      loginAs(makeStaff('nurse'));

      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      expect(res.status).toBe(403);
    });

    it('should NOT invoke any repo when a non-admin role is forbidden', async () => {
      // Arrange
      loginAs(makeUser({ role: 'patient' }));

      // Act
      await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — restrictTo() halts the pipeline before the service
      expect(mockedDashboardRepo.getRevenueForRange).not.toHaveBeenCalled();
      expect(mockedDashboardRepo.getDailyBreakdown).not.toHaveBeenCalled();
    });

    it('should return 401 Unauthorized when no token is provided', async () => {
      // Act — no auth header
      const res = await request(app).get('/api/v1/dashboard/stats');

      // Assert
      expect(res.status).toBe(401);
    });
  });

  // ─── 🔢 Edge Case: Empty data (all repos return 0 / []) ───────────────────
  describe('🔢 Edge Case — empty database (all metrics are 0)', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks({
        currentRevenue:       0,
        previousRevenue:      0,
        currentPatients:      0,
        previousPatients:     0,
        currentAppointments:  0,
        previousAppointments: 0,
        topDoctors:           [],
        chartData:            [],
      });
    });

    it('should return 0 for all current values, not null or undefined', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      const { summary } = res.body.data;
      expect(summary.revenue.current).toBe(0);
      expect(summary.patients.current).toBe(0);
      expect(summary.appointments.current).toBe(0);
    });

    it('should return 0% growth when both current and previous are 0', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — calcPercentageChange(0, 0) must return 0, not NaN/Infinity
      expect(res.body.data.summary.revenue.change).toBe(0);
      expect(res.body.data.summary.patients.change).toBe(0);
      expect(res.body.data.summary.appointments.change).toBe(0);
    });

    it('should return empty arrays for topDoctors and chartData', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert
      expect(res.body.data.topDoctors).toEqual([]);
      expect(res.body.data.chartData).toEqual([]);
    });
  });

  // ─── 🔢 Edge Case: Previous = 0 but current > 0 (division-by-zero risk) ───
  describe('🔢 Edge Case — previous is 0 but current > 0 (growth from nothing)', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks({
        currentRevenue:       1000,
        previousRevenue:      0,      // ← the dangerous denominator
        currentPatients:      5,
        previousPatients:     0,
        currentAppointments:  3,
        previousAppointments: 0,
      });
    });

    it('should return +100% growth when previous is 0 and current > 0 (no crash)', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — must be exactly 100, NOT Infinity or NaN
      expect(res.status).toBe(200);
      expect(res.body.data.summary.revenue.change).toBe(100);
      expect(res.body.data.summary.patients.change).toBe(100);
      expect(res.body.data.summary.appointments.change).toBe(100);
    });

    it('should not contain Infinity or NaN in the response body', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — JSON.stringify would turn Infinity to null; a valid parse means no Infinity
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toMatch(/Infinity/);
      expect(bodyStr).not.toMatch(/NaN/);
    });
  });

  // ─── 🔢 Edge Case: Current = 0 but previous > 0 (decline to zero) ─────────
  describe('🔢 Edge Case — current is 0 but previous > 0 (full decline)', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks({
        currentRevenue:   0,
        previousRevenue:  4000,
      });
    });

    it('should return exactly -100% growth when current is 0', async () => {
      // Act
      const res = await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — ((0 - 4000) / 4000) * 100 = -100
      expect(res.body.data.summary.revenue.change).toBe(-100);
      expect(res.body.data.summary.revenue.growth).toBe('-100%');
    });
  });

  // ─── 🔢 Parallel Repo Calls Verification ─────────────────────────────────
  describe('🔢 Implementation — all repo calls execute in parallel', () => {
    it('should call all 8 repo functions (4 current + 4 previous/shared) for each request', async () => {
      // Arrange
      loginAs(makeAdmin());
      setupStatsRepoMocks();

      // Act
      await request(app)
        .get('/api/v1/dashboard/stats')
        .set(bearerHeader());

      // Assert — service calls Promise.all([...8 promises])
      // getRevenueForRange: 2 calls (current + previous)
      expect(mockedDashboardRepo.getRevenueForRange).toHaveBeenCalledTimes(2);
      // getPatientCountForRange: 2 calls
      expect(mockedDashboardRepo.getPatientCountForRange).toHaveBeenCalledTimes(2);
      // getAppointmentCountForRange: 2 calls
      expect(mockedDashboardRepo.getAppointmentCountForRange).toHaveBeenCalledTimes(2);
      // top doctors: 1 call (current only)
      expect(mockedDashboardRepo.getTopDoctors).toHaveBeenCalledTimes(1);
      // chart data: 1 call (current only)
      expect(mockedDashboardRepo.getDailyBreakdown).toHaveBeenCalledTimes(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — calcPercentageChange() (The Growth Rate Math)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: calcPercentageChange(current, previous)', () => {

  // ─── ✅ Standard formula: ((M - N) / N) * 100 ─────────────────────────────
  describe('✅ Standard percentage-change formula', () => {
    it('should return 25 for (5000, 4000) — 25% revenue growth', () => {
      expect(calcPercentageChange(5000, 4000)).toBe(25);
    });

    it('should return -50 for (50, 100) — 50% decline', () => {
      expect(calcPercentageChange(50, 100)).toBe(-50);
    });

    it('should return 0 for (100, 100) — no change', () => {
      expect(calcPercentageChange(100, 100)).toBe(0);
    });

    it('should return 100 for (200, 100) — doubling', () => {
      expect(calcPercentageChange(200, 100)).toBe(100);
    });

    it('should round decimal results to 2 places', () => {
      // ((7 - 3) / 3) * 100 = 133.333... → 133.33
      expect(calcPercentageChange(7, 3)).toBe(133.33);
    });
  });

  // ─── 💥 Edge Cases: Division by Zero ──────────────────────────────────────
  describe('💥 Edge Cases — division by zero (previous = 0)', () => {
    it('should return 0 when both current and previous are 0 (no activity)', () => {
      // Critical: 0/0 must return 0, not NaN or Infinity
      const result = calcPercentageChange(0, 0);
      expect(result).toBe(0);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should return 100 when previous is 0 but current > 0 (new growth)', () => {
      // Critical: N/0 must return 100 (defined convention), not Infinity
      const result = calcPercentageChange(500, 0);
      expect(result).toBe(100);
      expect(Number.isFinite(result)).toBe(true);
    });

    it('should NEVER return Infinity', () => {
      // This is the core safety invariant
      expect(calcPercentageChange(999, 0)).not.toBe(Infinity);
      expect(calcPercentageChange(1, 0)).not.toBe(Infinity);
    });

    it('should NEVER return NaN', () => {
      expect(Number.isNaN(calcPercentageChange(0, 0))).toBe(false);
    });

    it('should return -100 when current is 0 but previous > 0 (total loss)', () => {
      expect(calcPercentageChange(0, 100)).toBe(-100);
    });
  });

  // ─── 🔢 Type Safety ───────────────────────────────────────────────────────
  describe('🔢 Type Safety — always returns a finite number', () => {
    it('should always return a finite number for any valid input', () => {
      const cases: [number, number][] = [
        [0, 0], [1, 0], [0, 1], [100, 200], [999, 1], [1, 999],
      ];
      for (const [cur, prev] of cases) {
        const result = calcPercentageChange(cur, prev);
        expect(Number.isFinite(result)).toBe(true);
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — formatGrowth()
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: formatGrowth(pct)', () => {
  it('should prepend "+" for positive values', () => {
    expect(formatGrowth(25)).toBe('+25%');
  });

  it('should NOT prepend "+" for negative values (they already have minus)', () => {
    expect(formatGrowth(-10)).toBe('-10%');
  });

  it('should NOT prepend "+" for zero', () => {
    expect(formatGrowth(0)).toBe('0%');
  });

  it('should preserve decimal precision from calcPercentageChange output', () => {
    expect(formatGrowth(133.33)).toBe('+133.33%');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — resolveDateRange() (Time-Insensitive / Fixed-Date)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: resolveDateRange(params)', () => {

  // ─── Custom Range ──────────────────────────────────────────────────────────
  describe('Custom date range (startDate + endDate)', () => {
    it('should set current.start and current.end to the supplied dates', () => {
      // Arrange — fixed dates prevent test flakiness
      const range = resolveDateRange({
        startDate: '2025-01-01',
        endDate:   '2025-01-31',
      });

      // Assert
      expect(range.current.start).toBe('2025-01-01');
      expect(range.current.end).toBe('2025-01-31');
    });

    it('should set previous.end to the day BEFORE startDate', () => {
      const range = resolveDateRange({
        startDate: '2025-01-01',
        endDate:   '2025-01-31',
      });

      // Assert — previous window ends on 2024-12-31
      expect(range.previous.end).toBe('2024-12-31');
    });

    it('should make the previous window the same length as the current window', () => {
      // 31-day window → previous should also be 31 days
      const range = resolveDateRange({
        startDate: '2025-01-01',
        endDate:   '2025-01-31',
      });

      const currentMs =
        new Date(range.current.end).getTime() - new Date(range.current.start).getTime();
      const previousMs =
        new Date(range.previous.end).getTime() - new Date(range.previous.start).getTime();

      expect(currentMs).toBe(previousMs);
    });

    it('should format the label as "startDate – endDate"', () => {
      const range = resolveDateRange({
        startDate: '2025-06-01',
        endDate:   '2025-06-15',
      });
      expect(range.label).toBe('2025-06-01 – 2025-06-15');
    });
  });

  // ─── Period: today ─────────────────────────────────────────────────────────
  describe('period = "today"', () => {
    it('should set label to "Today"', () => {
      const range = resolveDateRange({ period: 'today' });
      expect(range.label).toBe('Today');
    });

    it('should have current.start === current.end (single-day window)', () => {
      const range = resolveDateRange({ period: 'today' });
      expect(range.current.start).toBe(range.current.end);
    });

    it('should have previous.start === previous.end (single-day yesterday)', () => {
      const range = resolveDateRange({ period: 'today' });
      expect(range.previous.start).toBe(range.previous.end);
    });

    it('should have previous.end exactly 1 day before current.start', () => {
      const range = resolveDateRange({ period: 'today' });
      const currentStart  = new Date(range.current.start).getTime();
      const previousEnd   = new Date(range.previous.end).getTime();
      const diff = (currentStart - previousEnd) / 86_400_000;
      expect(diff).toBe(1);
    });
  });

  // ─── Period: week ──────────────────────────────────────────────────────────
  describe('period = "week"', () => {
    it('should set label to "This Week"', () => {
      const range = resolveDateRange({ period: 'week' });
      expect(range.label).toBe('This Week');
    });

    it('should have current.start on a Monday (ISO week)', () => {
      const range = resolveDateRange({ period: 'week' });
      // Day 1 = Monday in JS getDay() where 0=Sunday
      const dow = new Date(range.current.start).getDay();
      expect(dow).toBe(1);
    });

    it('should have previous.end exactly 1 day before current.start', () => {
      const range = resolveDateRange({ period: 'week' });
      const currentStart = new Date(range.current.start).getTime();
      const previousEnd  = new Date(range.previous.end).getTime();
      const diff = (currentStart - previousEnd) / 86_400_000;
      expect(diff).toBe(1);
    });
  });

  // ─── Period: month ─────────────────────────────────────────────────────────
  describe('period = "month"', () => {
    it('should set label to "This Month"', () => {
      const range = resolveDateRange({ period: 'month' });
      expect(range.label).toBe('This Month');
    });

    it('should have current.start on the first day of the current month', () => {
      const range = resolveDateRange({ period: 'month' });
      expect(range.current.start).toMatch(/-01$/); // ends with -01
    });
  });

  // ─── Period: year ──────────────────────────────────────────────────────────
  describe('period = "year"', () => {
    it('should set label to "This Year"', () => {
      const range = resolveDateRange({ period: 'year' });
      expect(range.label).toBe('This Year');
    });

    it('should have current.start on January 1st of the current year', () => {
      const range = resolveDateRange({ period: 'year' });
      const thisYear = new Date().getFullYear();
      expect(range.current.start).toBe(`${thisYear}-01-01`);
    });

    it('should have previous.start on January 1st of the previous year', () => {
      const range = resolveDateRange({ period: 'year' });
      const prevYear = new Date().getFullYear() - 1;
      expect(range.previous.start).toBe(`${prevYear}-01-01`);
    });

    it('should have previous.end on December 31st of the previous year', () => {
      const range = resolveDateRange({ period: 'year' });
      const prevYear = new Date().getFullYear() - 1;
      expect(range.previous.end).toBe(`${prevYear}-12-31`);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — eachDay()
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: eachDay(start, end)', () => {
  it('should return a single-element array when start === end', () => {
    expect(eachDay('2025-06-15', '2025-06-15')).toEqual(['2025-06-15']);
  });

  it('should return 3 days for a 3-day window', () => {
    const days = eachDay('2025-06-01', '2025-06-03');
    expect(days).toEqual(['2025-06-01', '2025-06-02', '2025-06-03']);
    expect(days).toHaveLength(3);
  });

  it('should return exactly 31 days for a full month (January)', () => {
    const days = eachDay('2025-01-01', '2025-01-31');
    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2025-01-01');
    expect(days[30]).toBe('2025-01-31');
  });

  it('should correctly handle leap-year February (29 days in 2024)', () => {
    const days = eachDay('2024-02-01', '2024-02-29');
    expect(days).toHaveLength(29);
    expect(days[28]).toBe('2024-02-29');
  });

  it('should return dates in ascending chronological order', () => {
    const days = eachDay('2025-03-28', '2025-04-02');
    expect(days).toEqual([
      '2025-03-28', '2025-03-29', '2025-03-30', '2025-03-31',
      '2025-04-01', '2025-04-02',
    ]);
  });

  it('should format each entry as YYYY-MM-DD', () => {
    const days = eachDay('2025-12-30', '2025-12-31');
    for (const d of days) {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 🧪  Unit Tests — dashboardService.getStats() (Direct Service Call)
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unit: dashboardService.getStats(query)', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dashboardService = require('../services/dashboard.service');

  describe('Growth Calculations (verified at service level)', () => {
    it('should return the correct growth formula result for revenue', async () => {
      // Arrange — current=150, previous=100 → 50%
      mockedDashboardRepo.getRevenueForRange
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(100);
      mockedDashboardRepo.getPatientCountForRange.mockResolvedValue(0);
      mockedDashboardRepo.getAppointmentCountForRange.mockResolvedValue(0);
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getStats({ period: 'today' });

      // Assert — ((150 - 100) / 100) * 100 = 50
      expect(result.summary.revenue.change).toBe(50);
      expect(result.summary.revenue.growth).toBe('+50%');
    });

    it('should not crash when ALL previous values are 0 (full zero-guard)', async () => {
      // Arrange
      mockedDashboardRepo.getRevenueForRange
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(0);
      mockedDashboardRepo.getPatientCountForRange
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(0);
      mockedDashboardRepo.getAppointmentCountForRange
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      // Act + Assert — must NOT throw
      const result = await dashboardService.getStats({ period: 'today' });
      expect(result.summary.revenue.change).toBe(100);
      expect(result.summary.patients.change).toBe(100);
      expect(result.summary.appointments.change).toBe(100);
    });

    it('should include both current and previous windows in period', async () => {
      // Arrange
      mockedDashboardRepo.getRevenueForRange.mockResolvedValue(0);
      mockedDashboardRepo.getPatientCountForRange.mockResolvedValue(0);
      mockedDashboardRepo.getAppointmentCountForRange.mockResolvedValue(0);
      mockedDashboardRepo.getTopDoctors.mockResolvedValue([]);
      mockedDashboardRepo.getDailyBreakdown.mockResolvedValue([]);

      // Act
      const result = await dashboardService.getStats({ period: 'today' });

      // Assert — period window is always present
      expect(result.period).toHaveProperty('label');
      expect(result.period).toHaveProperty('current');
      expect(result.period).toHaveProperty('previous');
      expect(result.period.current).toHaveProperty('start');
      expect(result.period.current).toHaveProperty('end');
    });
  });

  describe('getAdminSummary() — service unit path', () => {
    it('should compute today_missed as the difference (appointments − attended)', async () => {
      // Arrange
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 8, today_attended: 5 }),
      );

      // Act
      const result = await dashboardService.getAdminSummary();

      // Assert
      expect(result.counts.today_missed).toBe(3);
    });

    it('should compute attendance_percentage correctly', async () => {
      // Arrange: 6 attended / 8 appointments = 75%
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({ today_appointments: 8, today_attended: 6 }),
      );

      // Act
      const result = await dashboardService.getAdminSummary();

      // Assert
      expect(result.analytics.attendance_percentage).toBe(75);
    });

    it('should return appointment_count as a number (not string) in dept_activity', async () => {
      // Arrange
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(
        makeGlobalStats({
          dept_activity: [
            { department: 'Cardiology', code: 'CARD', appointment_count: '6' }, // DB returns string
          ],
        }),
      );

      // Act
      const result = await dashboardService.getAdminSummary();

      // Assert — service must coerce via Number()
      expect(typeof result.analytics.dept_activity[0].appointment_count).toBe('number');
      expect(result.analytics.dept_activity[0].appointment_count).toBe(6);
    });
  });
});
