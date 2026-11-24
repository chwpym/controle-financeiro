/**
 * server/routes/license.ts
 *
 * EN: REST endpoints and Express middleware for Phase 10.2 System Licensing:
 *     - GET  /api/license/status              (Authenticated user's active company license status)
 *     - POST /api/license/activate            (Validates & activates a signed release code for a CNPJ)
 *     - GET  /api/admin/licenses              (Master/Admin view of all companies and license expiration)
 *     - POST /api/admin/licenses/renew        (1-click renewal adding +N days)
 *     - POST /api/admin/licenses/generate-code(Generates emergency release code for customer support)
 *     - requireActiveLicense                  (Middleware blocking financial write mutations when expired)
 *
 * PT: Endpoints REST e middleware Express do Sistema de Licenciamento (Fase 10.2):
 *     - GET  /api/license/status              (Consulta status da licença da empresa ativa do usuário)
 *     - POST /api/license/activate            (Valida e ativa código criptográfico de liberação por CNPJ)
 *     - GET  /api/admin/licenses              (Listagem Master/Admin de todas as empresas e vencimentos)
 *     - POST /api/admin/licenses/renew        (Renovação rápida com 1 clique somando +N dias)
 *     - POST /api/admin/licenses/generate-code(Geração de código de emergência para envio ao cliente)
 *     - requireActiveLicense                  (Middleware que bloqueia gravações financeiras se expirado)
 */

import crypto from 'node:crypto';
import express from 'express';
import type { NextFunction, Response } from 'express';
import {
  db,
  ensureLicenseForCompany,
  renewCompanyLicense,
  seedDefaultCompanyForUser,
  type DbSystemLicense,
} from '../db';
import {
  addDaysToISODate,
  calculateDaysRemaining,
  generateLicenseCode,
  getSystemDateISO,
  normalizeLicenseCnpj,
  validateLicenseCode,
} from '../licenseEngine';
import {
  requireAuth,
  requireMasterOrAdmin,
  type AuthedRequest,
  type DbUser,
} from '../middleware/auth';

export const licenseRouter = express.Router();
export const adminLicenseRouter = express.Router();

export const EXPIRED_LICENSE_ERROR_MESSAGE =
  'Licença de uso expirada. Renove sua assinatura ou insira o código em Liberação do Sistema para continuar lançando.';

interface CompanyBasicRow {
  id: string;
  user_id: string;
  legal_name: string;
  trade_name: string;
  document: string;
  status: string;
  is_default: number;
}

/**
 * EN: Formats a raw 14-char CNPJ string into `XX.XXX.XXX/XXXX-XX` when possible.
 * PT: Formata uma string de CNPJ de 14 caracteres no padrão `XX.XXX.XXX/XXXX-XX` quando aplicável.
 */
function formatCnpjDisplay(raw: string): string {
  const clean = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 14) return raw || '00.000.000/0000-00';
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

/**
 * EN: Resolves the active/target company for an authenticated user.
 *     Accepts optional `companyId` query/body override if authorized; otherwise resolves the user's default company.
 * PT: Resolve a empresa ativa/alvo do usuário autenticado.
 *     Aceita `companyId` opcional (se o usuário tiver acesso) ou retorna a empresa padrão do usuário.
 */
