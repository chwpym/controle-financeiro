# Plano Mestre de Refatoração e Modularização — FluxoClaro

> **Instrução para o Agente Executor:**  
> Leia atentamente este documento antes de iniciar. Execute **uma fase por vez**. Ao final de cada fase, execute obrigatoriamente `npm run lint` e valide que a aplicação continua funcionando normalmente sem regressões antes de avançar para a próxima.

---

## 🎯 Objetivo
Transformar o **FluxoClaro** em um sistema financeiro modular, de fácil manutenção e alta testabilidade, aplicando as diretrizes de `docs/diretrizes-arquitetura.md`, `docs/guia-design-system-e-motion.md` e `docs/guia-testes.md`.

---

## 🛡️ Ordem de Dependência e Risco (Do Menor para o Maior)

```
[✅ Fase 1: Risco Zero]       -> Extrações de Ficha Financeira e componentes comuns (SearchBar, KpiCard)
[✅ Fase 2: Rede de Proteção] -> Suíte de testes unitários para centavos e baixas no Vitest
[⏳ Fase 3: Risco Baixo]      -> Decomposição da tela de Contas P/R (TransactionsView)
[⏳ Fase 4: Parcelamento 420x]-> Suporte a parcelamentos longos (até 420x) com prévia compacta
[✅ Fase 5: Risco Médio]      -> Decomposição do Dashboard em cards modulares
[⏳ Fase 6: Backend Limpo]    -> Separação do server.ts em routes, services e repositories
```

---

## ✅ FASE 1: Concluída com Sucesso
- [x] **Passo 1.1:** Extração de `ContactHistoryModal.tsx` (207 linhas), mantendo extrato e recibo PDF.
- [x] **Passo 1.2:** Criação dos componentes comuns `src/components/common/` (`SearchBar.tsx`, `KpiCard.tsx`, barrel export e suíte de testes com 50 testes passando).

---

## ✅ FASE 2: Concluída com Sucesso
- [x] **Passo 2.1:** Testes exaustivos de divisão de parcelas de 1x a 60x (centavos ímpares e alocação do centavo excedente na 1ª parcela).
- [x] **Passo 2.2:** Criação das funções puras `calculateSettlement` e `calculateSettledAmount` com testes unitários cobrindo juros, descontos e limites.
- **Validação:** 55 testes passando no Vitest (100% verde), 0 erros de TypeScript no lint.

---

## 💳 FASE 3: Modularização de Contas P/R (`TransactionsView.tsx`)

`TransactionsView.tsx` tem atualmente **747 linhas**. Vamos dividi-lo em submódulos coesos:

### Passo 3.1: Extração da Barra de Filtros (`TransactionFilters.tsx`)
* Criar `src/components/transactions/TransactionFilters.tsx` (~120 linhas):
  * Utilizar o `SearchBar.tsx` criado na Fase 1;
  * Seletor de mês e ano (`MonthYearSelector`);
  * Pílulas rápidas de status: *Todos*, *A Pagar*, *A Receber*, *Pendentes*, *Pagos/Recebidos*, *Vencidos*;
  * Filtro por categoria e filtro por contato.

### Passo 3.2: Extração da Barra de Ações em Lote (`BatchActionBar.tsx`)
* Criar `src/components/transactions/BatchActionBar.tsx` (~90 linhas):
  * Barra flutuante ou fixa que surge quando 1 ou mais contas são selecionadas;
  * Contador de itens selecionados e soma do valor total selecionado (`font-mono-tabular`);
  * Botões de ação rápida: *Baixar Selecionados* (abre `BatchSettleModal`) e *Excluir Selecionados* (com confirmação).

### Passo 3.3: Tabela Limpa de Lançamentos (`TransactionTable.tsx`)
* Criar `src/components/transactions/TransactionTable.tsx` (~220 linhas):
  * Alinhamento numérico estrito com `font-mono-tabular` para valores, datas e números de parcela;
  * Cores semânticas da `taste-skill` (verde esmeralda para receitas, vermelho rose para despesas, âmbar para pendências);
  * Ações por linha com tooltips: *Baixar*, *Consultar*, *Duplicar (1 clique)* e *Excluir*.

* **Critério de Sucesso:** `TransactionsView.tsx` atua apenas como container orquestrador, caindo para **menos de 200 linhas**. `npm run lint` e `npm test` continuam com 0 erros.

---

## 📅 FASE 4: Parcelamento Flexível de Longo Prazo (Até 420x — 35 Anos)

