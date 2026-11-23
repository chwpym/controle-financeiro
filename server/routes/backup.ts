import crypto from 'node:crypto';
import express from 'express';
import type { Response } from 'express';
import { db, seedDefaultCompanyForUser } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/export', (req: AuthedRequest, res: Response): void => {
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
      issue_date as issueDate,
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
    issueDate: (row.issueDate as string) || null,
    isRecurring: Boolean(row.isRecurring),
    recurrenceInterval: row.recurrenceInterval || null,
  }));

  const rawCompanies = db.prepare(`
    SELECT id, user_id as userId, legal_name as legalName, trade_name as tradeName,
      document, state_registration as stateRegistration,
      municipal_registration as municipalRegistration, status,
      email, phone, whatsapp, cep, street, number, complement,
      neighborhood, city, state, logo_data_url as logoDataUrl,
      color, is_default as isDefault, created_at as createdAt, updated_at as updatedAt
    FROM companies WHERE user_id = ? ORDER BY is_default DESC, created_at ASC
  `).all(uid) as Array<Record<string, unknown>>;

  const companies = rawCompanies.map((c) => ({
    ...c,
    isDefault: Boolean(c.isDefault),
  }));

  res.json({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    categories,
    contacts,
    transactions,
    companies,
  });
});

router.post('/restore', (req: AuthedRequest, res: Response): void => {
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
        category_id, contact_id, document_number, issue_date, installment_group_id,
        installment_number, installment_total, is_recurring, recurrence_interval,
        notes, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        t.issueDate ? String(t.issueDate).slice(0, 10) : null,
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

    if (Array.isArray(payload.companies) && payload.companies.length > 0) {
      const upsertCompany = db.prepare(`
        INSERT OR REPLACE INTO companies (
          id, user_id, legal_name, trade_name, document, state_registration,
          municipal_registration, status, email, phone, whatsapp, cep, street,
          number, complement, neighborhood, city, state, logo_data_url,
          color, is_default, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const comp of payload.companies) {
        upsertCompany.run(
          String(comp.id || crypto.randomUUID()),
          uid,
          String(comp.legalName || 'Minha Empresa'),
          String(comp.tradeName || ''),
          String(comp.document || ''),
          String(comp.stateRegistration || ''),
          String(comp.municipalRegistration || ''),
          comp.status === 'inactive' ? 'inactive' : 'active',
          String(comp.email || ''),
          String(comp.phone || ''),
          String(comp.whatsapp || ''),
          String(comp.cep || ''),
          String(comp.street || ''),
          String(comp.number || ''),
          String(comp.complement || ''),
          String(comp.neighborhood || ''),
          String(comp.city || ''),
          String(comp.state || ''),
          String(comp.logoDataUrl || ''),
          String(comp.color || '#0F766E'),
          comp.isDefault ? 1 : 0,
          String(comp.createdAt || now),
          String(comp.updatedAt || now)
        );
      }
    }
  });

  restoreTx();
  seedDefaultCompanyForUser(uid);
  res.json({ ok: true });
});

export default router;
