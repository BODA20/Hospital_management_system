import request from 'supertest';
import { app } from '../../app';

jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('mock_access_token'), verify: jest.fn() }));
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (cb: Function) => cb({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
    raw: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/staff_application/repositories/staff_application.repo', () => require('../mocks/staffApplicationRepo.mock').mockedStaffApplicationRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/nurses/repositories/nurse.repository', () => require('../mocks/nursesRepo.mock').mockedNursesRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);

import { mockedStaffApplicationRepo as mApp, makeStaffApplication } from '../mocks/staffApplicationRepo.mock';
import { mockedUsersRepo as mUser, makeUser as mkUser } from '../mocks/usersRepo.mock';
import { bearerHeader as auth, loginAs } from '../mocks/jwt.mock';
import { mockedDoctorsRepo as mDoctor } from '../mocks/doctorsRepo.mock';
import { mockedPatientRepo as mPatient } from '../mocks/patientsRepo.mock';

const PATIENT = mkUser({ id: 10 });
const ADMIN = mkUser({ id: 1, role: 'admin' });
const NEW_APP = makeStaffApplication({ id: 99 });

describe('STAFF APPLICATIONS API CONTROLLER', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/staff-applications', () => {
    describe('✅ Success', () => {
      it('creates staff application', async () => {
        loginAs(PATIENT);
        mApp.findByUserId.mockResolvedValue(undefined as any);
        mApp.createApplication.mockResolvedValue(NEW_APP as any);

        const res = await request(app)
          .post('/api/v1/staff-applications')
          .set(auth())
          .send({ requested_role: 'doctor', specialization_notes: 'Bio notes', requested_shift: 'Morning' });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('success');
      });
    });

    describe('❌ Failure', () => {
      it('unauthenticated -> 401', async () => {
        const res = await request(app)
          .post('/api/v1/staff-applications')
          .send({ requested_role: 'doctor', requested_shift: 'Morning' });

        expect(res.status).toBe(401);
      });

      it('duplicate application -> 400', async () => {
        loginAs(PATIENT);
        mApp.findByUserId.mockResolvedValue(NEW_APP as any);

        const res = await request(app)
          .post('/api/v1/staff-applications')
          .set(auth())
          .send({ requested_role: 'doctor', requested_shift: 'Morning' });

        expect(res.status).toBe(400);
      });
    });
  });

  describe('GET /api/v1/staff-applications/me', () => {
    it('patient gets their own applications', async () => {
      loginAs(PATIENT);
      mApp.getByUserId.mockResolvedValue([NEW_APP] as any);

      const res = await request(app)
        .get('/api/v1/staff-applications/me')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  describe('GET /api/v1/staff-applications', () => {
    it('admin gets all applications', async () => {
      loginAs(ADMIN);
      mApp.getAll.mockResolvedValue([NEW_APP] as any);

      const res = await request(app)
        .get('/api/v1/staff-applications')
        .set(auth());

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('patient -> 403', async () => {
      loginAs(PATIENT);

      const res = await request(app)
        .get('/api/v1/staff-applications')
        .set(auth());

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/staff-applications/:id', () => {
    describe('✅ Success', () => {
      it('admin approves doctor application', async () => {
        loginAs(ADMIN);
        mApp.findById.mockResolvedValue(NEW_APP as any);
        mApp.updateStatus.mockResolvedValue({ ...NEW_APP, status: 'approved' } as any);
        mDoctor.findByUserId.mockResolvedValue(undefined as any);

        const res = await request(app)
          .patch(`/api/v1/staff-applications/${NEW_APP.id}`)
          .set(auth())
          .send({ status: 'approved' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
      });
    });

    describe('❌ Failure & RBAC', () => {
      it('patient -> 403', async () => {
        loginAs(PATIENT);

        const res = await request(app)
          .patch(`/api/v1/staff-applications/${NEW_APP.id}`)
          .set(auth())
          .send({ status: 'approved' });

        expect(res.status).toBe(403);
      });
    });
  });
});
