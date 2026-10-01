import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Mail, RefreshCw } from 'lucide-react';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const initialEmail = location.state?.email || sessionStorage.getItem('pendingVerificationEmail') || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || otp.length !== 6) {
      toast.error('Validation Error', 'Please enter a valid email and 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      sessionStorage.removeItem('pendingVerificationEmail');
      toast.success('Account Verified!', 'Your email has been verified. You can now sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error('Verification Error', err.response?.data?.message || 'Invalid OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Error', 'Email address is required to resend OTP.');
      return;
    }
    setIsResending(true);
    try {
      await authService.resendOtp(email);
      toast.info('OTP Resent', 'A new verification code was sent to your email.');
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Verify Your Email</h1>
          <p className="text-slate-400 text-xs mt-1">Enter the 6-digit code sent to your email</p>
        </div>

        <Card padding="lg" className="border-slate-800 shadow-2xl">
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="6-Digit OTP Code"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.trim())}
              className="text-center tracking-widest text-lg font-bold"
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Verify & Activate Account
            </Button>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="text-teal-700 font-semibold hover:underline flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                Resend Code
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-slate-500 hover:text-slate-800"
              >
                Back to Login
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
