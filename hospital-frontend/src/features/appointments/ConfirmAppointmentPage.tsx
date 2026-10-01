import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { appointmentService } from '../../services/appointmentService';
import { CheckCircle2, XCircle, Loader2, Calendar, Stethoscope, ArrowRight } from 'lucide-react';

export const ConfirmAppointmentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || searchParams.get('t') || '';
  const id = searchParams.get('id') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [appointment, setAppointment] = useState<any>(null);

  useEffect(() => {
    if (!token && !id) {
      setStatus('error');
      setMessage('Invalid or missing confirmation link parameters.');
      return;
    }

    appointmentService
      .confirmByToken(token, id)
      .then((res) => {
        setStatus('success');
        setMessage(res.data?.message || 'Appointment Confirmed Successfully!');
        if (res.data?.appointment) {
          setAppointment(res.data.appointment);
        }
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Failed to confirm appointment. Link may be invalid or expired.');
      });
  }, [token, id]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in">
        {status === 'loading' && (
          <div className="py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto" />
            <h2 className="text-lg font-bold text-slate-800">Confirming Your Appointment...</h2>
            <p className="text-xs text-slate-500">Please wait while we verify your request.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Appointment Confirmed! 🎉</h2>
              <p className="text-xs text-slate-500 mt-1.5">{message}</p>
            </div>

            {appointment && (
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold">{appointment.doctor_name || 'Doctor Consultation'}</span>
                </div>
                {appointment.appointment_date && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{appointment.appointment_date} {appointment.time_slot ? `at ${appointment.time_slot}` : ''}</span>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
              Please arrive 10 minutes early at the main clinic reception for pre-consultation vitals assessment.
            </div>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all duration-200"
            >
              Go to Patient Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Confirmation Failed</h2>
              <p className="text-xs text-rose-600 mt-1.5 font-medium">{message}</p>
            </div>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl shadow-md transition-all duration-200"
            >
              Return to Portal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
