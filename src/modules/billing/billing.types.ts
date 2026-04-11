export interface Invoice {
  id: number;
  invoice_no: string;
  patient_id: number;
  visit_id: number | null;
  total_amount: number;
  discount: number;
  tax: number;
  final_amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method: 'cash' | 'card' | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface InvoiceItem {
  id: number;
  invoice_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string | Date;
}

export interface CreateInvoiceInput {
  patient_id: number;
  visit_id?: number;
  discount?: number;
  tax?: number;
}

export interface AddInvoiceItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface PayInvoiceInput {
  payment_method: 'cash' | 'card';
}
