import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ExcelDropzone,
  ExcelSheetSelector,
  ExcelDefaultsForm,
  ExcelPreviewTable,
  ExcelMappingTable,
  type ExcelPreviewRow,
} from '../index';
import type { Category, Contact } from '../../../types';
import type { ExcelFieldMapping } from '../../../utils/excelParser';

const mockCategories: Category[] = [
  { id: 'cat-1', userId: 'u1', name: 'Alimentação', color: '#ff0000', type: 'payable', createdAt: '', updatedAt: '' },
  { id: 'cat-2', userId: 'u1', name: 'Vendas', color: '#00ff00', type: 'receivable', createdAt: '', updatedAt: '' },
];

const mockContacts: Contact[] = [
  {
    id: 'cont-1',
    userId: 'u1',
    personType: 'PJ',
    kind: 'supplier',
    name: 'Distribuidora ABC Ltda',
    tradeName: 'ABC Distribuidora',
    document: '12.345.678/0001-90',
    phone: '',
    email: '',
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
];

const mockMapping: ExcelFieldMapping = {
  descriptionCol: 'Descricao',
  useDescription: true,
  amountCol: 'Valor',
  dueDateCol: 'Vencimento',
  useDueDate: true,
  typeCol: '',
  useType: false,
  statusCol: '',
  useStatus: false,
  paymentMethodCol: '',
  usePaymentMethod: false,
  categoryCol: '',
  useCategory: false,
  contactCol: '',
  useContact: false,
  documentCol: '',
  useDocument: false,
  notesCol: '',
  useNotes: false,
};

describe('ExcelImport Modular Subcomponents', () => {
  describe('ExcelDropzone', () => {
    it('renders initial texts and handles file click selection', () => {
      const handleFileSelected = vi.fn();
      const handleDownloadTemplate = vi.fn();

      const { container } = render(
        <ExcelDropzone
          fileName=""
          onFileSelected={handleFileSelected}
          onDownloadTemplate={handleDownloadTemplate}
        />
      );

      expect(screen.getByText('Clique ou arraste um arquivo .XLSX, .XLS ou .CSV aqui')).toBeInTheDocument();
      expect(screen.getByText('Baixar planilha modelo (.xlsx)')).toBeInTheDocument();

      // Trigger download template
      fireEvent.click(screen.getByText('Baixar planilha modelo (.xlsx)'));
      expect(handleDownloadTemplate).toHaveBeenCalledTimes(1);

      // Trigger file input
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'planilha.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      fireEvent.change(input, { target: { files: [file] } });
      expect(handleFileSelected).toHaveBeenCalledWith(file);
    });

    it('handles Drag-and-Drop native events and displays visual feedback', () => {
      const handleFileSelected = vi.fn();
      const handleDownloadTemplate = vi.fn();

      render(
        <ExcelDropzone
          fileName=""
          onFileSelected={handleFileSelected}
          onDownloadTemplate={handleDownloadTemplate}
        />
      );

      const dropzone = screen.getByText('Clique ou arraste um arquivo .XLSX, .XLS ou .CSV aqui').closest('label')!;

      // Drag over
      fireEvent.dragOver(dropzone);
      expect(
        screen.getByText('Solte sua planilha Excel aqui para carregar instantaneamente')
      ).toBeInTheDocument();
      expect(dropzone.className).toContain('border-teal-500');

      // Drag leave
      fireEvent.dragLeave(dropzone);
      expect(
        screen.getByText('Clique ou arraste um arquivo .XLSX, .XLS ou .CSV aqui')
      ).toBeInTheDocument();

      // Drop valid .xlsx file
      const validFile = new File(['binary'], 'gastos.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [validFile],
        },
      });

      expect(handleFileSelected).toHaveBeenCalledWith(validFile);
    });

    it('shows selected file name when fileName is provided', () => {
      render(
        <ExcelDropzone
          fileName="contas_novembro.xlsx"
          onFileSelected={vi.fn()}
          onDownloadTemplate={vi.fn()}
        />
      );

      expect(screen.getByText('Arquivo selecionado: contas_novembro.xlsx')).toBeInTheDocument();
    });
  });

  describe('ExcelSheetSelector', () => {
    it('returns null when sheetNames.length <= 1', () => {
      const { container } = render(
        <ExcelSheetSelector
          sheetNames={['Planilha1']}
          selectedSheet="Planilha1"
          onSheetChange={vi.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders select with options and responds to change when multiple sheets exist', () => {
      const handleSheetChange = vi.fn();
      render(
        <ExcelSheetSelector
          sheetNames={['Entradas', 'Saídas', 'Resumo']}
          selectedSheet="Entradas"
          onSheetChange={handleSheetChange}
        />
      );

      expect(screen.getByText('Aba da planilha:')).toBeInTheDocument();
      const select = screen.getByLabelText('Aba da planilha') as HTMLSelectElement;
      expect(select.value).toBe('Entradas');

      fireEvent.change(select, { target: { value: 'Saídas' } });
      expect(handleSheetChange).toHaveBeenCalledWith('Saídas');
    });
  });

  describe('ExcelDefaultsForm', () => {
    it('renders selects when columns are not mapped and triggers callbacks', () => {
      const setDefaultType = vi.fn();
      const setDefaultStatus = vi.fn();
      const setDefaultCategoryId = vi.fn();
      const setDefaultContactId = vi.fn();

      render(
        <ExcelDefaultsForm
          mapping={mockMapping}
          defaultType="payable"
          setDefaultType={setDefaultType}
          defaultStatus="pending"
          setDefaultStatus={setDefaultStatus}
          defaultCategoryId=""
          setDefaultCategoryId={setDefaultCategoryId}
          defaultContactId=""
          setDefaultContactId={setDefaultContactId}
          categories={mockCategories}
          contacts={mockContacts}
        />
      );

      // All 4 default selects should be visible since mockMapping has useType=false, useStatus=false, etc.
      const typeSelect = screen.getByLabelText('Tipo padrão') as HTMLSelectElement;
      const statusSelect = screen.getByLabelText('Situação padrão') as HTMLSelectElement;
      const categorySelect = screen.getByLabelText('Categoria padrão') as HTMLSelectElement;
      const contactSelect = screen.getByLabelText('Contato padrão') as HTMLSelectElement;

      expect(typeSelect).toBeInTheDocument();
      expect(statusSelect).toBeInTheDocument();
      expect(categorySelect).toBeInTheDocument();
      expect(contactSelect).toBeInTheDocument();

      fireEvent.change(typeSelect, { target: { value: 'receivable' } });
      expect(setDefaultType).toHaveBeenCalledWith('receivable');

      fireEvent.change(statusSelect, { target: { value: 'settled' } });
      expect(setDefaultStatus).toHaveBeenCalledWith('settled');

      fireEvent.change(categorySelect, { target: { value: 'cat-1' } });
      expect(setDefaultCategoryId).toHaveBeenCalledWith('cat-1');

      fireEvent.change(contactSelect, { target: { value: 'cont-1' } });
      expect(setDefaultContactId).toHaveBeenCalledWith('cont-1');
    });

    it('returns null when all columns are fully mapped in the sheet', () => {
      const fullyMapped: ExcelFieldMapping = {
        ...mockMapping,
        typeCol: 'Tipo',
        useType: true,
        statusCol: 'Status',
        useStatus: true,
        categoryCol: 'Categoria',
        useCategory: true,
        contactCol: 'Contato',
        useContact: true,
      };

      const { container } = render(
        <ExcelDefaultsForm
          mapping={fullyMapped}
          defaultType="payable"
          setDefaultType={vi.fn()}
          defaultStatus="pending"
          setDefaultStatus={vi.fn()}
          defaultCategoryId=""
          setDefaultCategoryId={vi.fn()}
          defaultContactId=""
          setDefaultContactId={vi.fn()}
          categories={mockCategories}
          contacts={mockContacts}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('ExcelMappingTable', () => {
    it('renders headers, sampleOf and triggers mapping changes', () => {
      const handleMappingChange = vi.fn();
      const sampleOf = vi.fn((col: string) => (col === 'Valor' ? '150,00' : 'Amostra'));

      render(
        <ExcelMappingTable
          headers={['Descricao', 'Valor', 'Vencimento']}
          mapping={mockMapping}
          onMappingChange={handleMappingChange}
          sampleOf={sampleOf}
          rowCount={10}
        />
      );

      expect(screen.getByText(/3 coluna\(s\) · 10 linha\(s\)/)).toBeInTheDocument();
      expect(screen.getByText('Ex: 150,00')).toBeInTheDocument();

      const amountSelect = screen.getByLabelText('Coluna de Valor');
      fireEvent.change(amountSelect, { target: { value: 'Valor' } });
      expect(handleMappingChange).toHaveBeenCalled();
    });
  });

  describe('ExcelPreviewTable', () => {
    const mockRows: ExcelPreviewRow[] = [
      {
        rowIndex: 0,
        selected: true,
        description: 'Licença Software',
        amountCents: 25000,
        dueDate: '2026-12-05',
        type: 'payable',
        status: 'pending',
        paymentMethod: '',
        categoryId: 'cat-1',
        categoryLabel: 'Alimentação',
        contactId: 'cont-1',
        contactLabel: 'Distribuidora ABC Ltda',
        rawContactName: 'Distribuidora ABC Ltda',
        documentNumber: 'NF-99',
        notes: '',
      },
      {
        rowIndex: 1,
        selected: false,
        description: 'Venda de Consultoria',
        amountCents: 120000,
        dueDate: '2026-12-10',
        type: 'receivable',
        status: 'settled',
        paymentMethod: 'Pix',
        categoryId: null,
        categoryLabel: 'Sem categoria',
        contactId: null,
        contactLabel: '—',
        rawContactName: 'Empresa Nova Desconhecida',
        documentNumber: '',
        notes: '',
      },
    ];

    it('renders table rows, formatted BRL indicators, and handles selection toggles', () => {
      const handleToggleRow = vi.fn();
      const handleToggleAll = vi.fn();
      const handleUncheckDuplicates = vi.fn();
      const handleCreateContacts = vi.fn();

      render(
        <ExcelPreviewTable
          previewRows={mockRows}
          selectedCount={1}
          totalSelectedCents={25000}
          duplicateRowIndices={new Set([0])}
          unmatchedContactNames={['Empresa Nova Desconhecida']}
          creatingContacts={false}
          onToggleRow={handleToggleRow}
          onToggleAll={handleToggleAll}
          onUncheckDuplicates={handleUncheckDuplicates}
          onCreateUnmatchedContacts={handleCreateContacts}
        />
      );

      // Check BRL formatting
      expect(screen.getByText('Total selecionado: R$ 250,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 250,00')).toBeInTheDocument();
      expect(screen.getByText('R$ 1.200,00')).toBeInTheDocument();

      // Check duplicate warning banner & button
      expect(screen.getByText(/Possível duplicidade em 1 linha\(s\)/)).toBeInTheDocument();
      const uncheckBtn = screen.getByText('Desmarcar duplicatas');
      fireEvent.click(uncheckBtn);
      expect(handleUncheckDuplicates).toHaveBeenCalledTimes(1);

      // Check unmatched contacts banner & button
      expect(screen.getByText(/1 contato\(s\) da planilha ainda não estão cadastrados/)).toBeInTheDocument();
      const createContactsBtn = screen.getByText('Cadastrar 1 contatos automaticamente');
      fireEvent.click(createContactsBtn);
      expect(handleCreateContacts).toHaveBeenCalledTimes(1);

      // Toggle single row
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);
      expect(handleToggleRow).toHaveBeenCalledWith(0);

      // Toggle all
      const toggleAllBtn = screen.getByText('Selecionar todos');
      fireEvent.click(toggleAllBtn);
      expect(handleToggleAll).toHaveBeenCalledTimes(1);
    });

    it('renders empty message when previewRows is empty', () => {
      render(
        <ExcelPreviewTable
          previewRows={[]}
          selectedCount={0}
          totalSelectedCents={0}
          duplicateRowIndices={new Set()}
          unmatchedContactNames={[]}
          creatingContacts={false}
          onToggleRow={vi.fn()}
          onToggleAll={vi.fn()}
          onUncheckDuplicates={vi.fn()}
          onCreateUnmatchedContacts={vi.fn()}
        />
      );

      expect(
        screen.getByText('Nenhuma linha com valor numérico válido encontrada na coluna selecionada.')
      ).toBeInTheDocument();
    });
  });
});
