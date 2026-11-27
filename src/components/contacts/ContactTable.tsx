import React from 'react';
import { Plus, Users } from 'lucide-react';
import type { Contact, Transaction } from '../../types';
import { ContactCardList } from './ContactCardList';

interface ContactTableProps {
  contacts: Contact[];
  contactTxMap: Map<string, Transaction[]>;
  search: string;
  onOpenNew: () => void;
  onInspect: (c: Contact) => void;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}

export const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
  contactTxMap,
  search,
  onOpenNew,
  onInspect,
  onEdit,
  onDelete,
}) => {
  return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {contacts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nenhum contato encontrado
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? 'Nenhum resultado corresponde aos termos da pesquisa.'
                : 'Você ainda não cadastrou nenhum cliente ou fornecedor.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={onOpenNew}
                className="mt-2 px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar primeiro contato
              </button>
            )}
          </div>
        ) : (
          <ContactCardList
            contacts={contacts}
            contactTxMap={contactTxMap}
            onInspect={onInspect}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </div>
  );
};
