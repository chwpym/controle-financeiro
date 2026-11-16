import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Category, Contact, LocalBackupPayload, Transaction } from '../types';
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
  username: string;
}

export function exportTransactionReceiptPDF({
  transaction: t,
  category,
  contact,
  username,
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

  // Header band
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(headingTitle, 15, 14);
  doc.setFontSize(9.5);
  doc.text(`FluxoClaro · Controle Financeiro (BRL)   |   Emitido em ${formatDateBR(today)}`, 15, 22);

  // Value & Status Highlight Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 38, 180, 28, 3, 3, 'FD');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text('VALOR DO LANÇAMENTO', 22, 46);
  doc.text('SITUAÇÃO', 120, 46);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(18);
  doc.text(formatBRL(t.amountCents), 22, 57);

  doc.setFontSize(12);
  if (isSettled) doc.setTextColor(4, 120, 87);
  else if (overdue) doc.setTextColor(220, 38, 38);
  else doc.setTextColor(217, 119, 6);
  doc.text(statusText, 120, 56);

  // Reference line
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.text(`Identificador: ${t.id.slice(0, 8).toUpperCase()}   |   Usuário responsável: ${username}`, 15, 74);

  // Details table
  const parcelaLabel = t.installmentTotal > 1 ? `${t.installmentNumber} de ${t.installmentTotal}` : 'À vista (1/1)';
  const originLabel = t.source === 'xml' ? 'Importação XML' : t.source === 'excel' ? 'Importação Excel' : 'Lançamento Manual';
  const recurrenceLabel =
    t.isRecurring && t.recurrenceInterval
      ? t.recurrenceInterval === 'biweekly'
        ? 'Sim (Quinzenal)'
        : t.recurrenceInterval === 'yearly'
          ? 'Sim (Anual)'
          : 'Sim (Mensal)'
      : 'Não';

  const originalCents = Math.max(1, t.amountCents + (t.discountCents || 0) - (t.interestCents || 0));
  const detailRows: [string, string][] = [
    ['Descrição', t.description],
    ['Tipo de Conta', isReceivable ? 'Conta a Receber (Entrada)' : 'Conta a Pagar (Saída)'],
    ['Data de Vencimento', formatDateBR(t.dueDate)],
    ['Data da Baixa / Pagamento', t.paidAt ? formatDateBR(t.paidAt) : 'Não baixado'],
    ['Forma de Pagamento / Recebimento', t.paymentMethod || (isSettled ? 'Não informada' : 'Pendente de baixa')],
    ...(t.discountCents > 0 || t.interestCents > 0
      ? ([
          ['Valor Original', formatBRL(originalCents)],
          ...(t.discountCents > 0 ? ([['Desconto (-)', `- ${formatBRL(t.discountCents)}`]] as [string, string][]) : []),
          ...(t.interestCents > 0 ? ([['Juros / Multa (+)', `+ ${formatBRL(t.interestCents)}`]] as [string, string][]) : []),
          ['Valor Final Efetivado', formatBRL(t.amountCents)],
        ] as [string, string][])
      : []),
    ['Parcelamento', parcelaLabel],
    ['Conta Recorrente / Fixa', recurrenceLabel],
    ['Categoria', category ? category.name : 'Sem categoria'],
    ['Número do Documento / NF', t.documentNumber || '—'],
    ['Origem do Registro', originLabel],
  ];

  autoTable(doc, {
    startY: 79,
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

  const afterTxY = ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 175) + 8;

  // Contact Details block
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
        ['Tipo / Documento', `${contact.personType === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'} — ${contact.document || 'Não informado'}`],
        ['Telefone / E-mail', [contact.phone, contact.email].filter(Boolean).join(' · ') || '—'],
        ['Endereço', contactAddress || '—'],
      ]
    : [['Favorecido / Pagador', 'Nenhum contato PF/PJ vinculado a este lançamento']];

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

  if (t.notes) {
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text('Observações:', 15, finalY);
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(t.notes, 180);
    doc.text(wrapped, 15, finalY + 5);
    finalY += 8 + wrapped.length * 4.5;
  }

  // Signature / Receipt declaration
  const signY = Math.min(268, Math.max(finalY + 12, 240));
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
    `FluxoClaro · Documento gerado em ${formatDateBR(today)} para conferência financeira.`,
    105,
    287,
    { align: 'center' }
  );

  const safeRef = (t.documentNumber || t.id.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`recibo-fluxoclaro-${safeRef}-${today}.pdf`);
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
