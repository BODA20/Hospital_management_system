export const mockedBillingService = {
  createInitialInvoice: jest.fn(),
  addInvoiceItem: jest.fn(),
  processPayment: jest.fn(),
  getPatientInvoices: jest.fn(),
  getDailyRevenue: jest.fn(),
  getInvoiceDetails: jest.fn(),
};
