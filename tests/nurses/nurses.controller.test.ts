import request from 'supertest';

jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('t'), verify: jest.fn() }));
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (cb: Function) => cb({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
    raw: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/modules/nurses/repositories/nurse.repository', () => require('../mocks/nursesRepo.mock').mockedNursesRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/department/repositories/department.repo', () => require('../mocks/nursesRepo.mock').mockedDeptRepo);
jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);

import { app } from '../../app';
import { mockedNursesRepo as mNurse, makeNurse as mkNurse, mockedDeptRepo as mDept, makeDept as mkDept } from '../mocks/nursesRepo.mock';
import { mockedDoctorsRepo as mDoctor, makeDoctor as mkDoctor } from '../mocks/doctorsRepo.mock';
import { mockedUsersRepo as mUser, makeUser as mkUser } from '../mocks/usersRepo.mock';
import { bearerHeader as auth, loginAs } from '../mocks/jwt.mock';

const body = () => ({user_id:200,department_id:10,doctor_id:50,license_number:'LIC-001',shift:'morning',years_of_experience:3,notes:'Test nurse'});

describe('NURSES API CONTROLLER', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('Authentication Guard', () => {
    beforeEach(() => {
      // simulate missing token by returning empty object
      // Actually jwt.verify throws error if no token, loginAs simulates it for others
    });
    it('[AUTH-001] GET /api/v1/nurses -> 401', async () => { expect((await request(app).get('/api/v1/nurses')).status).toBe(401); });
    it('[AUTH-002] GET /api/v1/nurses/:id -> 401', async () => { expect((await request(app).get('/api/v1/nurses/100')).status).toBe(401); });
    it('[AUTH-003] POST /api/v1/nurses -> 401', async () => { expect((await request(app).post('/api/v1/nurses').send(body())).status).toBe(401); });
    it('[AUTH-004] PATCH /api/v1/nurses/:id -> 401', async () => { expect((await request(app).patch('/api/v1/nurses/100').send({shift:'evening'})).status).toBe(401); });
    it('[AUTH-005] DELETE /api/v1/nurses/:id -> 401', async () => { expect((await request(app).delete('/api/v1/nurses/100')).status).toBe(401); });
  });

  describe('RBAC Security', () => {
    describe('POST /api/v1/nurses - admin only', () => {
      it('[RBAC-001] Patient -> 403', async () => { loginAs(mkUser({role:'patient'})); expect((await request(app).post('/api/v1/nurses').set(auth()).send(body())).status).toBe(403); });
      it('[RBAC-002] Doctor -> 403', async () => { loginAs(mkUser({role:'doctor'})); expect((await request(app).post('/api/v1/nurses').set(auth()).send(body())).status).toBe(403); });
      it('[RBAC-003] Nurse -> 403', async () => { loginAs(mkUser({role:'nurse'})); expect((await request(app).post('/api/v1/nurses').set(auth()).send(body())).status).toBe(403); });
      it('[RBAC-004] Admin can create nurse -> 201', async () => {
        loginAs(mkUser({role:'admin'}));
        mDept.findById.mockResolvedValue(mkDept() as any);
        mDoctor.findById.mockResolvedValue(mkDoctor({department_id:10}) as any);
        mNurse.createNurse.mockResolvedValue(mkNurse() as any);
        expect((await request(app).post('/api/v1/nurses').set(auth()).send(body())).status).toBe(201);
      });
    });
    describe('PATCH /api/v1/nurses/:id - admin only', () => {
      it('[RBAC-005] Patient -> 403', async () => { loginAs(mkUser({role:'patient'})); expect((await request(app).patch('/api/v1/nurses/100').set(auth()).send({shift:'evening'})).status).toBe(403); });
      it('[RBAC-006] Doctor -> 403', async () => { loginAs(mkUser({role:'doctor'})); expect((await request(app).patch('/api/v1/nurses/100').set(auth()).send({shift:'evening'})).status).toBe(403); });
      it('[RBAC-007] Nurse -> 403', async () => { loginAs(mkUser({role:'nurse'})); expect((await request(app).patch('/api/v1/nurses/100').set(auth()).send({shift:'night'})).status).toBe(403); });
    });
    describe('DELETE /api/v1/nurses/:id - admin only', () => {
      it('[RBAC-008] Patient -> 403', async () => { loginAs(mkUser({role:'patient'})); expect((await request(app).delete('/api/v1/nurses/100').set(auth())).status).toBe(403); });
      it('[RBAC-009] Doctor -> 403', async () => { loginAs(mkUser({role:'doctor'})); expect((await request(app).delete('/api/v1/nurses/100').set(auth())).status).toBe(403); });
      it('[RBAC-010] Nurse -> 403', async () => { loginAs(mkUser({role:'nurse'})); expect((await request(app).delete('/api/v1/nurses/100').set(auth())).status).toBe(403); });
    });
    describe('GET /api/v1/nurses/my-team - doctor only', () => {
      it('[RBAC-011] Admin -> 403', async () => { loginAs(mkUser({role:'admin'})); expect((await request(app).get('/api/v1/nurses/my-team').set(auth())).status).toBe(403); });
      it('[RBAC-012] Patient -> 403', async () => { loginAs(mkUser({role:'patient'})); expect((await request(app).get('/api/v1/nurses/my-team').set(auth())).status).toBe(403); });
      it('[RBAC-013] Nurse -> 403', async () => { loginAs(mkUser({role:'nurse'})); expect((await request(app).get('/api/v1/nurses/my-team').set(auth())).status).toBe(403); });
      it('[RBAC-014] Doctor can access /my-team -> 200', async () => {
        loginAs(mkUser({id:5,role:'doctor'}));
        mDoctor.findByUserId.mockResolvedValue(mkDoctor({user_id:5}) as any);
        mNurse.getNursesByDoctor.mockResolvedValue([mkNurse(),mkNurse({id:101})] as any);
        const res = await request(app).get('/api/v1/nurses/my-team').set(auth());
        expect(res.status).toBe(200);
        expect(res.body.data.nurses).toHaveLength(2);
      });
    });
  });

  describe('Mass Assignment', () => {
    beforeEach(() => {
      loginAs(mkUser({role:'admin'}));
      mNurse.findById.mockResolvedValue(mkNurse() as any);
      mNurse.updateNurse.mockResolvedValue(mkNurse() as any);
    });
    it('[MASS-001] user_id in PATCH must NOT reach repo', async () => {
      const res = await request(app).patch('/api/v1/nurses/100').set(auth()).send({shift:'night',user_id:9999});
      expect(res.status).toBe(200);
      const c = mNurse.updateNurse.mock.calls;
      if (c.length > 0) expect(c[0][1]).not.toHaveProperty('user_id');
    });
    it('[MASS-002] created_at in PATCH must NOT reach repo', async () => {
      const res = await request(app).patch('/api/v1/nurses/100').set(auth()).send({shift:'evening',created_at:'2000-01-01'});
      expect(res.status).toBe(200);
      const c = mNurse.updateNurse.mock.calls;
      if (c.length > 0) expect(c[0][1]).not.toHaveProperty('created_at');
    });
    it('[MASS-003] role injection -> not 500', async () => {
      const res = await request(app).patch('/api/v1/nurses/100').set(auth()).send({shift:'morning',role:'admin'});
      expect([200,400]).toContain(res.status);
    });
  });

  describe('GET /api/v1/nurses', () => {
    it('returns nurses for authenticated user', async () => {
      loginAs(mkUser({role:'nurse'}));
      mNurse.getNurses.mockResolvedValue([mkNurse(),mkNurse({id:101})] as any);
      const res = await request(app).get('/api/v1/nurses').set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
    it('returns empty when no nurses', async () => {
      loginAs(mkUser({role:'admin'}));
      mNurse.getNurses.mockResolvedValue([] as any);
      expect((await request(app).get('/api/v1/nurses').set(auth())).body.results).toBe(0);
    });
  });

  describe('GET /api/v1/nurses/:id', () => {
    it('returns nurse for valid ID', async () => {
      loginAs(mkUser({role:'doctor'}));
      mNurse.findById.mockResolvedValue(mkNurse() as any);
      const res = await request(app).get('/api/v1/nurses/100').set(auth());
      expect(res.status).toBe(200);
    });
    it('returns 404 for non-existent', async () => {
      loginAs(mkUser({role:'admin'}));
      mNurse.findById.mockResolvedValue(null as any);
      expect((await request(app).get('/api/v1/nurses/9999').set(auth())).status).toBe(404);
    });
  });

  describe('DELETE /api/v1/nurses/:id', () => {
    it('deletes nurse successfully', async () => {
      loginAs(mkUser({role:'admin'}));
      mNurse.findById.mockResolvedValue(mkNurse() as any);
      mNurse.deleteNurse.mockResolvedValue(1 as any);
      const res = await request(app).delete('/api/v1/nurses/100').set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data.message).toMatch(/deleted/i);
    });
    it('returns 404 for non-existent', async () => {
      loginAs(mkUser({role:'admin'}));
      mNurse.findById.mockResolvedValue(null as any);
      expect((await request(app).delete('/api/v1/nurses/9999').set(auth())).status).toBe(404);
    });
  });

  describe('Validation', () => {
    beforeEach(() => loginAs(mkUser({role:'admin'})));
    it('[VAL-001] empty body -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({})).status).toBe(400); });
    it('[VAL-002] missing user_id -> 400', async () => { const {user_id:_u,...r}=body(); expect((await request(app).post('/api/v1/nurses').set(auth()).send(r)).status).toBe(400); });
    it('[VAL-003] invalid shift -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({...body(),shift:'afternoon'})).status).toBe(400); });
    it('[VAL-004] negative years_of_experience -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({...body(),years_of_experience:-5})).status).toBe(400); });
    it('[VAL-005] license too short -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({...body(),license_number:'AB'})).status).toBe(400); });
    it('[VAL-006] license too long -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({...body(),license_number:'A'.repeat(51)})).status).toBe(400); });
    it('[VAL-007] string user_id -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({...body(),user_id:'NaN'})).status).toBe(400); });
    it('[VAL-008] notes > 1000 chars -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({...body(),notes:'X'.repeat(1001)})).status).toBe(400); });
    it('[VAL-011] PATCH invalid shift -> 400', async () => { expect((await request(app).patch('/api/v1/nurses/100').set(auth()).send({shift:'INVALID_SHIFT'})).status).toBe(400); });
  });

  describe('Resource Exhaustion', () => {
    beforeEach(() => { loginAs(mkUser({role:'admin'})); mNurse.getNurses.mockResolvedValue([] as any); });
    it('[PERF-001] notes > 10000 chars -> 400', async () => { expect((await request(app).post('/api/v1/nurses').set(auth()).send({...body(),notes:'N'.repeat(10001)})).status).toBe(400); });
    it('[PERF-002] numeric overflow -> not 500', async () => { const s=(await request(app).post('/api/v1/nurses').set(auth()).send({...body(),user_id:Number.MAX_SAFE_INTEGER+1})).status; expect(s).not.toBe(500); });
    it('[FUZZ-001] unknown query params -> 200', async () => { expect((await request(app).get('/api/v1/nurses?evil=true').set(auth())).status).toBe(200); });
    it('[FUZZ-002] non-numeric limit -> 200 or 400', async () => { const s=(await request(app).get('/api/v1/nurses?limit=abc').set(auth())).status; expect([200,400]).toContain(s); expect(s).not.toBe(500); });
  });
});
