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
}

export interface AuthedRequest extends Request {
  authUser?: DbUser;
}

export function mapUser(row: DbUser) {
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
