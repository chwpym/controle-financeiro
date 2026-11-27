import React from 'react';
import type { ContactKind } from '../../types';

interface ContactKindSelectorProps {
  kind: ContactKind;
  onSelect: (kind: ContactKind) => void;
}

export const ContactKindSelector: React.FC<ContactKindSelectorProps> = ({ kind, onSelect }) => {
  return (
    <>
              {/* Participation Kind (Cliente / Fornecedor / Ambos - Estilo ERP) */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  ClassificaÃ§Ã£o da Pessoa (ParticipaÃ§Ã£o)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelect('customer')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] cursor-pointer ${
                      kind === 'customer'
                        ? 'bg-teal-50 border-teal-500 text-teal-800 dark:bg-teal-950/60 dark:border-teal-600 dark:text-teal-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Cliente
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect('supplier')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] cursor-pointer ${
                      kind === 'supplier'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-800 dark:bg-indigo-950/60 dark:border-indigo-600 dark:text-indigo-200'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Fornecedor
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelect('both')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors min-h-[38px] cursor-pointer ${
                      kind === 'both'
                        ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    Ambos
                  </button>
                </div>
              </div>
    </>
  );
};
