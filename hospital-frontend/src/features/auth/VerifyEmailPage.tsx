import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      authService
        .verifyNewEmail(token)
        .then(() => {
          setStatus('success');
          setMessage('Email verification complete!');
          setTimeout(() => navigate('/login'), 3000);
        })
        .catch((err) => {
          setStatus('error');
          setMessage(err.response?.data?.message || 'Email verification link expired or invalid.');
        });
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="py-8">
            <Loader2 className="w-10 h-10 text-teal-600 animate-spin mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Verifying New Email...</h3>
          </div>
        )}
        {status === 'success' && (
          <div className="py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Email Verified!</h3>
            <p className="text-xs text-slate-500 mt-1">{message}</p>
            <p className="text-[11px] text-slate-400 mt-4">Redirecting to login...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="py-8">
            <AlertCircle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Verification Failed</h3>
            <p className="text-xs text-slate-500 mt-1">{message}</p>
          </div>
        )}
      </Card>
    </div>
  );
};
