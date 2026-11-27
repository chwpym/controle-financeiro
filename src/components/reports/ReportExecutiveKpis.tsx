import React from 'react';
import { formatBRL } from '../../utils/format';

export interface ReportSummary {
  recTotal: number;
  recSettled: number;
  payTotal: number;
  paySettled: number;
  overdueTotal: number;
  projectedNet: number;
  realizedNet: number;
}

interface ReportExecutiveKpisProps {
  summary: ReportSummary;
  count: number;
}

const CARD = 'rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4';

export const ReportExecutiveKpis: React.FC<ReportExecutiveKpisProps> = ({ summary, count }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div className={CARD}>
      <div className="text-xs text-slate-500 dark:text-slate-400">Receitas Filtradas</div>
      <div className="mt-1.5 text-xl font-display font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">
        {formatBRL(summary.recTotal)}
      </div>
      <div className="mt-1 text-xs font-mono-tabular text-slate-500">
        Recebido: {formatBRL(summary.recSettled)}
      </div>
    </div>
    <div className={CARD}>
      <div className="text-xs text-slate-500 dark:text-slate-400">Despesas Filtradas</div>
      <div className="mt-1.5 text-xl font-display font-bold font-mono-tabular text-rose-700 dark:text-rose-400">
        {formatBRL(summary.payTotal)}
      </div>
      <div className="mt-1 text-xs font-mono-tabular text-slate-500">
        Pago: {formatBRL(summary.paySettled)}
      </div>
    </div>
    <div className={CARD}>
      <div className="text-xs text-slate-500 dark:text-slate-400">Saldo Projetado</div>
      <div
        className={`mt-1.5 text-xl font-display font-bold font-mono-tabular ${
          summary.projectedNet >= 0
            ? 'text-slate-900 dark:text-white'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {formatBRL(summary.projectedNet)}
      </div>
      <div className="mt-1 text-xs font-mono-tabular text-slate-500">
        Realizado: {formatBRL(summary.realizedNet)}
      </div>
    </div>
    <div className={CARD}>
      <div className="text-xs text-slate-500 dark:text-slate-400">Total Vencido</div>
      <div className="mt-1.5 text-xl font-display font-bold font-mono-tabular text-amber-600 dark:text-amber-400">
        {formatBRL(summary.overdueTotal)}
      </div>
      <div className="mt-1 text-xs text-slate-500">{count} lançamento(s)</div>
    </div>
  </div>
);
