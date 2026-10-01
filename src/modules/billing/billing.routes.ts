import { Router } from 'express';
import * as billingController from './billing.controller';
import { protect, restrictTo } from '../../common/middleware/auth';

export const billingRouter = Router();

// Public redirect handlers from Stripe Checkout (browsers do not pass JWT Bearer token on redirect)
billingRouter.get('/success', billingController.paymentSuccess);
billingRouter.get('/cancel', billingController.paymentCancel);

// Apply auth middleware to all remaining routes
billingRouter.use(protect);

// ── Specific routes MUST come before /:id catch-all ──────────────────────────

// Patient invoice history (by patientId or self)
billingRouter.get(
  '/my-bills',
  restrictTo('patient', 'receptionist', 'admin'),
  billingController.getMyInvoices
);

billingRouter.get(
  '/patient/:patientId',
  billingController.getPatientInvoices
);

// Revenue report (admin & receptionist & patient view)
billingRouter.get(
  '/reports/daily-revenue',
  restrictTo('admin', 'receptionist', 'patient', 'doctor'),
  billingController.getDailyRevenue
);

// ── Dynamic :id routes & action endpoints ─────────────────────────────────────

// Retrieve a single invoice with its items
billingRouter.get('/:id', billingController.getInvoiceById);

// Add a line item to an invoice
billingRouter.post(
  '/:id/items',
  restrictTo('admin', 'doctor', 'nurse', 'receptionist'),
  billingController.addInvoiceItem
);

// Manual cash/card payment (staff)
billingRouter.post(
  '/:id/pay',
  restrictTo('admin', 'receptionist'),
  billingController.processPayment
);

billingRouter.post(
  '/invoices/:id/pay',
  restrictTo('admin', 'receptionist'),
  billingController.processPayment
);

billingRouter.post(
  '/pay',
  restrictTo('admin', 'receptionist'),
  billingController.processPayment
);

// Stripe online checkout session
billingRouter.post(
  '/:id/create-checkout-session',
  restrictTo('patient', 'admin', 'receptionist', 'doctor'),
  billingController.createCheckoutSession
);

billingRouter.post(
  '/:id/checkout',
  restrictTo('patient', 'admin', 'receptionist', 'doctor'),
  billingController.createCheckoutSession
);

billingRouter.post(
  '/checkout',
  restrictTo('patient', 'admin', 'receptionist', 'doctor'),
  billingController.createCheckoutSession
);

billingRouter.post(
  '/invoices/:id/pay-stripe',
  restrictTo('patient', 'admin', 'receptionist', 'doctor'),
  billingController.createCheckoutSession
);

