import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, Layers } from 'lucide-react';
import type { TransactionType } from '../../types';
import {
  addMonthsISO,
  formatBRL,
  formatDateBR,
  MAX_INSTALLMENTS,
  PAYMENT_METHODS,
  QUICK_INSTALLMENT_PRESETS,
} from '../../utils/format';

export interface InstallmentSectionProps {
  type: TransactionType;
  dueDate: string;
  parsedCents: number;
  installments: number;
  onInstallmentsChange: (next: number) => void;
  installmentsLimitExceeded: boolean;
  onLimitExceededChange: (exceeded: boolean) => void;
  amountMode: 'total' | 'per_installment';
  onAmountModeChange: (mode: 'total' | 'per_installment') => void;
  markFirstSettled: boolean;
  onMarkFirstSettledChange: (checked: boolean) => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
}

/**
 * Bloco completo de parcelamento flexível (1x a 420x) com atalhos, prévia compacta e baixa inicial.
 */
export const InstallmentSection: React.FC<InstallmentSectionProps> = ({
  type,
  dueDate,
  parsedCents,
  installments,
  onInstallmentsChange,
  installmentsLimitExceeded,
  onLimitExceededChange,
  amountMode,
  onAmountModeChange,
  markFirstSettled,
  onMarkFirstSettledChange,
  paymentMethod,
  onPaymentMethodChange,
}) => {
  const [installmentsInput, setInstallmentsInput] = useState<string>(String(installments));
  const [showFullPreview, setShowFullPreview] = useState<boolean>(false);

  const selectPreset = (preset: number) => {
    const clamped = Math.max(1, Math.min(MAX_INSTALLMENTS, Math.floor(preset || 1)));
    onInstallmentsChange(clamped);
    setInstallmentsInput(String(clamped));
    onLimitExceededChange(false);
    if (clamped <= 6) setShowFullPreview(false);
  };

  const handleInputChange = (raw: string) => {
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setInstallmentsInput('');
      onLimitExceededChange(false);
      return;
    }
    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed)) return;

    setInstallmentsInput(digitsOnly);
    if (parsed > MAX_INSTALLMENTS) {
      onLimitExceededChange(true);
      onInstallmentsChange(MAX_INSTALLMENTS);
      return;
    }

    onLimitExceededChange(false);
    const clamped = Math.max(1, parsed);
    onInstallmentsChange(clamped);
    if (clamped <= 6) setShowFullPreview(false);
  };

  const installmentPreview = useMemo(() => {
    if (installments <= 1 || parsedCents <= 0) return [];
    const count = Math.min(MAX_INSTALLMENTS, Math.max(2, installments));
    const list: { num: number; dueDate: string; cents: number }[] = [];
    if (amountMode === 'per_installment') {
      for (let i = 0; i < count; i++) {
        list.push({ num: i + 1, dueDate: addMonthsISO(dueDate, i), cents: parsedCents });
      }
    } else {
      const base = Math.floor(parsedCents / count);
      const rem = parsedCents - base * count;
      for (let i = 0; i < count; i++) {
        list.push({
          num: i + 1,
          dueDate: addMonthsISO(dueDate, i),
          cents: Math.max(1, base + (i === 0 ? rem : 0)),
        });
      }
    }
    return list;
  }, [installments, parsedCents, amountMode, dueDate]);

  const summary = useMemo(() => {
    if (installmentPreview.length === 0) return null;
    const first = installmentPreview[0];
    const last = installmentPreview[installmentPreview.length - 1];
    const totalCents = installmentPreview.reduce((sum, p) => sum + p.cents, 0);
    return { count: installmentPreview.length, first, last, totalCents, allEqual: first.cents === last.cents };
  }, [installmentPreview]);

  const renderRows = () =>
    installmentPreview.map((p) => (
      <div key={p.num} className="flex items-center justify-between text-xs font-mono-tabular text-slate-600 dark:text-slate-300 py-0.5">
        <span>Parcela {p.num}/{installments} · {formatDateBR(p.dueDate)}</span>
        <span className="font-semibold text-slate-900 dark:text-white">{formatBRL(p.cents)}</span>
      </div>
    ));

  const yearsSuffix =
    installments >= 12
      ? ` (${(installments / 12).toFixed(installments % 12 === 0 ? 0 : 1)} ${installments === 12 ? 'ano' : 'anos'})`
      : '';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
          <Layers className="w-4 h-4 text-teal-700 dark:text-teal-400" />
          <span>Parcelamento</span>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono-tabular">
          {installments === 1 ? 'À vista (1x)' : `${installments} parcelas mensais${yearsSuffix}`}
        </span>
      </div>

      <div className="space-y-1.5">
        <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Atalhos rápidos</span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_INSTALLMENT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => selectPreset(preset)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold font-mono-tabular transition-colors cursor-pointer ${
                installments === preset
                  ? 'border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {preset === 1 ? '1x (À vista)' : `${preset}x`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="installments-count-input" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
            Ou digite a quantidade desejada (1 a 420x):
          </label>
          <input
            id="installments-count-input"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={installmentsInput}
            placeholder="Ex: 7, 48, 84, 180..."
            aria-invalid={installmentsLimitExceeded}
            aria-describedby={installmentsLimitExceeded ? 'installments-limit-warning' : undefined}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={() => {
              if (!installmentsInput.trim()) {
                setInstallmentsInput(String(installments));
                onLimitExceededChange(false);
              } else if (!installmentsLimitExceeded) {
                setInstallmentsInput(String(installments));
              }
            }}
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-sm font-mono-tabular min-h-[42px] focus:outline-none focus:ring-2 ${
              installmentsLimitExceeded
                ? 'border-amber-500 focus:ring-amber-500/30'
                : 'border-slate-200 dark:border-slate-700 focus:ring-teal-600/30 focus:border-teal-600'
            }`}
          />
          {installmentsLimitExceeded && (
            <p id="installments-limit-warning" role="alert" className="mt-1.5 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-2 text-[11px] leading-relaxed font-medium text-amber-800 dark:text-amber-200">
              ⚠️ O limite padrão do sistema é de até 420 parcelas (35 anos). Caso necessite de um prazo superior para este contrato, entre em contato com o desenvolvedor/suporte para liberar o limite.
            </p>
          )}
        </div>

        {installments > 1 && (
          <div>
            <label htmlFor="installments-amount-mode" className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              Cálculo do valor informado
            </label>
            <select
              id="installments-amount-mode"
              value={amountMode}
              onChange={(e) => onAmountModeChange(e.target.value as 'total' | 'per_installment')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
            >
              <option value="total">Dividir valor total em {installments}x</option>
              <option value="per_installment">Repetir valor em cada parcela</option>
            </select>
          </div>
        )}
      </div>

      {installmentPreview.length > 0 && installmentPreview.length <= 6 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Prévia das parcelas</span>
            <span className="font-mono-tabular">Total: {formatBRL(summary?.totalCents || 0)}</span>
          </div>
          <div className="space-y-1">{renderRows()}</div>
        </div>
      )}

      {installmentPreview.length > 6 && summary && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70 space-y-2.5">
          <div className="rounded-xl border border-teal-200/80 dark:border-teal-800/70 bg-white dark:bg-slate-900/80 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
              <span>Resumo do Parcelamento ({summary.count} parcelas)</span>
              <span className="font-mono-tabular text-teal-700 dark:text-teal-400">Total: {formatBRL(summary.totalCents)}</span>
            </div>
            <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
              <li>
                • {summary.allEqual
                  ? `${summary.count} parcelas mensais de ${formatBRL(summary.first.cents)}`
                  : `1ª parcela de ${formatBRL(summary.first.cents)} + ${summary.count - 1}x de ${formatBRL(summary.last.cents)}`}
              </li>
              <li>• 1ª parcela: {formatDateBR(summary.first.dueDate)} · Última parcela: {formatDateBR(summary.last.dueDate)}</li>
            </ul>
            <button
              type="button"
              onClick={() => setShowFullPreview((prev) => !prev)}
              aria-expanded={showFullPreview}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showFullPreview ? 'Recolher grade completa' : `Expandir grade completa (${summary.count} parcelas)`}</span>
              {showFullPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          {showFullPreview && (
            <div className="max-h-44 overflow-y-auto space-y-1 pr-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5">
              {renderRows()}
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
        <input
          type="checkbox"
          checked={markFirstSettled}
          onChange={(e) => onMarkFirstSettledChange(e.target.checked)}
          className="rounded border-slate-300 text-teal-700 focus:ring-teal-600 w-4 h-4"
        />
        <span>{installments > 1 ? 'Marcar a 1ª parcela como já paga / recebida' : 'Marcar como já paga / recebida'}</span>
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
  );
};
