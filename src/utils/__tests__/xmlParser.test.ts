import { describe, it, expect } from 'vitest';
import { analyzeXmlDocument } from '../xmlParser';

describe('analyzeXmlDocument', () => {
  it('throws an error on malformed XML content', () => {
    const brokenXml = '<nfe><emit>Broken tag without close';
    expect(() => analyzeXmlDocument(brokenXml)).toThrow('Arquivo XML inválido ou malformado.');
  });

  it('correctly parses a standard Brazilian NF-e with multiple duplicatas (<dup>)', () => {
    const nfeXml = `
      <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe Id="NFe35210912345678000195550010000012341234567890">
            <ide>
              <nNF>1234</nNF>
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
            <cobr>
              <fat>
                <nFat>1234</nFat>
                <vOrig>600.00</vOrig>
                <vLiq>600.00</vLiq>
              </fat>
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
      expect(result.supplierName).toBe('DISTRIBUIDORA DE BEBIDAS BRASIL LTDA');
      expect(result.supplierTradeName).toBe('BEBIDAS BRASIL');
      expect(result.supplierDocument).toBe('12345678000195');
      expect(result.invoiceNumber).toBe('1234');
      expect(result.supplierAddress.cep).toBe('01310100');
      expect(result.supplierAddress.city).toBe('São Paulo');
      expect(result.supplierAddress.state).toBe('SP');

      expect(result.items).toHaveLength(2);
      expect(result.items[0].amountCents).toBe(30000);
      expect(result.items[0].dueDate).toBe('2026-12-10');
      expect(result.items[0].installmentNumber).toBe(1);
      expect(result.items[0].installmentTotal).toBe(2);

      expect(result.items[1].amountCents).toBe(30000);
      expect(result.items[1].dueDate).toBe('2027-01-10');
      expect(result.items[1].installmentNumber).toBe(2);

      // Shared group ID
      expect(result.items[0].installmentGroupId).toBeTruthy();
      expect(result.items[0].installmentGroupId).toBe(result.items[1].installmentGroupId);
    }
  });

  it('correctly parses generic XML with repeated tags', () => {
    const genericXml = `
      <extrato>
        <lancamento>
          <descricao>Serviço de Nuvem</descricao>
          <valor>149.90</valor>
          <data>2026-11-15</data>
        </lancamento>
        <lancamento>
          <descricao>Hospedagem Web</descricao>
          <valor>89.00</valor>
          <data>2026-11-20</data>
        </lancamento>
      </extrato>
    `;

    const result = analyzeXmlDocument(genericXml);
    expect(result.kind).toBe('generic');
    if (result.kind === 'generic') {
      expect(result.recordTag).toBe('lancamento');
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].descricao).toBe('Serviço de Nuvem');
      expect(result.rows[0].valor).toBe('149.90');
    }
  });
});
