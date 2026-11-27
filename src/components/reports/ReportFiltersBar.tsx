import React from 'react';
import { Filter, RotateCcw, Search, X } from 'lucide-react';
import type { Category, Contact } from '../../types';
import { PAYMENT_METHODS } from '../../utils/format';
import type { ReportStatusFilter, ReportTypeFilter } from './useReportFilters';

interface ReportFiltersBarProps {
  categories: Category[];
  contacts: Contact[];
  typeFilter: ReportTypeFilter;
  setTypeFilter: (v: ReportTypeFilter) => void;
  statusFilter: ReportStatusFilter;
  setStatusFilter: (v: ReportStatusFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  contactFilter: string;
  setContactFilter: (v: string) => void;
  paymentMethodFilter: string;
  setPaymentMethodFilter: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  hasExtraFilters: boolean;
  resetFilters: () => void;
  filterSummary?: string;
}

const SELECT_CLASS =
  'px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]';

export const ReportFiltersBar: React.FC<ReportFiltersBarProps> = ({
  categories,
  contacts,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  contactFilter,
  setContactFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  search,
  setSearch,
  hasExtraFilters,
  resetFilters,
  filterSummary,
}) => (
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
        onChange={(e) => setTypeFilter(e.target.value as ReportTypeFilter)}
        aria-label="Filtrar por tipo"
        className={SELECT_CLASS}
      >
        <option value="all">Tipo: Todos</option>
        <option value="payable">A Pagar</option>
        <option value="receivable">A Receber</option>
      </select>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as ReportStatusFilter)}
        aria-label="Filtrar por status"
        className={SELECT_CLASS}
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
        className={SELECT_CLASS}
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
        className={SELECT_CLASS}
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
        className={SELECT_CLASS}
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
);
