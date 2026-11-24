import crypto from 'node:crypto';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DATA_DIR } from './config';
import { hashPassword } from './crypto';
import {
  addDaysToISODate,
  calculateDaysRemaining,
  generateLicenseCode,
  getSystemDateISO,
  normalizeLicenseCnpj,
} from './licenseEngine';

export { DATA_DIR } from './config';

const DB_PATH = path.join(DATA_DIR, 'fluxoclaro.db');
export const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'both',
    color TEXT NOT NULL DEFAULT '#0F766E',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    person_type TEXT NOT NULL DEFAULT 'PF',
    kind TEXT NOT NULL DEFAULT 'both',
    name TEXT NOT NULL,
    trade_name TEXT NOT NULL DEFAULT '',
    document TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    cep TEXT NOT NULL DEFAULT '',
    street TEXT NOT NULL DEFAULT '',
    number TEXT NOT NULL DEFAULT '',
    complement TEXT NOT NULL DEFAULT '',
    neighborhood TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    interest_cents INTEGER NOT NULL DEFAULT 0,
    due_date TEXT NOT NULL,
    paid_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL DEFAULT '',
    category_id TEXT,
    contact_id TEXT,
    company_id TEXT,
    document_number TEXT NOT NULL DEFAULT '',
    issue_date TEXT,
    installment_group_id TEXT,
    installment_number INTEGER NOT NULL DEFAULT 1,
    installment_total INTEGER NOT NULL DEFAULT 1,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_interval TEXT,
    notes TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    legal_name TEXT NOT NULL,
    trade_name TEXT NOT NULL DEFAULT '',
    document TEXT NOT NULL DEFAULT '',
    state_registration TEXT NOT NULL DEFAULT '',
    municipal_registration TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    cep TEXT NOT NULL DEFAULT '',
    street TEXT NOT NULL DEFAULT '',
    number TEXT NOT NULL DEFAULT '',
    complement TEXT NOT NULL DEFAULT '',
    neighborhood TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    logo_data_url TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT '#0F766E',
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tx_user_due ON transactions(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_tx_group ON transactions(user_id, installment_group_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
  CREATE INDEX IF NOT EXISTS idx_companies_user ON companies(user_id);
`);

// Safe migrations for existing SQLite databases
const txColumns = db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[];
if (!txColumns.some((col) => col.name === 'payment_method')) {
  db.exec("ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT ''");
}
if (!txColumns.some((col) => col.name === 'discount_cents')) {
  db.exec('ALTER TABLE transactions ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0');
}
if (!txColumns.some((col) => col.name === 'interest_cents')) {
  db.exec('ALTER TABLE transactions ADD COLUMN interest_cents INTEGER NOT NULL DEFAULT 0');
}
if (!txColumns.some((col) => col.name === 'is_recurring')) {
  db.exec('ALTER TABLE transactions ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0');
}
if (!txColumns.some((col) => col.name === 'recurrence_interval')) {
  db.exec('ALTER TABLE transactions ADD COLUMN recurrence_interval TEXT');
}
if (!txColumns.some((col) => col.name === 'issue_date')) {
  db.exec('ALTER TABLE transactions ADD COLUMN issue_date TEXT');
}
if (!txColumns.some((col) => col.name === 'company_id')) {
  db.exec('ALTER TABLE transactions ADD COLUMN company_id TEXT');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_tx_company ON transactions(user_id, company_id)');

/**
 * Phase 9.3 — Per-company user access (RBAC) table.
 * Fase 9.3 — Tabela de vínculo Usuário ↔ Empresa (controle de acesso por CNPJ).
 *
 * EN: Each row grants a user (role 'user') access to one company. The composite primary key
 *     prevents duplicate grants, and ON DELETE CASCADE removes links automatically when either
 *     the user or the company is deleted.
 * PT: Cada linha libera o acesso de um usuário operacional a uma empresa. A chave primária
 *     composta (user_id, company_id) impede vínculos duplicados, e o ON DELETE CASCADE apaga
 *     os vínculos automaticamente quando o usuário ou a empresa forem excluídos.
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS user_company_access (
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, company_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_uca_user ON user_company_access(user_id);
  CREATE INDEX IF NOT EXISTS idx_uca_company ON user_company_access(company_id);

  -- Phase 10.2 — System Licensing table per company/CNPJ
  -- Fase 10.2 — Tabela de licenciamento do sistema vinculada por empresa/CNPJ
  CREATE TABLE IF NOT EXISTS system_licenses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    cnpj TEXT NOT NULL,
    license_key TEXT NOT NULL,
    valid_until TEXT NOT NULL, -- Formato ISO YYYY-MM-DD
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_lic_company ON system_licenses(company_id);
  CREATE INDEX IF NOT EXISTS idx_lic_cnpj ON system_licenses(cnpj);
`);

/**
 * EN: Idempotent column migrations for the `users` table. Each ALTER runs inside its own
 *     try/catch, so restarting the server on an already-migrated database never crashes.
 * PT: Migrações idempotentes das colunas da tabela `users`. Cada ALTER roda em seu próprio
 *     try/catch: reiniciar o servidor com o banco já migrado nunca derruba a aplicação.
 *   - default_company_id: empresa principal (inicial) do usuário / user's main company.
 *   - can_delete: 1 = pode excluir lançamentos, 0 = bloqueado (trava anti-fraude).
 *     DEFAULT 1 mantém o comportamento atual para usuários que já existiam.
 */
const userColumns = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
if (!userColumns.some((col) => col.name === 'default_company_id')) {
  try {
    db.exec('ALTER TABLE users ADD COLUMN default_company_id TEXT');
  } catch {
    // EN: Column already exists (race/duplicate run) — safe to ignore.
    // PT: A coluna já existe (execução duplicada) — pode ser ignorado com segurança.
  }
}
if (!userColumns.some((col) => col.name === 'can_delete')) {
  try {
    db.exec('ALTER TABLE users ADD COLUMN can_delete INTEGER NOT NULL DEFAULT 1');
  } catch {
    // EN: Column already exists — safe to ignore. / PT: Coluna já existe — ignorar.
  }
}

/**
 * EN: Fictional RFB Alphanumeric CNPJ (IN RFB nº 2.229/2024) with valid Modulo-11 check digits (64)
 *     used for the default demonstration/test company with FULL license.
 * PT: CNPJ fictício no novo padrão Alfanumérico da Receita Federal (IN RFB nº 2.229/2024) com
 *     dígitos verificadores Módulo-11 válidos (64), utilizado na empresa de demonstração com Licença FULL.
 */
export const DEMO_ALPHANUMERIC_CNPJ = 'FC.202.6BR/0001-64';
export const FULL_LICENSE_DAYS = 3650; // 10 anos (Licença FULL para testes e operação contínua)

export function seedDefaultCompanyForUser(userId: string): string {
  const existing = db.prepare('SELECT id FROM companies WHERE user_id = ? LIMIT 1').get(userId) as { id: string } | undefined;
  if (existing) return existing.id;

  const now = new Date().toISOString();
  const companyId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO companies (
      id, user_id, legal_name, trade_name, document, state_registration,
      municipal_registration, status, email, phone, whatsapp, cep, street,
      number, complement, neighborhood, city, state, logo_data_url, color,
      is_default, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', '#0F766E', 1, ?, ?
    )
  `).run(
    companyId,
    userId,
    'FluxoClaro Tecnologia Financeira Ltda',
    'FluxoClaro Matriz (Demo Full)',
    DEMO_ALPHANUMERIC_CNPJ,
    'ISENTO',
    '102030-4',
    'financeiro@fluxoclaro.exemplo.br',
    '(11) 4000-1020',
    '(11) 99000-1020',
    '01310-100',
    'Av. Paulista',
    '1578',
    'Andar 12',
    'Bela Vista',
    'São Paulo',
    'SP',
    now,
    now
  );
  // EN: Automatically provision a FULL active license (3,650 days / 10 years) for the demo company.
  // PT: Provisiona automaticamente uma Licença FULL ativa (3.650 dias / 10 anos) para a empresa de teste.
  ensureLicenseForCompany(companyId, FULL_LICENSE_DAYS);
  return companyId;
}

/**
 * EN: Structure representing a persisted company license row in SQLite.
 * PT: Interface representando o registro persistido na tabela `system_licenses` do SQLite.
 */
export interface DbSystemLicense {
  id: string;
  company_id: string;
  cnpj: string;
  license_key: string;
  valid_until: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * EN: Ensures a company has a license record in `system_licenses`; creates one valid for `initialDays` if missing.
 * PT: Garante que uma empresa possua licença registrada em `system_licenses`; cria uma válida por `initialDays` caso não exista.
 */
export function ensureLicenseForCompany(companyId: string, initialDays = 365): DbSystemLicense | null {
  const company = db
    .prepare('SELECT id, document FROM companies WHERE id = ?')
    .get(companyId) as { id: string; document: string } | undefined;
  if (!company) return null;

  const existing = db
    .prepare('SELECT * FROM system_licenses WHERE company_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(companyId) as DbSystemLicense | undefined;
  if (existing) return existing;

  const today = getSystemDateISO();
  const validUntil = addDaysToISODate(today, initialDays);
  const cleanCnpj = normalizeLicenseCnpj(company.document);
  const licenseKey = generateLicenseCode(cleanCnpj, validUntil);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO system_licenses (
      id, company_id, cnpj, license_key, valid_until, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(id, company.id, cleanCnpj, licenseKey, validUntil, now, now);

  return db.prepare('SELECT * FROM system_licenses WHERE id = ?').get(id) as DbSystemLicense;
}

/**
 * EN: Renews a company's license by adding `daysToAdd` days.
 *     - If no license exists yet, creates a new one starting from today.
 *     - If the current license is already expired (`daysRemaining < 0`), adds `daysToAdd` starting from today.
 *     - If the current license is still valid (`daysRemaining >= 0`), extends from its current future `valid_until`.
 *     Ready both for 1-click Master renewals and future payment Webhooks (Pix/Boleto/Asaas/Mercado Pago).
 * PT: Renova a licença de uso de uma empresa somando `daysToAdd` dias:
 *     - Se ainda não existir licença, cria uma nova a partir da data atual.
 *     - Se a licença atual estiver vencida (`daysRemaining < 0`), soma `daysToAdd` a partir de hoje.
 *     - Se a licença atual ainda estiver vigente (`daysRemaining >= 0`), soma sobre a data futura `valid_until`.
 *     Pronta tanto para o clique rápido do Usuário Master quanto para futuros Webhooks de pagamento (Pix/Boleto).
 */
export function renewCompanyLicense(companyId: string, daysToAdd: number): DbSystemLicense {
  const company = db
    .prepare('SELECT id, document FROM companies WHERE id = ?')
    .get(companyId) as { id: string; document: string } | undefined;

  if (!company) {
    throw new Error('Empresa não encontrada para renovação de licença.');
  }

  const safeDays = Math.max(1, Math.trunc(Number(daysToAdd) || 30));
  const today = getSystemDateISO();
  const cleanCnpj = normalizeLicenseCnpj(company.document);
  const now = new Date().toISOString();

  const current = db
    .prepare('SELECT * FROM system_licenses WHERE company_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(companyId) as DbSystemLicense | undefined;

  if (!current) {
    const validUntil = addDaysToISODate(today, safeDays);
    const licenseKey = generateLicenseCode(cleanCnpj, validUntil);
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO system_licenses (
        id, company_id, cnpj, license_key, valid_until, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, companyId, cleanCnpj, licenseKey, validUntil, now, now);
    return db.prepare('SELECT * FROM system_licenses WHERE id = ?').get(id) as DbSystemLicense;
  }

  const currentRemaining = calculateDaysRemaining(current.valid_until, today);
  const baseDate = currentRemaining >= 0 ? current.valid_until : today;
  const nextValidUntil = addDaysToISODate(baseDate, safeDays);
  const nextLicenseKey = generateLicenseCode(cleanCnpj, nextValidUntil);

  db.prepare(`
    UPDATE system_licenses
    SET cnpj = ?, license_key = ?, valid_until = ?, is_active = 1, updated_at = ?
    WHERE id = ?
  `).run(cleanCnpj, nextLicenseKey, nextValidUntil, now, current.id);

  return db.prepare('SELECT * FROM system_licenses WHERE id = ?').get(current.id) as DbSystemLicense;
}

/**
 * EN: Automatically seeds an active FULL license for every registered company that does not yet
 *     have an entry in `system_licenses`, and ensures the Master demo company uses the fictional
 *     RFB alphanumeric CNPJ (`FC.202.6BR/0001-64`) with a 10-year FULL license for testing.
 * PT: Semeia automaticamente uma licença ativa para cada empresa sem registro em `system_licenses`,
 *     e garante que a empresa padrão de teste possua o CNPJ fictício alfanumérico (`FC.202.6BR/0001-64`)
 *     com Licença FULL (10 anos / 3.650 dias) pronta para testes imediatos.
 */
export function seedDefaultLicenses(): void {
  // EN: Upgrade any blank-CNPJ default placeholder or legacy company to the fictional alphanumeric CNPJ + FULL license.
  // PT: Atualiza eventual empresa padrão sem CNPJ (ou com placeholder antigo) para o CNPJ fictício alfanumérico + Licença FULL.
  const blankDefaultCompanies = db.prepare(`
    SELECT id FROM companies
    WHERE document = '' OR legal_name = 'Minha Empresa Principal Ltda'
  `).all() as { id: string }[];

  const now = new Date().toISOString();
  for (const comp of blankDefaultCompanies) {
    db.prepare(`
      UPDATE companies
      SET legal_name = ?, trade_name = ?, document = ?, updated_at = ?
      WHERE id = ?
    `).run(
      'FluxoClaro Tecnologia Financeira Ltda',
      'FluxoClaro Matriz (Demo Full)',
      DEMO_ALPHANUMERIC_CNPJ,
      now,
      comp.id
    );
    db.prepare('DELETE FROM system_licenses WHERE company_id = ?').run(comp.id);
    ensureLicenseForCompany(comp.id, FULL_LICENSE_DAYS);
  }

  const companiesWithoutLicense = db.prepare(`
    SELECT c.id
    FROM companies c
    WHERE NOT EXISTS (
      SELECT 1 FROM system_licenses sl WHERE sl.company_id = c.id
    )
  `).all() as { id: string }[];

  for (const comp of companiesWithoutLicense) {
    ensureLicenseForCompany(comp.id, FULL_LICENSE_DAYS);
  }
}

export function seedDefaultCategoriesForUser(userId: string): Record<string, string> {
  const now = new Date().toISOString();
  const defaults = [
    { name: 'Fornecedores', type: 'payable', color: '#0F766E' },
    { name: 'Aluguel e Condomínio', type: 'payable', color: '#D97706' },
    { name: 'Impostos e Taxas', type: 'payable', color: '#DC2626' },
    { name: 'Energia e Internet', type: 'payable', color: '#2563EB' },
    { name: 'Serviços Prestados', type: 'receivable', color: '#16A34A' },
    { name: 'Vendas de Produtos', type: 'receivable', color: '#0D9488' },
  ];
  const insert = db.prepare(`
    INSERT INTO categories (id, user_id, name, type, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const catIds: Record<string, string> = {};
  for (const c of defaults) {
    const id = crypto.randomUUID();
    catIds[c.name] = id;
    insert.run(id, userId, c.name, c.type, c.color, now, now);
  }
  return catIds;
}

export function ensureMasterSeed(): void {
  const countRow = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
  if (countRow.total > 0) return;

  const now = new Date().toISOString();
  const masterId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, role, status, last_login_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'master', 'active', NULL, ?, ?)
  `).run(masterId, 'master', 'Administrador Master', hashPassword('master123'), now, now);

  const catIds = seedDefaultCategoriesForUser(masterId);
  const defaultCompanyId = seedDefaultCompanyForUser(masterId);

  // Seed clean initial contacts and sample monthly entries for immediate dashboard visualization
  // Semeia contatos iniciais e lançamentos de exemplo já vinculados ao `defaultCompanyId` (FluxoClaro Matriz)
  const c1 = crypto.randomUUID();
  const c2 = crypto.randomUUID();
  const insertContact = db.prepare(`
    INSERT INTO contacts (id, user_id, person_type, kind, name, trade_name, document, email, phone, cep, street, number, complement, neighborhood, city, state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertContact.run(
    c1, masterId, 'PJ', 'supplier',
    'Distribuidora Horizonte Ltda', 'Horizonte Suprimentos', '12.345.678/0001-90',
    'financeiro@horizonte.com.br', '(11) 3456-7890', '01310-100',
    'Av. Paulista', '1000', 'Conj. 42', 'Bela Vista', 'São Paulo', 'SP', now, now
  );
  insertContact.run(
    c2, masterId, 'PF', 'customer',
    'Mariana Almeida Souza', '', '321.654.987-00',
    'mariana.souza@exemplo.com', '(11) 98765-4321', '04538-132',
    'Rua Funchal', '418', '', 'Vila Olímpia', 'São Paulo', 'SP', now, now
  );

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const prevMonthDate = new Date(yyyy, today.getMonth() - 1, 15);
  const prevYm = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthDate = new Date(yyyy, today.getMonth() + 1, 10);
  const nextYm = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = `${yyyy}-${mm}-${String(today.getDate()).padStart(2, '0')}`;
  const soonDate = new Date(today.getTime() + 2 * 86400000);
  const soonStr = `${soonDate.getFullYear()}-${String(soonDate.getMonth() + 1).padStart(2, '0')}-${String(soonDate.getDate()).padStart(2, '0')}`;

  const groupId = crypto.randomUUID();
  const insertTx = db.prepare(`
    INSERT INTO transactions (
      id, user_id, company_id, type, description, amount_cents, due_date, paid_at, status, payment_method,
      category_id, contact_id, document_number, installment_group_id,
      installment_number, installment_total, notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run(
    crypto.randomUUID(), masterId, defaultCompanyId, 'receivable', 'Consultoria Mensal — Contrato 01',
    850000, `${yyyy}-${mm}-05`, `${yyyy}-${mm}-05`, 'settled', 'PIX',
    catIds['Serviços Prestados'], c2, 'NF-1042', null, 1, 1, 'Recebido via PIX', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, defaultCompanyId, 'receivable', 'Projeto de Implantação — Etapa 2',
    420000, soonStr, null, 'pending', '',
    catIds['Vendas de Produtos'], c2, 'NF-1055', null, 1, 1, '', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, defaultCompanyId, 'payable', 'Aluguel Escritório Comercial',
    240000, todayStr, null, 'pending', '',
    catIds['Aluguel e Condomínio'], c1, 'REC-09', null, 1, 1, 'Vence hoje', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, defaultCompanyId, 'payable', 'Compra de Equipamentos (Parcela 1/2)',
    150000, `${yyyy}-${mm}-18`, null, 'pending', '',
    catIds['Fornecedores'], c1, 'NFe-8821', groupId, 1, 2, 'Parcelado em 2x', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, defaultCompanyId, 'payable', 'Compra de Equipamentos (Parcela 2/2)',
    150000, `${nextYm}-18`, null, 'pending', '',
    catIds['Fornecedores'], c1, 'NFe-8821', groupId, 2, 2, 'Parcelado em 2x', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, defaultCompanyId, 'receivable', 'Faturamento Anterior',
    680000, `${prevYm}-20`, `${prevYm}-20`, 'settled', 'Transferência (TED/DOC)',
    catIds['Vendas de Produtos'], c2, 'NF-0991', null, 1, 1, '', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, defaultCompanyId, 'payable', 'Fornecedores Mês Anterior',
    310000, `${prevYm}-12`, `${prevYm}-12`, 'settled', 'Boleto',
    catIds['Fornecedores'], c1, 'NFe-8700', null, 1, 1, '', 'manual', now, now
  );
}

// Auto-seed on startup
ensureMasterSeed();

// Ensure existing users have at least one company
// EN: Users that were already linked to shared companies (user_company_access) do NOT receive
//     an automatic "Minha Empresa Principal" — they work only on the companies granted to them.
// PT: Usuários que já possuem empresas liberadas (user_company_access) NÃO recebem a empresa
//     automática "Minha Empresa Principal" — eles operam apenas nos CNPJs autorizados.
try {
  const existingUsers = db.prepare(`
    SELECT u.id FROM users u
    WHERE NOT EXISTS (SELECT 1 FROM user_company_access a WHERE a.user_id = u.id)
  `).all() as { id: string }[];
  for (const u of existingUsers) {
    seedDefaultCompanyForUser(u.id);
  }
  // EN: Seed FULL licenses for all companies without license on server startup.
  // PT: Semeia licenças para todas as empresas sem licença ao iniciar o servidor.
  seedDefaultLicenses();

  // EN: Safe idempotent migration (v1.10.2) linking legacy orphan transactions (null/empty company_id)
  //     to their owner's default main company (e.g. FluxoClaro Matriz), so all historical entries and
  //     due-date alerts show up both in the individual Matriz view and in "All Companies".
  // PT: Migração segura e idempotente (v1.10.2) vinculando lançamentos antigos sem empresa (`company_id` nulo/vazio)
  //     à empresa padrão (`is_default = 1`) do respectivo usuário, garantindo que contas anteriores e avisos de
  //     vencimento apareçam tanto na visão individual da Matriz quanto em "Todas as Empresas".
  db.exec(`
    UPDATE transactions
    SET company_id = (
      SELECT id FROM companies
      WHERE companies.user_id = transactions.user_id AND is_default = 1
      LIMIT 1
    )
    WHERE company_id IS NULL OR company_id = '';
  `);
} catch {
  // Safe fallback
}
