import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Invalid Token', 'Reset token is missing.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Password Reset Successful', 'Your password has been updated. Please sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error('Error', err.response?.data?.message || 'Password reset link is invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        <Card padding="lg" className="border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Reset Your Password</h2>
              <p className="text-xs text-slate-500 mt-1">Enter your new secure password below</p>
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
