/// <reference types="@testing-library/jest-dom/vitest" />
/**
 * src/components/__tests__/SystemReleaseModal.test.tsx
 *
 * EN: Automated tests for Phase 10.2 System Release Modal and Master 1-click License Renewal:
 *     1. Renders System Date, active CNPJ, and formatted Release Code input.
 *     2. Displays inline error alert inside the modal when submitting an invalid code.
 *     3. Activates the system successfully when submitting a valid signed code.
 *     4. Hides the [X] close button when the license is under total expiration lockout (`daysRemaining < 0`).
 *     5. Performs 1-click `+30 Dias` quick renewal in the Master AdminView ("Licenças & Assinaturas" tab).
 *
 * PT: Suíte de testes automatizados da Tela de Liberação do Sistema e Gestão Master (Fase 10.2):
 *     1. Renderização da Data do Sistema, CNPJ ativo e campo formatado de Código de Liberação.
 *     2. Exibição de mensagem de erro diretamente dentro do modal ao submeter código inválido.
 *     3. Liberação com sucesso ao submeter código válido.
 *     4. Ocultação do botão [X] quando o sistema está sob bloqueio de expiração (`daysRemaining < 0`).
 *     5. Renovação rápida com 1 clique (`+30 Dias`) pelo Usuário Master na aba "Licenças & Assinaturas".
 */

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SystemReleaseModal } from '../SystemReleaseModal';
import { AdminView } from '../AdminView';
import type {
  AdminLicenseRow,
  AdminSummary,
  Company,
  LicenseStatusResponse,
  UserProfile,
} from '../../types';
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
    activateLicense: vi.fn(),
    getAdminUsers: vi.fn(),
    getCompanies: vi.fn(),
    getAdminLicenses: vi.fn(),
    renewAdminLicense: vi.fn(),
    generateLicenseCode: vi.fn(),
  },
}));

