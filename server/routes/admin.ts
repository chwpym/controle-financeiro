import crypto from 'node:crypto';
import express from 'express';
import type { Response } from 'express';
import { db, seedDefaultCategoriesForUser } from '../db';
import {
  hashPassword,
  mapUser,
  requireAuth,
  requireMasterOrAdmin,
  type DbUser,
  type AuthedRequest,
} from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);
router.use(requireMasterOrAdmin);

function getAdminSummary() {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) as totalUsers,
      (SELECT COUNT(*) FROM users WHERE status = 'active') as activeUsers,
      (SELECT COUNT(*) FROM users WHERE status = 'suspended') as suspendedUsers,
      (SELECT COUNT(*) FROM users WHERE role IN ('master', 'admin')) as masterAndAdminCount,
      (SELECT COUNT(*) FROM transactions) as totalTransactions,
      (SELECT COALESCE(SUM(amount_cents), 0) FROM transactions WHERE status = 'pending') as totalPendingCents
  `).get();
}

router.get('/summary', (_req: AuthedRequest, res: Response): void => {
  res.json({ summary: getAdminSummary() });
});

router.get('/users', (_req: AuthedRequest, res: Response): void => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.display_name as displayName, u.role, u.status,
      u.created_at as createdAt, u.last_login_at as lastLoginAt,
      (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) as transactionCount,
      (SELECT COUNT(*) FROM contacts c WHERE c.user_id = u.id) as contactCount
    FROM users u
    ORDER BY u.created_at ASC
  `).all();

  const summary = getAdminSummary();
  res.json({ users, summary });
});

router.post('/users', (req: AuthedRequest, res: Response): void => {
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

router.patch('/users/:id/status', (req: AuthedRequest, res: Response): void => {
  const targetId = req.params.id;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser | undefined;
  if (!target) {
    res.status(404).json({ error: 'Usuário não encontrado.' });
    return;
  }

  if (target.role === 'master' && req.authUser!.role !== 'master') {
    res.status(403).json({ error: 'Apenas um Usuário Master pode alterar outro Usuário Master.' });
    return;
  }

  const nextStatus = req.body?.status === 'suspended' ? 'suspended' : 'active';

  if (target.id === req.authUser!.id && nextStatus === 'suspended') {
    res.status(400).json({ error: 'Você não pode suspender a sua própria conta.' });
    return;
  }

  if (target.role === 'master' && nextStatus === 'suspended') {
    const masterCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'master' AND status = 'active'").get() as { c: number }).c;
    if (masterCount <= 1) {
      res.status(400).json({ error: 'O sistema precisa manter pelo menos um Usuário Master ativo.' });
      return;
    }
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, now, targetId);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as DbUser;
  res.json({ user: mapUser(updated) });
});

router.patch('/users/:id', (req: AuthedRequest, res: Response): void => {
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

router.post('/users/:id/reset-password', (req: AuthedRequest, res: Response): void => {
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

router.delete('/users/:id', (req: AuthedRequest, res: Response): void => {
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

export default router;
