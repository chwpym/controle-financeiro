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
[✅ Fase 9: Multi-Empresas]   -> Concluída com Sucesso (9.1, 9.2 e 9.3: Entidades, RBAC, CNPJ Alfanumérico, Trava Anti-Fraude e Modais)
[✅ Fase 10: Central & Licença]-> Concluída com Sucesso (10.1 Central de Atualizações e Auto-Update; 10.2 Sistema de Licenciamento e Liberação)
[⏳ Fase 11: XML & Telas]     -> 11.1 Evolução do XML (Lote, Validação e Edição); 11.2 Modularização das Telas Restantes
[📋 Fase 12: Auditoria UI]    -> Pente fino de padronização em 100% dos botões, inputs, pills e drawers
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

## ✅ FASE 9: Concluída com Sucesso (Multi-Empresas, Visão Consolidada, Logotipos, Permissões RBAC e Drawer de Avisos)

Permitir a gestão de múltiplos CNPJs (Matriz, Filiais ou diferentes negócios) com visão financeira individual ou consolidada, logotipo próprio por empresa para recibos, controle de permissões por usuário (com clonagem) e Drawer lateral de avisos:

### ✅ Etapa 9.1: Concluída com Sucesso (Entidade Empresa, Status Ativo/Inativo, CRUD Backend e Configurações)
- **Modelo `Company` em `src/types.ts` e SQLite (`server/db.ts`):**
  - Campos: `id`, `user_id`, `legalName` (Razão Social), `tradeName` (Nome Fantasia), `document` (CNPJ com validação matemática), `stateRegistration`, `municipalRegistration`, `status` (`'active'` | `'inactive'`), `email`, `phone`, `whatsapp`, endereço completo (ViaCEP), `logoDataUrl`, `color` (tag visual) e `isDefault`.
  - Função de seed automático `seedDefaultCompanyForUser` garantindo ao menos uma empresa padrão ativa.
- **Rotas Backend em `server/routes/companies.ts`:**
  - `GET /api/companies`, `POST /api/companies`, `PUT /api/companies/:id`, `PATCH /api/companies/:id/status`, `PATCH /api/companies/:id/default`, `DELETE /api/companies/:id` (com proteção de última empresa).
  - Integrado a `server.ts` e suporte a backup/restore em `server/routes/backup.ts`.
- **Tela de Gestão de Empresas em Configurações (`CompaniesSettingsTab.tsx`):**
  - Listagem de empresas em cards com badges de status (Ativa/Inativa), cor da tag, badge "Empresa Padrão" e logo em miniatura.
  - Drawer de cadastro e edição no padrão do `ContactDrawer.tsx`: abas "1. Geral & Contato" e "2. Endereço Completo", toggle Ativa/Inativa, upload de logo Base64 com preview, seletor de cor hexadecimal e busca de CEP/CNPJ com preenchimento automático.
- **Validação:** 94 testes passando no Vitest (100% verde), 0 erros no lint.

### ✅ Etapa 9.2: Concluída com Sucesso (Vínculo de Contas, Seletor Global, Recibos PDF, Drawer de Avisos e CNPJ Alfanumérico)
- **CNPJ Alfanumérico da RFB (IN nº 2.229/2024):**
  - `maskCNPJ` e `isValidCNPJ` em `src/utils/format.ts` aceitando posições 1 a 12 com letras e números e posições 13-14 numéricas com módulo 11 adaptado à tabela ASCII.
- **Migration e Vínculo de Contas:**
  - Coluna `company_id` e índice `idx_tx_company` em `transactions` no SQLite e rotas REST.
  - Seleção no modal de lançamento (`TransactionModal`) e tag colorida na tabela de contas (`TransactionTable`).
- **Seletor Global no Header (`CompanySelector.tsx`):**
  - Dropdown no topo alternando entre empresa individual e `🌐 Todas as Empresas (Visão Consolidada)` com atualização em tempo real (`onCompaniesChange`).
  - Dashboard recalcula KPIs e gráficos em tempo real de acordo com a empresa ativa.
- **Recibos Dinâmicos com Logotipo:**
  - Cabeçalho oficial no `TransactionDetailModal` e no PDF gerado com logotipo, Razão Social, CNPJ, IE e endereço.