export function resolveActiveCompanyForUser(
  user: DbUser,
  requestedCompanyId?: string | null
): CompanyBasicRow | null {
  const isPrivileged = user.role === 'master' || user.role === 'admin';

  if (requestedCompanyId && requestedCompanyId !== 'all') {
    if (isPrivileged) {
      const found = db
        .prepare('SELECT id, user_id, legal_name, trade_name, document, status, is_default FROM companies WHERE id = ?')
        .get(requestedCompanyId) as CompanyBasicRow | undefined;
      if (found) return found;
    } else {
      const found = db
        .prepare(`
          SELECT id, user_id, legal_name, trade_name, document, status, is_default
          FROM companies
          WHERE id = ?
            AND (
              user_id = ?
              OR id IN (SELECT company_id FROM user_company_access WHERE user_id = ?)
            )
        `)
        .get(requestedCompanyId, user.id, user.id) as CompanyBasicRow | undefined;
      if (found) return found;
    }
  }

  if (user.default_company_id) {
    const defComp = db
      .prepare('SELECT id, user_id, legal_name, trade_name, document, status, is_default FROM companies WHERE id = ?')
      .get(user.default_company_id) as CompanyBasicRow | undefined;
    if (defComp) return defComp;
  }

  if (isPrivileged) {
    let comp = db
      .prepare(`
        SELECT id, user_id, legal_name, trade_name, document, status, is_default
        FROM companies
        WHERE user_id = ?
        ORDER BY is_default DESC, created_at ASC
        LIMIT 1
      `)
      .get(user.id) as CompanyBasicRow | undefined;

    if (!comp) {
      comp = db
        .prepare(`
          SELECT id, user_id, legal_name, trade_name, document, status, is_default
          FROM companies
          ORDER BY is_default DESC, created_at ASC
          LIMIT 1
        `)
        .get() as CompanyBasicRow | undefined;
    }

    if (!comp) {
      const seededId = seedDefaultCompanyForUser(user.id);
      comp = db
        .prepare('SELECT id, user_id, legal_name, trade_name, document, status, is_default FROM companies WHERE id = ?')
        .get(seededId) as CompanyBasicRow | undefined;
    }
    return comp || null;
  }

  let opComp = db
    .prepare(`
      SELECT id, user_id, legal_name, trade_name, document, status, is_default
      FROM companies
      WHERE status = 'active'
        AND (
          id IN (SELECT company_id FROM user_company_access WHERE user_id = ?)
          OR user_id = ?
        )
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1
    `)
    .get(user.id, user.id) as CompanyBasicRow | undefined;

  if (!opComp) {
    const seededId = seedDefaultCompanyForUser(user.id);
    opComp = db
      .prepare('SELECT id, user_id, legal_name, trade_name, document, status, is_default FROM companies WHERE id = ?')
      .get(seededId) as CompanyBasicRow | undefined;
  }

  return opComp || null;
}

/**
 * EN: Computes the license status object for a given company row, provisioning a default 365-day license if none exists.
 * PT: Calcula o objeto completo de status da licença para uma empresa, semeando 365 dias caso ainda não exista registro.
 */
export function buildCompanyLicenseStatus(company: CompanyBasicRow) {
  const lic = ensureLicenseForCompany(company.id, 365)!;
  const systemDate = getSystemDateISO();
  const daysRemaining = calculateDaysRemaining(lic.valid_until, systemDate);
  const isActive = lic.is_active !== 0;
  const isExpired = !isActive || daysRemaining < 0;
  const isValid = isActive && !isExpired;
  const displayCnpj = company.document
    ? formatCnpjDisplay(company.document)
    : formatCnpjDisplay(lic.cnpj);

  return {
    companyId: company.id,
    companyName: company.trade_name || company.legal_name,
    legalName: company.legal_name,
    cnpj: displayCnpj,
    isValid,
    isExpired,
    daysRemaining,
    validUntil: lic.valid_until,
    systemDate,
  };
}

/**
 * EN: Checks whether a specific company's license is currently expired.
 * PT: Verifica se a licença de uma empresa específica encontra-se expirada (`daysRemaining < 0` ou inativa).
 */
export function isCompanyLicenseExpired(companyId: string): boolean {
  const lic = ensureLicenseForCompany(companyId, 365);
  if (!lic) return false;
  if (lic.is_active === 0) return true;
  const daysRemaining = calculateDaysRemaining(lic.valid_until, getSystemDateISO());
  return daysRemaining < 0;
}

// ============================================================================
// Authenticated User License Routes (/api/license/*)
// Rotas de Licenciamento para Usuários Autenticados (/api/license/*)
// ============================================================================

licenseRouter.use(requireAuth);

