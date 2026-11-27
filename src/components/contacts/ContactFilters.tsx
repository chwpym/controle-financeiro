import React from 'react';
import { Plus, Users } from 'lucide-react';
import { SearchBar } from '../common/SearchBar';

export type QuickFilter = 'ALL' | 'PJ' | 'PF' | 'PENDING';

interface ContactFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  filterType: QuickFilter;
  onFilterChange: (f: QuickFilter) => void;
  totalCount: number;
  pjCount: number;
  pfCount: number;
  withPendingCount: number;
  onOpenNew: () => void;
}

export const ContactFilters: React.FC<ContactFiltersProps> = ({
  search,
  onSearchChange,
  filterType,
  onFilterChange,
  totalCount,
  pjCount,
  pfCount,
  withPendingCount,
  onOpenNew,
}) => {
  return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-700 dark:text-teal-400">
                <Users className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-display font-bold text-slate-900 dark:text-white">
                Cadastros PF / PJ
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gerencie seus clientes, fornecedores e parceiros de negócio com ficha financeira integrada.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenNew}
            className="px-4 py-2.5 rounded-xl bg-teal-700 text-white text-xs sm:text-sm font-semibold hover:bg-teal-800 transition-colors flex items-center justify-center gap-2 shadow-sm shrink-0 min-h-[42px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Contato
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Buscar por razão social, fantasia, CPF/CNPJ ou cidade..."
            aria-label="Buscar contatos"
            containerClassName="flex-1 max-w-md"
            className="text-xs"
          />

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => onFilterChange('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('PJ')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'PJ'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Pessoa Jurídica ({pjCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('PF')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'PF'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Pessoa Física ({pfCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('PENDING')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap min-h-[34px] transition-colors cursor-pointer ${
                filterType === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Com Pendências ({withPendingCount})
            </button>
          </div>
        </div>
      </div>
  );
};
