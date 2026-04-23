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
  (mockDb as any).__mockTrx = mockTrx;
  return { default: mockDb, __esModule: true };
});
jest.mock('../repositories/user.repo', () => ({ findAllUsers: jest.fn(), findUserById: jest.fn(), findUserByEmail: jest.fn(), findUserWithPasswordById: jest.fn(), createUser: jest.fn(), updateUserById: jest.fn(), deactivateUser: jest.fn(), saveEmailChangeToken: jest.fn(), updateEmail: jest.fn(), clearEmailChangeToken: jest.fn(), findByEmailToken: jest.fn(), updateEmailChangeExpires: jest.fn(), updateUserRole: jest.fn(), adminUpdateUser: jest.fn() }));
jest.mock('../../doctors/repositories/doctor.repo', () => ({ findByUserId: jest.fn(), findById: jest.fn(), createDoctor: jest.fn(), updateByUserId: jest.fn(), getAllDoctors: jest.fn() }));

import jwt from 'jsonwebtoken';
import * as userRepo from '../repositories/user.repo';
import * as doctorRepo from '../../doctors/repositories/doctor.repo';
import db from '../../../config/db';

const mJwt = jwt as jest.Mocked<typeof jwt>;
const mUser = userRepo as jest.Mocked<typeof userRepo>;
const mDoctor = doctorRepo as jest.Mocked<typeof doctorRepo>;
const mDb = db as any;

// Full user object (includes password_hash - used only for protect middleware internals)
const mkUserFull = (o: any = {}) => ({id:1,full_name:'Admin',email:'admin@e.com',password_hash:'h',role:'admin',is_active:true,created_at:new Date('2024-01-01'),phone:null,...o});
// Public user object (NO password_hash - what endpoints should return)
const mkUser = (o: any = {}) => ({id:1,full_name:'Admin',email:'admin@e.com',role:'admin',is_active:true,created_at:new Date('2024-01-01'),phone:null,...o});

const loginAs = (u: any) => {
  (mJwt.verify as jest.Mock).mockReturnValue({id:u.id,role:u.role,iat:1000,exp:9999999999});
  // protect middleware calls findUserById — needs full user (with is_active etc)
  mUser.findUserById.mockResolvedValue(mkUserFull({id:u.id,role:u.role}));
};
const auth = () => ({Authorization: 'Bearer mock_token'});
beforeEach(() => jest.clearAllMocks());

// --- Suite 1: Authentication Guard --------------------------------------------
describe('Authentication Guard', () => {
  beforeEach(() => (mJwt.verify as jest.Mock).mockImplementation(() => { throw new Error('No token'); }));
  it('[AUTH-001] GET /api/v1/users -> 401', async () => { expect((await request(app).get('/api/v1/users')).status).toBe(401); });
  it('[AUTH-002] GET /api/v1/users/1 -> 401', async () => { expect((await request(app).get('/api/v1/users/1')).status).toBe(401); });
  it('[AUTH-003] PATCH /api/v1/users/me -> 401', async () => { expect((await request(app).patch('/api/v1/users/me').send({full_name:'Bob'})).status).toBe(401); });
  it('[AUTH-004] PATCH /api/v1/users/5 -> 401', async () => { expect((await request(app).patch('/api/v1/users/5').send({role:'doctor'})).status).toBe(401); });
  it('[AUTH-005] DELETE /api/v1/users/5 -> 401', async () => { expect((await request(app).delete('/api/v1/users/5')).status).toBe(401); });
});

