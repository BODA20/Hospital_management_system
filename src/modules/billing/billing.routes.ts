import { Router } from 'express';
import * as billingController from './billing.controller';
import { protect, restrictTo } from '../../common/middleware/auth';

export const billingRouter = Router();

// Public redirect handlers from Stripe Checkout (browsers do not pass JWT Bearer token on redirect)
billingRouter.get('/success', billingController.paymentSuccess);
billingRouter.get('/cancel', billingController.paymentCancel);

// Apply auth middleware to all remaining routes
billingRouter.use(protect);

// Invoice management
billingRouter.get('/:id', billingController.getInvoiceById);
billingRouter.post(
  '/:id/items',
  restrictTo('admin', 'doctor', 'nurse'), // Who can add items? Let's allow medical staff/admin
  billingController.addInvoiceItem
);
billingRouter.post(
  '/:id/pay',
  restrictTo('admin', 'receptionist'), // Patients must use Stripe Checkout. Staff manually logs physical payments.
  billingController.processPayment
);

billingRouter.post(
  '/:id/create-checkout-session',
  restrictTo('patient', 'admin', 'receptionist'),
  billingController.createCheckoutSession
);

// Reports
billingRouter.get(
  '/patient/:patientId',
  billingController.getPatientInvoices
);

// We need to keep dashboard under another route maybe? But sure:
billingRouter.get(
  '/reports/daily-revenue',
  restrictTo('admin'),
  billingController.getDailyRevenue
);
