import React from 'react';
import { FolderDown, Trash2 } from 'lucide-react';
import type { Contact } from '../../types';
import type { ContactFormData } from './ContactDrawer';

interface ContactFormActionsProps {
  form: ContactFormData;
  duplicateContact: Contact | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
  showConfirmDelete: boolean;
  setShowConfirmDelete: (v: boolean) => void;
}

export const ContactFormActions: React.FC<ContactFormActionsProps> = ({
  form,
  duplicateContact,
  onClose,
  onDelete,
  showConfirmDelete,
  setShowConfirmDelete,
}) => {
  return (
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between shrink-0 gap-3">
          <div>
            {form.id && onDelete && (
              <>
                {showConfirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">Excluir?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(form.id!);
                        onClose();
                      }}
                      className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      NÃ£o
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                    title="Eliminar cadastro"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors min-h-[40px]"
            >
              Abandonar (Cancelar)
            </button>
            <button
              type="submit"
              form="contact-drawer-form"
              disabled={Boolean(duplicateContact)}
              className="px-5 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px] flex items-center gap-1.5 shadow-sm"
            >
              <FolderDown className="w-4 h-4" />
              {form.id ? 'Gravar AlteraÃ§Ãµes' : 'Gravar Cadastro'}
            </button>
          </div>
        </div>
  );
};
