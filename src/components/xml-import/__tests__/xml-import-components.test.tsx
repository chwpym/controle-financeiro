/**
 * EN: Component & Integration tests for the Evolved XML Import Center (Phase 11.1.2).
 *     Covers Neutral Operation Badges (`🔴 Conta a Pagar` / `🟢 Conta a Receber`),
 *     Mandatory Category + Contact with auto-suggestion, Flexible Installment Builder
 *     (`+ Adicionar Parcela` + `2x/3x/4x/6x` exact split), Partial Settlement UI (`SettleModal`),
 *     Group Metadata Propagation (`TransactionModal`), and Multi-XML Batch Import.
 * PT: Testes de Componentes e Integração da Etapa 11.1.2.
 *     Cobre Badges Neutros Universais, Obrigatoriedade de Categoria e Contato com auto-sugestão,
 *     Parcelamento Flexível no XML, Baixa Parcial (`SettleModal`), Propagação em Lote (`TransactionModal`)
 *     e Importação Multi-XML.
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
import { SettleModal } from '../../SettleModal';
import { TransactionModal } from '../../TransactionModal';
import type { Category, Company, Contact, Transaction } from '../../../types';
import {
  analyzeXmlDocument,
  detectXmlOperation,
  type ParsedXmlPreviewItem,
} from '../../../utils/xmlParser';

const mockCompany: Company = {
  id: 'comp-1',
  userId: 'user-1',
  legalName: 'GENUINA COMERCIAL LINENSE DE PECAS AUTOMOTIVAS LTDA 00193108',
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

const mockCategories: Category[] = [
  {
    id: 'cat-forn',
    userId: 'user-1',
    name: 'Fornecedores de Peças',
    type: 'payable',
    color: '#ef4444',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'cat-venda',
    userId: 'user-1',
    name: 'Vendas de Produtos',
    type: 'receivable',
    color: '#10b981',
    createdAt: '',
    updatedAt: '',
  },
];

const mockContacts: Contact[] = [
  {
    id: 'ct-forn-1',
    userId: 'user-1',
    personType: 'PJ',
    kind: 'supplier',
    name: 'FORNECEDOR UM LTDA',
    tradeName: 'Forn 1',
    document: '12.345.678/0001-95',
    email: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'ct-cli-1',
    userId: 'user-1',
    personType: 'PJ',
    kind: 'customer',
    name: 'OFICINA CLIENTE LTDA',
    tradeName: 'Oficina',
    document: '44.555.666/0001-77',
    email: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'Lins',
    state: 'SP',
    createdAt: '',
    updatedAt: '',
  },
];

describe('XmlImport & Financial Integrity Suite (Phase 11.1.2)', () => {
  it('XmlDropzone renders empty dropzone with multiple support and shrinks to compact 1-line bar when file is loaded', () => {
    const handleFiles = vi.fn();
    const handleClear = vi.fn();
    const { container, rerender } = render(
      <XmlDropzone fileName="" onFilesSelected={handleFiles} onClear={handleClear} />
    );

    expect(screen.getByTestId('xml-dropzone-empty')).toBeInTheDocument();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('multiple');

    const dummyFile = new File(['<xml></xml>'], 'nota-500.xml', { type: 'text/xml' });
    fireEvent.change(input, { target: { files: [dummyFile] } });
    expect(handleFiles).toHaveBeenCalledWith([dummyFile], false);

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
  });

  it('XmlFiscalValidationCard displays universal neutral badges (🔴 Conta a Pagar / 🟢 Conta a Receber) without (Compra)/(Venda)', () => {
    const purchaseNfe = analyzeXmlDocument(`
      <NFe>
        <infNFe>
          <ide><nNF>777</nNF><tpNF>1</tpNF><dhEmi>2026-11-25</dhEmi></ide>
          <emit>
            <CNPJ>12345678000195</CNPJ>
            <xNome>PECAS BRASIL DISTRIBUIDORA NACIONAL LTDA</xNome>
            <enderEmit><xMun>São Paulo</xMun><UF>SP</UF></enderEmit>
          </emit>
          <dest>
            <CNPJ>98765432000188</CNPJ>
            <xNome>GENUINA COMERCIAL LINENSE DE PECAS AUTOMOTIVAS LTDA 00193108</xNome>
          </dest>
          <total><ICMSTot><vNF>400.00</vNF></ICMSTot></total>
        </infNFe>
      </NFe>
    `);

    const buyerDetection = detectXmlOperation(purchaseNfe, [mockCompany]);
    const { rerender } = render(
      <XmlFiscalValidationCard
        analysis={purchaseNfe}
        detection={buyerDetection}
        companies={[mockCompany]}
        txType={buyerDetection.txType}
        isContactBound={false}
        isCreatingContact={false}
        onAutoCreateContact={vi.fn()}
      />
    );

    expect(screen.getByTestId('xml-operation-badge')).toHaveTextContent('🔴 Conta a Pagar');
    expect(screen.getByTestId('xml-operation-badge')).not.toHaveTextContent('(Compra)');

    const saleNfe = analyzeXmlDocument(`
      <NFe>
        <infNFe>
          <ide><nNF>778</nNF><tpNF>1</tpNF><dhEmi>2026-11-25</dhEmi></ide>
          <emit><CNPJ>98765432000188</CNPJ><xNome>GENUINA COMERCIAL LINENSE</xNome></emit>
          <dest><CNPJ>44555666000177</CNPJ><xNome>AUTO ELETRICA CLIENTE LTDA</xNome></dest>
          <total><ICMSTot><vNF>850.00</vNF></ICMSTot></total>
        </infNFe>
      </NFe>
    `);
    const sellerDetection = detectXmlOperation(saleNfe, [mockCompany]);

    rerender(
      <XmlFiscalValidationCard
        analysis={saleNfe}
        detection={sellerDetection}
        companies={[mockCompany]}
        txType={sellerDetection.txType}
        isContactBound={true}
        boundContactName="AUTO ELETRICA"
        isCreatingContact={false}
        onAutoCreateContact={vi.fn()}
      />
    );

    expect(screen.getByTestId('xml-operation-badge')).toHaveTextContent('🟢 Conta a Receber');
    expect(screen.getByTestId('xml-operation-badge')).not.toHaveTextContent('(Venda)');
    expect(screen.getByTestId('xml-contact-bound-badge')).toHaveTextContent('✓ Vinculado aos Contatos');
  });

  it('XmlImportModal blocks [Importar] until Category and Contact are bound, auto-suggests Category, and supports Flexible Installments (+ Adicionar Parcela & 3x split)', async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    // Cash NF-e of R$ 1.300,00 from an unregistered supplier
    const cashNfeXml = `
      <NFe>
        <infNFe>
          <ide><nNF>4500</nNF><tpNF>1</tpNF><dhEmi>2026-11-25</dhEmi></ide>
          <emit><CNPJ>33444555000122</CNPJ><xNome>NOVO FORNECEDOR DE PECAS LTDA</xNome></emit>
          <dest><CNPJ>98765432000188</CNPJ><xNome>GENUINA COMERCIAL LINENSE</xNome></dest>
          <total><ICMSTot><vNF>1300.00</vNF></ICMSTot></total>
        </infNFe>
      </NFe>
    `;

    const { container } = render(
      <XmlImportModal
        userId="user-1"
        categories={mockCategories}
        contacts={mockContacts}
        companies={[mockCompany]}
        selectedCompanyId="all"
        existingTransactions={[]}
        onClose={onClose}
        onImport={onImport}
        onCreateContact={vi.fn()}
      />
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File([cashNfeXml], 'nf-4500.xml', { type: 'text/xml' })] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('xml-destination-fields')).toBeInTheDocument();
    });

    // 1. Category "Fornecedores de Peças" was auto-suggested, but Contact is unbound -> [Importar] MUST be disabled!
    const catSelect = screen.getByTestId('xml-destination-category') as HTMLSelectElement;
    expect(catSelect.value).toBe('cat-forn');

    const confirmBtn = screen.getByTestId('xml-confirm-import-btn');
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByTestId('xml-mandatory-fields-hint')).toBeInTheDocument();

    // Bind contact -> [Importar] unlocks!
    fireEvent.change(screen.getByTestId('xml-destination-contact'), {
      target: { value: 'ct-forn-1' },
    });
    expect(confirmBtn).not.toBeDisabled();

    // 2. Flexible Installment Test A: User edits 1st row to R$ 600,00 and clicks [+ Adicionar Parcela] -> creates 2nd row of R$ 700,00 matching 100%
    const amountInputs = container.querySelectorAll('input[data-testid^="xml-amount-input-"]');
    expect(amountInputs).toHaveLength(1);
    fireEvent.focus(amountInputs[0]);
    fireEvent.change(amountInputs[0], { target: { value: '600,00' } });

    fireEvent.click(screen.getByTestId('xml-add-installment-btn'));

    const updatedInputs = container.querySelectorAll('input[data-testid^="xml-amount-input-"]');
    expect(updatedInputs).toHaveLength(2);
    expect(screen.getByTestId('xml-reconciliation-exact-badge')).toHaveTextContent(
      /Valores Batendo \(100% Conferido\)/i
    );

    // 3. Flexible Installment Test B: Click [3x] quick split -> divides R$ 1.300,00 into 433,34 + 433,33 + 433,33
    fireEvent.click(screen.getByTestId('xml-split-3x-btn'));
    const threeInputs = container.querySelectorAll('input[data-testid^="xml-amount-input-"]');
    expect(threeInputs).toHaveLength(3);
    expect(screen.getByTestId('xml-reconciliation-exact-badge')).toBeInTheDocument();

    fireEvent.click(confirmBtn);
    expect(onImport).toHaveBeenCalledTimes(1);
    const imported = onImport.mock.calls[0][0] as Transaction[];
    expect(imported).toHaveLength(3);
    expect(imported.map((t) => t.amountCents)).toEqual([43334, 43333, 43333]);
    expect(imported.reduce((s, t) => s + t.amountCents, 0)).toBe(130000);
  });

  it('SettleModal shows Partial Settlement split option when paid value is less than total and TransactionModal propagates group metadata', () => {
    const onConfirmSettle = vi.fn();
    const sampleTx: Transaction = {
      id: 'tx-10',
      userId: 'user-1',
      companyId: 'comp-1',
      type: 'receivable',
      description: 'Venda Parcelada (1/3)',
      amountCents: 130000,
      discountCents: 0,
      interestCents: 0,
      dueDate: '2026-11-27',
      paidAt: null,
      status: 'pending',
      paymentMethod: '',
      categoryId: 'cat-venda',
      contactId: 'ct-cli-1',
      documentNumber: 'NF-10',
      issueDate: '2026-11-27',
      installmentGroupId: 'grp-abc',
      installmentNumber: 1,
      installmentTotal: 3,
      isRecurring: false,
      recurrenceInterval: null,
      notes: '',
      source: 'xml',
      createdAt: '',
      updatedAt: '',
    };

    render(
      <SettleModal
        transaction={sampleTx}
        onClose={vi.fn()}
        onConfirm={onConfirmSettle}
      />
    );

    const paidInput = screen.getByTestId('settle-paid-amount-input');
    fireEvent.change(paidInput, { target: { value: '600,00' } });

    expect(screen.getByTestId('partial-settlement-panel')).toHaveTextContent(
      /Baixa Parcial: Quitar R\$\s*600,00 e gerar nova parcela com o saldo restante \(R\$\s*700,00\)/i
    );

    fireEvent.click(screen.getByTestId('settle-confirm-btn'));
    expect(onConfirmSettle).toHaveBeenCalledTimes(1);
    expect(onConfirmSettle.mock.calls[0][6]).toMatchObject({
      isPartial: true,
      paidAmountCents: 60000,
    });

    // TransactionModal propagation checkbox (checked by default for grouped installments)
    const onUpdateSingle = vi.fn();
    render(
      <TransactionModal
        userId="user-1"
        editingTransaction={sampleTx}
        categories={mockCategories}
        contacts={mockContacts}
        companies={[mockCompany]}
        onClose={vi.fn()}
        onSaveBatch={vi.fn()}
        onUpdateSingle={onUpdateSingle}
      />
    );

    const propagateCheckbox = screen.getByTestId('tx-propagate-group-checkbox') as HTMLInputElement;
    expect(propagateCheckbox.checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));
    expect(onUpdateSingle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tx-10' }),
      { propagateGroupMetadata: true }
    );
  });

  it('XmlImportModal handles end-to-end Multi-XML upload, auto-binds matched contacts & categories, and imports batch', async () => {
    const onImport = vi.fn();
    const onClose = vi.fn();

    const xml1 = `
      <NFe>
        <infNFe>
          <ide><nNF>1001</nNF><tpNF>1</tpNF><dhEmi>2026-11-20</dhEmi></ide>
          <emit><CNPJ>12345678000195</CNPJ><xNome>FORNECEDOR UM LTDA</xNome></emit>
          <dest><CNPJ>98765432000188</CNPJ><xNome>GENUINA COMERCIAL LINENSE</xNome></dest>
          <total><ICMSTot><vNF>200.00</vNF></ICMSTot></total>
          <cobr><dup><nDup>01</nDup><dVenc>2026-12-20</dVenc><vDup>225.00</vDup></dup></cobr>
        </infNFe>
      </NFe>
    `;

    const xml2 = `
      <NFe>
        <infNFe>
          <ide><nNF>1002</nNF><tpNF>1</tpNF><dhEmi>2026-11-21</dhEmi></ide>
          <emit><CNPJ>98765432000188</CNPJ><xNome>GENUINA COMERCIAL LINENSE</xNome></emit>
          <dest><CNPJ>44555666000177</CNPJ><xNome>OFICINA CLIENTE LTDA</xNome></dest>
          <total><ICMSTot><vNF>350.00</vNF></ICMSTot></total>
          <cobr><dup><nDup>01</nDup><dVenc>2026-12-21</dVenc><vDup>350.00</vDup></dup></cobr>
        </infNFe>
      </NFe>
    `;

    const { container } = render(
      <XmlImportModal
        userId="user-1"
        categories={mockCategories}
        contacts={mockContacts}
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

    const importAllBtn = screen.getByTestId('xml-import-all-btn');
    expect(importAllBtn).toHaveTextContent('Importar Todas as Notas (2)');

    fireEvent.click(importAllBtn);

    expect(onImport).toHaveBeenCalledTimes(1);
    const importedTxs = onImport.mock.calls[0][0] as Transaction[];
    expect(importedTxs).toHaveLength(2);
    expect(importedTxs[0].categoryId).toBe('cat-forn');
    expect(importedTxs[0].contactId).toBe('ct-forn-1');
    expect(importedTxs[0].interestCents).toBe(2500);
    expect(importedTxs[1].categoryId).toBe('cat-venda');
    expect(importedTxs[1].contactId).toBe('ct-cli-1');
  });

  it('XmlContactMatcher & XmlGenericMapping & XmlPreviewTable remain fully functional', () => {
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

    render(
      <XmlGenericMapping
        recordTag="item"
        fields={['titulo', 'valor']}
        mapping={{ descriptionField: 'titulo', amountField: 'valor', dueDateField: '', documentField: '', contactField: '' }}
        onChangeMapping={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('titulo')).toBeInTheDocument();

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
        installmentTotal: 1,
        installmentGroupId: null,
      },
    ];
    render(
      <XmlPreviewTable
        items={mockItems}
        excludedIds={new Set()}
        duplicateIds={new Set()}
        onToggleItem={vi.fn()}
        onUncheckDuplicates={vi.fn()}
        invoiceTotalCents={15000}
        installmentsTotalCents={15000}
      />
    );
    expect(screen.getByTestId('xml-reconciliation-exact-badge')).toBeInTheDocument();
  });
});
