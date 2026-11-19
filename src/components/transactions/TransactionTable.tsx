import React from 'react';
import { CheckCircle2, Copy, Edit2, Eye, Plus, Repeat, RotateCcw, Trash2 } from 'lucide-react';
import type { Category, Contact, Transaction } from '../../types';
import { formatBRL, formatDateBR, isOverdue, RECURRENCE_LABELS } from '../../utils/format';

export interface TransactionTableProps {
  transactions: Transaction[];
  catMap: Map<string, Category>;
  contactMap: Map<string, Contact>;
  selectedIds: Set<string>;
  allVisibleSelected: boolean;
  today: string;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenNew: () => void;
  onOpenConsult: (tx: Transaction) => void;
  onOpenEdit: (tx: Transaction) => void;
  onToggleSettle: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onRequestDelete: (tx: Transaction) => void;
}

function getStatusMeta(tx: Transaction, today: string) {
  if (tx.status === 'settled') {
    return {
      text: tx.type === 'receivable' ? 'Recebido' : 'Pago',
      colorClass: 'text-emerald-700 dark:text-emerald-400',
    };
  }
  if (isOverdue(tx, today)) {
    return { text: 'Vencido', colorClass: 'text-red-600 dark:text-red-400' };
  }
  return { text: 'Pendente', colorClass: 'text-amber-600 dark:text-amber-400' };
}

/**
 * Tabela desktop e lista mobile responsiva de Contas a Pagar e Receber.
 */
