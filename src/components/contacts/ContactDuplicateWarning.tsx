import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Contact } from '../../types';

interface ContactDuplicateWarningProps {
  duplicateContact: Contact | null;
  onEditExisting?: (contact: Contact) => void;
}

export const ContactDuplicateWarning: React.FC<ContactDuplicateWarningProps> = ({
  duplicateContact,
  onEditExisting,
}) => {
  return (
  <>
                {/* Duplicate Document Warning */}
                {duplicateContact && (
                  <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Documento já cadastrado:</span> Pertence a{' '}
                        <strong>"{duplicateContact.name}"</strong>.
                      </div>
                    </div>
                    {onEditExisting && (
                      <button
                        type="button"
                        onClick={() => onEditExisting(duplicateContact)}
                        className="shrink-0 px-2.5 py-1 bg-amber-200/80 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-950 dark:text-amber-100 rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Editar existente
                      </button>
                    )}
                  </div>
                )}
  </>
  );
};