- **Drawer Lateral de Avisos (`AlertsDrawer.tsx`):**
  - Drawer deslizante da direita ativado pelo atalho do popover de avisos, com filtros e baixas rápidas.
- **Validação:** 101 testes passando no Vitest (100% verde em 12 arquivos), 0 erros no lint.

### ✅ Etapa 9.3: Concluída com Sucesso (Controle de Acesso, Permissões por Empresa RBAC, Trava Anti-Fraude e Modais de Usuário)
- **Correção Visual no Painel Admin (`AdminView.tsx`):**
  - Exibição de alertas de validação (`modalError`) renderizados diretamente no corpo dos modais (Criação, Edição e Redefinição de Senha) acima dos botões de ação, sem ficarem ocultos atrás do backdrop escuro.
- **Tabela de Vínculo `user_company_access` & RBAC:**
  - Usuários `master` e `admin`: Acesso irrestrito a todas as empresas cadastradas e à visão consolidada.
  - Usuários operacionais (`user`): Acesso restrito exclusivamente às empresas ativas marcadas no seu cadastro.
- **Trava de Segurança Anti-Fraude (`can_delete`):**
  - Coluna `can_delete` na tabela `users` (desmarcada por padrão para novos operadores).
  - Bloqueio estrito de exclusão no backend (`requireDeletePermission` em `server/routes/transactions.ts` retornando HTTP 403 para operadores desautorizados).
  - Badges visuais na listagem de usuários (`Pode Excluir` / `Sem Exclusão`).
- **Clonagem Rápida de Usuário:**
  - Botão `[ 📋 Copiar de Outro Usuário ]` no modal de cadastro replicando em 1 clique as empresas atribuídas, empresa padrão e a flag de exclusão.
- **Validação:** 108 testes passando no Vitest (100% verde em 13 arquivos), 0 erros de TypeScript (`npm run lint`).

---

## ✅ FASE 10: Concluída com Sucesso (Central de Atualizações, Deploy Badge & Licenciamento por Tempo de Uso)

Implementar governança de versões, eliminação de problemas de cache do PWA no navegador e proteção/gestão de licença comercial (SaaS / On-Premise):

### ✅ Etapa 10.1: Concluída com Sucesso (Central de Atualizações, Deploy Badge no Footer & Auto-Update do PWA)
- **Injeção Automática no Build (Vite + Git / Render):**
  - Injeção das constantes globais `__APP_VERSION__` (`1.10.1`), `__COMMIT_HASH__` (extraído via `process.env.RENDER_GIT_COMMIT` com fallback para `git rev-parse --short HEAD`) e `__BUILD_TIME__` em `vite.config.ts` e declarações TypeScript em `src/vite-env.d.ts`.
  - Endpoint Express `GET /api/version` em `server/routes/version.ts` retornando versão, hash do commit, horários de build/servidor e integridade da base SQLite (`healthy`).
- **Utilitário de Atualização e Cache (`src/utils/pwaUpdate.ts`):**
  - Funções `checkServerVersion()` e `forcePwaRefresh()` com limpeza completa do Cache Storage, atualização do Service Worker e recarregamento limpo.
- **Badge Discreto no Footer (`src/components/DeployFooter.tsx` & `src/App.tsx`):**
  - Barra de rodapé com `FluxoClaro © 2026 · Gestão Financeira`, bolinha pulsante de conexão (*Online* / *Offline*), `v1.10.1 • <commit>` e pílula `[ Atualizações ]`.
  - Atalhos adicionais no menu lateral mobile e na aba de Configurações (`SettingsView.tsx`).
- **Painel Central de Atualizações (`src/components/UpdateCenterModal.tsx`):**
  - Gaveta lateral moderna com 3 cards: Status Atual do Sistema, Verificação de Atualizações com console visual de diagnóstico e O Que Há de Novo (Changelog).
- **Validação:** 112 testes passando no Vitest (100% verde em 14 suítes), 0 erros de TypeScript (`npm run lint`).

