import React from 'react';
import type { Category, Contact, TransactionType } from '../../types';

interface XmlDestinationFieldsProps {
  txType: TransactionType;
  categories: Category[];
  categoryId: string;
  onChangeCategory: (id: string) => void;
  contacts: Contact[];
  contactId: string;
  onChangeContact: (id: string) => void;
}

export const XmlDestinationFields: React.FC<XmlDestinationFieldsProps> = ({
  txType,
  categories,
  categoryId,
  onChangeCategory,
  contacts,
  contactId,
  onChangeContact,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          Categoria padrão
        </label>
        <select
          value={categoryId}
          onChange={(e) => onChangeCategory(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
        >
          <option value="">Sem categoria</option>
          {categories
            .filter((c) => c.type === 'both' || c.type === txType)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          Vincular contato
        </label>
        <select
          value={contactId}
          onChange={(e) => onChangeContact(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
        >
          <option value="">Não vincular</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              [{c.personType}] {c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
