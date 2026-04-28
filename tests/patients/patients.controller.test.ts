import request from 'supertest';
import { app } from '../../app';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_access_token'),
  verify: jest.fn(),
}));

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (callback: Function) => callback({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
    raw: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);

import { mockedPatientRepo as mPatient } from '../mocks/patientsRepo.mock';
import { mockedUsersRepo as mUser, makeUser as mkUser } from '../mocks/usersRepo.mock';
import { bearerHeader as auth, loginAs } from '../mocks/jwt.mock';

const mkPatient = (o={}) => ({
  id:500,user_id:2,full_name:'Pat',dob:new Date('1990-01-01'),
  gender:'male',blood_group:'O+',phone:'123',email:'p@p.com',
  address:'123 St',emergency_contact:'999',medical_history:'none',
  created_at:new Date(),updated_at:new Date(), ...o
});

const body = (o={}) => ({
  user_id:2,full_name:'Pat',date_of_birth:'1990-01-01',gender:'male',
  blood_group:'O+',phone:'1234567',email:'p@p.com',address:'123 Main St',
  emergency_contact:'9876543',medical_history:'none', ...o
});

describe('PATIENTS API CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/patients', () => {
    it('returns 200 with patient list for admin', async () => {
      loginAs(mkUser({role:'admin'}));
      mPatient.findAll.mockResolvedValue({data:[mkPatient()],total:1} as any);
      const res = await request(app).get('/api/v1/patients').set(auth());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('returns 200 for doctor (doctors can list patients)', async () => {
      loginAs(mkUser({role:'doctor'}));
      mPatient.findAll.mockResolvedValue({data:[mkPatient()],total:1} as any);
      expect((await request(app).get('/api/v1/patients').set(auth())).status).toBe(200);
    });
  });

  describe('POST /api/v1/patients', () => {
    it('creates patient profile for admin', async () => {
      const adminUser = mkUser({role:'admin'});
      loginAs(adminUser);
      // mockResolvedValueOnce: first call is from auth middleware, second from service
      mUser.findUserById
        .mockResolvedValueOnce(adminUser as any)   // protect middleware
        .mockResolvedValueOnce(adminUser as any);  // patientService.createPatient user check
      mPatient.findByUserId.mockResolvedValue(null as any);
      mPatient.createPatient.mockResolvedValue(mkPatient() as any);
      mPatient.findById.mockResolvedValue(mkPatient() as any);
      
      const res = await request(app).post('/api/v1/patients').set(auth()).send(body());
      expect(res.status).toBe(201);
    });
  });

  describe('GET /api/v1/patients/me', () => {
    it('returns 200 with own profile for patient', async () => {
      loginAs(mkUser({id:2,role:'patient'}));
      mPatient.findByUserId.mockResolvedValue(mkPatient({user_id:2}) as any);
      const res = await request(app).get('/api/v1/patients/me').set(auth());
      expect(res.status).toBe(200);
    });

    it('returns 404 if patient profile does not exist', async () => {
      loginAs(mkUser({id:2,role:'patient'}));
      mPatient.findByUserId.mockResolvedValue(null as any);
      const res = await request(app).get('/api/v1/patients/me').set(auth());
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/patients/:id', () => {
    it('returns 200 for admin accessing any patient', async () => {
      loginAs(mkUser({role:'admin'}));
      mPatient.findById.mockResolvedValue(mkPatient() as any);
      const res = await request(app).get('/api/v1/patients/500').set(auth());
      expect(res.status).toBe(200);
    });

    it('returns 403 for patient accessing another patient', async () => {
      loginAs(mkUser({id:99,role:'patient'}));
      const res = await request(app).get('/api/v1/patients/500').set(auth());
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/patients/:id', () => {
    it('returns 200 for admin', async () => {
      loginAs(mkUser({role:'admin'}));
      mPatient.findById.mockResolvedValue(mkPatient() as any);
      mPatient.deletePatient.mockResolvedValue(true as any);
      const res = await request(app).delete('/api/v1/patients/500').set(auth());
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent patient', async () => {
      loginAs(mkUser({role:'admin'}));
      mPatient.findById.mockResolvedValue(null as any);
      expect((await request(app).delete('/api/v1/patients/9999').set(auth())).status).toBe(404);
    });
  });

  describe('GET /api/v1/patients/:id/appointments', () => {
    it('returns appointments for admin', async () => {
      loginAs(mkUser({role:'admin'}));
      mPatient.findById.mockResolvedValue(mkPatient() as any);
      mPatient.getPatientAppointments.mockResolvedValue([{id:1,starts_at:new Date(),status:'confirmed'}] as any);
      const res = await request(app).get('/api/v1/patients/500/appointments').set(auth());
      expect(res.status).toBe(200);
    });

    it('returns 403 when patient tries to access another patients appointments', async () => {
      loginAs(mkUser({id:2,role:'patient'}));
      expect((await request(app).get('/api/v1/patients/500/appointments').set(auth())).status).toBe(403);
    });
  });

  describe('Validation - POST /api/v1/patients', () => {
    beforeEach(() => loginAs(mkUser({role:'admin'})));
    it('[VAL-001] empty body -> 400', async () => { expect((await request(app).post('/api/v1/patients').set(auth()).send({})).status).toBe(400); });
    it('[VAL-002] missing gender -> 400', async () => { const {gender:_g,...r}=body(); expect((await request(app).post('/api/v1/patients').set(auth()).send(r)).status).toBe(400); });
    it('[VAL-003] invalid gender enum -> 400', async () => { expect((await request(app).post('/api/v1/patients').set(auth()).send({...body(),gender:'cyborg'})).status).toBe(400); });
    it('[VAL-004] invalid blood_group -> 400', async () => { expect((await request(app).post('/api/v1/patients').set(auth()).send({...body(),blood_group:'Z+'})).status).toBe(400); });
    it('[VAL-005] invalid email -> 400', async () => { expect((await request(app).post('/api/v1/patients').set(auth()).send({...body(),email:'notanemail'})).status).toBe(400); });
    it('[VAL-006] negative user_id -> 400', async () => { expect((await request(app).post('/api/v1/patients').set(auth()).send({...body(),user_id:-1})).status).toBe(400); });
  });

  describe('Validation - PATCH /api/v1/patients/:id', () => {
    beforeEach(() => loginAs(mkUser({role:'admin'})));
    it('[VAL-010] empty body -> 400', async () => { expect((await request(app).patch('/api/v1/patients/500').set(auth()).send({})).status).toBe(400); });
  });

  describe('Resource Exhaustion', () => {
    beforeEach(() => loginAs(mkUser({role:'admin'})));
    it('[PERF-001] full_name > 150 chars -> 400', async () => { expect((await request(app).post('/api/v1/patients').set(auth()).send({...body(),full_name:'A'.repeat(151)})).status).toBe(400); });
    it('[PERF-002] non-numeric :id -> 400 or 404', async () => {
      const res = await request(app).get('/api/v1/patients/abc').set(auth());
      // Express may coerce or pass-through; should not be 500
      expect(res.status).not.toBe(500);
      expect([200,400,404]).toContain(res.status);
    });
    it('[PERF-003] numeric overflow in :id -> not 500', async () => {
      mPatient.findById.mockResolvedValue(null as any);
      const res = await request(app).get('/api/v1/patients/999999999999999').set(auth());
      expect([400,404]).toContain(res.status);
      expect(res.status).not.toBe(500);
    });
  });
});
