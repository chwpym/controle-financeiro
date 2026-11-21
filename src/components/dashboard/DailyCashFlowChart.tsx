import React, { useMemo } from 'react';
import type { Transaction } from '../../types';
import { formatBRL } from '../../utils/format';

export interface DailyCashFlowChartProps {
  monthRows: Transaction[];
  selectedMonth: string;
  onOpenAnalytics?: () => void;
  dragControls?: React.ReactNode;
}

export const DailyCashFlowChart: React.FC<DailyCashFlowChartProps> = ({
  monthRows,
  selectedMonth,
  onOpenAnalytics,
  dragControls,
}) => {
  // Daily Cash Flow Projection for selectedMonth
  const dailyCashFlow = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const daysInMonth = year && month ? new Date(year, month, 0).getDate() : 30;

    const byDay = new Map<number, { rec: number; pay: number }>();
    for (const t of monthRows) {
      const dayNum = Number(t.dueDate.slice(8, 10));
      if (!dayNum) continue;
      const cur = byDay.get(dayNum) || { rec: 0, pay: 0 };
      if (t.type === 'receivable') cur.rec += t.amountCents;
      else cur.pay += t.amountCents;
      byDay.set(dayNum, cur);
    }

    let running = 0;
    let minBalance = 0;
    let minDay = 1;
    let maxAbs = 10000;
    let activeDays = 0;

    const points = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const item = byDay.get(day) || { rec: 0, pay: 0 };
      if (item.rec > 0 || item.pay > 0) activeDays += 1;
      running += item.rec - item.pay;
      if (running < minBalance) {
        minBalance = running;
        minDay = day;
      }
      maxAbs = Math.max(maxAbs, Math.abs(running));
      return {
        day,
        dateIso: `${selectedMonth}-${String(day).padStart(2, '0')}`,
        rec: item.rec,
        pay: item.pay,
        balance: running,
      };
    });

    return {
      points,
      daysInMonth,
      minBalance,
      minDay,
      endingBalance: running,
      maxAbs,
      activeDays,
    };
  }, [monthRows, selectedMonth]);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
            Fluxo de Caixa Diário (Projeção)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Evolução acumulada dia a dia no mês selecionado
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right font-mono-tabular">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Menor saldo</div>
            <div
              className={`text-sm font-bold ${
                dailyCashFlow.minBalance < 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatBRL(dailyCashFlow.minBalance)}
              {dailyCashFlow.minBalance < 0
                ? ` (dia ${String(dailyCashFlow.minDay).padStart(2, '0')})`
                : ''}
            </div>
          </div>
          {dragControls}
        </div>
      </div>

      {dailyCashFlow.activeDays === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
          Sem vencimentos registrados neste mês para projetar o saldo diário.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-40 w-full">
            {(() => {
              const pts = dailyCashFlow.points;
              const maxAbs = dailyCashFlow.maxAbs;
              const zeroY = 75;
              const scale = 60 / maxAbs;
              const coords = pts.map((pt, idx) => {
                const x = pts.length > 1 ? (idx / (pts.length - 1)) * 560 + 20 : 300;
                const y = zeroY - pt.balance * scale;
                return { x, y, pt };
              });
              const polyline = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
              const minPoint = coords[dailyCashFlow.minDay - 1];

              return (
                <svg
                  viewBox="0 0 600 155"
                  className="w-full h-full overflow-visible"
                  role="img"
                  aria-label="Curva de saldo acumulado diário do mês"
                >
                  <line
                    x1="20"
                    x2="580"
                    y1={zeroY}
                    y2={zeroY}
                    className="stroke-slate-300 dark:stroke-slate-700"
                    strokeDasharray="4 4"
                  />
                  <polyline
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="stroke-teal-700 dark:stroke-teal-400"
                    points={polyline}
                  />
                  {minPoint && dailyCashFlow.minBalance < 0 && (
                    <circle
                      cx={minPoint.x}
                      cy={minPoint.y}
                      r={4.5}
                      className="fill-red-600 dark:fill-red-400"
                    />
                  )}
                  <text x="20" y="148" className="text-[10px] fill-slate-400 font-mono-tabular">
                    Dia 01
                  </text>
                  <text
                    x="300"
                    y="148"
                    textAnchor="middle"
                    className="text-[10px] fill-slate-400 font-mono-tabular"
                  >
                    Dia {String(Math.ceil(dailyCashFlow.daysInMonth / 2)).padStart(2, '0')}
                  </text>
                  <text
                    x="580"
                    y="148"
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-mono-tabular"
                  >
                    Dia {String(dailyCashFlow.daysInMonth).padStart(2, '0')}
                  </text>
                </svg>
              );
            })()}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {dailyCashFlow.activeDays} dia(s) com vencimentos · Saldo final:{' '}
              <strong className="font-mono-tabular text-slate-900 dark:text-white">
                {formatBRL(dailyCashFlow.endingBalance)}
              </strong>
            </span>
            {onOpenAnalytics && (
              <button
                type="button"
                onClick={onOpenAnalytics}
                className="font-semibold text-teal-700 dark:text-teal-400 hover:underline whitespace-nowrap"
              >
                Ver gráficos detalhados
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};
