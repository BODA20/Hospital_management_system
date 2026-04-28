export const mockedAppointmentsRepo = {
  createAppointment: jest.fn(),
  checkAvailability: jest.fn(),
  findById: jest.fn(),
  getByPatient: jest.fn(),
  getByDoctor: jest.fn(),
  getDoctorDailySchedule: jest.fn(),
  updateStatus: jest.fn(),
  
  // Aliases/Requested names for compatibility with specific test patterns if needed
  create: jest.fn(),
  findAll: jest.fn(),
  findOverlapping: jest.fn(),
  findDailyByDoctorId: jest.fn(),
  deleteById: jest.fn(),
};
