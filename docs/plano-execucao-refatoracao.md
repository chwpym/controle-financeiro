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
[✅ Fase 3: Risco Baixo]      -> Decomposição da tela de Contas P/R (TransactionsView)
[✅ Fase 4: Parcelamento 420x]-> Suporte a parcelamentos longos (até 420x) e Gestão de Renegociação
[✅ Fase 5: Risco Médio]      -> Decomposição do Dashboard em cards modulares
[✅ Fase 6: Backend Limpo]    -> Separação do server.ts em arquitetura em camadas modular
[✅ Fase 7: XML Avançado]     -> Importação de NF-e (Compra/Venda), NFS-e e Modularização
[✅ Fase 8: Excel Modular]    -> Importação Excel com Drag-and-Drop nativo e Decomposição (< 200 linhas)
[⏳ Fase 9: Minha Empresa]    -> Cadastro da Empresa Emitente e Logotipo dinâmico nos Recibos
[📋 Fase 10: Licenciamento]   -> Trava por tempo de uso, chave criptografada e tela de liberação
[📋 Fase 11: Telas Restantes] -> Modularização de Contatos, Configurações, Relatórios e Renegociação
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

## ✅ FASE 3: Concluída com Sucesso (Modularização de Contas P/R)

`TransactionsView.tsx` foi reduzido de **775 linhas para 241 linhas** (< 250 linhas). A tela foi decomposta em submódulos coesos em `src/components/transactions/`:

- [x] **Passo 3.1: Barra de Filtros (`TransactionFilters.tsx` - 228 linhas):**
  - Utiliza `SearchBar.tsx` com busca textual em tempo real e busca global em todo o histórico (`searchAllHistory`).
  - Seletor de período (`DateRangeFilter`), pílulas de status (*Todos, Pendentes, Vencidos, Pagos/Recebidos, Recorrentes*), filtro por categoria e por contato.
  - Indicadores numéricos consolidados de Receitas, Despesas e Saldo com `font-mono-tabular`.
- [x] **Passo 3.2: Barra de Ações em Lote (`BatchActionBar.tsx` - 68 linhas):**
  - Barra de ações exibida dinamicamente quando itens são selecionados, com contador, somatório em BRL, baixa em lote (`BatchSettleModal`) e exclusão em lote com confirmação.
- [x] **Passo 3.3: Tabela Limpa de Lançamentos (`TransactionTable.tsx` - 302 linhas):**
  - Tabela desktop e cards mobile responsivos com alinhamento numérico estrito (`font-mono-tabular`).
  - Exibição de documento, parcelas, data de emissão (`issueDate`) e ações rápidas (Consultar/Recibo, Duplicar, Baixar/Reabrir, Renegociar, Editar e Excluir).
- [x] **Passo 3.4: Suporte a Múltiplas NFs:**
  - Extraído `DocumentTagsInput.tsx` permitindo adicionar múltiplas NFs por lançamento com tags visuais (`[ + Adicionar NF ]`).

---

## ✅ FASE 4: Concluída com Sucesso (Parcelamento Flexível até 420x e Renegociação)

- [x] **Teto de 420 Parcelas (35 Anos):**
  - Constantes `MAX_INSTALLMENTS = 420` e presets `QUICK_INSTALLMENT_PRESETS` (`1x` a `120x`).
  - Campo numérico livre com clamp e banner explicativo ao digitar valores superiores a 420.
  - Card de Resumo Compacto inteligente para parcelamentos acima de 6x com grade expansível.
  - Testes de centavos exatos no Vitest para 120x, 360x e 420x.
- [x] **Decomposição Modular do `TransactionModal.tsx`:**
  - Reduzido de **1.081 linhas para 240 linhas** (< 250 linhas) com subcomponentes dedicados em `src/components/transaction-modal/` (`DocumentTagsInput`, `InstallmentSection`, `RecurrenceSection`).
- [x] **Data de Entrada / Emissão da NF (`issueDate`):**
  - Integrado ao contrato `Transaction`, schema SQLite, rotas de persistência, modal e coluna na tabela.
  - Validações inteligentes com alertas âmbar não-bloqueantes para pagamentos antecipados e datas futuras.
- [x] **Gestão de Parcelas e Renegociação (`InstallmentManagerModal.tsx`):**
  - Permite converter lançamentos à vista em parcelados.
  - Permite renegociar contratos e saldo devedor em aberto, mantendo as parcelas já pagas blindadas no histórico contábil.
  - Testes unitários puros em `format.test.ts` e de componente em `InstallmentManagerModal.test.tsx`.

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

## ✅ FASE 6: Concluída com Sucesso (Arquitetura em Camadas do Backend)

`server.ts` foi reduzido de **1.253 linhas para 66 linhas** (< 90 linhas). A estrutura foi totalmente desacoplada sob `server/`:

