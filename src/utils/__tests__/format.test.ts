import { describe, it, expect } from 'vitest';
import {
  formatBRL,
  formatInputBRL,
  parseBRLToCents,
  formatDateBR,
  formatMonthLabel,
  shiftMonthKey,
  addMonthsISO,
  addDaysISO,
  nextRecurrenceDate,
  maskCEP,
  maskCPF,
  maskCNPJ,
  isOverdue,
  daysUntilDue,
  buildInstallmentTransactions,
  buildRecurringTransactions,
  buildDuplicatedTransaction,
  cleanDocumentDigits,
  findDuplicateContactDocument,
  calculateSettlement,
  calculateSettledAmount,
} from '../format';
import type { Transaction } from '../../types';

describe('formatBRL & formatInputBRL', () => {
  it('formats cents to Brazilian Real string', () => {
    expect(formatBRL(0)).toMatch(/R\$\s*0,00/);
    expect(formatBRL(100)).toMatch(/R\$\s*1,00/);
    expect(formatBRL(123456)).toMatch(/R\$\s*1\.234,56/);
  });

  it('formats input BRL string', () => {
    expect(formatInputBRL(0)).toBe('0,00');
    expect(formatInputBRL(50)).toBe('0,50');
    expect(formatInputBRL(1999)).toBe('19,99');
    expect(formatInputBRL(100000)).toBe('1000,00');
  });
});

describe('parseBRLToCents', () => {
  it('parses standard pt-BR formats', () => {
    expect(parseBRLToCents('100,00')).toBe(10000);
    expect(parseBRLToCents('R$ 1.234,56')).toBe(123456);
    expect(parseBRLToCents(' 50,00 ')).toBe(5000);
  });

  it('parses dot decimal formats', () => {
    expect(parseBRLToCents('1234.56')).toBe(123456);
    expect(parseBRLToCents('10.5')).toBe(1050);
  });

  it('handles zero, empty or invalid strings gracefully', () => {
    expect(parseBRLToCents('')).toBe(0);
    expect(parseBRLToCents('abc')).toBe(0);
    expect(parseBRLToCents('-10,00')).toBe(0);
  });
});

