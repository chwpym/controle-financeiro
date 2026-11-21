import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { DATA_DIR } from './config';
import { hashPassword } from './crypto';

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

  CREATE INDEX IF NOT EXISTS idx_tx_user_due ON transactions(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_tx_group ON transactions(user_id, installment_group_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
  CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
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

  // Seed clean initial contacts and sample monthly entries for immediate dashboard visualization
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
      id, user_id, type, description, amount_cents, due_date, paid_at, status, payment_method,
      category_id, contact_id, document_number, installment_group_id,
      installment_number, installment_total, notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTx.run(
    crypto.randomUUID(), masterId, 'receivable', 'Consultoria Mensal — Contrato 01',
    850000, `${yyyy}-${mm}-05`, `${yyyy}-${mm}-05`, 'settled', 'PIX',
    catIds['Serviços Prestados'], c2, 'NF-1042', null, 1, 1, 'Recebido via PIX', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, 'receivable', 'Projeto de Implantação — Etapa 2',
    420000, soonStr, null, 'pending', '',
    catIds['Vendas de Produtos'], c2, 'NF-1055', null, 1, 1, '', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, 'payable', 'Aluguel Escritório Comercial',
    240000, todayStr, null, 'pending', '',
    catIds['Aluguel e Condomínio'], c1, 'REC-09', null, 1, 1, 'Vence hoje', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, 'payable', 'Compra de Equipamentos (Parcela 1/2)',
    150000, `${yyyy}-${mm}-18`, null, 'pending', '',
    catIds['Fornecedores'], c1, 'NFe-8821', groupId, 1, 2, 'Parcelado em 2x', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, 'payable', 'Compra de Equipamentos (Parcela 2/2)',
    150000, `${nextYm}-18`, null, 'pending', '',
    catIds['Fornecedores'], c1, 'NFe-8821', groupId, 2, 2, 'Parcelado em 2x', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, 'receivable', 'Faturamento Anterior',
    680000, `${prevYm}-20`, `${prevYm}-20`, 'settled', 'Transferência (TED/DOC)',
    catIds['Vendas de Produtos'], c2, 'NF-0991', null, 1, 1, '', 'manual', now, now
  );
  insertTx.run(
    crypto.randomUUID(), masterId, 'payable', 'Fornecedores Mês Anterior',
    310000, `${prevYm}-12`, `${prevYm}-12`, 'settled', 'Boleto',
    catIds['Fornecedores'], c1, 'NFe-8700', null, 1, 1, '', 'manual', now, now
  );
}

// Auto-seed on startup
ensureMasterSeed();
