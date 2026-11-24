import crypto from 'node:crypto';
import express from 'express';
import type { Response } from 'express';
import { db, seedDefaultCompanyForUser } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';
import type { Company } from '../../src/types';

const router = express.Router();

router.use(requireAuth);

function isValidCNPJ(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += Number(digits[i]) * weights1[i];
  }
  const rem1 = sum1 % 11;
  const d1 = rem1 < 2 ? 0 : 11 - rem1;
  if (d1 !== Number(digits[12])) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += Number(digits[i]) * weights2[i];
  }
  const rem2 = sum2 % 11;
  const d2 = rem2 < 2 ? 0 : 11 - rem2;
  return d2 === Number(digits[13]);
}

function mapCompany(row: any): Company {
  return {
    id: row.id,
    userId: row.user_id,
    legalName: row.legal_name,
    tradeName: row.trade_name || '',
    document: row.document || '',
    stateRegistration: row.state_registration || '',
    municipalRegistration: row.municipal_registration || '',
    status: row.status === 'inactive' ? 'inactive' : 'active',
    email: row.email || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    cep: row.cep || '',
    street: row.street || '',
    number: row.number || '',
    complement: row.complement || '',
    neighborhood: row.neighborhood || '',
    city: row.city || '',
    state: row.state || '',
    logoDataUrl: row.logo_data_url || '',
    color: row.color || '#0F766E',
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET / - List user companies (with RBAC isolation by user role)
// EN: For 'master' or 'admin', returns all companies in the system.
//     For 'user', returns ONLY ACTIVE companies linked via user_company_access (or created by them).
//     If the user has a default_company_id, ensures that company is returned with isDefault: true.
// PT: Para 'master' ou 'admin', retorna todas as empresas do sistema.
//     Para 'user', retorna APENAS empresas ATIVAS vinculadas via user_company_access (ou criadas por ele).
//     Se o usuário possuir default_company_id, garante que venha marcada com isDefault: true.
router.get('/', (req: AuthedRequest, res: Response): void => {
  const user = req.authUser!;
  const uid = user.id;

  let rows: any[] = [];
  if (user.role === 'master' || user.role === 'admin') {
    rows = db.prepare(`
      SELECT * FROM companies ORDER BY is_default DESC, trade_name ASC, created_at ASC
    `).all() as any[];

    if (rows.length === 0) {
      seedDefaultCompanyForUser(uid);
      rows = db.prepare(`
        SELECT * FROM companies ORDER BY is_default DESC, trade_name ASC, created_at ASC
      `).all() as any[];
    }
  } else {
    // EN: Operational users only see active companies authorized for them or created by them.
    // PT: Usuários operacionais só visualizam empresas ativas autorizadas ou criadas por eles.
    rows = db.prepare(`
      SELECT * FROM companies
      WHERE status = 'active'
        AND (
          id IN (SELECT company_id FROM user_company_access WHERE user_id = ?)
          OR user_id = ?
        )
      ORDER BY is_default DESC, trade_name ASC, created_at ASC
    `).all(uid, uid) as any[];

    if (rows.length === 0) {
      seedDefaultCompanyForUser(uid);
      rows = db.prepare(`
        SELECT * FROM companies WHERE user_id = ? AND status = 'active'
      `).all(uid) as any[];
    }
  }

  const defaultCompId = user.default_company_id;
  const mapped = rows.map((r) => {
    const comp = mapCompany(r);
    if (defaultCompId) {
      if (comp.id === defaultCompId) {
        return { ...comp, isDefault: true };
      } else if (user.role === 'user') {
        return { ...comp, isDefault: false };
      }
    }
    return comp;
  });

  // EN: Ensure at least one company has isDefault: true for operational users if companies exist.
  // PT: Garante que pelo menos uma empresa venha com isDefault: true para operadores se houver empresas.
  if (user.role === 'user' && mapped.length > 0 && !mapped.some((c) => c.isDefault)) {
    mapped[0].isDefault = true;
  }

  res.json({ companies: mapped });
});

// POST / - Create company
router.post('/', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const body = req.body || {};

  const legalName = String(body.legalName || '').trim();
  if (!legalName) {
    res.status(400).json({ error: 'A Razão Social é obrigatória.' });
    return;
  }

  const document = String(body.document || '').trim();
  const cleanDoc = document.replace(/\D/g, '');
  if (!cleanDoc || !isValidCNPJ(cleanDoc)) {
    res.status(400).json({ error: 'CNPJ inválido ou obrigatório.' });
    return;
  }

  const countRow = db.prepare('SELECT COUNT(*) as total FROM companies WHERE user_id = ?').get(uid) as { total: number };
  const isFirst = countRow.total === 0;
  const isDefault = isFirst || Boolean(body.isDefault);

  if (isDefault) {
    db.prepare('UPDATE companies SET is_default = 0 WHERE user_id = ?').run(uid);
  }

  const now = new Date().toISOString();
  const id = String(body.id || crypto.randomUUID());

  db.prepare(`
    INSERT INTO companies (
      id, user_id, legal_name, trade_name, document, state_registration,
      municipal_registration, status, email, phone, whatsapp, cep, street,
      number, complement, neighborhood, city, state, logo_data_url, color,
      is_default, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    uid,
    legalName.slice(0, 200),
    String(body.tradeName || '').trim().slice(0, 200),
    document.slice(0, 30),
    String(body.stateRegistration || '').trim().slice(0, 50),
    String(body.municipalRegistration || '').trim().slice(0, 50),
    body.status === 'inactive' && !isDefault ? 'inactive' : 'active',
    String(body.email || '').trim().slice(0, 120),
    String(body.phone || '').trim().slice(0, 40),
    String(body.whatsapp || '').trim().slice(0, 40),
    String(body.cep || '').trim().slice(0, 20),
    String(body.street || '').trim().slice(0, 200),
    String(body.number || '').trim().slice(0, 30),
    String(body.complement || '').trim().slice(0, 100),
    String(body.neighborhood || '').trim().slice(0, 100),
    String(body.city || '').trim().slice(0, 100),
    String(body.state || '').trim().slice(0, 20),
    String(body.logoDataUrl || ''),
    String(body.color || '#0F766E').slice(0, 30),
    isDefault ? 1 : 0,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid);
  res.status(201).json({ company: mapCompany(created) });
});

// PUT /:id - Update company & logo
router.put('/:id', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const id = req.params.id;
  const body = req.body || {};

  const existing = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid) as any;
  if (!existing) {
    res.status(404).json({ error: 'Empresa não encontrada.' });
    return;
  }

  const legalName = body.legalName !== undefined ? String(body.legalName).trim() : existing.legal_name;
  if (!legalName) {
    res.status(400).json({ error: 'A Razão Social é obrigatória.' });
    return;
  }

  let document = existing.document;
  if (body.document !== undefined) {
    const rawDoc = String(body.document).trim();
    const cleanDoc = rawDoc.replace(/\D/g, '');
    if (cleanDoc && !isValidCNPJ(cleanDoc)) {
      res.status(400).json({ error: 'CNPJ inválido.' });
      return;
    }
    document = rawDoc;
  }

  const isDefault = body.isDefault !== undefined ? Boolean(body.isDefault) : Boolean(existing.is_default);

  if (isDefault) {
    db.prepare('UPDATE companies SET is_default = 0 WHERE user_id = ?').run(uid);
  }

  const now = new Date().toISOString();
  const nextStatus = isDefault ? 'active' : (body.status === 'inactive' ? 'inactive' : (body.status === 'active' ? 'active' : existing.status));

  db.prepare(`
    UPDATE companies SET
      legal_name = ?,
      trade_name = ?,
      document = ?,
      state_registration = ?,
      municipal_registration = ?,
      status = ?,
      email = ?,
      phone = ?,
      whatsapp = ?,
      cep = ?,
      street = ?,
      number = ?,
      complement = ?,
      neighborhood = ?,
      city = ?,
      state = ?,
      logo_data_url = ?,
      color = ?,
      is_default = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(
    legalName.slice(0, 200),
    String(body.tradeName !== undefined ? body.tradeName : existing.trade_name).trim().slice(0, 200),
    document.slice(0, 30),
    String(body.stateRegistration !== undefined ? body.stateRegistration : existing.state_registration).trim().slice(0, 50),
    String(body.municipalRegistration !== undefined ? body.municipalRegistration : existing.municipal_registration).trim().slice(0, 50),
    nextStatus,
    String(body.email !== undefined ? body.email : existing.email).trim().slice(0, 120),
    String(body.phone !== undefined ? body.phone : existing.phone).trim().slice(0, 40),
    String(body.whatsapp !== undefined ? body.whatsapp : existing.whatsapp).trim().slice(0, 40),
    String(body.cep !== undefined ? body.cep : existing.cep).trim().slice(0, 20),
    String(body.street !== undefined ? body.street : existing.street).trim().slice(0, 200),
    String(body.number !== undefined ? body.number : existing.number).trim().slice(0, 30),
    String(body.complement !== undefined ? body.complement : existing.complement).trim().slice(0, 100),
    String(body.neighborhood !== undefined ? body.neighborhood : existing.neighborhood).trim().slice(0, 100),
    String(body.city !== undefined ? body.city : existing.city).trim().slice(0, 100),
    String(body.state !== undefined ? body.state : existing.state).trim().slice(0, 20),
    String(body.logoDataUrl !== undefined ? body.logoDataUrl : existing.logo_data_url),
    String(body.color !== undefined ? body.color : existing.color).slice(0, 30),
    isDefault ? 1 : 0,
    now,
    id,
    uid
  );

  const updated = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid);
  res.json({ company: mapCompany(updated) });
});

// PATCH /:id/status - Toggle active/inactive
router.patch('/:id/status', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid) as any;
  if (!existing) {
    res.status(404).json({ error: 'Empresa não encontrada.' });
    return;
  }

  const requestedStatus = req.body?.status;
  const nextStatus = requestedStatus ? (requestedStatus === 'inactive' ? 'inactive' : 'active') : (existing.status === 'active' ? 'inactive' : 'active');

  if (Boolean(existing.is_default) && nextStatus === 'inactive') {
    res.status(400).json({ error: 'Não é possível inativar a empresa padrão. Defina outra empresa como padrão antes.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE companies SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(nextStatus, now, id, uid);

  const updated = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid);
  res.json({ company: mapCompany(updated) });
});

// PATCH /:id/default - Set as default company (and ensure active)
router.patch('/:id/default', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid) as any;
  if (!existing) {
    res.status(404).json({ error: 'Empresa não encontrada.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE companies SET is_default = 0 WHERE user_id = ?').run(uid);
  db.prepare("UPDATE companies SET is_default = 1, status = 'active', updated_at = ? WHERE id = ? AND user_id = ?").run(now, id, uid);

  const updated = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid);
  res.json({ company: mapCompany(updated) });
});

// DELETE /:id - Delete company (cannot delete if only 1 remaining)
router.delete('/:id', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const id = req.params.id;

  const existing = db.prepare('SELECT * FROM companies WHERE id = ? AND user_id = ?').get(id, uid) as any;
  if (!existing) {
    res.status(404).json({ error: 'Empresa não encontrada.' });
    return;
  }

  const countRow = db.prepare('SELECT COUNT(*) as total FROM companies WHERE user_id = ?').get(uid) as { total: number };
  if (countRow.total <= 1) {
    res.status(400).json({ error: 'Não é possível excluir a única empresa cadastrada.' });
    return;
  }

  // If deleted company was default, make another active company default
  if (Boolean(existing.is_default)) {
    db.prepare(`
      UPDATE companies SET is_default = 1, status = 'active'
      WHERE id = (
        SELECT id FROM companies
        WHERE user_id = ? AND id != ?
        ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END, created_at ASC
        LIMIT 1
      )
    `).run(uid, id);
  }

  db.prepare('DELETE FROM companies WHERE id = ? AND user_id = ?').run(id, uid);
  res.json({ ok: true });
});

export default router;
