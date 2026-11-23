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
}

export interface AdminUserRow extends UserProfile {
  transactionCount: number;
  contactCount: number;
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