export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  catMap,
  contactMap,
  selectedIds,
  allVisibleSelected,
  today,
  onToggleSelect,
  onToggleSelectAll,
  onOpenNew,
  onOpenConsult,
  onOpenEdit,
  onToggleSettle,
  onDuplicate,
  onRequestDelete,
}) => {
  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nenhuma conta encontrada para os filtros atuais.
        </p>
        <button
          type="button"
          onClick={onOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Criar primeiro lançamento
        </button>
      </div>
    );
  }

  const renderActionButtons = (tx: Transaction, mobile = false) => {
    const isSettled = tx.status === 'settled';
    const settleLabel = isSettled ? 'Reabrir' : tx.type === 'receivable' ? 'Receber' : 'Pagar';
    const actions = [
      {
        key: 'consult',
        label: 'Consultar',
        title: 'Consultar lançamento e gerar recibo PDF',
        ariaLabel: `Consultar ${tx.description}`,
        icon: <Eye className={mobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
        desktopClass: 'text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40',
        mobileClass: 'border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300',
        onClick: () => onOpenConsult(tx),
      },
      {
        key: 'duplicate',
        label: 'Duplicar',
        title: 'Duplicar lançamento (1 clique)',
        ariaLabel: `Duplicar ${tx.description}`,
        icon: <Copy className={mobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
        desktopClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        mobileClass: 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
        onClick: () => onDuplicate(tx),
      },
      {
        key: 'settle',
        label: settleLabel,
        title: isSettled ? 'Reabrir conta' : 'Dar baixa',
        ariaLabel: `${isSettled ? 'Reabrir' : 'Baixar'} ${tx.description}`,
        icon: isSettled ? (
          <RotateCcw className={`${mobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-amber-600`} />
        ) : (
          <CheckCircle2 className={`${mobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-600`} />
        ),
        desktopClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        mobileClass: 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
        onClick: () => onToggleSettle(tx),
      },
      {
        key: 'edit',
        label: 'Editar',
        title: 'Editar lançamento',
        ariaLabel: `Editar ${tx.description}`,
        icon: <Edit2 className={mobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
        desktopClass: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        mobileClass: 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
        onClick: () => onOpenEdit(tx),
      },
      {
        key: 'delete',
        label: 'Excluir',
        title: 'Excluir lançamento',
        ariaLabel: `Excluir ${tx.description}`,
        icon: <Trash2 className={mobile ? 'w-3.5 h-3.5' : 'w-4 h-4'} />,
        desktopClass: 'text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40',
        mobileClass: 'border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400',
        onClick: () => onRequestDelete(tx),
      },
    ];

    return actions.map((act) => (
      <button
        key={act.key}
        type="button"
        onClick={act.onClick}
        title={act.title}
        aria-label={act.ariaLabel}
        className={
          mobile
            ? `px-3 py-1.5 rounded-lg border text-xs font-medium min-h-[40px] flex items-center gap-1.5 cursor-pointer ${act.mobileClass}`
            : `p-2 rounded-lg transition-colors cursor-pointer ${act.desktopClass}`
        }
      >
        {act.icon}
        {mobile && <span>{act.label}</span>}
      </button>
    ));
  };

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
              <th className="py-3 pl-4 pr-2 w-9">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Selecionar todas as contas visíveis"
                  className="rounded border-slate-300 text-teal-700 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="py-3 px-4">Emissão</th>
              <th className="py-3 px-4">Vencimento</th>
              <th className="py-3 px-4">Descrição / Documento</th>
              <th className="py-3 px-4">Categoria</th>
              <th className="py-3 px-4">Parcela</th>
              <th className="py-3 px-4">Situação</th>
              <th className="py-3 px-4 text-right">Valor (BRL)</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {transactions.map((tx) => {
              const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
              const contact = tx.contactId ? contactMap.get(tx.contactId) : undefined;
              const checked = selectedIds.has(tx.id);
              const status = getStatusMeta(tx, today);

              return (
                <tr
                  key={tx.id}
                  className={`transition-colors ${
                    checked ? 'bg-teal-50/40 dark:bg-teal-950/20' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 pl-4 pr-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect(tx.id)}
                      aria-label={`Selecionar ${tx.description}`}
                      className="rounded border-slate-300 text-teal-700 w-4 h-4 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDateBR(tx.issueDate) || '—'}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatDateBR(tx.dueDate)}
                  </td>
                  <td className="py-3 px-4 min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => onOpenConsult(tx)}
                      title="Consultar detalhes (somente leitura)"
                      className="text-left font-medium text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 transition-colors cursor-pointer"
                    >
                      {tx.description}
                    </button>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5">
                      <span>{tx.type === 'receivable' ? 'A Receber' : 'A Pagar'}</span>
                      {contact && <span>· {contact.name}</span>}
                      {tx.documentNumber && <span className="font-mono-tabular">· Doc: {tx.documentNumber}</span>}
                      {tx.isRecurring && (
                        <span className="inline-flex items-center gap-0.5 text-teal-700 dark:text-teal-400 font-medium">
                          · <Repeat className="w-3 h-3" /> {RECURRENCE_LABELS[tx.recurrenceInterval || 'monthly']}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {cat ? cat.name : 'Sem categoria'}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {tx.installmentTotal > 1 ? `${tx.installmentNumber}/${tx.installmentTotal}` : 'À vista'}
                  </td>
                  <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                    <div className={status.colorClass}>{status.text}</div>
                    {tx.status === 'settled' && tx.paymentMethod && (
                      <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{tx.paymentMethod}</div>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono-tabular font-semibold whitespace-nowrap ${tx.type === 'receivable' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {tx.type === 'receivable' ? '+' : '-'} {formatBRL(tx.amountCents)}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-0.5">{renderActionButtons(tx, false)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile List */}
      <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        <div className="px-4 py-2.5 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={allVisibleSelected} onChange={onToggleSelectAll} className="rounded border-slate-300 text-teal-700 w-4 h-4" />
            <span>Selecionar todas ({transactions.length})</span>
          </label>
        </div>
        {transactions.map((tx) => {
          const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
          const contact = tx.contactId ? contactMap.get(tx.contactId) : undefined;
          const checked = selectedIds.has(tx.id);
          const status = getStatusMeta(tx, today);

          return (
            <div key={tx.id} className={`p-4 space-y-2.5 ${checked ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <input type="checkbox" checked={checked} onChange={() => onToggleSelect(tx.id)} aria-label={`Selecionar ${tx.description}`} className="mt-1 rounded border-slate-300 text-teal-700 w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <button type="button" onClick={() => onOpenConsult(tx)} className="text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400">
                      {tx.description}
                    </button>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap gap-x-1">
                      <span className="font-mono-tabular">{formatDateBR(tx.dueDate)}</span>
                      {tx.issueDate && <span className="font-mono-tabular">· Emissão: {formatDateBR(tx.issueDate)}</span>}
                      {tx.documentNumber && <span className="font-mono-tabular">· Doc: {tx.documentNumber}</span>}
                      {tx.installmentTotal > 1 && <span className="font-mono-tabular">· {tx.installmentNumber}/{tx.installmentTotal}</span>}
                      {cat && <span>· {cat.name}</span>}
                      {contact && <span>· {contact.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-mono-tabular font-bold ${tx.type === 'receivable' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {formatBRL(tx.amountCents)}
                  </div>
                  <div className={`text-[11px] font-semibold ${status.colorClass}`}>
                    {status.text}
                    {tx.status === 'settled' && tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">{renderActionButtons(tx, true)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
