jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);
jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);

import { mockedPatientRepo as mPatient } from '../mocks/patientsRepo.mock';
import { mockedUsersRepo as mUser, makeUser as mkUser } from '../mocks/usersRepo.mock';
import * as svc from '../../src/modules/patients/services/patient.service';

const mkPatient = (o={}) => ({
  id:500,user_id:2,full_name:'Pat',dob:new Date('1990-01-01'),
  gender:'male',blood_group:'O+',phone:'123',email:'p@p.com',
  address:'123 St',emergency_contact:'999',medical_history:'none',
  created_at:new Date(),updated_at:new Date(), ...o
});

const body = (o={}) => ({
  user_id:2,full_name:'Pat',dob:'1990-01-01',gender:'male',
  blood_group:'O+',phone:'123',email:'p@p.com',address:'123',
  emergency_contact:'999',medical_history:'none', ...o
});

describe('PATIENTS SERVICE (Business Logic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('[BIZ-001] createPatient throws 404 when user_id has no user', async () => {
    mUser.findUserById.mockResolvedValue(undefined as any);
    await expect(svc.createPatient(body() as any)).rejects.toMatchObject({statusCode:404});
    expect(mPatient.createPatient).not.toHaveBeenCalled();
  });

  it('[BIZ-002] createPatient throws 409 when user already has profile', async () => {
    mUser.findUserById.mockResolvedValue(mkUser() as any);
    mPatient.findByUserId.mockResolvedValue(mkPatient() as any);
    await expect(svc.createPatient(body() as any)).rejects.toMatchObject({statusCode:409});
    expect(mPatient.createPatient).not.toHaveBeenCalled();
  });

  it('[BIZ-003] getMyProfile throws 404 when no profile for user', async () => {
    mPatient.findByUserId.mockResolvedValue(null as any);
    await expect(svc.getMyProfile(9999)).rejects.toMatchObject({statusCode:404});
  });

  it('[BIZ-004] getMyAppointments throws 404 when no patient profile', async () => {
    mPatient.findByUserId.mockResolvedValue(null as any);
    await expect(svc.getMyAppointments(9999)).rejects.toMatchObject({statusCode:404});
    expect(mPatient.getPatientAppointments).not.toHaveBeenCalled();
  });

  it('[BIZ-005] getPatientAppointments validates patient exists first', async () => {
    mPatient.findById.mockResolvedValue(null as any);
    await expect(svc.getPatientAppointments(9999)).rejects.toMatchObject({statusCode:404});
    expect(mPatient.getPatientAppointments).not.toHaveBeenCalled();
  });

  it('[BIZ-006] getAllPatients correctly calculates totalPages', async () => {
    mPatient.findAll.mockResolvedValue({data:[mkPatient()],total:55} as any);
    const result = await svc.getAllPatients({page:1,limit:20});
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(55);
  });
});
