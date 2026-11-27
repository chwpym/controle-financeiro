import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatBRL } from '../../utils/format';

interface Props {
  contractTotalCents: number;
  settledTotalCents: number;
  pendingTotalCents: number;
  totalCount: number;
  settledCount: number;
  pendingCount: number;
}

export const InstallmentHeaderCard: React.FC<Props> = ({
  contractTotalCents,
  settledTotalCents,
  pendingTotalCents,
  totalCount,
  settledCount,
  pendingCount,
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3.5">
      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
        Total do Contrato
      </span>
      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono-tabular block">
        {formatBRL(contractTotalCents)}
      </span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400">
        {totalCount} parcelas no total
      </span>
    </div>

    <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5">
      <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium block mb-1">
        Já Quitado
      </span>
      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-mono-tabular block">
        {formatBRL(settledTotalCents)}
      </span>
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
        <ShieldCheck className="w-3 h-3" />
        {settledCount} de {totalCount} quitadas (blindadas)
      </span>
    </div>

    <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 p-3.5">
      <span className="text-xs text-amber-800 dark:text-amber-300 font-medium block mb-1">
        Saldo Restante
      </span>
      <span className="text-lg font-bold text-amber-700 dark:text-amber-400 font-mono-tabular block">
        {formatBRL(pendingTotalCents)}
      </span>
      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
        {pendingCount}{' '}
        {pendingCount === 1 ? 'parcela pendente' : 'parcelas pendentes'}
      </span>
    </div>
  </div>
);
