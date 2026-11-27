import React, { useState } from 'react';
import type { Contact } from '../../types';
import { api, ApiError } from '../../utils/api';
import { findDuplicateContactDocument } from '../../utils/format';
import type { ContactFormData } from './ContactDrawer';

export type ContactFeedback = { kind: 'error' | 'success'; text: string } | null;

export function useContactLookups(
  contacts: Contact[],
  form: ContactFormData,
  setForm: React.Dispatch<React.SetStateAction<ContactFormData>>,
  setFeedback: (f: ContactFeedback) => void,
) {
  const [lookupCnpjLoading, setLookupCnpjLoading] = useState(false);
  const [lookupCepLoading, setLookupCepLoading] = useState(false);

  const handleConsultCnpj = async () => {
    setFeedback(null);
    const digits = form.document.replace(/\D/g, '');
    if (digits.length !== 14) {
      setFeedback({ kind: 'error', text: 'Informe os 14 dígitos do CNPJ antes de consultar.' });
      return;
    }

    const existingDup = findDuplicateContactDocument(contacts, digits, form.id);
    if (existingDup) {
      setFeedback({
        kind: 'error',
        text: `Atenção: Este CNPJ já pertence ao contato cadastrado "${existingDup.name}".`,
      });
      return;
    }

    setLookupCnpjLoading(true);
    try {
      const data = await api.lookupCnpj(digits);
      setForm((prev) => ({
        ...prev,
        personType: 'PJ',
        document: data.cnpj || prev.document,
        name: data.name || prev.name,
        tradeName: data.tradeName || prev.tradeName,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        cep: data.cep || prev.cep,
        street: data.street || prev.street,
        number: data.number || prev.number,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
      setFeedback({
        kind: 'success',
        text: `Dados preenchidos via CNPJ${data.situacao ? ` (${data.situacao})` : ''}. Você pode editar qualquer campo.`,
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof ApiError ? err.message : 'Não foi possível consultar o CNPJ agora. Preencha manualmente.',
      });
    } finally {
      setLookupCnpjLoading(false);
    }
  };

  const handleConsultCep = async () => {
    setFeedback(null);
    const digits = form.cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setFeedback({ kind: 'error', text: 'Informe os 8 dígitos do CEP antes de consultar.' });
      return;
    }

    setLookupCepLoading(true);
    try {
      const data = await api.lookupCep(digits);
      setForm((prev) => ({
        ...prev,
        cep: data.cep || prev.cep,
        street: data.street || prev.street,
        complement: data.complement || prev.complement,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
      setFeedback({
        kind: 'success',
        text: 'Endereço preenchido pela API de CEP. Você pode editar livremente.',
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof ApiError ? err.message : 'Não foi possível consultar o CEP agora. Preencha manualmente.',
      });
    } finally {
      setLookupCepLoading(false);
    }
  };

  return { lookupCnpjLoading, lookupCepLoading, handleConsultCnpj, handleConsultCep };
}
