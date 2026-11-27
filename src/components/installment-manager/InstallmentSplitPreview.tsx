import React from 'react';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import type { Transaction } from '../../types';
import { formatBRL, formatDateBR } from '../../utils/format';
import { InstallmentPreviewRows } from './InstallmentPreviewRows';

interface Props {
  splitCount: number;
  splitPreviewTxs: Transaction[];
  showFull: boolean;
  onToggleFull: () => void;
}

export const InstallmentSplitPreview: React.FC<Props> = ({
  splitCount,
  splitPreviewTxs,
  showFull,
  onToggleFull,
}) => {
  const rows = splitPreviewTxs.map((t) => ({
    num: t.installmentNumber,
    total: t.installmentTotal,
    dueDate: t.dueDate,
    cents: t.amountCents,
  }));
  return (
    <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
        <span>Prévia do Parcelamento ({splitCount}x)</span>
        <span className="font-mono-tabular text-teal-700 dark:text-teal-400">
          Total: {formatBRL(splitPreviewTxs.reduce((s, t) => s + t.amountCents, 0))}
        </span>
      </div>

      {splitCount <= 6 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
          <InstallmentPreviewRows items={rows} />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="rounded-xl border border-teal-200/80 dark:border-teal-800/70 bg-white dark:bg-slate-900/80 p-3 space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
              • 1ª parcela de {formatBRL(splitPreviewTxs[0]?.amountCents || 0)} em{' '}
              {formatDateBR(splitPreviewTxs[0]?.dueDate || '')}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
              • Demais parcelas de{' '}
              {formatBRL(splitPreviewTxs[1]?.amountCents || 0)} mensais até{' '}
              {formatDateBR(splitPreviewTxs[splitPreviewTxs.length - 1]?.dueDate || '')}
            </p>
            <button
              type="button"
              onClick={onToggleFull}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-teal-700 dark:text-teal-400 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>
                {showFull
                  ? 'Recolher grade completa'
                  : `Expandir grade completa (${splitCount} parcelas)`}
              </span>
              {showFull ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showFull && (
            <div className="max-h-44 overflow-y-auto pr-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2">
              <InstallmentPreviewRows items={rows} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
