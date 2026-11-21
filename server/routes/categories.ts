import crypto from 'node:crypto';
import express from 'express';
import type { Response } from 'express';
import { db } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const categories = db.prepare(`
    SELECT id, user_id as userId, name, type, color, created_at as createdAt, updated_at as updatedAt
    FROM categories WHERE user_id = ? ORDER BY name ASC
  `).all(uid);
  res.json({ categories });
});

router.post('/', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const id = String(req.body?.id || crypto.randomUUID());
  const cat = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO categories (id, user_id, name, type, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    uid,
    String(cat.name || 'Categoria').slice(0, 80),
    cat.type === 'payable' || cat.type === 'receivable' ? cat.type : 'both',
    String(cat.color || '#0F766E').slice(0, 20),
    String(cat.createdAt || now),
    String(cat.updatedAt || now)
  );

  res.status(201).json({ ok: true, id });
});

router.put('/:id', (req: AuthedRequest, res: Response): void => {
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

router.delete('/:id', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  db.prepare('UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?').run(req.params.id, uid);
  db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(req.params.id, uid);
  res.json({ ok: true });
});

export default router;
