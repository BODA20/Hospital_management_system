jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/sttaf_request/repositories/staff_request.repo', () => require('../mocks/staffRepo.mock').mockedStaffRequestRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/nurses/repositories/nurse.repository', () => require('../mocks/nursesRepo.mock').mockedNursesRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (cb: Function) => cb({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
    raw: jest.fn().mockResolvedValue([]),
  },
}));

import { mockedStaffRequestRepo as mStaff, makeStaffRequest } from '../mocks/staffRepo.mock';
import { mockedUsersRepo as mUser } from '../mocks/usersRepo.mock';
import { mockedDoctorsRepo as mDoctor } from '../mocks/doctorsRepo.mock';
import { mockedPatientRepo as mPatient } from '../mocks/patientsRepo.mock';
import db from '../../src/config/db';
import * as staffService from '../../src/modules/sttaf_request/services/staff_request.service';

const NEW_REQ = makeStaffRequest({id:99});
const mockedDb = db as any;

describe('STAFF REQUESTS SERVICE (Business Logic)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('approveRequest() Atomicity', () => {
    it('Transaction Rollback: should NOT commit if last step fails', async () => {
      mStaff.findById.mockResolvedValue(NEW_REQ as any);
      mStaff.updateStatus.mockResolvedValue({ ...NEW_REQ, status: 'approved' } as any);
      mUser.adminUpdateUser.mockResolvedValue(undefined as any);
      mDoctor.findByUserId.mockResolvedValue(undefined as any);
      mDoctor.createDoctor.mockResolvedValue({ id: 1, user_id: 10 } as any);

      mPatient.deleteByUserId.mockRejectedValue(new Error('DB error'));
      
      mockedDb.transaction.mockImplementationOnce(async (cb: Function) => {
        try {
          return await cb({});
        } catch (err) {
          throw err;
        }
      });

      await expect(staffService.approveRequest(99, 1)).rejects.toBeDefined();
    });

    it('Happy Path: executes all atomic steps', async () => {
      mockedDb.transaction.mockImplementation(async (cb: Function) => cb({}));
      mStaff.findById.mockResolvedValue(NEW_REQ as any);
      mStaff.updateStatus.mockResolvedValue({ ...NEW_REQ, status: 'approved' } as any);
      mUser.adminUpdateUser.mockResolvedValue(undefined as any);
      mDoctor.findByUserId.mockResolvedValue(undefined as any);
      mDoctor.createDoctor.mockResolvedValue({ id: 1, user_id: 10 } as any);
      mPatient.deleteByUserId.mockResolvedValue(1 as any);

      await staffService.approveRequest(99, 1);

      expect(mStaff.updateStatus).toHaveBeenCalledTimes(1);
      expect(mUser.adminUpdateUser).toHaveBeenCalledTimes(1);
      expect(mDoctor.createDoctor).toHaveBeenCalledTimes(1);
      expect(mPatient.deleteByUserId).toHaveBeenCalledTimes(1);
    });
  });

  describe('createStaffRequest()', () => {
    it('creates request', async () => {
      mStaff.findByUserId.mockResolvedValue(undefined as any);
      mStaff.createRequest.mockResolvedValue(NEW_REQ as any);
      const res = await staffService.createStaffRequest(10, 'doctor');
      expect(res).toMatchObject({ id: 99 });
    });

    it('throws if already exists', async () => {
      mStaff.findByUserId.mockResolvedValue(NEW_REQ as any);
      await expect(staffService.createStaffRequest(10, 'doctor')).rejects.toMatchObject({statusCode:400});
    });
  });
});
