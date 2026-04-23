import request from 'supertest';
import { app } from '../../../../app';

jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('t'), verify: jest.fn() }));
jest.mock('../../../config/db', () => {
  const mockTrx = jest.fn() as any;
  mockTrx.mockImplementation(() => mockTrx);
  Object.assign(mockTrx, { insert: jest.fn().mockReturnThis(), returning: jest.fn().mockResolvedValue([]), where: jest.fn().mockReturnThis(), update: jest.fn().mockReturnThis(), first: jest.fn().mockResolvedValue(null), commit: jest.fn().mockResolvedValue(undefined), rollback: jest.fn().mockResolvedValue(undefined) });
  const mockDb = jest.fn() as any;
  mockDb.transaction = jest.fn().mockImplementation(async (cb: Function) => cb(mockTrx));
  mockDb.fn = { now: jest.fn().mockReturnValue(new Date()) };
  return { default: mockDb, __esModule: true };
});
jest.mock('../repositories/nurse.repository', () => ({ createNurse: jest.fn(), getNurses: jest.fn(), getNursesByDoctor: jest.fn(), getNursesByDepartment: jest.fn(), findById: jest.fn(), findByUserId: jest.fn(), updateNurse: jest.fn(), deleteNurse: jest.fn() }));
jest.mock('../../doctors/repositories/doctor.repo', () => ({ findById: jest.fn(), findByUserId: jest.fn(), createDoctor: jest.fn(), updateByUserId: jest.fn(), getAllDoctors: jest.fn() }));
jest.mock('../../department/repositories/department.repo', () => ({ findById: jest.fn(), createDepartment: jest.fn(), countDepartments: jest.fn() }));
jest.mock('../../users/repositories/user.repo', () => ({ findUserById: jest.fn(), findUserByEmail: jest.fn(), findUserWithPasswordById: jest.fn(), createUser: jest.fn(), updateUserById: jest.fn(), deactivateUser: jest.fn(), saveEmailChangeToken: jest.fn(), updateEmail: jest.fn(), clearEmailChangeToken: jest.fn(), findByEmailToken: jest.fn(), updateEmailChangeExpires: jest.fn(), updateUserRole: jest.fn(), adminUpdateUser: jest.fn(), findAllUsers: jest.fn() }));

import jwt from 'jsonwebtoken';
import * as nurseRepo from '../repositories/nurse.repository';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import * as deptRepo from '../../department/repositories/department.repo';
import * as userRepo from '../../users/repositories/user.repo';

const mJwt = jwt as jest.Mocked<typeof jwt>;
const mNurse = nurseRepo as jest.Mocked<typeof nurseRepo>;
const mDoctor = doctorRepo as jest.Mocked<typeof doctorRepo>;
const mDept = deptRepo as jest.Mocked<typeof deptRepo>;
const mUser = userRepo as jest.Mocked<typeof userRepo>;

const mkUser  = (o: any = {}) => ({id:1,full_name:'U',email:'u@e.com',password_hash:'h',role:'admin',is_active:true,created_at:new Date('2024-01-01'),phone:null,...o});
const mkDept  = (o: any = {}) => ({id:10,name:'ICU',code:'ICU-01',description:'ICU',...o});
const mkDoctor= (o: any = {}) => ({id:50,user_id:99,department_id:10,department_name:'ICU',specialization:'Cardiology',full_name:'Dr. Smith',...o});
const mkNurse = (o: any = {}) => ({id:100,user_id:200,doctor_id:50,department_id:10,license_number:'LIC-001',shift:'morning',years_of_experience:3,notes:'Reliable',nurse_name:'Nurse Jane',nurse_email:'j@e.com',doctor_name:'Dr. Smith',department_name:'ICU',department_code:'ICU-01',created_at:new Date(),updated_at:new Date(),...o});
const body    = () => ({user_id:200,department_id:10,doctor_id:50,license_number:'LIC-001',shift:'morning',years_of_experience:3,notes:'Test nurse'});

const loginAs = (u: any) => {
  (mJwt.verify as jest.Mock).mockReturnValue({id:u.id,role:u.role,iat:1000,exp:9999999999});
  mUser.findUserById.mockResolvedValue(u);
};
const auth = () => ({Authorization: 'Bearer mock_token'});
beforeEach(() => jest.clearAllMocks());

