import request from 'supertest';

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

import { app } from '../../app';

jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/appointments/repositories/appo.repo', () => require('../mocks/doctorsRepo.mock').mockedAppoRepo);

import { mockedDoctorsRepo, makeDoctor } from '../mocks/doctorsRepo.mock';
import { mockedUsersRepo, makeUser } from '../mocks/usersRepo.mock';
import { bearerHeader, loginAs } from '../mocks/jwt.mock';

const auth = bearerHeader;

describe('DOCTORS API CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('📬 Public Doctor Routes', () => {
    beforeEach(() => {
      mockedDoctorsRepo.getAllDoctors.mockResolvedValue([makeDoctor(), makeDoctor({ id: 101 })]);
      mockedDoctorsRepo.findById.mockResolvedValue(makeDoctor());
    });

    describe('GET /api/v1/doctors (Search/Filter)', () => {
      it('should return a list of doctors without requiring authentication', async () => {
        const res = await request(app).get('/api/v1/doctors');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.length).toBe(2);
        expect(mockedDoctorsRepo.getAllDoctors).toHaveBeenCalledTimes(1);
      });

      it('(TDD) should support search by name or specialization query params', async () => {
        await request(app).get('/api/v1/doctors?specialization=Cardiology&name=Test');
        expect(mockedDoctorsRepo.getAllDoctors).toHaveBeenCalledWith(
          expect.objectContaining({
            specialization: 'Cardiology',
            name: 'Test',
          })
        );
      });
    });

    describe('GET /api/v1/doctors/:id (Detailed View)', () => {
      it('(TDD) should retrieve a specific doctor including joined data from users table', async () => {
        const dbDoctor = makeDoctor();
        mockedDoctorsRepo.findById.mockResolvedValue({
          ...dbDoctor,
          user: { full_name: 'Dr. Smith', phone: '123456789' }
        } as any);

        const res = await request(app).get(`/api/v1/doctors/${dbDoctor.id}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(dbDoctor.id);
        expect(res.body.data.user).toBeDefined();
      });
    });
  });

  describe('🔒 Protected Doctor Routes & RBAC', () => {
    describe('PATCH /api/v1/doctors/me (Profile Updates)', () => {
      beforeEach(() => {
        const doctorUser = makeUser({ id: 2, role: 'doctor' });
        loginAs(doctorUser);
        mockedDoctorsRepo.findByUserId.mockResolvedValue(makeDoctor({ user_id: 2 }));
        mockedDoctorsRepo.updateByUserId.mockResolvedValue(makeDoctor({ bio: 'New Bio' }));
      });

      it('should allow a doctor to update their own record', async () => {
        const res = await request(app)
          .patch('/api/v1/doctors/me')
          .set(auth())
          .send({ bio: 'New Bio', specialization: 'Neurology' });

        expect(res.status).toBe(200);
        expect(mockedDoctorsRepo.updateByUserId).toHaveBeenCalledWith(2, expect.any(Object), expect.any(Object));
      });

      it('(TDD) should expect complex updates to modify both user and doctor tables', async () => {
        const res = await request(app)
          .patch('/api/v1/doctors/me')
          .set(auth())
          .send({ bio: 'New Bio', phone: '555-5555' });
        expect(res.status).toBe(200);
      });
    });

    describe('(TDD) PATCH /api/v1/doctors/:id (Admin Override & RBAC Guard)', () => {
      it('Admin Case: should verify an Admin can update any doctor\'s profile', async () => {
        loginAs(makeUser({ role: 'admin' }));
        mockedDoctorsRepo.updateByUserId.mockResolvedValue(makeDoctor());

        const res = await request(app)
          .patch('/api/v1/doctors/100')
          .set(auth())
          .send({ consultation_fee: 500 });
        
        expect(res.status).toBe(200);
      });

      it('Security Case: should forbid Doctor A from updating Doctor B\'s schedule/bio', async () => {
        loginAs(makeUser({ id: 5, role: 'doctor' })); 
        const res = await request(app)
          .patch('/api/v1/doctors/10')
          .set(auth())
          .send({ bio: 'Malicious Bio' });
        expect(res.status).toBe(403);
      });
    });

    describe('(TDD) GET /api/v1/doctors/my-appointments', () => {
      it('should return 403 Forbidden when a Patient tries to access doctor appointments', async () => {
        loginAs(makeUser({ id: 99, role: 'patient' }));
        const res = await request(app)
          .get('/api/v1/doctors/my-appointments')
          .set(auth());
        expect(res.status).toBe(403);
      });

      it('should return 200 OK when a Doctor accesses their own appointments', async () => {
        loginAs(makeUser({ id: 2, role: 'doctor' }));
        const res = await request(app)
          .get('/api/v1/doctors/my-appointments')
          .set(auth());
        expect(res.status).toBe(200);
      });
    });
  });
});
