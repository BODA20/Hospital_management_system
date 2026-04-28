import db from '../../../config/db';
import type { Invoice, InvoiceItem, AddInvoiceItemInput } from '../billing.types';
import type { Knex } from 'knex';

const generateInvoiceNo = async (trx: Knex.Transaction): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  // ─── Concurrency Fix: Use PostgreSQL SEQUENCE ────────────────────────────────
  const result = await trx.raw("SELECT nextval('invoice_num_seq') as next_val");
  const nextNumber = result.rows[0].next_val;

  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `${prefix}${paddedNumber}`;
};

export const createInitialInvoice = async (
  visit_id: number,
  patient_id: number,
  consultation_fee: number,
  trx?: Knex.Transaction,
) => {
  const work = async (t: Knex.Transaction) => {
    const invoice_no = await generateInvoiceNo(t);

    const [invoice] = await t<Invoice>('invoices')
      .insert({
        invoice_no,
        patient_id,
        visit_id,
        total_amount: consultation_fee,
        discount: 0,
        tax: 0,
        final_amount: consultation_fee,
        status: 'pending',
      })
      .returning('*');

    if (consultation_fee > 0) {
      await t<InvoiceItem>('invoice_items').insert({
        invoice_id: invoice.id,
        description: 'Consultation Fee',
        quantity: 1,
        unit_price: consultation_fee,
        line_total: consultation_fee,
      });
    }

    return invoice;
  };

  if (trx) return work(trx);
  return await db.transaction(work);
};

export const getInvoiceById = async (id: number) => {
  return await db<Invoice>('invoices').where({ id }).first();
};

export const getInvoiceWithItems = async (id: number) => {
  const invoice = await getInvoiceById(id);
  if (!invoice) return null;

  const items = await db<InvoiceItem>('invoice_items').where({ invoice_id: id });
  return { ...invoice, items };
};

export const addInvoiceItem = async (
  invoice_id: number,
  itemData: AddInvoiceItemInput,
  trx?: Knex.Transaction,
) => {
  const work = async (t: Knex.Transaction) => {
    // 1. Lock the invoice row to prevent race conditions during calculation
    const invoice = await t<Invoice>('invoices')
      .where({ id: invoice_id })
      .forUpdate()
      .first();

    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status !== 'pending') {
      throw new Error('Can only add items to pending invoices');
    }

    // 2. Insert the item
    const line_total = itemData.quantity * itemData.unit_price;
    const [newItem] = await t<InvoiceItem>('invoice_items')
      .insert({
        invoice_id,
        description: itemData.description,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        line_total,
      })
      .returning('*');

    // 3. Update the invoice totals
    const newTotalAmount = Number(invoice.total_amount) + line_total;
    const newFinalAmount =
      newTotalAmount - Number(invoice.discount) + Number(invoice.tax);

    const [updatedInvoice] = await t<Invoice>('invoices')
      .where({ id: invoice_id })
      .update({
        total_amount: newTotalAmount,
        final_amount: newFinalAmount,
        updated_at: db.fn.now(),
      })
      .returning('*');

    return { invoice: updatedInvoice, item: newItem };
  };

  if (trx) return work(trx);
  return await db.transaction(work);
};

export const processPayment = async (
  invoice_id: number,
  payment_method: 'cash' | 'card',
) => {
  const [updatedInvoice] = await db<Invoice>('invoices')
    .where({ id: invoice_id })
    .update({
      status: 'paid',
      payment_method,
      updated_at: db.fn.now(),
    })
    .returning('*');

  return updatedInvoice;
};

export const getPatientInvoices = async (patient_id: number) => {
  return await db<Invoice>('invoices')
    .where({ patient_id })
    .orderBy('created_at', 'desc');
};

export const getDailyRevenue = async () => {
  // ─── SARGable Fix: Use range-based filtering ───────────────────────────────
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const result = await db('invoices')
    .where('status', 'paid')
    .where('updated_at', '>=', start)
    .where('updated_at', '<', end)
    .sum('final_amount as revenue')
    .first();

  return result?.revenue ?? 0;
};
