import React, { useState } from 'react';
import { Palette, Plus } from 'lucide-react';
import type { Category, CategoryType } from '../../types';
import { COLOR_PRESETS } from './settingsConstants';

interface CategoryAddFormProps {
  userId: string;
  onSaveCategory: (cat: Category) => void;
}

export const CategoryAddForm: React.FC<CategoryAddFormProps> = ({ userId, onSaveCategory }) => {
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<CategoryType>('payable');
  const [catColor, setCatColor] = useState('#0F766E');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const now = new Date().toISOString();
    onSaveCategory({
      id: crypto.randomUUID(),
      userId,
      name: catName.trim(),
      type: catType,
      color: /^#[0-9A-Fa-f]{6}$/.test(catColor) ? catColor : '#0F766E',
      createdAt: now,
      updatedAt: now,
    });
    setCatName('');
  };

  return (
    <form onSubmit={handleAddCategory} className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nome da categoria
          </label>
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Ex: Marketing, Logística..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Uso
          </label>
          <select
            value={catType}
            onChange={(e) => setCatType(e.target.value as CategoryType)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm min-h-[42px]"
          >
            <option value="payable">A Pagar</option>
            <option value="receivable">A Receber</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 min-h-[42px]"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
          <Palette className="w-3.5 h-3.5" />
          Cor:
        </span>
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => setCatColor(color)}
            aria-label={`Selecionar cor ${color}`}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              catColor.toUpperCase() === color
                ? 'border-slate-900 dark:border-white scale-110'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
        <label
          title="Escolher qualquer cor personalizada"
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-[11px] font-mono-tabular cursor-pointer"
        >
          <input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(catColor) ? catColor : '#0F766E'}
            onChange={(e) => setCatColor(e.target.value.toUpperCase())}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
          />
          <span>Personalizada</span>
        </label>
        <input
          type="text"
          value={catColor}
          onChange={(e) => setCatColor(e.target.value)}
          maxLength={7}
          aria-label="Código hexadecimal da cor"
          className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular uppercase"
        />
      </div>
    </form>
  );
};
