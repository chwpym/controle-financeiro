import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production' || process.argv.includes('--prod') || process.argv.includes('--preview');

// Persistent secret for HMAC token signing (generated once and stored alongside DB if not in env)
const DATA_DIR = path.resolve(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const SECRET_FILE = path.join(DATA_DIR, '.auth_secret');

function getAuthSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

const AUTH_SECRET = getAuthSecret();

// SQLite Initialization
const DB_PATH = path.join(DATA_DIR, 'fluxoclaro.db');
const db = new Database(DB_PATH);
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

// Safe migration for existing SQLite databases
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

// Password hashing helpers (scrypt)
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

// HMAC Token helpers
interface TokenPayload {
  uid: string;
  exp: number;
}

function signToken(uid: string): string {
  const payload: TokenPayload = {
    uid,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as TokenPayload;
    if (!decoded.uid || !decoded.exp || decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function seedDefaultCategoriesForUser(userId: string) {
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

function ensureMasterSeed() {
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

ensureMasterSeed();

// Row mapping helpers
interface DbUser {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapUser(row: DbUser) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

interface AuthedRequest extends Request {
  authUser?: DbUser;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'Sessão não autenticada.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Sessão expirada ou inválida.' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid) as DbUser | undefined;
  if (!user) {
    res.status(401).json({ error: 'Usuário não encontrado.' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'Conta suspensa pelo administrador master.' });
    return;
  }
  req.authUser = user;
  next();
}

function requireMasterOrAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.authUser || (req.authUser.role !== 'master' && req.authUser.role !== 'admin')) {
    res.status(403).json({ error: 'Acesso restrito ao Usuário Master / Administrador.' });
    return;
  }
  next();
}

const app = express();
app.use(express.json({ limit: '10mb' }));

// --- AUTH ROUTES (Username + Password only, NO Email) ---

app.post('/api/auth/login', (req: Request, res: Response) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');

  if (!username || !password) {
    res.status(400).json({ error: 'Informe usuário e senha.' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as DbUser | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    return;
  }
  if (user.status !== 'active') {
    res.status(403).json({ error: 'Esta conta está suspensa. Procure o Usuário Master.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as DbUser;

  res.json({
    token: signToken(user.id),
    user: mapUser(updated),
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const username = String(req.body?.username || '').trim();
  const displayName = String(req.body?.displayName || '').trim() || username;
  const password = String(req.body?.password || '');

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    res.status(400).json({ error: 'O nome de usuário deve ter 3 a 32 caracteres (letras, números, ponto, hífen ou _).' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Este nome de usuário já está em uso.' });
    return;
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, role, status, last_login_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'user', 'active', ?, ?, ?)
  `).run(userId, username, displayName, hashPassword(password), now, now, now);

  seedDefaultCategoriesForUser(userId);
  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as DbUser;

  res.status(201).json({
    token: signToken(userId),
    user: mapUser(created),
  });
});

app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res: Response) => {
  res.json({ user: mapUser(req.authUser!) });
});

app.post('/api/auth/change-password', requireAuth, (req: AuthedRequest, res: Response) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!verifyPassword(currentPassword, req.authUser!.password_hash)) {
    res.status(400).json({ error: 'Senha atual incorreta.' });
    return;
  }
  if (newPassword.length < 4) {
    res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(newPassword),
    now,
    req.authUser!.id
  );
  res.json({ ok: true });
});

// --- DATA SNAPSHOT & SYNC ROUTES ---

app.get('/api/data/snapshot', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  const categories = db.prepare(`
    SELECT id, user_id as userId, name, type, color, created_at as createdAt, updated_at as updatedAt
    FROM categories WHERE user_id = ? ORDER BY name ASC
  `).all(uid);

  const contacts = db.prepare(`
    SELECT id, user_id as userId, person_type as personType, kind, name,
      trade_name as tradeName, document, email, phone, cep, street, number,
      complement, neighborhood, city, state, created_at as createdAt, updated_at as updatedAt
    FROM contacts WHERE user_id = ? ORDER BY name ASC
  `).all(uid);

  const rawTransactions = db.prepare(`
    SELECT id, user_id as userId, type, description, amount_cents as amountCents,
      discount_cents as discountCents, interest_cents as interestCents,
      due_date as dueDate, paid_at as paidAt, status, payment_method as paymentMethod,
      category_id as categoryId, contact_id as contactId, document_number as documentNumber,
      installment_group_id as installmentGroupId, installment_number as installmentNumber,
      installment_total as installmentTotal, is_recurring as isRecurring,
      recurrence_interval as recurrenceInterval, notes, source,
      created_at as createdAt, updated_at as updatedAt
    FROM transactions WHERE user_id = ? ORDER BY due_date ASC, installment_number ASC
  `).all(uid) as Array<Record<string, unknown>>;

  const transactions = rawTransactions.map((row) => ({
    ...row,
    discountCents: Number(row.discountCents || 0),
    interestCents: Number(row.interestCents || 0),
    isRecurring: Boolean(row.isRecurring),
    recurrenceInterval: row.recurrenceInterval || null,
  }));

  res.json({
    categories,
    contacts,
    transactions,
    serverTime: new Date().toISOString(),
  });
});

// Transactions batch upsert (supports installments & offline idempotent retries)
app.post('/api/transactions/batch', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.status(400).json({ error: 'Nenhum lançamento enviado.' });
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO transactions (
      id, user_id, type, description, amount_cents, discount_cents, interest_cents,
      due_date, paid_at, status, payment_method,
      category_id, contact_id, document_number, installment_group_id,
      installment_number, installment_total, is_recurring, recurrence_interval,
      notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      description = excluded.description,
      amount_cents = excluded.amount_cents,
      discount_cents = excluded.discount_cents,
      interest_cents = excluded.interest_cents,
      due_date = excluded.due_date,
      paid_at = excluded.paid_at,
      status = excluded.status,
      payment_method = excluded.payment_method,
      category_id = excluded.category_id,
      contact_id = excluded.contact_id,
      document_number = excluded.document_number,
      installment_group_id = excluded.installment_group_id,
      installment_number = excluded.installment_number,
      installment_total = excluded.installment_total,
      is_recurring = excluded.is_recurring,
      recurrence_interval = excluded.recurrence_interval,
      notes = excluded.notes,
      source = excluded.source,
      updated_at = excluded.updated_at
    WHERE transactions.user_id = excluded.user_id
  `);

  const runBatch = db.transaction((rows: any[]) => {
    const now = new Date().toISOString();
    for (const item of rows) {
      const recInterval =
        item.recurrenceInterval === 'monthly' ||
        item.recurrenceInterval === 'biweekly' ||
        item.recurrenceInterval === 'yearly'
          ? item.recurrenceInterval
          : null;
      upsert.run(
        String(item.id || crypto.randomUUID()),
        uid,
        item.type === 'receivable' ? 'receivable' : 'payable',
        String(item.description || 'Lançamento').slice(0, 200),
        Math.max(1, Math.round(Number(item.amountCents) || 0)),
        Math.max(0, Math.round(Number(item.discountCents) || 0)),
        Math.max(0, Math.round(Number(item.interestCents) || 0)),
        String(item.dueDate || now.slice(0, 10)),
        item.paidAt ? String(item.paidAt) : null,
        item.status === 'settled' ? 'settled' : 'pending',
        item.status === 'settled' ? String(item.paymentMethod || '').slice(0, 60) : '',
        item.categoryId ? String(item.categoryId) : null,
        item.contactId ? String(item.contactId) : null,
        String(item.documentNumber || '').slice(0, 60),
        item.installmentGroupId ? String(item.installmentGroupId) : null,
        Math.max(1, Number(item.installmentNumber) || 1),
        Math.max(1, Number(item.installmentTotal) || 1),
        item.isRecurring ? 1 : 0,
        recInterval,
        String(item.notes || '').slice(0, 500),
        item.source === 'xml' ? 'xml' : item.source === 'excel' ? 'excel' : 'manual',
        String(item.createdAt || now),
        String(item.updatedAt || now)
      );
    }
  });

  runBatch(items);
  res.json({ ok: true, count: items.length });
});

app.put('/api/transactions/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  const id = req.params.id;
  const item = req.body;
  const now = new Date().toISOString();
  const recInterval =
    item.recurrenceInterval === 'monthly' ||
    item.recurrenceInterval === 'biweekly' ||
    item.recurrenceInterval === 'yearly'
      ? item.recurrenceInterval
      : null;

  db.prepare(`
    INSERT INTO transactions (
      id, user_id, type, description, amount_cents, discount_cents, interest_cents,
      due_date, paid_at, status, payment_method,
      category_id, contact_id, document_number, installment_group_id,
      installment_number, installment_total, is_recurring, recurrence_interval,
      notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      description = excluded.description,
      amount_cents = excluded.amount_cents,
      discount_cents = excluded.discount_cents,
      interest_cents = excluded.interest_cents,
      due_date = excluded.due_date,
      paid_at = excluded.paid_at,
      status = excluded.status,
      payment_method = excluded.payment_method,
      category_id = excluded.category_id,
      contact_id = excluded.contact_id,
      document_number = excluded.document_number,
      installment_group_id = excluded.installment_group_id,
      installment_number = excluded.installment_number,
      installment_total = excluded.installment_total,
      is_recurring = excluded.is_recurring,
      recurrence_interval = excluded.recurrence_interval,
      notes = excluded.notes,
      updated_at = excluded.updated_at
    WHERE transactions.user_id = excluded.user_id
  `).run(
    id,
    uid,
    item.type === 'receivable' ? 'receivable' : 'payable',
    String(item.description || 'Lançamento').slice(0, 200),
    Math.max(1, Math.round(Number(item.amountCents) || 0)),
    Math.max(0, Math.round(Number(item.discountCents) || 0)),
    Math.max(0, Math.round(Number(item.interestCents) || 0)),
    String(item.dueDate || now.slice(0, 10)),
    item.paidAt ? String(item.paidAt) : null,
    item.status === 'settled' ? 'settled' : 'pending',
    item.status === 'settled' ? String(item.paymentMethod || '').slice(0, 60) : '',
    item.categoryId ? String(item.categoryId) : null,
    item.contactId ? String(item.contactId) : null,
    String(item.documentNumber || '').slice(0, 60),
    item.installmentGroupId ? String(item.installmentGroupId) : null,
    Math.max(1, Number(item.installmentNumber) || 1),
    Math.max(1, Number(item.installmentTotal) || 1),
    item.isRecurring ? 1 : 0,
    recInterval,
    String(item.notes || '').slice(0, 500),
    item.source === 'xml' ? 'xml' : item.source === 'excel' ? 'excel' : 'manual',
    String(item.createdAt || now),
    String(item.updatedAt || now)
  );

  res.json({ ok: true });
});

app.post('/api/transactions/batch-delete', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : [];
  if (ids.length === 0) {
    res.json({ ok: true, count: 0 });
    return;
  }
  const delStmt = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?');
  const runDel = db.transaction((list: string[]) => {
    for (const id of list) {
      delStmt.run(id, uid);
    }
  });
  runDel(ids);
  res.json({ ok: true, count: ids.length });
});

app.delete('/api/transactions/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.authUser!.id);
  res.json({ ok: true });
});

app.delete('/api/transactions/group/:groupId', requireAuth, (req: AuthedRequest, res: Response) => {
  db.prepare('DELETE FROM transactions WHERE installment_group_id = ? AND user_id = ?').run(
    req.params.groupId,
    req.authUser!.id
  );
  res.json({ ok: true });
});

// Contacts CRUD
app.put('/api/contacts/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  const id = req.params.id;
  const c = req.body;
  const now = new Date().toISOString();

  // Validate duplicate document (CPF / CNPJ) for the same user
  const rawDoc = String(c.document || '').trim();
  const cleanDoc = rawDoc.replace(/\D/g, '');
  if (cleanDoc && cleanDoc.length >= 8) {
    const existing = db.prepare(`
      SELECT id, name, document FROM contacts
      WHERE user_id = ? AND id != ?
    `).all(uid, id) as { id: string; name: string; document: string }[];

    const duplicate = existing.find((item) => (item.document || '').replace(/\D/g, '') === cleanDoc);
    if (duplicate) {
      res.status(400).json({
        error: `Este ${c.personType === 'PJ' ? 'CNPJ' : 'CPF'} já está cadastrado para o contato "${duplicate.name}".`,
      });
      return;
    }
  }

  db.prepare(`
    INSERT INTO contacts (
      id, user_id, person_type, kind, name, trade_name, document, email, phone,
      cep, street, number, complement, neighborhood, city, state, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      person_type = excluded.person_type,
      kind = excluded.kind,
      name = excluded.name,
      trade_name = excluded.trade_name,
      document = excluded.document,
      email = excluded.email,
      phone = excluded.phone,
      cep = excluded.cep,
      street = excluded.street,
      number = excluded.number,
      complement = excluded.complement,
      neighborhood = excluded.neighborhood,
      city = excluded.city,
      state = excluded.state,
      updated_at = excluded.updated_at
    WHERE contacts.user_id = excluded.user_id
  `).run(
    id,
    uid,
    c.personType === 'PJ' ? 'PJ' : 'PF',
    c.kind === 'supplier' || c.kind === 'customer' ? c.kind : 'both',
    String(c.name || '').slice(0, 160),
    String(c.tradeName || '').slice(0, 160),
    String(c.document || '').slice(0, 30),
    String(c.email || '').slice(0, 120),
    String(c.phone || '').slice(0, 40),
    String(c.cep || '').slice(0, 20),
    String(c.street || '').slice(0, 160),
    String(c.number || '').slice(0, 30),
    String(c.complement || '').slice(0, 120),
    String(c.neighborhood || '').slice(0, 120),
    String(c.city || '').slice(0, 120),
    String(c.state || '').slice(0, 10),
    String(c.createdAt || now),
    String(c.updatedAt || now)
  );
  res.json({ ok: true });
});

app.delete('/api/contacts/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  db.prepare('UPDATE transactions SET contact_id = NULL WHERE contact_id = ? AND user_id = ?').run(req.params.id, uid);
  db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?').run(req.params.id, uid);
  res.json({ ok: true });
});

// Categories CRUD
app.put('/api/categories/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  const id = req.params.id;
  const cat = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO categories (id, user_id, name, type, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      type = excluded.type,
      color = excluded.color,
      updated_at = excluded.updated_at
    WHERE categories.user_id = excluded.user_id
  `).run(
    id,
    uid,
    String(cat.name || 'Categoria').slice(0, 80),
    cat.type === 'payable' || cat.type === 'receivable' ? cat.type : 'both',
    String(cat.color || '#0F766E').slice(0, 20),
    String(cat.createdAt || now),
    String(cat.updatedAt || now)
  );
  res.json({ ok: true });
});

app.delete('/api/categories/:id', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?').run(req.params.id, uid);
  db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(req.params.id, uid);
  res.json({ ok: true });
});

// Local Backup Restore (Client uploads parsed local .json backup)
app.post('/api/backup/restore', requireAuth, (req: AuthedRequest, res: Response) => {
  const uid = req.authUser!.id;
  const payload = req.body;
  if (!payload || !Array.isArray(payload.transactions) || !Array.isArray(payload.contacts) || !Array.isArray(payload.categories)) {
    res.status(400).json({ error: 'Arquivo de backup inválido.' });
    return;
  }

  const restoreTx = db.transaction(() => {
    const now = new Date().toISOString();
    const upsertCat = db.prepare(`
      INSERT OR REPLACE INTO categories (id, user_id, name, type, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const cat of payload.categories) {
      upsertCat.run(
        String(cat.id || crypto.randomUUID()),
        uid,
        String(cat.name || 'Categoria'),
        cat.type === 'payable' || cat.type === 'receivable' ? cat.type : 'both',
        String(cat.color || '#0F766E'),
        String(cat.createdAt || now),
        String(cat.updatedAt || now)
      );
    }

    const upsertContact = db.prepare(`
      INSERT OR REPLACE INTO contacts (
        id, user_id, person_type, kind, name, trade_name, document, email, phone,
        cep, street, number, complement, neighborhood, city, state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of payload.contacts) {
      upsertContact.run(
        String(c.id || crypto.randomUUID()),
        uid,
        c.personType === 'PJ' ? 'PJ' : 'PF',
        c.kind === 'supplier' || c.kind === 'customer' ? c.kind : 'both',
        String(c.name || ''),
        String(c.tradeName || ''),
        String(c.document || ''),
        String(c.email || ''),
        String(c.phone || ''),
        String(c.cep || ''),
        String(c.street || ''),
        String(c.number || ''),
        String(c.complement || ''),
        String(c.neighborhood || ''),
        String(c.city || ''),
        String(c.state || ''),
        String(c.createdAt || now),
        String(c.updatedAt || now)
      );
    }

    const upsertTx = db.prepare(`
      INSERT OR REPLACE INTO transactions (
        id, user_id, type, description, amount_cents, discount_cents, interest_cents,
        due_date, paid_at, status, payment_method,
        category_id, contact_id, document_number, installment_group_id,
        installment_number, installment_total, is_recurring, recurrence_interval,
        notes, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of payload.transactions) {
      const recInterval =
        t.recurrenceInterval === 'monthly' ||
        t.recurrenceInterval === 'biweekly' ||
        t.recurrenceInterval === 'yearly'
          ? t.recurrenceInterval
          : null;
      upsertTx.run(
        String(t.id || crypto.randomUUID()),
        uid,
        t.type === 'receivable' ? 'receivable' : 'payable',
        String(t.description || 'Lançamento'),
        Math.max(1, Math.round(Number(t.amountCents) || 0)),
        Math.max(0, Math.round(Number(t.discountCents) || 0)),
        Math.max(0, Math.round(Number(t.interestCents) || 0)),
        String(t.dueDate || now.slice(0, 10)),
        t.paidAt ? String(t.paidAt) : null,
        t.status === 'settled' ? 'settled' : 'pending',
        t.status === 'settled' ? String(t.paymentMethod || '') : '',
        t.categoryId ? String(t.categoryId) : null,
        t.contactId ? String(t.contactId) : null,
        String(t.documentNumber || ''),
        t.installmentGroupId ? String(t.installmentGroupId) : null,
        Math.max(1, Number(t.installmentNumber) || 1),
        Math.max(1, Number(t.installmentTotal) || 1),
        t.isRecurring ? 1 : 0,
        recInterval,
        String(t.notes || ''),
        t.source === 'xml' ? 'xml' : t.source === 'excel' ? 'excel' : 'manual',
        String(t.createdAt || now),
        String(t.updatedAt || now)
      );
    }
  });

  restoreTx();
  res.json({ ok: true });
});

// --- CEP & CNPJ EXTERNAL API PROXY ---

app.get('/api/lookup/cep/:cep', requireAuth, async (req: Request, res: Response) => {
  const cleanCep = String(req.params.cep || '').replace(/\D/g, '');
  if (cleanCep.length !== 8) {
    res.status(400).json({ error: 'CEP inválido. Informe 8 dígitos.' });
    return;
  }

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
      signal: AbortSignal.timeout(6000),
    });
    if (resp.ok) {
      const data = await resp.json() as any;
      if (!data.erro) {
        res.json({
          cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
          street: data.logradouro || '',
          complement: data.complemento || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
        });
        return;
      }
    }
  } catch {
    // Fallback to BrasilAPI below
  }

  try {
    const fallback = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (fallback.ok) {
      const data = await fallback.json() as any;
      res.json({
        cep: `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`,
        street: data.street || '',
        complement: '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
      });
      return;
    }
  } catch {
    // Ignore
  }

  res.status(404).json({ error: 'CEP não encontrado ou sem conexão no momento.' });
});

app.get('/api/lookup/cnpj/:cnpj', requireAuth, async (req: Request, res: Response) => {
  const cleanCnpj = String(req.params.cnpj || '').replace(/\D/g, '');
  if (cleanCnpj.length !== 14) {
    res.status(400).json({ error: 'CNPJ inválido. Informe 14 dígitos.' });
    return;
  }

  const formattedCnpj = `${cleanCnpj.slice(0, 2)}.${cleanCnpj.slice(2, 5)}.${cleanCnpj.slice(5, 8)}/${cleanCnpj.slice(8, 12)}-${cleanCnpj.slice(12)}`;

  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) {
      const data = await resp.json() as any;
      const cepDigits = String(data.cep || '').replace(/\D/g, '');
      const cepFormatted = cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : '';
      const streetParts = [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(' ').trim();
      res.json({
        cnpj: formattedCnpj,
        name: data.razao_social || '',
        tradeName: data.nome_fantasia || '',
        email: data.email || '',
        phone: data.ddd_telefone_1 || '',
        cep: cepFormatted,
        street: streetParts,
        number: data.numero || '',
        complement: data.complemento || '',
        neighborhood: data.bairro || '',
        city: data.municipio || '',
        state: data.uf || '',
        situacao: data.descricao_situacao_cadastral || '',
      });
      return;
    }
  } catch {
    // Fallback below
  }

  try {
    const fallback = await fetch(`https://publica.cnpj.ws/cnpj/${cleanCnpj}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (fallback.ok) {
      const data = await fallback.json() as any;
      const est = data.estabelecimento || {};
      const cepDigits = String(est.cep || '').replace(/\D/g, '');
      const cepFormatted = cepDigits.length === 8 ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}` : '';
      res.json({
        cnpj: formattedCnpj,
        name: data.razao_social || '',
        tradeName: est.nome_fantasia || '',
        email: est.email || '',
        phone: est.ddd1 && est.telefone1 ? `(${est.ddd1}) ${est.telefone1}` : '',
        cep: cepFormatted,
        street: [est.tipo_logradouro, est.logradouro].filter(Boolean).join(' ').trim(),
        number: est.numero || '',
        complement: est.complemento || '',
        neighborhood: est.bairro || '',
        city: est.cidade?.nome || '',
        state: est.estado?.sigla || '',
        situacao: est.situacao_cadastral || '',
      });
      return;
    }
  } catch {
    // Ignore
  }

  res.status(404).json({ error: 'CNPJ não encontrado ou serviço indisponível no momento.' });
});

