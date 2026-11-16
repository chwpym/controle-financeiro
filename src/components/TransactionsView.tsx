import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Edit2,
  Eye,
  FileCode2,
  FileSpreadsheet,
  Plus,
  Repeat,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { Category, Contact, Transaction } from '../types';
import { formatBRL, formatDateBR, isOverdue, RECURRENCE_LABELS, todayISO } from '../utils/format';
import { BatchSettleModal } from './BatchSettleModal';
import {
  createDateFilterState,
  DateRangeFilter,
  matchesDateFilter,
  type DateFilterValue,
} from './DateRangeFilter';

interface TransactionsViewProps {
  selectedMonth: string;
  initialFilter?: string;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
  onOpenNew: () => void;
  onOpenConsult: (tx: Transaction) => void;
  onOpenEdit: (tx: Transaction) => void;
  onOpenXmlImport: () => void;
  onOpenExcelImport: () => void;
  onToggleSettle: (tx: Transaction) => void;
  onDuplicate: (tx: Transaction) => void;
  onBatchSettle: (txs: Transaction[], paymentMethod: string, paidAt: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onDeleteSingle: (tx: Transaction) => void;
  onDeleteGroup: (groupId: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  selectedMonth,
  initialFilter = 'all',
  transactions,
  categories,
  contacts,
  onOpenNew,
  onOpenConsult,
  onOpenEdit,
  onOpenXmlImport,
  onOpenExcelImport,
  onToggleSettle,
  onDuplicate,
  onBatchSettle,
  onBatchDelete,
  onDeleteSingle,
  onDeleteGroup,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'month')
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<Transaction | null>(null);

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSettleOpen, setBatchSettleOpen] = useState(false);
  const [confirmBatchDeleteOpen, setConfirmBatchDeleteOpen] = useState(false);

