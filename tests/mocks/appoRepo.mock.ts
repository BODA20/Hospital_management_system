export const mockedAppoRepo = {
  findById: jest.fn(),
  updateStatus: jest.fn(),
  checkAvailability: jest.fn(),
  createAppointment: jest.fn(),
  getByPatient: jest.fn(),
  getByDoctor: jest.fn(),
  getDoctorDailySchedule: jest.fn(),
};
