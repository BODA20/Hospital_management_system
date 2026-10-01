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

export const getOrCreateInvoiceForCheckout = async (
  rawId: number,
  requesterId: number,
  requesterRole: string,
) => {
  const db = (await import('../../../config/db')).default;

  // 1. Try finding invoice by ID first
  const existingInvoice = await billingRepo.getInvoiceById(rawId);
  if (existingInvoice) {
    return await getInvoiceDetails(existingInvoice.id, requesterId, requesterRole);
  }

  // 2. Try finding appointment by ID
  const appointment = await db('appointments').where({ id: rawId }).first();
  if (!appointment) {
    throw new appError(`Invoice or Appointment with ID ${rawId} not found`, 404);
  }

  // 3. Check if an invoice already exists for this patient & appointment
  let linkedInvoice = await db('invoices')
    .where({ patient_id: appointment.patient_id })
    .andWhere(function () {
      this.where({ id: rawId });
      if (appointment.id) {
        this.orWhereRaw("visit_id IN (SELECT id FROM visits WHERE appointment_id = ?)", [appointment.id]);
      }
    })
    .first();

  if (!linkedInvoice) {
    const doctor = await db('doctors').where({ id: appointment.doctor_id }).first();
    const fee = doctor?.consultation_fee ? Number(doctor.consultation_fee) : 150;

    const invoiceNo = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const [created] = await db('invoices')
      .insert({
        invoice_no: invoiceNo,
        patient_id: appointment.patient_id,
        total_amount: fee,
        discount: 0,
        tax: 0,
        final_amount: fee,
        status: 'pending',
      })
      .returning('*');

    await db('invoice_items').insert({
      invoice_id: created.id,
      description: `Consultation Fee (${doctor?.specialization || 'Medical Specialist'})`,
      quantity: 1,
      unit_price: fee,
      line_total: fee,
    });

    linkedInvoice = created;
  }

  return await getInvoiceDetails(linkedInvoice.id, requesterId, requesterRole);
};
