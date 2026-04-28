export const mockedStaffRequestRepo = {
  createRequest: jest.fn(),
  findByUserId: jest.fn(),
  findById: jest.fn(),
  findAll: jest.fn(),
  updateStatus: jest.fn(),
  getPendingRequestByUserId: jest.fn(),
  getAllPending: jest.fn()
};

export const makeStaffRequest = (overrides: Partial<Record<string, any>> = {}) => ({
  id: 99,
  user_id: 10,
  requested_role: 'doctor',
  status: 'pending',
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: new Date('2024-06-01'),
  ...overrides,
});
