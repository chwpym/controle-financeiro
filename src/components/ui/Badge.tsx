import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { TransactionStatus, TransactionType } from '../../types';

export type BadgeVariant =
  | 'pending'
  | 'settled'
  | 'overdue'
  | 'payable'
  | 'receivable'
  | 'neutral'
  | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

const variantConfig: Record<
  BadgeVariant,
  { bg: string; text: string; border: string; label?: string; icon?: React.ComponentType<{ className?: string }> }
> = {
  settled: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    label: 'Pago / Recebido',
    icon: CheckCircle2,
  },
  pending: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/60',
    label: 'Pendente',
    icon: Clock,
  },
  overdue: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800/60',
    label: 'Vencido',
    icon: AlertTriangle,
  },
  payable: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200/80 dark:border-rose-800/40',
    label: 'A Pagar',
    icon: ArrowDownLeft,
  },
  receivable: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200/80 dark:border-emerald-800/40',
    label: 'A Receber',
    icon: ArrowUpRight,
  },
  neutral: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  },
  info: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800/60',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  showIcon = false,
  className = '',
  ...props
}) => {
  const config = variantConfig[variant];
  const IconComponent = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs font-medium gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
      {...props}
    >
      {showIcon && IconComponent && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
      <span>{children ?? config.label}</span>
    </span>
  );
};

export function getStatusBadgeVariant(status: TransactionStatus, isOverdue = false): BadgeVariant {
  if (status === 'settled') return 'settled';
  if (isOverdue) return 'overdue';
  return 'pending';
}

export function getTypeBadgeVariant(type: TransactionType): BadgeVariant {
  return type === 'payable' ? 'payable' : 'receivable';
}
