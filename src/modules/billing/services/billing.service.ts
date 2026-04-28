import * as billingRepo from '../repositories/billing.repo';
import * as patientRepo from '../../patients/repositories/patient.repository';
import type { AddInvoiceItemInput } from '../billing.types';
import { appError } from '../../../common/errors/AppError';
import type { Knex } from 'knex';

export const createInitialInvoice = async (
  visit_id: number,
  patient_id: number,
  consultation_fee: number,
  trx?: Knex.Transaction,
) => {
  return await billingRepo.createInitialInvoice(
    visit_id,
    patient_id,
    consultation_fee,
    trx,
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
    throw new appError('Invoice already paid', 422);
  }

  if (invoice.status === 'cancelled') {
    throw new appError('Cannot pay a cancelled invoice', 422);
  }

  return await billingRepo.processPayment(invoice_id, payment_method);
};

export const getPatientInvoices = async (patientId: number, requesterId: number, requesterRole: string) => {
  // IDOR Guard: Patients can only see their own invoices
  if (requesterRole === 'patient') {
    const patientProfile = await patientRepo.findByUserId(requesterId);
    if (!patientProfile || patientProfile.id !== patientId) {
      throw new appError('You do not have permission to view these invoices', 403);
    }
  }
  
  return await billingRepo.getPatientInvoices(patientId);
};

export const getDailyRevenue = async () => {
  return await billingRepo.getDailyRevenue();
};

export const getInvoiceDetails = async (invoice_id: number, requesterId: number, requesterRole: string) => {
  const data = await billingRepo.getInvoiceWithItems(invoice_id);
  if (!data) {
    throw new appError(`Invoice with ID ${invoice_id} not found`, 404);
  }

  // IDOR Guard: Patients can only see their own invoice
  if (requesterRole === 'patient') {
    const patientProfile = await patientRepo.findByUserId(requesterId);
    if (!patientProfile || patientProfile.id !== data.patient_id) {
      throw new appError('You do not have permission to view this invoice', 403);
    }
  }

  return data;
};
