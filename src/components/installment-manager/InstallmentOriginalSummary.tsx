import React from 'react';
import type { Contact, Transaction } from '../../types';
import { formatBRL, formatDateBR } from '../../utils/format';

interface Props {
  transaction: Transaction;
  contactMap: Map<string, Contact>;
}

export const InstallmentOriginalSummary: React.FC<Props> = ({ transaction, contactMap }) => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
    <div>
      <span className="text-slate-500 dark:text-slate-400 block">Valor Original</span>
      <span className="font-bold text-slate-900 dark:text-white font-mono-tabular text-sm">
        {formatBRL(transaction.amountCents)}
      </span>
    </div>
    <div>
      <span className="text-slate-500 dark:text-slate-400 block">Contato / Fornecedor</span>
      <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
        {contactMap.get(transaction.contactId || '')?.name || '—'}
      </span>
    </div>
    <div>
      <span className="text-slate-500 dark:text-slate-400 block">Documento / NF</span>
      <span className="font-medium text-slate-800 dark:text-slate-200 font-mono-tabular truncate block">
        {transaction.documentNumber || '—'}
      </span>
    </div>
    <div>
      <span className="text-slate-500 dark:text-slate-400 block">Vencimento Original</span>
      <span className="font-medium text-slate-800 dark:text-slate-200 font-mono-tabular">
        {formatDateBR(transaction.dueDate)}
      </span>
    </div>
  </div>
);
