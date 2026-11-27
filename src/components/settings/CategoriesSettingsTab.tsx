import React, { useMemo, useState } from 'react';
import type { Category, CategoryType, Transaction } from '../../types';
import { CategoryAddForm } from './CategoryAddForm';
import { CategoryFilters, type CategoryUsageFilter } from './CategoryFilters';
import { CategoryRow } from './CategoryRow';

interface CategoriesSettingsTabProps {
  userId: string;
  categories: Category[];
  transactions: Transaction[];
  onSaveCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoriesSettingsTab: React.FC<CategoriesSettingsTabProps> = ({
  userId,
  categories,
  transactions,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [catSearch, setCatSearch] = useState('');
  const [catUsageFilter, setCatUsageFilter] = useState<CategoryUsageFilter>('all');
  const [catTypeFilter, setCatTypeFilter] = useState<'all' | CategoryType>('all');

  // Count registered transactions per category
  const usageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.categoryId) {
        map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + 1);
      }
    }
    return map;
  }, [transactions]);

  const filteredCategories = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return categories.filter((cat) => {
      const count = usageCounts.get(cat.id) || 0;
      if (catUsageFilter === 'used' && count === 0) return false;
      if (catUsageFilter === 'unused' && count > 0) return false;
      if (catTypeFilter !== 'all' && cat.type !== catTypeFilter) return false;
      if (q && !cat.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [categories, usageCounts, catUsageFilter, catTypeFilter, catSearch]);

  return (
    <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-base font-display font-semibold text-slate-900 dark:text-white">
          Categorias Personalizáveis
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Organize suas despesas e receitas em BRL do jeito que preferir, filtre por uso e escolha qualquer cor
        </p>
      </div>

      <CategoryAddForm userId={userId} onSaveCategory={onSaveCategory} />

      <CategoryFilters
        categories={categories}
        usageCounts={usageCounts}
        catSearch={catSearch}
        setCatSearch={setCatSearch}
        catTypeFilter={catTypeFilter}
        setCatTypeFilter={setCatTypeFilter}
        catUsageFilter={catUsageFilter}
        setCatUsageFilter={setCatUsageFilter}
      />

      <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
        {filteredCategories.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Nenhuma categoria encontrada para este filtro.
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              txCount={usageCounts.get(cat.id) || 0}
              onSaveCategory={onSaveCategory}
              onDeleteCategory={onDeleteCategory}
            />
          ))
        )}
      </div>
    </div>
  );
};