### ✅ Etapa 10.2: Concluída com Sucesso (Sistema de Licenciamento, Trava por Tempo de Uso e Liberação do Sistema)
- **Motor de Licença & SQLite (`server/db.ts` & `server/licenseEngine.ts`):**
  - Tabela `system_licenses` associando `company_id`, `cnpj`, `license_key`, `valid_until` e `is_active` com índices dedicados.
  - Função interna desacoplada `renewCompanyLicense(companyId, days)` para renovações em lote, acionada com 1 clique pelo Master e pronta para integração futura com Webhooks de pagamento (Pix/Boleto/Cartão).
  - Seed automático (`seedDefaultLicenses`) de licença inicial de 365 dias para empresas existentes garantindo continuidade operacional nos testes.
- **Algoritmo Criptográfico do Código de Liberação (HMAC-SHA256):**
  - Geração e validação matemática de chaves formatadas em blocos `XXXX-XXXX-XXXX-XXXX` vinculadas ao CNPJ (numérico ou alfanumérico RFB) e data de expiração.
  - Utilitário CLI em `server/licenseEngine.ts` para emissão ágil de códigos de emergência pelo suporte.
- **Rotas REST & Trava de Expiração (`server/routes/license.ts` & `server/routes/transactions.ts`):**
  - Endpoints `/api/license/status`, `/api/license/activate`, `/api/admin/licenses`, `/api/admin/licenses/renew` e `/api/admin/licenses/generate-code`.
  - Middleware `requireActiveLicense` bloqueando gravações financeiras (`POST`, `PUT`, `DELETE`) quando vencida, preservando 100% das consultas e relatórios históricos (`GET`).
- **Modal / Tela de Liberação do Sistema (`SystemReleaseModal.tsx`) & Alertas (`App.tsx`):**
  - Alerta preventivo âmbar no topo quando restam 5 dias ou menos, e abertura automática em modo bloqueio quando expirado.
  - Modal nativo `<dialog>` acessível com Data do Sistema, CNPJ ativo (com seletor multi-empresa), campo formatado em maiúsculas, erros inline e botões `[ Abandonar ]` e `[ Confirmar ]`.
- **Gestão de Licenças no Painel Master (`AdminView.tsx` & `AdminLicensesTab.tsx`):**
  - Aba **"Licenças & Assinaturas"** para o Master visualizar vencimentos e renovar com 1 clique (`[ +30 Dias ]`) ou gerar/copiar código de emergência (`[ 🔑 Gerar Código ]`).

---

## 📋 FASE 11: Evolução da Central de XML & Modularização das Telas Restantes

### ✅ Etapa 11.1: Concluída com Sucesso (Evolução do Importador XML, Layout Compacto, Validação Fiscal, Edição Inline, Batimento com Ajustes Comerciais e Multi-XML)
- **Compactação de Layout pós-upload:**
  - A caixa de dropzone grande recolhe-se automaticamente após o carregamento para uma barra horizontal compacta de 1 linha (`📄 NF-e ... • Arquivo ... [ 🔄 Trocar XML ]`), liberando ~150px de altura vertical para visualização completa das parcelas sem rolagem excessiva.
- **Card Explícito de Validação Fiscal & Integridade Estrita de Dois Agentes:**
  - Cruzamento inteligente dos CNPJs do XML com as empresas cadastradas do usuário (`companies`):
    - Se Destinatário = Empresa do usuário: auto-seleção imediata de **`Conta a Pagar (Compra / Despesa)`**, vinculação automática do `companyId` da empresa compradora, identificação do Emitente como Fornecedor e atalho rápido para cadastrar apenas o **Fornecedor** em Contatos.
    - Se Emitente = Empresa do usuário: auto-seleção de **`Conta a Receber (Venda / Receita)`**, vinculação automática do `companyId` da empresa emitente, identificação do Destinatário como Cliente e atalho rápido para cadastrar apenas o **Cliente** em Contatos.
    - **Trava Fidedigna de Integridade (Nenhum CNPJ Coincide):**
      - Uma nota fiscal só pode pertencer ao Emitente ou ao Destinatário (dois agentes legais). Fica terminantemente proibido vincular a nota a um 3º CNPJ arbitrário via dropdown solto.
      - O botão **`[ Importar ]` fica estritamente bloqueado** e o sistema exibe alerta claro orientando o usuário a cadastrar sua empresa primeiro: `[ 🏢 Ir para Minhas Empresas ]` ou `[ Cancelar ]`.
  - **Correção Visual de Layout:** Aplicação de `min-w-0` e contenção de overflow nos cards de Emitente e Destinatário, impedindo qualquer vazamento horizontal da tabela ou modais.
  - Vínculo persistido do `company_id` nos lançamentos importados.
