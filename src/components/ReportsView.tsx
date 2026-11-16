import React, { useMemo, useState } from 'react';
import { Eye, FileSpreadsheet, FileText, Filter, RotateCcw, Search, X } from 'lucide-react';
import type { Category, Contact, Transaction } from '../types';
import { exportTransactionsToExcel, exportTransactionsToPDF } from '../utils/exporters';
import {
  formatBRL,
  formatDateBR,
  isOverdue,
  PAYMENT_METHODS,
  todayISO,
} from '../utils/format';
import {
  createDateFilterState,
  DateRangeFilter,
  describeDateFilter,
  matchesDateFilter,
  type DateFilterValue,
} from './DateRangeFilter';

interface ReportsViewProps {
  username: string;
  selectedMonth: string;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
  onOpenConsult: (tx: Transaction) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  username,
  selectedMonth,
  transactions,
  categories,
  contacts,
  onOpenConsult,
}) => {
  const today = todayISO();

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() =>
    createDateFilterState(selectedMonth, 'month')
  );
  const [typeFilter, setTypeFilter] = useState<'all' | 'payable' | 'receivable'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'settled'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);

  const hasExtraFilters =
    typeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    contactFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    search.trim() !== '';

  const resetFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setContactFilter('all');
    setPaymentMethodFilter('all');
    setSearch('');
  };

  const scopedTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (!matchesDateFilter(t, dateFilter, selectedMonth)) return false;

      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (statusFilter === 'pending' && t.status !== 'pending') return false;
      if (statusFilter === 'settled' && t.status !== 'settled') return false;
      if (statusFilter === 'overdue' && !isOverdue(t, today)) return false;

      if (categoryFilter === '__none__' && t.categoryId) return false;
      if (categoryFilter !== 'all' && categoryFilter !== '__none__' && t.categoryId !== categoryFilter) {
        return false;
      }

      if (contactFilter === '__none__' && t.contactId) return false;
      if (contactFilter !== 'all' && contactFilter !== '__none__' && t.contactId !== contactFilter) {
        return false;
      }

      if (paymentMethodFilter === '__none__' && t.paymentMethod) return false;
      if (
        paymentMethodFilter !== 'all' &&
        paymentMethodFilter !== '__none__' &&
        t.paymentMethod !== paymentMethodFilter
      ) {
        return false;
      }

      if (q) {
        const contact = t.contactId ? contactMap.get(t.contactId) : undefined;
        const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
        const match =
          t.description.toLowerCase().includes(q) ||
          t.documentNumber.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          (t.paymentMethod || '').toLowerCase().includes(q) ||
          (contact?.name.toLowerCase() || '').includes(q) ||
          (contact?.tradeName.toLowerCase() || '').includes(q) ||
          (contact?.document.toLowerCase() || '').includes(q) ||
          (cat?.name.toLowerCase() || '').includes(q);
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
    contactFilter,
    paymentMethodFilter,
    search,
    today,
    contactMap,
    catMap,
  ]);

  const periodLabel = describeDateFilter(dateFilter, selectedMonth);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (typeFilter === 'payable') parts.push('Tipo: A Pagar');
    if (typeFilter === 'receivable') parts.push('Tipo: A Receber');

    if (statusFilter === 'pending') parts.push('Status: Pendentes');
    if (statusFilter === 'overdue') parts.push('Status: Vencidas');
    if (statusFilter === 'settled') parts.push('Status: Pagas/Recebidas');

    if (categoryFilter === '__none__') parts.push('Categoria: Sem categoria');
    else if (categoryFilter !== 'all') {
      parts.push(`Categoria: ${catMap.get(categoryFilter)?.name || categoryFilter}`);
    }

    if (contactFilter === '__none__') parts.push('Contato: Sem contato');
    else if (contactFilter !== 'all') {
      parts.push(`Contato: ${contactMap.get(contactFilter)?.name || contactFilter}`);
    }

    if (paymentMethodFilter === '__none__') parts.push('Forma Pgto: Não informada');
    else if (paymentMethodFilter !== 'all') {
      parts.push(`Forma Pgto: ${paymentMethodFilter}`);
    }

    if (search.trim()) parts.push(`Busca: "${search.trim()}"`);

    return parts.length > 0 ? parts.join(' | ') : undefined;
  }, [
    typeFilter,
    statusFilter,
    categoryFilter,
    contactFilter,
    paymentMethodFilter,
    search,
    catMap,
    contactMap,
  ]);

  const summary = useMemo(() => {
    let recTotal = 0;
    let recSettled = 0;
    let payTotal = 0;
    let paySettled = 0;
    let overdueTotal = 0;

    for (const t of scopedTransactions) {
      if (t.type === 'receivable') {
        recTotal += t.amountCents;
        if (t.status === 'settled') recSettled += t.amountCents;
      } else {
        payTotal += t.amountCents;
        if (t.status === 'settled') paySettled += t.amountCents;
      }
      if (isOverdue(t, today)) overdueTotal += t.amountCents;
    }

    return {
      recTotal,
      recSettled,
      payTotal,
      paySettled,
      overdueTotal,
      projectedNet: recTotal - payTotal,
      realizedNet: recSettled - paySettled,
    };
  }, [scopedTransactions, today]);

  return (
    <div className="space-y-6">
      {/* Header Controls, Date Filter, Granular Filters & Export Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <DateRangeFilter
              value={dateFilter}
              onChange={setDateFilter}
              selectedMonth={selectedMonth}
              modes={['month', 'year', 'custom', 'all']}
              showDateFieldSelector
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
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
        </div>

        {/* Granular Filters Grid */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>Filtros do Relatório (aplicados na listagem e na exportação PDF/Excel)</span>
            </div>
            {hasExtraFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <div className="relative lg:col-span-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar descrição, contato, doc..."
                className="w-full pl-8 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'payable' | 'receivable')}
              aria-label="Filtrar por tipo"
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
            >
              <option value="all">Tipo: Todos</option>
              <option value="payable">A Pagar</option>
              <option value="receivable">A Receber</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'pending' | 'overdue' | 'settled')
              }
              aria-label="Filtrar por status"
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
            >
              <option value="all">Status: Todos</option>
              <option value="pending">Pendentes</option>
              <option value="overdue">Somente vencidas</option>
              <option value="settled">Pagas / Recebidas</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filtrar por categoria"
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
            >
              <option value="all">Categoria: Todas</option>
              <option value="__none__">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              aria-label="Filtrar por contato"
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
            >
              <option value="all">Contato: Todos</option>
              <option value="__none__">Sem contato</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.personType}] {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              aria-label="Filtrar por forma de pagamento"
              className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
            >
              <option value="all">Forma Pgto: Todas</option>
              <option value="__none__">Não informada / Pendente</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {filterSummary && (
              <div className="sm:col-span-2 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Ativos: <strong>{filterSummary}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Period Summary Grid (4 essential KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Receitas Filtradas</div>
          <div className="mt-1.5 text-xl font-display font-bold font-mono-tabular text-emerald-700 dark:text-emerald-400">
            {formatBRL(summary.recTotal)}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-slate-500">
            Recebido: {formatBRL(summary.recSettled)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Despesas Filtradas</div>
          <div className="mt-1.5 text-xl font-display font-bold font-mono-tabular text-rose-700 dark:text-rose-400">
            {formatBRL(summary.payTotal)}
          </div>
          <div className="mt-1 text-xs font-mono-tabular text-slate-500">
            Pago: {formatBRL(summary.paySettled)}
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
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
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Total Vencido</div>
          <div className="mt-1.5 text-xl font-display font-bold font-mono-tabular text-amber-600 dark:text-amber-400">
            {formatBRL(summary.overdueTotal)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {scopedTransactions.length} lançamento(s)
          </div>
        </div>
      </div>

      {/* Detailed Report Table */}
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
    </div>
  );
};
