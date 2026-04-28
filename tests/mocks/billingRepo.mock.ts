export const mockedBillingRepo = {
  createInitialInvoice: jest.fn(),
  getInvoiceById: jest.fn(),
  getInvoiceWithItems: jest.fn(),
  addInvoiceItem: jest.fn(),
  processPayment: jest.fn(),
  getPatientInvoices: jest.fn(),
  getDailyRevenue: jest.fn(),
};

export const makeInvoice = (o: Record<string, any> = {}) => ({
  id: 10, invoice_no: 'INV-2026-001', patient_id: 5, visit_id: 1,
  total_amount: 200.00, discount: 0, tax: 0, final_amount: 200.00,
  status: 'pending', payment_method: null,
  created_at: new Date(), updated_at: new Date(), ...o,
});

export const makeItem = (o: Record<string, any> = {}) => ({
  id: 1, invoice_id: 10, description: 'Lab Test', quantity: 1,
  unit_price: 100.00, line_total: 100.00, created_at: new Date(), ...o,
});

export const mockedStripeService = {
  createCheckoutSession: jest.fn(),
  verifyWebhookEvent: jest.fn(),
};
