/// <reference types="@testing-library/jest-dom/vitest" />
/**
 * AdminView.test.tsx
 *
 * EN: Test suite for AdminView covering modal error rendering, per-company RBAC checkboxes,
 *     anti-fraud deletion lock toggles, and user permission cloning.
 * PT: Suíte de testes do AdminView cobrindo exibição de erros dentro dos modais, checkboxes
 *     de empresas por RBAC, trava anti-fraude de exclusão e clonagem rápida de permissões.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminView } from '../AdminView';
import type { AdminSummary, AdminUserRow, Company, UserProfile } from '../../types';
import { api, ApiError } from '../../utils/api';

vi.mock('../../utils/api', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  api: {
    getAdminUsers: vi.fn(),
    getCompanies: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
    resetUserPassword: vi.fn(),
    deleteAdminUser: vi.fn(),
  },
}));

describe('AdminView — Fase 9.3 (Permissões por Empresa, Trava de Exclusão e Modais)', () => {
  const mockMasterUser: UserProfile = {
    id: 'master-1',
    username: 'master',
    displayName: 'Administrador Master',
    role: 'master',
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    lastLoginAt: null,
    canDelete: true,
  };

  const mockUsers: AdminUserRow[] = [
    {
      id: 'master-1',
      username: 'master',
      displayName: 'Administrador Master',
      role: 'master',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      lastLoginAt: null,
      transactionCount: 12,
      contactCount: 6,
      canDelete: true,
      defaultCompanyId: 'comp-1',
      companyIds: ['comp-1', 'comp-2'],
      companyNames: ['Alpha Matriz', 'Beta Filial'],
    },
    {
      id: 'user-op',
      username: 'joao.operador',
      displayName: 'João Operador',
      role: 'user',
      status: 'active',
      createdAt: '2026-01-05T00:00:00Z',
      lastLoginAt: null,
      transactionCount: 3,
      contactCount: 1,
      canDelete: false, // Sem exclusão
      defaultCompanyId: 'comp-2',
      companyIds: ['comp-2'], // Apenas Beta Filial
      companyNames: ['Beta Filial'],
    },
  ];

  const mockSummary: AdminSummary = {
    totalUsers: 2,
    activeUsers: 2,
    suspendedUsers: 0,
    masterAndAdminCount: 1,
    totalTransactions: 15,
    totalPendingCents: 500000,
  };

  const mockCompanies: Company[] = [
    {
      id: 'comp-1',
      userId: 'master-1',
      legalName: 'Alpha Comércio e Logística Ltda',
      tradeName: 'Alpha Matriz',
      document: '00.000.000/0001-91',
      stateRegistration: '111.222.333.444',
      municipalRegistration: '555666-7',
      status: 'active',
      email: 'contato@alpha.com.br',
      phone: '(11) 3222-1111',
      whatsapp: '(11) 98888-7777',
      cep: '01310-100',
      street: 'Av. Paulista',
      number: '1000',
      complement: '',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      logoDataUrl: '',
      color: '#0F766E',
      isDefault: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'comp-2',
      userId: 'master-1',
      legalName: 'Beta Tecnologia e Serviços Ltda',
      tradeName: 'Beta Filial',
      document: '11.222.333/0001-81',
      stateRegistration: '999.888.777.666',
      municipalRegistration: '111222-3',
      status: 'active',
      email: 'contato@beta.com.br',
      phone: '(11) 3333-2222',
      whatsapp: '(11) 97777-6666',
      cep: '04538-132',
      street: 'Rua Funchal',
      number: '200',
      complement: '',
      neighborhood: 'Vila Olímpia',
      city: 'São Paulo',
      state: 'SP',
      logoDataUrl: '',
      color: '#D97706',
      isDefault: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const onNotifyMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (api.getAdminUsers as any).mockResolvedValue({
      users: mockUsers,
      summary: mockSummary,
    });
    (api.getCompanies as any).mockResolvedValue({
      companies: mockCompanies,
    });
  });

  /**
   * Teste 1: Renderização de erro de validação (ex: login inválido) diretamente dentro do modal de criação
   * EN: Tests that validation errors are displayed directly inside the create user modal.
   * PT: Testa se erros de validação aparecem visíveis diretamente no corpo do modal de criação.
   */
  it('1. Deve exibir mensagem de erro de validação diretamente DENTRO do modal de criação', async () => {
    render(<AdminView currentUser={mockMasterUser} onNotify={onNotifyMock} />);

    await waitFor(() => {
      expect(screen.getByText('Administrador Master')).toBeInTheDocument();
    });

    // Abrir modal de criação
    const novoBtn = screen.getByRole('button', { name: /novo usuário/i });
    fireEvent.click(novoBtn);

    expect(screen.getByRole('heading', { name: /criar novo usuário/i })).toBeInTheDocument();

    // Digitar login inválido com espaços
    const usernameInput = screen.getByPlaceholderText(/ex: operador\.caixa/i);
    fireEvent.change(usernameInput, { target: { value: 'login invalido com espaco' } });

    // Submeter formulário
    const submitBtn = screen.getByRole('button', { name: /^criar usuário$/i });
    fireEvent.click(submitBtn);

    // O erro deve ser renderizado diretamente dentro do modal
    await waitFor(() => {
      const errorBanner = screen.getByText(/nome de usuário inválido \(3 a 32 caracteres sem espaços\)/i);
      expect(errorBanner).toBeInTheDocument();
    });

    // API não deve ter sido chamada devido à validação
    expect(api.createAdminUser).not.toHaveBeenCalled();
  });

  /**
   * Teste 2: Renderização dos checkboxes de empresas e do toggle de permissão canDelete
   * EN: Tests rendering of per-company checkboxes and the canDelete anti-fraud toggle.
   * PT: Testa renderização das caixas de seleção de empresas e da trava anti-fraude canDelete.
   */
  it('2. Deve renderizar os checkboxes de empresas ativas e a trava de segurança anti-fraude canDelete', async () => {
    render(<AdminView currentUser={mockMasterUser} onNotify={onNotifyMock} />);

    await waitFor(() => {
      expect(screen.getByText('Administrador Master')).toBeInTheDocument();
    });

    // Abrir modal de criação
    fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }));

    // Verificar se as empresas cadastradas aparecem com checkboxes
    expect(screen.getByText('Empresas Liberadas')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /alpha matriz/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /beta filial/i })).toBeInTheDocument();

    // Verificar trava de segurança anti-fraude com seu texto explicativo
    expect(screen.getByText('Pode excluir lançamentos financeiros')).toBeInTheDocument();
    expect(
      screen.getByText(/permite apagar contas a pagar\/receber e exclusões em lote/i)
    ).toBeInTheDocument();
  });

  /**
   * Teste 3: Funcionamento do botão [ 📋 Copiar de Outro Usuário ]
   * EN: Tests cloning companies, default company, and canDelete permission from an existing user.
   * PT: Testa clonagem das empresas, empresa padrão e permissão canDelete de um usuário pré-existente.
   */
  it('3. Deve clonar empresas e permissão de exclusão ao clicar no botão [ 📋 Copiar de Outro Usuário ]', async () => {
    render(<AdminView currentUser={mockMasterUser} onNotify={onNotifyMock} />);

    await waitFor(() => {
      expect(screen.getByText('João Operador')).toBeInTheDocument();
    });

    // Abrir modal de criação
    fireEvent.click(screen.getByRole('button', { name: /novo usuário/i }));

    // Clicar no botão de cópia rápida
    const copyBtn = screen.getByRole('button', { name: /copiar de outro usuário/i });
    fireEvent.click(copyBtn);

    // Selecionar João Operador (que só possui acesso à 'Beta Filial' e canDelete = false)
    const targetUserOption = screen.getByText(/João Operador \(@joao\.operador\)/i);
    fireEvent.click(targetUserOption);

    // Notificação de sucesso de cópia
    expect(onNotifyMock).toHaveBeenCalledWith('Permissões copiadas de @joao.operador.');

    // Verificar checkbox de exclusão: João não pode excluir, então deve estar desmarcado
    const canDeleteCheckbox = screen.getByRole('checkbox', {
      name: /pode excluir lançamentos financeiros/i,
    });
    expect(canDeleteCheckbox).not.toBeChecked();

    // Verificar checkboxes de empresa: Beta Filial marcada, Alpha Matriz desmarcada
    const betaCheckbox = screen.getByRole('checkbox', { name: /beta filial/i });
    const alphaCheckbox = screen.getByRole('checkbox', { name: /alpha matriz/i });
    expect(betaCheckbox).toBeChecked();
    expect(alphaCheckbox).not.toBeChecked();
  });

  /**
   * Teste 4: Renderização do erro de senha curta diretamente dentro do modal de redefinição de senha
   * EN: Tests short password validation error displayed directly inside the password reset modal.
   * PT: Testa exibição de erro de senha curta diretamente dentro do modal de redefinição de senha.
   */
  it('4. Deve exibir erro de senha curta diretamente DENTRO do modal de redefinição de senha', async () => {
    render(<AdminView currentUser={mockMasterUser} onNotify={onNotifyMock} />);

    await waitFor(() => {
      expect(screen.getByText('João Operador')).toBeInTheDocument();
    });

    // Clicar no botão 'Senha' do João Operador
    const senhaBtns = screen.getAllByRole('button', { name: /senha/i });
    fireEvent.click(senhaBtns[0]); // Abre modal de redefinição

    expect(screen.getByRole('heading', { name: /redefinir senha/i })).toBeInTheDocument();

    // Digitar senha com menos de 4 caracteres
    const passwordInput = screen.getByPlaceholderText(/mínimo 4 caracteres/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    // Clicar em 'Definir nova senha'
    const submitBtn = screen.getByRole('button', { name: /definir nova senha/i });
    fireEvent.click(submitBtn);

    // O erro deve ser renderizado diretamente dentro do modal
    await waitFor(() => {
      expect(
        screen.getByText(/a nova senha deve ter pelo menos 4 caracteres/i)
      ).toBeInTheDocument();
    });

    // API não deve ser chamada
    expect(api.resetUserPassword).not.toHaveBeenCalled();
  });
});
