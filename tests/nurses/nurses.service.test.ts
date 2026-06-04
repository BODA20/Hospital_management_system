jest.mock('../../src/modules/nurses/repositories/nurse.repository', () => require('../mocks/nursesRepo.mock').mockedNursesRepo);
jest.mock('../../src/modules/doctors/repositories/doctor.repo', () => require('../mocks/doctorsRepo.mock').mockedDoctorsRepo);
jest.mock('../../src/modules/department/repositories/department.repo', () => require('../mocks/nursesRepo.mock').mockedDeptRepo);

import { mockedNursesRepo as mNurse, makeNurse as mkNurse, mockedDeptRepo as mDept, makeDept as mkDept } from '../mocks/nursesRepo.mock';
import { mockedDoctorsRepo as mDoctor, makeDoctor as mkDoctor } from '../mocks/doctorsRepo.mock';
import * as svc from '../../src/modules/nurses/services/nurse.service';

const body = () => ({user_id:200,department_id:10,shift:'morning',years_of_experience:3,notes:'Test nurse'});

describe('NURSES SERVICE', () => {
  beforeEach(() => jest.clearAllMocks());

  it('[BIZ-001] createNurse throws 404 when department missing', async () => {
    mDept.findById.mockResolvedValue(null as any);
    await expect(svc.createNurse({user_id:200,department_id:99,shift:'morning'} as any)).rejects.toMatchObject({statusCode:404});
  });
  it('[BIZ-004] createNurse succeeds when dept exists', async () => {
    mDept.findById.mockResolvedValue(mkDept({id:10}) as any);
    mNurse.createNurse.mockResolvedValue(mkNurse() as any);
    expect(await svc.createNurse(body() as any)).toMatchObject({id:100});
  });
  it('[BIZ-006] updateNurse skips cross-validation for shift-only update', async () => {
    mNurse.findById.mockResolvedValue(mkNurse() as any);
    mNurse.updateNurse.mockResolvedValue(mkNurse({shift:'night'}) as any);
    const result = await svc.updateNurse(100,{shift:'night'} as any);
    expect(result.shift).toBe('night');
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
