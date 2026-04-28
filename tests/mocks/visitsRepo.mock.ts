export const mockedVisitsRepo = {
  createVisit: jest.fn(),
  getPatientHistory: jest.fn(),
  getVisitDetails: jest.fn(),
  getAllVisits: jest.fn(),
  getVisitsByDoctor: jest.fn(),
  updateVisit: jest.fn(),
  findRawById: jest.fn(),
  recordVitals: jest.fn(),
  getPendingVisitsForDoctor: jest.fn(),
};
