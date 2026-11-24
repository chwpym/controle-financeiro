import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Request, Response, NextFunction } from 'express';
import { DATA_DIR } from '../config';
import { db } from '../db';
import { hashPassword, verifyPassword } from '../crypto';

export { hashPassword, verifyPassword } from '../crypto';

const SECRET_FILE = path.join(DATA_DIR, '.auth_secret');

export function getAuthSecret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, generated, { mode: 0o600 });
  return generated;
}

const AUTH_SECRET = getAuthSecret();

export interface TokenPayload {
  uid: string;
  exp: number;
}

export function signToken(uid: string): string {
  const payload: TokenPayload = {
    uid,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
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

export interface DbUser {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  /**
   * EN: Main company of the user (Phase 9.3). Optional because old rows may not have it.
   * PT: Empresa principal do usuário (Fase 9.3). Opcional pois linhas antigas podem não ter.
   */
  default_company_id?: string | null;
  /**
   * EN: Delete permission flag — 1 = can delete transactions, 0 = blocked (anti-fraud lock).
   * PT: Flag de exclusão — 1 = pode excluir lançamentos, 0 = bloqueado (trava anti-fraude).
   */
  can_delete?: number;
}

export interface AuthedRequest extends Request {
  authUser?: DbUser;
}

/**
 * EN: Returns the IDs of the companies explicitly granted to a user (user_company_access).
 * PT: Retorna os IDs das empresas liberadas explicitamente para o usuário (user_company_access).
 */
export function getUserCompanyIds(userId: string): string[] {
  try {
    const rows = db
      .prepare('SELECT company_id FROM user_company_access WHERE user_id = ? ORDER BY created_at ASC')
      .all(userId) as { company_id: string }[];
    return rows.map((r) => r.company_id);
  } catch {
    // EN: Table may not exist in very old databases. / PT: Tabela pode não existir em bancos antigos.
    return [];
  }
}

/**
 * EN: Converts a raw SQLite `users` row into the public profile sent to the frontend
 *     (never exposes password_hash). Includes the Phase 9.3 permission fields.
 * PT: Converte a linha crua da tabela `users` no perfil público enviado ao frontend
 *     (nunca expõe o password_hash). Inclui os campos de permissão da Fase 9.3:
 *   - canDelete: se a coluna não existir (undefined) assume true; caso contrário 0 = false.
 *   - defaultCompanyId: empresa principal ou null.
 *   - companyIds: empresas liberadas ao usuário.
 */
export function mapUser(row: DbUser) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    canDelete: row.can_delete === undefined ? true : row.can_delete !== 0,
    defaultCompanyId: row.default_company_id || null,
    companyIds: getUserCompanyIds(row.id),
  };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
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

export function requireMasterOrAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || (req.authUser.role !== 'master' && req.authUser.role !== 'admin')) {
    res.status(403).json({ error: 'Acesso restrito ao Usuário Master / Administrador.' });
    return;
  }
  next();
}

export function requireMasterOnly(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== 'master') {
    res.status(403).json({ error: 'Acesso exclusivo do Usuário Master.' });
    return;
  }
  next();
}

/**
 * EN: Anti-fraud lock (Phase 9.3). Blocks deletion endpoints for operational users ('user')
 *     whose `can_delete` flag is 0. Masters and admins are never blocked.
 * PT: Trava anti-fraude (Fase 9.3). Bloqueia os endpoints de exclusão para usuários
 *     operacionais ('user') cuja flag `can_delete` seja 0. Master e Admin nunca são bloqueados.
 *     Retorna HTTP 403 com mensagem amigável em português.
 */
export function requireDeletePermission(req: AuthedRequest, res: Response, next: NextFunction): void {
  const user = req.authUser;
  if (user && user.role === 'user' && user.can_delete === 0) {
    res.status(403).json({
      error: 'Você não tem permissão para excluir lançamentos financeiros. Solicite liberação ao administrador.',
    });
    return;
  }
  next();
}
