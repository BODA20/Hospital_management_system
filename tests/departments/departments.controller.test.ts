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
jest.mock('../../src/modules/department/repositories/department.repo', () => require('../mocks/departmentsRepo.mock').mockedDepartmentsRepo);

// Mock Auth Middlewares
jest.mock('../../src/common/middleware/auth', () => ({
  protect: jest.fn().mockImplementation((req: any, _res: any, next: any) => {
    req.user = { id: 1, role: 'admin' };
    next();
  }),
  restrictTo: jest.fn().mockImplementation((...roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'fail', message: 'Forbidden' });
    }
    next();
  }),
}));

import { mockedDepartmentsRepo } from '../mocks/departmentsRepo.mock';
import { protect } from '../../src/common/middleware/auth';

// Shared Fixtures
const MOCK_DEPARTMENT = {
  id: 1,
  name: 'Cardiology',
  code: 'CARD',
  description: 'Heart and cardiovascular care',
  head_doctor_id: 1,
  head_doctor_name: 'Dr. John Smith',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const VALID_CREATE_BODY = {
  name: 'Cardiology',
  code: 'CARD',
  description: 'Heart and cardiovascular care',
  head_doctor_id: 1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  DEPARTMENTS API CONTROLLER TESTS (API Layer)
// ═══════════════════════════════════════════════════════════════════════════════
describe('DEPARTMENTS API CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
      req.user = { id: 1, role: 'admin' };
      next();
    });
  });

  describe('POST /api/v1/departments', () => {
    describe('✅ Success — valid payload', () => {
      it('should return 201 Created and success message', async () => {
        mockedDepartmentsRepo.countDepartments.mockResolvedValue(0);
        mockedDepartmentsRepo.createDepartment.mockResolvedValue(MOCK_DEPARTMENT);

        const res = await request(app).post('/api/v1/departments').send(VALID_CREATE_BODY);
        
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toEqual(MOCK_DEPARTMENT);
      });
    });

    describe('❌ Failure — invalid data', () => {
      it('should return 400 when name is missing', async () => {
        const res = await request(app).post('/api/v1/departments').send({ ...VALID_CREATE_BODY, name: undefined });
        expect(res.status).toBe(400);
      });
    });

    describe('🔒 Security — unauthorized access', () => {
      it('should return 403 when user is not an admin', async () => {
        (protect as jest.Mock).mockImplementation((req: any, _res: any, next: any) => {
          req.user = { id: 1, role: 'doctor' };
          next();
        });

        const res = await request(app).post('/api/v1/departments').send(VALID_CREATE_BODY);
        expect(res.status).toBe(403);
      });
    });
  });

  describe('GET /api/v1/departments', () => {
    describe('✅ Success', () => {
      it('should return 200 OK and all departments', async () => {
        mockedDepartmentsRepo.getAllDepartments.mockResolvedValue([MOCK_DEPARTMENT]);
        const res = await request(app).get('/api/v1/departments');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
      });
    });
  });

  describe('GET /api/v1/departments/:id', () => {
    describe('✅ Success', () => {
      it('should return 200 OK and department details', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(MOCK_DEPARTMENT);
        const res = await request(app).get('/api/v1/departments/1');
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(1);
      });
    });

    describe('❌ Failure — not found', () => {
      it('should return 404 Not Found', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(null);
        const res = await request(app).get('/api/v1/departments/999');
        expect(res.status).toBe(404);
      });
    });
  });

  describe('PATCH /api/v1/departments/:id', () => {
    describe('✅ Success', () => {
      it('should return 200 OK after update', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(MOCK_DEPARTMENT);
        mockedDepartmentsRepo.updateDepartment.mockResolvedValue({ ...MOCK_DEPARTMENT, name: 'Updated' });

        const res = await request(app).patch('/api/v1/departments/1').send({ name: 'Updated' });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated');
      });
    });
  });

  describe('DELETE /api/v1/departments/:id', () => {
    describe('✅ Success', () => {
      it('should return 200 OK after deletion', async () => {
        mockedDepartmentsRepo.findById.mockResolvedValue(MOCK_DEPARTMENT);
        mockedDepartmentsRepo.countDoctorsInDepartment.mockResolvedValue(0);
        mockedDepartmentsRepo.deleteDepartment.mockResolvedValue(1);

        const res = await request(app).delete('/api/v1/departments/1');
        expect(res.status).toBe(200);
        expect(res.body.data.message).toMatch(/deleted successfully/i);
      });
    });
  });
});