1. `server/db.ts` (235 linhas):
   - Conexão Better-SQLite3 (`data/fluxoclaro.db`) em modo WAL e chaves estrangeiras ativas.
   - Schemas das tabelas `users`, `categories`, `contacts`, `transactions` e índices essenciais.
   - Migrations seguras (`payment_method`, `discount_cents`, `interest_cents`, `is_recurring`, `recurrence_interval`, `issue_date`).
   - Seeding automático do Usuário Master padrão (`master` / `master123`) com categorias, contatos e lançamentos de demonstração.
2. `server/middleware/auth.ts` (140 linhas):
   - Chave secreta HMAC persistente (`data/.auth_secret` ou `SESSION_SECRET`).
   - Hash e verificação segura de senhas via `crypto.scrypt` com `timingSafeEqual`.
   - Assinatura e validação de tokens JWT/HMAC com expiração de 30 dias.
   - Middlewares Express: `requireAuth`, `requireMasterOrAdmin` e `requireMasterOnly`.
3. `server/routes/auth.ts` (108 linhas):
   - Endpoints `/api/auth/login`, `/register`, `/me` e `/change-password`.
4. `server/routes/bootstrap.ts` (186 linhas):
   - Endpoints `/api/data/snapshot` e `/api/bootstrap` para sincronização inicial completa.
   - Proxies resilientes de consulta de endereço `/api/lookup/cep/:cep` e `/api/lookup/cnpj/:cnpj` (ViaCEP, BrasilAPI e Pública CNPJ com fallbacks e timeouts).
5. `server/routes/transactions.ts` (223 linhas):
   - CRUD completo de contas a pagar e receber: `GET /`, `POST /batch`, `PUT /:id`, `POST /batch-delete`, `DELETE /:id`, `DELETE /group/:groupId`.
6. `server/routes/contacts.ts` (151 linhas):
   - CRUD de clientes e fornecedores com validação de unicidade de CPF/CNPJ por usuário.
7. `server/routes/categories.ts` (77 linhas):
   - CRUD de categorias de receitas e despesas.
8. `server/routes/backup.ts` (161 linhas):
   - Endpoints `/api/backup/export` e `/api/backup/restore` com restauração atômica em transação SQLite.
9. `server/routes/admin.ts` (237 linhas):
   - Painel Master/Admin: resumo estatístico `/summary`, listagem `/users`, cadastro, edição, suspensão `/status`, reset de senha e exclusão com proteção do último Master ativo.

* **Validação:** 69 testes unitários passando no Vitest (100% verde), 0 erros no TypeScript (`npm run lint`), `server.ts` orquestrador com apenas 66 linhas.

---

## ✅ FASE 7: Concluída com Sucesso (Módulo Avançado de Importações XML)

`XmlImportModal.tsx` foi reduzido de **594 linhas para 171 linhas** (< 200 linhas) aplicando princípios de código enxuto (Ponytail), alta modularização e eliminando a restrição de apenas "Contas a Pagar".

### Entregas Realizadas:
1. **Evolução do Parser em `src/utils/xmlParser.ts`:**
   - Suporte completo a NF-e de Saída/Venda (Contas a Receber) via elemento `<ide><tpNF>` (0 = Entrada/Compra, 1 = Saída/Venda).
   - Extração do destinatário completo (`<dest>`): nome, documento (CPF/CNPJ) e endereço (`<enderDest>`).
   - Suporte nativo a NFS-e de Serviços Eletrônica (Padrão ABRASF/Municipal) via `<InfNfse>`, `<CompNfse>` e `<tcCompNfse>`: prestador, tomador, número, data de emissão e valor líquido/serviços.
   - Extração e propagação estrita do campo `issueDate` para todos os lançamentos gerados (`buildTransactionsFromXmlItems`).
   - Função utilitária pura `buildContactFromXmlParty` para autocadastro com dados completos e máscaras de CPF/CNPJ e CEP.
2. **Decomposição Modular sob `src/components/xml-import/`:**
   - `XmlDropzone.tsx`: Área drag-and-drop com feedback visual de hover/drop e suporte a seleção de arquivos XML.
   - `XmlContactMatcher.tsx`: Card de vinculação inteligente com auto-identificação e botão de autocadastro pré-preenchido para Cliente ou Fornecedor/Prestador.
   - `XmlPreviewTable.tsx`: Tabela/lista de duplicatas e parcelas com checkbox individual, detecção de possíveis duplicidades, totalizadores em BRL e formatação estrita.
   - `XmlGenericMapping.tsx`: Formulário de mapeamento caso o XML seja de outro formato genérico.
   - `XmlDestinationFields.tsx`: Seletor de Categoria padrão (filtrada por tipo de transação) e seleção manual de contato.
   - `useXmlImport.ts`: Hook desacoplado com toda a lógica de estado, leitura de arquivos, auto-matching e handlers de confirmação.
   - `index.ts`: Barrel export modular.
   - `XmlImportModal.tsx`: Orquestrador com apenas **171 linhas**, alternador inteligente entre `Conta a Pagar` e `Conta a Receber` com detecção automática do tipo de operação.
