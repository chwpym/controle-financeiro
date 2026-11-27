/**
 * EN: Financial Report Exporters (PDF, Excel, Backup) & 2-Way A4 Commercial Receipt Generator (Phase 11.1.2).
 *     - `exportTransactionReceiptPDF`: Renders an economical 2-copies-per-A4 portrait sheet (~135mm each):
 *       * Top Half: `1ª VIA — CLIENTE / PAGADOR` (or Favorecido)
 *       * Center Cut Line (Y ≈ 148.5mm): `✂ - - - - - - - - - - - - - - - - - - - - - - - -`
 *       * Bottom Half: `2ª VIA — EMPRESA / ARQUIVO (CANHOTO ASSINADO)`
 *     - `exportBlankReceiptPDF`: Generates a 2-copies-per-A4 lined blank receipt with official company
 *       header and dotted lines for handwritten value, amount in words, reference, date, and signature.
 * PT: Exportadores de Relatórios (PDF, Excel, Backup) e Gerador de Recibo Comercial em 2 Vias por A4 (Etapa 11.1.2).
 *     - `exportTransactionReceiptPDF`: Estrutura folha A4 retrato com duas vias compactas (~135mm cada)
 *       separadas por linha de picote central (`✂ - - -`), sem dados internos de auditoria.
 *     - `exportBlankReceiptPDF`: Gera folha A4 com duas vias pautadas em branco para preenchimento manual.
 */

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
  doc.text(
    `Período: ${ctx.periodLabel}   |   Usuário: ${ctx.username}   |   Emitido em: ${formatDateBR(today)}`,
    14,
    21.5
  );

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
      t.status === 'settled' ? t.paymentMethod || '—' : '—',
      formatBRL(t.amountCents),
    ];
  });

  autoTable(doc, {
    startY: nextY + 5,
    head: [
      [
        'Vencimento',
        'Tipo',
        'Descrição',
        'Parcela',
        'Categoria',
        'Contato',
        'Status',
        'Forma Pgto',
        'Valor (BRL)',
      ],
    ],
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
      'Forma de Pagamento / Recebimento': t.status === 'settled' ? t.paymentMethod || '' : '',
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
    {
      Indicador: 'Saldo Projetado (R$)',
      Valor: Number(((receivableCents - payableCents) / 100).toFixed(2)),
    },
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
 * EN: Draws the perforated cut line (`✂ - - -`) horizontally across the center of an A4 portrait sheet.
 * PT: Desenha a linha pontilhada de picote/corte (`✂ - - -`) no centro da folha A4 retrato.
 */
function drawCenterCutLine(doc: jsPDF, cutY = 148.5): void {
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([2.2, 2.2], 0);
  doc.line(10, cutY, 200, cutY);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(255, 255, 255);
  doc.rect(12, cutY - 2.5, 22, 5, 'F');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('✂  CORTE AQUI', 13.5, cutY + 1);
}

/**
 * EN: Draws the compact official company header inside one half-sheet A4 voucher (`height: 22mm`).
 * PT: Renderiza o cabeçalho oficial compacto da empresa dentro de uma meia-folha A4 (`altura: 22mm`).
 */
function drawHalfSheetCompanyHeader(
  doc: jsPDF,
  offsetY: number,
  headingTitle: string,
  viaLabel: string,
  today: string,
  company?: Company
): void {
  doc.setFillColor(15, 118, 110);
  doc.roundedRect(12, offsetY, 186, 22, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);

  if (company) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text((company.tradeName || company.legalName).slice(0, 58), 16, offsetY + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    const subInfo = [
      company.legalName && company.legalName !== company.tradeName ? company.legalName : null,
      company.document ? `CNPJ: ${company.document}` : null,
      company.phone ? `Tel: ${company.phone}` : null,
    ]
      .filter(Boolean)
      .join('  |  ');
    doc.text(subInfo.slice(0, 95), 16, offsetY + 11);

    const companyAddress = [
      [company.street, company.number].filter(Boolean).join(', '),
      company.neighborhood,
      [company.city, company.state].filter(Boolean).join('/'),
      company.cep ? `CEP ${company.cep}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    doc.text((companyAddress || 'Endereço comercial').slice(0, 95), 16, offsetY + 15.3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`${headingTitle}  •  ${viaLabel}  •  Emitido em ${formatDateBR(today)}`, 16, offsetY + 19.8);

    if (company.logoDataUrl && company.logoDataUrl.startsWith('data:image/')) {
      try {
        doc.addImage(company.logoDataUrl, 174, offsetY + 2, 20, 18, undefined, 'FAST');
      } catch {
        // Ignore unsupported image data formats safely
      }
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.text(headingTitle, 16, offsetY + 8.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${viaLabel}  •  Emitido em ${formatDateBR(today)}`, 16, offsetY + 15.5);
  }
}

/**
 * EN: Renders one compact commercial receipt copy (~134mm tall) starting at `offsetY`.
 * PT: Renderiza uma via compacta do recibo comercial (~134mm de altura) iniciando em `offsetY`.
 */
function renderReceiptCopy(
  doc: jsPDF,
  offsetY: number,
  viaLabel: string,
  params: {
    t: Transaction;
    contact?: Contact;
    company?: Company;
    today: string;
  }
): void {
  const { t, contact, company, today } = params;
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

  // Outer card frame for this copy
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, offsetY, 186, 134, 2, 2, 'S');

  drawHalfSheetCompanyHeader(doc, offsetY, headingTitle, viaLabel, today, company);

  // Value & Status Highlight Strip (Y + 24.5 .. Y + 40.5)
  const boxY = offsetY + 24.5;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, boxY, 178, 15.5, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(100, 116, 139);
  doc.text('VALOR DO DOCUMENTO', 20, boxY + 5);
  doc.text('SITUAÇÃO', 92, boxY + 5);
  doc.text('VENCIMENTO / BAIXA', 140, boxY + 5);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(formatBRL(t.amountCents), 20, boxY + 12.2);

  doc.setFontSize(9.5);
  if (isSettled) doc.setTextColor(4, 120, 87);
  else if (overdue) doc.setTextColor(220, 38, 38);
  else doc.setTextColor(217, 119, 6);
  doc.text(statusText, 92, boxY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `${formatDateBR(t.dueDate)}${t.paidAt ? `  •  Baixa: ${formatDateBR(t.paidAt)}` : ''}`,
    140,
    boxY + 11.8
  );

  // Compact 2-Column Commercial Details Grid (Y + 42.5)
  const parcelaLabel =
    t.installmentTotal > 1
      ? `${t.installmentNumber} de ${t.installmentTotal}`
      : 'À vista (1/1)';
  const paymentLabel =
    t.paymentMethod || (isSettled ? 'Não informada' : 'Pendente de baixa');

  const contactNameStr = contact
    ? `${contact.name}${contact.tradeName ? ` (${contact.tradeName})` : ''}`
    : 'Não informado';
  const contactDocPhone = contact
    ? [contact.document ? `Doc: ${contact.document}` : null, contact.phone ? `Tel: ${contact.phone}` : null]
        .filter(Boolean)
        .join('  •  ') || '—'
    : '—';
  const contactAddress = contact
    ? [
        [contact.street, contact.number].filter(Boolean).join(', '),
        contact.neighborhood,
        [contact.city, contact.state].filter(Boolean).join('/'),
      ]
        .filter(Boolean)
        .join(' · ') || '—'
    : '—';

  const originalCents = Math.max(
    1,
    t.amountCents + (t.discountCents || 0) - (t.interestCents || 0)
  );
  const adjustmentSummary =
    t.discountCents > 0 || t.interestCents > 0
      ? [
          `Orig: ${formatBRL(originalCents)}`,
          t.discountCents > 0 ? `Desc: -${formatBRL(t.discountCents)}` : null,
          t.interestCents > 0 ? `Juros/Acrésc: +${formatBRL(t.interestCents)}` : null,
        ]
          .filter(Boolean)
          .join(' | ')
      : null;

  const gridRows: [string, string, string, string][] = [
    ['Descrição', t.description.slice(0, 62), 'Parcela', parcelaLabel],
    [
      'Documento / NF-e',
      t.documentNumber || '—',
      isReceivable ? 'Forma Recebimento' : 'Forma Pagamento',
      paymentLabel,
    ],
    [
      isReceivable ? 'Pagador / Cliente' : 'Favorecido / Forn.',
      contactNameStr.slice(0, 55),
      'CNPJ / CPF & Contato',
      contactDocPhone.slice(0, 42),
    ],
    [
      'Endereço Comercial',
      contactAddress.slice(0, 62),
      adjustmentSummary ? 'Composição Valor' : 'Emissão NF',
      adjustmentSummary || (t.issueDate ? formatDateBR(t.issueDate) : '—'),
    ],
  ];

  autoTable(doc, {
    startY: offsetY + 42,
    margin: { left: 16, right: 16 },
    body: gridRows,
    theme: 'grid',
    styles: { fontSize: 7.6, cellPadding: 1.9, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 31, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] },
      1: { cellWidth: 66, textColor: [15, 23, 42] },
      2: { cellWidth: 31, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] },
      3: { cellWidth: 50, textColor: [15, 23, 42] },
    },
  });

  const afterTableY =
    ((doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ||
      offsetY + 80) + 3.5;

  // Clean commercial notes (max 2 compact lines so signature always stays clear inside the half-sheet)
  const cleanNotes = (t.notes || '')
    .replace(/^Importado via XML(?:\s*\([^)]*\))?\s*\|\s*/i, '')
    .replace(/^Importado via XML(?:\s*\([^)]*\))?$/i, '')
    .trim();

  if (cleanNotes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(71, 85, 105);
    doc.text('Observações:', 16, afterTableY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const wrapped = doc.splitTextToSize(cleanNotes, 155).slice(0, 2);
    doc.text(wrapped, 36, afterTableY);
  }

  // Safe Signature Line anchored cleanly at the bottom of the half-sheet (`offsetY + 122`)
  // Linha de Assinatura posicionada com margem de segurança sem sobrepor as Observações
  const signY = Math.max(afterTableY + 14, offsetY + 121.5);
  const clampedSignY = Math.min(offsetY + 124.5, signY);

  doc.setDrawColor(148, 163, 184);
  doc.line(48, clampedSignY, 162, clampedSignY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    contact
      ? `${contact.name}${contact.document ? ` (${contact.document})` : ''}`
      : 'Assinatura / Conferência',
    105,
    clampedSignY + 4.2,
    { align: 'center' }
  );
}