  const today = todayISO();
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (!matchesDateFilter(t, dateFilter, selectedMonth)) return false;
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'settled' && t.status !== 'settled') return false;
      if (statusFilter === 'overdue' && !isOverdue(t, today)) return false;
      if (statusFilter === 'recurring' && !t.isRecurring) return false;
      if (categoryFilter !== 'all' && (t.categoryId || '') !== categoryFilter) return false;
      if (q) {
        const contact = t.contactId ? contactMap.get(t.contactId) : undefined;
        const contactName = contact?.name.toLowerCase() || '';
        const contactTrade = contact?.tradeName.toLowerCase() || '';
        const contactDoc = contact?.document.toLowerCase() || '';
        const catName = (t.categoryId && catMap.get(t.categoryId)?.name.toLowerCase()) || '';
        const method = (t.paymentMethod || '').toLowerCase();
        const match =
          t.description.toLowerCase().includes(q) ||
          t.documentNumber.toLowerCase().includes(q) ||
          contactName.includes(q) ||
          contactTrade.includes(q) ||
          contactDoc.includes(q) ||
          catName.includes(q) ||
          method.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    transactions,
    dateFilter,
    selectedMonth,
    typeFilter,
    statusFilter,
    categoryFilter,
    search,
    today,
    contactMap,
    catMap,
  ]);

  const totals = useMemo(() => {
    let rec = 0;
    let pay = 0;
    for (const t of filtered) {
      if (t.type === 'receivable') rec += t.amountCents;
      else pay += t.amountCents;
    }
    return { rec, pay, net: rec - pay };
  }, [filtered]);

  const selectedTransactions = useMemo(
    () => filtered.filter((t) => selectedIds.has(t.id)),
    [filtered, selectedIds]
  );

  const selectedPending = useMemo(
    () => selectedTransactions.filter((t) => t.status === 'pending'),
    [selectedTransactions]
  );

  const selectedTotalCents = useMemo(
    () => selectedTransactions.reduce((s, t) => s + t.amountCents, 0),
    [selectedTransactions]
  );

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)));
    }
  };

  return (
    <div className="space-y-5">
      {/* Action & Filter Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('payable')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                typeFilter === 'payable'
                  ? 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              A Pagar
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('receivable')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${
                typeFilter === 'receivable'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              A Receber
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenXmlImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap min-h-[40px]"
            >
              <FileCode2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              Importar XML
            </button>
            <button
              type="button"
              onClick={onOpenExcelImport}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap min-h-[40px]"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Importar Excel
            </button>
            <button
              type="button"
              onClick={onOpenNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 whitespace-nowrap min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              Nova Conta
            </button>
          </div>
        </div>

        {/* Dedicated real-time search bar for Contact Name or Account Description */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar por nome do contato ou descrição da conta"
            placeholder="Buscar em tempo real por nome do contato (PF/PJ) ou descrição da conta..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 min-h-[44px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <DateRangeFilter
          value={dateFilter}
          onChange={setDateFilter}
          selectedMonth={selectedMonth}
          modes={['month', 'year', 'custom', 'all']}
          showDateFieldSelector
          compact
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por status"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="overdue">Somente vencidas</option>
            <option value="settled">Pagas / Recebidas</option>
            <option value="recurring">Somente recorrentes / fixas</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filtrar por categoria"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Summary Line */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span>{filtered.length} lançamento(s) encontrado(s)</span>
          <div className="flex flex-wrap items-center gap-4 font-mono-tabular">
            <span className="text-emerald-700 dark:text-emerald-400">
              Receber: {formatBRL(totals.rec)}
            </span>
            <span className="text-rose-700 dark:text-rose-400">
              Pagar: {formatBRL(totals.pay)}
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              Saldo: {formatBRL(totals.net)}
            </span>
          </div>
        </div>
      </div>

      {/* Batch Action Bar */}
      {selectedTransactions.length > 0 && (
        <div className="rounded-2xl border border-teal-300 dark:border-teal-800 bg-teal-50/90 dark:bg-teal-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-teal-900 dark:text-teal-100 flex flex-wrap items-center gap-2">
            <strong>{selectedTransactions.length} selecionado(s)</strong>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">
              Soma: <strong>{formatBRL(selectedTotalCents)}</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedPending.length > 0 && (
              <button
                type="button"
                onClick={() => setBatchSettleOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[38px]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dar baixa em lote ({selectedPending.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmBatchDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 min-h-[38px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir ({selectedTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-700 text-xs font-semibold text-teal-900 dark:text-teal-200 hover:bg-white/60 dark:hover:bg-slate-900/40 min-h-[38px]"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}

      {/* Table (Desktop) & Cards (Mobile) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma conta encontrada para os filtros atuais.
            </p>
            <button
              type="button"
              onClick={onOpenNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro lançamento
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40">
                    <th className="py-3 pl-4 pr-2 w-9">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        aria-label="Selecionar todas as contas visíveis"
                        className="rounded border-slate-300 text-teal-700 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Descrição / Contato</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Parcela</th>
                    <th className="py-3 px-4">Situação</th>
                    <th className="py-3 px-4 text-right">Valor (BRL)</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filtered.map((tx) => {
                    const overdue = isOverdue(tx, today);
                    const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
                    const contact = tx.contactId ? contactMap.get(tx.contactId) : undefined;
                    const checked = selectedIds.has(tx.id);
                    const statusText =
                      tx.status === 'settled'
                        ? tx.type === 'receivable'
                          ? 'Recebido'
                          : 'Pago'
                        : overdue
                          ? 'Vencido'
                          : 'Pendente';

                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors ${
                          checked
                            ? 'bg-teal-50/40 dark:bg-teal-950/20'
                            : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-3 pl-4 pr-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(tx.id)}
                            aria-label={`Selecionar ${tx.description}`}
                            className="rounded border-slate-300 text-teal-700 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDateBR(tx.dueDate)}
                        </td>
                        <td className="py-3 px-4 min-w-[200px]">
                          <button
                            type="button"
                            onClick={() => onOpenConsult(tx)}
                            title="Consultar detalhes (somente leitura)"
                            className="text-left font-medium text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
                          >
                            {tx.description}
                          </button>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-1.5">
                            <span>{tx.type === 'receivable' ? 'A Receber' : 'A Pagar'}</span>
                            {contact && <span>· {contact.name}</span>}
                            {tx.documentNumber && <span>· {tx.documentNumber}</span>}
                            {tx.isRecurring && (
                              <span className="inline-flex items-center gap-0.5 text-teal-700 dark:text-teal-400 font-medium">
                                · <Repeat className="w-3 h-3" />{' '}
                                {RECURRENCE_LABELS[tx.recurrenceInterval || 'monthly']}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {cat ? cat.name : 'Sem categoria'}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {tx.installmentTotal > 1
                            ? `${tx.installmentNumber}/${tx.installmentTotal}`
                            : 'À vista'}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                          <div
                            className={
                              tx.status === 'settled'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : overdue
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-amber-600 dark:text-amber-400'
                            }
                          >
                            {statusText}
                          </div>
                          {tx.status === 'settled' && tx.paymentMethod && (
                            <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                              {tx.paymentMethod}
                            </div>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono-tabular font-semibold whitespace-nowrap ${
                            tx.type === 'receivable'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {tx.type === 'receivable' ? '+' : '-'} {formatBRL(tx.amountCents)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onOpenConsult(tx)}
                              title="Consultar lançamento (somente leitura) e recibo PDF"
                              className="p-2 rounded-lg text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDuplicate(tx)}
                              title="Duplicar lançamento para o próximo período"
                              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleSettle(tx)}
                              title={tx.status === 'settled' ? 'Reabrir conta' : 'Dar baixa'}
                              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              {tx.status === 'settled' ? (
                                <RotateCcw className="w-4 h-4 text-amber-600" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenEdit(tx)}
                              title="Editar lançamento"
                              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTx(tx)}
                              title="Excluir lançamento"
                              className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-teal-700 w-4 h-4"
                  />
                  <span>Selecionar todas ({filtered.length})</span>
                </label>
              </div>
              {filtered.map((tx) => {
                const overdue = isOverdue(tx, today);
                const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
                const contact = tx.contactId ? contactMap.get(tx.contactId) : undefined;
                const checked = selectedIds.has(tx.id);
                const statusText =
                  tx.status === 'settled'
                    ? tx.type === 'receivable'
                      ? 'Recebido'
                      : 'Pago'
                    : overdue
                      ? 'Vencido'
                      : 'Pendente';

                return (
                  <div
                    key={tx.id}
                    className={`p-4 space-y-2.5 ${checked ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(tx.id)}
                          aria-label={`Selecionar ${tx.description}`}
                          className="mt-1 rounded border-slate-300 text-teal-700 w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => onOpenConsult(tx)}
                            className="text-left text-sm font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400"
                          >
                            {tx.description}
                          </button>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono-tabular">{formatDateBR(tx.dueDate)}</span>
                            {tx.installmentTotal > 1 ? ` · ${tx.installmentNumber}/${tx.installmentTotal}` : ''}
                            {cat ? ` · ${cat.name}` : ''}
                            {contact ? ` · ${contact.name}` : ''}
                            {tx.isRecurring ? ` · Recorrente (${RECURRENCE_LABELS[tx.recurrenceInterval || 'monthly']})` : ''}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-mono-tabular font-bold ${
                            tx.type === 'receivable'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {formatBRL(tx.amountCents)}
                        </div>
                        <div
                          className={`text-[11px] font-semibold ${
                            tx.status === 'settled'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : overdue
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {statusText}
                          {tx.status === 'settled' && tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenConsult(tx)}
                        className="px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 text-xs font-medium text-teal-800 dark:text-teal-300 min-h-[40px] flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Consultar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(tx)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[40px] flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleSettle(tx)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[40px] flex items-center gap-1.5"
                      >
                        {tx.status === 'settled' ? (
                          <>
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            Reabrir
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {tx.type === 'receivable' ? 'Receber' : 'Pagar'}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenEdit(tx)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 min-h-[40px]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTx(tx)}
                        className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-medium text-red-600 dark:text-red-400 min-h-[40px]"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Batch Settle Modal */}
      {batchSettleOpen && selectedPending.length > 0 && (
        <BatchSettleModal
          transactions={selectedPending}
          onClose={() => setBatchSettleOpen(false)}
          onConfirm={(method, paidAt) => {
            onBatchSettle(selectedPending, method, paidAt);
            setSelectedIds(new Set());
          }}
        />
      )}

      {/* Batch Delete Confirmation */}
      {confirmBatchDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Excluir lançamentos selecionados
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja excluir os <strong>{selectedTransactions.length}</strong> lançamentos selecionados ({formatBRL(selectedTotalCents)})? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBatchDeleteOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onBatchDelete(selectedTransactions.map((t) => t.id));
                  setSelectedIds(new Set());
                  setConfirmBatchDeleteOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 min-h-[44px]"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {confirmDeleteTx && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-display font-semibold text-slate-900 dark:text-white">
              Confirmar exclusão
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Deseja excluir <strong>{confirmDeleteTx.description}</strong> ({formatBRL(confirmDeleteTx.amountCents)})?
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTx(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSingle(confirmDeleteTx);
                  setConfirmDeleteTx(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 min-h-[44px]"
              >
                Excluir esta parcela
              </button>
              {confirmDeleteTx.installmentGroupId && confirmDeleteTx.installmentTotal > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteGroup(confirmDeleteTx.installmentGroupId!);
                    setConfirmDeleteTx(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-red-800 text-white text-sm font-semibold hover:bg-red-900 min-h-[44px]"
                >
                  Excluir todas ({confirmDeleteTx.installmentTotal}x)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
