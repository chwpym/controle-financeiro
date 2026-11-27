import React from 'react';
import { formatBRL, formatDateBR } from '../../utils/format';

export interface InstallmentPreviewRow {
  num: number;
  total: number;
  dueDate: string;
  cents: number;
}

export const InstallmentPreviewRows: React.FC<{ items: InstallmentPreviewRow[] }> = ({ items }) => (
  <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono-tabular">
    {items.map((it) => (
      <div key={it.num} className="flex items-center justify-between py-1.5 px-2">
        <span className="text-slate-600 dark:text-slate-300 font-medium">
          Parcela {it.num}/{it.total}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {formatDateBR(it.dueDate)}
        </span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {formatBRL(it.cents)}
        </span>
      </div>
    ))}
  </div>
);
