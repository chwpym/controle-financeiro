import React from 'react';
import { UserCheck, UserPlus } from 'lucide-react';
import type { TransactionType } from '../../types';
import type { NfeXmlAddress } from '../../utils/xmlParser';

interface XmlContactMatcherProps {
  txType: TransactionType;
  title: string;
  contactName: string;
  contactTradeName?: string;
  contactDocument: string;
  contactAddress: NfeXmlAddress;
  isBound: boolean;
  isCreating: boolean;
  onAutoCreate: () => void;
}

export const XmlContactMatcher: React.FC<XmlContactMatcherProps> = ({
  txType,
  title,
  contactName,
  contactTradeName,
  contactDocument,
  contactAddress,
  isBound,
  isCreating,
  onAutoCreate,
}) => {
  const roleLabel = txType === 'receivable' ? 'Cliente' : 'Fornecedor';
  const addressParts = [
    contactAddress.street,
    contactAddress.number,
    contactAddress.neighborhood,
    contactAddress.city && contactAddress.state
      ? `${contactAddress.city}/${contactAddress.state}`
      : contactAddress.city,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 text-xs space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{title}</span>
            {isBound && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <UserCheck className="w-3 h-3" /> Vinculado
              </span>
            )}
          </div>
          <div className="text-slate-600 dark:text-slate-300 mt-0.5 truncate">
            {roleLabel}: <strong>{contactName || 'Não identificado no XML'}</strong>
            {contactTradeName ? ` (${contactTradeName})` : ''}
            {contactDocument ? ` · Doc: ${contactDocument}` : ''}
          </div>
          {addressParts.length > 0 && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Endereço: {addressParts.join(', ')}
            </div>
          )}
        </div>

        {!isBound && contactName && (
          <button
            type="button"
            disabled={isCreating}
            onClick={onAutoCreate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 min-h-[38px] shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isCreating ? 'Cadastrando...' : `Cadastrar ${roleLabel.toLowerCase()} e vincular`}
          </button>
        )}
      </div>
    </div>
  );
};
