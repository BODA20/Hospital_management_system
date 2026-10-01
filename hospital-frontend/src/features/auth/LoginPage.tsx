import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { HeartPulse, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState<boolean>(false);
  
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUnverified(false);

    if (!email || !password) {
      const msg = 'Please enter both email and password.';
      setErrorMessage(msg);
      toast.error('Validation Error', msg);
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login({ email, password });
      if (res.data) {
        const { accessToken, refreshToken, user } = res.data;
        login(accessToken, refreshToken, user);
        toast.success('Welcome back!', `Logged in as ${user.full_name}`);

        // Route to default role dashboard
        const roleRoutes: Record<string, string> = {
          admin: '/admin/dashboard',
          doctor: '/doctor/dashboard',
          nurse: '/nurse/dashboard',
          patient: '/patient/dashboard',
          receptionist: '/reception/dashboard',
        };
        navigate(roleRoutes[user.role] || '/');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const backendMessage = err.response?.data?.message;

      if (status === 403) {
        const msg = backendMessage || 'Account not verified. Please verify your OTP code first.';
        setErrorMessage(msg);
        setIsUnverified(true);
        toast.error('Access Forbidden (403)', msg);
      } else if (status === 401) {
        const msg = backendMessage || 'Invalid email or password.';
        setErrorMessage(msg);
        toast.error('Authentication Error', msg);
      } else {
        const msg = backendMessage || 'Login failed. Please check your credentials.';
        setErrorMessage(msg);
        toast.error('Login Error', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        {/* Brand logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-teal-600/30">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CareOS Platform</h1>
          <p className="text-slate-400 text-xs mt-1">Clinical Enterprise Management System</p>
        </div>

        <Card padding="lg" className="border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sign In</h2>
              <p className="text-xs text-slate-500 mt-0.5">Enter your credentials to access your workspace</p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-800">{errorMessage}</p>
                  {isUnverified && (
                    <button
                      type="button"
                      onClick={() => {
                        sessionStorage.setItem('pendingVerificationEmail', email);
                        navigate('/verify-otp', { state: { email } });
                      }}
                      className="mt-1.5 text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer block"
                    >
                      Verify OTP Code Now &rarr;
                    </button>
                  )}
                </div>
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="name@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <Link to="/forgot-password" className="text-teal-700 font-medium hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Sign In to Workspace
            </Button>

            <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/signup" className="text-teal-700 font-bold hover:underline">
                Register Here
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
