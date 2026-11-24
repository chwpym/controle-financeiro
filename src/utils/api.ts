import type {
  AdminLicensesResponse,
  AdminSummary,
  AdminUserRow,
  Category,
  Company,
  CompanyStatus,
  Contact,
  LicenseActivationResponse,
  LicenseStatusResponse,
  LocalBackupPayload,
  Transaction,
  UserProfile,
  UserRole,
  UserStatus,
} from '../types';
import { getSavedSession } from './offlineDb';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const session = getSavedSession();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'Erro inesperado no servidor.' };
  }

  if (!res.ok) {
    throw new ApiError(data?.error || `Erro HTTP ${res.status}`, res.status);
  }
  return data as T;
}

export const api = {
  // Auth (Username + Password only)
  login(username: string, password: string) {
    return request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  register(username: string, displayName: string, password: string) {
    return request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, displayName, password }),
    });
  },
  me() {
    return request<{ user: UserProfile }>('/api/auth/me');
  },
  changePassword(currentPassword: string, newPassword: string) {
    return request<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  // Workspace Data & Sync
  getSnapshot() {
    return request<{
      categories: Category[];
      contacts: Contact[];
      transactions: Transaction[];
      companies?: Company[];
      serverTime: string;
    }>('/api/data/snapshot');
  },
  upsertTransactionsBatch(items: Transaction[]) {
    return request<{ ok: boolean; count: number }>('/api/transactions/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },
  upsertTransaction(item: Transaction) {
    return request<{ ok: boolean }>(`/api/transactions/${item.id}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },
  deleteTransaction(id: string) {
    return request<{ ok: boolean }>(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
  },
  deleteTransactionsBatch(ids: string[]) {
    return request<{ ok: boolean; count: number }>('/api/transactions/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
  deleteTransactionGroup(groupId: string) {
    return request<{ ok: boolean }>(`/api/transactions/group/${groupId}`, {
      method: 'DELETE',
    });
  },
  upsertContact(contact: Contact) {
    return request<{ ok: boolean }>(`/api/contacts/${contact.id}`, {
      method: 'PUT',
      body: JSON.stringify(contact),
    });
  },
  deleteContact(id: string) {
    return request<{ ok: boolean }>(`/api/contacts/${id}`, {
      method: 'DELETE',
    });
  },
  upsertCategory(category: Category) {
    return request<{ ok: boolean }>(`/api/categories/${category.id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },
  deleteCategory(id: string) {
    return request<{ ok: boolean }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  },
  restoreBackup(payload: LocalBackupPayload) {
    return request<{ ok: boolean }>('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Multi-Company Management
  getCompanies() {
    return request<{ companies: Company[] }>('/api/companies');
  },
  createCompany(payload: Partial<Company>) {
    return request<{ company: Company }>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateCompany(id: string, payload: Partial<Company>) {
    return request<{ company: Company }>(`/api/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  updateCompanyStatus(id: string, status?: CompanyStatus) {
    return request<{ company: Company }>(`/api/companies/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  setCompanyDefault(id: string) {
    return request<{ company: Company }>(`/api/companies/${id}/default`, {
      method: 'PATCH',
    });
  },
  deleteCompany(id: string) {
    return request<{ ok: boolean }>(`/api/companies/${id}`, {
      method: 'DELETE',
    });
  },

  // CEP & CNPJ Lookup
  lookupCep(cep: string) {
    const clean = cep.replace(/\D/g, '');
    return request<{
      cep: string;
      street: string;
      complement: string;
      neighborhood: string;
      city: string;
      state: string;
    }>(`/api/lookup/cep/${clean}`);
  },
  lookupCnpj(cnpj: string) {
    const clean = cnpj.replace(/\D/g, '');
    return request<{
      cnpj: string;
      name: string;
      tradeName: string;
      email: string;
      phone: string;
      cep: string;
      street: string;
      number: string;
      complement: string;
      neighborhood: string;
      city: string;
      state: string;
      situacao: string;
    }>(`/api/lookup/cnpj/${clean}`);
  },

  // Master / Admin User Management
  getAdminUsers() {
    return request<{ users: AdminUserRow[]; summary: AdminSummary }>('/api/admin/users');
  },
  createAdminUser(payload: {
    username: string;
    displayName: string;
    password: string;
    role: UserRole;
    companyIds?: string[];
    defaultCompanyId?: string | null;
    canDelete?: boolean;
  }) {
    return request<{ user: UserProfile }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateAdminUser(
    id: string,
    payload: Partial<{
      username: string;
      displayName: string;
      role: UserRole;
      status: UserStatus;
      companyIds?: string[];
      defaultCompanyId?: string | null;
      canDelete?: boolean;
    }>
  ) {
    return request<{ user: UserProfile }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  resetUserPassword(id: string, newPassword: string) {
    return request<{ ok: boolean }>(`/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
  },
  deleteAdminUser(id: string) {
    return request<{ ok: boolean }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  // System Licensing & Release Management (Phase 10.2)
  // Gestão de Licenciamento, Ativação por Código e Renovação no Painel Master (Fase 10.2)
  /**
   * EN: Queries the license status of the user's active (or selected) company.
   * PT: Consulta o status da licença de uso da empresa ativa (ou selecionada) do usuário.
   */
  getLicenseStatus(companyId?: string | null): Promise<LicenseStatusResponse> {
    const query =
      companyId && companyId !== 'all' ? `?companyId=${encodeURIComponent(companyId)}` : '';
    return request<LicenseStatusResponse>(`/api/license/status${query}`);
  },
  /**
   * EN: Validates and activates a signed system release key for the given CNPJ.
   * PT: Valida e ativa um código criptográfico de liberação para o CNPJ informado.
   */
  activateLicense(
    cnpj: string,
    licenseKey: string,
    companyId?: string | null
  ): Promise<LicenseActivationResponse> {
    return request<LicenseActivationResponse>('/api/license/activate', {
      method: 'POST',
      body: JSON.stringify({ cnpj, licenseKey, companyId }),
    });
  },
  /**
   * EN: Lists all companies and their license status for Master/Admin management.
   * PT: Lista todas as empresas e seus respectivos status de licença para gestão Master/Admin.
   */
  getAdminLicenses(): Promise<AdminLicensesResponse> {
    return request<AdminLicensesResponse>('/api/admin/licenses');
  },
  /**
   * EN: Renews a company's license immediately by adding `days` (e.g. +30 days) with 1 click.
   * PT: Renova imediatamente a licença de uma empresa somando `days` (ex: +30 dias) com 1 clique.
   */
  renewAdminLicense(companyId: string, days: number): Promise<LicenseStatusResponse> {
    return request<LicenseStatusResponse>('/api/admin/licenses/renew', {
      method: 'POST',
      body: JSON.stringify({ companyId, days }),
    });
  },
  /**
   * EN: Generates a signed emergency release code for a company valid for `days` days.
   * PT: Gera um código assinado de liberação de emergência para envio manual ao cliente.
   */
  generateLicenseCode(
    companyId: string,
    days: number
  ): Promise<{ licenseKey: string; validUntil: string; cnpj?: string; companyName?: string }> {
    return request<{ licenseKey: string; validUntil: string; cnpj?: string; companyName?: string }>(
      '/api/admin/licenses/generate-code',
      {
        method: 'POST',
        body: JSON.stringify({ companyId, days }),
      }
    );
  },
};