Adequação do modal de lançamentos (`TransactionModal.tsx`) para contratos longos, financiamentos e parcelamentos fiscais:

### Especificação de Negócio:
* **Teto Máximo:** Até **420 parcelas** (35 anos — teto máximo do SFH e financiamentos imobiliários/Refis no Brasil).
* **Atalhos Rápidos de Botão:**
  `[1x (À vista)]` `[2x]` `[3x]` `[6x]` `[10x]` `[12x]` `[24x]` `[36x]` `[60x]` `[120x]` + campo livre numérico (1 a 420).
* **Prévia Compacta Inteligente (Anti-travamento da tela):**
  * Se for **até 6 parcelas:** Exibe a grade de inputs individuais com data e valor de cada uma.
  * Se for **acima de 6 parcelas (ex: 24x, 60x, 120x, 420x):** Exibe o **Card de Resumo Sintético**:
    ```text
    📋 Resumo do Parcelamento (420 parcelas):
    • 420 parcelas mensais de R$ 1.500,00 (Total: R$ 630.000,00)
    • 1ª parcela: 10/12/2026 · Última parcela: 10/11/2061
    [👁️ Expandir grade completa para alterar datas/valores específicos]
    ```
* **Critério de Sucesso:** A tela gera 420 parcelas instantaneamente, sem travamentos de navegador e com divisão de centavos 100% exata testada pelo Vitest.

---

## ✅ FASE 5: Concluída com Sucesso (Modularização do Dashboard)

`DashboardView.tsx` foi reduzido de **1.264 linhas para 187 linhas** (< 200 linhas). Submódulos extraídos em `src/components/dashboard/`:

1. `DashboardKpis.tsx`: Os 4 cards de topo (Saldo, A Receber, A Pagar, Vencido) usando `KpiCard.tsx` com `font-mono-tabular`, reordenação e clique para filtrar na tabela de contas.
2. `MonthlyPerformanceChart.tsx`: Gráfico comparativo dos últimos 6 meses (Receitas × Despesas) com barras interativas, tooltips e legendas.
3. `CategoryExpenseChart.tsx`: Distribuição e ranking de despesas por categoria com barras percentuais e valores formatados.
4. `PaymentMethodSummary.tsx`: Resumo de entradas e saídas por forma de pagamento (PIX, Boleto, Cartão, etc.).
5. `DailyCashFlowChart.tsx`: Gráfico de projeção diária acumulada de fluxo de caixa ao longo dos dias do mês.
6. `DueAlertsCard.tsx`: Card de alertas de contas vencidas ou a vencer com baixa rápida e permissão de notificação.
7. `DashboardConfigPopover.tsx`: Popover para personalização de visibilidade (`visibleWidgets`), alternância de largura (1 ou 2 colunas) e botão "Restaurar Padrão".
8. `DashboardWidgetGrid.tsx`: Orquestração em grid com drag-and-drop e reordenação dos widgets.
9. `useDashboardStats.ts`: Hook puro para consolidação estatística do mês.
10. `index.ts`: Barrel export com todos os componentes e tipos.

* **Validação:** 69 testes unitários passando no Vitest (100% verde), 0 erros no TypeScript (`npm run lint`), `DashboardView.tsx` com 187 linhas.

---

## 🔌 FASE 6: Arquitetura em Camadas do Backend (`server.ts`)

`server.ts` possui **1.224 linhas**. Vamos reorganizá-lo sem mexer no banco SQLite existente:

1. `server/config/db.ts`: Conexão SQLite, modo WAL e execução de migrations/tabelas.
2. `server/repositories/`: Queries SQL isoladas e preparadas:
   * `transactionRepository.ts`
   * `contactRepository.ts`
   * `categoryRepository.ts`
3. `server/services/`: Regras de negócio puras:
   * `installmentService.ts` (criação de carnês em transação atômica ACID).
   * `authService.ts` (hash scrypt, verificação de senha).
4. `server/routes/`: Controladores Express enxutos:
   * `transactionRoutes.ts`
   * `contactRoutes.ts`
   * `categoryRoutes.ts`
   * `authRoutes.ts`

* **Critério de Sucesso:** `server.ts` vira apenas o bootstrap do Express com ~80 linhas.

---

## 📋 Checklist de Validação por Fase

Ao concluir qualquer fase, o executor deve rodar:
```bash
npm run lint    # Deve retornar zero erros de TypeScript
npm test        # Todos os testes do Vitest devem passar
```
Se ambos passarem, a fase está aprovada e pode prosseguir para a próxima.