/**
 * EN: Generates an economical 2-copies-per-A4 Commercial Receipt PDF with a center cut line:
 *     - Top Half: `1ª VIA — CLIENTE / PAGADOR`
 *     - Center Cut Line: `✂ CORTE AQUI - - -`
 *     - Bottom Half: `2ª VIA — EMPRESA / ARQUIVO (CANHOTO ASSINADO)`
 * PT: Gera Recibo Comercial em 2 Vias por Folha A4 Retrato (1ª Via Cliente/Pagador + Picote + 2ª Via Empresa/Arquivo).
 */
export function exportTransactionReceiptPDF({
  transaction: t,
  contact,
  company,
}: ReceiptPdfParams): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = todayISO();

  const copy1Label =
    t.type === 'receivable'
      ? '1ª VIA — CLIENTE / PAGADOR'
      : '1ª VIA — FAVORECIDO / FORNECEDOR';
  const copy2Label = '2ª VIA — EMPRESA / ARQUIVO (CANHOTO ASSINADO)';

  // 1st Copy (Top Half: Y = 8mm .. 142mm)
  renderReceiptCopy(doc, 8, copy1Label, { t, contact, company, today });

  // Perforated Cut Line (Center: Y = 148.5mm)
  drawCenterCutLine(doc, 148.5);

  // 2nd Copy (Bottom Half: Y = 155mm .. 289mm)
  renderReceiptCopy(doc, 155, copy2Label, { t, contact, company, today });

  const safeRef = (t.documentNumber || t.id.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, '-');
  doc.save(`recibo-2vias-${safeRef}-${today}.pdf`);
}

