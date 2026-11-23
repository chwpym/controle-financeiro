import React from 'react';
import type { Category, Contact, TransactionStatus, TransactionType } from '../../types';
import type { ExcelFieldMapping } from '../../utils/excelParser';

export interface ExcelDefaultsFormProps {
  mapping: ExcelFieldMapping;
  defaultType: TransactionType;
  setDefaultType: (t: TransactionType) => void;
  defaultStatus: TransactionStatus;
  setDefaultStatus: (s: TransactionStatus) => void;
  defaultCategoryId: string;
  setDefaultCategoryId: (id: string) => void;
  defaultContactId: string;
  setDefaultContactId: (id: string) => void;
  categories: Category[];
  contacts: Contact[];
}

export const ExcelDefaultsForm: React.FC<ExcelDefaultsFormProps> = ({
  mapping,
  defaultType,
  setDefaultType,
  defaultStatus,
  setDefaultStatus,
  defaultCategoryId,
  setDefaultCategoryId,
  defaultContactId,
  setDefaultContactId,
  categories,
  contacts,
}) => {
  const showType = !mapping.useType || !mapping.typeCol;
  const showStatus = !mapping.useStatus || !mapping.statusCol;
  const showCategory = !mapping.useCategory || !mapping.categoryCol;
  const showContact = !mapping.useContact || !mapping.contactCol;

  if (!showType && !showStatus && !showCategory && !showContact) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {showType && (
        <div>
          <label
            htmlFor="default-type-select"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Tipo padrão
          </label>
          <select
            id="default-type-select"
            aria-label="Tipo padrão"
            value={defaultType}
            onChange={(e) => setDefaultType(e.target.value as TransactionType)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="payable">Contas a Pagar</option>
            <option value="receivable">Contas a Receber</option>
          </select>
        </div>
      )}

      {showStatus && (
        <div>
          <label
            htmlFor="default-status-select"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Situação padrão
          </label>
          <select
            id="default-status-select"
            aria-label="Situação padrão"
            value={defaultStatus}
            onChange={(e) => setDefaultStatus(e.target.value as TransactionStatus)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="pending">Pendente</option>
            <option value="settled">Pago / Recebido</option>
          </select>
        </div>
      )}

      {showCategory && (
        <div>
          <label
            htmlFor="default-category-select"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Categoria padrão
          </label>
          <select
            id="default-category-select"
            aria-label="Categoria padrão"
            value={defaultCategoryId}
            onChange={(e) => setDefaultCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[40px]"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showContact && (
        <div>
          <label
            htmlFor="default-contact-select"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Contato padrão
          </label>
          <select
            id="default-contact-select"
            aria-label="Contato padrão"
            value={defaultContactId}
            onChange={(e) => setDefaultContactId(e.target.value)}
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
      )}
    </div>
  );
};
