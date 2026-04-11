import * as billingRepo from '../repositories/billing.repo';
import type { AddInvoiceItemInput } from '../billing.types';
import { appError } from '../../../common/errors/AppError';

export const createInitialInvoice = async (
  visit_id: number,
  patient_id: number,
  consultation_fee: number,
) => {
  return await billingRepo.createInitialInvoice(
    visit_id,
    patient_id,
    consultation_fee,
  );
};

export const addInvoiceItem = async (
  invoice_id: number,
  itemData: AddInvoiceItemInput,
) => {
  const invoice = await billingRepo.getInvoiceById(invoice_id);
  if (!invoice) {
    throw new appError(`Invoice with ID ${invoice_id} not found`, 404);
  }

  if (invoice.status === 'paid' || invoice.status === 'cancelled') {
    throw new appError(`Cannot modify invoice. Status is ${invoice.status}`, 422);
  }

  return await billingRepo.addInvoiceItem(invoice_id, itemData);
};

export const processPayment = async (
  invoice_id: number,
  payment_method: 'cash' | 'card',
) => {
  const invoice = await billingRepo.getInvoiceById(invoice_id);
  if (!invoice) {
    throw new appError(`Invoice with ID ${invoice_id} not found`, 404);
  }

  if (invoice.status === 'paid') {
    throw new appError(`Invoice already paid`, 422);
  }

  if (invoice.status === 'cancelled') {
    throw new appError(`Cannot pay a cancelled invoice`, 422);
  }

  return await billingRepo.processPayment(invoice_id, payment_method);
};

export const getPatientInvoices = async (patientId: number) => {
  return await billingRepo.getPatientInvoices(patientId);
};

export const getDailyRevenue = async () => {
  return await billingRepo.getDailyRevenue();
};

export const getInvoiceDetails = async (invoice_id: number) => {
  const data = await billingRepo.getInvoiceWithItems(invoice_id);
  if (!data) {
    throw new appError(`Invoice with ID ${invoice_id} not found`, 404);
  }
  return data;
};
