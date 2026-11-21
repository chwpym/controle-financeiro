import { describe, it, expect } from 'vitest';
import { analyzeXmlDocument, buildTransactionsFromXmlItems } from '../xmlParser';

describe('analyzeXmlDocument', () => {
  it('throws an error on malformed XML content', () => {
    const brokenXml = '<nfe><emit>Broken tag without close';
    expect(() => analyzeXmlDocument(brokenXml)).toThrow('Arquivo XML inválido ou malformado.');
  });

  it('correctly parses a standard Brazilian NF-e de Compra/Entrada (tpNF 0) with multiple duplicatas', () => {
    const nfeXml = `
      <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe Id="NFe35210912345678000195550010000012341234567890">
            <ide>
              <nNF>1234</nNF>
              <tpNF>0</tpNF>
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
              <xNome>MINHA EMPRESA COMPRADORA LTDA</xNome>
              <enderDest>
                <xLgr>Rua Augusta</xLgr>
                <nro>500</nro>
                <xBairro>Consolação</xBairro>
                <xMun>São Paulo</xMun>
                <UF>SP</UF>
                <CEP>01305000</CEP>
              </enderDest>
            </dest>
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
      expect(result.tpNF).toBe(0);
      expect(result.operationType).toBe('entry');
      expect(result.supplierName).toBe('DISTRIBUIDORA DE BEBIDAS BRASIL LTDA');
      expect(result.supplierTradeName).toBe('BEBIDAS BRASIL');
      expect(result.supplierDocument).toBe('12345678000195');
      expect(result.customerName).toBe('MINHA EMPRESA COMPRADORA LTDA');
      expect(result.customerDocument).toBe('98765432000188');
      expect(result.invoiceNumber).toBe('1234');
      expect(result.issueDate).toBe('2026-11-10');
      expect(result.supplierAddress.cep).toBe('01310100');
      expect(result.supplierAddress.city).toBe('São Paulo');
      expect(result.supplierAddress.state).toBe('SP');

      expect(result.items).toHaveLength(2);
      expect(result.items[0].amountCents).toBe(30000);
      expect(result.items[0].dueDate).toBe('2026-12-10');
      expect(result.items[0].issueDate).toBe('2026-11-10');
      expect(result.items[0].installmentNumber).toBe(1);
      expect(result.items[0].installmentTotal).toBe(2);
      expect(result.items[0].description).toContain('DISTRIBUIDORA DE BEBIDAS BRASIL LTDA');

      expect(result.items[1].amountCents).toBe(30000);
      expect(result.items[1].dueDate).toBe('2027-01-10');
      expect(result.items[1].issueDate).toBe('2026-11-10');
      expect(result.items[1].installmentNumber).toBe(2);

      // Shared group ID
      expect(result.items[0].installmentGroupId).toBeTruthy();
      expect(result.items[0].installmentGroupId).toBe(result.items[1].installmentGroupId);
    }
  });

  it('correctly parses NF-e de Venda/Saída (tpNF 1) with customer data in <dest>', () => {
    const saleNfeXml = `
      <NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe35261199999999000100550010000056781234567890">
          <ide>
            <nNF>5678</nNF>
            <tpNF>1</tpNF>
            <dhEmi>2026-11-15T09:15:00-03:00</dhEmi>
          </ide>
          <emit>
            <CNPJ>11111111000111</CNPJ>
            <xNome>AUTO MECÂNICA MASTER LTDA</xNome>
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

    if (result.kind === 'nfe') {
      expect(result.tpNF).toBe(1);
      expect(result.operationType).toBe('exit');
      expect(result.customerName).toBe('JOAO DA SILVA CLIENTE');
      expect(result.customerDocument).toBe('12345678909');
      expect(result.customerAddress.street).toBe('Rua das Flores');
      expect(result.customerAddress.city).toBe('Campinas');
      expect(result.customerAddress.state).toBe('SP');
      expect(result.customerAddress.cep).toBe('13010111');
      expect(result.issueDate).toBe('2026-11-15');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].amountCents).toBe(145050);
      expect(result.items[0].dueDate).toBe('2026-12-15');
      expect(result.items[0].issueDate).toBe('2026-11-15');
      expect(result.items[0].customerName).toBe('JOAO DA SILVA CLIENTE');
      expect(result.items[0].customerDocument).toBe('12345678909');
      expect(result.items[0].description).toContain('JOAO DA SILVA CLIENTE');
    }
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
                  <CpfCnpj>
                    <Cnpj>44555666000177</Cnpj>
                  </CpfCnpj>
                </IdentificacaoPrestador>
                <RazaoSocial>OFICINA E RETÍFICA DE MOTORES LTDA</RazaoSocial>
                <Endereco>
                  <Endereco>Av dos Autonomistas</Endereco>
                  <Numero>200</Numero>
                  <Bairro>Centro</Bairro>
                  <Cidade>Osasco</Cidade>
                  <Uf>SP</Uf>
                  <Cep>06020000</Cep>
                </Endereco>
              </PrestadorServico>
              <TomadorServico>
                <IdentificacaoTomador>
                  <CpfCnpj>
                    <Cpf>99988877766</Cpf>
                  </CpfCnpj>
                </IdentificacaoTomador>
                <RazaoSocial>CARLOS EDUARDO ALMEIDA</RazaoSocial>
                <Endereco>
                  <Endereco>Rua das Palmeiras</Endereco>
                  <Numero>45</Numero>
                  <Bairro>Bela Vista</Bairro>
                  <Cidade>São Paulo</Cidade>
                  <Uf>SP</Uf>
                  <Cep>01300000</Cep>
                </Endereco>
              </TomadorServico>
            </InfNfse>
          </Nfse>
        </tcCompNfse>
      </CompNfse>
    `;

    const result = analyzeXmlDocument(nfseXml);
    expect(result.kind).toBe('nfse');

    if (result.kind === 'nfse') {
      expect(result.invoiceNumber).toBe('890');
      expect(result.issueDate).toBe('2026-11-20');
      expect(result.providerName).toBe('OFICINA E RETÍFICA DE MOTORES LTDA');
      expect(result.providerDocument).toBe('44555666000177');
      expect(result.providerAddress.city).toBe('Osasco');
      expect(result.providerAddress.state).toBe('SP');

      expect(result.customerName).toBe('CARLOS EDUARDO ALMEIDA');
      expect(result.customerDocument).toBe('99988877766');
      expect(result.customerAddress.city).toBe('São Paulo');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].amountCents).toBe(175000); // Priorizou valor líquido
      expect(result.items[0].dueDate).toBe('2026-11-20');
      expect(result.items[0].issueDate).toBe('2026-11-20');
      expect(result.items[0].documentNumber).toBe('NFSe-890');
    }
  });

  it('propagates issueDate when generating transactions via buildTransactionsFromXmlItems', () => {
    const previewItems = [
      {
        tempId: 'temp-1',
        description: 'Venda de Peças NF 100',
        amountCents: 50000,
        dueDate: '2026-12-10',
        issueDate: '2026-11-10',
        documentNumber: 'NF-100',
        supplierName: 'Distribuidora',
        supplierDocument: '111',
        customerName: 'Cliente Final',
        customerDocument: '222',
        installmentNumber: 1,
        installmentTotal: 1,
        installmentGroupId: null,
      },
    ];

    const txs = buildTransactionsFromXmlItems(previewItems, 'user-1', 'receivable', 'cat-1', 'contact-1');
    expect(txs).toHaveLength(1);
    expect(txs[0].type).toBe('receivable');
    expect(txs[0].issueDate).toBe('2026-11-10');
    expect(txs[0].dueDate).toBe('2026-12-10');
    expect(txs[0].notes).toBe('Importado via XML (Cliente Final)');
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
