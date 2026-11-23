import crypto from 'node:crypto';
import express from 'express';
import type { Response } from 'express';
import { db } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = express.Router();

router.use(requireAuth);

router.get('/', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const rawTransactions = db.prepare(`
    SELECT id, user_id as userId, company_id as companyId, type, description, amount_cents as amountCents,
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
    companyId: (row.companyId as string) || null,
    discountCents: Number(row.discountCents || 0),
    interestCents: Number(row.interestCents || 0),
    issueDate: (row.issueDate as string) || null,
    isRecurring: Boolean(row.isRecurring),
    recurrenceInterval: row.recurrenceInterval || null,
  }));

  res.json({ transactions });
});

router.post('/batch', (req: AuthedRequest, res: Response): void => {
  const uid = req.authUser!.id;
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) {
    res.status(400).json({ error: 'Nenhum lançamento enviado.' });
    return;
  }

  const upsert = db.prepare(`
    INSERT INTO transactions (
      id, user_id, company_id, type, description, amount_cents, discount_cents, interest_cents,
      due_date, paid_at, status, payment_method,
      category_id, contact_id, document_number, issue_date, installment_group_id,
      installment_number, installment_total, is_recurring, recurrence_interval,
      notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      company_id = excluded.company_id,
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
      issue_date = excluded.issue_date,
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
        item.companyId ? String(item.companyId) : null,
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
        String(item.documentNumber || '').slice(0, 240),
        item.issueDate ? String(item.issueDate).slice(0, 10) : null,
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

router.put('/:id', (req: AuthedRequest, res: Response): void => {
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
      id, user_id, company_id, type, description, amount_cents, discount_cents, interest_cents,
      due_date, paid_at, status, payment_method,
      category_id, contact_id, document_number, issue_date, installment_group_id,
      installment_number, installment_total, is_recurring, recurrence_interval,
      notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      company_id = excluded.company_id,
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
      issue_date = excluded.issue_date,
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
    item.companyId ? String(item.companyId) : null,
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
    String(item.documentNumber || '').slice(0, 240),
    item.issueDate ? String(item.issueDate).slice(0, 10) : null,
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

router.post('/batch-delete', (req: AuthedRequest, res: Response): void => {
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

router.delete('/:id', (req: AuthedRequest, res: Response): void => {
  db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.authUser!.id);
  res.json({ ok: true });
});

router.delete('/group/:groupId', (req: AuthedRequest, res: Response): void => {
  db.prepare('DELETE FROM transactions WHERE installment_group_id = ? AND user_id = ?').run(
    req.params.groupId,
    req.authUser!.id
  );
  res.json({ ok: true });
});

export default router;
