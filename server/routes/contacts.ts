import crypto from 'node:crypto';
import express from 'express';
import type { Response } from 'express';
import { db } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const contacts = db.prepare(`
    SELECT id, user_id as userId, person_type as personType, kind, name,
      trade_name as tradeName, document, email, phone, cep, street, number,
      complement, neighborhood, city, state, created_at as createdAt, updated_at as updatedAt
    FROM contacts WHERE user_id = ? ORDER BY name ASC
  `).all(uid);
  res.json({ contacts });
});

router.post('/', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const id = String(req.body?.id || crypto.randomUUID());
  const c = req.body;
  const now = new Date().toISOString();

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

  res.status(201).json({ ok: true, id });
});

router.put('/:id', (req: AuthedRequest, res: Response): void => {
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

router.delete('/:id', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  db.prepare('UPDATE transactions SET contact_id = NULL WHERE contact_id = ? AND user_id = ?').run(req.params.id, uid);
  db.prepare('DELETE FROM contacts WHERE id = ? AND user_id = ?').run(req.params.id, uid);
  res.json({ ok: true });
});

export default router;
