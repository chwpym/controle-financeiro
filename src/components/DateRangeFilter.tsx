import React from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import { formatDateBR, formatMonthLabel, todayISO } from '../utils/format';

export type DatePeriodMode = 'month' | 'year' | 'custom' | 'all';
export type DateTargetField = 'dueDate' | 'paidAt';

export interface DateFilterValue {
  mode: DatePeriodMode;
  dateFrom: string;
  dateTo: string;
  dateField: DateTargetField;
}

export function createDateFilterState(
  selectedMonth: string,
  defaultMode: DatePeriodMode = 'month',
  initialDateFrom?: string,
  initialDateTo?: string
): DateFilterValue {
  const [yStr, mStr] = selectedMonth.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = y && m ? new Date(y, m, 0).getDate() : 30;
  return {
    mode: defaultMode,
    dateFrom: initialDateFrom ?? `${selectedMonth}-01`,
    dateTo: initialDateTo ?? `${selectedMonth}-${String(lastDay).padStart(2, '0')}`,
    dateField: 'dueDate',
  };
}

export function matchesDateFilter(
  tx: { dueDate: string; paidAt: string | null },
  filter: DateFilterValue,
  selectedMonth: string
): boolean {
  if (filter.mode === 'all') return true;
  const targetDate = filter.dateField === 'paidAt' ? tx.paidAt : tx.dueDate;
  if (!targetDate) return false;

  if (filter.mode === 'month') {
    return targetDate.startsWith(selectedMonth);
  }
  if (filter.mode === 'year') {
    return targetDate.startsWith(selectedMonth.slice(0, 4));
  }
  if (filter.mode === 'custom') {
    if (filter.dateFrom && targetDate < filter.dateFrom) return false;
    if (filter.dateTo && targetDate > filter.dateTo) return false;
    return true;
  }
  return true;
}

export function describeDateFilter(
  filter: DateFilterValue,
  selectedMonth: string
): string {
  const prefix = filter.dateField === 'paidAt' ? 'Baixa: ' : '';
  if (filter.mode === 'month') return `${prefix}${formatMonthLabel(selectedMonth)}`;
  if (filter.mode === 'year') return `${prefix}Ano ${selectedMonth.slice(0, 4)}`;
  if (filter.mode === 'custom') {
    const from = filter.dateFrom ? formatDateBR(filter.dateFrom) : 'Início';
    const to = filter.dateTo ? formatDateBR(filter.dateTo) : 'Fim';
    return `${prefix}${from} até ${to}`;
  }
  return 'Todo o período';
}

interface DateRangeFilterProps {
  value?: DateFilterValue;
  onChange?: (next: DateFilterValue) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  selectedMonth?: string;
  modes?: DatePeriodMode[];
  showDateFieldSelector?: boolean;
  showQuickPresets?: boolean;
  compact?: boolean;
  label?: string;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  startDate,
  endDate,
  onDateRangeChange,
  selectedMonth = todayISO().slice(0, 7),
  modes = ['month', 'year', 'custom', 'all'],
  showDateFieldSelector = false,
  showQuickPresets = true,
  compact = false,
  label,
}) => {
  const currentValue: DateFilterValue = value ?? {
    mode: 'custom',
    dateFrom: startDate || '',
    dateTo: endDate || '',
    dateField: 'dueDate',
  };

  const emitChange = (next: DateFilterValue) => {
    if (onChange) onChange(next);
    if (onDateRangeChange) onDateRangeChange(next.dateFrom, next.dateTo);
  };

  const selectedYear = selectedMonth.slice(0, 4);
  const today = todayISO();

  const modeLabels: Record<DatePeriodMode, string> = {
    month: compact ? 'Mês' : `Mês (${formatMonthLabel(selectedMonth)})`,
    year: `Ano ${selectedYear}`,
    custom: 'Personalizado',
    all: 'Tudo',
  };

  const applyPreset = (days: number) => {
    const end = new Date(`${today}T00:00:00`);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    emitChange({
      ...currentValue,
      mode: 'custom',
      dateFrom: toIso(start),
      dateTo: toIso(end),
    });
  };

  const applyToday = () => {
    emitChange({
      ...currentValue,
      mode: 'custom',
      dateFrom: today,
      dateTo: today,
    });
  };

  const applyNextDays = (days: number) => {
    const start = new Date(`${today}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    emitChange({
      ...currentValue,
      mode: 'custom',
      dateFrom: toIso(start),
      dateTo: toIso(end),
    });
  };

  return (
    <div className="space-y-2.5">
      {(value || label) && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {label && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                {label}
              </span>
            )}
            {value && (
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {modes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => emitChange({ ...currentValue, mode: m })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[34px] ${
                      currentValue.mode === m
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {modeLabels[m]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showDateFieldSelector && currentValue.mode !== 'all' && (
              <select
                value={currentValue.dateField}
                onChange={(e) =>
                  emitChange({ ...currentValue, dateField: e.target.value as DateTargetField })
                }
                aria-label="Campo de data utilizado no filtro"
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[36px]"
              >
                <option value="dueDate">Por Vencimento</option>
                <option value="paidAt">Por Data da Baixa</option>
              </select>
            )}

            {value && currentValue.mode !== 'all' && currentValue.mode !== 'month' && (
              <button
                type="button"
                onClick={() => emitChange(createDateFilterState(selectedMonth, modes[0] || 'month'))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 px-2 py-1 whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                Resetar data
              </button>
            )}
          </div>
        </div>
      )}

      {currentValue.mode === 'custom' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                {currentValue.dateField === 'paidAt' ? 'Data da baixa (De)' : 'Data inicial (De)'}
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={currentValue.dateFrom}
                  onChange={(e) => emitChange({ ...currentValue, dateFrom: e.target.value })}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[38px] cursor-pointer dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                {currentValue.dateField === 'paidAt' ? 'Data da baixa (Até)' : 'Data final (Até)'}
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  value={currentValue.dateTo}
                  onChange={(e) => emitChange({ ...currentValue, dateTo: e.target.value })}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular min-h-[38px] cursor-pointer dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
              </div>
            </div>
          </div>

          {showQuickPresets && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={applyToday}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium hover:border-teal-600 whitespace-nowrap"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => applyNextDays(7)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium hover:border-teal-600 whitespace-nowrap"
              >
                Próx. 7 dias
              </button>
              <button
                type="button"
                onClick={() => applyNextDays(30)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium hover:border-teal-600 whitespace-nowrap"
              >
                Próx. 30 dias
              </button>
              <button
                type="button"
                onClick={() => applyPreset(30)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-medium hover:border-teal-600 whitespace-nowrap"
              >
                Últimos 30 dias
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
