import React from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { formatBRL } from '../../utils/format';

export interface BatchActionBarProps {
  selectedCount: number;
  pendingCount: number;
  selectedTotalCents: number;
  onOpenBatchSettle: () => void;
  onOpenBatchDelete: () => void;
  onClearSelection: () => void;
}

/**
 * Barra de ações em lote exibida quando há um ou mais lançamentos selecionados.
 */
export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  pendingCount,
  selectedTotalCents,
  onOpenBatchSettle,
  onOpenBatchDelete,
  onClearSelection,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="rounded-2xl border border-teal-300 dark:border-teal-800 bg-teal-50/90 dark:bg-teal-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-teal-900 dark:text-teal-100 flex flex-wrap items-center gap-2">
        <strong>{selectedCount} selecionado(s)</strong>
        <span aria-hidden="true">·</span>
        <span className="font-mono-tabular">
          Soma: <strong>{formatBRL(selectedTotalCents)}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onOpenBatchSettle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[38px] cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Dar baixa em lote ({pendingCount})
          </button>
        )}

        <button
          type="button"
          onClick={onOpenBatchDelete}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 min-h-[38px] cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir ({selectedCount})
        </button>

        <button
          type="button"
          onClick={onClearSelection}
          className="px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-700 text-xs font-semibold text-teal-900 dark:text-teal-200 hover:bg-white/60 dark:hover:bg-slate-900/40 min-h-[38px] cursor-pointer"
        >
          Limpar seleção
        </button>
      </div>
    </div>
  );
};
