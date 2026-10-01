import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { HeartPulse, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react';
import { UserRole } from '../../types/auth.types';

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('patient');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      toast.error('Validation Error', 'Passwords do not match.');
      return;
    }
    setPasswordError('');

    setIsLoading(true);
    const payload = {
      full_name: fullName,
      email,
      password,
      phone,
      role: role.toLowerCase(),
    };
    console.log("SENDING PAYLOAD TO BACKEND:", payload);

    try {
      const res = await authService.signup(payload);

      if (res.status === 'success' || res.data) {
        sessionStorage.setItem('pendingVerificationEmail', email);
        toast.success('Registration Received', 'Verification code sent to your email.');
        navigate('/verify-otp', { state: { email } });
      }
    } catch (err: any) {
      console.error("FULL ERROR OBJECT:", err);
      console.error("BACKEND RESPONSE DATA:", err.response?.data);
      console.log(JSON.stringify(err.response?.data, null, 2));
      const serverErrors = err.response?.data?.errors;
      let msg = err.response?.data?.message || 'Failed to register account.';
      if (Array.isArray(serverErrors) && serverErrors.length > 0) {
        msg = serverErrors.map((e: any) => `${e.path || 'Field'}: ${e.message}`).join(' | ');
      }
      toast.error('Registration Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in my-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-teal-600/30">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create CareOS Account</h1>
          <p className="text-slate-400 text-xs mt-1">Join the Hospital Management System</p>
        </div>

        <Card padding="lg" className="border-slate-800 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Dr. John Doe / Jane Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="user@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 555 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              required
            />

            <Select
              label="Account Role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              options={[
                { label: 'Patient Portal', value: 'patient' },
                { label: 'Doctor Specialist', value: 'doctor' },
                { label: 'Nurse Staff', value: 'nurse' },
                { label: 'Administrator', value: 'admin' },
              ]}
              required
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              helperText="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol"
              value={password}
              onChange={(e) => {
                const val = e.target.value;
                setPassword(val);
                if (passwordError && val === confirmPassword) {
                  setPasswordError('');
                }
              }}
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

            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                const val = e.target.value;
                setConfirmPassword(val);
                if (passwordError && val === password) {
                  setPasswordError('');
                } else if (passwordError && val !== password) {
                  setPasswordError('Passwords do not match');
                }
              }}
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={passwordError}
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Create Account & Send OTP
            </Button>

            <div className="text-center pt-3 border-t border-slate-100 text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-teal-700 font-bold hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
