import request from 'supertest';
import { app } from '../../app';

jest.mock('jsonwebtoken', () => ({ sign: jest.fn().mockReturnValue('mock_token'), verify: jest.fn() }));
jest.mock('../../src/config/db', () => ({
  __esModule: true,
  default: {
    transaction: jest.fn().mockImplementation(async (cb: Function) => cb({})),
    fn: { now: jest.fn().mockReturnValue(new Date()) },
    raw: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../src/modules/billing/repositories/billing.repo', () => require('../mocks/billingRepo.mock').mockedBillingRepo);
jest.mock('../../src/modules/billing/services/stripe.service', () => ({
  stripeService: require('../mocks/billingRepo.mock').mockedStripeService,
  stripe: {},
}));
jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);
jest.mock('../../src/modules/patients/repositories/patient.repository', () => require('../mocks/patientsRepo.mock').mockedPatientRepo);

import { mockedBillingRepo as mBill, makeInvoice, makeItem, mockedStripeService as mStripe } from '../mocks/billingRepo.mock';
import { mockedUsersRepo as mUser, makeUser as mkUser } from '../mocks/usersRepo.mock';
import { mockedPatientRepo as mPatient } from '../mocks/patientsRepo.mock';
import { bearerHeader as auth, loginAs } from '../mocks/jwt.mock';

describe('BILLING API CONTROLLER', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock behavior for patient lookup to avoid IDOR failures
    mPatient.findByUserId.mockResolvedValue({ id: 5 } as any);
  });

  describe('Authentication Guard', () => {
    it('[AUTH-001] GET /api/v1/billing/invoices/10 without token → 401', async () => {
      const res = await request(app).get('/api/v1/billing/invoices/10');
      expect(res.status).toBe(401);
    });
    it('[AUTH-002] POST /api/v1/billing/invoices/10/items without token → 401', async () => {
      const res = await request(app).post('/api/v1/billing/invoices/10/items').send({ description: 'X', quantity: 1, unit_price: 50 });
      expect(res.status).toBe(401);
    });
    it('[AUTH-003] POST /api/v1/billing/invoices/10/pay without token → 401', async () => {
      const res = await request(app).post('/api/v1/billing/invoices/10/pay').send({ payment_method: 'cash' });
      expect(res.status).toBe(401);
    });
    it('[AUTH-004] GET /api/v1/billing/invoices/reports/daily-revenue without token → 401', async () => {
      const res = await request(app).get('/api/v1/billing/invoices/reports/daily-revenue');
      expect(res.status).toBe(401);
    });
  });

  describe('RBAC Enforcement', () => {
    describe('POST /api/v1/billing/invoices/:id/pay', () => {
      it('[RBAC-001] Patient trying to pay → 403', async () => {
        loginAs(mkUser({ role: 'patient' }));
        const res = await request(app).post('/api/v1/billing/invoices/10/pay').set(auth()).send({ payment_method: 'cash' });
        expect(res.status).toBe(403);
      });
      it('[RBAC-002] Doctor trying to process payment → 403', async () => {
        loginAs(mkUser({ role: 'doctor' }));
        const res = await request(app).post('/api/v1/billing/invoices/10/pay').set(auth()).send({ payment_method: 'cash' });
        expect(res.status).toBe(403);
      });
    });

    describe('GET /api/v1/billing/invoices/reports/daily-revenue', () => {
      it('[RBAC-006] Admin CAN view revenue report → 200', async () => {
        loginAs(mkUser({ role: 'admin' }));
        mBill.getDailyRevenue.mockResolvedValue(5000 as any);
        const res = await request(app).get('/api/v1/billing/invoices/reports/daily-revenue').set(auth());
        expect(res.status).toBe(200);
        expect(res.body.data.revenue).toBe(5000);
      });
    });
  });

  describe('IDOR / Mass Assignment', () => {
    it('[IDOR-001] Patient A cannot pay Patient B invoice by guessing ID — role blocks it → 403', async () => {
      loginAs(mkUser({ id: 99, role: 'patient' }));
      mBill.getInvoiceWithItems.mockResolvedValue(makeInvoice({ patient_id: 5 }) as any);
      const res = await request(app).post('/api/v1/billing/invoices/10/pay').set(auth()).send({ payment_method: 'cash' });
      expect(res.status).toBe(403);
    });

    it('[MASS-002] POST /:id/pay strips extra fields — only payment_method matters', async () => {
      loginAs(mkUser({ role: 'admin' }));
      mBill.getInvoiceById.mockResolvedValue(makeInvoice() as any);
      mBill.processPayment.mockResolvedValue(makeInvoice({ status: 'paid' }) as any);

      const res = await request(app).post('/api/v1/billing/invoices/10/pay').set(auth()).send({ payment_method: 'cash', status: 'paid', final_amount: 0 });
      expect(res.status).toBe(200);
      expect(mBill.processPayment).toHaveBeenCalledWith(10, 'cash');
    });
  });

  describe('Happy-Path Integration', () => {
    it('[HAPPY-001] admin retrieves existing invoice → 200 with items', async () => {
      loginAs(mkUser({ role: 'admin' }));
      mBill.getInvoiceWithItems.mockResolvedValue({ ...makeInvoice(), items: [makeItem()] } as any);
      const res = await request(app).get('/api/v1/billing/invoices/10').set(auth());
      expect(res.status).toBe(200);
    });

    it('[HAPPY-003] admin processes cash payment → 200', async () => {
      loginAs(mkUser({ role: 'admin' }));
      mBill.getInvoiceById.mockResolvedValue(makeInvoice() as any);
      mBill.processPayment.mockResolvedValue(makeInvoice({ status: 'paid', payment_method: 'cash' }) as any);
      const res = await request(app).post('/api/v1/billing/invoices/10/pay').set(auth()).send({ payment_method: 'cash' });
      expect(res.status).toBe(200);
    });
  });

  describe('Validation', () => {
    beforeEach(() => loginAs(mkUser({ role: 'admin' })));
    it('[VAL-001] POST /:id/pay with invalid payment_method → 400', async () => {
      const res = await request(app).post('/api/v1/billing/invoices/10/pay').set(auth()).send({ payment_method: 'bitcoin' });
      expect(res.status).toBe(400);
    });
    it('[VAL-003] POST /:id/items with negative unit_price → 400', async () => {
      const res = await request(app).post('/api/v1/billing/invoices/10/items').set(auth()).send({ description: 'X', quantity: 1, unit_price: -50 });
      expect(res.status).toBe(400);
    });
  });

  describe('Edge Cases / Reporting', () => {
    it('[REPORT-001] admin retrieves patient invoice list → 200', async () => {
      loginAs(mkUser({ role: 'admin' }));
      mBill.getPatientInvoices.mockResolvedValue([makeInvoice()] as any);
      const res = await request(app).get('/api/v1/billing/invoices/patient/5').set(auth());
      expect(res.status).toBe(200);
    });
  });

  describe('Stripe Checkout', () => {
    it('[STRIPE-001] patient can create Stripe checkout session for pending invoice → 200', async () => {
      loginAs(mkUser({ id: 5, role: 'patient' }));
      mBill.getInvoiceWithItems.mockResolvedValue({ ...makeInvoice({ patient_id: 5 }), items: [] } as any);
      mStripe.createCheckoutSession.mockResolvedValue({ url: 'https://stripe.com/pay/abc123' } as any);

      const res = await request(app).post('/api/v1/billing/invoices/10/create-checkout-session').set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data.url).toMatch(/stripe/i);
    });

    it('[STRIPE-002] creating session for PAID invoice → 422', async () => {
      loginAs(mkUser({ id: 5, role: 'patient' }));
      mBill.getInvoiceWithItems.mockResolvedValue({ ...makeInvoice({ patient_id: 5, status: 'paid' }), items: [] } as any);
      const res = await request(app).post('/api/v1/billing/invoices/10/create-checkout-session').set(auth());
      expect(res.status).toBe(422);
    });
  });
});
