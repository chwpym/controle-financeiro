import crypto from 'node:crypto';
import express from 'express';
import type { Request, Response } from 'express';
import { db, seedDefaultCategoriesForUser } from '../db';
import {
  hashPassword,
  verifyPassword,
  signToken,
  mapUser,
  requireAuth,
  type DbUser,
  type AuthedRequest,
} from '../middleware/auth';

const router = express.Router();

router.post('/login', (req: Request, res: Response): void => {
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

router.post('/register', (req: Request, res: Response): void => {
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

router.get('/me', requireAuth, (req: AuthedRequest, res: Response): void => {
  res.json({ user: mapUser(req.authUser!) });
});

router.post('/change-password', requireAuth, (req: AuthedRequest, res: Response): void => {
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

export default router;