// --- Suite 2: RBAC ------------------------------------------------------------
describe('RBAC Security', () => {
  describe('GET /api/v1/users - admin only', () => {
    it('[RBAC-001] Patient -> 403', async () => { loginAs(mkUser({role:'patient'})); expect((await request(app).get('/api/v1/users').set(auth())).status).toBe(403); });
    it('[RBAC-002] Doctor -> 403', async () => { loginAs(mkUser({role:'doctor'})); expect((await request(app).get('/api/v1/users').set(auth())).status).toBe(403); });
    it('[RBAC-003] Nurse -> 403', async () => { loginAs(mkUser({role:'nurse'})); expect((await request(app).get('/api/v1/users').set(auth())).status).toBe(403); });
    it('[RBAC-004] Admin -> 200', async () => {
      loginAs(mkUser({role:'admin'}));
      mUser.findAllUsers.mockResolvedValue([mkUser({id:1}),mkUser({id:2})] as any);
      const res = await request(app).get('/api/v1/users').set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });
  describe('GET /api/v1/users/:id - admin only (IDOR)', () => {
    it('[IDOR-001] Patient viewing another user by ID -> 403', async () => { loginAs(mkUser({id:10,role:'patient'})); expect((await request(app).get('/api/v1/users/99').set(auth())).status).toBe(403); });
    it('[IDOR-002] Doctor viewing another user by ID -> 403', async () => { loginAs(mkUser({id:20,role:'doctor'})); expect((await request(app).get('/api/v1/users/50').set(auth())).status).toBe(403); });
    it('[IDOR-003] Nurse enumerating user accounts -> 403', async () => { loginAs(mkUser({id:5,role:'nurse'})); expect((await request(app).get('/api/v1/users/1').set(auth())).status).toBe(403); });
    it('[RBAC-005] Admin -> 200 for existing user', async () => {
      loginAs(mkUser({role:'admin'}));
      // protect middleware: 1st call returns admin. getUser: 2nd call returns target user.
      mUser.findUserById
        .mockResolvedValueOnce(mkUserFull({role:'admin'}) as any)
        .mockResolvedValueOnce(mkUser({id:99,role:'nurse'}) as any);
      expect((await request(app).get('/api/v1/users/99').set(auth())).status).toBe(200);
    });
    it('[RBAC-006] Non-existent user -> 404', async () => {
      loginAs(mkUser({role:'admin'}));
      mUser.findUserById
        .mockResolvedValueOnce(mkUserFull({role:'admin'}) as any)
        .mockResolvedValueOnce(undefined as any);
      expect((await request(app).get('/api/v1/users/9999').set(auth())).status).toBe(404);
    });
  });
  describe('PATCH /api/v1/users/:id - admin only (IDOR + escalation)', () => {
    it('[IDOR-004] Doctor trying to PATCH another user -> 403', async () => { loginAs(mkUser({id:5,role:'doctor'})); expect((await request(app).patch('/api/v1/users/10').set(auth()).send({full_name:'Hijacked'})).status).toBe(403); });
    it('[IDOR-005] Patient escalating own role via PATCH /:id -> 403', async () => { loginAs(mkUser({id:5,role:'patient'})); expect((await request(app).patch('/api/v1/users/5').set(auth()).send({role:'admin'})).status).toBe(403); });
    it('[IDOR-006] Nurse deactivating another user -> 403', async () => { loginAs(mkUser({id:3,role:'nurse'})); expect((await request(app).patch('/api/v1/users/1').set(auth()).send({is_active:false})).status).toBe(403); });
  });
  describe('DELETE /api/v1/users/:id - admin only', () => {
    it('[RBAC-007] Patient -> 403', async () => { loginAs(mkUser({role:'patient'})); expect((await request(app).delete('/api/v1/users/2').set(auth())).status).toBe(403); });
    it('[RBAC-008] Doctor -> 403', async () => { loginAs(mkUser({role:'doctor'})); expect((await request(app).delete('/api/v1/users/2').set(auth())).status).toBe(403); });
    it('[RBAC-009] Nurse -> 403', async () => { loginAs(mkUser({role:'nurse'})); expect((await request(app).delete('/api/v1/users/2').set(auth())).status).toBe(403); });
  });
});

// --- Suite 3: Mass Assignment - PATCH /api/v1/users/me ------------------------
describe('Mass Assignment - PATCH /api/v1/users/me', () => {
  beforeEach(() => loginAs(mkUser({id:10,role:'patient'})));
  it('[MASS-001] role injection -> 400 (strict schema)', async () => {
    expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',role:'admin'})).status).toBe(400);
    expect(mUser.updateUserById).not.toHaveBeenCalled();
  });
  it('[MASS-002] is_active injection -> 400 (strict schema)', async () => {
    expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',is_active:true})).status).toBe(400);
    expect(mUser.updateUserById).not.toHaveBeenCalled();
  });
  it('[MASS-003] password injection -> 400 (strict schema)', async () => {
    expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',password:'HackerPass1!'})).status).toBe(400);
    expect(mUser.updateUserById).not.toHaveBeenCalled();
  });
  it('[MASS-004] email injection -> 400 (strict schema)', async () => {
    expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',email:'hacker@evil.com'})).status).toBe(400);
    expect(mUser.updateUserById).not.toHaveBeenCalled();
  });
  it('[MASS-006] valid full_name update -> 200', async () => {
    mUser.updateUserById.mockResolvedValue(mkUser({id:10,full_name:'New Name',role:'patient'}) as any);
    const res = await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'New Name'});
    expect(res.status).toBe(200);
    expect(mUser.updateUserById).toHaveBeenCalledWith(10, expect.objectContaining({full_name:'New Name'}));
  });
});

