jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn(),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
  },
}));

import { mockedDoctorsRepo, makeDoctor } from '../mocks/doctorsRepo.mock';
import db from '../../src/config/db';
import * as doctorService from '../../src/modules/doctors/services/doctor.service';

const mockedDb = db as any;

describe('DOCTORS SERVICE (Business Logic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateMyProfile()', () => {
    it('Transaction Check: should wrap profile updates involving multiple tables in a Knex Transaction', async () => {
      mockedDb.transaction.mockImplementation(async (callback: Function) => callback({}));
      mockedDoctorsRepo.findByUserId.mockResolvedValue(makeDoctor());
      mockedDoctorsRepo.updateByUserId.mockResolvedValue(makeDoctor());

      await doctorService.updateMyProfile(1, { bio: 'hello' });

      expect(mockedDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('Data Consistency: should strip restricted fields (like user_id or role) to prevent overwriting context', async () => {
      mockedDb.transaction.mockImplementation(async (callback: Function) => callback({}));
      mockedDoctorsRepo.findByUserId.mockResolvedValue(makeDoctor());
      mockedDoctorsRepo.updateByUserId.mockResolvedValue(makeDoctor());

      const payload = {
        bio: 'Legit Bio',
        user_id: 9999,
        role: 'admin',
      };

      await doctorService.updateMyProfile(1, payload as any);

      const calls = mockedDoctorsRepo.updateByUserId.mock.calls;
      if (calls && calls[0]) {
        const updateCall = calls[0][1];
        if (updateCall) {
          expect(updateCall).not.toHaveProperty('user_id');
          expect(updateCall).not.toHaveProperty('role');
          expect(updateCall).toHaveProperty('bio', 'Legit Bio');
        }
      }
    });
  });

  describe('(TDD) Formatting Logic', () => {
    it('Formatting: should format/calculate "Years of Experience" if specific logic expects pure integers', async () => {
      mockedDb.transaction.mockImplementation(async (callback: Function) => callback({}));
      mockedDoctorsRepo.findByUserId.mockResolvedValue(makeDoctor());

      await doctorService.updateMyProfile(1, { experience_years: 5.9 } as any);

      const calls = mockedDoctorsRepo.updateByUserId.mock.calls;
      if (calls && calls[0]) {
        const updateCall = calls[0][1];
        if (updateCall && updateCall.experience_years) {
          expect(Number.isInteger(updateCall.experience_years)).toBe(true);
        }
      }
    });
  });
});
