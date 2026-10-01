import React from 'react';
import { clsx } from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  padding = 'md',
  className,
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-xl border border-slate-200/80 shadow-subtle overflow-hidden',
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={paddings[padding]}>{children}</div>
      {footer && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/30">
          {footer}
        </div>
      )}
    </div>
  );
};
