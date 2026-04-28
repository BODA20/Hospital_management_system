export const mockedDoctorsRepo = {
  findByUserId: jest.fn(),
  updateByUserId: jest.fn(),
  getAllDoctors: jest.fn(),
  createDoctor: jest.fn(),
  findById: jest.fn(),
};

export const mockedAppoRepo = {
  findByDoctorId: jest.fn(),
  getByDoctor: jest.fn().mockResolvedValue([]),
  getPatientAppointments: jest.fn(),
};

export const makeDoctor = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 100,
  user_id: 1,
  specialization: 'Cardiology',
  years_of_experience: 5,
  bio: 'Expert heart specialist',
  consultation_fee: 150,
  department_id: 1,
  department_name: 'General',
  ...overrides,
});
