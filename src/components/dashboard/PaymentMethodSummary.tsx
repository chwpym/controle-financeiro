import React, { useMemo } from 'react';
import type { Transaction } from '../../types';
import { formatBRL } from '../../utils/format';

export interface PaymentMethodSummaryProps {
  monthRows: Transaction[];
  dragControls?: React.ReactNode;
}

export const PaymentMethodSummary: React.FC<PaymentMethodSummaryProps> = ({
  monthRows,
  dragControls,
}) => {
  // Payment Method Breakdown (settled transactions of selectedMonth)
  const paymentMethodSummary = useMemo(() => {
    const map = new Map<string, { rec: number; pay: number; count: number }>();
    let totalSettled = 0;

    for (const t of monthRows) {
      if (t.status !== 'settled') continue;
      const method = t.paymentMethod?.trim() || 'Não informado';
      const cur = map.get(method) || { rec: 0, pay: 0, count: 0 };
      if (t.type === 'receivable') cur.rec += t.amountCents;
      else cur.pay += t.amountCents;
      cur.count += 1;
      totalSettled += t.amountCents;
      map.set(method, cur);
    }

    const items = Array.from(map.entries())
      .map(([method, data]) => {
        const total = data.rec + data.pay;
        return {
          method,
          ...data,
          total,
          pct: totalSettled > 0 ? Math.round((total / totalSettled) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { items, totalSettled };
  }, [monthRows]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
            Resumo por Forma de Pagamento
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Movimentação já liquidada no mês selecionado
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-tabular font-semibold text-slate-700 dark:text-slate-200">
            {formatBRL(paymentMethodSummary.totalSettled)}
          </span>
          {dragControls}
        </div>
      </div>

      {paymentMethodSummary.items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 text-center text-xs text-slate-500 dark:text-slate-400">
          Nenhuma conta baixada neste mês ainda.
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {paymentMethodSummary.items.map((item) => (
            <div key={item.method} className="space-y-1">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                  {item.method} · <span className="text-slate-500">{item.count}x</span>
                </span>
                <span className="font-mono-tabular font-semibold text-slate-900 dark:text-white shrink-0">
                  {formatBRL(item.total)} ({item.pct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-600 dark:bg-teal-500"
                  style={{ width: `${Math.max(4, item.pct)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                <span>Entradas: {formatBRL(item.rec)}</span>
                <span>Saídas: {formatBRL(item.pay)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
