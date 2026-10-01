export const mockedStaffApplicationRepo = {
  createApplication: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  getAll: jest.fn(),
  getByUserId: jest.fn(),
};

export const makeStaffApplication = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 99,
  user_id: 10,
  requested_role: 'doctor',
  specialization_notes: 'Highly experienced general practitioner.',
  status: 'pending',
  rejection_reason: null,
  created_at: new Date('2024-06-01'),
  ...overrides,
});
