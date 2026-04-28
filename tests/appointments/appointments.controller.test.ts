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
jest.mock('../../src/modules/appointments/repositories/appo.repo', () => require('../mocks/appointmentsRepo.mock').mockedAppointmentsRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);

// Mock Auth Middlewares
jest.mock('../../src/common/middleware/auth', () => ({
  protect: jest.fn().mockImplementation((req: any, _res: any, next: any) => {
    req.user = { id: 1, role: 'admin' }; // Default
    next();
  }),
  restrictTo: jest.fn().mockImplementation((...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    next();
  }),
}));

import { mockedAppointmentsRepo } from '../mocks/appointmentsRepo.mock';
import { mockedPatientRepo } from '../mocks/patientsRepo.mock';
import { mockedDoctorsRepo } from '../mocks/doctorsRepo.mock';
import { protect } from '../../src/common/middleware/auth';

// Shared Fixtures
const FUTURE_DATE = new Date();
FUTURE_DATE.setDate(FUTURE_DATE.getDate() + 2);
const FUTURE_ISO = FUTURE_DATE.toISOString();

const MOCK_APPOINTMENT = {
  id: 1,
  patient_id: 1,
  doctor_id: 1,
  starts_at: FUTURE_ISO,
  status: 'scheduled',
};

const VALID_BOOK_BODY = {
  doctor_id: 1,
  starts_at: FUTURE_ISO,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  APPOINTMENTS API CONTROLLER TESTS (API Layer)
// ═══════════════════════════════════════════════════════════════════════════════
describe('APPOINTMENTS API CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 1, role: 'patient' }; // Default to patient for booking tests
      next();
    });
  });

  describe('POST /api/v1/appointments', () => {
    describe('✅ Success — valid booking', () => {
      it('should return 201 Created and success message', async () => {
        mockedPatientRepo.findByUserId.mockResolvedValue({ id: 1 });
        mockedDoctorsRepo.findById.mockResolvedValue({ id: 1 });
        mockedAppointmentsRepo.checkAvailability.mockResolvedValue(true);
        mockedAppointmentsRepo.createAppointment.mockResolvedValue(MOCK_APPOINTMENT);

        const res = await request(app).post('/api/v1/appointments').send(VALID_BOOK_BODY);
        
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toEqual(MOCK_APPOINTMENT);
      });
    });

    describe('❌ Failure — invalid data', () => {
      it('should return 400 when doctor_id is missing', async () => {
        const res = await request(app).post('/api/v1/appointments').send({ starts_at: '2024-06-01T10:00:00Z' });
        expect(res.status).toBe(400);
      });
    });

    describe('🔒 Security — unauthorized access', () => {
      it('should return 403 when user is an admin (booking is for patients only)', async () => {
        (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = { id: 1, role: 'admin' };
          next();
        });

        const res = await request(app).post('/api/v1/appointments').send(VALID_BOOK_BODY);
        expect(res.status).toBe(403);
      });
    });
  });

  describe('GET /api/v1/appointments/doctor/schedule/today', () => {
    describe('✅ Success', () => {
      it('should return 200 OK and daily schedule for doctors', async () => {
        (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = { id: 2, role: 'doctor' };
          next();
        });
        mockedDoctorsRepo.findByUserId.mockResolvedValue({ id: 1 });
        mockedAppointmentsRepo.getDoctorDailySchedule.mockResolvedValue([MOCK_APPOINTMENT]);

        const res = await request(app).get('/api/v1/appointments/doctor/schedule/today');
        expect(res.status).toBe(200);
        expect(res.body.data.appointments).toHaveLength(1);
      });
    });
  });

  describe('PATCH /api/v1/appointments/:id/status', () => {
    describe('✅ Success', () => {
      it('should return 200 OK after status update', async () => {
        (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = { id: 2, role: 'doctor' };
          next();
        });
        mockedAppointmentsRepo.findById.mockResolvedValue({ id: 1, doctor_id: 1, status: 'scheduled' });
        mockedDoctorsRepo.findByUserId.mockResolvedValue({ id: 1 });
        mockedAppointmentsRepo.updateStatus.mockResolvedValue([{ ...MOCK_APPOINTMENT, status: 'completed' }]);

        const res = await request(app).patch('/api/v1/appointments/1/status').send({ status: 'completed' });
        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe('completed');
      });
    });
  });
});
