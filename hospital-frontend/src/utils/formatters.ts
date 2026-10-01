export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const formatCurrency = (amount?: number | string | null): string => {
  if (amount === undefined || amount === null || amount === '') return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
};

export const formatPhone = (phone?: string | null): string => {
  if (!phone) return 'N/A';
  return phone;
};

export const getStatusBadgeStyle = (status?: string | null): string => {
  if (!status) return 'bg-slate-100 text-slate-700 border-slate-200';
  const s = status.toLowerCase();
  
  if (['confirmed', 'completed', 'paid', 'paid_cash', 'paid_online', 'approved', 'verified', 'active'].includes(s)) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (['pending', 'scheduled', 'awaiting_vitals', 'in_progress', 'ready_for_doctor'].includes(s)) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  if (['cancelled', 'no_show', 'rejected', 'unpaid', 'deactivated', 'inactive', 'missed'].includes(s)) {
    return 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return 'bg-teal-50 text-teal-700 border-teal-200';
};
