import request from 'supertest';
import { bearerHeader, loginAs } from '../mocks/jwt.mock';
import { makeUser, makeAdmin, makeStaff } from '../mocks/usersRepo.mock';
import { mockedDashboardRepo, makeGlobalStats, setupStatsRepoMocks } from '../mocks/dashboardRepo.mock';
import { app } from '../../app';

const getAdminSummary = () =>
  request(app)
    .get('/api/v1/dashboard/admin-summary')
    .set(bearerHeader());

const getStats = (query = '') =>
  request(app)
    .get(`/api/v1/dashboard/stats${query}`)
    .set(bearerHeader());

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  GET /api/v1/dashboard/admin-summary
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/dashboard/admin-summary', () => {
  describe('✅ Success — Admin retrieves global summary', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      mockedDashboardRepo.getGlobalStats.mockResolvedValue(makeGlobalStats());
    });

    it('[HTTP] Returns 200 OK with status "success"', async () => {
      const res = await getAdminSummary();
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('[Shape] Returns a valid response structure', async () => {
      const res = await getAdminSummary();
      const { counts, analytics } = res.body.data;
      
      expect(typeof counts.total_patients).toBe('number');
      expect(typeof counts.total_doctors).toBe('number');
      expect(typeof counts.today_appointments).toBe('number');
      expect(typeof counts.today_attended).toBe('number');
      expect(typeof counts.today_missed).toBe('number');
      
      expect(typeof analytics.attendance_percentage).toBe('number');
      expect(Array.isArray(analytics.dept_activity)).toBe(true);
      expect(typeof analytics.dept_activity[0].appointment_count).toBe('number');
    });
  });

  describe('🔒 RBAC — Authorization Rules', () => {
    it('[RBAC] Returns 403 Forbidden when a Patient requests the summary', async () => {
      loginAs(makeUser({ role: 'patient' }));
      const res = await getAdminSummary();
      expect(res.status).toBe(403);
    });

    it('[RBAC] Returns 403 Forbidden when a Doctor requests the summary', async () => {
      loginAs(makeStaff('doctor'));
      const res = await getAdminSummary();
      expect(res.status).toBe(403);
    });

    it('[RBAC] Returns 403 Forbidden when a Nurse requests the summary', async () => {
      loginAs(makeStaff('nurse'));
      const res = await getAdminSummary();
      expect(res.status).toBe(403);
    });

    it('[Auth] Returns 401 Unauthorized when no Authorization header is present', async () => {
      const res = await request(app).get('/api/v1/dashboard/admin-summary');
      expect(res.status).toBe(401);
    });
  });

  describe('❌ Server Error', () => {
    it('[Error] Returns 500 when repository fails', async () => {
      loginAs(makeAdmin());
      mockedDashboardRepo.getGlobalStats.mockRejectedValue(new Error('DB error'));

      const res = await getAdminSummary();
      
      expect(res.status).toBe(500);
      expect(res.body.status).toBe('error');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  GET /api/v1/dashboard/stats
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/dashboard/stats', () => {
  describe('✅ Success — Default and valid queries', () => {
    beforeEach(() => {
      loginAs(makeAdmin());
      setupStatsRepoMocks();
    });

    it('[HTTP] Returns 200 OK with status "success"', async () => {
      const res = await getStats();
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('[Shape] Returns a valid response structure', async () => {
      const res = await getStats();
      const { data } = res.body;
      
      expect(data).toHaveProperty('period');
      expect(data).toHaveProperty('summary');
      expect(Array.isArray(data.topDoctors)).toBe(true);
      expect(Array.isArray(data.chartData)).toBe(true);

      const { summary } = data;
      expect(typeof summary.revenue.current).toBe('number');
      expect(typeof summary.revenue.previous).toBe('number');
      expect(typeof summary.revenue.change).toBe('number');
      expect(typeof summary.revenue.growth).toBe('string');
      
      expect(typeof summary.patients.change).toBe('number');
      expect(typeof summary.appointments.change).toBe('number');
    });

    it('[HTTP] Returns 200 OK for valid period parameters', async () => {
      const resWeek = await getStats('?period=week');
      expect(resWeek.status).toBe(200);

      const resMonth = await getStats('?period=month');
      expect(resMonth.status).toBe(200);

      const resYear = await getStats('?period=year');
      expect(resYear.status).toBe(200);
    });

    it('[HTTP] Returns 200 OK for custom date range parameters', async () => {
      const res = await getStats(`?startDate=2025-01-01&endDate=2025-01-31`);
      expect(res.status).toBe(200);
    });
  });

  describe('❌ Request Validation Errors', () => {
    beforeEach(() => loginAs(makeAdmin()));

    it('[Validation] Returns 400 when period is an invalid enum value', async () => {
      const res = await getStats('?period=quarterly');
      expect(res.status).toBe(400);
    });

    it('[Validation] Returns 400 when startDate is supplied without endDate', async () => {
      const res = await getStats('?startDate=2025-01-01');
      expect(res.status).toBe(400);
    });

    it('[Validation] Returns 400 when endDate is supplied without startDate', async () => {
      const res = await getStats('?endDate=2025-01-31');
      expect(res.status).toBe(400);
    });

    it('[Validation] Returns 400 when endDate is before startDate', async () => {
      const res = await getStats('?startDate=2025-03-01&endDate=2025-01-01');
      expect(res.status).toBe(400);
    });

    it('[Validation] Returns 400 when date format does not match YYYY-MM-DD', async () => {
      const res = await getStats('?startDate=01-01-2025&endDate=01-31-2025');
      expect(res.status).toBe(400);
    });
  });

  describe('🔒 RBAC — Authorization Rules', () => {
    it('[RBAC] Returns 403 Forbidden when a Patient calls /stats', async () => {
      loginAs(makeUser({ role: 'patient' }));
      const res = await getStats();
      expect(res.status).toBe(403);
    });

    it('[RBAC] Returns 403 Forbidden when a Doctor calls /stats', async () => {
      loginAs(makeStaff('doctor'));
      const res = await getStats();
      expect(res.status).toBe(403);
    });

    it('[RBAC] Returns 403 Forbidden when a Nurse calls /stats', async () => {
      loginAs(makeStaff('nurse'));
      const res = await getStats();
      expect(res.status).toBe(403);
    });

    it('[Auth] Returns 401 Unauthorized when no token is provided', async () => {
      const res = await request(app).get('/api/v1/dashboard/stats');
      expect(res.status).toBe(401);
    });
  });

  describe('❌ Server Error', () => {
    it('[Error] Returns 500 when repository fails', async () => {
      loginAs(makeAdmin());
      mockedDashboardRepo.getComparativeMetrics.mockRejectedValue(new Error('DB error'));

      const res = await getStats();
      
      expect(res.status).toBe(500);
    });
  });
});

