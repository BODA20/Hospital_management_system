import request from 'supertest';
import { app } from '../../app';

// Mock Dependencies
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (callback: Function) => callback({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
  },
}));

// Mock repositories
jest.mock('../../src/modules/visits/repositories/visit.repository', () => require('../mocks/visitsRepo.mock').mockedVisitsRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/appointments/repositories/appo.repo', () => require('../mocks/appoRepo.mock').mockedAppoRepo);
jest.mock('../../src/modules/billing/services/billing.service', () => require('../mocks/billingService.mock').mockedBillingService);

// Mock Auth Middlewares to bypass checks
jest.mock('../../src/common/middleware/auth', () => ({
  protect: jest.fn().mockImplementation((req: any, _res: any, next: any) => {
    req.user = { id: 1, role: 'admin' }; // Default to admin for controller tests
    next();
  }),
  restrictTo: jest.fn().mockImplementation((...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    next();
  }),
}));

import { mockedVisitsRepo } from '../mocks/visitsRepo.mock';
import { mockedDoctorsRepo } from '../mocks/doctorsRepo.mock';
import { mockedPatientRepo } from '../mocks/patientsRepo.mock';
import { mockedAppoRepo } from '../mocks/appoRepo.mock';
import { protect, restrictTo } from '../../src/common/middleware/auth';
import { mockedBillingService } from '../mocks/billingService.mock';

// Shared Fixtures
const MOCK_VISIT_DETAIL = {
  id: 1,
  patient_id: 1,
  doctor_id: 1,
  appointment_id: 1,
  status: 'awaiting_vitals',
  check_in_at: '2024-06-01T10:00:00Z',
  chief_complaint: 'Headache',
  diagnosis: 'Pending',
  patient_name: 'John Doe',
  doctor_name: 'Dr. Smith',
};

const VALID_VISIT_BODY = {
  patient_id: 1,
  doctor_id: 1,
  appointment_id: 1,
  reason_for_visit: 'Headache',
  diagnosis: 'Migraine',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  VISITS API CONTROLLER TESTS (API Layer)
// ═══════════════════════════════════════════════════════════════════════════════
describe('VISITS API CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
  });

  describe('POST /api/v1/visits', () => {
    describe('✅ Success — valid payload', () => {
      it('should return 201 Created and success message', async () => {
        mockedPatientRepo.findById.mockResolvedValue({ id: 1 } as any);
        mockedDoctorsRepo.findById.mockResolvedValue({ id: 1 } as any);
        mockedAppoRepo.findById.mockResolvedValue({ id: 1, patient_id: 1, doctor_id: 1 } as any);
        mockedVisitsRepo.createVisit.mockResolvedValue({ id: 1 });
        mockedVisitsRepo.getVisitDetails.mockResolvedValue(MOCK_VISIT_DETAIL);

        const res = await request(app).post('/api/v1/visits').send(VALID_VISIT_BODY);
        
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toEqual(MOCK_VISIT_DETAIL);
      });
    });

    describe('❌ Failure — invalid data', () => {
      it('should return 400 when patient_id is missing', async () => {
        const res = await request(app).post('/api/v1/visits').send({ ...VALID_VISIT_BODY, patient_id: undefined });
        expect(res.status).toBe(400);
        expect(res.body.status).toBe('fail');
      });

      it('should return 400 when reason_for_visit is too short', async () => {
        const res = await request(app).post('/api/v1/visits').send({ ...VALID_VISIT_BODY, reason_for_visit: 'Hi' });
        expect(res.status).toBe(400);
      });
    });

    describe('🔒 Security — unauthorized access', () => {
      it('should return 403 when user is a patient', async () => {
        (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = { id: 1, role: 'patient' };
          next();
        });

        const res = await request(app).post('/api/v1/visits').send(VALID_VISIT_BODY);
        expect(res.status).toBe(403);
      });
    });
  });

  describe('GET /api/v1/visits', () => {
    describe('✅ Success', () => {
      it('should return 200 OK and all visits', async () => {
        mockedVisitsRepo.getAllVisits.mockResolvedValue([MOCK_VISIT_DETAIL]);
        const res = await request(app).get('/api/v1/visits');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
      });
    });
  });

  describe('GET /api/v1/visits/:id', () => {
    describe('✅ Success', () => {
      it('should return 200 OK and visit details', async () => {
        mockedVisitsRepo.getVisitDetails.mockResolvedValue(MOCK_VISIT_DETAIL);
        const res = await request(app).get('/api/v1/visits/1');
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(1);
      });
    });

    describe('❌ Failure — not found', () => {
      it('should return 404 Not Found', async () => {
        mockedVisitsRepo.getVisitDetails.mockResolvedValue(null);
        const res = await request(app).get('/api/v1/visits/999');
        expect(res.status).toBe(404);
      });
    });
  });

  describe('PATCH /api/v1/visits/:id', () => {
    describe('✅ Success', () => {
      it('should return 200 OK after update', async () => {
        mockedVisitsRepo.findRawById.mockResolvedValue({ id: 1, status: 'in_progress' });
        mockedVisitsRepo.updateVisit.mockResolvedValue({ id: 1 });
        mockedVisitsRepo.getVisitDetails.mockResolvedValue({ ...MOCK_VISIT_DETAIL, status: 'completed' });

        const res = await request(app).patch('/api/v1/visits/1').send({ status: 'completed' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('completed');
      });
    });
  });

  describe('DELETE /api/v1/visits/:id', () => {
    describe('✅ Success', () => {
      it('should return 200 OK after cancellation', async () => {
        mockedVisitsRepo.findRawById.mockResolvedValue({ id: 1, status: 'awaiting_vitals' });
        mockedVisitsRepo.updateVisit.mockResolvedValue({ id: 1 });
        const res = await request(app).delete('/api/v1/visits/1');
        expect(res.status).toBe(200);
        expect(res.body.data.message).toMatch(/cancelled/i);
      });
    });
  });
});
