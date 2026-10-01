import request from 'supertest';

const MOCK_DEPARTMENT = {
  id: 1,
  name: 'Cardiology',
  name_en: 'Cardiology',
  name_ar: 'القلب',
  code: 'CARD',
  description: 'Heart and cardiovascular care',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockImplementation(() => Promise.resolve([MOCK_DEPARTMENT])),
  where: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  whereNot: jest.fn().mockReturnThis(),
  count: jest.fn().mockReturnThis(),
  first: jest.fn().mockImplementation(() => Promise.resolve(null)),
  insert: jest.fn().mockReturnThis(),
  returning: jest.fn().mockImplementation(() => Promise.resolve([MOCK_DEPARTMENT])),
  update: jest.fn().mockImplementation(() => Promise.resolve(1)),
  del: jest.fn().mockImplementation(() => Promise.resolve(1)),
};

// Mock Dependencies
jest.mock('../../src/config/db', () => {
  const fn = jest.fn(() => mockQueryBuilder);
  (fn as any).transaction = jest.fn().mockImplementation(async (cb: Function) => cb(fn));
  (fn as any).fn = { now: jest.fn().mockReturnValue(new Date()) };
  (fn as any).raw = jest.fn().mockResolvedValue([]);
  return {
    __esModule: true,
    default: fn,
  };
});

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

import { app } from '../../app';
import { protect } from '../../src/common/middleware/auth';

const VALID_CREATE_BODY = {
  name_en: 'Cardiology',
  name_ar: 'القلب',
  code: 'CARD',
  description: 'Heart and cardiovascular care',
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
    mockQueryBuilder.first.mockResolvedValue(null);
    mockQueryBuilder.orderBy.mockResolvedValue([MOCK_DEPARTMENT]);
    mockQueryBuilder.returning.mockResolvedValue([MOCK_DEPARTMENT]);
    mockQueryBuilder.del.mockResolvedValue(1);
  });

  describe('POST /api/v1/departments', () => {
    describe('✅ Success — valid payload', () => {
      it('should return 201 Created and success message', async () => {
        const res = await request(app).post('/api/v1/departments').send(VALID_CREATE_BODY);
        
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toEqual(MOCK_DEPARTMENT);
      });
    });

    describe('❌ Failure — invalid data', () => {
      it('should return 400 when name is missing', async () => {
        const res = await request(app).post('/api/v1/departments').send({ ...VALID_CREATE_BODY, name_en: undefined });
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
        const res = await request(app).get('/api/v1/departments');
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(1);
      });
    });
  });

  describe('DELETE /api/v1/departments/:id', () => {
    describe('✅ Success', () => {
      it('should return 200 OK after deletion', async () => {
        const res = await request(app).delete('/api/v1/departments/1');
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/removed successfully|deleted successfully/i);
      });
    });
  });
});