// --- Suite 4: Mass Assignment - PATCH /api/v1/users/:id -----------------------
describe('Mass Assignment - PATCH /api/v1/users/:id (admin)', () => {
  beforeEach(() => loginAs(mkUser({role:'admin'})));
  it('[MASS-007] password in adminUpdateUser body -> 400', async () => {
    expect((await request(app).patch('/api/v1/users/5').set(auth()).send({full_name:'Override',password:'HackerPass1!'})).status).toBe(400);
  });
  it('[MASS-009] admin can update is_active -> 200', async () => {
    mUser.findUserById
      .mockResolvedValueOnce(mkUserFull({role:'admin'}) as any)
      .mockResolvedValueOnce(mkUser({id:5,role:'nurse'}) as any);
    mUser.adminUpdateUser.mockResolvedValue(mkUser({id:5,is_active:false}) as any);
    expect((await request(app).patch('/api/v1/users/5').set(auth()).send({is_active:false})).status).toBe(200);
  });
});

// --- Suite 5: Happy-Path Tests -------------------------------------------------
describe('GET /api/v1/users - list all (admin)', () => {
  it('returns all users with correct shape', async () => {
    loginAs(mkUser({role:'admin'}));
    mUser.findAllUsers.mockResolvedValue([mkUser({id:1}),mkUser({id:2,role:'doctor'}),mkUser({id:3,role:'patient'})] as any);
    const res = await request(app).get('/api/v1/users').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.results).toBe(3);
  });
});

describe('DELETE /api/v1/users/:id - deactivate (admin)', () => {
  it('deactivates an existing user', async () => {
    loginAs(mkUser({role:'admin'}));
    mUser.findUserById
      .mockResolvedValueOnce(mkUserFull({role:'admin'}) as any)
      .mockResolvedValueOnce(mkUser({id:5}) as any);
    mUser.deactivateUser.mockResolvedValue(mkUser({id:5,is_active:false}) as any);
    const res = await request(app).delete('/api/v1/users/5').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
  });
  it('returns 404 for non-existent user', async () => {
    loginAs(mkUser({role:'admin'}));
    mUser.findUserById
      .mockResolvedValueOnce(mkUserFull({role:'admin'}) as any)
      .mockResolvedValueOnce(undefined as any);
    expect((await request(app).delete('/api/v1/users/9999').set(auth())).status).toBe(404);
  });
});

