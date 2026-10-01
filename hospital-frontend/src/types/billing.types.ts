export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
}

export type PaymentMethod = 'cash' | 'card' | 'stripe';

export interface Invoice {
  id: number;
  patient_id: number;
  visit_id?: number | null;
  total_amount: number;
  discount?: number;
  tax?: number;
  final_amount: number;
  status: 'unpaid' | 'paid' | 'cancelled';
  paid_at?: string | null;
  payment_method?: PaymentMethod | null;
  items?: InvoiceItem[];
  created_at?: string;
}