/**
 * EN: Renders one lined blank receipt copy (~134mm tall) for manual handwriting with pen.
 * PT: Renderiza uma via pautada de recibo em branco (~134mm) para preenchimento manual a caneta.
 */
function renderBlankReceiptCopy(
  doc: jsPDF,
  offsetY: number,
  viaLabel: string,
  today: string,
  company?: Company
): void {
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(12, offsetY, 186, 134, 2, 2, 'S');

  drawHalfSheetCompanyHeader(doc, offsetY, 'RECIBO COMERCIAL', viaLabel, today, company);

  // Nº and R$ Value Boxes
  const row1Y = offsetY + 26;
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, row1Y, 55, 12, 1.8, 1.8, 'FD');
  doc.roundedRect(128, row1Y, 66, 12, 1.8, 1.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text('RECIBO Nº:', 19, row1Y + 7.5);
  doc.text('VALOR R$:', 132, row1Y + 7.5);

  // Dotted Fill Lines Helper
  const drawLabeledLine = (label: string, y: number, startX = 16, endX = 194) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(51, 65, 85);
    doc.text(label, startX, y);
    const labelWidth = label ? doc.getTextWidth(label) + 2 : 0;
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([1, 1.2], 0);
    doc.line(startX + labelWidth, y + 0.6, endX, y + 0.6);
    doc.setLineDashPattern([], 0);
  };

  drawLabeledLine('Recebi(emos) de:', offsetY + 47);
  drawLabeledLine('CPF / CNPJ:', offsetY + 56, 16, 108);
  drawLabeledLine('Telefone:', offsetY + 56, 112, 194);
  drawLabeledLine('A importância de (por extenso):', offsetY + 66);
  drawLabeledLine('', offsetY + 75);
  drawLabeledLine('Referente a:', offsetY + 85);
  drawLabeledLine('', offsetY + 94);
  drawLabeledLine('Forma de Pagamento (PIX / Dinheiro / Cartão / Boleto / Cheque):', offsetY + 104);

  // City / Date + Signature Line
  const cityPrefix = company?.city
    ? `${company.city}${company.state ? `/${company.state}` : ''}, `
    : 'Local: __________________, ';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`${cityPrefix}____ de ______________________ de 20____`, 16, offsetY + 121);

  doc.setDrawColor(100, 116, 139);
  doc.line(118, offsetY + 121, 192, offsetY + 121);
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    company ? (company.tradeName || company.legalName).slice(0, 40) : 'Assinatura do Emitente / Recebedor',
    155,
    offsetY + 125.5,
    { align: 'center' }
  );
}

/**
 * EN: Generates a 2-copies-per-A4 Blank Receipt PDF with official company header and dotted lines
 *     for manual pen completion at the counter.
 * PT: Gera uma folha A4 com 2 vias pautadas de Recibo em Branco (com cabeçalho da empresa e picote)
 *     para preenchimento manual na caneta.
 */
export function exportBlankReceiptPDF(company?: Company): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const today = todayISO();

  renderBlankReceiptCopy(doc, 8, '1ª VIA — CLIENTE / PAGADOR', today, company);
  drawCenterCutLine(doc, 148.5);
  renderBlankReceiptCopy(doc, 155, '2ª VIA — EMPRESA / ARQUIVO (CANHOTO ASSINADO)', today, company);

  doc.save(`recibo-em-branco-2vias-${today}.pdf`);
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
