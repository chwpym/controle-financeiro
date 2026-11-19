import React, { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import type { RecurrenceInterval, TransactionType } from '../../types';
import {
  formatBRL,
  formatDateBR,
  nextRecurrenceDate,
  PAYMENT_METHODS,
  RECURRENCE_LABELS,
  RECURRING_TEMPLATES,
} from '../../utils/format';

export interface RecurrenceSectionProps {
  type: TransactionType;
  description: string;
  onSelectTemplate: (template: string) => void;
  dueDate: string;
  parsedCents: number;
  recurrenceInterval: RecurrenceInterval;
  onRecurrenceIntervalChange: (interval: RecurrenceInterval) => void;
  recurrenceOccurrences: number;
  onRecurrenceOccurrencesChange: (count: number) => void;
  markFirstSettled: boolean;
  onMarkFirstSettledChange: (checked: boolean) => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
}

/**
 * Bloco de configuração de contas recorrentes/fixas com modelos rápidos e prévia.
 */
export const RecurrenceSection: React.FC<RecurrenceSectionProps> = ({
  type,
  description,
  onSelectTemplate,
  dueDate,
  parsedCents,
  recurrenceInterval,
  onRecurrenceIntervalChange,
  recurrenceOccurrences,
  onRecurrenceOccurrencesChange,
  markFirstSettled,
  onMarkFirstSettledChange,
  paymentMethod,
  onPaymentMethodChange,
}) => {
  const recurringPreview = useMemo(() => {
    if (parsedCents <= 0) return [];
    const count = Math.max(1, Math.min(24, recurrenceOccurrences));
    return Array.from({ length: count }, (_, idx) => ({
      num: idx + 1,
      dueDate: nextRecurrenceDate(dueDate, recurrenceInterval, idx),
      cents: parsedCents,
    }));
  }, [parsedCents, recurrenceOccurrences, dueDate, recurrenceInterval]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Modelos rápidos de contas fixas:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RECURRING_TEMPLATES.map((tpl) => (
            <button
              key={tpl}
              type="button"
              onClick={() => onSelectTemplate(tpl)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                description === tpl
                  ? 'border-teal-700 bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tpl}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/50 dark:bg-teal-950/20 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-900 dark:text-teal-200">
            <Repeat className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>Configuração de Conta Recorrente / Fixa</span>
          </div>
          <span className="text-[11px] font-mono-tabular text-teal-700 dark:text-teal-300">
            {RECURRENCE_LABELS[recurrenceInterval]}
          </span>
        </div>

        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          Ideal para água, energia, internet, aluguel ou licenças de software. Ao dar baixa em qualquer vencimento o sistema cria o próximo automaticamente.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Periodicidade</label>
            <select
              value={recurrenceInterval}
              onChange={(e) => onRecurrenceIntervalChange(e.target.value as RecurrenceInterval)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
            >
              <option value="monthly">Mensal (todo mês)</option>
              <option value="biweekly">Quinzenal (a cada 15 dias)</option>
              <option value="yearly">Anual (todo ano)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Gerar quantos períodos agora?</label>
            <select
              value={recurrenceOccurrences}
              onChange={(e) => onRecurrenceOccurrencesChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
            >
              <option value={1}>Apenas o 1º (renova na baixa)</option>
              <option value={3}>3 períodos</option>
              <option value={6}>6 períodos</option>
              <option value={12}>12 períodos (1 ano)</option>
              <option value={24}>24 períodos (2 anos)</option>
            </select>
          </div>
        </div>

        {recurringPreview.length > 0 && (
          <div className="pt-2 border-t border-teal-200/70 dark:border-teal-800/70">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
              <span>Próximos vencimentos gerados</span>
              <span className="font-mono-tabular">{recurringPreview.length}x de {formatBRL(parsedCents)}</span>
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
              {recurringPreview.map((p) => (
                <div key={p.num} className="flex items-center justify-between text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
                  <span>{p.num}º vencimento · {formatDateBR(p.dueDate)}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{formatBRL(p.cents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={markFirstSettled}
            onChange={(e) => onMarkFirstSettledChange(e.target.checked)}
            className="rounded border-slate-300 text-teal-700 focus:ring-teal-600 w-4 h-4"
          />
          <span>Marcar o 1º vencimento como já pago / recebido</span>
        </label>

        {markFirstSettled && (
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              {type === 'receivable' ? 'Forma de recebimento' : 'Forma de pagamento'}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
            >
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};
