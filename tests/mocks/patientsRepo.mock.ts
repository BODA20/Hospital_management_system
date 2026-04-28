export const mockedPatientRepo = {
  createBasePatient: jest.fn(),
  createPatient: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  deleteByUserId: jest.fn(),
  updatePatient: jest.fn(),
  deletePatient: jest.fn(),
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  getPatientAppointments: jest.fn(),
};
