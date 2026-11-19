/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Wallet } from 'lucide-react';
import type { Contact, Transaction } from '../../../types';
import { KpiCard, SearchBar } from '../index';
import { ContactHistoryModal } from '../../ContactHistoryModal';

const sampleContact: Contact = {
  id: 'c-1',
  userId: 'u-1',
  personType: 'PJ',
  kind: 'customer',
  name: 'Distribuidora Exemplo Ltda',
  tradeName: 'Exemplo',
  document: '12.345.678/0001-90',
  email: 'contato@exemplo.com.br',
  phone: '(11) 99999-0000',
  cep: '01001-000',
  street: 'Praça da Sé',
  number: '100',
  complement: '',
  neighborhood: 'Sé',
  city: 'São Paulo',
  state: 'SP',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const sampleTransactions: Transaction[] = [
  {
    id: 'tx-1',
    userId: 'u-1',
    type: 'receivable',
    description: 'Mensalidade Abril',
    amountCents: 150000,
    discountCents: 0,
    interestCents: 0,
    dueDate: '2026-04-10',
    paidAt: '2026-04-10',
    status: 'settled',
    paymentMethod: 'PIX',
    categoryId: null,
    contactId: 'c-1',
    documentNumber: 'NF-101',
    issueDate: null,
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceInterval: null,
    notes: '',
    source: 'manual',
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-10T00:00:00.000Z',
  },
  {
    id: 'tx-2',
    userId: 'u-1',
    type: 'payable',
    description: 'Fornecimento em aberto',
    amountCents: 45000,
    discountCents: 0,
    interestCents: 0,
    dueDate: '2020-01-15',
    paidAt: null,
    status: 'pending',
    paymentMethod: '',
    categoryId: null,
    contactId: 'c-1',
    documentNumber: 'NF-102',
    issueDate: null,
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceInterval: null,
    notes: '',
    source: 'manual',
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  },
];

describe('Common Components', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('SearchBar', () => {
    it('renders placeholder, initial value and fires onChange on input', () => {
      const handleChange = vi.fn();
      render(<SearchBar value="teste" onChange={handleChange} placeholder="Buscar cliente..." />);

      const input = screen.getByPlaceholderText('Buscar cliente...') as HTMLInputElement;
      expect(input.value).toBe('teste');

      fireEvent.change(input, { target: { value: 'novo termo' } });
      expect(handleChange).toHaveBeenCalledWith('novo termo');
    });

    it('shows clear button only when non-empty and resets value on click', () => {
      const handleChange = vi.fn();
      const handleClear = vi.fn();
      const { rerender } = render(<SearchBar value="" onChange={handleChange} onClear={handleClear} />);

      expect(screen.queryByRole('button', { name: /limpar busca/i })).not.toBeInTheDocument();

      rerender(<SearchBar value="empresa" onChange={handleChange} onClear={handleClear} />);
      const clearBtn = screen.getByRole('button', { name: /limpar busca/i });
      fireEvent.click(clearBtn);

      expect(handleChange).toHaveBeenCalledWith('');
      expect(handleClear).toHaveBeenCalledTimes(1);
    });

    it('triggers onDebouncedChange after debounce delay', () => {
      vi.useFakeTimers();
      const handleDebounced = vi.fn();
      const { rerender } = render(
        <SearchBar value="" onChange={vi.fn()} onDebouncedChange={handleDebounced} debounceMs={200} />
      );

      rerender(
        <SearchBar value="boleto" onChange={vi.fn()} onDebouncedChange={handleDebounced} debounceMs={200} />
      );
      expect(handleDebounced).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(handleDebounced).toHaveBeenCalledWith('boleto');
    });
  });

  describe('KpiCard', () => {
    it('renders title, formatted BRL value with tabular numerals and subtitle', () => {
      render(
        <KpiCard
          title="Saldo Previsto"
          amountCents={150000}
          tone="positive"
          subtitle="Realizado no mês"
          icon={<Wallet data-testid="kpi-icon" />}
        />
      );

      expect(screen.getByText('Saldo Previsto')).toBeInTheDocument();
      const valueEl = screen.getByText(/R\$\s*1\.500,00/);
      expect(valueEl).toHaveClass('font-mono-tabular', 'text-emerald-700');
      expect(screen.getByText('Realizado no mês')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-icon')).toBeInTheDocument();
    });

    it('applies negative and danger semantic tones and renders trend and custom badge', () => {
      const { rerender } = render(
        <KpiCard
          title="Total a Pagar"
          amountCents={82550}
          tone="negative"
          trend={{ value: '-12%', direction: 'down', label: 'vs. anterior' }}
        />
      );

      expect(screen.getByText(/R\$\s*825,50/)).toHaveClass('text-rose-700');
      expect(screen.getByText('-12%')).toBeInTheDocument();
      expect(screen.getByText('vs. anterior')).toBeInTheDocument();

      rerender(
        <KpiCard
          title="Vencido"
          amountCents={5000}
          tone="danger"
          trend={{ value: '+5%', direction: 'up' }}
          badge={<span data-testid="custom-badge">Crítico</span>}
        />
      );

      expect(screen.getByText(/R\$\s*50,00/)).toHaveClass('text-red-600');
      expect(screen.getByText('+5%')).toBeInTheDocument();
      expect(screen.getByTestId('custom-badge')).toBeInTheDocument();
    });
  });

  describe('ContactHistoryModal', () => {
    it('does not render when closed or when contact is null', () => {
      const { rerender } = render(
        <ContactHistoryModal
          contact={sampleContact}
          isOpen={false}
          onClose={vi.fn()}
          transactions={sampleTransactions}
          onOpenConsult={vi.fn()}
        />
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      rerender(
        <ContactHistoryModal
          contact={null}
          isOpen={true}
          onClose={vi.fn()}
          transactions={sampleTransactions}
          onOpenConsult={vi.fn()}
        />
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays contact KPIs, transaction history and triggers consult and close callbacks', () => {
      const handleClose = vi.fn();
      const handleConsult = vi.fn();

      render(
        <ContactHistoryModal
          contact={sampleContact}
          isOpen={true}
          onClose={handleClose}
          transactions={sampleTransactions}
          selectedMonth="2026-04"
          onOpenConsult={handleConsult}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Ficha Financeira — Distribuidora Exemplo Ltda/)).toBeInTheDocument();
      expect(screen.getByText('Liquidado')).toBeInTheDocument();
      expect(screen.getByText('Em aberto')).toBeInTheDocument();
      expect(screen.getAllByText('Vencido')).toHaveLength(2);
      expect(screen.getAllByText(/R\$\s*1\.500,00/)).toHaveLength(2);
      expect(screen.getAllByText(/R\$\s*450,00/)).toHaveLength(3);

      fireEvent.click(screen.getByRole('button', { name: 'Mensalidade Abril' }));
      expect(handleConsult).toHaveBeenCalledWith(sampleTransactions[0]);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /fechar ficha/i }));
      expect(handleClose).toHaveBeenCalledTimes(2);
    });
  });
});
