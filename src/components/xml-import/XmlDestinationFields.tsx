/**
 * EN: Mandatory Category & Counterparty Destination Fields for XML Import (Phase 11.1.2).
 *     Requires both `Categoria padrão *` and `Vincular contato *` (marked with red asterisks
 *     and amber/rose visual attention borders when empty) to prevent orphan DRE expenses or
 *     payables/receivables without a bound contact.
 * PT: Campos Obrigatórios de Categoria e Contato do Importador de XML (Etapa 11.1.2).
 *     Torna `Categoria padrão *` e `Vincular contato *` estritamente obrigatórios com indicação
 *     visual clara para evitar lançamentos órfãos no DRE ou sem favorecido/pagador vinculado.
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { Category, Contact, TransactionType } from '../../types';

export interface XmlDestinationFieldsProps {
  txType: TransactionType;
  categories: Category[];
  categoryId: string;
  onChangeCategory: (id: string) => void;
  contacts: Contact[];
  contactId: string;
  onChangeContact: (id: string) => void;
  showValidationHint?: boolean;
}

export const XmlDestinationFields: React.FC<XmlDestinationFieldsProps> = ({
  txType,
  categories,
  categoryId,
  onChangeCategory,
  contacts,
  contactId,
  onChangeContact,
  showValidationHint = false,
}) => {
  const filteredCategories = categories.filter(
    (c) => c.type === 'both' || c.type === txType
  );
  const missingCategory = !categoryId;
  const missingContact = !contactId;

  return (
    <div className="space-y-2" data-testid="xml-destination-fields">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="xml-destination-category"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Categoria padrão <span className="text-rose-600 dark:text-rose-400 font-bold">*</span>
          </label>
          <select
            id="xml-destination-category"
            data-testid="xml-destination-category"
            required
            aria-invalid={missingCategory}
            value={categoryId}
            onChange={(e) => onChangeCategory(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs min-h-[40px] transition-colors ${
              missingCategory
                ? 'border-amber-400 dark:border-amber-600/80 ring-1 ring-amber-400/30'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <option value="">Selecione uma categoria...</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="xml-destination-contact"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Vincular contato <span className="text-rose-600 dark:text-rose-400 font-bold">*</span>
          </label>
          <select
            id="xml-destination-contact"
            data-testid="xml-destination-contact"
            required
            aria-invalid={missingContact}
            value={contactId}
            onChange={(e) => onChangeContact(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-950 text-xs min-h-[40px] transition-colors ${
              missingContact
                ? 'border-amber-400 dark:border-amber-600/80 ring-1 ring-amber-400/30'
                : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <option value="">Selecione ou cadastre o contato...</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.personType}] {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showValidationHint && (missingCategory || missingContact) && (
        <div
          data-testid="xml-mandatory-fields-hint"
          className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Preencha{' '}
            {missingCategory && missingContact
              ? 'a Categoria padrão e o Contato'
              : missingCategory
                ? 'a Categoria padrão'
                : 'o Contato vinculado'}{' '}
            para liberar o botão de importação.
          </span>
        </div>
      )}
    </div>
  );
};
