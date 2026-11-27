import React from 'react';
import { Eye } from 'lucide-react';
import type { Category, Contact, Transaction } from '../../types';
import { formatBRL, formatDateBR, isOverdue } from '../../utils/format';

interface ReportCategoryBreakdownProps {
  periodLabel: string;
  scopedTransactions: Transaction[];
  catMap: Map<string, Category>;
  contactMap: Map<string, Contact>;
  today: string;
  onOpenConsult: (tx: Transaction) => void;
}

/** Detailed per-transaction report table (category/contact columns). */
export const ReportCategoryBreakdown: React.FC<ReportCategoryBreakdownProps> = ({
  periodLabel,
  scopedTransactions,
  catMap,
  contactMap,
  today,
  onOpenConsult,
}) => (
  <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-white">
        Detalhamento — {periodLabel}
      </h3>
      <span className="text-xs font-mono-tabular text-slate-500">
        {scopedTransactions.length} registro(s)
      </span>
    </div>

    {scopedTransactions.length === 0 ? (
      <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Nenhum lançamento encontrado para os filtros selecionados.
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
              <th className="py-3 px-4">Vencimento</th>
              <th className="py-3 px-4">Descrição</th>
              <th className="py-3 px-4">Parcela</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Contato</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Valor (BRL)</th>
              <th className="py-3 px-4 text-right">Recibo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {scopedTransactions.map((t) => {
              const cat = t.categoryId ? catMap.get(t.categoryId)?.name : 'Sem categoria';
              const contact = t.contactId ? contactMap.get(t.contactId)?.name : '—';
              const overdue = isOverdue(t, today);
              const statusLabel =
                t.status === 'settled'
                  ? t.type === 'receivable'
                    ? 'Recebido'
                    : 'Pago'
                  : overdue
                    ? 'Vencido'
                    : 'Pendente';

              return (
                <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-4 font-mono-tabular whitespace-nowrap">
                    {formatDateBR(t.dueDate)}
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                    <button
                      type="button"
                      onClick={() => onOpenConsult(t)}
                      className="text-left hover:text-teal-700 dark:hover:text-teal-400"
                    >
                      {t.description}
                    </button>
                  </td>
                  <td className="py-2.5 px-4 font-mono-tabular whitespace-nowrap">
                    {t.installmentTotal > 1 ? `${t.installmentNumber}/${t.installmentTotal}` : '1/1'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{cat}</td>
                  <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">{contact}</td>
                  <td className="py-2.5 px-4 font-semibold whitespace-nowrap">
                    <span
                      className={
                        t.status === 'settled'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : overdue
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                      }
                    >
                      {statusLabel}
                      {t.status === 'settled' && t.paymentMethod ? ` (${t.paymentMethod})` : ''}
                    </span>
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                      t.type === 'receivable'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {t.type === 'receivable' ? '+' : '-'} {formatBRL(t.amountCents)}
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpenConsult(t)}
                      title="Consultar lançamento e gerar recibo PDF"
                      className="p-1.5 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
);