describe('Date manipulation and formatting', () => {
  it('formats ISO to pt-BR date format', () => {
    expect(formatDateBR('2026-11-16')).toBe('16/11/2026');
    expect(formatDateBR('2026-01-05T12:00:00Z')).toBe('05/01/2026');
    expect(formatDateBR(null)).toBe('—');
    expect(formatDateBR('')).toBe('—');
  });

  it('shifts month keys correctly across years', () => {
    expect(shiftMonthKey('2026-11', 1)).toBe('2026-12');
    expect(shiftMonthKey('2026-11', 2)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
  });

  it('adds months preserving or clamping days at month end', () => {
    expect(addMonthsISO('2026-01-15', 1)).toBe('2026-02-15');
    // Jan 31 + 1 month in non-leap year (2026) clamps to Feb 28
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
    // Leap year 2028: Jan 31 + 1 month clamps to Feb 29
    expect(addMonthsISO('2028-01-31', 1)).toBe('2028-02-29');
    // Year boundary
    expect(addMonthsISO('2026-11-10', 3)).toBe('2027-02-10');
  });

  it('adds days correctly across months', () => {
    expect(addDaysISO('2026-02-27', 3)).toBe('2026-03-02');
  });

  it('calculates next recurrence date', () => {
    expect(nextRecurrenceDate('2026-03-10', 'monthly', 1)).toBe('2026-04-10');
    expect(nextRecurrenceDate('2026-03-10', 'biweekly', 1)).toBe('2026-03-25');
    expect(nextRecurrenceDate('2026-03-10', 'yearly', 1)).toBe('2027-03-10');
  });

  it('correctly identifies overdue status and days remaining', () => {
    const mockTx: Transaction = {
      id: 'tx-1',
      userId: 'u1',
      type: 'payable',
      description: 'Conta de Luz',
      amountCents: 15000,
      discountCents: 0,
      interestCents: 0,
      dueDate: '2026-11-10',
      paidAt: null,
      status: 'pending',
      paymentMethod: '',
      categoryId: null,
      contactId: null,
      documentNumber: '',
      issueDate: null,
      installmentGroupId: null,
      installmentNumber: 1,
      installmentTotal: 1,
      isRecurring: false,
      recurrenceInterval: null,
      notes: '',
      source: 'manual',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    };

    expect(isOverdue(mockTx, '2026-11-16')).toBe(true);
    expect(isOverdue({ ...mockTx, status: 'settled' }, '2026-11-16')).toBe(false);
    expect(isOverdue({ ...mockTx, dueDate: '2026-11-20' }, '2026-11-16')).toBe(false);

    expect(daysUntilDue('2026-11-20', '2026-11-16')).toBe(4);
    expect(daysUntilDue('2026-11-10', '2026-11-16')).toBe(-6);
  });
});

describe('Mask functions', () => {
  it('masks CEP correctly', () => {
    expect(maskCEP('01310100')).toBe('01310-100');
    expect(maskCEP('01310')).toBe('01310');
    expect(maskCEP('abc 01.310-100 xyz')).toBe('01310-100');
  });

  it('masks CPF correctly', () => {
    expect(maskCPF('12345678901')).toBe('123.456.789-01');
    expect(maskCPF('123456')).toBe('123.456');
  });

  it('masks CNPJ correctly', () => {
    expect(maskCNPJ('12345678000195')).toBe('12.345.678/0001-95');
    expect(maskCNPJ('12345678')).toBe('12.345.678');
  });
});

describe('Installment calculation & division logic', () => {
  it('creates single transaction when installments = 1', () => {
    const list = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Material de Escritório',
      amountCents: 5000,
      amountMode: 'total',
      firstDueDate: '2026-11-20',
      installments: 1,
      categoryId: null,
      contactId: null,
      documentNumber: 'NF-100',
      notes: '',
    });

    expect(list).toHaveLength(1);
    expect(list[0].amountCents).toBe(5000);
    expect(list[0].installmentGroupId).toBeNull();
    expect(list[0].installmentNumber).toBe(1);
    expect(list[0].installmentTotal).toBe(1);
    expect(list[0].description).toBe('Material de Escritório');
  });

  it('correctly splits cents with remainder placed on first installment (e.g., 100.00 / 3)', () => {
    const list = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Notebook',
      amountCents: 10000, // R$ 100,00
      amountMode: 'total',
      firstDueDate: '2026-11-10',
      installments: 3,
      categoryId: 'cat-1',
      contactId: 'cont-1',
      documentNumber: 'NF-999',
      notes: 'Garantia estendida',
    });

    expect(list).toHaveLength(3);
    // 10000 / 3 = 3333 with remainder 1 -> first is 3334, others 3333
    expect(list[0].amountCents).toBe(3334);
    expect(list[1].amountCents).toBe(3333);
    expect(list[2].amountCents).toBe(3333);

    const totalCalculated = list.reduce((sum, item) => sum + item.amountCents, 0);
    expect(totalCalculated).toBe(10000);

    // Group ID must be identical across all installments
    expect(list[0].installmentGroupId).toBeTruthy();
    expect(list[0].installmentGroupId).toBe(list[1].installmentGroupId);
    expect(list[1].installmentGroupId).toBe(list[2].installmentGroupId);

    // Numbering & descriptions
    expect(list[0].installmentNumber).toBe(1);
    expect(list[0].installmentTotal).toBe(3);
    expect(list[0].description).toBe('Notebook (1/3)');
    expect(list[1].description).toBe('Notebook (2/3)');
    expect(list[2].description).toBe('Notebook (3/3)');

    // Due dates
    expect(list[0].dueDate).toBe('2026-11-10');
    expect(list[1].dueDate).toBe('2026-12-10');
    expect(list[2].dueDate).toBe('2027-01-10');
  });

  it('supports per_installment mode without dividing', () => {
    const list = buildInstallmentTransactions({
      userId: 'u1',
      type: 'receivable',
      description: 'Mensalidade Consultoria',
      amountCents: 50000, // R$ 500,00 cada
      amountMode: 'per_installment',
      firstDueDate: '2026-11-05',
      installments: 4,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
    });

    expect(list).toHaveLength(4);
    list.forEach((item) => {
      expect(item.amountCents).toBe(50000);
      expect(item.type).toBe('receivable');
    });
  });

  it('handles markFirstSettled = true', () => {
    const list = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Entrada + Parcelas',
      amountCents: 30000,
      amountMode: 'total',
      firstDueDate: '2026-11-16',
      installments: 3,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
      markFirstSettled: true,
      paymentMethod: 'PIX',
    });

    expect(list[0].status).toBe('settled');
    expect(list[0].paidAt).toBe('2026-11-16');
    expect(list[0].paymentMethod).toBe('PIX');

    expect(list[1].status).toBe('pending');
    expect(list[1].paidAt).toBeNull();
  });

  it('clamps installments between 1 and 420', () => {
    const listOver = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Excesso',
      amountCents: 60000,
      amountMode: 'per_installment',
      firstDueDate: '2026-11-16',
      installments: 500,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
    });
    expect(listOver).toHaveLength(420);

    const listZero = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Zero',
      amountCents: 1000,
      amountMode: 'total',
      firstDueDate: '2026-11-16',
      installments: 0,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
    });
    expect(listZero).toHaveLength(1);
  });

  it('handles long-term installments (120x, 360x, 420x) with exact cent sum and due dates', () => {
    const scenarios = [
      { count: 120, totalCents: 10_000_000, expectedLastDueDate: '2036-11-10' }, // R$ 100.000,00 em 120x
      { count: 360, totalCents: 50_000_000, expectedLastDueDate: '2056-11-10' }, // R$ 500.000,00 em 360x
      { count: 420, totalCents: 63_000_007, expectedLastDueDate: '2061-11-10' }, // R$ 630.000,07 em 420x
    ];

    for (const { count, totalCents, expectedLastDueDate } of scenarios) {
      const list = buildInstallmentTransactions({
        userId: 'u1',
        type: 'payable',
        description: `Financiamento ${count}x`,
        amountCents: totalCents,
        amountMode: 'total',
        firstDueDate: '2026-12-10',
        installments: count,
        categoryId: null,
        contactId: null,
        documentNumber: `CTR-${count}`,
        notes: '',
      });

      expect(list).toHaveLength(count);
      expect(list.reduce((sum, item) => sum + item.amountCents, 0)).toBe(totalCents);

      const expectedBase = Math.floor(totalCents / count);
      const expectedRemainder = totalCents % count;
      expect(list[0].amountCents).toBe(expectedBase + expectedRemainder);
      for (let i = 1; i < list.length; i++) {
        expect(list[i].amountCents).toBe(expectedBase);
      }

      const last = list[list.length - 1];
      expect(last.installmentNumber).toBe(count);
      expect(last.installmentTotal).toBe(count);
      expect(last.dueDate).toBe(expectedLastDueDate);
      expect(last.description).toBe(`Financiamento ${count}x (${count}/${count})`);
    }
  });

  it('correctly divides odd cent amounts placing extra cents on the first installment', () => {
    const splitFive = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Taxa Mínima',
      amountCents: 5, // R$ 0,05 em 2x -> 0,03 + 0,02
      amountMode: 'total',
      firstDueDate: '2026-11-16',
      installments: 2,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
    });
    expect(splitFive.map((t) => t.amountCents)).toEqual([3, 2]);
    expect(splitFive.reduce((sum, t) => sum + t.amountCents, 0)).toBe(5);

    const splitSeven = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Divisão 7 centavos',
      amountCents: 7, // R$ 0,07 em 3x -> 0,03 + 0,02 + 0,02
      amountMode: 'total',
      firstDueDate: '2026-11-16',
      installments: 3,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
    });
    expect(splitSeven.map((t) => t.amountCents)).toEqual([3, 2, 2]);
    expect(splitSeven.reduce((sum, t) => sum + t.amountCents, 0)).toBe(7);

    const splitOneOhOne = buildInstallmentTransactions({
      userId: 'u1',
      type: 'receivable',
      description: 'Parcela Ímpar',
      amountCents: 101, // R$ 1,01 em 2x -> 0,51 + 0,50
      amountMode: 'total',
      firstDueDate: '2026-11-16',
      installments: 2,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
    });
    expect(splitOneOhOne.map((t) => t.amountCents)).toEqual([51, 50]);
    expect(splitOneOhOne.reduce((sum, t) => sum + t.amountCents, 0)).toBe(101);
  });

  it('preserves exact total sum across all installment counts from 1x to 60x', () => {
    const sampleTotals = [65, 10000, 99999, 123457];

    for (const totalCents of sampleTotals) {
      for (let installments = 1; installments <= 60; installments++) {
        const list = buildInstallmentTransactions({
          userId: 'u1',
          type: 'payable',
          description: 'Teste Carnê',
          amountCents: totalCents,
          amountMode: 'total',
          firstDueDate: '2026-11-16',
          installments,
          categoryId: null,
          contactId: null,
          documentNumber: '',
          notes: '',
        });

        expect(list).toHaveLength(installments);
        const sum = list.reduce((acc, tx) => acc + tx.amountCents, 0);
        expect(sum).toBe(totalCents);

        const expectedBase = Math.floor(totalCents / installments);
        const expectedRemainder = totalCents % installments;
        expect(list[0].amountCents).toBe(expectedBase + expectedRemainder);
        for (let i = 1; i < list.length; i++) {
          expect(list[i].amountCents).toBe(expectedBase);
        }
      }
    }
  });
});

