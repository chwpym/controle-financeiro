import React from 'react';
import { FileCode2, FileSpreadsheet, Plus } from 'lucide-react';
import type { Category, Contact } from '../../types';
import { formatBRL } from '../../utils/format';
import { SearchBar } from '../common/SearchBar';
import { DateRangeFilter, type DateFilterValue } from '../DateRangeFilter';

export interface TransactionFiltersProps {
  selectedMonth: string;
  dateFilter: DateFilterValue;
  onDateFilterChange: (next: DateFilterValue) => void;
  typeFilter: 'all' | 'payable' | 'receivable';
  onTypeFilterChange: (next: 'all' | 'payable' | 'receivable') => void;
  statusFilter: string;
  onStatusFilterChange: (next: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (next: string) => void;
  contactFilter: string;
  onContactFilterChange: (next: string) => void;
  search: string;
  onSearchChange: (next: string) => void;
  searchAllHistory: boolean;
  onSearchAllHistoryChange: (next: boolean) => void;
  categories: Category[];
  contacts: Contact[];
  filteredCount: number;
  totals: { rec: number; pay: number; net: number };
  onOpenXmlImport: () => void;
  onOpenExcelImport: () => void;
  onOpenNew: () => void;
}

const TYPE_OPTIONS: { value: 'all' | 'payable' | 'receivable'; label: string; activeClass: string }[] = [
  { value: 'all', label: 'Todas', activeClass: 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' },
  { value: 'payable', label: 'A Pagar', activeClass: 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs' },
  { value: 'receivable', label: 'A Receber', activeClass: 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs' },
];

const STATUS_PILLS: { value: string; label: string; activeClass: string }[] = [
  { value: 'all', label: 'Todos', activeClass: 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs' },
  { value: 'pending', label: 'Pendentes', activeClass: 'bg-amber-600 text-white shadow-xs' },
  { value: 'overdue', label: 'Vencidos', activeClass: 'bg-red-600 text-white shadow-xs' },
  { value: 'settled', label: 'Pagos / Recebidos', activeClass: 'bg-emerald-700 text-white shadow-xs' },
  { value: 'recurring', label: 'Recorrentes', activeClass: 'bg-teal-700 text-white shadow-xs' },
];

/**
 * Barra de filtros e ações principais da tela de Contas a Pagar e Receber.
 */
export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  selectedMonth,
  dateFilter,
  onDateFilterChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  contactFilter,
  onContactFilterChange,
  search,
  onSearchChange,
  searchAllHistory,
  onSearchAllHistoryChange,
  categories,
  contacts,
  filteredCount,
  totals,
  onOpenXmlImport,
  onOpenExcelImport,
  onOpenNew,
}) => {
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onTypeFilterChange(opt.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] cursor-pointer ${
                typeFilter === opt.value ? opt.activeClass : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenXmlImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap min-h-[40px] cursor-pointer"
          >
            <FileCode2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            Importar XML
          </button>
          <button
            type="button"
            onClick={onOpenExcelImport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap min-h-[40px] cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            Importar Excel
          </button>
          <button
            type="button"
            onClick={onOpenNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 whitespace-nowrap min-h-[40px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nova Conta
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            containerClassName="flex-1"
            aria-label="Buscar por nome do contato ou descrição da conta"
            placeholder="Buscar em tempo real por nome do contato (PF/PJ), documento ou descrição da conta..."
          />
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer shrink-0 select-none">
            <input
              type="checkbox"
              checked={searchAllHistory}
              onChange={(e) => onSearchAllHistoryChange(e.target.checked)}
              className="rounded border-slate-300 text-teal-700 focus:ring-teal-600 w-4 h-4 cursor-pointer"
            />
            <span>Buscar em todo o histórico (sem limite de mês)</span>
          </label>
        </div>

        {search.trim().length > 0 && searchAllHistory && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-200 dark:border-teal-800/70 bg-teal-50/70 dark:bg-teal-950/30 px-3 py-2 text-xs text-teal-800 dark:text-teal-200">
            <span>
              🔍 Mostrando resultados de todo o histórico para &apos;{search.trim()}&apos;
            </span>
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="font-semibold underline underline-offset-2 hover:text-teal-950 dark:hover:text-white cursor-pointer"
            >
              Limpar busca
            </button>
          </div>
        )}
      </div>

      <DateRangeFilter
        value={dateFilter}
        onChange={onDateFilterChange}
        selectedMonth={selectedMonth}
        modes={['month', 'year', 'custom', 'all']}
        showDateFieldSelector
        compact
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_PILLS.map((pill) => (
          <button
            key={pill.value}
            type="button"
            onClick={() => onStatusFilterChange(pill.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
              statusFilter === pill.value
                ? pill.activeClass
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
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

        <select
          value={contactFilter}
          onChange={(e) => onContactFilterChange(e.target.value)}
          aria-label="Filtrar por contato"
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[40px]"
        >
          <option value="all">Todos os contatos (PF/PJ)</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              [{c.personType}] {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
        <span>{filteredCount} lançamento(s) encontrado(s)</span>
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
  );
};