const mockCompany: Company = {
  id: 'comp-main',
  userId: 'master-1',
  legalName: 'FluxoClaro Tecnologia Financeira Ltda',
  tradeName: 'FluxoClaro Matriz (Demo Full)',
  document: 'FC.202.6BR/0001-64',
  stateRegistration: 'ISENTO',
  municipalRegistration: '102030-4',
  status: 'active',
  email: 'financeiro@fluxoclaro.exemplo.br',
  phone: '(11) 4000-1020',
  whatsapp: '',
  cep: '01310-100',
  street: 'Av. Paulista',
  number: '1578',
  complement: '',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  logoDataUrl: '',
  color: '#0F766E',
  isDefault: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockValidLicenseStatus: LicenseStatusResponse = {
  companyId: 'comp-main',
  companyName: 'FluxoClaro Matriz (Demo Full)',
  cnpj: 'FC.202.6BR/0001-64',
  isValid: true,
  isExpired: false,
  daysRemaining: 4,
  validUntil: '2026-11-28',
  systemDate: '2026-11-24',
};

describe('SystemReleaseModal & Gestão Master de Licenças (Fase 10.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza a tela de Liberação do Sistema com Data do Sistema formatada, CNPJ ativo e máscara do código', () => {
    render(
      <SystemReleaseModal
        isOpen={true}
        onClose={vi.fn()}
        licenseStatus={mockValidLicenseStatus}
        companies={[mockCompany]}
        selectedCompanyId="comp-main"
        onActivated={vi.fn()}
      />
    );

    expect(
      screen.getByRole('heading', { name: /Liberação do Sistema/i })
    ).toBeInTheDocument();

    const sysDateInput = screen.getByTestId('system-date-input') as HTMLInputElement;
    expect(sysDateInput.value).toBe('24/11/2026');
    expect(sysDateInput).toBeDisabled();

    const cnpjInput = screen.getByTestId('release-cnpj-input') as HTMLInputElement;
    expect(cnpjInput.value).toBe('FC.202.6BR/0001-64');

    // Testa máscara automática em maiúsculas no campo de código
    const codeInput = screen.getByTestId('release-code-input') as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: 'a1b2c3d4e5f6g7h8' } });
    expect(codeInput.value).toBe('A1B2-C3D4-E5F6-G7H8');

    // Quando não está expirado, o botão [X] deve estar presente
    expect(screen.getByTestId('release-modal-close-x')).toBeInTheDocument();
  });

  it('oculta o botão [X] quando o sistema está sob bloqueio total por licença expirada', () => {
    const expiredStatus: LicenseStatusResponse = {
      ...mockValidLicenseStatus,
      isValid: false,
      isExpired: true,
      daysRemaining: -2,
      validUntil: '2026-11-22',
    };

    render(
      <SystemReleaseModal
        isOpen={true}
        onClose={vi.fn()}
        licenseStatus={expiredStatus}
        companies={[mockCompany]}
        selectedCompanyId="comp-main"
        onActivated={vi.fn()}
      />
    );

    expect(screen.queryByTestId('release-modal-close-x')).not.toBeInTheDocument();
    expect(screen.getByTestId('expired-lockout-banner')).toHaveTextContent(/Licença de uso expirada/i);
  });

  it('exibe mensagem de erro diretamente dentro do modal ao submeter código inválido', async () => {
    (api.activateLicense as any).mockRejectedValueOnce(
      new ApiError(
        'Código de liberação inválido ou incompatível com o CNPJ informado.',
        400
      )
    );

    render(
      <SystemReleaseModal
        isOpen={true}
        onClose={vi.fn()}
        licenseStatus={mockValidLicenseStatus}
        companies={[mockCompany]}
        selectedCompanyId="comp-main"
        onActivated={vi.fn()}
      />
    );

    const codeInput = screen.getByTestId('release-code-input');
    fireEvent.change(codeInput, { target: { value: '0000111122223333' } });

    fireEvent.click(screen.getByTestId('release-confirm-button'));

    const errorBanner = await screen.findByTestId('release-modal-error');
    expect(errorBanner).toHaveTextContent(
      'Código de liberação inválido ou incompatível com o CNPJ informado.'
    );
  });

  it('realiza a liberação com sucesso ao submeter um código válido e notifica o callback onActivated', async () => {
    (api.activateLicense as any).mockResolvedValueOnce({
      ok: true,
      message: 'Sistema liberado com sucesso!',
      validUntil: '2026-12-28',
      daysRemaining: 34,
    });

    const onActivatedMock = vi.fn();

    render(
      <SystemReleaseModal
        isOpen={true}
        onClose={vi.fn()}
        licenseStatus={mockValidLicenseStatus}
        companies={[mockCompany]}
        selectedCompanyId="comp-main"
        onActivated={onActivatedMock}
      />
    );

    const codeInput = screen.getByTestId('release-code-input');
    fireEvent.change(codeInput, { target: { value: '02HC-A9B8-C7D6-E5F4' } });

    fireEvent.click(screen.getByTestId('release-confirm-button'));

    await waitFor(() => {
      expect(api.activateLicense).toHaveBeenCalledWith(
        'FC.202.6BR/0001-64',
        '02HC-A9B8-C7D6-E5F4',
        'comp-main'
      );
    });

    expect(await screen.findByTestId('release-modal-success')).toHaveTextContent(
      /Sistema liberado com sucesso!/i
    );
    expect(onActivatedMock).toHaveBeenCalledWith('2026-12-28', 34);
  });

  it('executa a ação rápida de renovação [+30 Dias] com 1 clique pelo Usuário Master na aba Licenças & Assinaturas', async () => {
    const masterUser: UserProfile = {
      id: 'master-1',
      username: 'master',
      displayName: 'Administrador Master',
      role: 'master',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      lastLoginAt: null,
      canDelete: true,
    };

    const summary: AdminSummary = {
      totalUsers: 1,
      activeUsers: 1,
      suspendedUsers: 0,
      masterAndAdminCount: 1,
      totalTransactions: 10,
      totalPendingCents: 100000,
    };

    const initialRow: AdminLicenseRow = {
      companyId: 'comp-main',
      legalName: 'FluxoClaro Tecnologia Financeira Ltda',
      tradeName: 'FluxoClaro Matriz (Demo Full)',
      cnpj: 'FC.202.6BR/0001-64',
      validUntil: '2026-11-26',
      daysRemaining: 2,
      isValid: true,
      isExpired: false,
      licenseStatus: 'expiring_soon',
      updatedAt: '2026-11-24T10:00:00Z',
    };

    const renewedRow: AdminLicenseRow = {
      ...initialRow,
      validUntil: '2026-12-26',
      daysRemaining: 32,
      licenseStatus: 'active',
    };

    (api.getAdminUsers as any).mockResolvedValue({ users: [], summary });
    (api.getCompanies as any).mockResolvedValue({ companies: [mockCompany] });
    (api.getAdminLicenses as any)
      .mockResolvedValueOnce({ licenses: [initialRow], systemDate: '2026-11-24' })
      .mockResolvedValueOnce({ licenses: [renewedRow], systemDate: '2026-11-24' });

    (api.renewAdminLicense as any).mockResolvedValueOnce({
      companyId: 'comp-main',
      companyName: 'FluxoClaro Matriz (Demo Full)',
      cnpj: 'FC.202.6BR/0001-64',
      isValid: true,
      isExpired: false,
      daysRemaining: 32,
      validUntil: '2026-12-26',
      systemDate: '2026-11-24',
    });

    const onNotifyMock = vi.fn();
    const onLicenseChangedMock = vi.fn();

    render(
      <AdminView
        currentUser={masterUser}
        onNotify={onNotifyMock}
        onLicenseChanged={onLicenseChangedMock}
      />
    );

    // Navega para a aba "Licenças & Assinaturas"
    const licensesTabBtn = await screen.findByTestId('admin-tab-licenses');
    fireEvent.click(licensesTabBtn);

    // Verifica linha inicial com status "A Vencer"
    const renewBtn = await screen.findByTestId('renew-30d-comp-main');
    expect(screen.getByText(/A Vencer/i)).toBeInTheDocument();

    // Clica em [+30 Dias]
    fireEvent.click(renewBtn);

    await waitFor(() => {
      expect(api.renewAdminLicense).toHaveBeenCalledWith('comp-main', 30);
    });

    expect(onNotifyMock).toHaveBeenCalledWith(
      expect.stringContaining('renovada (+30 dias · até 26/12/2026)')
    );
    expect(onLicenseChangedMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Ativa \(32d\)/i)).toBeInTheDocument();
  });
});