describe('Recurring and duplicate transactions', () => {
  it('builds recurring occurrences with proper dates and flags', () => {
    const list = buildRecurringTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Internet Fibra',
      amountCents: 12000,
      firstDueDate: '2026-11-10',
      interval: 'monthly',
      occurrences: 6,
      categoryId: 'cat-net',
      contactId: null,
      documentNumber: 'NET-01',
      notes: 'Plano 500MB',
    });

    expect(list).toHaveLength(6);
    expect(list[0].isRecurring).toBe(true);
    expect(list[0].recurrenceInterval).toBe('monthly');
    expect(list[0].dueDate).toBe('2026-11-10');
    expect(list[1].dueDate).toBe('2026-12-10');
    expect(list[5].dueDate).toBe('2027-04-10');
  });

  it('builds a clean duplicated transaction with reset status and incremented date', () => {
    const original: Transaction = {
      id: 'tx-orig',
      userId: 'u1',
      type: 'payable',
      description: 'Aluguel Comercial',
      amountCents: 200000,
      discountCents: 5000,
      interestCents: 1000,
      dueDate: '2026-11-05',
      paidAt: '2026-11-04',
      status: 'settled',
      paymentMethod: 'PIX',
      categoryId: 'cat-rent',
      contactId: 'landlord-1',
      documentNumber: 'REC-11',
      issueDate: '2026-10-28',
      installmentGroupId: 'grp-1',
      installmentNumber: 1,
      installmentTotal: 1,
      isRecurring: false,
      recurrenceInterval: null,
      notes: 'Pago adiantado',
      source: 'manual',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-04',
    };

    const duplicate = buildDuplicatedTransaction(original);

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.status).toBe('pending');
    expect(duplicate.paidAt).toBeNull();
    expect(duplicate.paymentMethod).toBe('');
    expect(duplicate.dueDate).toBe('2026-12-05');
    expect(duplicate.issueDate).toBe('2026-10-28');
    // Base amount calculation: amount (200000) + discount (5000) - interest (1000) = 204000
    expect(duplicate.amountCents).toBe(204000);
    expect(duplicate.discountCents).toBe(0);
    expect(duplicate.interestCents).toBe(0);
  });

  it('propagates issueDate across installments and defaults to null when omitted', () => {
    const withIssueDate = buildInstallmentTransactions({
      userId: 'u1',
      type: 'payable',
      description: 'Compra NF',
      amountCents: 30000,
      amountMode: 'total',
      firstDueDate: '2026-12-05',
      installments: 3,
      categoryId: null,
      contactId: null,
      documentNumber: 'NF-500',
      issueDate: '2026-11-18',
      notes: '',
    });

    expect(withIssueDate).toHaveLength(3);
    withIssueDate.forEach((tx) => {
      expect(tx.issueDate).toBe('2026-11-18');
    });

    const withoutIssueDate = buildInstallmentTransactions({
      userId: 'u1',
      type: 'receivable',
      description: 'Sem Emissão',
      amountCents: 10000,
      amountMode: 'total',
      firstDueDate: '2026-12-05',
      installments: 2,
      categoryId: null,
      contactId: null,
      documentNumber: '',
      notes: '',
    });

    withoutIssueDate.forEach((tx) => {
      expect(tx.issueDate).toBeNull();
    });

    const duplicatedWithoutIssue = buildDuplicatedTransaction(withoutIssueDate[0]);
    expect(duplicatedWithoutIssue.issueDate).toBeNull();
  });
});

