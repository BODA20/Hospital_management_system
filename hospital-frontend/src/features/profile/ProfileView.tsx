import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { User, Phone, Mail, ShieldCheck, Lock, Edit3 } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isLoading, setIsLoading] = useState(false);

  // Change password modal / inputs
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await authService.updateProfile({ full_name: fullName, phone });
      if (res.data) {
        setUser(res.data);
        toast.success('Profile Updated', 'Your profile details have been saved.');
      }
    } catch (err: any) {
      toast.error('Update Error', err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPass(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password Changed', 'Please sign in again with your new password.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error('Password Error', err.response?.data?.message || 'Failed to change password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-subtle">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
            {user.full_name?.charAt(0) || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user.full_name}</h1>
              <Badge status={user.is_active ? 'active' : 'deactivated'}>
                {user.is_active ? 'Active Account' : 'Deactivated'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>{user.email}</span> • 
              <span className="capitalize font-semibold text-teal-700">{user.role}</span>
              {user.assigned_shift && <span>• {user.assigned_shift} Shift</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="teal" className="px-3 py-1 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified User
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info Form */}
        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center gap-2"><Edit3 className="w-4 h-4 text-teal-600" /> General Profile Details</div>}>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Email Address (System ID)"
              value={user.email}
              leftIcon={<Mail className="w-4 h-4" />}
              disabled
              helperText="Email is managed by system administration."
            />

            <Input
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
            />

            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Profile Changes
            </Button>
          </form>
        </Card>

        {/* Security / Password Form */}
        <Card header={<div className="font-bold text-slate-900 text-sm flex items-center gap-2"><Lock className="w-4 h-4 text-teal-600" /> Security & Password</div>}>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <Button type="submit" variant="outline" isLoading={isChangingPass}>
              Update Password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