3. **Suíte de Testes Unitários:**
   - `src/utils/__tests__/xmlParser.test.ts`: 6 testes unitários cobrindo NF-e de Compra (tpNF 0), NF-e de Venda (tpNF 1), NFS-e ABRASF, propagação de `issueDate`, XML genérico e tratamento de erros.
   - `src/components/xml-import/__tests__/xml-import-components.test.tsx`: 6 testes cobrindo todos os submódulos da importação e o modal.
4. **Validação:**
   - `npm test`: **78 testes passando (100% verde)** em 8 arquivos de teste.
   - `npm run lint`: **0 erros de TypeScript**.

---

## ✅ FASE 8: Concluída com Sucesso (Modularização e Drag-and-Drop do Importador Excel)

`ExcelImportModal.tsx` foi reduzido de **824 linhas para 157 linhas** (< 180 linhas) com suporte nativo completo a **Drag-and-Drop** e arquitetura desacoplada em `src/components/excel-import/`:

### Entregas Realizadas:
1. `ExcelDropzone.tsx`:
   - Suporte nativo a Drag-and-Drop (`onDragOver`, `onDragLeave`, `onDrop`) e seleção por clique.
   - Feedback visual imediato com destaque `border-teal-500 bg-teal-50/50 dark:bg-teal-950/20` e texto dinâmico ao arrastar.
   - Botão para baixar planilha modelo `.xlsx`.
2. `ExcelSheetSelector.tsx`:
   - Oculta-se automaticamente quando a planilha possui apenas uma aba; exibe seletor responsivo para planilhas multi-abas.
3. `ExcelMappingTable.tsx`:
   - Gerencia mapeamento obrigatório de Valor e campos opcionais com toggles (`useDescription`, `useDueDate`, `useType`, etc.).
   - Amostra da 1ª linha da planilha (`sampleOf`) para conferência imediata.
4. `ExcelDefaultsForm.tsx`:
   - Seleção dinâmica de fallbacks contextuais (Tipo, Situação, Categoria e Contato padrão) apenas para as colunas não mapeadas.
5. `ExcelPreviewTable.tsx`:
   - Banners inteligentes com ações em lote: desmarcar duplicatas existentes e autocadastro automático de contatos não encontrados.
   - Tabela de lançamentos com checkboxes, badges de status, categoria, tipo e valores formatados em BRL (`font-mono-tabular`).
6. `useExcelImport.ts`:
   - Custom hook puro isolando o ciclo de vida, parsing assíncrono com `analyzeExcelBuffer`, cálculos de preview e regras de importação.
7. `index.ts`: Barrel export modular.
8. `src/components/excel-import/__tests__/excel-import-components.test.tsx`:
   - 10 novos testes unitários cobrindo todos os submódulos e comportamentos de importação.
9. **Validação:**
   - `npm test`: **88 testes passando (100% verde)** em 9 suítes.
   - `npm run lint`: **0 erros de TypeScript**.
   - `ExcelImportModal.tsx`: **157 linhas**.

---

## 📋 FASE 9: Cadastro da Empresa Emitente ("Minha Empresa") & Logotipo Dinâmico

Permitir que o gestor configure os dados oficiais da sua empresa e envie a logo da marca para os recibos impressos e relatórios:
- Formulário em Configurações com Razão Social, Fantasia, CNPJ (com validação matemática), IE, IM, Endereço completo com ViaCEP, Telefone e WhatsApp.
- Upload de Logo (PNG, JPG, WebP, SVG) com pré-visualização e armazenamento seguro.
- Inserção dinâmica no cabeçalho do recibo emitido (`TransactionDetailModal` / `ReceiptPDF`).

---

## 📋 FASE 10: Sistema de Licenciamento & Trava por Tempo de Uso

Implementar proteção e gestão de licença para comercialização do software (SaaS / On-Premise):
- Token de licença criptografado assinado (HMAC/AES) com expiração, CNPJ e módulos ativos.
- Alerta preventivo com contagem regressiva quando a licença estiver próxima do vencimento.
- Bloqueio de ações de escrita ao expirar com redirecionamento para tela de Liberação.
- Modal/Tela de Liberação para colar nova chave de ativação sem interrupção de dados.

---

## 📋 FASE 11: Modularização das Telas Restantes

Decomposição dos componentes restantes que ainda excedem 500 linhas:
- `ContactsView.tsx` (567 linhas) e `ContactDrawer.tsx` (559 linhas).
- `SettingsView.tsx` (809 linhas).
- `ReportsView.tsx` (530 linhas).
- `InstallmentManagerModal.tsx` (700 linhas).

---

## 📋 Checklist de Validação por Fase

Ao concluir qualquer fase, o executor deve rodar:
```bash
npm run lint    # Deve retornar zero erros de TypeScript
npm test        # Todos os testes do Vitest devem passar
```
Se ambos passarem, a fase está aprovada e pode prosseguir para a próxima.
