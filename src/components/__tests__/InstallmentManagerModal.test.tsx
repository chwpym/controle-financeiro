/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InstallmentManagerModal } from '../InstallmentManagerModal';
import type { Contact, Transaction } from '../../types';

describe('InstallmentManagerModal', () => {
  const mockContacts: Contact[] = [
    {
      id: 'ct-1',
      userId: 'u1',
      personType: 'PJ',
      kind: 'supplier',
      name: 'DELL COMPUTADORES DO BRASIL LTDA',
      tradeName: 'DELL',
      document: '72.381.189/0001-10',
      email: 'contato@dell.com',
      phone: '11999999999',
      cep: '01001-000',
      street: 'Av Principal',
      number: '100',
      complement: '',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  describe('Cenário A: Lançamento À Vista (Pendente)', () => {
    const singleTx: Transaction = {
      id: 'tx-single-1',
      userId: 'u1',
      type: 'payable',
      description: 'Compra de Notebook',
      amountCents: 600000, // R$ 6.000,00
      discountCents: 0,
      interestCents: 0,
      dueDate: '2026-11-20',
      paidAt: null,
      status: 'pending',
      paymentMethod: '',
      categoryId: null,
      contactId: 'ct-1',
      documentNumber: 'NF-8921',
      issueDate: '2026-11-10',
      installmentGroupId: null,
      installmentNumber: 1,
      installmentTotal: 1,
      isRecurring: false,
      recurrenceInterval: null,
      notes: 'Equipamento TI',
      source: 'manual',
      createdAt: '2026-11-10T10:00:00Z',
      updatedAt: '2026-11-10T10:00:00Z',
    };

    it('renders Scenario A with original transaction summary and allows splitting into 3x by default', () => {
      const handleApply = vi.fn();
      const handleClose = vi.fn();

      render(
        <InstallmentManagerModal
          isOpen={true}
          onClose={handleClose}
          transaction={singleTx}
          transactions={[singleTx]}
          contacts={mockContacts}
          onApplyRenegotiation={handleApply}
        />
      );

      // Header
      expect(screen.getByText(/Parcelar Lançamento — Compra de Notebook/i)).toBeInTheDocument();

      // Original summary
      expect(screen.getByText('DELL COMPUTADORES DO BRASIL LTDA')).toBeInTheDocument();
      expect(screen.getByText('NF-8921')).toBeInTheDocument();

      // Button to transform in 3x
      const confirmBtn = screen.getByRole('button', { name: /Confirmar e Transformar em 3x/i });
      expect(confirmBtn).toBeInTheDocument();

      fireEvent.click(confirmBtn);

      expect(handleApply).toHaveBeenCalledTimes(1);
      const [toDeleteIds, toUpsert] = handleApply.mock.calls[0];
      expect(toDeleteIds).toEqual(['tx-single-1']);
      expect(toUpsert).toHaveLength(3);
      expect(toUpsert[0].amountCents).toBe(200000);
      expect(toUpsert[1].amountCents).toBe(200000);
      expect(toUpsert[2].amountCents).toBe(200000);
      expect(toUpsert[0].installmentGroupId).toBeTruthy();
      expect(handleClose).toHaveBeenCalled();
    });

    it('updates to 6x when preset button is clicked', () => {
      const handleApply = vi.fn();
      render(
        <InstallmentManagerModal
          isOpen={true}
          onClose={vi.fn()}
          transaction={singleTx}
          transactions={[singleTx]}
          contacts={mockContacts}
          onApplyRenegotiation={handleApply}
        />
      );

      const preset6x = screen.getByRole('button', { name: '6x' });
      fireEvent.click(preset6x);

      const confirmBtn = screen.getByRole('button', { name: /Confirmar e Transformar em 6x/i });
      expect(confirmBtn).toBeInTheDocument();

      fireEvent.click(confirmBtn);

      const [, toUpsert] = handleApply.mock.calls[0];
      expect(toUpsert).toHaveLength(6);
      expect(toUpsert[0].amountCents).toBe(100000);
    });
  });

  describe('Cenário B: Lançamento Já Parcelado (Gestão e Renegociação)', () => {
    const groupId = 'grp-123';
    const groupTxs: Transaction[] = [
      {
        id: 'tx-p1',
        userId: 'u1',
        type: 'payable',
        description: 'Serviço de Reforma (1/3)',
        amountCents: 100000,
        discountCents: 0,
        interestCents: 0,
        dueDate: '2026-09-15',
        paidAt: '2026-09-15',
        status: 'settled',
        paymentMethod: 'PIX',
        categoryId: null,
        contactId: 'ct-1',
        documentNumber: 'CTR-01',
        issueDate: null,
        installmentGroupId: groupId,
        installmentNumber: 1,
        installmentTotal: 3,
        isRecurring: false,
        recurrenceInterval: null,
        notes: '',
        source: 'manual',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z',
      },
      {
        id: 'tx-p2',
        userId: 'u1',
        type: 'payable',
        description: 'Serviço de Reforma (2/3)',
        amountCents: 100000,
        discountCents: 0,
        interestCents: 0,
        dueDate: '2026-10-15',
        paidAt: null,
        status: 'pending',
        paymentMethod: '',
        categoryId: null,
        contactId: 'ct-1',
        documentNumber: 'CTR-01',
        issueDate: null,
        installmentGroupId: groupId,
        installmentNumber: 2,
        installmentTotal: 3,
        isRecurring: false,
        recurrenceInterval: null,
        notes: '',
        source: 'manual',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
      {
        id: 'tx-p3',
        userId: 'u1',
        type: 'payable',
        description: 'Serviço de Reforma (3/3)',
        amountCents: 100000,
        discountCents: 0,
        interestCents: 0,
        dueDate: '2026-11-15',
        paidAt: null,
        status: 'pending',
        paymentMethod: '',
        categoryId: null,
        contactId: 'ct-1',
        documentNumber: 'CTR-01',
        issueDate: null,
        installmentGroupId: groupId,
        installmentNumber: 3,
        installmentTotal: 3,
        isRecurring: false,
        recurrenceInterval: null,
        notes: '',
        source: 'manual',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      },
    ];

    it('renders Scenario B with contract summary, shielded settled installment and renegotiation block', () => {
      const handleApply = vi.fn();

      render(
        <InstallmentManagerModal
          isOpen={true}
          onClose={vi.fn()}
          transaction={groupTxs[1]} // clicking on installment 2
          transactions={groupTxs}
          contacts={mockContacts}
          onApplyRenegotiation={handleApply}
        />
      );

      // Header
      expect(
        screen.getByText(/Gestão do Contrato \/ Parcelamento — Serviço de Reforma/i)
      ).toBeInTheDocument();

      // Top KPI cards
      expect(screen.getByText('Total do Contrato')).toBeInTheDocument();
      expect(screen.getByText('Já Quitado')).toBeInTheDocument();
      expect(screen.getByText('Saldo Restante')).toBeInTheDocument();
      expect(screen.getByText(/1 de 3 quitadas \(blindadas\)/i)).toBeInTheDocument();

      // Renegotiation action
      const saveBtn = screen.getByRole('button', { name: /Salvar Nova Negociação/i });
      expect(saveBtn).toBeInTheDocument();

      fireEvent.click(saveBtn);

      expect(handleApply).toHaveBeenCalledTimes(1);
      const [toDeleteIds, toUpsert] = handleApply.mock.calls[0];
      // Old pending txs to be deleted: tx-p2 and tx-p3
      expect(toDeleteIds).toEqual(['tx-p2', 'tx-p3']);
      // Settled tx-p1 is in toUpsert preserved + 2 new pending = 3 total
      expect(toUpsert).toHaveLength(3);
      const settled = toUpsert.find((t: Transaction) => t.id === 'tx-p1');
      expect(settled.status).toBe('settled');
      expect(settled.paidAt).toBe('2026-09-15');
    });

    it('shows completed contract message when all installments are settled', () => {
      const allSettledTxs = groupTxs.map((t) => ({ ...t, status: 'settled' as const }));

      render(
        <InstallmentManagerModal
          isOpen={true}
          onClose={vi.fn()}
          transaction={allSettledTxs[0]}
          transactions={allSettledTxs}
          contacts={mockContacts}
          onApplyRenegotiation={vi.fn()}
        />
      );

      expect(screen.getByText(/Contrato totalmente quitado!/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Salvar Nova Negociação/i })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'Fechar' }).length).toBeGreaterThanOrEqual(1);
    });
  });
});
