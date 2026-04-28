import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import * as billingService from './services/billing.service';
import { stripeService } from './services/stripe.service';
import { addInvoiceItemSchema, payInvoiceSchema } from './billing.schema';

export const processPayment = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID' });
    }

    const body = payInvoiceSchema.parse(req.body);
    const invoice = await billingService.processPayment(id, body.payment_method);

    res.json({
      status: 'success',
      message: 'Payment processed successfully',
      data: invoice,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ status: 'error', message: err.issues[0].message });
    }
    next(err);
  }
};

export const addInvoiceItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID' });
    }

    const body = addInvoiceItemSchema.parse(req.body);
    const result = await billingService.addInvoiceItem(id, body);

    res.status(201).json({
      status: 'success',
      message: 'Item added successfully',
      data: result,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ status: 'error', message: err.issues[0].message });
    }
    next(err);
  }
};

export const getPatientInvoices = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const patientId = parseInt(req.params.patientId as string, 10);
    if (isNaN(patientId)) {
      return res.status(400).json({ status: 'error', message: 'Invalid patient ID' });
    }

    const invoices = await billingService.getPatientInvoices(patientId, (req as any).user.id, (req as any).user.role);
    res.json({
      status: 'success',
      data: invoices,
    });
  } catch (err) {
    next(err);
  }
};

export const getDailyRevenue = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const revenue = await billingService.getDailyRevenue();
    res.json({
      status: 'success',
      data: { revenue },
    });
  } catch (err) {
    next(err);
  }
};

export const getInvoiceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID' });
    }

    const data = await billingService.getInvoiceDetails(id, (req as any).user.id, (req as any).user.role);
    res.json({
      status: 'success',
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: 'error', message: 'Invalid ID' });
    }

    const invoice = await billingService.getInvoiceDetails(id, (req as any).user.id, (req as any).user.role);
    
    if (invoice.status !== 'pending') {
      return res.status(422).json({ 
        status: 'error', 
        message: `Invoice cannot be paid online because status is '${invoice.status}'` 
      });
    }

    const session = await stripeService.createCheckoutSession(invoice.id, Number(invoice.final_amount));

    res.json({
      status: 'success',
      data: { url: session.url },
    });
  } catch (err) {
    next(err);
  }
};

export const paymentSuccess = (req: Request, res: Response) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #f0fdf4;">
        <h1 style="color: #166534;">Payment Successful!</h1>
        <p style="color: #14532d;">Your invoice has been paid. The system is updating your records.</p>
        <code style="background: #dcfce7; padding: 5px; border-radius: 4px;">Session ID: ${req.query.session_id}</code>
      </body>
    </html>
  `);
};

export const paymentCancel = (_req: Request, res: Response) => {
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background-color: #fef2f2;">
        <h1 style="color: #991b1b;">Payment Cancelled</h1>
        <p style="color: #7f1d1d;">You canceled the checkout process. No charges were made.</p>
      </body>
    </html>
  `);
};

