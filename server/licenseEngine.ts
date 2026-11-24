/**
 * server/licenseEngine.ts
 *
 * EN: Cryptographic license engine using HMAC-SHA256 to issue and verify offline/emergency
 *     system release codes bound to a company's 14-character alphanumeric CNPJ and expiration date.
 * PT: Motor criptográfico de licenciamento utilizando HMAC-SHA256 para emitir e validar chaves
 *     de liberação do sistema vinculadas ao CNPJ alfanumérico (14 caracteres) e à data de validade.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_DIR } from './config';

/**
 * EN: Base32 alphabet without ambiguous characters (0/O/1/I removed? Wait: we use unambiguous
 *     32-char uppercase alphanumeric set 0-9 + A-V so any 5-bit group maps 1-to-1 cleanly).
 * PT: Alfabeto Base32 de 32 caracteres alfanuméricos maiúsculos (0-9 e A-V) para codificar e
 *     decodificar datas e assinaturas em blocos limpos de caracteres maiúsculos.
 */
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

/**
 * EN: Epoch base date (2020-01-01 UTC) used to encode `validUntil` into a compact 4-char Base32
 *     day offset (supports up to 32^4 = 1,048,576 days, ~2,870 years).
 * PT: Data base de época (2020-01-01 UTC) usada para converter `validUntil` em um deslocamento
 *     compacto de 4 caracteres Base32 (suporta mais de 1 milhão de dias, ~2.870 anos).
 */
const EPOCH_MS = Date.UTC(2020, 0, 1);
const MS_PER_DAY = 86_400_000;

/**
 * EN: Resolves the persistent HMAC secret shared with authentication (`SESSION_SECRET` or `data/.auth_secret`).
 * PT: Obtém o segredo HMAC persistente do servidor (`SESSION_SECRET` ou arquivo `data/.auth_secret`),
 *     evitando dependência circular com `db.ts` e `middleware/auth.ts`.
 */
export function resolveLicenseSecret(overrideSecret?: string): string {
  if (overrideSecret) return overrideSecret;
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const secretFile = path.join(DATA_DIR, '.auth_secret');
  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }
  const generated = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretFile, generated, { mode: 0o600 });
  return generated;
}

/**
 * EN: Normalizes a CNPJ into uppercase alphanumeric characters (supports both numeric and RFB alphanumeric CNPJs).
 *     If the company has no CNPJ configured yet, falls back to a deterministic 14-char placeholder (`00000000000000`).
 * PT: Normaliza o CNPJ mantendo apenas caracteres alfanuméricos maiúsculos (suporta CNPJ numérico tradicional
 *     e o novo CNPJ alfanumérico da Receita Federal). Caso esteja vazio, usa fallback de 14 zeros.
 */