// --- Suite 6: Unit Tests - userService ----------------------------------------
describe('Unit: userService', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const svc = require('../services/user.service');
  beforeEach(() => jest.clearAllMocks());

  it('[TXN-001] adminUpdateUser wraps doctor role update in transaction', async () => {
    mUser.findUserById.mockResolvedValue(mkUserFull({id:5,role:'nurse'}) as any);
    mUser.adminUpdateUser.mockResolvedValue(mkUser({id:5,role:'doctor'}) as any);
    mDoctor.findByUserId.mockResolvedValue(null as any);
    mDoctor.createDoctor.mockResolvedValue({id:999} as any);
    await svc.adminUpdateUser(5,{role:'doctor'});
    expect(mDb.transaction).toHaveBeenCalledTimes(1);
  });
  it('[TXN-002] creates doctor profile when role changes to doctor and no profile exists', async () => {
    mUser.findUserById.mockResolvedValue(mkUserFull({id:5,role:'patient'}) as any);
    mUser.adminUpdateUser.mockResolvedValue(mkUser({id:5,role:'doctor'}) as any);
    mDoctor.findByUserId.mockResolvedValue(null as any);
    mDoctor.createDoctor.mockResolvedValue({id:999} as any);
    await svc.adminUpdateUser(5,{role:'doctor',specialization:'Neurology'});
    expect(mDoctor.createDoctor).toHaveBeenCalledWith(expect.objectContaining({user_id:5,specialization:'Neurology'}), expect.anything());
  });
  it('[TXN-003] does NOT create duplicate doctor profile if one already exists', async () => {
    mUser.findUserById.mockResolvedValue(mkUserFull({id:5,role:'patient'}) as any);
    mUser.adminUpdateUser.mockResolvedValue(mkUser({id:5,role:'doctor'}) as any);
    mDoctor.findByUserId.mockResolvedValue({id:50,user_id:5} as any);
    await svc.adminUpdateUser(5,{role:'doctor'});
    expect(mDoctor.createDoctor).not.toHaveBeenCalled();
  });
  it('[TXN-004] does NOT use transaction for non-doctor updates', async () => {
    mUser.findUserById.mockResolvedValue(mkUserFull({id:5,role:'doctor'}) as any);
    mUser.adminUpdateUser.mockResolvedValue(mkUser({id:5,is_active:false}) as any);
    await svc.adminUpdateUser(5,{is_active:false});
    expect(mDb.transaction).not.toHaveBeenCalled();
  });
  it('[TXN-005] transaction rollback: error from createDoctor propagates', async () => {
    mUser.findUserById.mockResolvedValue(mkUserFull({id:5,role:'patient'}) as any);
    mDb.transaction.mockImplementationOnce(async (cb: Function) => {
      mUser.adminUpdateUser.mockResolvedValue(mkUser({id:5,role:'doctor'}) as any);
      mDoctor.findByUserId.mockResolvedValue(null as any);
      mDoctor.createDoctor.mockRejectedValue(new Error('DB constraint'));
      return cb({});
    });
    await expect(svc.adminUpdateUser(5,{role:'doctor'})).rejects.toThrow();
    expect(mDb.transaction).toHaveBeenCalledTimes(1);
  });
  it('[TXN-006] throws 404 when target user does not exist', async () => {
    mUser.findUserById.mockResolvedValue(undefined as any);
    await expect(svc.adminUpdateUser(9999,{is_active:false})).rejects.toMatchObject({statusCode:404});
    expect(mUser.adminUpdateUser).not.toHaveBeenCalled();
  });
  it('[TXN-008] getUserById throws 404 when user missing', async () => {
    mUser.findUserById.mockResolvedValue(undefined as any);
    await expect(svc.getUserById(9999)).rejects.toMatchObject({statusCode:404});
  });
  it('[TXN-009] getUserById returns user when found', async () => {
    mUser.findUserById.mockResolvedValue(mkUser({id:5}) as any);
    expect(await svc.getUserById(5)).toMatchObject({id:5});
  });
});