/**
 * GET /api/license/status
 * EN: Returns the license status of the user's active company (supports optional `?companyId=` query param).
 * PT: Retorna o status da licença da empresa ativa do usuário (suporta parâmetro opcional `?companyId=`).
 */
licenseRouter.get('/status', (req: AuthedRequest, res: Response): void => {
  const user = req.authUser!;
  const requestedCompanyId = req.query.companyId ? String(req.query.companyId) : null;
  const company = resolveActiveCompanyForUser(user, requestedCompanyId);

  if (!company) {
    const systemDate = getSystemDateISO();
    const validUntil = addDaysToISODate(systemDate, 365);
    res.json({
      isValid: true,
      isExpired: false,
      daysRemaining: 365,
      validUntil,
      systemDate,
      cnpj: '00.000.000/0000-00',
      companyName: 'Minha Empresa Principal',
    });
    return;
  }

  res.json(buildCompanyLicenseStatus(company));
});

/**
 * POST /api/license/activate
 * EN: Validates a signed release code against the provided CNPJ and activates/updates `system_licenses`.
 * PT: Valida o código de liberação assinado contra o CNPJ informado e persiste a nova validade em `system_licenses`.
 */
licenseRouter.post('/activate', (req: AuthedRequest, res: Response): void => {
  const user = req.authUser!;
  const rawCnpj = String(req.body?.cnpj || '').trim();
  const rawKey = String(req.body?.licenseKey || '').trim();
  const requestedCompanyId = req.body?.companyId ? String(req.body.companyId) : null;

  if (!rawCnpj || !rawKey) {
    res.status(400).json({
      error: 'Código de liberação inválido ou incompatível com o CNPJ informado.',
    });
    return;
  }

  const validation = validateLicenseCode(rawCnpj, rawKey);
  if (!validation.valid || !validation.validUntil) {
    res.status(400).json({
      error: 'Código de liberação inválido ou incompatível com o CNPJ informado.',
    });
    return;
  }

  const cleanCnpj = normalizeLicenseCnpj(rawCnpj);

  // EN: Locate target company by companyId or matching normalized CNPJ, falling back to user's active company.
  // PT: Localiza a empresa alvo pelo companyId ou pelo CNPJ normalizado, com fallback para a empresa ativa do usuário.
  let targetCompany: CompanyBasicRow | null = null;

  if (requestedCompanyId) {
    targetCompany = resolveActiveCompanyForUser(user, requestedCompanyId);
  }

  if (!targetCompany) {
    const allCompanies = db
      .prepare('SELECT id, user_id, legal_name, trade_name, document, status, is_default FROM companies')
      .all() as CompanyBasicRow[];
    targetCompany =
      allCompanies.find((c) => normalizeLicenseCnpj(c.document) === cleanCnpj) ||
      resolveActiveCompanyForUser(user, null);
  }

  if (!targetCompany) {
    res.status(404).json({ error: 'Empresa não encontrada para ativação da licença.' });
    return;
  }

  const now = new Date().toISOString();
  const formattedKey = generateLicenseCode(cleanCnpj, validation.validUntil);

  const existing = db
    .prepare('SELECT * FROM system_licenses WHERE company_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(targetCompany.id) as DbSystemLicense | undefined;

  if (existing) {
    db.prepare(`
      UPDATE system_licenses
      SET cnpj = ?, license_key = ?, valid_until = ?, is_active = 1, updated_at = ?
      WHERE id = ?
    `).run(cleanCnpj, formattedKey, validation.validUntil, now, existing.id);
  } else {
    db.prepare(`
      INSERT INTO system_licenses (
        id, company_id, cnpj, license_key, valid_until, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(crypto.randomUUID(), targetCompany.id, cleanCnpj, formattedKey, validation.validUntil, now, now);
  }

  const daysRemaining = calculateDaysRemaining(validation.validUntil, getSystemDateISO());

  res.json({
    ok: true,
    message: 'Sistema liberado com sucesso!',
    validUntil: validation.validUntil,
    daysRemaining,
  });
});

// ============================================================================
// Master / Admin License Management Routes (/api/admin/licenses*)
// Rotas Administrativas de Gestão de Licenças (/api/admin/licenses*)
// ============================================================================

adminLicenseRouter.use(requireAuth);
adminLicenseRouter.use(requireMasterOrAdmin);

/**
 * GET /api/admin/licenses
 * EN: Lists all companies in the system along with their license expiration, remaining days, and status badge kind.
 * PT: Retorna todas as empresas do sistema com ID, Razão Social, CNPJ, status da licença, validade e dias restantes.
 */
adminLicenseRouter.get('/', (_req: AuthedRequest, res: Response): void => {
  const companies = db
    .prepare(`
      SELECT id, user_id, legal_name, trade_name, document, status, is_default
      FROM companies
      ORDER BY is_default DESC, trade_name ASC, legal_name ASC
    `)
    .all() as CompanyBasicRow[];

  const systemDate = getSystemDateISO();

  const licenses = companies.map((comp) => {
    const lic = ensureLicenseForCompany(comp.id, 365)!;
    const daysRemaining = calculateDaysRemaining(lic.valid_until, systemDate);
    const isActive = lic.is_active !== 0;
    const isExpired = !isActive || daysRemaining < 0;
    const statusLabel: 'active' | 'expiring_soon' | 'expired' = isExpired
      ? 'expired'
      : daysRemaining <= 5
        ? 'expiring_soon'
        : 'active';

    return {
      companyId: comp.id,
      legalName: comp.legal_name,
      tradeName: comp.trade_name || comp.legal_name,
      cnpj: comp.document ? formatCnpjDisplay(comp.document) : formatCnpjDisplay(lic.cnpj),
      validUntil: lic.valid_until,
      daysRemaining,
      isValid: !isExpired,
      isExpired,
      licenseStatus: statusLabel,
      updatedAt: lic.updated_at,
    };
  });

  res.json({ licenses, systemDate });
});

/**
 * POST /api/admin/licenses/renew
 * EN: 1-click renewal by Master/Admin adding `days` (e.g. +30 days) to the company's license.
 * PT: Renovação rápida com 1 clique pelo Master/Admin somando `days` (ex: +30 dias) à licença da empresa.
 */
adminLicenseRouter.post('/renew', (req: AuthedRequest, res: Response): void => {
  const companyId = String(req.body?.companyId || '').trim();
  const days = Math.max(1, Math.trunc(Number(req.body?.days) || 30));

  if (!companyId) {
    res.status(400).json({ error: 'ID da empresa é obrigatório.' });
    return;
  }

  const company = db
    .prepare('SELECT id, user_id, legal_name, trade_name, document, status, is_default FROM companies WHERE id = ?')
    .get(companyId) as CompanyBasicRow | undefined;

  if (!company) {
    res.status(404).json({ error: 'Empresa não encontrada.' });
    return;
  }

  renewCompanyLicense(companyId, days);
  const status = buildCompanyLicenseStatus(company);
  res.json(status);
});

/**
 * POST /api/admin/licenses/generate-code
 * EN: Generates a signed emergency release key for a company valid for `days` days (from current validUntil if future, or today).
 * PT: Gera um código de liberação criptográfico assinado para a empresa com a quantidade de dias solicitada,
 *     retornando a chave formatada para envio ao cliente via WhatsApp/Suporte.
 */
adminLicenseRouter.post('/generate-code', (req: AuthedRequest, res: Response): void => {
  const companyId = String(req.body?.companyId || '').trim();
  const days = Math.max(1, Math.trunc(Number(req.body?.days) || 30));

  if (!companyId) {
    res.status(400).json({ error: 'ID da empresa é obrigatório.' });
    return;
  }

  const company = db
    .prepare('SELECT id, document, legal_name, trade_name FROM companies WHERE id = ?')
    .get(companyId) as { id: string; document: string; legal_name: string; trade_name: string } | undefined;

  if (!company) {
    res.status(404).json({ error: 'Empresa não encontrada.' });
    return;
  }

  const today = getSystemDateISO();
  const currentLic = ensureLicenseForCompany(company.id, 365);
  const currentRemaining = currentLic ? calculateDaysRemaining(currentLic.valid_until, today) : -1;
  const baseDate = currentLic && currentRemaining >= 0 ? currentLic.valid_until : today;
  const validUntil = addDaysToISODate(baseDate, days);
  const cleanCnpj = normalizeLicenseCnpj(company.document);
  const licenseKey = generateLicenseCode(cleanCnpj, validUntil);

  res.json({
    licenseKey,
    validUntil,
    cnpj: company.document ? formatCnpjDisplay(company.document) : formatCnpjDisplay(cleanCnpj),
    companyName: company.trade_name || company.legal_name,
  });
});

// ============================================================================
// Expiration Protection Middleware (`requireActiveLicense`)
// Middleware de Proteção contra Expiração (`requireActiveLicense`)
// ============================================================================

/**
 * EN: Blocks financial write mutations (`POST /batch`, `PUT /:id`, `DELETE /:id`, `POST /batch-delete`)
 *     with HTTP 403 when the target transaction's company (or user's active company) has an expired license.
 *     Read (`GET`) operations remain 100% open for historical statements and reports.
 * PT: Bloqueia mutações financeiras (`POST /batch`, `PUT /:id`, `DELETE /:id`, `POST /batch-delete`)
 *     retornando HTTP 403 caso a licença da empresa do lançamento (ou da empresa ativa do usuário) esteja vencida.
 *     Consultas (`GET`) permanecem 100% liberadas para visualização de extratos e relatórios.
 */
export function requireActiveLicense(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ error: 'Sessão não autenticada.' });
    return;
  }

  const candidateCompanyIds = new Set<string>();

  // 1. Batch items payload (`POST /batch`)
  if (Array.isArray(req.body?.items)) {
    for (const item of req.body.items) {
      if (item?.companyId) {
        candidateCompanyIds.add(String(item.companyId));
      }
    }
  }

  // 2. Single item payload (`PUT /:id`)
  if (req.body?.companyId) {
    candidateCompanyIds.add(String(req.body.companyId));
  }

  // 3. Existing transaction lookup (`PUT /:id` or `DELETE /:id`)
  if (req.params?.id) {
    const existingTx = db
      .prepare('SELECT company_id FROM transactions WHERE id = ? AND user_id = ?')
      .get(req.params.id, user.id) as { company_id: string | null } | undefined;
    if (existingTx?.company_id) {
      candidateCompanyIds.add(existingTx.company_id);
    }
  }

  // 4. Batch delete IDs (`POST /batch-delete`)
  if (Array.isArray(req.body?.ids) && req.body.ids.length > 0) {
    const stmt = db.prepare('SELECT company_id FROM transactions WHERE id = ? AND user_id = ?');
    for (const rawId of req.body.ids) {
      const row = stmt.get(String(rawId), user.id) as { company_id: string | null } | undefined;
      if (row?.company_id) {
        candidateCompanyIds.add(row.company_id);
      }
    }
  }

  // 5. Group delete (`DELETE /group/:groupId`)
  if (req.params?.groupId) {
    const rows = db
      .prepare('SELECT DISTINCT company_id FROM transactions WHERE installment_group_id = ? AND user_id = ?')
      .all(req.params.groupId, user.id) as { company_id: string | null }[];
    for (const r of rows) {
      if (r.company_id) candidateCompanyIds.add(r.company_id);
    }
  }

  // 6. Fallback to user's active/default company if transaction had no explicit companyId
  if (candidateCompanyIds.size === 0) {
    const activeComp = resolveActiveCompanyForUser(user, null);
    if (activeComp) {
      candidateCompanyIds.add(activeComp.id);
    }
  }

  for (const cid of candidateCompanyIds) {
    if (isCompanyLicenseExpired(cid)) {
      res.status(403).json({ error: EXPIRED_LICENSE_ERROR_MESSAGE });
      return;
    }
  }

  next();
}