describe('cleanDocumentDigits & findDuplicateContactDocument', () => {
  it('cleans non-numeric characters from document strings', () => {
    expect(cleanDocumentDigits('09.812.913/0001-87')).toBe('09812913000187');
    expect(cleanDocumentDigits('123.456.789-00')).toBe('12345678900');
    expect(cleanDocumentDigits('   ')).toBe('');
    expect(cleanDocumentDigits(null)).toBe('');
  });

  const sampleContacts = [
    {
      id: 'c1',
      name: 'GENUINA COMERCIAL LINENSE DE PECAS',
      document: '09.812.913/0001-87',
    },
    {
      id: 'c2',
      name: 'João da Silva',
      document: '123.456.789-00',
    },
  ];

  it('detects duplicate CNPJ with identical formatting', () => {
    const dup = findDuplicateContactDocument(sampleContacts, '09.812.913/0001-87');
    expect(dup).not.toBeNull();
    expect(dup?.id).toBe('c1');
    expect(dup?.name).toBe('GENUINA COMERCIAL LINENSE DE PECAS');
  });

  it('detects duplicate CNPJ with raw unmasked numbers', () => {
    const dup = findDuplicateContactDocument(sampleContacts, '09812913000187');
    expect(dup).not.toBeNull();
    expect(dup?.id).toBe('c1');
  });

  it('detects duplicate CPF regardless of punctuation', () => {
    const dup = findDuplicateContactDocument(sampleContacts, '12345678900');
    expect(dup).not.toBeNull();
    expect(dup?.id).toBe('c2');
  });

  it('ignores duplicate check when editing the same contact (currentContactId matches)', () => {
    const dup = findDuplicateContactDocument(sampleContacts, '09.812.913/0001-87', 'c1');
    expect(dup).toBeNull();
  });

  it('returns null when document is different or empty', () => {
    expect(findDuplicateContactDocument(sampleContacts, '11.222.333/0001-44')).toBeNull();
    expect(findDuplicateContactDocument(sampleContacts, '')).toBeNull();
    expect(findDuplicateContactDocument(sampleContacts, '12345')).toBeNull(); // Less than 8 digits
  });
});

