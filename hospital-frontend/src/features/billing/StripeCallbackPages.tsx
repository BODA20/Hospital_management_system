import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react';

export const StripeSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          Your online payment has been processed successfully via Stripe. Your invoice is now marked as PAID.
        </p>
        <Button variant="primary" className="w-full justify-center" onClick={() => navigate('/')}>
          Return to Dashboard
        </Button>
      </Card>
    </div>
  );
};

export const StripeCancelPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center">
        <XCircle className="w-16 h-16 text-rose-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
        <p className="text-xs text-slate-500 mt-2 mb-6">
          You cancelled the online Stripe Checkout process. No charges were made to your account.
        </p>
        <Button variant="outline" className="w-full justify-center" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/billing')}>
          Return to Billing
        </Button>
      </Card>
    </div>
  );
};
