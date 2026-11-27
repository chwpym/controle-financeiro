import React, { useMemo, useState } from 'react';
import type { Contact } from '../../types';
import { findDuplicateContactDocument } from '../../utils/format';
import type { ContactFormData } from './ContactDrawer';
import { useContactLookups, type ContactFeedback } from './useContactLookups';

export const EMPTY_FORM: ContactFormData = {
  id: null,
  personType: 'PJ',
  kind: 'both',
  name: '',
  tradeName: '',
  document: '',
  email: '',
  phone: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

export function useContactForm(
  userId: string,
  contacts: Contact[],
  onSaveContact: (contact: Contact) => void,
) {
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState<ContactFeedback>(null);
  const lookups = useContactLookups(contacts, form, setForm, setFeedback);

  const duplicateContact = useMemo(() => {
    return findDuplicateContactDocument(contacts, form.document, form.id);
  }, [contacts, form.document, form.id]);

  const handleOpenNew = () => {
    setForm(EMPTY_FORM);
    setFeedback(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (c: Contact) => {
    setFeedback(null);
    setForm({
      id: c.id,
      personType: c.personType,
      kind: c.kind,
      name: c.name,
      tradeName: c.tradeName || '',
      document: c.document || '',
      email: c.email || '',
      phone: c.phone || '',
      cep: c.cep || '',
      street: c.street || '',
      number: c.number || '',
      complement: c.complement || '',
      neighborhood: c.neighborhood || '',
      city: c.city || '',
      state: c.state || '',
    });
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!form.name.trim()) {
      setFeedback({
        kind: 'error',
        text: form.personType === 'PJ' ? 'Informe a Razão Social.' : 'Informe o Nome completo.',
      });
      return;
    }

    const duplicate = findDuplicateContactDocument(contacts, form.document, form.id);
    if (duplicate) {
      setFeedback({
        kind: 'error',
        text: `Não é possível salvar: este ${form.personType === 'PJ' ? 'CNPJ' : 'CPF'} já está cadastrado para "${duplicate.name}".`,
      });
      return;
    }

    const now = new Date().toISOString();
    const existing = form.id ? contacts.find((c) => c.id === form.id) : undefined;
    const contact: Contact = {
      id: form.id || crypto.randomUUID(),
      userId,
      personType: form.personType,
      kind: form.kind,
      name: form.name.trim(),
      tradeName: form.personType === 'PJ' ? form.tradeName.trim() : '',
      document: form.document.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      cep: form.cep.trim(),
      street: form.street.trim(),
      number: form.number.trim(),
      complement: form.complement.trim(),
      neighborhood: form.neighborhood.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    onSaveContact(contact);
    setForm(EMPTY_FORM);
    setIsDrawerOpen(false);
    setFeedback(null);
  };

  return {
    form,
    setForm,
    isDrawerOpen,
    setIsDrawerOpen,
    feedback,
    duplicateContact,
    handleOpenNew,
    handleEdit,
    handleSubmit,
    ...lookups,
  };
}
