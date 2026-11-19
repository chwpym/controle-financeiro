import React from 'react';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { formatBRL } from '../../utils/format';

export type KpiTone = 'neutral' | 'positive' | 'negative' | 'warning' | 'danger';

export interface KpiTrend {
  value: string;
  direction?: 'up' | 'down' | 'neutral';
  label?: string;
}

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  amountCents?: number;
  value?: React.ReactNode;
  tone?: KpiTone;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  trend?: KpiTrend;
  badge?: React.ReactNode;
  compact?: boolean;
}

const TONE_CLASSES: Record<KpiTone, string> = {
  neutral: 'text-slate-900 dark:text-white',
  positive: 'text-emerald-700 dark:text-emerald-400',
  negative: 'text-rose-700 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const TREND_CLASSES: Record<NonNullable<KpiTrend['direction']>, string> = {
  up: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60',
  down: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60',
  neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
};

/**
 * Card de métrica financeira com formatação BRL, tipografia tabular e badge de variação.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  amountCents = 0,
  value,
  tone = 'neutral',
  icon,
  subtitle,
  trend,
  badge,
  compact = false,
  className = '',
  ...props
}) => {
  const direction = trend?.direction ?? 'neutral';
  const TrendIcon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const formattedValue = value !== undefined ? value : formatBRL(amountCents);

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${
        compact ? 'rounded-xl p-3' : 'rounded-2xl p-5'
      } ${className}`}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`truncate ${
            compact
              ? 'text-[11px] text-slate-500 dark:text-slate-400'
              : 'text-xs font-medium text-slate-500 dark:text-slate-400'
          }`}
        >
          {title}
        </span>
        {icon && <div className="shrink-0 flex items-center">{icon}</div>}
      </div>

      <div
        className={`font-bold font-mono-tabular ${
          compact ? 'mt-1 text-sm sm:text-base' : 'mt-2.5 text-2xl font-display'
        } ${TONE_CLASSES[tone]}`}
      >
        {formattedValue}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          {subtitle && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
              {subtitle}
            </div>
          )}

          {(trend || badge) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {trend && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold font-mono-tabular ${TREND_CLASSES[direction]}`}
                >
                  <TrendIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{trend.value}</span>
                  {trend.label && (
                    <span className="font-sans font-normal opacity-85">{trend.label}</span>
                  )}
                </span>
              )}
              {badge}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
