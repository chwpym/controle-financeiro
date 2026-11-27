import React from 'react';
import type { Transaction } from '../../types';
import { formatBRL, formatDateBR, isOverdue } from '../../utils/format';
import { Badge } from '../ui/Badge';

interface Props {
  groupTxs: Transaction[];
  today: string;
}

export const InstallmentScheduleList: React.FC<Props> = ({ groupTxs, today }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
      <span>Cronograma Atual de Parcelas</span>
      <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
        Parcelas quitadas permanecem intocadas
      </span>
    </div>

    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
      {groupTxs.map((tx) => {
        const isSettled = tx.status === 'settled';
        const overdue = isOverdue(tx, today);
        return (
          <div
            key={tx.id}
            className={`flex items-center justify-between py-2 px-3 text-xs ${
              isSettled
                ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                : overdue
                ? 'bg-rose-50/20 dark:bg-rose-950/10'
                : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono-tabular font-medium text-slate-800 dark:text-slate-200 min-w-[70px]">
                {tx.installmentNumber}/{tx.installmentTotal}
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-mono-tabular">
                Venc: {formatDateBR(tx.dueDate)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-bold font-mono-tabular text-slate-900 dark:text-white">
                {formatBRL(tx.amountCents)}
              </span>

              {isSettled ? (
                <Badge variant="settled" size="sm" showIcon>
                  {tx.type === 'receivable' ? 'Recebido' : 'Pago'}{' '}
                  {tx.paidAt ? `(${formatDateBR(tx.paidAt)})` : ''}
                </Badge>
              ) : overdue ? (
                <Badge variant="overdue" size="sm" showIcon>
                  Vencido
                </Badge>
              ) : (
                <Badge variant="pending" size="sm" showIcon>
                  Pendente
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
