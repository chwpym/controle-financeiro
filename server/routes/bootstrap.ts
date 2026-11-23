import express from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import { requireAuth, type AuthedRequest } from '../middleware/auth';

const router = express.Router();

function getSnapshotData(uid: string) {
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

  const rawCompanies = db.prepare(`
    SELECT id, user_id as userId, legal_name as legalName, trade_name as tradeName,
      document, state_registration as stateRegistration,
      municipal_registration as municipalRegistration, status, email, phone,
      whatsapp, cep, street, number, complement, neighborhood, city, state,
      logo_data_url as logoDataUrl, color, is_default as isDefault,
      created_at as createdAt, updated_at as updatedAt
    FROM companies WHERE user_id = ? ORDER BY is_default DESC, trade_name ASC
  `).all(uid) as Array<Record<string, unknown>>;

  const companies = rawCompanies.map((c) => ({
    ...c,
    isDefault: Boolean(c.isDefault),
  }));

  return {
    categories,
    contacts,
    transactions,
    companies,
    serverTime: new Date().toISOString(),
  };
}

// Support both /api/data/snapshot (active frontend) and /api/bootstrap
router.get('/data/snapshot', requireAuth, (req: AuthedRequest, res: Response): void => {
  res.json(getSnapshotData(req.authUser!.id));
});

router.get('/bootstrap', requireAuth, (req: AuthedRequest, res: Response): void => {
  res.json(getSnapshotData(req.authUser!.id));
});

// Lookup CEP via external APIs
router.get('/lookup/cep/:cep', requireAuth, async (req: Request, res: Response): Promise<void> => {
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

// Lookup CNPJ via external APIs
router.get('/lookup/cnpj/:cnpj', requireAuth, async (req: Request, res: Response): Promise<void> => {
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

export default router;
