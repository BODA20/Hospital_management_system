import { makeUser, makeUserFull, mockedUsersRepo } from '../mocks/usersRepo.mock';
import { mockedDoctorsRepo } from '../mocks/doctorsRepo.mock';
import * as userService from '../../src/modules/users/services/user.service';
import db from '../../src/config/db';

jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);

jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn(async (cb) => {
      // Execute the callback with a fake transaction object
      return cb({ __fakeTransaction: true });
    }),
  },
}));

const mDb = db as jest.Mocked<typeof db>;

describe('SERVICE: userService (Business Logic Layer)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('adminUpdateUser()', () => {
    it('[TXN-001] wraps doctor role update in transaction', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(makeUserFull({id:5,role:'nurse'}) as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(makeUser({id:5,role:'doctor'}) as any);
      mockedDoctorsRepo.findByUserId.mockResolvedValue(null as any);
      mockedDoctorsRepo.createDoctor.mockResolvedValue({id:999} as any);

      await userService.adminUpdateUser(5, {role:'doctor'});
      expect(mDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('[TXN-002] creates doctor profile when role changes to doctor and no profile exists', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(makeUserFull({id:5,role:'patient'}) as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(makeUser({id:5,role:'doctor'}) as any);
      mockedDoctorsRepo.findByUserId.mockResolvedValue(null as any);
      mockedDoctorsRepo.createDoctor.mockResolvedValue({id:999} as any);

      await userService.adminUpdateUser(5, {role:'doctor', specialization:'Neurology'} as any);
      expect(mockedDoctorsRepo.createDoctor).toHaveBeenCalledWith(
        expect.objectContaining({user_id:5, specialization:'Neurology'}),
        expect.anything()
      );
    });

    it('[TXN-003] does NOT create duplicate doctor profile if one already exists', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(makeUserFull({id:5,role:'patient'}) as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(makeUser({id:5,role:'doctor'}) as any);
      mockedDoctorsRepo.findByUserId.mockResolvedValue({id:50, user_id:5} as any);

      await userService.adminUpdateUser(5, {role:'doctor'});
      expect(mockedDoctorsRepo.createDoctor).not.toHaveBeenCalled();
    });

    it('[TXN-004] does NOT use transaction for non-doctor updates', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(makeUserFull({id:5,role:'doctor'}) as any);
      mockedUsersRepo.adminUpdateUser.mockResolvedValue(makeUser({id:5,is_active:false}) as any);

      await userService.adminUpdateUser(5, {is_active:false});
      expect(mDb.transaction).not.toHaveBeenCalled();
    });

    it('[TXN-005] transaction rollback: error from createDoctor propagates', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(makeUserFull({id:5,role:'patient'}) as any);
      mDb.transaction.mockImplementationOnce(async (cb: Function) => {
        mockedUsersRepo.adminUpdateUser.mockResolvedValue(makeUser({id:5,role:'doctor'}) as any);
        mockedDoctorsRepo.findByUserId.mockResolvedValue(null as any);
        mockedDoctorsRepo.createDoctor.mockRejectedValue(new Error('DB constraint'));
        return cb({});
      });

      await expect(userService.adminUpdateUser(5, {role:'doctor'})).rejects.toThrow('DB constraint');
      expect(mDb.transaction).toHaveBeenCalledTimes(1);
    });

    it('[TXN-006] throws 404 when target user does not exist', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(undefined as any);
      await expect(userService.adminUpdateUser(9999, {is_active:false})).rejects.toMatchObject({statusCode:404});
      expect(mockedUsersRepo.adminUpdateUser).not.toHaveBeenCalled();
    });
  });

  describe('getUserById()', () => {
    it('[TXN-008] getUserById throws 404 when user missing', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(undefined as any);
      await expect(userService.getUserById(9999)).rejects.toMatchObject({statusCode:404});
    });

    it('[TXN-009] getUserById returns user when found', async () => {
      mockedUsersRepo.findUserById.mockResolvedValue(makeUser({id:5}) as any);
      expect(await userService.getUserById(5)).toMatchObject({id:5});
    });
  });
});
