jest.mock('../../src/modules/nurses/repositories/nurse.repository', () => require('../mocks/nursesRepo.mock').mockedNursesRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/department/repositories/department.repo', () => require('../mocks/nursesRepo.mock').mockedDeptRepo);

import { mockedNursesRepo as mNurse, makeNurse as mkNurse, mockedDeptRepo as mDept, makeDept as mkDept } from '../mocks/nursesRepo.mock';
import { mockedDoctorsRepo as mDoctor, makeDoctor as mkDoctor } from '../mocks/doctorsRepo.mock';
import * as svc from '../../src/modules/nurses/services/nurse.service';

const body = () => ({user_id:200,department_id:10,doctor_id:50,license_number:'LIC-001',shift:'morning',years_of_experience:3,notes:'Test nurse'});

describe('NURSES SERVICE', () => {
  beforeEach(() => jest.clearAllMocks());

  it('[BIZ-001] createNurse throws 404 when department missing', async () => {
    mDept.findById.mockResolvedValue(null as any);
    await expect(svc.createNurse({user_id:200,department_id:99,doctor_id:50,license_number:'LX',shift:'morning'} as any)).rejects.toMatchObject({statusCode:404});
    expect(mDoctor.findById).not.toHaveBeenCalled();
  });
  it('[BIZ-002] createNurse throws 404 when doctor missing', async () => {
    mDept.findById.mockResolvedValue(mkDept() as any);
    mDoctor.findById.mockResolvedValue(null as any);
    await expect(svc.createNurse({user_id:200,department_id:10,doctor_id:99,license_number:'LX',shift:'morning'} as any)).rejects.toMatchObject({statusCode:404});
  });
  it('[BIZ-003] createNurse throws 422 when doctor in different dept', async () => {
    mDept.findById.mockResolvedValue(mkDept({id:10}) as any);
    mDoctor.findById.mockResolvedValue(mkDoctor({department_id:20}) as any);
    await expect(svc.createNurse({user_id:200,department_id:10,doctor_id:50,license_number:'LC',shift:'morning'} as any)).rejects.toMatchObject({statusCode:422});
    expect(mNurse.createNurse).not.toHaveBeenCalled();
  });
  it('[BIZ-004] createNurse succeeds when dept and doctor match', async () => {
    mDept.findById.mockResolvedValue(mkDept({id:10}) as any);
    mDoctor.findById.mockResolvedValue(mkDoctor({department_id:10}) as any);
    mNurse.createNurse.mockResolvedValue(mkNurse() as any);
    expect(await svc.createNurse(body() as any)).toMatchObject({id:100});
  });
  it('[BIZ-005] updateNurse throws 422 when new doctor in wrong dept', async () => {
    mNurse.findById.mockResolvedValue(mkNurse() as any);
    mDoctor.findById.mockResolvedValue(mkDoctor({department_id:99}) as any);
    mDept.findById.mockResolvedValue(mkDept({id:10}) as any);
    await expect(svc.updateNurse(100,{doctor_id:55} as any)).rejects.toMatchObject({statusCode:422});
    expect(mNurse.updateNurse).not.toHaveBeenCalled();
  });
  it('[BIZ-006] updateNurse skips cross-validation for shift-only update', async () => {
    mNurse.findById.mockResolvedValue(mkNurse() as any);
    mNurse.updateNurse.mockResolvedValue(mkNurse({shift:'night'}) as any);
    const result = await svc.updateNurse(100,{shift:'night'} as any);
    expect(mDoctor.findById).not.toHaveBeenCalled();
    expect(result.shift).toBe('night');
  });
  it('[BIZ-007] getNursesByDoctor throws 404 when no doctor profile', async () => {
    mDoctor.findByUserId.mockResolvedValue(null as any);
    await expect(svc.getNursesByDoctor(999)).rejects.toMatchObject({statusCode:404});
  });
  it('[BIZ-008] getNursesByDoctor returns structured response', async () => {
    mDoctor.findByUserId.mockResolvedValue(mkDoctor({id:50,user_id:5,full_name:'Dr. Smith'}) as any);
    mNurse.getNursesByDoctor.mockResolvedValue([mkNurse()] as any);
    const result = await svc.getNursesByDoctor(5);
    expect(result.doctor_id).toBe(50);
    expect(result.total).toBe(1);
  });
  it('[BIZ-009] deleteNurse throws 404 for non-existent', async () => {
    mNurse.findById.mockResolvedValue(null as any);
    await expect(svc.deleteNurse(9999)).rejects.toMatchObject({statusCode:404});
    expect(mNurse.deleteNurse).not.toHaveBeenCalled();
  });
  it('[BIZ-010] deleteNurse calls repo when nurse exists', async () => {
    mNurse.findById.mockResolvedValue(mkNurse() as any);
    mNurse.deleteNurse.mockResolvedValue(1 as any);
    const result = await svc.deleteNurse(100);
    expect(mNurse.deleteNurse).toHaveBeenCalledWith(100);
    expect(result.message).toMatch(/deleted/i);
  });
});
