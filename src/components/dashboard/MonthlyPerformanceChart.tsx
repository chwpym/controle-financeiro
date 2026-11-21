import React, { useMemo, useState } from 'react';
import type { Transaction } from '../../types';
import { formatBRL, shiftMonthKey } from '../../utils/format';

export interface MonthlyPerformanceChartProps {
  transactions: Transaction[];
  selectedMonth: string;
  dragControls?: React.ReactNode;
}

export const MonthlyPerformanceChart: React.FC<MonthlyPerformanceChartProps> = ({
  transactions,
  selectedMonth,
  dragControls,
}) => {
  const [hoveredBarIdx, setHoveredBarIdx] = useState<number | null>(null);

  // 6-Month trailing & upcoming performance series
  const sixMonthSeries = useMemo(() => {
    const keys = [-4, -3, -2, -1, 0, 1].map((delta) => shiftMonthKey(selectedMonth, delta));
    return keys.map((ym) => {
      let rec = 0;
      let pay = 0;
      for (const t of transactions) {
        if (!t.dueDate.startsWith(ym)) continue;
        if (t.type === 'receivable') rec += t.amountCents;
        else pay += t.amountCents;
      }
      const [y, m] = ym.split('-');
      const shortMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(
        new Date(Number(y), Number(m) - 1, 1)
      );
      return {
        ym,
        label: shortMonth.replace('.', ''),
        receivableCents: rec,
        payableCents: pay,
      };
    });
  }, [transactions, selectedMonth]);

  const maxChartCents = useMemo(() => {
    const maxVal = sixMonthSeries.reduce(
      (acc, item) => Math.max(acc, item.receivableCents, item.payableCents),
      0
    );
    return Math.max(maxVal, 10000);
  }, [sixMonthSeries]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
            Desempenho Mensal (BRL)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparativo de receitas e despesas ao redor do mês selecionado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
              A Receber
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
              A Pagar
            </span>
          </div>
          {dragControls}
        </div>
      </div>

      <div className="relative h-60 w-full">
        <svg
          viewBox="0 0 600 220"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label="Gráfico comparativo mensal de contas a receber e pagar"
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = 185 - ratio * 155;
            return (
              <g key={ratio}>
                <line
                  x1="0"
                  x2="600"
                  y1={y}
                  y2={y}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeDasharray="3 3"
                />
              </g>
            );
          })}

          {sixMonthSeries.map((pt, idx) => {
            const groupWidth = 600 / sixMonthSeries.length;
            const center = idx * groupWidth + groupWidth / 2;
            const recH = Math.max(3, (pt.receivableCents / maxChartCents) * 155);
            const payH = Math.max(3, (pt.payableCents / maxChartCents) * 155);
            const isSelected = pt.ym === selectedMonth;

            return (
              <g
                key={pt.ym}
                onMouseEnter={() => setHoveredBarIdx(idx)}
                onMouseLeave={() => setHoveredBarIdx(null)}
                className="cursor-pointer"
              >
                {isSelected && (
                  <rect
                    x={center - 34}
                    y={18}
                    width={68}
                    height={172}
                    rx={8}
                    className="fill-slate-100 dark:fill-slate-800/60"
                  />
                )}
                <rect
                  x={center - 20}
                  y={185 - recH}
                  width={17}
                  height={recH}
                  rx={4}
                  className="fill-emerald-600 dark:fill-emerald-500 transition-opacity"
                  opacity={hoveredBarIdx === null || hoveredBarIdx === idx ? 1 : 0.45}
                />
                <rect
                  x={center + 3}
                  y={185 - payH}
                  width={17}
                  height={payH}
                  rx={4}
                  className="fill-rose-600 dark:fill-rose-500 transition-opacity"
                  opacity={hoveredBarIdx === null || hoveredBarIdx === idx ? 1 : 0.45}
                />
                <text
                  x={center}
                  y={206}
                  textAnchor="middle"
                  className={`text-[11px] uppercase ${
                    isSelected
                      ? 'fill-slate-900 dark:fill-white font-bold'
                      : 'fill-slate-500 dark:fill-slate-400 font-medium'
                  }`}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>

        {hoveredBarIdx !== null && sixMonthSeries[hoveredBarIdx] && (
          <div className="mt-2 flex items-center justify-center gap-4 text-xs font-mono-tabular text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 rounded-lg py-1.5 px-3 border border-slate-200 dark:border-slate-700">
            <span className="font-semibold uppercase">{sixMonthSeries[hoveredBarIdx].ym}</span>
            <span>Receber: {formatBRL(sixMonthSeries[hoveredBarIdx].receivableCents)}</span>
            <span>Pagar: {formatBRL(sixMonthSeries[hoveredBarIdx].payableCents)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
