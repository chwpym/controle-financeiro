/**
 * server/licenseEngine.test.ts
 *
 * EN: Unit test suite for the cryptographic license engine (`server/licenseEngine.ts`).
 *     Verifies deterministic HMAC-SHA256 generation, 16-char 4-block formatting,
 *     numeric & RFB alphanumeric CNPJ binding, tamper rejection, and date expiration checks.
 *
 * PT: Suíte de testes unitários do motor criptográfico de licenciamento (`server/licenseEngine.ts`).
 *     Valida geração determinística via HMAC-SHA256, formatação em 4 blocos de 16 caracteres,
 *     vínculo estrito por CNPJ (numérico e alfanumérico RFB), rejeição de adulteração e expiração.
 */

import { describe, expect, it } from 'vitest';
import {
  addDaysToISODate,
  calculateDaysRemaining,
  generateEmergencyLicenseForDays,
  generateLicenseCode,
  validateLicenseCode,
} from './licenseEngine';

const TEST_SECRET = 'unit-test-hmac-secret-fluxoclaro-2026';

describe('server/licenseEngine — Motor Criptográfico de Licenciamento (Fase 10.2)', () => {
  it('gera chave formatada em 4 blocos de 4 caracteres maiúsculos e valida com sucesso para o mesmo CNPJ', () => {
    const cnpj = 'FC.202.6BR/0001-64';
    const validUntil = '2027-12-31';

    const code = generateLicenseCode(cnpj, validUntil, TEST_SECRET);

    // Ex: XXXX-XXXX-XXXX-XXXX (19 chars com hífens, 16 alfanuméricos maiúsculos)
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const validation = validateLicenseCode(cnpj, code, {
      secret: TEST_SECRET,
      referenceDate: '2026-11-24',
    });

    expect(validation.valid).toBe(true);
    expect(validation.validUntil).toBe(validUntil);
    expect(validation.daysRemaining).toBe(402);
  });

  it('suporta CNPJ Alfanumérico da Receita Federal (IN RFB 2.229/2024) e ignora pontuação/minúsculas', () => {
    const alphaCnpjFormatted = '12.ABC.345/01DE-35';
    const alphaCnpjRaw = '12abc34501de35';
    const validUntil = '2027-06-15';

    const code = generateLicenseCode(alphaCnpjFormatted, validUntil, TEST_SECRET);
    const lowerSpacedCode = code.toLowerCase().replace(/-/g, ' ');

    const validation = validateLicenseCode(alphaCnpjRaw, lowerSpacedCode, {
      secret: TEST_SECRET,
      referenceDate: '2026-11-24',
    });

    expect(validation.valid).toBe(true);
    expect(validation.validUntil).toBe('2027-06-15');
  });

  it('rejeita chave válida gerada para outro CNPJ (incompatibilidade de empresa)', () => {
    const cnpjEmpresaA = 'FC.202.6BR/0001-64';
    const cnpjEmpresaB = '11.222.333/0001-81';
    const codeA = generateLicenseCode(cnpjEmpresaA, '2027-11-24', TEST_SECRET);

    const validationOnB = validateLicenseCode(cnpjEmpresaB, codeA, {
      secret: TEST_SECRET,
      referenceDate: '2026-11-24',
    });

    expect(validationOnB.valid).toBe(false);
    expect(validationOnB.error).toMatch(/inválido ou incompatível/i);
  });

  it('rejeita código adulterado ou com assinatura inválida', () => {
    const cnpj = 'FC.202.6BR/0001-64';
    const code = generateLicenseCode(cnpj, '2027-11-24', TEST_SECRET);
    const lastChar = code.slice(-1) === 'A' ? 'B' : 'A';
    const tampered = `${code.slice(0, -1)}${lastChar}`;

    const result = validateLicenseCode(cnpj, tampered, {
      secret: TEST_SECRET,
      referenceDate: '2026-11-24',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/inválido ou incompatível/i);
  });

  it('rejeita código cuja data codificada já está expirada em relação à data do sistema', () => {
    const cnpj = 'FC.202.6BR/0001-64';
    const expiredCode = generateLicenseCode(cnpj, '2026-11-10', TEST_SECRET);

    const result = validateLicenseCode(cnpj, expiredCode, {
      secret: TEST_SECRET,
      referenceDate: '2026-11-24',
    });

    expect(result.valid).toBe(false);
    expect(result.daysRemaining).toBe(-14);
    expect(result.error).toMatch(/expirada/i);
  });

  it('calcula adição de dias e dias restantes com precisão via generateEmergencyLicenseForDays', () => {
    const cnpj = 'FC.202.6BR/0001-64';
    const { licenseKey, validUntil } = generateEmergencyLicenseForDays(cnpj, 30, {
      baseDate: '2026-11-24',
      secret: TEST_SECRET,
    });

    expect(validUntil).toBe(addDaysToISODate('2026-11-24', 30));
    expect(calculateDaysRemaining(validUntil, '2026-11-24')).toBe(30);

    const check = validateLicenseCode(cnpj, licenseKey, {
      secret: TEST_SECRET,
      referenceDate: '2026-11-24',
    });
    expect(check.valid).toBe(true);
    expect(check.daysRemaining).toBe(30);
  });
});
