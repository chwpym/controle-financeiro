/**
 * EN: Component & Integration tests for the Evolved XML Import Center (Phase 11.1).
 *     Covers Compact Dropzone, Fiscal CNPJ Validation Card, Inline Installment Editing,
 *     Real-Time Reconciliation with Commercial Adjustments, and Multi-XML Batch Import.
 * PT: Testes de Componentes e Integração da Central de Importação XML Evoluída (Fase 11.1).
 *     Cobre Dropzone Compacto, Card de Validação Fiscal, Edição Inline de Parcelas,
 *     Batimento em Tempo Real com Ajustes Comerciais e Importação em Massa Multi-XML.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  XmlDropzone,
  XmlContactMatcher,
  XmlFiscalValidationCard,
  XmlPreviewTable,
  XmlGenericMapping,
  XmlDestinationFields,
} from '../index';
import { XmlImportModal } from '../../XmlImportModal';
import type { Category, Company, Contact, Transaction } from '../../../types';
import {
  analyzeXmlDocument,
  detectXmlOperation,
  type ParsedXmlPreviewItem,
} from '../../../utils/xmlParser';

const mockCompany: Company = {
  id: 'comp-1',
  userId: 'user-1',
  legalName: 'GENUINA AUTO PECAS LTDA',
  tradeName: 'Genuína',
  document: '98.765.432/0001-88',
  stateRegistration: '',
  municipalRegistration: '',
  status: 'active',
  email: '',
  phone: '',
  whatsapp: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: 'SP',
  logoDataUrl: '',
  color: '#0F766E',
  isDefault: true,
  createdAt: '',
  updatedAt: '',
};

describe('XmlImport Modular Subcomponents (Phase 11.1)', () => {
  it('XmlDropzone renders empty dropzone with multiple support and shrinks to compact 1-line bar when file is loaded', () => {
    const handleFiles = vi.fn();
    const handleClear = vi.fn();
    const { container, rerender } = render(
      <XmlDropzone fileName="" onFilesSelected={handleFiles} onClear={handleClear} />
    );

    expect(screen.getByTestId('xml-dropzone-empty')).toBeInTheDocument();
    expect(screen.getByText(/Clique ou arraste um ou mais arquivos \.XML aqui/i)).toBeInTheDocument();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('multiple');

    const dummyFile = new File(['<xml></xml>'], 'nota-500.xml', { type: 'text/xml' });
    fireEvent.change(input, { target: { files: [dummyFile] } });
    expect(handleFiles).toHaveBeenCalledWith([dummyFile], false);

    // Re-render in compact mode after upload
    rerender(
      <XmlDropzone
        fileName="nota-500.xml"
        fileCount={1}
        invoiceNumber="500"
        partyName="DISTRIBUIDORA EXEMPLO"
        onFilesSelected={handleFiles}
        onClear={handleClear}
      />
    );

    expect(screen.getByTestId('xml-dropzone-compact')).toBeInTheDocument();
    expect(screen.getByText('NF-e 500 · DISTRIBUIDORA EXEMPLO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Trocar XML/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpar arquivos XML/i }));
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('XmlFiscalValidationCard displays Issuer vs Recipient, linked badge, and Safety Lock alert when unmatched', () => {
    const supplierNfe = analyzeXmlDocument(`
      <NFe>
        <infNFe>
          <ide><nNF>777</nNF><tpNF>1</tpNF><dhEmi>2026-11-25</dhEmi></ide>
          <emit><CNPJ>12345678000195</CNPJ><xNome>PECAS BRASIL LTDA</xNome></emit>
          <dest><CNPJ>98765432000188</CNPJ><xNome>GENUINA AUTO PECAS LTDA</xNome></dest>
          <total><ICMSTot><vNF>400.00</vNF></ICMSTot></total>
        </infNFe>
      </NFe>
    `);

    const matchedDetection = detectXmlOperation(supplierNfe, [mockCompany]);
    const onOpenModal = vi.fn();

    const { rerender } = render(
      <XmlFiscalValidationCard
        analysis={supplierNfe}
        detection={matchedDetection}
        companies={[mockCompany]}
        companyId={matchedDetection.companyId}
        onChangeCompanyId={vi.fn()}
        txType={matchedDetection.txType}
        onChangeTxType={vi.fn()}
        isContactBound={false}
        isCreatingContact={false}
        onAutoCreateContact={vi.fn()}
        onOpenContactModal={onOpenModal}
      />
    );

    expect(screen.getByText(/Vinculado à empresa: Genuína/i)).toBeInTheDocument();
    expect(screen.getByText('PECAS BRASIL LTDA')).toBeInTheDocument();
    expect(screen.getByText('GENUINA AUTO PECAS LTDA')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('xml-open-contact-modal-btn'));
    expect(onOpenModal).toHaveBeenCalledTimes(1);

    // Unmatched scenario -> Safety Lock Alert
    const unmatchedDetection = detectXmlOperation(supplierNfe, [
      { ...mockCompany, document: '11.111.111/0001-11' },
    ]);

    rerender(
      <XmlFiscalValidationCard
        analysis={supplierNfe}
        detection={unmatchedDetection}
        companies={[{ ...mockCompany, document: '11.111.111/0001-11' }]}
        companyId=""
        onChangeCompanyId={vi.fn()}
        txType="payable"
        onChangeTxType={vi.fn()}
        isContactBound={false}
        isCreatingContact={false}
        onAutoCreateContact={vi.fn()}
      />
    );

    expect(screen.getByText(/CNPJ não cadastrado em Minhas Empresas/i)).toBeInTheDocument();
  });

  it('XmlPreviewTable supports inline editing of dueDate and amountCents and renders Commercial Adjustment panel', () => {
    const handleToggle = vi.fn();
    const handleUncheck = vi.fn();
    const handleUpdateItem = vi.fn();
    const handleReasonChange = vi.fn();

    const mockItems: ParsedXmlPreviewItem[] = [
      {
        tempId: 'item-1',
        description: 'NF-e 123 — Fornecedor A',
        amountCents: 15000,
        dueDate: '2026-12-10',
        issueDate: '2026-11-10',
        documentNumber: 'NFe-123',
        supplierName: 'Fornecedor A',
        supplierDocument: '111',
        installmentNumber: 1,
        installmentTotal: 2,
        installmentGroupId: 'grp-1',
      },
      {
        tempId: 'item-2',
        description: 'NF-e 123 — Fornecedor A',
        amountCents: 15000,
        dueDate: '2027-01-10',
        issueDate: '2026-11-10',
        documentNumber: 'NFe-123',
        supplierName: 'Fornecedor A',
        supplierDocument: '111',
        installmentNumber: 2,
        installmentTotal: 2,
        installmentGroupId: 'grp-1',
      },
    ];

    const { rerender } = render(
      <XmlPreviewTable
        items={mockItems}
        excludedIds={new Set()}
        duplicateIds={new Set(['item-1'])}
        onToggleItem={handleToggle}
        onUncheckDuplicates={handleUncheck}
        onUpdateItem={handleUpdateItem}
        invoiceTotalCents={30000}
        installmentsTotalCents={30000}
        divergenceCents={0}
        adjustmentType="exact"
      />
    );

    expect(screen.getByTestId('xml-reconciliation-exact-badge')).toHaveTextContent(
      /Valores Batendo \(100% Conferido\)/i
    );

    // Inline Date Edit
    const dueInput = screen.getByTestId('xml-duedate-input-item-1') as HTMLInputElement;
    fireEvent.change(dueInput, { target: { value: '2026-12-20' } });
    expect(handleUpdateItem).toHaveBeenCalledWith('item-1', { dueDate: '2026-12-20' });

    // Inline Money Edit
    const amountInput = screen.getByTestId('xml-amount-input-item-1') as HTMLInputElement;
    fireEvent.focus(amountInput);
    fireEvent.change(amountInput, { target: { value: '120,00' } });
    expect(handleUpdateItem).toHaveBeenCalledWith('item-1', { amountCents: 12000 });

    // Negative Divergence (- R$ 30,00 Warranty Credit)
    rerender(
      <XmlPreviewTable
        items={mockItems}
        excludedIds={new Set()}
        duplicateIds={new Set()}
        onToggleItem={handleToggle}
        onUncheckDuplicates={handleUncheck}
        onUpdateItem={handleUpdateItem}
        invoiceTotalCents={30000}
        installmentsTotalCents={27000}
        divergenceCents={-3000}
        adjustmentType="negative"
        adjustmentReason="credito_garantia"
        onChangeAdjustmentReason={handleReasonChange}
      />
    );

    expect(screen.getByTestId('xml-reconciliation-negative-badge')).toHaveTextContent(
      /- Abatimento de R\$\s*30,00/i
    );
    expect(screen.getByTestId('xml-adjustment-reason-select')).toBeInTheDocument();
  });

  it('XmlContactMatcher & XmlGenericMapping & XmlDestinationFields remain functional', () => {
    const handleAutoCreate = vi.fn();
    render(
      <XmlContactMatcher
        txType="receivable"
        title="Cliente identificado"
        contactName="CLIENTE TESTE LTDA"
        contactDocument="12345678000195"
        contactAddress={{
          cep: '01310100',
          street: 'Av Paulista',
          number: '100',
          complement: '',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        }}
        isBound={false}
        isCreating={false}
        onAutoCreate={handleAutoCreate}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Cadastrar cliente e vincular/i }));
    expect(handleAutoCreate).toHaveBeenCalledTimes(1);

    const categories: Category[] = [
      { id: 'cat-1', userId: 'u1', name: 'Compras', type: 'payable', color: '#ef4444', createdAt: '', updatedAt: '' },
    ];
    const contacts: Contact[] = [
      { id: 'ct-1', userId: 'u1', personType: 'PJ', kind: 'supplier', name: 'Fornecedor X', tradeName: '', document: '111', phone: '', email: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', createdAt: '', updatedAt: '' },
    ];

    render(
      <XmlDestinationFields
        txType="payable"
        categories={categories}
        categoryId="cat-1"
        onChangeCategory={vi.fn()}
        contacts={contacts}
        contactId="ct-1"
        onChangeContact={vi.fn()}
      />
    );
    expect(screen.getByText('Compras')).toBeInTheDocument();

    render(
      <XmlGenericMapping
        recordTag="item"
        fields={['titulo', 'valor']}
        mapping={{ descriptionField: 'titulo', amountField: 'valor', dueDateField: '', documentField: '', contactField: '' }}
        onChangeMapping={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('titulo')).toBeInTheDocument();
  });

  it('XmlImportModal handles end-to-end Multi-XML upload, inline adjustment, and batch import', async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    const xml1 = `
      <NFe>
        <infNFe>
          <ide><nNF>1001</nNF><tpNF>1</tpNF><dhEmi>2026-11-20</dhEmi></ide>
          <emit><CNPJ>12345678000195</CNPJ><xNome>FORNECEDOR UM LTDA</xNome></emit>
          <dest><CNPJ>98765432000188</CNPJ><xNome>GENUINA AUTO PECAS LTDA</xNome></dest>
          <total><ICMSTot><vNF>200.00</vNF></ICMSTot></total>
          <cobr><dup><nDup>01</nDup><dVenc>2026-12-20</dVenc><vDup>225.00</vDup></dup></cobr>
        </infNFe>
      </NFe>
    `;

    const xml2 = `
      <NFe>
        <infNFe>
          <ide><nNF>1002</nNF><tpNF>1</tpNF><dhEmi>2026-11-21</dhEmi></ide>
          <emit><CNPJ>98765432000188</CNPJ><xNome>GENUINA AUTO PECAS LTDA</xNome></emit>
          <dest><CNPJ>44555666000177</CNPJ><xNome>OFICINA CLIENTE LTDA</xNome></dest>
          <total><ICMSTot><vNF>350.00</vNF></ICMSTot></total>
          <cobr><dup><nDup>01</nDup><dVenc>2026-12-21</dVenc><vDup>350.00</vDup></dup></cobr>
        </infNFe>
      </NFe>
    `;

    const { container } = render(
      <XmlImportModal
        userId="user-1"
        categories={[]}
        contacts={[]}
        companies={[mockCompany]}
        selectedCompanyId="all"
        existingTransactions={[] as Transaction[]}
        onClose={onClose}
        onImport={onImport}
        onCreateContact={vi.fn()}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const f1 = new File([xml1], 'nf-1001.xml', { type: 'text/xml' });
    const f2 = new File([xml2], 'nf-1002.xml', { type: 'text/xml' });

    fireEvent.change(fileInput, { target: { files: [f1, f2] } });

    await waitFor(() => {
      expect(screen.getByTestId('xml-batch-summary-table')).toBeInTheDocument();
    });

    expect(screen.getByText('NF-e 1001')).toBeInTheDocument();
    expect(screen.getByText('NF-e 1002')).toBeInTheDocument();

    const importAllBtn = screen.getByTestId('xml-import-all-btn');
    expect(importAllBtn).toHaveTextContent('Importar Todas as Notas (2)');

    fireEvent.click(importAllBtn);

    expect(onImport).toHaveBeenCalledTimes(1);
    const importedTxs = onImport.mock.calls[0][0] as Transaction[];
    expect(importedTxs).toHaveLength(2);

    // First note: dest=Genuína -> Payable + R$ 25,00 positive adjustment saved in interestCents
    expect(importedTxs[0].type).toBe('payable');
    expect(importedTxs[0].companyId).toBe('comp-1');
    expect(importedTxs[0].amountCents).toBe(22500);
    expect(importedTxs[0].interestCents).toBe(2500);
    expect(importedTxs[0].notes).toContain('Frete por Fora');

    // Second note: emit=Genuína -> Receivable
    expect(importedTxs[1].type).toBe('receivable');
    expect(importedTxs[1].companyId).toBe('comp-1');
    expect(importedTxs[1].amountCents).toBe(35000);
    expect(importedTxs[1].interestCents).toBe(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
