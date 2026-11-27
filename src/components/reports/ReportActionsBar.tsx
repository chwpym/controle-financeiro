import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import type { Category, Company, Contact, Transaction } from '../../types';
import {
  exportBlankReceiptPDF,
  exportTransactionsToExcel,
  exportTransactionsToPDF,
} from '../../utils/exporters';

interface ReportActionsBarProps {
  username: string;
  periodLabel: string;
  filterSummary?: string;
  scopedTransactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
  companies: Company[];
  selectedCompanyId: string | 'all';
}

export const ReportActionsBar: React.FC<ReportActionsBarProps> = ({
  username,
  periodLabel,
  filterSummary,
  scopedTransactions,
  categories,
  contacts,
  companies,
  selectedCompanyId,
}) => (
  <div className="flex flex-wrap items-center gap-2 shrink-0">
    <button
      type="button"
      data-testid="reports-blank-receipt-btn"
      onClick={() => {
        const activeComp =
          (selectedCompanyId && selectedCompanyId !== 'all'
            ? companies.find((c) => c.id === selectedCompanyId)
            : undefined) ||
          companies.find((c) => c.isDefault) ||
          companies[0];
        exportBlankReceiptPDF(activeComp);
      }}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[40px] whitespace-nowrap cursor-pointer"
    >
      <FileText className="w-4 h-4 text-teal-700 dark:text-teal-400" />
      <span>📄 Recibo em Branco</span>
    </button>
    <button
      type="button"
      disabled={scopedTransactions.length === 0}
      onClick={() =>
        exportTransactionsToPDF({
          title: 'Relatório Financeiro',
          periodLabel,
          filterSummary,
          username,
          transactions: scopedTransactions,
          categories,
          contacts,
        })
      }
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 min-h-[40px] whitespace-nowrap"
    >
      <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400" />
      Exportar PDF ({scopedTransactions.length})
    </button>
    <button
      type="button"
      disabled={scopedTransactions.length === 0}
      onClick={() =>
        exportTransactionsToExcel({
          title: 'Relatório Financeiro',
          periodLabel,
          filterSummary,
          username,
          transactions: scopedTransactions,
          categories,
          contacts,
        })
      }
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 min-h-[40px] whitespace-nowrap"
    >
      <FileSpreadsheet className="w-4 h-4" />
      Exportar Excel ({scopedTransactions.length})
    </button>
  </div>
);