- **Edição Direta de Parcelas na Tabela de Pré-visualização (Inline Editing):**
  - Inputs diretos para alteração de Data de Vencimento (`dueDate`) e Valor (`amountCents`) de cada parcela/duplicata antes de efetivar a importação com cabeçalhos acessíveis fixos (`sticky`) e regiões com teclado (`tabindex="0"`).
- **Painel de Batimento em Tempo Real & Ajustes Comerciais (Acréscimos e Abatimentos):**
  - Cálculo instantâneo: $\text{Diferença} = \text{Soma das Parcelas} - \text{Total da NF-e}$.
  - Se houver divergência, o sistema exibe o painel de batimento sem bloquear a importação, permitindo selecionar o motivo comercial da diferença:
    - **Diferença Positiva (+ Acréscimo / Boleto Maior):** Frete por Fora / Despesa de Entrega, Juros / Encargos / Tarifa Bancária de Boleto ou Outro Acréscimo Comercial (gravado em `interestCents` e no histórico/observações).
    - **Diferença Negativa (- Abatimento / Boleto Menor):** Crédito de Garantia / Peça com Defeito, Desconto Comercial no Boleto, Devolução Parcial de Mercadoria ou Outro Abatimento (gravado em `discountCents` e no histórico/observações).
- **Importação em Massa (Multi-XML):**
  - Suporte a seleção ou arraste de múltiplos arquivos XML simultâneos (`multiple`), processamento assíncrono em fila e tabela consolidada de resumo com status, conferência, inspeção e botão de importação em lote (`[ Importar Todas as Notas (X) ]`).
- **Validação:** 125 testes passando no Vitest (100% verde em 16 arquivos), 0 erros de TypeScript (`npm run lint`).
- **Refinamento Visual Registrado (Modal Clean):**
  - Como a empresa vinculada já aparece na pílula superior (`Vinculado à empresa: GENUINA`), eliminar o card redundante de "Sua Empresa" e exibir apenas o card compacto do Fornecedor (ou Cliente) com seu botão de cadastro, tornando o layout mais *clean* e liberando mais espaço vertical.

### 📋 Etapa 11.2: Modularização das Telas Restantes
Decomposição arquitetural para modularizar e reduzir para menos de 250 linhas os componentes remanescentes:
- `ContactsView.tsx` (567 linhas) e `ContactDrawer.tsx` (559 linhas) -> `src/components/contacts/`
- `SettingsView.tsx` (809 linhas) -> `src/components/settings/`
- `ReportsView.tsx` (530 linhas) -> `src/components/reports/`
- `InstallmentManagerModal.tsx` (700 linhas) -> `src/components/installment-manager/`

---

## 🎨 FASE 12: Auditoria Geral de Consistência e Padronização do Frontend

Realizar um pente fino em 100% dos componentes de interface para garantir aderência ao Design System (`guia-design-system-e-motion.md`):
- **Botões:** Unificação estrita de botões primários (Teal `bg-teal-700`), secundários (outline) e botões utilitários de consulta (`[ Consultar ]`).
- **Controles Segmentados:** Padronização visual de todas as pílulas de seleção (PF/PJ, Cliente/Fornecedor/Ambos, A Pagar/A Receber).
- **Consistência de Drawers e Modais:** Garantir que todos os drawers e modais tenham o mesmo padrão de abas, espaçamentos, títulos e fechamento no ESC.
- **Auditoria de Mensagens de Erro:** Varredura para certificar que nenhum erro de validação fique oculto atrás de backdrops ou fora da área visível do formulário.
- **Tipografia Numérica:** Garantir a presença de `font-mono-tabular` em todas as tabelas, extratos, relatórios e contadores.

---

## 📋 Checklist de Validação por Fase

Ao concluir qualquer fase, o executor deve rodar:
```bash
npm run lint    # Deve retornar zero erros de TypeScript
npm test        # Todos os testes do Vitest devem passar
```
Se ambos passarem, a fase está aprovada e pode prosseguir para a próxima.
