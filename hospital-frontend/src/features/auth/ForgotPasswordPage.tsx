import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { KeyRound, Mail, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      toast.success('Reset Link Sent', 'Check your email inbox for password reset instructions.');
      navigate('/login');
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Forgot Password</h1>
          <p className="text-slate-400 text-xs mt-1">Enter your registered email address</p>
        </div>

        <Card padding="lg" className="border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Send Reset Instructions
            </Button>

            <div className="text-center pt-3 border-t border-slate-100">
              <Link to="/login" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
