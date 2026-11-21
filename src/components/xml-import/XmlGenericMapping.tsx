import React from 'react';
import { UserPlus } from 'lucide-react';
import type { GenericXmlMapping } from '../../utils/xmlParser';

interface XmlGenericMappingProps {
  recordTag: string;
  fields: string[];
  mapping: GenericXmlMapping;
  onChangeMapping: (mapping: GenericXmlMapping) => void;
  candidateContact?: string;
  isCreatingContact?: boolean;
  onAutoCreateCandidate?: () => void;
}

export const XmlGenericMapping: React.FC<XmlGenericMappingProps> = ({
  recordTag,
  fields,
  mapping,
  onChangeMapping,
  candidateContact,
  isCreatingContact,
  onAutoCreateCandidate,
}) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-900 dark:text-white">
          Mapeamento de XML genérico (registro &lt;{recordTag}&gt;)
        </div>
        {candidateContact && onAutoCreateCandidate && (
          <button
            type="button"
            disabled={isCreatingContact}
            onClick={onAutoCreateCandidate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Cadastrar "{candidateContact}"
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            Campo de Descrição
          </label>
          <select
            value={mapping.descriptionField}
            onChange={(e) => onChangeMapping({ ...mapping, descriptionField: e.target.value })}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
          >
            <option value="">Padrão automático</option>
            {fields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            Campo de Valor (R$) *
          </label>
          <select
            value={mapping.amountField}
            onChange={(e) => onChangeMapping({ ...mapping, amountField: e.target.value })}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
          >
            <option value="">Selecione...</option>
            {fields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            Campo de Vencimento
          </label>
          <select
            value={mapping.dueDateField}
            onChange={(e) => onChangeMapping({ ...mapping, dueDateField: e.target.value })}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
          >
            <option value="">Data de hoje</option>
            {fields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            Campo de Documento
          </label>
          <select
            value={mapping.documentField}
            onChange={(e) => onChangeMapping({ ...mapping, documentField: e.target.value })}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
          >
            <option value="">Nenhum</option>
            {fields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            Campo de Favorecido
          </label>
          <select
            value={mapping.contactField}
            onChange={(e) => onChangeMapping({ ...mapping, contactField: e.target.value })}
            className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs min-h-[38px]"
          >
            <option value="">Nenhum</option>
            {fields.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
