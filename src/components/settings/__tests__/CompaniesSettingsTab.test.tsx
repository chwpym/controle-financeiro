/// <reference types="@testing-library/jest-dom/vitest" />
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompaniesSettingsTab } from '../CompaniesSettingsTab';
import type { Company } from '../../../types';
import { api } from '../../../utils/api';

vi.mock('../../../utils/api', () => ({
  api: {
    getCompanies: vi.fn(),
    createCompany: vi.fn(),
    updateCompany: vi.fn(),
    updateCompanyStatus: vi.fn(),
    setCompanyDefault: vi.fn(),
    deleteCompany: vi.fn(),
    lookupCep: vi.fn(),
  },
}));

describe('CompaniesSettingsTab', () => {
  const mockCompanies: Company[] = [
    {
      id: 'comp-1',
      userId: 'user-1',
      legalName: 'Alpha Comércio e Representações Ltda',
      tradeName: 'Empresa Alpha',
      document: '00.000.000/0001-91', // Valid CNPJ
      stateRegistration: '111.222.333.444',
      municipalRegistration: '555666-7',
      status: 'active',
      email: 'contato@alpha.com.br',
      phone: '(11) 3222-1111',
      whatsapp: '(11) 98888-7777',
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      complement: '10º Andar',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      logoDataUrl: 'data:image/png;base64,mockalpha',
      color: '#0F766E',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'comp-2',
      userId: 'user-1',
      legalName: 'Beta Tecnologia e Inovação SA',
      tradeName: 'Beta Tech',
      document: '33.000.167/0001-01', // Valid CNPJ
      stateRegistration: '',
      municipalRegistration: '',
      status: 'inactive',
      email: 'financeiro@betatech.com',
      phone: '(21) 2222-3333',
      whatsapp: '',
      cep: '20040-002',
      street: 'Av. Rio Branco',
      number: '156',
      complement: 'Sala 801',
      neighborhood: 'Centro',
      city: 'Rio de Janeiro',
      state: 'RJ',
      logoDataUrl: '',
      color: '#2563EB',
      isDefault: false,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Renders company list with badges and active/inactive/default status', () => {
    render(<CompaniesSettingsTab initialCompanies={mockCompanies} />);

    // Header count
    expect(screen.getByText(/Minhas Empresas \(2\)/i)).toBeInTheDocument();

    // Company names
    expect(screen.getByText('Empresa Alpha')).toBeInTheDocument();
    expect(screen.getByText('Alpha Comércio e Representações Ltda')).toBeInTheDocument();
    expect(screen.getByText('Beta Tech')).toBeInTheDocument();
    expect(screen.getByText('Beta Tecnologia e Inovação SA')).toBeInTheDocument();

    // Default badge
    expect(screen.getByTestId('badge-default')).toBeInTheDocument();
    expect(screen.getByTestId('badge-default')).toHaveTextContent('Padrão');

    // Active & Inactive Badges
    expect(screen.getByTestId('badge-status-active')).toBeInTheDocument();
    expect(screen.getByTestId('badge-status-inactive')).toBeInTheDocument();
    expect(screen.getByText('Ativa')).toBeInTheDocument();
    expect(screen.getByText('Inativa')).toBeInTheDocument();

    // CNPJ formatted
    expect(screen.getByText('00.000.000/0001-91')).toBeInTheDocument();
    expect(screen.getByText('33.000.167/0001-01')).toBeInTheDocument();

    // Logo image rendered for Alpha
    const logos = screen.getAllByTestId('company-card-logo');
    expect(logos.length).toBe(1);
    expect(logos[0]).toHaveAttribute('src', 'data:image/png;base64,mockalpha');
  });

  it('2. Mathematical CNPJ validation displays warning alert when CNPJ check digits are invalid', () => {
    render(<CompaniesSettingsTab initialCompanies={mockCompanies} />);

    // Open create drawer
    const newBtn = screen.getByRole('button', { name: /Nova Empresa/i });
    fireEvent.click(newBtn);

    expect(screen.getByText('Cadastrar Nova Empresa')).toBeInTheDocument();

    const cnpjInput = screen.getByPlaceholderText('00.000.000/0000-00');

    // Enter invalid CNPJ (wrong check digits)
    fireEvent.change(cnpjInput, { target: { value: '00000000000190' } });

    // Warning alert should appear
    expect(screen.getByTestId('cnpj-invalid-warning')).toBeInTheDocument();
    expect(screen.getByText(/Os dígitos verificadores do CNPJ são matematicamente inválidos/i)).toBeInTheDocument();
    expect(screen.getByTestId('cnpj-validation-status')).toHaveTextContent('✗ Dígitos Inválidos');

    // Enter valid CNPJ (00.000.000/0001-91)
    fireEvent.change(cnpjInput, { target: { value: '00000000000191' } });

    // Warning alert should disappear and valid badge appears
    expect(screen.queryByTestId('cnpj-invalid-warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('cnpj-validation-status')).toHaveTextContent('✓ CNPJ Válido');
  });

  it('3. Logo upload, base64 conversion and preview with replace and remove actions', () => {
    const mockDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const readAsDataURLSpy = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, 'result', {
        value: mockDataUrl,
        writable: true,
      });
      if (this.onload) {
        this.onload.call(this, {} as ProgressEvent<FileReader>);
      }
    });

    try {
      render(<CompaniesSettingsTab initialCompanies={mockCompanies} />);

      // Open drawer
      fireEvent.click(screen.getByRole('button', { name: /Nova Empresa/i }));

      // Initially no logo
      expect(screen.getByText('Sem logo')).toBeInTheDocument();

      // Find file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      const testFile = new File(['fake-png-content'], 'logo.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });

      // Preview should now appear with mockDataUrl
      const previewImg = screen.getByTestId('logo-preview-image');
      expect(previewImg).toBeInTheDocument();
      expect(previewImg).toHaveAttribute('src', mockDataUrl);

      // Buttons 'Trocar Logotipo' and 'Remover' should be visible
      expect(screen.getByText('Trocar Logotipo')).toBeInTheDocument();
      const removeBtn = screen.getByRole('button', { name: /Remover/i });
      expect(removeBtn).toBeInTheDocument();

      // Click remove
      fireEvent.click(removeBtn);

      // Preview removed and 'Sem logo' returns
      expect(screen.queryByTestId('logo-preview-image')).not.toBeInTheDocument();
      expect(screen.getByText('Sem logo')).toBeInTheDocument();
    } finally {
      readAsDataURLSpy.mockRestore();
    }
  });

  it('4. Allows editing an existing company and pre-populates drawer', () => {
    render(<CompaniesSettingsTab initialCompanies={mockCompanies} />);

    // Click Edit on Company Alpha
    const editBtns = screen.getAllByRole('button', { name: /Editar/i });
    fireEvent.click(editBtns[0]);

    expect(screen.getByText('Editar Empresa')).toBeInTheDocument();
    const legalNameInput = screen.getByDisplayValue('Alpha Comércio e Representações Ltda');
    expect(legalNameInput).toBeInTheDocument();
  });
});
