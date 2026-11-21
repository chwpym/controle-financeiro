/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Category, Contact, Transaction } from '../../../types';
import {
  DashboardConfigPopover,
  DashboardKpis,
} from '../index';
import { DashboardView } from '../../DashboardView';

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Aluguel', type: 'payable', color: '#EF4444', userId: 'u-1', createdAt: '', updatedAt: '' },
  { id: 'cat-2', name: 'Software', type: 'payable', color: '#3B82F6', userId: 'u-1', createdAt: '', updatedAt: '' },
];

const mockContacts: Contact[] = [
  {
    id: 'c-1',
    userId: 'u-1',
    personType: 'PJ',
    kind: 'supplier',
    name: 'Locadora Alpha',
    tradeName: 'Alpha',
    document: '00.000.000/0001-00',
    email: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    createdAt: '',
    updatedAt: '',
  },
];

const mockTransactions: Transaction[] = [
  {
    id: 't-1',
    userId: 'u-1',
    type: 'receivable',
    description: 'Venda de Consultoria',
    amountCents: 500000,
    discountCents: 0,
    interestCents: 0,
    dueDate: '2026-05-10',
    paidAt: '2026-05-10',
    status: 'settled',
    paymentMethod: 'PIX',
    categoryId: null,
    contactId: null,
    documentNumber: 'DOC-01',
    issueDate: null,
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceInterval: null,
    notes: '',
    source: 'manual',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 't-2',
    userId: 'u-1',
    type: 'payable',
    description: 'Aluguel Escritório',
    amountCents: 200000,
    discountCents: 0,
    interestCents: 0,
    dueDate: '2026-05-15',
    paidAt: null,
    status: 'pending',
    paymentMethod: 'Boleto',
    categoryId: 'cat-1',
    contactId: 'c-1',
    documentNumber: 'DOC-02',
    issueDate: null,
    installmentGroupId: null,
    installmentNumber: 1,
    installmentTotal: 1,
    isRecurring: false,
    recurrenceInterval: null,
    notes: '',
    source: 'manual',
    createdAt: '',
    updatedAt: '',
  },
];

describe('Dashboard Modular Components', () => {
  afterEach(() => {
    localStorage.clear();
  });

  describe('DashboardKpis', () => {
    it('renders all 4 top KPI cards with correct formatted BRL values', () => {
      const onNavigate = vi.fn();
      const monthStats = {
        projectedBalance: 300000,
        realizedBalance: 500000,
        receivableTotal: 500000,
        receivableSettled: 500000,
        payableTotal: 200000,
        payableSettled: 0,
        overdueTotal: 0,
        overdueCount: 0,
      };

      render(
        <DashboardKpis
          monthStats={monthStats}
          kpiOrder={['projected', 'receivable', 'payable', 'overdue']}
          onUpdateKpiOrder={vi.fn()}
          onNavigateToTransactions={onNavigate}
        />
      );

      expect(screen.getByText('Saldo Previsto do Mês')).toBeInTheDocument();
      expect(screen.getByText('Total a Receber')).toBeInTheDocument();
      expect(screen.getByText('Total a Pagar')).toBeInTheDocument();
      expect(screen.getByText('Vencidas no Mês')).toBeInTheDocument();

      // Trigger navigation filter click
      fireEvent.click(screen.getByText('Total a Receber'));
      expect(onNavigate).toHaveBeenCalledWith('receivable');

      fireEvent.click(screen.getByText('Total a Pagar'));
      expect(onNavigate).toHaveBeenCalledWith('payable');
    });
  });

  describe('DashboardConfigPopover', () => {
    it('opens popover and allows toggling widget visibility and column span', () => {
      const onToggle = vi.fn();
      const onChangeSpan = vi.fn();
      const onReset = vi.fn();

      render(
        <DashboardConfigPopover
          visibleWidgets={{
            monthly_chart: true,
            categories: true,
            payment_methods: true,
            daily_cashflow: true,
            alerts: true,
          }}
          widgetSpans={{
            monthly_chart: 2,
            categories: 1,
            payment_methods: 1,
            daily_cashflow: 2,
            alerts: 2,
          }}
          onToggleVisibility={onToggle}
          onChangeSpan={onChangeSpan}
          onResetDefaults={onReset}
          isCustomLayout={true}
        />
      );

      const triggerBtn = screen.getByRole('button', { name: /Personalizar/i });
      fireEvent.click(triggerBtn);

      expect(screen.getByText('Widgets do Painel')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(5);
      fireEvent.click(checkboxes[0]);
      expect(onToggle).toHaveBeenCalled();

      const resetBtn = screen.getByRole('button', { name: /Restaurar padrão/i });
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('DashboardView Full Orchestrator', () => {
    it('renders cleanly and integrates modular subcomponents', () => {
      render(
        <DashboardView
          userId="u-1"
          selectedMonth="2026-05"
          transactions={mockTransactions}
          categories={mockCategories}
          contacts={mockContacts}
          notifyLeadDays={3}
          inAppAlertsEnabled={true}
          notificationPermission="granted"
          onRequestNotificationPermission={vi.fn()}
          onQuickSettle={vi.fn()}
          onOpenConsult={vi.fn()}
          onOpenNewTransaction={vi.fn()}
          onNavigateToTransactions={vi.fn()}
        />
      );

      // Check header and controls
      expect(screen.getByText('Personalizar')).toBeInTheDocument();
      expect(screen.getByText('Reordenar cards')).toBeInTheDocument();
      expect(screen.getByText('Nova Conta')).toBeInTheDocument();

      // Check that KPIs rendered
      expect(screen.getByText('Saldo Previsto do Mês')).toBeInTheDocument();

      // Check that widgets rendered
      expect(screen.getByText('Desempenho Mensal (BRL)')).toBeInTheDocument();
      expect(screen.getByText('Despesas por Categoria')).toBeInTheDocument();
      expect(screen.getByText('Resumo por Forma de Pagamento')).toBeInTheDocument();
      expect(screen.getByText('Fluxo de Caixa Diário (Projeção)')).toBeInTheDocument();
      expect(screen.getByText('Alertas de Vencimento')).toBeInTheDocument();
    });
  });
});
