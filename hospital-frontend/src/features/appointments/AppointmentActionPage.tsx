import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import { Loader2 } from 'lucide-react';

export const AppointmentActionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const action = searchParams.get('action') || 'confirm';
  const token = searchParams.get('token') || searchParams.get('t') || '';
  const id = searchParams.get('id') || '';

  useEffect(() => {
    if (action === 'cancel') {
      navigate(`/appointments/cancel?token=${token}&id=${id}`, { replace: true });
    } else {
      navigate(`/appointments/confirm?token=${token}&id=${id}`, { replace: true });
    }
  }, [action, token, id, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="py-8 text-center space-y-4">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Redirecting to appointment handler...</p>
      </div>
    </div>
  );
};
