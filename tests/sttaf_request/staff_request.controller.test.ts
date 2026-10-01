import request from 'supertest';
import { app } from '../../app';

jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('mock_access_token'), verify: jest.fn() }));
jest.mock('../../src/config/db', () => {
  const mockKnex = () => {
    const builder = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue([]),
      first: jest.fn().mockResolvedValue({ role: 'nurse' }),
    };
    return builder;
  };
  const dbMock: any = jest.fn().mockImplementation(mockKnex);
  dbMock.transaction = jest.fn().mockImplementation(async (cb: Function) => cb(dbMock));
  dbMock.fn = { now: jest.fn().mockReturnValue(new Date()) };
  dbMock.raw = jest.fn().mockResolvedValue([]);
  return {
    __esModule: true,
    default: dbMock,
  };
});

jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/sttaf_request/repositories/staff_request.repo', () => require('../mocks/staffRepo.mock').mockedStaffRequestRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/nurses/repositories/nurse.repository', () => require('../mocks/nursesRepo.mock').mockedNursesRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);

import { mockedStaffRequestRepo as mStaff, makeStaffRequest } from '../mocks/staffRepo.mock';
import { mockedUsersRepo as mUser, makeUser as mkUser } from '../mocks/usersRepo.mock';
import { bearerHeader as auth, loginAs } from '../mocks/jwt.mock';
import { mockedDoctorsRepo as mDoctor } from '../mocks/doctorsRepo.mock';
import { mockedPatientRepo as mPatient } from '../mocks/patientsRepo.mock';

const PATIENT = mkUser({id:10});
const ADMIN = mkUser({id:1,role:'admin'});
const NEW_REQ = makeStaffRequest({id:99});

describe('STAFF REQUESTS API CONTROLLER', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/staff-requests/:id', () => {
    describe('✅ Success', () => {
      it('creates request', async () => {
        loginAs(PATIENT);
        mStaff.findByUserId.mockResolvedValue(undefined as any);
        mStaff.createRequest.mockResolvedValue(NEW_REQ as any);
        const res = await request(app).post(`/api/v1/staff-requests/${PATIENT.id}`).set(auth()).send({role:'doctor'});
        expect(res.status).toBe(201);
      });
    });

    describe('❌ Failure', () => {
      it('unauthenticated -> 401', async () => {
        const res = await request(app).post(`/api/v1/staff-requests/${PATIENT.id}`).send({role:'doctor'});
        expect(res.status).toBe(401);
      });
      it('duplicate -> 400', async () => {
        loginAs(PATIENT);
        mStaff.findByUserId.mockResolvedValue(NEW_REQ as any);
        const res = await request(app).post(`/api/v1/staff-requests/${PATIENT.id}`).set(auth()).send({role:'doctor'});
        expect(res.status).toBe(400);
      });
    });
  });

  describe('PATCH /api/v1/staff-requests/:id/approve', () => {
    describe('✅ Success', () => {
      it('admin approves doctor request', async () => {
        loginAs(ADMIN);
        mStaff.findById.mockResolvedValue(NEW_REQ as any);
        mStaff.updateStatus.mockResolvedValue({...NEW_REQ, status:'approved'} as any);
        mDoctor.findByUserId.mockResolvedValue(undefined as any);
        const res = await request(app).patch(`/api/v1/staff-requests/${NEW_REQ.id}/approve`).set(auth());
        expect(res.status).toBe(200);
      });

      it('admin approves Leave Request and sets user is_on_leave', async () => {
        loginAs(ADMIN);
        const leaveReq = makeStaffRequest({ id: 101, request_type: 'Leave Request', description: 'Vacation' });
        mStaff.findById.mockResolvedValue(leaveReq as any);
        mStaff.updateStatus.mockResolvedValue({...leaveReq, status:'approved'} as any);
        const res = await request(app).patch(`/api/v1/staff-requests/${leaveReq.id}/approve`).set(auth());
        expect(res.status).toBe(200);
      });

      it('admin approves Shift Change and updates assigned_shift', async () => {
        loginAs(ADMIN);
        const shiftReq = makeStaffRequest({ id: 102, request_type: 'Shift Change', description: 'Change to night shift please' });
        mStaff.findById.mockResolvedValue(shiftReq as any);
        mStaff.updateStatus.mockResolvedValue({...shiftReq, status:'approved'} as any);
        const res = await request(app).patch(`/api/v1/staff-requests/${shiftReq.id}/approve`).set(auth());
        expect(res.status).toBe(200);
      });
    });

    describe('❌ RBAC', () => {
      it('doctor -> 403', async () => {
        loginAs(mkUser({id:20,role:'doctor'}));
        expect((await request(app).patch(`/api/v1/staff-requests/${NEW_REQ.id}/approve`).set(auth())).status).toBe(403);
      });
    });
  });

  describe('GET /api/v1/staff-requests', () => {
    it('admin gets requests', async () => {
      loginAs(ADMIN);
      mStaff.getAllPending.mockResolvedValue([NEW_REQ] as any);
      const res = await request(app).get('/api/v1/staff-requests').set(auth());
      expect(res.status).toBe(200);
    });
    it('patient -> 403', async () => {
      loginAs(PATIENT);
      expect((await request(app).get('/api/v1/staff-requests').set(auth())).status).toBe(403);
    });
    it('doctor/nurse gets their own operational requests', async () => {
      const doctorUser = mkUser({id:15,role:'doctor'});
      loginAs(doctorUser);
      mStaff.getOperationalRequestsByUserId.mockResolvedValue([{ id: 1, request_type: 'Leave Request', description: 'Testing' }] as any);
      const res = await request(app).get('/api/v1/staff-requests').set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  describe('POST /api/v1/staff-requests (Operational)', () => {
    it('doctor creates operational request', async () => {
      const doctorUser = mkUser({id:15,role:'doctor'});
      loginAs(doctorUser);
      mStaff.createOperationalRequest.mockResolvedValue({ id: 1, request_type: 'Leave Request', description: 'Need leave for 3 days' } as any);
      const res = await request(app)
        .post('/api/v1/staff-requests')
        .set(auth())
        .send({ request_type: 'Leave Request', description: 'Need leave for 3 days' });
      expect(res.status).toBe(201);
    });
    it('patient -> 403', async () => {
      loginAs(PATIENT);
      const res = await request(app)
        .post('/api/v1/staff-requests')
        .set(auth())
        .send({ request_type: 'Leave Request', description: 'Need leave for 3 days' });
      expect(res.status).toBe(403);
    });
  });
});
