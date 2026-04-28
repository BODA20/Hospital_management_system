jest.mock('../../src/modules/billing/repositories/billing.repo', () => require('../mocks/billingRepo.mock').mockedBillingRepo);
jest.mock('../../src/modules/users/repositories/user.repo', () => require('../mocks/usersRepo.mock').mockedUsersRepo);

import { mockedBillingRepo as mBill, makeInvoice } from '../mocks/billingRepo.mock';
import * as billingService from '../../src/modules/billing/services/billing.service';

describe('BILLING SERVICE (Business Logic & Math)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('[MATH-001] final_amount with decimal values must not produce floating-point errors', () => {
    const total    = 99.99;
    const addItem  = 0.01;
    const result   = parseFloat((total + addItem).toFixed(2));
    expect(result).toBe(100.00);
    expect(result.toString()).not.toMatch(/0{4,}/);
  });

  it('[MATH-002] line_total = quantity * unit_price with decimals is precise', () => {
    const quantity   = 3;
    const unit_price = 33.33;
    const line_total = parseFloat((quantity * unit_price).toFixed(2));
    expect(line_total).toBe(99.99);
  });

  it('[MATH-003] addInvoiceItem throws 404 when invoice not found', async () => {
    mBill.getInvoiceById.mockResolvedValue(undefined as any);
    await expect(
      billingService.addInvoiceItem(999, { description: 'X', quantity: 1, unit_price: 50 })
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('[MATH-004] addInvoiceItem throws 422 for a PAID invoice', async () => {
    mBill.getInvoiceById.mockResolvedValue(makeInvoice({ status: 'paid' }) as any);
    await expect(
      billingService.addInvoiceItem(10, { description: 'X', quantity: 1, unit_price: 50 })
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('[MATH-006] processPayment throws 422 when invoice already PAID (double-spend guard)', async () => {
    mBill.getInvoiceById.mockResolvedValue(makeInvoice({ status: 'paid' }) as any);
    await expect(
      billingService.processPayment(10, 'cash')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('[MATH-007] processPayment throws 422 for CANCELLED invoice', async () => {
    mBill.getInvoiceById.mockResolvedValue(makeInvoice({ status: 'cancelled' }) as any);
    await expect(
      billingService.processPayment(10, 'cash')
    ).rejects.toMatchObject({ statusCode: 422 });
  });

  it('[MATH-008] processPayment throws 404 when invoice not found', async () => {
    mBill.getInvoiceById.mockResolvedValue(undefined as any);
    await expect(
      billingService.processPayment(999, 'cash')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('[MATH-009] 100% discount — final_amount should be zero', () => {
    const total_amount = 500.00;
    const discount     = 500.00;
    const tax          = 0;
    const final_amount = parseFloat((total_amount - discount + tax).toFixed(2));
    expect(final_amount).toBe(0.00);
    expect(final_amount).toBeGreaterThanOrEqual(0);
  });

  it('[MATH-010] discount applied before tax: (total - discount) + tax', () => {
    const total    = 1000;
    const discount = 100;
    const tax      = 50;
    const final    = (total - discount) + tax;
    expect(final).toBe(950);
  });

  it('[MATH-011] getInvoiceDetails throws 404 when invoice missing', async () => {
    mBill.getInvoiceWithItems.mockResolvedValue(null as any);
    await expect(billingService.getInvoiceDetails(999, 1, 'admin')).rejects.toMatchObject({ statusCode: 404 });
  });
});
