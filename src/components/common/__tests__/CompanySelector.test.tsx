import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Company } from '../../../types';
import { CompanySelector } from '../CompanySelector';

const mockCompanies: Company[] = [
  {
    id: 'comp-1',
    userId: 'user-1',
    legalName: 'Matriz Alpha Ltda',
    tradeName: 'Alpha Tech',
    document: '12.345.678/0001-95',
    stateRegistration: '123456789',
    municipalRegistration: '98765',
    status: 'active',
    email: 'contato@alphatech.com',
    phone: '1199999999',
    whatsapp: '1199999999',
    cep: '01001-000',
    street: 'Praça da Sé',
    number: '100',
    complement: 'Sala 1',
    neighborhood: 'Sé',
    city: 'São Paulo',
    state: 'SP',
    logoDataUrl: 'data:image/png;base64,samplelogodata',
    color: '#0F766E',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'comp-2',
    userId: 'user-1',
    legalName: 'Beta Serviços Financeiros Ltda',
    tradeName: 'Beta Pay',
    document: '33.000.167/0001-01',
    stateRegistration: '',
    municipalRegistration: '',
    status: 'active',
    email: 'financeiro@betapay.com',
    phone: '2198888888',
    whatsapp: '',
    cep: '20040-002',
    street: 'Av. Rio Branco',
    number: '50',
    complement: '',
    neighborhood: 'Centro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    logoDataUrl: '',
    color: '#2563EB',
    isDefault: false,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'comp-inactive',
    userId: 'user-1',
    legalName: 'Gama Inativa ME',
    tradeName: 'Gama Off',
    document: '00.000.000/0001-91',
    stateRegistration: '',
    municipalRegistration: '',
    status: 'inactive',
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
    color: '#DC2626',
    isDefault: false,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z',
  },
];

describe('CompanySelector', () => {
  it('renders consolidated view with active company badge count', () => {
    const onSelect = vi.fn();
    const onManage = vi.fn();

    render(
      <CompanySelector
        companies={mockCompanies}
        selectedCompanyId="all"
        onSelectCompany={onSelect}
        onManageCompanies={onManage}
      />
    );

    expect(screen.getByTestId('company-selector-trigger')).toHaveTextContent('Todas as Empresas');
    // Active count: 2 (comp-1 and comp-2, ignoring inactive)
    expect(screen.getByTestId('company-selector-trigger')).toHaveTextContent('2');
  });

  it('renders selected company trade name and switches companies', () => {
    const onSelect = vi.fn();
    const onManage = vi.fn();

    const { rerender } = render(
      <CompanySelector
        companies={mockCompanies}
        selectedCompanyId="comp-1"
        onSelectCompany={onSelect}
        onManageCompanies={onManage}
      />
    );

    expect(screen.getByTestId('company-selector-trigger')).toHaveTextContent('Alpha Tech');

    // Open dropdown
    fireEvent.click(screen.getByTestId('company-selector-trigger'));
    expect(screen.getByTestId('company-selector-dropdown')).toBeInTheDocument();

    // Select second company
    fireEvent.click(screen.getByTestId('company-option-comp-2'));
    expect(onSelect).toHaveBeenCalledWith('comp-2');

    // Re-render with 'all'
    rerender(
      <CompanySelector
        companies={mockCompanies}
        selectedCompanyId="all"
        onSelectCompany={onSelect}
        onManageCompanies={onManage}
      />
    );

    fireEvent.click(screen.getByTestId('company-selector-trigger'));
    fireEvent.click(screen.getByTestId('company-option-all'));
    expect(onSelect).toHaveBeenCalledWith('all');
  });

  it('triggers onManageCompanies when clicking manage shortcut link', () => {
    const onSelect = vi.fn();
    const onManage = vi.fn();

    render(
      <CompanySelector
        companies={mockCompanies}
        selectedCompanyId="all"
        onSelectCompany={onSelect}
        onManageCompanies={onManage}
      />
    );

    fireEvent.click(screen.getByTestId('company-selector-trigger'));
    fireEvent.click(screen.getByTestId('manage-companies-shortcut'));

    expect(onManage).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('company-selector-dropdown')).not.toBeInTheDocument();
  });
});
