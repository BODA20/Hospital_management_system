import { apiClient } from './apiClient';
import { ApiResponse } from '../types/api.types';
import { Invoice } from '../types/billing.types';

// All billing routes are served under /api/v1/billing (mounted in app.ts)
const BASE = '/billing';

export const billingService = {
  /** Patient self-service: fetch own invoices (requires 'patient' role) */
  async getMyInvoices(): Promise<ApiResponse<Invoice[]>> {
    const res = await apiClient.get(`${BASE}/my-bills`);
    return res.data;
  },

  /** Admin/staff: fetch invoices for a specific patient by their patient-record ID */
  async getPatientInvoices(patientId: number): Promise<ApiResponse<Invoice[]>> {
    const res = await apiClient.get(`${BASE}/patient/${patientId}`);
    return res.data;
  },

  async getDailyRevenue(): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get(`${BASE}/reports/daily-revenue`);
    return res.data;
  },

  async getInvoiceById(id: number): Promise<ApiResponse<Invoice>> {
    const res = await apiClient.get(`${BASE}/${id}`);
    return res.data;
  },

  async addInvoiceItem(invoiceId: number, data: { description: string; quantity: number; unit_price: number }): Promise<ApiResponse<any>> {
    const res = await apiClient.post(`${BASE}/${invoiceId}/items`, data);
    return res.data;
  },

  /** Pay an invoice by ID with cash or card */
  async processPayment(invoiceId: number, paymentMethod: 'cash' | 'card'): Promise<ApiResponse<Invoice>> {
    const res = await apiClient.post(`${BASE}/${invoiceId}/pay`, { payment_method: paymentMethod });
    return res.data;
  },

  /** Initiate a Stripe checkout session for an invoice */
  async createCheckoutSession(invoiceId: number, overrideToken?: string): Promise<ApiResponse<{ checkout_url: string }>> {
    const token = overrideToken ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('accessToken') ||
      sessionStorage.getItem('token') || '';
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await apiClient.post(`${BASE}/${invoiceId}/create-checkout-session`, {}, { headers });
    return res.data;
  },
};
