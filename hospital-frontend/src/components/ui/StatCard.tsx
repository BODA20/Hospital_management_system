import React from 'react';
import { clsx } from 'clsx';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral';
  color?: 'teal' | 'emerald' | 'amber' | 'rose' | 'slate';
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendType = 'positive',
  color = 'teal',
  subtitle,
}) => {
  const iconColors = {
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</span>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
        </div>
        {icon && (
          <div className={clsx('p-2.5 rounded-xl border shrink-0', iconColors[color])}>
            {icon}
          </div>
        )}
      </div>

      {(trend || subtitle) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {trend && (
            <span
              className={clsx(
                'font-medium',
                trendType === 'positive' && 'text-emerald-600',
                trendType === 'negative' && 'text-rose-600',
                trendType === 'neutral' && 'text-slate-500'
              )}
            >
              {trend}
            </span>
          )}
          {subtitle && <span className="text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