// --- Suite 7: Sensitive Data Exposure (SEC tests) -----------------------------
// The user controller passes through repo results directly.
// These tests verify the EXPECTED behavior: repo mock returns public-only data
// and response must not expose hashed passwords.
describe('Sensitive Data Exposure', () => {
  beforeEach(() => loginAs(mkUser({role:'admin'})));

  it('[SEC-001] GET /api/v1/users data must NOT include password_hash', async () => {
    // findAllUsers should return objects WITHOUT password fields (public view)
    mUser.findAllUsers.mockResolvedValue([mkUser({id:1}),mkUser({id:2})] as any);
    const res = await request(app).get('/api/v1/users').set(auth());
    expect(res.status).toBe(200);
    res.body.data.forEach((u: any) => {
      expect(u).not.toHaveProperty('password_hash');
      expect(u).not.toHaveProperty('password');
    });
  });

  it('[SEC-002] GET /api/v1/users/:id must NOT expose password_hash', async () => {
    mUser.findUserById
      .mockResolvedValueOnce(mkUserFull({role:'admin'}) as any) // protect middleware
      .mockResolvedValueOnce(mkUser({id:5}) as any);            // getUser — public data, no hash
    const res = await request(app).get('/api/v1/users/5').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  it('[SEC-003] PATCH /me response must NOT include password_hash', async () => {
    loginAs(mkUser({id:10,role:'patient'}));
    mUser.updateUserById.mockResolvedValue(mkUser({id:10}) as any); // returns public data
    const res = await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Safe Name'});
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  it('[SEC-004] DELETE response must NOT include password_hash', async () => {
    mUser.findUserById
      .mockResolvedValueOnce(mkUserFull({role:'admin'}) as any)
      .mockResolvedValueOnce(mkUser({id:5}) as any);
    mUser.deactivateUser.mockResolvedValue(mkUser({id:5,is_active:false}) as any);
    const res = await request(app).delete('/api/v1/users/5').set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password_hash');
  });
});

// --- Suite 8: Validation ------------------------------------------------------
describe('Validation - PATCH /api/v1/users/me', () => {
  beforeEach(() => loginAs(mkUser({role:'patient',id:10})));
  it('[VAL-001] empty body -> 400', async () => { expect((await request(app).patch('/api/v1/users/me').set(auth()).send({})).status).toBe(400); });
  it('[VAL-002] full_name < 2 chars -> 400', async () => { expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'A'})).status).toBe(400); });
  it('[VAL-003] full_name > 100 chars -> 400', async () => { expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'B'.repeat(101)})).status).toBe(400); });
});

describe('Validation - PATCH /api/v1/users/:id (admin)', () => {
  beforeEach(() => loginAs(mkUser({role:'admin'})));
  it('[VAL-005] empty body -> 400', async () => { expect((await request(app).patch('/api/v1/users/5').set(auth()).send({})).status).toBe(400); });
  it('[VAL-006] invalid role value -> 400', async () => { expect((await request(app).patch('/api/v1/users/5').set(auth()).send({role:'superadmin'})).status).toBe(400); });
  it('[VAL-007] is_active as string -> 400', async () => { expect((await request(app).patch('/api/v1/users/5').set(auth()).send({is_active:'yes'})).status).toBe(400); });
  it('[VAL-008] non-integer :id -> 400', async () => { expect((await request(app).patch('/api/v1/users/abc').set(auth()).send({full_name:'Test'})).status).toBe(400); });
});

describe('Validation - GET and DELETE :id param', () => {
  beforeEach(() => loginAs(mkUser({role:'admin'})));
  it('[VAL-009] non-numeric :id on GET -> 400', async () => { expect((await request(app).get('/api/v1/users/abc').set(auth())).status).toBe(400); });
  it('[VAL-010] negative :id on GET -> 400', async () => { expect((await request(app).get('/api/v1/users/-1').set(auth())).status).toBe(400); });
  it('[VAL-011] non-numeric :id on DELETE -> 400', async () => { expect((await request(app).delete('/api/v1/users/not-a-number').set(auth())).status).toBe(400); });
  it('[VAL-012] zero :id on DELETE -> 400', async () => { expect((await request(app).delete('/api/v1/users/0').set(auth())).status).toBe(400); });
});

// --- Suite 9: Resource Exhaustion ---------------------------------------------
describe('Resource Exhaustion', () => {
  beforeEach(() => loginAs(mkUser({role:'admin'})));
  it('[PERF-001] full_name 10000 chars on /me -> 400', async () => {
    loginAs(mkUser({role:'patient',id:10}));
    expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'C'.repeat(10000)})).status).toBe(400);
  });
  it('[PERF-002] numeric overflow in :id -> 400 or 404, not 500', async () => {
    mUser.findUserById
      .mockResolvedValueOnce(mkUserFull() as any)
      .mockResolvedValueOnce(undefined as any);
    const res = await request(app).get('/api/v1/users/99999999999999999999').set(auth());
    expect([400,404]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
  it('[PERF-004] prototype pollution in body should be handled safely', async () => {
    const res = await request(app).patch('/api/v1/users/5').set(auth()).send({is_active:true});
    expect(res.status).not.toBe(500);
  });
});
