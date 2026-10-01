import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { billingService } from '../../services/billingService';
import { Invoice } from '../../types/billing.types';
import { StatCard } from '../../components/ui/StatCard';
import { Card } from '../../components/ui/Card';
import { Table, Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import {
  DollarSign, Receipt, CreditCard, CheckCircle2,
  Calendar, Clock, ShieldCheck, AlertCircle,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

interface BookingCheckoutState {
  justBooked?: boolean;
  appointmentId?: number;
  doctorName?: string;
  timeSlot?: string;
  appointmentDate?: string;
  fee?: number;
}

export const BillingDashboard: React.FC = () => {
  const location = useLocation();
  const bookingState = (location.state as BookingCheckoutState) || {};
  const [checkoutBanner, setCheckoutBanner] = useState<BookingCheckoutState | null>(
    bookingState.justBooked ? bookingState : null,
  );

  // ── State ───────────────────────────────────────────────────────────────────
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);

  // Pay Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Banner invoice (resolved after fetching)
  const [bannerInvoice, setBannerInvoice] = useState<Invoice | null>(null);

  const toast = useToast();
  const { user } = useAuth();

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchMyInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await billingService.getMyInvoices();
      const invoices: Invoice[] = res.data || [];
      setMyInvoices(invoices);

      // Compute stats
      setTotalPaid(
        invoices
          .filter((inv) => ['paid', 'paid_cash', 'paid_online'].includes(inv.status))
          .reduce((sum, inv) => sum + Number(inv.final_amount || inv.total_amount || 0), 0),
      );
      setTotalUnpaid(
        invoices
          .filter((inv) => inv.status === 'unpaid')
          .reduce((sum, inv) => sum + Number(inv.final_amount || inv.total_amount || 0), 0),
      );

      // If we came from a booking, find the invoice that belongs to that appointment
      if (bookingState.justBooked && bookingState.appointmentId) {
        const linked = invoices.find(
          (inv) =>
            (inv as any).appointment_id === bookingState.appointmentId ||
            (inv as any).appointmentId === bookingState.appointmentId,
        );
        setBannerInvoice(linked ?? null);
      }
    } catch {
      toast.error('Error', 'Failed to load your invoices.');
      setMyInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyInvoices();
    // Auto-dismiss checkout banner after 60 seconds
    if (bookingState.justBooked) {
      const t = setTimeout(() => setCheckoutBanner(null), 60_000);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openPayModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPayModalOpen(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setIsSubmitting(true);
    try {
      await billingService.processPayment(selectedInvoice.id, paymentMethod);
      toast.success('Payment Recorded ✅', `Invoice #${selectedInvoice.id} paid via ${paymentMethod}.`);
      setIsPayModalOpen(false);
      setCheckoutBanner(null);
      await fetchMyInvoices();
    } catch (err: any) {
      toast.error('Payment Error', err.response?.data?.message || 'Failed to process payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStripeCheckout = async (invoiceId: number) => {
    try {
      const res = await billingService.createCheckoutSession(invoiceId);
      const url = res.data?.checkout_url || (res.data as any)?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Stripe Error', 'No checkout URL returned from server.');
      }
    } catch (err: any) {
      toast.error('Stripe Error', err.response?.data?.message || 'Failed to initialize Stripe Checkout.');
    }
  };

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns: Column<Invoice>[] = [
    { header: 'Invoice #', accessorKey: 'id', className: 'w-20 font-mono text-xs font-bold' },
    {
      header: 'Date',
      cell: (inv) => <span className="text-xs text-slate-600">{formatDate((inv as any).created_at)}</span>,
    },
    {
      header: 'Amount',
      cell: (inv) => (
        <span className="font-bold text-slate-900">{formatCurrency(inv.final_amount || inv.total_amount)}</span>
      ),
    },
    {
      header: 'Status',
      cell: (inv) => <Badge status={inv.status}>{inv.status}</Badge>,
    },
    {
      header: 'Actions',
      cell: (inv) =>
        inv.status === 'unpaid' ? (
          <div className="flex items-center gap-2">
            <Button variant="teal" size="sm" onClick={() => openPayModal(inv)}>
              Pay Cash/Card
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleStripeCheckout(inv.id)}>
              Pay Online
            </Button>
          </div>
        ) : (
          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid
          </span>
        ),
    },
  ];

  // ── Checkout banner CTA logic ─────────────────────────────────────────────
  const bannerPayTarget = bannerInvoice ?? null;
  const bannerFee = checkoutBanner?.fee ?? bannerInvoice?.final_amount ?? bannerInvoice?.total_amount ?? 150;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          {user?.role === 'receptionist' || user?.role === 'admin' ? 'Billing Management' : 'My Bills & Payments'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {user?.role === 'receptionist' || user?.role === 'admin'
            ? 'View and manage all patient invoices and payments'
            : 'View your invoices and complete outstanding payments'}
        </p>
      </div>

      {/* ── Post-Booking Checkout Banner ──────────────────────────────────────── */}
      {checkoutBanner && (
        <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 p-6 text-white shadow-xl animate-fade-in relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-6 -translate-y-6 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> Appointment Booked — Payment Pending
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Consultation with {checkoutBanner.doctorName || 'Doctor'}
              </h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-teal-200">
                {checkoutBanner.appointmentDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-teal-400" /> {checkoutBanner.appointmentDate}
                  </span>
                )}
                {checkoutBanner.timeSlot && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" /> {checkoutBanner.timeSlot}
                  </span>
                )}
                {checkoutBanner.appointmentId && (
                  <span className="font-mono text-teal-300">Appointment #{checkoutBanner.appointmentId}</span>
                )}
              </div>

              {/* Show message if no linked invoice found yet */}
              {!bannerPayTarget && !isLoading && (
                <p className="text-xs text-amber-300 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Your invoice is being generated — it will appear in the table below shortly. Refresh to update.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
              <div className="text-left sm:text-right pr-2">
                <span className="text-[10px] uppercase font-bold text-teal-200 block">Consultation Fee</span>
                <span className="text-2xl font-black text-white">{formatCurrency(bannerFee)}</span>
              </div>
              {bannerPayTarget ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="teal"
                    onClick={() => openPayModal(bannerPayTarget)}
                  >
                    Pay Cash/Card
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleStripeCheckout(bannerPayTarget.id)}
                  >
                    Stripe Online
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={fetchMyInvoices} disabled={isLoading}>
                  Refresh Invoices
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(totalUnpaid)}
          icon={<DollarSign className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title="Total Invoices"
          value={myInvoices.length}
          icon={<Receipt className="w-5 h-5" />}
          color="teal"
        />
      </div>

      {/* ── Invoice Table ────────────────────────────────────────────────────── */}
      <Card
        header={
          <div className="flex items-center justify-between w-full">
            <span className="font-bold text-slate-900 text-sm">My Invoices</span>
            <Button variant="secondary" size="sm" onClick={fetchMyInvoices} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          data={myInvoices}
          isLoading={isLoading}
          emptyMessage="No invoices found. Invoices are generated after your appointments are processed."
        />
      </Card>

      {/* ── Pay Invoice Modal ─────────────────────────────────────────────────── */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        title={`Pay Invoice #${selectedInvoice?.id}`}
      >
        <form onSubmit={handleProcessPayment} className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl text-center border border-slate-200">
            <span className="text-xs text-slate-500 block uppercase font-bold tracking-wide">Total Amount Due</span>
            <span className="text-3xl font-bold text-emerald-700 mt-1 block">
              {formatCurrency(selectedInvoice?.final_amount || selectedInvoice?.total_amount)}
            </span>
          </div>

          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as any)}
            options={[
              { label: 'Cash Payment', value: 'cash' },
              { label: 'Credit/Debit Card (Terminal)', value: 'card' },
            ]}
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            <CreditCard className="w-4 h-4 mr-2" />
            Confirm Payment
          </Button>
        </form>
      </Modal>
    </div>
  );
};
