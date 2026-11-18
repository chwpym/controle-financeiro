# Guia de Testes Automatizados — FluxoClaro

Este guia orienta a criação, execução e manutenção de testes no **FluxoClaro**, utilizando o **Vitest** e a **React Testing Library** sob a ótica de rigor lógico do **`ub-mode`**.

---

## 🏛️ 1. Pirâmide de Testes do Sistema

```
                      ▲
                     / \
                    /   \
                   / E2E \       (Fluxos ponta a ponta críticos)
                  /-------\
                 / INTE-   \     (Rotas Express + SQLite in-memory,
                /  GRAÇÃO   \     Parsers de XML / XLSX, Sync Queue)
               /-------------\
              /   UNITÁRIOS   \  (Cálculos de centavos, divisão de parcelas,
             /     PURAS       \  juros/desconto, validação de CPF/CNPJ)
            /-------------------\
```

---

## 🧪 2. O que DEVE ser Testado Obrigatoriamente

### Camada 1: Funções Puras Financeiras (`src/utils/__tests__/format.test.ts`)
1. **Conversão Monetária:**
   * `parseBRLToCents` com formatos `1.234,56`, `1234.56` e valores vazios.
   * `formatBRL` com centavos positivos, zero e arredondamentos.
2. **Parcelamento de Carnês:**
   * Divisão em partes iguais com o centavo excedente alocado na 1ª parcela.
3. **Validação de Documentos Duplicados:**
   * `findDuplicateContactDocument` com formatos idênticos, desformatados, ignorando espaços e ignorando o próprio contato em edição.
4. **Contas Recorrentes e Duplicação com 1 Clique:**
   * `buildRecurringTransactions` e `buildDuplicatedTransaction` garantindo reinício de status para `pending` e cálculo correto do próximo vencimento.

### Camada 2: Parsers de Importação
* **`excelParser.test.ts`:** Mapeamento de colunas, datas em formato BR vs ISO e proteção contra valores malformados.
* **`xmlParser.test.ts`:** Extração correta de chave de acesso da NF-e, emitente, destinatário e valores dos itens.

### Camada 3: Componentes de UI Base (`src/components/ui/__tests__/ui-components.test.tsx`)
* Acessibilidade de botões com estado de loading e desabilitação.
* Renderização semântica de badges (`settled`, `pending`, `overdue`).
* Inputs monetários mascarados e campos obrigatórios.

---

## 🚀 3. Comandos de Execução

| Comando | Descrição |
| :--- | :--- |
| `npm run lint` | Executa o TypeScript (`tsc --noEmit`) para garantir zero erros de tipos. |
| `npm test` | Executa todos os testes automatizados com o **Vitest**. |
| `npm run test:watch` | Modo interativo do Vitest durante o desenvolvimento com recarregamento em tempo real. |

---

## ✅ 4. Checklist para Novos Recursos

Ao implementar qualquer nova funcionalidade ou refatoração:

- [ ] A lógica de cálculo possui testes unitários correspondentes?
- [ ] O comando `npm run lint` passou com 0 erros de TypeScript?
- [ ] Todos os testes do Vitest executaram com sucesso?
- [ ] O alinhamento numérico utiliza `font-mono-tabular`?
- [ ] Os botões de exclusão contam com confirmação explícita?
