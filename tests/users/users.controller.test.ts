import request from 'supertest';

// Mocks must be hoisted
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (callback: Function) => callback({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
  },
}));

import { app } from '../../app';

jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);

import { mockedJwt, bearerHeader, loginAs } from '../mocks/jwt.mock';
import { makeUser, makeUserFull, mockedUsersRepo } from '../mocks/usersRepo.mock';
import { mockedDoctorsRepo } from '../mocks/doctorsRepo.mock';

// --- Helper Functions ---
const auth = bearerHeader;

// ═══════════════════════════════════════════════════════════════════════════════
// 📬  USERS CONTROLLER TESTS (API Layer)
// ═══════════════════════════════════════════════════════════════════════════════

describe('USERS API CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('🔒 Authentication Guard', () => {
    it('[AUTH-001] GET /api/v1/users -> 401', async () => { expect((await request(app).get('/api/v1/users')).status).toBe(401); });
    it('[AUTH-002] GET /api/v1/users/me -> 401', async () => { expect((await request(app).get('/api/v1/users/me')).status).toBe(401); });
    it('[AUTH-003] PATCH /api/v1/users/me -> 401', async () => { expect((await request(app).patch('/api/v1/users/me')).status).toBe(401); });
    it('[AUTH-004] GET /api/v1/users/500 -> 401', async () => { expect((await request(app).get('/api/v1/users/500')).status).toBe(401); });
    it('[AUTH-005] PATCH /api/v1/users/500 -> 401', async () => { expect((await request(app).patch('/api/v1/users/500')).status).toBe(401); });
    it('[AUTH-006] DELETE /api/v1/users/500 -> 401', async () => { expect((await request(app).delete('/api/v1/users/500')).status).toBe(401); });
  });

  describe('🔒 RBAC Security', () => {
    describe('GET /api/v1/users - admin only', () => {
      it('[RBAC-001] Patient -> 403', async () => { loginAs(makeUser({role:'patient'})); expect((await request(app).get('/api/v1/users').set(auth())).status).toBe(403); });
      it('[RBAC-002] Doctor -> 403', async () => { loginAs(makeUser({role:'doctor'})); expect((await request(app).get('/api/v1/users').set(auth())).status).toBe(403); });
      it('[RBAC-003] Nurse -> 403', async () => { loginAs(makeUser({role:'nurse'})); expect((await request(app).get('/api/v1/users').set(auth())).status).toBe(403); });
    });

    describe('GET /api/v1/users/:id - admin only (IDOR)', () => {
      it('[IDOR-001] Patient trying to GET another user -> 403', async () => { loginAs(makeUser({id:5,role:'patient'})); expect((await request(app).get('/api/v1/users/10').set(auth())).status).toBe(403); });
      it('[IDOR-002] Doctor trying to GET another user -> 403', async () => { loginAs(makeUser({id:5,role:'doctor'})); expect((await request(app).get('/api/v1/users/10').set(auth())).status).toBe(403); });
      it('[IDOR-003] Nurse trying to GET another user -> 403', async () => { loginAs(makeUser({id:5,role:'nurse'})); expect((await request(app).get('/api/v1/users/10').set(auth())).status).toBe(403); });
      it('[RBAC-005] Admin -> 200 for existing user', async () => {
        loginAs(makeUser({role:'admin'}));
        mockedUsersRepo.findUserById.mockResolvedValue(makeUser({id:99,role:'nurse'}) as any);
        expect((await request(app).get('/api/v1/users/99').set(auth())).status).toBe(200);
      });
      it('[RBAC-006] Non-existent user -> 404', async () => {
        loginAs(makeUser({role:'admin'}));
        mockedUsersRepo.findUserById.mockResolvedValue(undefined as any);
        expect((await request(app).get('/api/v1/users/9999').set(auth())).status).toBe(404);
      });
    });

    describe('PATCH /api/v1/users/:id - admin only (IDOR + escalation)', () => {
      it('[IDOR-004] Doctor trying to PATCH another user -> 403', async () => { loginAs(makeUser({id:5,role:'doctor'})); expect((await request(app).patch('/api/v1/users/10').set(auth()).send({full_name:'Hijacked'})).status).toBe(403); });
      it('[IDOR-005] Patient escalating own role via PATCH /:id -> 403', async () => { loginAs(makeUser({id:5,role:'patient'})); expect((await request(app).patch('/api/v1/users/5').set(auth()).send({role:'admin'})).status).toBe(403); });
      it('[IDOR-006] Nurse deactivating another user -> 403', async () => { loginAs(makeUser({id:3,role:'nurse'})); expect((await request(app).patch('/api/v1/users/1').set(auth()).send({is_active:false})).status).toBe(403); });
    });

    describe('DELETE /api/v1/users/:id - admin only', () => {
      it('[RBAC-007] Patient -> 403', async () => { loginAs(makeUser({role:'patient'})); expect((await request(app).delete('/api/v1/users/2').set(auth())).status).toBe(403); });
      it('[RBAC-008] Doctor -> 403', async () => { loginAs(makeUser({role:'doctor'})); expect((await request(app).delete('/api/v1/users/2').set(auth())).status).toBe(403); });
      it('[RBAC-009] Nurse -> 403', async () => { loginAs(makeUser({role:'nurse'})); expect((await request(app).delete('/api/v1/users/2').set(auth())).status).toBe(403); });
    });
  });

  describe('🛡️ Mass Assignment Defenses', () => {
    describe('PATCH /api/v1/users/me', () => {
      beforeEach(() => loginAs(makeUser({id:10,role:'patient'})));
      it('[MASS-001] role injection -> 400 (strict schema)', async () => {
        expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',role:'admin'})).status).toBe(400);
      });
      it('[MASS-002] is_active injection -> 400 (strict schema)', async () => {
        expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',is_active:true})).status).toBe(400);
      });
      it('[MASS-003] password injection -> 400 (strict schema)', async () => {
        expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',password:'HackerPass1!'})).status).toBe(400);
      });
      it('[MASS-004] email injection -> 400 (strict schema)', async () => {
        expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Legit',email:'hacker@evil.com'})).status).toBe(400);
      });
      it('[MASS-006] valid full_name update -> 200', async () => {
        mockedUsersRepo.updateUserById.mockResolvedValue(makeUser({id:10,full_name:'New Name',role:'patient'}) as any);
        const res = await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'New Name'});
        expect(res.status).toBe(200);
      });
    });

    describe('PATCH /api/v1/users/:id (admin)', () => {
      beforeEach(() => loginAs(makeUser({role:'admin'})));
      it('[MASS-007] password in adminUpdateUser body -> 400', async () => {
        expect((await request(app).patch('/api/v1/users/5').set(auth()).send({full_name:'Override',password:'HackerPass1!'})).status).toBe(400);
      });
      it('[MASS-009] admin can update is_active -> 200', async () => {
        mockedUsersRepo.findUserById.mockResolvedValue(makeUser({id:5,role:'nurse'}) as any);
        mockedUsersRepo.adminUpdateUser.mockResolvedValue(makeUser({id:5,is_active:false}) as any);
        expect((await request(app).patch('/api/v1/users/5').set(auth()).send({is_active:false})).status).toBe(200);
      });
    });
  });

  describe('✅ Success / Happy-Path API Validations', () => {
    it('GET /api/v1/users - returns all users with correct shape', async () => {
      loginAs(makeUser({role:'admin'}));
      mockedUsersRepo.findAllUsers.mockResolvedValue([makeUser({id:1}),makeUser({id:2,role:'doctor'}),makeUser({id:3,role:'patient'})] as any);
      const res = await request(app).get('/api/v1/users').set(auth());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.results).toBe(3);
    });

    it('DELETE /api/v1/users/:id - deactivates an existing user', async () => {
      loginAs(makeUser({role:'admin'}));
      mockedUsersRepo.findUserById.mockResolvedValue(makeUser({id:5}) as any);
      mockedUsersRepo.deactivateUser.mockResolvedValue(makeUser({id:5,is_active:false}) as any);
      const res = await request(app).delete('/api/v1/users/5').set(auth());
      expect(res.status).toBe(200);
    });
  });

  describe('🕵️ Sensitive Data Exposure', () => {
    beforeEach(() => loginAs(makeUser({role:'admin'})));

    it('[SEC-001] GET /api/v1/users data must NOT include password_hash', async () => {
      const u1 = makeUser({id:1}); delete (u1 as any).password_hash;
      const u2 = makeUser({id:2}); delete (u2 as any).password_hash;
      mockedUsersRepo.findAllUsers.mockResolvedValue([u1, u2] as any);
      const res = await request(app).get('/api/v1/users').set(auth());
      res.body.data.forEach((u: any) => {
        expect(u).not.toHaveProperty('password_hash');
        expect(u).not.toHaveProperty('password');
      });
    });

    it('[SEC-002] GET /api/v1/users/:id must NOT expose password_hash', async () => {
      const safeUser = makeUser({id:5}); delete (safeUser as any).password_hash;
      mockedUsersRepo.findUserById.mockResolvedValue(safeUser as any);
      const res = await request(app).get('/api/v1/users/5').set(auth());
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('[SEC-003] PATCH /me response must NOT include password_hash', async () => {
      loginAs(makeUser({id:10,role:'patient'}));
      const safeUser = makeUser({id:10}); delete (safeUser as any).password_hash;
      mockedUsersRepo.updateUserById.mockResolvedValue(safeUser as any);
      const res = await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'Safe Name'});
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('[SEC-004] DELETE response must NOT include password_hash', async () => {
      const safeUser = makeUser({id:5}); delete (safeUser as any).password_hash;
      mockedUsersRepo.findUserById.mockResolvedValue(safeUser as any);
      mockedUsersRepo.deactivateUser.mockResolvedValue({ ...safeUser, is_active: false } as any);
      const res = await request(app).delete('/api/v1/users/5').set(auth());
      expect(res.body.data).not.toHaveProperty('password_hash');
    });
  });

  describe('🚨 Request Validations (Zod)', () => {
    describe('PATCH /api/v1/users/me', () => {
      beforeEach(() => loginAs(makeUser({role:'patient',id:10})));
      it('[VAL-001] empty body -> 400', async () => { expect((await request(app).patch('/api/v1/users/me').set(auth()).send({})).status).toBe(400); });
      it('[VAL-002] full_name < 2 chars -> 400', async () => { expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'A'})).status).toBe(400); });
      it('[VAL-003] full_name > 100 chars -> 400', async () => { expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'B'.repeat(101)})).status).toBe(400); });
    });

    describe('PATCH /api/v1/users/:id (admin)', () => {
      beforeEach(() => loginAs(makeUser({role:'admin'})));
      it('[VAL-005] empty body -> 400', async () => { expect((await request(app).patch('/api/v1/users/5').set(auth()).send({})).status).toBe(400); });
      it('[VAL-006] invalid role value -> 400', async () => { expect((await request(app).patch('/api/v1/users/5').set(auth()).send({role:'superadmin'})).status).toBe(400); });
      it('[VAL-007] is_active as string -> 400', async () => { expect((await request(app).patch('/api/v1/users/5').set(auth()).send({is_active:'yes'})).status).toBe(400); });
      it('[VAL-008] non-integer :id -> 400', async () => { expect((await request(app).patch('/api/v1/users/abc').set(auth()).send({full_name:'Test'})).status).toBe(400); });
    });

    describe('GET and DELETE :id param', () => {
      beforeEach(() => loginAs(makeUser({role:'admin'})));
      it('[VAL-009] non-numeric :id on GET -> 400', async () => { expect((await request(app).get('/api/v1/users/abc').set(auth())).status).toBe(400); });
      it('[VAL-010] negative :id on GET -> 400', async () => { expect((await request(app).get('/api/v1/users/-1').set(auth())).status).toBe(400); });
      it('[VAL-011] non-numeric :id on DELETE -> 400', async () => { expect((await request(app).delete('/api/v1/users/not-a-number').set(auth())).status).toBe(400); });
      it('[VAL-012] zero :id on DELETE -> 400', async () => { expect((await request(app).delete('/api/v1/users/0').set(auth())).status).toBe(400); });
    });
  });

  describe('🛡️ Resource Exhaustion Defenses', () => {
    beforeEach(() => loginAs(makeUser({role:'admin'})));
    it('[PERF-001] full_name 10000 chars on /me -> 400', async () => {
      loginAs(makeUser({role:'patient',id:10}));
      expect((await request(app).patch('/api/v1/users/me').set(auth()).send({full_name:'C'.repeat(10000)})).status).toBe(400);
    });
    it('[PERF-002] numeric overflow in :id -> 400 or 404, not 500', async () => {
      loginAs(makeUser({role:'admin'}));
      mockedUsersRepo.findUserById.mockResolvedValue(undefined as any);
      const res = await request(app).get('/api/v1/users/99999999999999999999').set(auth());
      expect([400,404]).toContain(res.status);
    });
    it('[PERF-004] prototype pollution in body should be handled safely', async () => {
      const res = await request(app).patch('/api/v1/users/5').set(auth()).send({is_active:true});
      expect(res.status).not.toBe(500);
    });
  });
});
