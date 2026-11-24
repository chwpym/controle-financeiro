export type UserRole = 'master' | 'admin' | 'user';
export type UserStatus = 'active' | 'suspended';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string | null;
  /** IDs das empresas liberadas para o usuário (Fase 9.3) */
  companyIds?: string[];
  /** Empresa padrão inicial do usuário (Fase 9.3) */
  defaultCompanyId?: string | null;
  /** Permissão de exclusão de lançamentos financeiros (Fase 9.3) */
  canDelete?: boolean;
}

export interface AdminUserRow extends UserProfile {
  transactionCount: number;
  contactCount: number;
  /** Nomes das empresas vinculadas para exibição rápida na tabela administrativa (Fase 9.3) */
  companyNames?: string[];
}

export interface AdminSummary {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  masterAndAdminCount: number;
  totalTransactions: number;
  totalPendingCents: number;
}

export type CategoryType = 'payable' | 'receivable' | 'both';

export type CompanyStatus = 'active' | 'inactive';

export interface Company {
  id: string;
  userId: string;
  legalName: string; // Razão Social
  tradeName: string; // Nome Fantasia
  document: string; // CNPJ formatado
  stateRegistration: string; // Inscrição Estadual
  municipalRegistration: string; // Inscrição Municipal
  status: CompanyStatus; // 'active' | 'inactive'
  email: string;
  phone: string;
  whatsapp: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  logoDataUrl: string; // Base64 da logo (PNG, JPG, WebP, SVG)
  color: string; // Cor da tag de identificação (ex: '#0F766E')
  isDefault: boolean; // Se é a empresa padrão principal
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export type PersonType = 'PF' | 'PJ';
export type ContactKind = 'supplier' | 'customer' | 'both';

export interface Contact {
  id: string;
  userId: string;
  personType: PersonType;
  kind: ContactKind;
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'payable' | 'receivable';
export type TransactionStatus = 'pending' | 'settled';
export type TransactionSource = 'manual' | 'xml' | 'excel';
export type RecurrenceInterval = 'monthly' | 'biweekly' | 'yearly';

export interface Transaction {
  id: string;
  userId: string;
  companyId?: string | null;
  type: TransactionType;
  description: string;
  amountCents: number;
  discountCents: number;
  interestCents: number;
  dueDate: string; // YYYY-MM-DD
  paidAt: string | null;
  status: TransactionStatus;
  paymentMethod: string;
  categoryId: string | null;
  contactId: string | null;
  documentNumber: string;
  issueDate: string | null; // YYYY-MM-DD
  installmentGroupId: string | null;
  installmentNumber: number;
  installmentTotal: number;
  isRecurring: boolean;
  recurrenceInterval: RecurrenceInterval | null;
  notes: string;
  source: TransactionSource;
  createdAt: string;
  updatedAt: string;
}

export interface LocalBackupPayload {
  version: number | string;
  app: 'FluxoClaro';
  exportedAt: string;
  username: string;
  categories: Category[];
  contacts: Contact[];
  transactions: Transaction[];
  companies?: Company[];
}

export type SyncMutationKind =
  | 'tx_batch_upsert'
  | 'tx_update'
  | 'tx_delete'
  | 'tx_batch_delete'
  | 'tx_group_delete'
  | 'contact_upsert'
  | 'contact_delete'
  | 'category_upsert'
  | 'category_delete'
  | 'backup_restore';

export interface SyncMutation {
  id: string;
  userId: string;
  kind: SyncMutationKind;
  payload: unknown;
  createdAt: string;
}

export type AppView =
  | 'dashboard'
  | 'transactions'
  | 'contacts'
  | 'analytics'
  | 'reports'
  | 'settings'
  | 'admin';

/**
 * EN: Response returned by `GET /api/license/status` and `POST /api/admin/licenses/renew` (Phase 10.2).
 * PT: Estrutura de resposta do status de licença (`GET /api/license/status` e `POST /api/admin/licenses/renew`).
 */
export interface LicenseStatusResponse {
  companyId?: string;
  companyName: string;
  legalName?: string;
  cnpj: string;
  isValid: boolean;
  isExpired: boolean;
  daysRemaining: number;
  validUntil: string;
  systemDate: string;
}

/**
 * EN: Response returned by `POST /api/license/activate`.
 * PT: Estrutura de resposta da ativação de código de liberação (`POST /api/license/activate`).
 */
export interface LicenseActivationResponse {
  ok: boolean;
  message: string;
  validUntil: string;
  daysRemaining: number;
}

/**
 * EN: Row representing a company's subscription/license in the Master/Admin panel (`GET /api/admin/licenses`).
 * PT: Linha de licença/assinatura de empresa exibida no Painel Master (`GET /api/admin/licenses`).
 */
export interface AdminLicenseRow {
  companyId: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  validUntil: string;
  daysRemaining: number;
  isValid: boolean;
  isExpired: boolean;
  licenseStatus: 'active' | 'expiring_soon' | 'expired';
  updatedAt: string;
}

/**
 * EN: Response returned by `GET /api/admin/licenses`.
 * PT: Resposta da listagem administrativa de licenças (`GET /api/admin/licenses`).
 */
export interface AdminLicensesResponse {
  licenses: AdminLicenseRow[];
  systemDate: string;
}