export function normalizeLicenseCnpj(cnpj: string | null | undefined): string {
  const clean = String(cnpj || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (clean.length === 0) {
    return '00000000000000';
  }
  return clean.slice(0, 14);
}

/**
 * EN: Formats today's local server date as ISO `YYYY-MM-DD`.
 * PT: Retorna a data local atual do servidor no formato ISO `YYYY-MM-DD`.
 */
export function getSystemDateISO(referenceDate: Date = new Date()): string {
  const y = referenceDate.getFullYear();
  const m = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const d = String(referenceDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * EN: Adds a number of days to a `YYYY-MM-DD` date string and returns the resulting `YYYY-MM-DD`.
 * PT: Soma uma quantidade de dias a uma data `YYYY-MM-DD` e retorna a nova data `YYYY-MM-DD`.
 */
export function addDaysToISODate(isoDate: string, daysToAdd: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) {
    throw new Error('Data ISO inválida. Use o formato YYYY-MM-DD.');
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const target = new Date(Date.UTC(y, m - 1, d + Math.trunc(daysToAdd)));
  const ry = target.getUTCFullYear();
  const rm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const rd = String(target.getUTCDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

/**
 * EN: Calculates integer days remaining between `systemDate` (today) and `validUntil`.
 *     - Positive (> 0): future expiration
 *     - Zero (0): expires today (still valid today)
 *     - Negative (< 0): expired
 * PT: Calcula a diferença inteira em dias entre `systemDate` (hoje) e `validUntil`.
 *     - Positivo (> 0): vence no futuro
 *     - Zero (0): vence hoje (ainda válida no dia de hoje)
 *     - Negativo (< 0): licença expirada
 */
export function calculateDaysRemaining(
  validUntil: string,
  systemDate: string = getSystemDateISO()
): number {
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(systemDate.slice(0, 10));
  const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(validUntil.slice(0, 10));
  if (!m1 || !m2) return -1;
  const startUtc = Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const endUtc = Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  return Math.round((endUtc - startUtc) / MS_PER_DAY);
}

/**
 * EN: Encodes an ISO `YYYY-MM-DD` date into a 4-character Base32 token.
 * PT: Codifica uma data ISO `YYYY-MM-DD` em um bloco compacto de 4 caracteres Base32.
 */
function encodeDateToken(validUntil: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(validUntil.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const checkDate = new Date(utc);
  if (
    checkDate.getUTCFullYear() !== year ||
    checkDate.getUTCMonth() !== month - 1 ||
    checkDate.getUTCDate() !== day
  ) {
    return null;
  }

  const dayOffset = Math.round((utc - EPOCH_MS) / MS_PER_DAY);
  if (dayOffset < 0 || dayOffset >= 32 ** 4) return null;

  let rem = dayOffset;
  let chars = '';
  for (let i = 0; i < 4; i++) {
    chars = ALPHABET[rem % 32] + chars;
    rem = Math.floor(rem / 32);
  }
  return chars;
}

/**
 * EN: Decodes a 4-character Base32 date token back into an ISO `YYYY-MM-DD` string.
 * PT: Decodifica o bloco de 4 caracteres Base32 de volta para a data ISO `YYYY-MM-DD`.
 */
function decodeDateToken(token: string): string | null {
  if (token.length !== 4) return null;
  let dayOffset = 0;
  for (let i = 0; i < 4; i++) {
    const idx = ALPHABET.indexOf(token[i]);
    if (idx === -1) return null;
    dayOffset = dayOffset * 32 + idx;
  }
  const target = new Date(EPOCH_MS + dayOffset * MS_PER_DAY);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, '0');
  const d = String(target.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * EN: Computes a 12-character uppercase Base32 HMAC-SHA256 signature for `${cleanCnpj}:${validUntil}`.
 * PT: Calcula uma assinatura HMAC-SHA256 de 12 caracteres alfanuméricos maiúsculos sobre `${cleanCnpj}:${validUntil}`.
 */
function computeSignature12(cleanCnpj: string, validUntil: string, secret?: string): string {
  const resolvedSecret = resolveLicenseSecret(secret);
  const digest = crypto
    .createHmac('sha256', resolvedSecret)
    .update(`${cleanCnpj}:${validUntil}`)
    .digest();

  // EN: Convert first 12 bytes into 12 deterministic Base32 characters (each byte & 31 -> ALPHABET).
  // PT: Converte os primeiros 12 bytes do digest em 12 caracteres alfanuméricos determinísticos.
  let sig = '';
  for (let i = 0; i < 12; i++) {
    sig += ALPHABET[digest[i] & 31];
  }
  return sig;
}

/**
 * EN: Formats a 16-character alphanumeric payload into 4 readable 4-char blocks (`XXXX-XXXX-XXXX-XXXX`).
 * PT: Formata 16 caracteres alfanuméricos em 4 blocos legíveis separados por hífen (`XXXX-XXXX-XXXX-XXXX`).
 */
export function formatLicenseBlocks(raw16: string): string {
  const clean = raw16.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join('-');
}

/**
 * EN: Generates a signed 16-character license key formatted in 4 blocks (`XXXX-XXXX-XXXX-XXXX`).
 *     - Characters 1..4: Encoded `validUntil` expiration date
 *     - Characters 5..16: 12-char HMAC-SHA256 cryptographic signature bound to `${cleanCnpj}:${validUntil}`
 * PT: Gera um código de liberação assinado de 16 caracteres alfanuméricos maiúsculos (`XXXX-XXXX-XXXX-XXXX`).
 *     - Caracteres 1..4: Data de expiração `validUntil` codificada em Base32
 *     - Caracteres 5..16: Assinatura matemática HMAC-SHA256 vinculada a `${cleanCnpj}:${validUntil}`
 */
export function generateLicenseCode(
  cnpj: string,
  validUntil: string,
  secret?: string
): string {
  const cleanCnpj = normalizeLicenseCnpj(cnpj);
  if (cleanCnpj.length !== 14) {
    throw new Error('CNPJ deve conter 14 caracteres alfanuméricos para gerar a licença.');
  }

  const dateToken = encodeDateToken(validUntil);
  if (!dateToken) {
    throw new Error('Data de validade inválida. Informe no formato YYYY-MM-DD.');
  }

  const sig12 = computeSignature12(cleanCnpj, validUntil.trim(), secret);
  return formatLicenseBlocks(`${dateToken}${sig12}`);
}

export interface LicenseValidationResult {
  valid: boolean;
  validUntil?: string;
  daysRemaining?: number;
  error?: string;
}

/**
 * EN: Validates a license release code against the given CNPJ and current system date.
 *     Uses `crypto.timingSafeEqual` to prevent timing side-channel attacks.
 * PT: Valida a integridade criptográfica do código de liberação contra o CNPJ informado
 *     e confere se a data de expiração codificada é válida e não está vencida.
 *     Utiliza `crypto.timingSafeEqual` para evitar ataques de temporização.
 */
export function validateLicenseCode(
  cnpj: string,
  code: string,
  options?: { secret?: string; referenceDate?: string }
): LicenseValidationResult {
  const cleanCnpj = normalizeLicenseCnpj(cnpj);
  if (cleanCnpj.length !== 14) {
    return {
      valid: false,
      error: 'CNPJ inválido. Informe os 14 caracteres do CNPJ da empresa.',
    };
  }

  // EN: Strip hyphens/spaces; also tolerate optional `FLUX-` prefix if pasted with 20 chars.
  // PT: Remove hífens e espaços; aceita tanto o padrão de 16 caracteres (`XXXX-XXXX-XXXX-XXXX`)
  //     quanto eventual prefixo opcional `FLUX-` caso colado pelo suporte.
  let cleanCode = String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (cleanCode.length === 20 && cleanCode.startsWith('FLUX')) {
    cleanCode = cleanCode.slice(4);
  }

  if (cleanCode.length !== 16) {
    return {
      valid: false,
      error: 'Código de liberação inválido ou incompatível com o CNPJ informado.',
    };
  }

  const dateToken = cleanCode.slice(0, 4);
  const providedSig = cleanCode.slice(4, 16);

  const validUntil = decodeDateToken(dateToken);
  if (!validUntil) {
    return {
      valid: false,
      error: 'Código de liberação inválido ou incompatível com o CNPJ informado.',
    };
  }

  const expectedSig = computeSignature12(cleanCnpj, validUntil, options?.secret);
  const bufProvided = Buffer.from(providedSig, 'utf8');
  const bufExpected = Buffer.from(expectedSig, 'utf8');

  if (
    bufProvided.length !== bufExpected.length ||
    !crypto.timingSafeEqual(bufProvided, bufExpected)
  ) {
    return {
      valid: false,
      error: 'Código de liberação inválido ou incompatível com o CNPJ informado.',
    };
  }

  const refDate = options?.referenceDate || getSystemDateISO();
  const daysRemaining = calculateDaysRemaining(validUntil, refDate);
  if (daysRemaining < 0) {
    return {
      valid: false,
      validUntil,
      daysRemaining,
      error: 'Este código de liberação refere-se a uma data já expirada.',
    };
  }

  return {
    valid: true,
    validUntil,
    daysRemaining,
  };
}

/**
 * EN: Quick helper to generate an emergency license key for N days starting from today (or base date).
 * PT: Helper utilitário para geração rápida de chave de emergência por N dias a partir de hoje.
 */
export function generateEmergencyLicenseForDays(
  cnpj: string,
  days: number,
  options?: { baseDate?: string; secret?: string }
): { licenseKey: string; validUntil: string } {
  const safeDays = Math.max(1, Math.trunc(Number(days) || 30));
  const start = options?.baseDate || getSystemDateISO();
  const validUntil = addDaysToISODate(start, safeDays);
  const licenseKey = generateLicenseCode(cnpj, validUntil, options?.secret);
  return { licenseKey, validUntil };
}

// ============================================================================
// CLI Utility Runner / Utilitário CLI para suporte emitir chave rapidamente:
// Uso: npx tsx server/licenseEngine.ts <CNPJ> [DIAS=30]
// ============================================================================
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  const rawCnpj = process.argv[2];
  const rawDays = Number(process.argv[3] || 30);
  if (!rawCnpj) {
    console.log('Uso: npx tsx server/licenseEngine.ts <CNPJ> [DIAS=30]');
    process.exit(1);
  }
  const result = generateEmergencyLicenseForDays(rawCnpj, rawDays);
  console.log('\n=== CHAVE DE LIBERAÇÃO FLUXOCLARO ===');
  console.log(`CNPJ:           ${rawCnpj}`);
  console.log(`Válida até:     ${result.validUntil} (+${rawDays} dias)`);
  console.log(`Código Chave:   ${result.licenseKey}`);
  console.log('=====================================\n');
}
