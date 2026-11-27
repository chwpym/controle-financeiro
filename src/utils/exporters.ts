import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Category, Company, Contact, LocalBackupPayload, Transaction } from '../types';
import { formatBRL, formatDateBR, isOverdue, todayISO } from './format';

export interface ExportContext {
  title: string;
  periodLabel: string;
  filterSummary?: string;
  username: string;
  transactions: Transaction[];
  categories: Category[];
  contacts: Contact[];
}

export function exportTransactionsToPDF(ctx: ExportContext): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const catMap = new Map(ctx.categories.map((c) => [c.id, c.name]));
  const contactMap = new Map(ctx.contacts.map((c) => [c.id, c.name]));
  const today = todayISO();

  let receivableCents = 0;
  let payableCents = 0;
  let overdueCents = 0;

  for (const t of ctx.transactions) {
    if (t.type === 'receivable') receivableCents += t.amountCents;
    else payableCents += t.amountCents;
    if (isOverdue(t, today)) overdueCents += t.amountCents;
  }
  const balanceCents = receivableCents - payableCents;

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`FluxoClaro — ${ctx.title}`, 14, 15);

  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Período: ${ctx.periodLabel}   |   Usuário: ${ctx.username}   |   Emitido em: ${formatDateBR(today)}`, 14, 21.5);

  let nextY = 27.5;
  if (ctx.filterSummary) {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Filtros aplicados: ${ctx.filterSummary}`, 14, nextY);
    nextY += 5.5;
  }

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `A Receber: ${formatBRL(receivableCents)}    |    A Pagar: ${formatBRL(payableCents)}    |    Saldo: ${formatBRL(balanceCents)}    |    Em Atraso: ${formatBRL(overdueCents)}`,
    14,
    nextY
  );

  const rows = ctx.transactions.map((t) => {
    const statusLabel =
      t.status === 'settled'
        ? t.type === 'receivable'
          ? 'Recebido'
          : 'Pago'
        : isOverdue(t, today)
          ? 'Vencido'
          : 'Pendente';
    const parcela = t.installmentTotal > 1 ? `${t.installmentNumber}/${t.installmentTotal}` : '1/1';
    return [
      formatDateBR(t.dueDate),
      t.type === 'receivable' ? 'A Receber' : 'A Pagar',
      t.description,
      parcela,
      (t.categoryId && catMap.get(t.categoryId)) || 'Sem categoria',
      (t.contactId && contactMap.get(t.contactId)) || '—',
      statusLabel,
      t.status === 'settled' ? (t.paymentMethod || '—') : '—',
      formatBRL(t.amountCents),
    ];
  });

  autoTable(doc, {
    startY: nextY + 5,
    head: [['Vencimento', 'Tipo', 'Descrição', 'Parcela', 'Categoria', 'Contato', 'Status', 'Forma Pgto', 'Valor (BRL)']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.2 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      3: { halign: 'center' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`fluxoclaro-relatorio-${today}.pdf`);
}

export function exportTransactionsToExcel(ctx: ExportContext): void {
  const catMap = new Map(ctx.categories.map((c) => [c.id, c.name]));
  const contactMap = new Map(ctx.contacts.map((c) => [c.id, c.name]));
  const today = todayISO();

  let receivableCents = 0;
  let payableCents = 0;
  let settledReceivableCents = 0;
  let settledPayableCents = 0;

  const sheetRows = ctx.transactions.map((t) => {
    if (t.type === 'receivable') {
      receivableCents += t.amountCents;
      if (t.status === 'settled') settledReceivableCents += t.amountCents;
    } else {
      payableCents += t.amountCents;
      if (t.status === 'settled') settledPayableCents += t.amountCents;
    }
    const statusLabel =
      t.status === 'settled'
        ? t.type === 'receivable'
          ? 'Recebido'
          : 'Pago'
        : isOverdue(t, today)
          ? 'Vencido'
          : 'Pendente';

    return {
      Vencimento: formatDateBR(t.dueDate),
      Tipo: t.type === 'receivable' ? 'A Receber' : 'A Pagar',
      Descrição: t.description,
      Parcela: `${t.installmentNumber}/${t.installmentTotal}`,
      Categoria: (t.categoryId && catMap.get(t.categoryId)) || 'Sem categoria',
      'Favorecido / Cliente': (t.contactId && contactMap.get(t.contactId)) || '',
      Documento: t.documentNumber || '',
      Status: statusLabel,
      'Forma de Pagamento / Recebimento': t.status === 'settled' ? (t.paymentMethod || '') : '',
      'Data Baixa': t.paidAt ? formatDateBR(t.paidAt) : '',
      Observações: t.notes || '',
      'Valor (R$)': Number((t.amountCents / 100).toFixed(2)),
    };
  });

  const summaryRows = [
    { Indicador: 'Período', Valor: ctx.periodLabel },
    { Indicador: 'Filtros Aplicados', Valor: ctx.filterSummary || 'Nenhum filtro adicional' },
    { Indicador: 'Usuário', Valor: ctx.username },
    { Indicador: 'Quantidade de Lançamentos', Valor: ctx.transactions.length },
    { Indicador: 'Total a Receber (R$)', Valor: Number((receivableCents / 100).toFixed(2)) },
    { Indicador: 'Recebido Efetivado (R$)', Valor: Number((settledReceivableCents / 100).toFixed(2)) },
    { Indicador: 'Total a Pagar (R$)', Valor: Number((payableCents / 100).toFixed(2)) },
    { Indicador: 'Pago Efetivado (R$)', Valor: Number((settledPayableCents / 100).toFixed(2)) },
    { Indicador: 'Saldo Projetado (R$)', Valor: Number(((receivableCents - payableCents) / 100).toFixed(2)) },
  ];

  const wb = XLSX.utils.book_new();
  const wsTx = XLSX.utils.json_to_sheet(sheetRows);
  const wsSum = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Lançamentos');
  XLSX.utils.book_append_sheet(wb, wsSum, 'Resumo');
  XLSX.writeFile(wb, `fluxoclaro-relatorio-${today}.xlsx`);
}

export interface ReceiptPdfParams {
  transaction: Transaction;
  category?: Category;
  contact?: Contact;
  company?: Company;
  username?: string;
}

/**
 * EN: Generates a clean Commercial Receipt / Payment Voucher PDF suitable for customers and suppliers.
 *     Omits internal system audit fields (`username`, internal `category`, `source`, `isRecurring`)
 *     and guarantees safe vertical clearance (`signY = finalY + 22`) so the signature line never
 *     overlaps with multi-line commercial notes.
 * PT: Gera um Recibo / Comprovante Comercial limpo em PDF próprio para envio a clientes e fornecedores.
 *     Remove metadados internos de auditoria (`usuário responsável`, `categoria interna`, `origem`, `recorrência`)
 *     e garante espaçamento vertical de segurança (`signY = finalY + 22`) sem sobrepor as Observações.
 */
export function exportTransactionReceiptPDF({
  transaction: t,
  contact,
  company,
}: ReceiptPdfParams): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = todayISO();
  const overdue = isOverdue(t, today);
  const isSettled = t.status === 'settled';
  const isReceivable = t.type === 'receivable';

  const headingTitle = isSettled
    ? isReceivable
      ? 'RECIBO DE RECEBIMENTO'
      : 'RECIBO DE PAGAMENTO'
    : 'COMPROVANTE DE LANÇAMENTO';

  const statusText = isSettled
    ? isReceivable
      ? 'RECEBIDO'
      : 'PAGO'
    : overdue
      ? 'VENCIDO (PENDENTE)'
      : 'PENDENTE';

  // Official Company Header Band / Cabeçalho Oficial da Empresa
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);

  if (company) {
    doc.setFontSize(14);
    doc.text(company.tradeName || company.legalName, 15, 11);

    doc.setFontSize(8);
    const subInfo = [
      company.legalName && company.legalName !== company.tradeName ? company.legalName : null,
      company.document ? `CNPJ: ${company.document}` : null,
      company.stateRegistration ? `IE: ${company.stateRegistration}` : null,
    ].filter(Boolean).join('   |   ');
    doc.text(subInfo, 15, 17);

    const companyAddress = [
      [company.street, company.number].filter(Boolean).join(', '),
      company.complement,
      company.neighborhood,
      [company.city, company.state].filter(Boolean).join(' / '),
      company.cep ? `CEP ${company.cep}` : null,
    ].filter(Boolean).join(' — ');
    doc.text(companyAddress || 'Endereço não informado', 15, 23);

    doc.setFontSize(8.5);
    doc.text(`${headingTitle}   |   Emitido em ${formatDateBR(today)}`, 15, 30);

    if (company.logoDataUrl && company.logoDataUrl.startsWith('data:image/')) {
      try {
        doc.addImage(company.logoDataUrl, 168, 5, 27, 26, undefined, 'FAST');
      } catch {
        // Silently ignore if image format unsupported in PDF canvas
      }
    }
  } else {
    doc.setFontSize(16);
    doc.text(headingTitle, 15, 14);
    doc.setFontSize(9.5);
    doc.text(`Emitido em ${formatDateBR(today)}`, 15, 22);
  }

  // Value & Status Highlight Box / Destaque do Valor e Situação
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 42, 180, 28, 3, 3, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text('VALOR DO LANÇAMENTO', 22, 50);
  doc.text('SITUAÇÃO', 120, 50);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text(formatBRL(t.amountCents), 22, 61);

  doc.setFontSize(12);
  if (isSettled) doc.setTextColor(4, 120, 87);
  else if (overdue) doc.setTextColor(220, 38, 38);
  else doc.setTextColor(217, 119, 6);
  doc.text(statusText, 120, 60);

  // Commercial Transaction Table (Strictly commercial fields only)
  // Tabela Comercial do Lançamento (estritamente dados comerciais do pagamento/recebimento)
  const parcelaLabel = t.installmentTotal > 1 ? `${t.installmentNumber} de ${t.installmentTotal}` : 'À vista (1/1)';
  const originalCents = Math.max(1, t.amountCents + (t.discountCents || 0) - (t.interestCents || 0));

  const detailRows: [string, string][] = [
    ['Descrição', t.description],
    ['Parcela', parcelaLabel],
    ['Documento / NF-e', t.documentNumber || '—'],
    ['Data de Vencimento', formatDateBR(t.dueDate)],
    ['Data da Baixa', t.paidAt ? formatDateBR(t.paidAt) : 'Pendente de baixa'],
    [
      isReceivable ? 'Forma de Recebimento' : 'Forma de Pagamento',
      t.paymentMethod || (isSettled ? 'Não informada' : 'Pendente de baixa'),
    ],
    ...(t.discountCents > 0 || t.interestCents > 0
      ? ([
          ['Valor Original', formatBRL(originalCents)],
          ...(t.discountCents > 0 ? ([['Desconto / Abatimento (-)', `- ${formatBRL(t.discountCents)}`]] as [string, string][]) : []),
          ...(t.interestCents > 0 ? ([['Juros / Acréscimo (+)', `+ ${formatBRL(t.interestCents)}`]] as [string, string][]) : []),
          ['Valor Final Efetivado', formatBRL(t.amountCents)],
        ] as [string, string][])
      : []),
  ];

  autoTable(doc, {
    startY: 76,
    head: [['Dados do Lançamento', 'Informação']],
    body: detailRows,
    theme: 'grid',
    styles: { fontSize: 9.5, cellPadding: 3 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { textColor: [15, 23, 42] },
    },
  });

  const afterTxY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 155) + 8;

  // Counterparty Details Block (Payer/Customer or Payee/Supplier)
  // Dados do Pagador/Cliente ou Favorecido/Fornecedor
  const contactAddress = contact
    ? [
        [contact.street, contact.number].filter(Boolean).join(', '),
        contact.complement,
        contact.neighborhood,
        [contact.city, contact.state].filter(Boolean).join(' / '),
        contact.cep ? `CEP ${contact.cep}` : '',
      ]
        .filter(Boolean)
        .join(' — ')
    : '';

  const contactRows: [string, string][] = contact
    ? [
        ['Nome / Razão Social', `${contact.name}${contact.tradeName ? ` (${contact.tradeName})` : ''}`],
        ['CNPJ / CPF', contact.document || 'Não informado'],
        ['Telefone / E-mail', [contact.phone, contact.email].filter(Boolean).join(' · ') || '—'],
        ['Endereço', contactAddress || '—'],
      ]
    : [[isReceivable ? 'Pagador / Cliente' : 'Favorecido / Fornecedor', 'Não informado']];

  autoTable(doc, {
    startY: afterTxY,
    head: [[isReceivable ? 'Dados do Pagador / Cliente' : 'Dados do Favorecido / Fornecedor', 'Detalhes']],
    body: contactRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.8 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 65, fontStyle: 'bold', textColor: [51, 65, 85] },
      1: { textColor: [15, 23, 42] },
    },
  });

  let finalY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || afterTxY + 35) + 8;

  // Clean commercial notes (strip internal "Importado via XML (...)" prefix if present alongside commercial notes)
  const cleanNotes = (t.notes || '')
    .replace(/^Importado via XML(?:\s*\([^)]*\))?\s*\|\s*/i, '')
    .replace(/^Importado via XML(?:\s*\([^)]*\))?$/i, '')
    .trim();

  if (cleanNotes) {
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Observações:', 15, finalY);
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(cleanNotes, 180);
    doc.text(wrapped, 15, finalY + 5);
    finalY += 6 + wrapped.length * 4.5;
  }

  // Safe Signature Line Clearance (`signY = finalY + 22`) — adds a new page if near bottom margin
  // Espaçamento vertical de segurança (`signY = finalY + 22`) impedindo sobreposição com Observações
  let signY = finalY + 22;
  if (signY > 272) {
    doc.addPage();
    signY = 40;
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(35, signY, 175, signY);
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    contact ? `${contact.name}${contact.document ? ` (${contact.document})` : ''}` : 'Assinatura / Conferência',
    105,
    signY + 5,
    { align: 'center' }
  );

  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${company ? `${company.tradeName || company.legalName} · ` : ''}Comprovante emitido em ${formatDateBR(today)}.`,
    105,
    287,
    { align: 'center' }
  );

  const safeRef = (t.documentNumber || t.id.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`recibo-${safeRef}-${today}.pdf`);
}

export function downloadLocalBackup(payload: LocalBackupPayload): void {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fluxoclaro-backup-${payload.username}-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseLocalBackupFile(text: string): LocalBackupPayload {
  const parsed = JSON.parse(text) as LocalBackupPayload;
  if (
    !parsed ||
    parsed.app !== 'FluxoClaro' ||
    !Array.isArray(parsed.transactions) ||
    !Array.isArray(parsed.contacts) ||
    !Array.isArray(parsed.categories)
  ) {
    throw new Error('Arquivo não corresponde a um backup válido do FluxoClaro.');
  }
  return parsed;
}
