/**
 * EN: Unit tests for XML Parser, Fiscal CNPJ Detection, Commercial Adjustments, and Batch Parsing (Phase 11.1).
 * PT: Testes unitários do Leitor de XML, Detecção Fiscal por CNPJ, Ajustes Comerciais e Leitura em Lote (Fase 11.1).
 */

import { describe, it, expect } from 'vitest';
import type { Company } from '../../types';
import {
  adaptXmlItemsForType,
  analyzeXmlDocument,
  buildTransactionsFromXmlItems,
  detectXmlOperation,
  parseMultipleXmlFiles,
} from '../xmlParser';

const makeCompany = (overrides: Partial<Company> = {}): Company => ({
  id: 'comp-genuina',
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
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('analyzeXmlDocument & detectXmlOperation (Phase 11.1)', () => {
  it('throws an error on malformed XML content', () => {
    const brokenXml = '<nfe><emit>Broken tag without close';
    expect(() => analyzeXmlDocument(brokenXml)).toThrow('Arquivo XML inválido ou malformado.');
  });

  it('correctly parses a standard Brazilian NF-e with multiple duplicatas and extracts invoiceTotalCents', () => {
    const nfeXml = `
      <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe Id="NFe35210912345678000195550010000012341234567890">
            <ide>
              <nNF>1234</nNF>
              <tpNF>1</tpNF>
              <dhEmi>2026-11-10T14:30:00-03:00</dhEmi>
            </ide>
            <emit>
              <CNPJ>12345678000195</CNPJ>
              <xNome>DISTRIBUIDORA DE BEBIDAS BRASIL LTDA</xNome>
              <xFant>BEBIDAS BRASIL</xFant>
              <enderEmit>
                <xLgr>Av Paulista</xLgr>
                <nro>1000</nro>
                <xCpl>Sala 402</xCpl>
                <xBairro>Bela Vista</xBairro>
                <xMun>São Paulo</xMun>
                <UF>SP</UF>
                <CEP>01310100</CEP>
              </enderEmit>
            </emit>
            <dest>
              <CNPJ>98765432000188</CNPJ>
              <xNome>GENUINA AUTO PECAS LTDA</xNome>
              <enderDest>
                <xLgr>Rua Augusta</xLgr>
                <nro>500</nro>
                <xBairro>Consolação</xBairro>
                <xMun>São Paulo</xMun>
                <UF>SP</UF>
                <CEP>01305000</CEP>
              </enderDest>
            </dest>
            <total>
              <ICMSTot>
                <vNF>600.00</vNF>
              </ICMSTot>
            </total>
            <cobr>
              <dup>
                <nDup>001</nDup>
                <dVenc>2026-12-10</dVenc>
                <vDup>300.00</vDup>
              </dup>
              <dup>
                <nDup>002</nDup>
                <dVenc>2027-01-10</dVenc>
                <vDup>300.00</vDup>
              </dup>
            </cobr>
          </infNFe>
        </NFe>
      </nfeProc>
    `;

    const result = analyzeXmlDocument(nfeXml);
    expect(result.kind).toBe('nfe');

    if (result.kind === 'nfe') {
      expect(result.tpNF).toBe(1);
      expect(result.invoiceTotalCents).toBe(60000);
      expect(result.supplierName).toBe('DISTRIBUIDORA DE BEBIDAS BRASIL LTDA');
      expect(result.supplierTradeName).toBe('BEBIDAS BRASIL');
      expect(result.supplierDocument).toBe('12345678000195');
      expect(result.customerName).toBe('GENUINA AUTO PECAS LTDA');
      expect(result.customerDocument).toBe('98765432000188');
      expect(result.invoiceNumber).toBe('1234');
      expect(result.issueDate).toBe('2026-11-10');

      // Even though tpNF is 1 (exit from supplier), default description never forces customer/receivable!
      expect(result.items).toHaveLength(2);
      expect(result.items[0].amountCents).toBe(30000);
      expect(result.items[0].description).toContain('DISTRIBUIDORA DE BEBIDAS BRASIL LTDA');

      // Intelligent Fiscal Detection: dest.CNPJ matches Genuína -> Payable!
      const detection = detectXmlOperation(result, [makeCompany()]);
      expect(detection.txType).toBe('payable');
      expect(detection.matchedRole).toBe('recipient');
      expect(detection.companyId).toBe('comp-genuina');
      expect(detection.counterpartyRole).toBe('supplier');
      expect(detection.counterpartyName).toBe('DISTRIBUIDORA DE BEBIDAS BRASIL LTDA');
    }
  });

  it('detects Conta a Receber when emit.CNPJ matches one of the user companies', () => {
    const saleNfeXml = `
      <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe35261199999999000100550010000056781234567890">
          <ide>
            <nNF>5678</nNF>
            <tpNF>1</tpNF>
            <dhEmi>2026-11-15T09:15:00-03:00</dhEmi>
          </ide>
          <emit>
            <CNPJ>98765432000188</CNPJ>
            <xNome>GENUINA AUTO PECAS LTDA</xNome>
          </emit>
          <dest>
            <CPF>12345678909</CPF>
            <xNome>JOAO DA SILVA CLIENTE</xNome>
            <enderDest>
              <xLgr>Rua das Flores</xLgr>
              <nro>123</nro>
              <xBairro>Jardins</xBairro>
              <xMun>Campinas</xMun>
              <UF>SP</UF>
              <CEP>13010111</CEP>
            </enderDest>
          </dest>
          <cobr>
            <dup>
              <nDup>01</nDup>
              <dVenc>2026-12-15</dVenc>
              <vDup>1450.50</vDup>
            </dup>
          </cobr>
        </infNFe>
      </NFe>
    `;

    const result = analyzeXmlDocument(saleNfeXml);
    expect(result.kind).toBe('nfe');

    const detection = detectXmlOperation(result, [makeCompany()]);
    expect(detection.txType).toBe('receivable');
    expect(detection.matchedRole).toBe('issuer');
    expect(detection.companyId).toBe('comp-genuina');
    expect(detection.counterpartyRole).toBe('customer');
    expect(detection.counterpartyName).toBe('JOAO DA SILVA CLIENTE');

    if (result.kind === 'nfe') {
      const adapted = adaptXmlItemsForType(result, result.items, detection.txType);
      expect(adapted[0].description).toContain('JOAO DA SILVA CLIENTE');
    }
  });

  it('defaults safely to Payable (matchedRole: none) when neither CNPJ is registered, even if tpNF=1', () => {
    const unknownXml = `
      <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe>
          <ide><nNF>999</nNF><tpNF>1</tpNF><dhEmi>2026-11-20</dhEmi></ide>
          <emit><CNPJ>11222333000144</CNPJ><xNome>FORNECEDOR EXTERNO LTDA</xNome></emit>
          <dest><CNPJ>55666777000188</CNPJ><xNome>OUTRA FILIAL NAO CADASTRADA</xNome></dest>
          <total><ICMSTot><vNF>500.00</vNF></ICMSTot></total>
        </infNFe>
      </NFe>
    `;

    const parsed = analyzeXmlDocument(unknownXml);
    const detection = detectXmlOperation(parsed, [makeCompany()]);

    expect(detection.matchedRole).toBe('none');
    expect(detection.txType).toBe('payable');
    expect(detection.matchedCompany).toBeNull();
    expect(detection.counterpartyName).toBe('FORNECEDOR EXTERNO LTDA');
  });

  it('correctly parses Brazilian NFS-e (Serviços - Padrão Municipal / ABRASF)', () => {
    const nfseXml = `
      <CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
        <tcCompNfse>
          <Nfse>
            <InfNfse Id="NFSE202611890">
              <Numero>890</Numero>
              <DataEmissao>2026-11-20T10:00:00</DataEmissao>
              <ValoresNfse>
                <ValorServicos>1800.00</ValorServicos>
                <ValorLiquidoNfse>1750.00</ValorLiquidoNfse>
              </ValoresNfse>
              <PrestadorServico>
                <IdentificacaoPrestador>
                  <CpfCnpj><Cnpj>44555666000177</Cnpj></CpfCnpj>
                </IdentificacaoPrestador>
                <RazaoSocial>OFICINA E RETÍFICA DE MOTORES LTDA</RazaoSocial>
              </PrestadorServico>
              <TomadorServico>
                <IdentificacaoTomador>
                  <CpfCnpj><Cnpj>98765432000188</Cnpj></CpfCnpj>
                </IdentificacaoTomador>
                <RazaoSocial>GENUINA AUTO PECAS LTDA</RazaoSocial>
              </TomadorServico>
            </InfNfse>
          </Nfse>
        </tcCompNfse>
      </CompNfse>
    `;

    const result = analyzeXmlDocument(nfseXml);
    expect(result.kind).toBe('nfse');
    if (result.kind === 'nfse') {
      expect(result.invoiceTotalCents).toBe(175000);
      expect(result.items[0].amountCents).toBe(175000);
    }

    const detection = detectXmlOperation(result, [makeCompany()]);
    expect(detection.txType).toBe('payable');
    expect(detection.matchedRole).toBe('recipient');
    expect(detection.companyId).toBe('comp-genuina');
  });

  it('records commercial adjustments (interestCents / discountCents + notes) with integer cent precision', () => {
    const previewItems = [
      {
        tempId: 'temp-1',
        description: 'NF-e 500 — Distribuidora (1/2)',
        amountCents: 32500,
        dueDate: '2026-12-10',
        issueDate: '2026-11-10',
        documentNumber: 'NF-500/1',
        supplierName: 'Distribuidora',
        supplierDocument: '111',
        installmentNumber: 1,
        installmentTotal: 2,
        installmentGroupId: 'grp-500',
      },
      {
        tempId: 'temp-2',
        description: 'NF-e 500 — Distribuidora (2/2)',
        amountCents: 32500,
        dueDate: '2027-01-10',
        issueDate: '2026-11-10',
        documentNumber: 'NF-500/2',
        supplierName: 'Distribuidora',
        supplierDocument: '111',
        installmentNumber: 2,
        installmentTotal: 2,
        installmentGroupId: 'grp-500',
      },
    ];

    // Case A: Positive divergence (+ R$ 50,01 freight outside invoice) -> split 2501 + 2500 in interestCents
    const positiveTxs = buildTransactionsFromXmlItems(
      previewItems,
      'user-1',
      'payable',
      'cat-1',
      'contact-1',
      {
        companyId: 'comp-genuina',
        adjustment: {
          divergenceCents: 5001,
          adjustmentType: 'positive',
          reasonLabel: '🚚 Frete por Fora / Despesa de Entrega',
          notes: 'CT-e 778',
        },
      }
    );

    expect(positiveTxs).toHaveLength(2);
    expect(positiveTxs[0].companyId).toBe('comp-genuina');
    expect(positiveTxs[0].interestCents + positiveTxs[1].interestCents).toBe(5001);
    expect(positiveTxs[0].discountCents).toBe(0);
    expect(positiveTxs[0].notes).toContain('Frete por Fora');
    expect(positiveTxs[0].notes).toContain('CT-e 778');

    // Case B: Negative divergence (- R$ 80,00 warranty credit) -> saved in discountCents
    const negativeTxs = buildTransactionsFromXmlItems(
      [previewItems[0]],
      'user-1',
      'payable',
      'cat-1',
      'contact-1',
      {
        companyId: 'comp-genuina',
        adjustment: {
          divergenceCents: -8000,
          adjustmentType: 'negative',
          reasonLabel: '🛡️ Crédito de Garantia / Peça com Defeito',
          notes: 'Amortecedor em garantia',
        },
      }
    );

    expect(negativeTxs).toHaveLength(1);
    expect(negativeTxs[0].discountCents).toBe(8000);
    expect(negativeTxs[0].interestCents).toBe(0);
    expect(negativeTxs[0].notes).toContain('Crédito de Garantia');
    expect(negativeTxs[0].notes).toContain('Amortecedor em garantia');
  });

  it('parses multiple XML files in batch via parseMultipleXmlFiles', async () => {
    const xmlA = `
      <NFe><infNFe><ide><nNF>101</nNF></ide><emit><xNome>Forn A</xNome></emit><total><ICMSTot><vNF>120.00</vNF></ICMSTot></total></infNFe></NFe>
    `;
    const xmlB = `<broken><xml>`;

    const files = [
      new File([xmlA], 'nota-101.xml', { type: 'text/xml' }),
      new File([xmlB], 'invalido.xml', { type: 'text/xml' }),
    ];

    const batch = await parseMultipleXmlFiles(files);
    expect(batch).toHaveLength(2);
    expect(batch[0].error).toBeNull();
    expect(batch[0].analysis?.kind).toBe('nfe');
    expect(batch[1].analysis).toBeNull();
    expect(batch[1].error).toContain('inválido');
  });
});