describe('Authentication Guard', () => {
  beforeEach(() => (mJwt.verify as jest.Mock).mockImplementation(() => { throw new Error('No token'); }));
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
    expect(res.body.data.nurse_name).toBe('Nurse Jane');
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

describe('Unit: nurseService', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const svc = require('../services/nurse.service');
  beforeEach(() => jest.clearAllMocks());
  it('[BIZ-001] createNurse throws 404 when department missing', async () => {
    mDept.findById.mockResolvedValue(null as any);
    await expect(svc.createNurse({user_id:200,department_id:99,doctor_id:50,license_number:'LX',shift:'morning'})).rejects.toMatchObject({statusCode:404});
    expect(mDoctor.findById).not.toHaveBeenCalled();
  });
  it('[BIZ-002] createNurse throws 404 when doctor missing', async () => {
    mDept.findById.mockResolvedValue(mkDept() as any);
    mDoctor.findById.mockResolvedValue(null as any);
    await expect(svc.createNurse({user_id:200,department_id:10,doctor_id:99,license_number:'LX',shift:'morning'})).rejects.toMatchObject({statusCode:404});
  });
  it('[BIZ-003] createNurse throws 422 when doctor in different dept', async () => {
    mDept.findById.mockResolvedValue(mkDept({id:10}) as any);
    mDoctor.findById.mockResolvedValue(mkDoctor({department_id:20}) as any);
    await expect(svc.createNurse({user_id:200,department_id:10,doctor_id:50,license_number:'LC',shift:'morning'})).rejects.toMatchObject({statusCode:422});
    expect(mNurse.createNurse).not.toHaveBeenCalled();
  });
  it('[BIZ-004] createNurse succeeds when dept and doctor match', async () => {
    mDept.findById.mockResolvedValue(mkDept({id:10}) as any);
    mDoctor.findById.mockResolvedValue(mkDoctor({department_id:10}) as any);
    mNurse.createNurse.mockResolvedValue(mkNurse() as any);
    expect(await svc.createNurse(body())).toMatchObject({id:100});
  });
  it('[BIZ-005] updateNurse throws 422 when new doctor in wrong dept', async () => {
    mNurse.findById.mockResolvedValue(mkNurse() as any);
    mDoctor.findById.mockResolvedValue(mkDoctor({department_id:99}) as any);
    mDept.findById.mockResolvedValue(mkDept({id:10}) as any);
    await expect(svc.updateNurse(100,{doctor_id:55})).rejects.toMatchObject({statusCode:422});
    expect(mNurse.updateNurse).not.toHaveBeenCalled();
  });
  it('[BIZ-006] updateNurse skips cross-validation for shift-only update', async () => {
    mNurse.findById.mockResolvedValue(mkNurse() as any);
    mNurse.updateNurse.mockResolvedValue(mkNurse({shift:'night'}) as any);
    const result = await svc.updateNurse(100,{shift:'night'});
    expect(mDoctor.findById).not.toHaveBeenCalled();
    expect(result.shift).toBe('night');
  });
  it('[BIZ-007] getNursesByDoctor throws 404 when no doctor profile', async () => {
    mDoctor.findByUserId.mockResolvedValue(null as any);
    await expect(svc.getNursesByDoctor(999)).rejects.toMatchObject({statusCode:404});
  });
  it('[BIZ-008] getNursesByDoctor returns structured response', async () => {
    mDoctor.findByUserId.mockResolvedValue(mkDoctor({user_id:5,full_name:'Dr. Smith'}) as any);
    mNurse.getNursesByDoctor.mockResolvedValue([mkNurse()] as any);
    const result = await svc.getNursesByDoctor(5);
    expect(result.doctor_id).toBe(50);
    expect(result.total).toBe(1);
  });
  it('[BIZ-009] deleteNurse throws 404 for non-existent', async () => {
    mNurse.findById.mockResolvedValue(null as any);
    await expect(svc.deleteNurse(9999)).rejects.toMatchObject({statusCode:404});
    expect(mNurse.deleteNurse).not.toHaveBeenCalled();
  });
  it('[BIZ-010] deleteNurse calls repo when nurse exists', async () => {
    mNurse.findById.mockResolvedValue(mkNurse() as any);
    mNurse.deleteNurse.mockResolvedValue(1 as any);
    const result = await svc.deleteNurse(100);
    expect(mNurse.deleteNurse).toHaveBeenCalledWith(100);
    expect(result.message).toMatch(/deleted/i);
  });
});

describe('Validation - POST /api/v1/nurses', () => {
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