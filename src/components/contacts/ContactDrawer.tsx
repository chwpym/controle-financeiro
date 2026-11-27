import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  MapPin,
  User,
  Users,
  X,
} from 'lucide-react';
import type { Contact, ContactKind, PersonType } from '../../types';
import { ContactDrawerHeader } from './ContactDrawerHeader';
import { ContactFormGeneral } from './ContactFormGeneral';
import { ContactFormAddress } from './ContactFormAddress';
import { ContactFormActions } from './ContactFormActions';

export interface ContactFormData {
  id: string | null;
  personType: PersonType;
  kind: ContactKind;
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface ContactDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  form: ContactFormData;
  setForm: React.Dispatch<React.SetStateAction<ContactFormData>>;
  duplicateContact: Contact | null;
  onConsultCnpj: () => Promise<void>;
  onConsultCep: () => Promise<void>;
  lookupCnpjLoading: boolean;
  lookupCepLoading: boolean;
  feedback: { kind: 'error' | 'success'; text: string } | null;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: (id: string) => void;
  onEditExisting?: (contact: Contact) => void;
}

export const ContactDrawer: React.FC<ContactDrawerProps> = ({
  isOpen,
  onClose,
  form,
  setForm,
  duplicateContact,
  onConsultCnpj,
  onConsultCep,
  lookupCnpjLoading,
  lookupCepLoading,
  feedback,
  onSubmit,
  onDelete,
  onEditExisting,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'address'>('general');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset tab on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
      setShowConfirmDelete(false);
    }
  }, [isOpen, form.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl md:max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
        <ContactDrawerHeader form={form} onClose={onClose} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Feedback Message */}
        {feedback && (
          <div className="px-6 pt-3 shrink-0">
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                feedback.kind === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                  : 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200'
              }`}
            >
              {feedback.kind === 'error' ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
              )}
              <span>{feedback.text}</span>
            </div>
          </div>
        )}

        {/* Drawer Body (Form Content) */}
        <form id="contact-drawer-form" onSubmit={onSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'general' && (
            <ContactFormGeneral
              form={form}
              setForm={setForm}
              duplicateContact={duplicateContact}
              onConsultCnpj={onConsultCnpj}
              lookupCnpjLoading={lookupCnpjLoading}
              onEditExisting={onEditExisting}
            />
          )}

          {activeTab === 'address' && (
            <ContactFormAddress
              form={form}
              setForm={setForm}
              onConsultCep={onConsultCep}
              lookupCepLoading={lookupCepLoading}
            />
          )}
        </form>

        <ContactFormActions
          form={form}
          duplicateContact={duplicateContact}
          onClose={onClose}
          onDelete={onDelete}
          showConfirmDelete={showConfirmDelete}
          setShowConfirmDelete={setShowConfirmDelete}
        />
      </div>
    </div>
  );
};