// --- ADMIN / MASTER PANEL ROUTES ---

app.get('/api/admin/users', requireAuth, requireMasterOrAdmin, (_req: AuthedRequest, res: Response) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name as displayName, u.role, u.status,
      u.created_at as createdAt, u.last_login_at as lastLoginAt,
      (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) as transactionCount,
      (SELECT COUNT(*) FROM contacts c WHERE c.user_id = u.id) as contactCount
    FROM users u
    ORDER BY u.created_at ASC
  `).all();

  const summary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as totalUsers,
      (SELECT COUNT(*) FROM users WHERE status = 'active') as activeUsers,
      (SELECT COUNT(*) FROM users WHERE status = 'suspended') as suspendedUsers,
      (SELECT COUNT(*) FROM users WHERE role IN ('master', 'admin')) as masterAndAdminCount,
      (SELECT COUNT(*) FROM transactions) as totalTransactions,
      (SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE status = 'pending') as totalPendingCents
  `).get();

  res.json({ users, summary });
});

app.post('/api/admin/users', requireAuth, requireMasterOrAdmin, (req: AuthedRequest, res: Response) => {
  const username = String(req.body?.username || '').trim();
  const displayName = String(req.body?.displayName || '').trim() || username;
  const password = String(req.body?.password || '');
  const requestedRole = String(req.body?.role || 'user');

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    res.status(400).json({ error: 'Nome de usuário inválido (3 a 32 caracteres sem espaços).' });
    return;
  }
  if (password.length < 4) {
    res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres.' });
    return;
  }

  const role =
    requestedRole === 'master' && req.authUser!.role === 'master'
      ? 'master'
      : requestedRole === 'admin'
        ? 'admin'
        : 'user';

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: 'Nome de usuário já existe.' });
    return;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, role, status, last_login_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', NULL, ?, ?)
  `).run(id, username, displayName, hashPassword(password), role, now, now);

  seedDefaultCategoriesForUser(id);
  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser;
  res.status(201).json({ user: mapUser(created) });
});

app.patch('/api/admin/users/:id', requireAuth, requireMasterOrAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = req.params.id;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser | undefined;
  if (!target) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  if (target.role === 'master' && req.authUser!.role !== 'master') {
    res.status(403).json({ error: 'Apenas um Usuário Master pode editar outro Usuário Master.' });
    return;
  }

  const nextDisplayName = req.body?.displayName !== undefined ? String(req.body.displayName).trim() : target.display_name;
  const nextUsername = req.body?.username !== undefined ? String(req.body.username).trim() : target.username;
  const nextStatus = req.body?.status === 'suspended' ? 'suspended' : req.body?.status === 'active' ? 'active' : target.status;

  let nextRole = target.role;
  if (req.body?.role !== undefined) {
    if (req.body.role === 'master' && req.authUser!.role === 'master') {
      nextRole = 'master';
    } else if (req.body.role === 'admin' || req.body.role === 'user') {
      nextRole = req.body.role;
    }
  }

  if (target.id === req.authUser!.id && nextStatus === 'suspended') {
    res.status(400).json({ error: 'Você não pode suspender a sua própria conta.' });
    return;
  }

  if (target.role === 'master' && (nextRole !== 'master' || nextStatus === 'suspended')) {
    const masterCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'master' AND status = 'active'").get() as { c: number }).c;
    if (masterCount <= 1) {
      res.status(400).json({ error: 'O sistema precisa manter pelo menos um Usuário Master ativo.' });
      return;
    }
  }

  if (!/^[a-zA-Z0-9._-]{3,32}$/.test(nextUsername)) {
    res.status(400).json({ error: 'Nome de usuário inválido.' });
    return;
  }

  const duplicate = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(nextUsername, targetId);
  if (duplicate) {
    res.status(409).json({ error: 'Nome de usuário já em uso.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users SET username = ?, display_name = ?, role = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(nextUsername, nextDisplayName || nextUsername, nextRole, nextStatus, now, targetId);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser;
  res.json({ user: mapUser(updated) });
});

app.post('/api/admin/users/:id/reset-password', requireAuth, requireMasterOrAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = req.params.id;
  const newPassword = String(req.body?.newPassword || '');
  if (newPassword.length < 4) {
    res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres.' });
    return;
  }

  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser | undefined;
  if (!target) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }
  if (target.role === 'master' && req.authUser!.role !== 'master') {
    res.status(403).json({ error: 'Apenas um Usuário Master pode alterar a senha de outro Master.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(newPassword),
    now,
    targetId
  );
  res.json({ ok: true });
});

app.delete('/api/admin/users/:id', requireAuth, requireMasterOrAdmin, (req: AuthedRequest, res: Response) => {
  const targetId = req.params.id;
  if (targetId === req.authUser!.id) {
    res.status(400).json({ error: 'Você não pode excluir a própria conta.' });
    return;
  }
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser | undefined;
  if (!target) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }
  if (target.role === 'master') {
    if (req.authUser!.role !== 'master') {
      res.status(403).json({ error: 'Apenas o Usuário Master pode remover outro Master.' });
      return;
    }
    const masterCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'master'").get() as { c: number }).c;
    if (masterCount <= 1) {
      res.status(400).json({ error: 'Não é possível excluir o único Usuário Master do sistema.' });
      return;
    }
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
  res.json({ ok: true });
});

// --- SERVER STARTUP (Vite middleware in dev, dist in prod) ---

async function startServer() {
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log(`[MODO DESENVOLVIMENTO] Vite HMR ativo`);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (!fs.existsSync(distPath)) {
      console.error(`\n[ERRO CRÍTICO] Pasta 'dist' não encontrada!\nPor favor, execute 'npm run build' antes de iniciar o modo de produção/preview.\n`);
      process.exit(1);
    }
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Não retorna index.html (text/html) para rotas de API, módulos do Vite ou assets com extensão que não existem
      if (req.path.startsWith('/api/') || req.path.startsWith('/@') || /\.[a-zA-Z0-9]+$/.test(req.path)) {
        res.status(404).end();
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[MODO PRODUÇÃO / PWA OFFLINE] Servindo aplicação empacotada de: ${distPath}`);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FluxoClaro rodando em: http://localhost:${PORT}`);
  });
}

startServer();
