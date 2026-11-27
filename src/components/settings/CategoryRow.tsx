import React, { useState } from 'react';
import { Check, Edit2, Trash2, X } from 'lucide-react';
import type { Category, CategoryType } from '../../types';
import { COLOR_PRESETS } from './settingsConstants';

interface CategoryRowProps {
  cat: Category;
  txCount: number;
  onSaveCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryRow: React.FC<CategoryRowProps> = ({ cat, txCount, onSaveCategory, onDeleteCategory }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editCatName, setEditCatName] = useState('');
  const [editCatType, setEditCatType] = useState<CategoryType>('payable');
  const [editCatColor, setEditCatColor] = useState('#0F766E');

  const startEditingCategory = () => {
    setIsEditing(true);
    setEditCatName(cat.name);
    setEditCatType(cat.type);
    setEditCatColor(cat.color);
  };

  const saveEditingCategory = () => {
    if (!editCatName.trim()) return;
    onSaveCategory({
      ...cat,
      name: editCatName.trim(),
      type: editCatType,
      color: /^#[0-9A-Fa-f]{6}$/.test(editCatColor) ? editCatColor : cat.color,
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="py-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <input
            type="text"
            value={editCatName}
            onChange={(e) => setEditCatName(e.target.value)}
            className="sm:col-span-6 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
          />
          <select
            value={editCatType}
            onChange={(e) => setEditCatType(e.target.value as CategoryType)}
            className="sm:col-span-3 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
          >
            <option value="payable">A Pagar</option>
            <option value="receivable">A Receber</option>
            <option value="both">Ambos</option>
          </select>
          <div className="sm:col-span-3 flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={saveEditingCategory}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold min-h-[38px]"
            >
              <Check className="w-3.5 h-3.5" />
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 min-h-[38px]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setEditCatColor(color)}
              className={`w-5 h-5 rounded-full border-2 ${
                editCatColor.toUpperCase() === color
                  ? 'border-slate-900 dark:border-white scale-110'
                  : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(editCatColor) ? editCatColor : '#0F766E'}
            onChange={(e) => setEditCatColor(e.target.value.toUpperCase())}
            aria-label="Seletor de cor da categoria"
            className="w-7 h-7 rounded cursor-pointer border border-slate-200 dark:border-slate-700 p-0 bg-transparent"
          />
          <input
            type="text"
            value={editCatColor}
            onChange={(e) => setEditCatColor(e.target.value)}
            maxLength={7}
            className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono-tabular uppercase"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <label
          title="Clique para trocar a cor rapidamente"
          className="relative w-5 h-5 rounded-md shrink-0 cursor-pointer border border-black/10 dark:border-white/10"
          style={{ backgroundColor: cat.color }}
        >
          <input
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(cat.color) ? cat.color : '#0F766E'}
            onChange={(e) =>
              onSaveCategory({
                ...cat,
                color: e.target.value.toUpperCase(),
                updatedAt: new Date().toISOString(),
              })
            }
            aria-label={`Alterar cor de ${cat.name}`}
            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
          />
        </label>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-900 dark:text-white truncate">
            {cat.name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
            <span>
              {cat.type === 'payable'
                ? 'Contas a Pagar'
                : cat.type === 'receivable'
                  ? 'Contas a Receber'
                  : 'Pagar e Receber'}
            </span>
            <span aria-hidden="true">·</span>
            <span
              className={`font-mono-tabular ${
                txCount > 0
                  ? 'text-teal-700 dark:text-teal-400 font-semibold'
                  : 'text-slate-400'
              }`}
            >
              {txCount > 0
                ? `${txCount} lançamento${txCount > 1 ? 's' : ''} cadastrado${txCount > 1 ? 's' : ''}`
                : 'Sem lançamentos'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={startEditingCategory}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center"
          title="Editar nome, tipo ou cor"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDeleteCategory(cat.id)}
          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[38px] min-w-[38px] flex items-center justify-center"
          title="Excluir categoria"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
