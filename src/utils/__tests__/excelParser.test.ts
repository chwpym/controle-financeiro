import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  analyzeExcelBuffer,
  extractExcelSheet,
  suggestExcelMapping,
  mapExcelRowsToPreview,
} from '../excelParser';
import type { Category, Contact } from '../../types';

describe('Excel Parser Module', () => {
  function createTestWorkbookBuffer(): ArrayBuffer {
    const wb = XLSX.utils.book_new();
    const data = [
      ['Descrição', 'Valor', 'Vencimento', 'Tipo', 'Contato', 'Documento'],
      ['Aluguel Sala 101', '2500,00', '2026-11-20', 'Pagar', 'Imobiliária Central', 'DOC-123'],
      ['Consultoria TI', 3500.5, '2026-11-25', 'Receber', 'Empresa Alpha', 'NF-456'],
      ['Internet Fibra', 'R$ 150,00', '15/11/2026', 'Despesa', 'Operadora Telecom', 'NET-789'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Lancamentos');
    const arr = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const u8 = new Uint8Array(arr);
    return u8.buffer;
  }

  it('analyzes excel buffer and returns sheet names', () => {
    const buffer = createTestWorkbookBuffer();
    const analysis = analyzeExcelBuffer(buffer);
    expect(analysis.sheetNames).toContain('Lancamentos');
  });

  it('extracts sheet headers and rows correctly', () => {
    const buffer = createTestWorkbookBuffer();
    const analysis = analyzeExcelBuffer(buffer);
    const sheetData = extractExcelSheet(analysis.workbook, 'Lancamentos');

    expect(sheetData.headers).toEqual(['Descrição', 'Valor', 'Vencimento', 'Tipo', 'Contato', 'Documento']);
    expect(sheetData.rows).toHaveLength(3);
    expect(sheetData.rows[0]['Descrição']).toBe('Aluguel Sala 101');
  });

  it('suggests automatic field mappings based on header column names', () => {
    const headers = ['Descrição', 'Valor Total', 'Data Vencimento', 'Tipo Movimento', 'Contato Favorecido', 'Nº Documento'];
    const mapping = suggestExcelMapping(headers);

    expect(mapping.descriptionCol).toBe('Descrição');
    expect(mapping.amountCol).toBe('Valor Total');
    expect(mapping.dueDateCol).toBe('Data Vencimento');
    expect(mapping.typeCol).toBe('Tipo Movimento');
    expect(mapping.contactCol).toBe('Contato Favorecido');
    expect(mapping.documentCol).toBe('Nº Documento');
  });

  it('maps excel rows into preview items with cents and dates correctly normalized', () => {
    const buffer = createTestWorkbookBuffer();
    const analysis = analyzeExcelBuffer(buffer);
    const sheetData = extractExcelSheet(analysis.workbook, 'Lancamentos');
    const mapping = suggestExcelMapping(sheetData.headers);

    const categories: Category[] = [];
    const contacts: Contact[] = [
      {
        id: 'cont-1',
        userId: 'u1',
        personType: 'PJ',
        name: 'Imobiliária Central',
        tradeName: 'Central Imóveis',
        document: '12345678000199',
        email: '',
        phone: '',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        kind: 'supplier',
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
      },
    ];

    const preview = mapExcelRowsToPreview(
      sheetData.rows,
      mapping,
      {
        categories,
        contacts,
        defaultType: 'payable',
        defaultStatus: 'pending',
        defaultCategoryId: null,
        defaultContactId: null,
      },
      new Set()
    );

    expect(preview).toHaveLength(3);

    // Row 1: Aluguel Sala 101 (2500,00 -> 250000 cents)
    expect(preview[0].description).toBe('Aluguel Sala 101');
    expect(preview[0].amountCents).toBe(250000);
    expect(preview[0].dueDate).toBe('2026-11-20');
    expect(preview[0].type).toBe('payable');
    expect(preview[0].contactId).toBe('cont-1'); // Matched contact!
    expect(preview[0].documentNumber).toBe('DOC-123');

    // Row 2: Consultoria TI (3500.50 -> 350050 cents)
    expect(preview[1].description).toBe('Consultoria TI');
    expect(preview[1].amountCents).toBe(350050);
    expect(preview[1].dueDate).toBe('2026-11-25');
    expect(preview[1].type).toBe('receivable');

    // Row 3: Internet Fibra ('R$ 150,00' -> 15000 cents, '15/11/2026' -> '2026-11-15')
    expect(preview[2].amountCents).toBe(15000);
    expect(preview[2].dueDate).toBe('2026-11-15');
    expect(preview[2].type).toBe('payable');
  });
});
