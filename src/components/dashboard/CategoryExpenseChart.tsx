import React, { useMemo } from 'react';
import { Plus } from 'lucide-react';
import type { Category, Transaction } from '../../types';
import { formatBRL } from '../../utils/format';

export interface CategoryExpenseChartProps {
  monthRows: Transaction[];
  categories: Category[];
  onOpenNewTransaction: () => void;
  dragControls?: React.ReactNode;
}

export const CategoryExpenseChart: React.FC<CategoryExpenseChartProps> = ({
  monthRows,
  categories,
  onOpenNewTransaction,
  dragControls,
}) => {
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Category breakdown (Payables of selectedMonth)
  const categoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    let sum = 0;
    for (const t of monthRows) {
      if (t.type !== 'payable') continue;
      const key = t.categoryId || '__none__';
      totals.set(key, (totals.get(key) || 0) + t.amountCents);
      sum += t.amountCents;
    }
    const items = Array.from(totals.entries())
      .map(([catId, cents]) => {
        const cat = catId !== '__none__' ? catMap.get(catId) : undefined;
        return {
          id: catId,
          name: cat?.name || 'Sem categoria',
          color: cat?.color || '#64748B',
          cents,
          pct: sum > 0 ? Math.round((cents / sum) * 100) : 0,
        };
      })
      .sort((a, b) => b.cents - a.cents);
    return { items, sum };
  }, [monthRows, catMap]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
            Despesas por Categoria
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribuição de contas a pagar no mês
          </p>
        </div>
        {dragControls}
      </div>

      {categoryBreakdown.items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-xs text-slate-500 dark:text-slate-400">
          <p>Nenhuma despesa registrada neste mês.</p>
          <button
            type="button"
            onClick={onOpenNewTransaction}
            className="mt-3 inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            Lançar conta
          </button>
        </div>
      ) : (
        <div className="space-y-3.5 flex-1">
          {categoryBreakdown.items.slice(0, 6).map((cat) => (
            <div key={cat.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200 truncate pr-2">
                  {cat.name}
                </span>
                <span className="font-mono-tabular text-slate-900 dark:text-white font-semibold shrink-0">
                  {formatBRL(cat.cents)} · {cat.pct}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(4, cat.pct)}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
