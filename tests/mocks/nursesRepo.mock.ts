export const mockedNursesRepo = {
  createNurse: jest.fn(),
  getNurses: jest.fn(),
  getNursesByDepartment: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  updateNurse: jest.fn(),
  deleteNurse: jest.fn()
};

export const mockedDeptRepo = {
  findById: jest.fn(),
  createDepartment: jest.fn(),
  countDepartments: jest.fn()
};

export const makeDept = (o: any = {}) => ({
  id:10,name:'ICU',code:'ICU-01',description:'ICU',...o
});

export const makeNurse = (o: any = {}) => ({
  id:100,user_id:200,department_id:10,
  shift:'morning',years_of_experience:3,notes:'Reliable',nurse_name:'Nurse Jane',
  nurse_email:'j@e.com',department_name:'ICU',
  department_code:'ICU-01',created_at:new Date(),updated_at:new Date(),...o
});