describe('Settlement calculation with interest and discount', () => {
  it('calculates final settled amount as base + interest - discount', () => {
    expect(calculateSettledAmount(10000, 500, 200)).toBe(10300);
    expect(calculateSettledAmount(10000, 750, 0)).toBe(10750);
    expect(calculateSettledAmount(10000, 0, 1500)).toBe(8500);
    expect(calculateSettledAmount(10000)).toBe(10000);

    const detail = calculateSettlement({
      baseAmountCents: 25000,
      interestCents: 1250,
      discountCents: 500,
    });
    expect(detail).toEqual({
      baseAmountCents: 25000,
      interestCents: 1250,
      discountCents: 500,
      finalAmountCents: 25750,
      isValid: true,
    });
  });

  it('allows discount up to the base amount while preserving interest', () => {
    expect(calculateSettledAmount(10000, 0, 10000)).toBe(0);
    expect(calculateSettledAmount(10000, 500, 10000)).toBe(500);
  });

  it('blocks discount greater than the title base amount', () => {
    const invalid = calculateSettlement({
      baseAmountCents: 10000,
      interestCents: 0,
      discountCents: 10001,
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toMatch(/desconto não pode ser maior/i);

    expect(() => calculateSettledAmount(10000, 0, 15000)).toThrow(
      /desconto não pode ser maior/i
    );
    expect(() => calculateSettledAmount(10000, 5000, 10001)).toThrow(
      /desconto não pode ser maior/i
    );
  });
});


