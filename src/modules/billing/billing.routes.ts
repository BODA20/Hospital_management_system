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

// Patient invoice history
billingRouter.get(
  '/patient/:patientId',
  billingController.getPatientInvoices
);

// Revenue report (admin only)
billingRouter.get(
  '/reports/daily-revenue',
  restrictTo('admin'),
  billingController.getDailyRevenue
);

// ── Dynamic :id routes ────────────────────────────────────────────────────────

// Retrieve a single invoice with its items
billingRouter.get('/:id', billingController.getInvoiceById);

// Add a line item to an invoice
billingRouter.post(
  '/:id/items',
  restrictTo('admin', 'doctor', 'nurse'),
  billingController.addInvoiceItem
);

// Manual cash/card payment (staff only — patients use Stripe Checkout)
billingRouter.post(
  '/:id/pay',
  restrictTo('admin', 'receptionist'),
  billingController.processPayment
);

// Stripe online checkout session
billingRouter.post(
  '/:id/create-checkout-session',
  restrictTo('patient', 'admin', 'receptionist'),
  billingController.createCheckoutSession
);
