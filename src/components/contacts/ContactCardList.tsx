import React from 'react';
import { Building2, Edit2, Eye, Phone, Trash2, User } from 'lucide-react';
import type { Contact, Transaction } from '../../types';
import { formatBRL } from '../../utils/format';

interface ContactCardListProps {
  contacts: Contact[];
  contactTxMap: Map<string, Transaction[]>;
  onInspect: (c: Contact) => void;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}

export const ContactCardList: React.FC<ContactCardListProps> = ({
  contacts,
  contactTxMap,
  onInspect,
  onEdit,
  onDelete,
}) => {
  return (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {contacts.map((c) => {
              const linkedTxs = contactTxMap.get(c.id) || [];
              const pendingCents = linkedTxs
                .filter((t) => t.status === 'pending')
                .reduce((s, t) => s + t.amountCents, 0);

              return (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  {/* Left Info Column */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                      {c.personType === 'PJ' ? <Building2 className="w-5 h-5 text-teal-700 dark:text-teal-400" /> : <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onInspect(c)}
                          title="Abrir ficha financeira do contato"
                          className="text-left text-sm sm:text-base font-semibold text-slate-900 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 truncate cursor-pointer"
                        >
                          {c.name}
                        </button>

                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 font-mono-tabular shrink-0">
                          {c.personType}
                        </span>

                        {c.kind && c.kind !== 'both' && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 uppercase ${
                              c.kind === 'customer'
                                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300'
                                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                            }`}
                          >
                            {c.kind === 'customer' ? 'Cliente' : 'Fornecedor'}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {c.tradeName && <span className="text-slate-700 dark:text-slate-300 font-medium">({c.tradeName})</span>}
                        {c.document && <span className="font-mono-tabular font-medium text-slate-600 dark:text-slate-400">{c.document}</span>}
                        {c.city && (
                          <span>
                            · {c.city}
                            {c.state ? `/${c.state}` : ''}
                          </span>
                        )}
                        {c.phone && (
                          <span className="font-mono-tabular inline-flex items-center gap-1">
                            · <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Status & Actions Column */}
                  <div className="flex items-center justify-between md:justify-end gap-3.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80">
                    {/* Financial Badge */}
                    <div className="text-left md:text-right">
                      {linkedTxInfo(linkedTxs.length, pendingCents)}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onInspect(c)}
                        className="p-2 rounded-xl text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
                        title="Ver ficha financeira e extrato"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit(c)}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
                        title="Editar cadastro (abrir gaveta)"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(c.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors cursor-pointer"
                        title="Excluir contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
  );
};

function linkedTxInfo(count: number, pendingCents: number) {
  if (count === 0) {
    return (
      <span className="text-xs text-slate-400 dark:text-slate-500">
        Nenhuma conta vinculada
      </span>
    );
  }

  if (pendingCents > 0) {
    return (
      <div>
        <div className="text-xs font-mono-tabular font-bold text-amber-600 dark:text-amber-400">
          {formatBRL(pendingCents)}
        </div>
        <div className="text-[11px] text-slate-500">
          {count} conta(s) ({formatBRL(pendingCents)} em aberto)
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        Contas em dia
      </div>
      <div className="text-[11px] text-slate-500">
        {count} conta(s) liquidada(s)
      </div>
    </div>
  );
}
