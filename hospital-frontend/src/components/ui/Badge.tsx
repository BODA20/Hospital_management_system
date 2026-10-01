import React from 'react';
import { clsx } from 'clsx';
import { getStatusBadgeStyle } from '../../utils/formatters';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'status' | 'emerald' | 'teal' | 'amber' | 'rose' | 'slate';
  status?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'status',
  status,
  className,
}) => {
  if (variant === 'status' || status) {
    return (
      <span
        className={clsx(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize',
          getStatusBadgeStyle(status || String(children)),
          className
        )}
      >
        {children}
      </span>
    );
  }

  const customVariants = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    teal: 'bg-teal-50 text-teal-700 border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        customVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
