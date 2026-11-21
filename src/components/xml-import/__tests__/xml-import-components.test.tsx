import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  XmlDropzone,
  XmlContactMatcher,
  XmlPreviewTable,
  XmlGenericMapping,
  XmlDestinationFields,
} from '../index';
import { XmlImportModal } from '../../XmlImportModal';
import type { Category, Contact, Transaction } from '../../../types';
import type { ParsedXmlPreviewItem } from '../../../utils/xmlParser';

describe('XmlImport Modular Subcomponents', () => {
  it('XmlDropzone renders and triggers onFileSelected on input change', () => {
    const handleFile = vi.fn();
    const { container } = render(<XmlDropzone fileName="" onFileSelected={handleFile} />);

    expect(screen.getByText('Clique ou arraste um arquivo .XML aqui')).toBeInTheDocument();
    expect(screen.getByText(/Suporta NF-e/)).toBeInTheDocument();

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const dummyFile = new File(['<xml></xml>'], 'test.xml', { type: 'text/xml' });
    fireEvent.change(input, { target: { files: [dummyFile] } });

    expect(handleFile).toHaveBeenCalledWith(dummyFile);
  });

  it('XmlContactMatcher renders customer info and auto-create button for receivable', () => {
    const handleAutoCreate = vi.fn();
    render(
      <XmlContactMatcher
        txType="receivable"
        title="Cliente identificado (Destinatário NF-e)"
        contactName="CLIENTE TESTE LTDA"
        contactTradeName="TESTE"
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

    expect(screen.getByText('Cliente identificado (Destinatário NF-e)')).toBeInTheDocument();
    expect(screen.getByText(/CLIENTE TESTE LTDA/)).toBeInTheDocument();
    expect(screen.getByText(/Av Paulista, 100, Bela Vista, São Paulo\/SP/)).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: /Cadastrar cliente e vincular/i });
    fireEvent.click(createBtn);
    expect(handleAutoCreate).toHaveBeenCalledTimes(1);
  });

  it('XmlPreviewTable displays items, duplicate warning, and allows toggling', () => {
    const handleToggle = vi.fn();
    const handleUncheck = vi.fn();

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

    render(
      <XmlPreviewTable
        items={mockItems}
        excludedIds={new Set(['item-2'])}
        duplicateIds={new Set(['item-1'])}
        onToggleItem={handleToggle}
        onUncheckDuplicates={handleUncheck}
      />
    );

    expect(screen.getByText(/Possível duplicidade detectada em 1 item/)).toBeInTheDocument();
    expect(screen.getByText('1 de 2 item(ns) selecionado(s)')).toBeInTheDocument();
    expect(screen.getByText('Total selecionado: R$ 150,00')).toBeInTheDocument();

    const uncheckBtn = screen.getByRole('button', { name: /Desmarcar duplicados/i });
    fireEvent.click(uncheckBtn);
    expect(handleUncheck).toHaveBeenCalledTimes(1);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(handleToggle).toHaveBeenCalledWith('item-1');
  });

  it('XmlGenericMapping renders mapping select inputs', () => {
    const handleChange = vi.fn();
    render(
      <XmlGenericMapping
        recordTag="item"
        fields={['titulo', 'valor', 'vencimento']}
        mapping={{
          descriptionField: 'titulo',
          amountField: 'valor',
          dueDateField: 'vencimento',
          documentField: '',
          contactField: '',
        }}
        onChangeMapping={handleChange}
      />
    );

    expect(screen.getByText(/Mapeamento de XML genérico/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('titulo')).toBeInTheDocument();
    expect(screen.getByDisplayValue('valor')).toBeInTheDocument();
  });

  it('XmlDestinationFields renders categories and contacts matching transaction type', () => {
    const categories: Category[] = [
      { id: 'cat-1', userId: 'u1', name: 'Vendas de Peças', type: 'receivable', color: '#10b981', createdAt: '', updatedAt: '' },
      { id: 'cat-2', userId: 'u1', name: 'Compras de Peças', type: 'payable', color: '#ef4444', createdAt: '', updatedAt: '' },
    ];
    const contacts: Contact[] = [
      { id: 'ct-1', userId: 'u1', personType: 'PJ', kind: 'customer', name: 'Cliente Auto', tradeName: '', document: '111', phone: '', email: '', cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', createdAt: '', updatedAt: '' },
    ];

    render(
      <XmlDestinationFields
        txType="receivable"
        categories={categories}
        categoryId="cat-1"
        onChangeCategory={vi.fn()}
        contacts={contacts}
        contactId="ct-1"
        onChangeContact={vi.fn()}
      />
    );

    expect(screen.getByText('Vendas de Peças')).toBeInTheDocument();
    expect(screen.queryByText('Compras de Peças')).not.toBeInTheDocument();
    expect(screen.getByText('[PJ] Cliente Auto')).toBeInTheDocument();
  });

  it('XmlImportModal renders modal with title and toggle between A Pagar and A Receber', () => {
    const categories: Category[] = [];
    const contacts: Contact[] = [];
    const existingTransactions: Transaction[] = [];

    render(
      <XmlImportModal
        userId="user-1"
        categories={categories}
        contacts={contacts}
        existingTransactions={existingTransactions}
        onClose={vi.fn()}
        onImport={vi.fn()}
        onCreateContact={vi.fn()}
      />
    );

    expect(screen.getByText('Importação Avançada de XML (NF-e / NFS-e)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Conta a Pagar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Conta a Receber/i })).toBeInTheDocument();
  });
});
