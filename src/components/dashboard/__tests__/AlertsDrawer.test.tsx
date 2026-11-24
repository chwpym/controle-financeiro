import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Company, Contact, Transaction } from '../../../types';
import { AlertsDrawer } from '../AlertsDrawer';

const mockToday = '2026-11-23';

const mockContacts: Contact[] = [
  {
    id: 'ct-1',
    userId: 'u1',
    personType: 'PJ',
    kind: 'supplier',
    name: 'Distribuidora Silva Ltda',
    tradeName: 'Silva Distribuição',
    document: '12.345.678/0001-95',
    email: 'silva@email.com',
    phone: '1199999999',
    cep: '01001-000',
    street: 'Rua A',
    number: '10',
    complement: '',
    neighborhood: 'Bairro',
    city: 'São Paulo',
    state: 'SP',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockCompanies: Company[] = [
  {
    id: 'comp-1',
    userId: 'u1',
    legalName: 'Empresa Principal Ltda',
    tradeName: 'Principal Tech',
    document: '11.222.333/0001-81',
    stateRegistration: '',
    municipalRegistration: '',
    status: 'active',
    email: '',
    phone: '',
    whatsapp: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    logoDataUrl: '',
    color: '#0F766E',
    isDefault: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockAlerts: Transaction[] = [
  {
    id: 'tx-overdue',
    userId: 'u1',
    companyId: 'comp-1',
    type: 'payable',
    description: 'Fornecedor Atrasado',
    amountCents: 50000,
    discountCents: 0,
    interestCents: 0,
    dueDate: '2026-11-20', // Vencida
    paidAt: null,
    status: 'pending',
    paymentMethod: '',
    categoryId: null,
    contactId: 'ct-1',
    documentNumber: 'NF-101',
    issueDate: '2026-11-01',
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceInterval: null,
    notes: 'Urgente pagar',
    source: 'manual',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  },
  {
    id: 'tx-today',
    userId: 'u1',
    companyId: 'comp-1',
    type: 'payable',
    description: 'Internet Fibra Vence Hoje',
    amountCents: 15000,
    discountCents: 0,
    interestCents: 0,
    dueDate: '2026-11-23', // Vence Hoje
    paidAt: null,
    status: 'pending',
    paymentMethod: '',
    categoryId: null,
    contactId: null,
    documentNumber: '',
    issueDate: '2026-11-01',
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceInterval: null,
    notes: '',
    source: 'manual',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  },
  {
    id: 'tx-3days',
    userId: 'u1',
    companyId: 'comp-1',
    type: 'receivable',
    description: 'Fatura Cliente a Receber',
    amountCents: 200000,
    discountCents: 0,
    interestCents: 0,
    dueDate: '2026-11-25', // Próximos 2 dias
    paidAt: null,
    status: 'pending',
    paymentMethod: '',
    categoryId: null,
    contactId: 'ct-1',
    documentNumber: 'FAT-202',
    issueDate: '2026-11-01',
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceInterval: null,
    notes: '',
    source: 'manual',
    createdAt: '2026-11-01',
    updatedAt: '2026-11-01',
  },
];

describe('AlertsDrawer', () => {
  beforeEach(() => {
    // Freeze "today" so due-date buckets are deterministic regardless of the real date
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(`${mockToday}T12:00:00`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders drawer with alert list, filter counts and allows closing', () => {
    const onClose = vi.fn();
    const onQuickSettle = vi.fn();

    render(
      <AlertsDrawer
        isOpen={true}
        onClose={onClose}
        alerts={mockAlerts}
        contacts={mockContacts}
        companies={mockCompanies}
        onQuickSettle={onQuickSettle}
      />
    );

    expect(screen.getByTestId('alerts-drawer')).toBeInTheDocument();
    expect(screen.getByText('Fornecedor Atrasado')).toBeInTheDocument();
    expect(screen.getByText('Internet Fibra Vence Hoje')).toBeInTheDocument();
    expect(screen.getByText('Fatura Cliente a Receber')).toBeInTheDocument();

    // Close on X
    fireEvent.click(screen.getByTestId('alerts-drawer-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('filters by overdue and triggers quick settlement', () => {
    const onClose = vi.fn();
    const onQuickSettle = vi.fn();

    render(
      <AlertsDrawer
        isOpen={true}
        onClose={onClose}
        alerts={mockAlerts}
        contacts={mockContacts}
        companies={mockCompanies}
        onQuickSettle={onQuickSettle}
      />
    );

    // Click Vencidas filter
    fireEvent.click(screen.getByTestId('alerts-filter-overdue'));

    expect(screen.getByText('Fornecedor Atrasado')).toBeInTheDocument();
    expect(screen.queryByText('Internet Fibra Vence Hoje')).not.toBeInTheDocument();
    expect(screen.queryByText('Fatura Cliente a Receber')).not.toBeInTheDocument();

    // Trigger quick settle on the overdue item
    fireEvent.click(screen.getByTestId('quick-settle-tx-overdue'));
    expect(onQuickSettle).toHaveBeenCalledWith(mockAlerts[0]);
  });
});
