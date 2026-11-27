import React from 'react';
import { Search } from 'lucide-react';
import type { Category, CategoryType } from '../../types';

export type CategoryUsageFilter = 'all' | 'used' | 'unused';

interface CategoryFiltersProps {
  categories: Category[];
  usageCounts: Map<string, number>;
  catSearch: string;
  setCatSearch: (v: string) => void;
  catTypeFilter: 'all' | CategoryType;
  setCatTypeFilter: (v: 'all' | CategoryType) => void;
  catUsageFilter: CategoryUsageFilter;
  setCatUsageFilter: (v: CategoryUsageFilter) => void;
}

export const CategoryFilters: React.FC<CategoryFiltersProps> = ({
  categories,
  usageCounts,
  catSearch,
  setCatSearch,
  catTypeFilter,
  setCatTypeFilter,
  catUsageFilter,
  setCatUsageFilter,
}) => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={catSearch}
          onChange={(e) => setCatSearch(e.target.value)}
          placeholder="Filtrar categorias..."
          className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
        />
      </div>

      <select
        value={catTypeFilter}
        onChange={(e) => setCatTypeFilter(e.target.value as 'all' | CategoryType)}
        aria-label="Filtrar por tipo de categoria"
        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs min-h-[38px]"
      >
        <option value="all">Todos os tipos</option>
        <option value="payable">A Pagar</option>
        <option value="receivable">A Receber</option>
        <option value="both">Ambos</option>
      </select>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setCatUsageFilter('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[34px] ${
            catUsageFilter === 'all'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Todas ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => setCatUsageFilter('used')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[34px] ${
            catUsageFilter === 'used'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Com cadastros ({categories.filter((c) => (usageCounts.get(c.id) || 0) > 0).length})
        </button>
        <button
          type="button"
          onClick={() => setCatUsageFilter('unused')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg min-h-[34px] ${
            catUsageFilter === 'unused'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Sem cadastros ({categories.filter((c) => (usageCounts.get(c.id) || 0) === 0).length})
        </button>
      </div>
    </div>
  </div>
);
