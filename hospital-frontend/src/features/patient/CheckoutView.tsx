import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { billingService } from '../../services/billingService';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import {
  CreditCard, Landmark, Smartphone, ShieldCheck, Lock,
  CheckCircle2, Stethoscope, Calendar, Clock, ChevronRight,
  ArrowLeft, Loader2, BadgeCheck, Zap, Star,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface CheckoutState {
  appointmentId?: number;
  doctorName?: string;
  doctorSpecialty?: string;
  appointmentDate?: string;
  timeSlot?: string;
  fee?: number;
  invoiceId?: number;  // pre-linked invoice if already created
}

type PaymentMode = 'stripe' | 'cash' | 'wallet';

interface CardFields {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TAX_RATE = 0.00;   // hospital sets 0% tax; adjust if needed
const PLATFORM_FEE = 0;

const fmtCardNumber = (v: string) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

const cardBrand = (num: string): string => {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'VISA';
  if (/^5[1-5]/.test(n)) return 'MC';
  if (/^3[47]/.test(n)) return 'AMEX';
  return '';
};

// ── Component ─────────────────────────────────────────────────────────────────

export const CheckoutView: React.FC = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const toast     = useToast();

  const state = (location.state as CheckoutState) || {};
  const {
    appointmentId,
    doctorName    = 'Doctor Consultation',
    doctorSpecialty = 'General Medicine',
    appointmentDate = '—',
    timeSlot        = '—',
    fee             = 150,
    invoiceId,
  } = state;

  // ── Payment state ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<PaymentMode>('stripe');
  const [card, setCard] = useState<CardFields>({ number: '', name: '', expiry: '', cvv: '' });
  const [showCvv, setShowCvv] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'processing' | 'done'>('select');

  // Computed
  const subtotal = fee;
  const tax      = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total    = subtotal + tax + PLATFORM_FEE;

  // Guard: if no appointment, send back to doctors
  useEffect(() => {
    if (!appointmentId) {
      toast.error('No appointment found', 'Please book an appointment first.');
      navigate('/patient/doctors', { replace: true });
    }
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleStripeCheckout = async () => {
    if (!invoiceId && !appointmentId) return;
    setIsProcessing(true);
    try {
      // Use invoiceId if available, otherwise try appointmentId as fallback
      const targetId = invoiceId ?? appointmentId!;
      const res = await billingService.createCheckoutSession(targetId);
      const url = (res.data as any)?.checkout_url || (res.data as any)?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Stripe Error', 'No checkout URL returned. Contact support.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      toast.error('Stripe Error', err.response?.data?.message || 'Failed to initiate Stripe Checkout.');
      setIsProcessing(false);
    }
  };

  const handleCashPayment = async () => {
    setIsProcessing(true);
    setStep('processing');
    // Cash = register intent, no immediate charge; show confirmation
    await new Promise((r) => setTimeout(r, 1400));
    setStep('done');
    setIsProcessing(false);
  };

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = card.number.replace(/\s/g, '');
    if (num.length < 13) { toast.error('Invalid Card', 'Please enter a valid card number.'); return; }
    if (!card.name.trim()) { toast.error('Missing Name', 'Cardholder name is required.'); return; }
    if (card.expiry.length < 5) { toast.error('Invalid Expiry', 'Enter a valid MM/YY date.'); return; }
    if (card.cvv.length < 3) { toast.error('Invalid CVV', 'CVV must be 3 or 4 digits.'); return; }

    setIsProcessing(true);
    setStep('processing');

    try {
      // For card terminal payments, use the same invoice pay endpoint
      if (invoiceId) {
        await billingService.processPayment(invoiceId, 'card');
        setStep('done');
      } else {
        // No invoice yet — Stripe checkout as fallback
        await handleStripeCheckout();
      }
    } catch (err: any) {
      toast.error('Payment Failed', err.response?.data?.message || 'Could not process card payment.');
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceed = () => {
    if (mode === 'stripe')  handleStripeCheckout();
    if (mode === 'cash')    handleCashPayment();
    if (mode === 'wallet')  handleStripeCheckout(); // wallets go via Stripe too
  };

  // ── Success screen ─────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-5 max-w-sm mx-auto animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Payment Confirmed!</h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'cash'
                ? 'Please pay at the hospital reception desk before your appointment.'
                : 'Your consultation fee has been processed successfully.'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 space-y-2 text-left">
            <div className="flex justify-between"><span>Doctor</span><span className="font-semibold">{doctorName}</span></div>
            <div className="flex justify-between"><span>Date</span><span className="font-semibold">{appointmentDate}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="font-semibold">{timeSlot}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold">Total Charged</span>
              <span className="font-bold text-emerald-700">{formatCurrency(total)}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/patient/my-appointments')}
            className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm transition-colors"
          >
            View My Appointments →
          </button>
          <button
            onClick={() => navigate('/patient/billing')}
            className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-colors"
          >
            View Invoice History
          </button>
        </div>
      </div>
    );
  }

  // ── Processing overlay ─────────────────────────────────────────────────────

  if (step === 'processing') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
          <p className="text-lg font-semibold text-slate-800">Processing Payment…</p>
          <p className="text-sm text-slate-500">Please don't close this window.</p>
        </div>
      </div>
    );
  }

  // ── Main checkout layout ───────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Secure Checkout</h1>
        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-teal-600" />
          256-bit SSL encrypted · PCI-DSS compliant
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* ══════════════════════════════════════════════════════════════════════
            LEFT COLUMN – Payment options (3 of 5 columns)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-5">

          {/* ── Method selector tabs ─────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'stripe', icon: <CreditCard className="w-5 h-5" />, label: 'Card / Stripe' },
                { id: 'cash',   icon: <Landmark className="w-5 h-5" />,    label: 'Pay at Desk' },
                { id: 'wallet', icon: <Smartphone className="w-5 h-5" />,  label: 'Mobile Pay' },
              ] as { id: PaymentMode; icon: React.ReactNode; label: string }[]
            ).map(({ id, icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={[
                  'flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 text-xs font-semibold transition-all duration-150 focus:outline-none',
                  mode === id
                    ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-sm shadow-teal-100'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
                ].join(' ')}
              >
                <span className={mode === id ? 'text-teal-600' : 'text-slate-400'}>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* ── Stripe / Online Card ─────────────────────────────────────────── */}
          {mode === 'stripe' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Pay with Card or Wallet</h3>
                <div className="flex items-center gap-1.5">
                  {/* Card brand logos (SVG-free simplified) */}
                  {['VISA', 'MC', 'AMEX'].map((b) => (
                    <span key={b} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 tracking-widest">{b}</span>
                  ))}
                </div>
              </div>

              {/* Stripe notice */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                <Zap className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-800">Powered by Stripe</p>
                  <p className="text-[11px] text-indigo-600 mt-0.5">
                    You'll be redirected to Stripe's secure payment page. Enter your card details there — your information never touches our servers.
                  </p>
                </div>
              </div>

              {/* Stripe benefits */}
              <ul className="space-y-2">
                {[
                  'Pay with Visa, Mastercard, Amex, or Apple Pay / Google Pay',
                  'Instant payment confirmation emailed to you',
                  'Stripe-grade fraud protection & 3D Secure',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleStripeCheckout}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md shadow-indigo-200 disabled:opacity-60"
              >
                {isProcessing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><CreditCard className="w-4 h-4" /> Continue to Stripe — {formatCurrency(total)}</>}
              </button>
            </div>
          )}

          {/* ── Cash / Pay at Hospital Desk ──────────────────────────────────── */}
          {mode === 'cash' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm">Pay at Reception Desk</h3>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
                <Landmark className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">In-Person Payment</p>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Your appointment is already reserved. Present your <strong>Appointment ID #{appointmentId}</strong> at the reception desk and settle the fee before your consultation time.
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {[
                  'Pay by cash or card at the hospital reception',
                  'Accepted: Cash, Visa, Mastercard, Mada',
                  'Bring your national ID or appointment confirmation',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-center">
                {['Cash', 'Visa', 'Mada'].map((m) => (
                  <div key={m} className="py-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-600">{m}</div>
                ))}
              </div>

              <button
                onClick={handleCashPayment}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md shadow-amber-100 disabled:opacity-60"
              >
                {isProcessing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><BadgeCheck className="w-4 h-4" /> Confirm — I'll Pay at Reception</>}
              </button>
            </div>
          )}

          {/* ── Mobile Wallet / E-Payment ────────────────────────────────────── */}
          {mode === 'wallet' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm">Mobile & Digital Wallets</h3>

              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-emerald-800">Apple Pay · Google Pay · Samsung Pay</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Digital wallets are supported via Stripe Checkout. Click below to proceed — your wallet will appear as a payment option on the Stripe page.
                  </p>
                </div>
              </div>

              {/* Wallet badges */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Apple Pay',    color: 'bg-black text-white' },
                  { label: 'Google Pay',   color: 'bg-white text-slate-800 border border-slate-200' },
                  { label: 'Samsung Pay',  color: 'bg-blue-600 text-white' },
                ].map(({ label, color }) => (
                  <div key={label} className={`flex items-center justify-center py-3 rounded-xl text-[11px] font-bold ${color}`}>
                    {label}
                  </div>
                ))}
              </div>

              <ul className="space-y-2">
                {[
                  'Biometric authentication for maximum security',
                  'Instant payment — no card details to type',
                  'Works on any modern iOS or Android device',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={handleStripeCheckout}
                disabled={isProcessing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-md shadow-emerald-100 disabled:opacity-60"
              >
                {isProcessing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><Smartphone className="w-4 h-4" /> Pay with Wallet — {formatCurrency(total)}</>}
              </button>
            </div>
          )}

          {/* ── Security trust bar ───────────────────────────────────────────── */}
          <div className="flex items-center justify-center gap-6 py-3 px-5 rounded-xl bg-white border border-slate-100 shadow-sm">
            {[
              { icon: <Lock className="w-3.5 h-3.5 text-teal-600" />,       label: 'SSL Encrypted' },
              { icon: <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />, label: 'PCI-DSS' },
              { icon: <Star className="w-3.5 h-3.5 text-amber-500" />,       label: 'Trusted' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                {icon} {label}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            RIGHT COLUMN – Order summary (2 of 5 columns)
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-4">

            {/* Appointment card */}
            <div className="bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
              {/* decorative blob */}
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-teal-600/20 blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-5 h-5 text-teal-300" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm leading-tight">{doctorName}</p>
                    <p className="text-[11px] text-teal-300 mt-0.5">{doctorSpecialty}</p>
                  </div>
                </div>

                <div className="space-y-2 text-[11px] text-teal-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{appointmentDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>{timeSlot}</span>
                  </div>
                  {appointmentId && (
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono">Appointment #{appointmentId} · Reserved</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm">Order Summary</h3>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Consultation Fee</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                </div>
                {PLATFORM_FEE > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Platform Fee</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(PLATFORM_FEE)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2.5 flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-base">Total</span>
                  <span className="font-black text-teal-700 text-xl">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Prominent CTA */}
              <button
                onClick={handleProceed}
                disabled={isProcessing}
                className="w-full mt-1 py-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-teal-200 disabled:opacity-60"
              >
                {isProcessing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : (
                    <>
                      <span>
                        {mode === 'stripe'  ? 'Proceed to Stripe' :
                         mode === 'cash'    ? 'Confirm Reservation' :
                                             'Pay with Wallet'}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
              </button>

              <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 pt-1">
                <Lock className="w-3 h-3" />
                Payments are secure & encrypted
              </p>
            </div>

            {/* Cancellation policy */}
            <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <p className="font-semibold text-slate-700 mb-1">Cancellation Policy</p>
              Free cancellation up to <strong>5 hours</strong> before your appointment. No refunds for cancellations within 5 hours of the scheduled time.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
