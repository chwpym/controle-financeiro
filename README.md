# FluxoClaro — Sistema de Contas a Pagar e Receber

Sistema financeiro enxuto, responsivo e de alta precisão em **Real (BRL)**, instalável como **PWA** e arquitetado para operar **offline-first** com sincronização automática e persistência local em **SQLite**.

---

## 🚀 Destaques da Arquitetura & Funcionalidades

- **Moeda Única em BRL com Precisão em Centavos:** Todos os cálculos e parcelamentos operam sobre inteiros em centavos (`amount_cents`), eliminando erros clássicos de arredondamento de ponto flutuante.
- **Parcelamento Inteligente (1x a 60x):** Divisão automática com sobra de centavos alocada na 1ª parcela (ex.: R$ 100,00 em 3x gera parcelas de R$ 33,34, R$ 33,33 e R$ 33,33), com identificação `1/N`, carnê agrupado e baixas individuais.
- **Autenticação Local Segura (Sem E-mail):** Acesso estritamente por **Usuário** e **Senha** (hash `scrypt` com salt), com **Usuário Master** pré-configurado para criação de usuários e redefinição direta de senhas.
- **Backup 100% Local:** Exportação e restauração direta de arquivos `.json` estruturados no próprio dispositivo, sem dependência de nuvem externa.
- **Importação Inteligente de NF-e e Excel:**
  - Leitura de **XML de NF-e**, extraindo emitente, CNPJ, dados de endereço e todas as duplicatas (`<dup>`) como parcelas com seus respectivos vencimentos.
  - Leitura de **planilhas Excel (.xlsx / .xls)** com mapeamento fonético/semântico automático de colunas.
- **Offline-First PWA:** Cache local completo com **IndexedDB** e fila de sincronização (`sync_queue`) com despacho manual ou automático ao reconectar.
- **Design System Atômico (`src/components/ui/`):** Componentes reutilizáveis acessíveis (`Button`, `Badge`, `Card`, `Modal`, `MoneyInput`, `ConfirmDialog`, `EmptyState`) com tipografia numérica tabular (`JetBrains Mono`).
- **Suíte de Testes Automatizados com Vitest:** 37 testes automatizados cobrindo cálculos financeiros, regras de domínio, parsers de arquivos e componentes de UI.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS 4, Motion, Lucide Icons |
| **PWA & Offline** | Vite PWA (`vite-plugin-pwa`), Service Worker (Workbox), IndexedDB |
| **Backend** | Node.js, Express 4, TypeScript (`tsx`) |
| **Banco de Dados** | SQLite com `better-sqlite3` (WAL Mode ativo e chaves estrangeiras) |
| **Testes** | Vitest 5, jsdom, React Testing Library, `@testing-library/jest-dom` |
| **Exportação / Relatórios** | jsPDF, jspdf-autotable, SheetJS (`xlsx`) |

---

## 📦 Como Instalar e Rodar Localmente

### 1. Pré-requisitos
- **Node.js** v18 ou superior instalado.
- **npm** (ou gerenciador compatível).

### 2. Instalação das Dependências
Clone o repositório ou acesse a pasta do projeto e execute:
```bash
npm install
```

### 3. Executando em Modo Desenvolvimento
Inicie o servidor integrado com suporte a recarregamento rápido (HMR):
```bash
npm run dev
```
Abra seu navegador em: 👉 **[http://localhost:3000](http://localhost:3000)**

### 4. Executando em Modo Produção / PWA Completo (Teste de Offline e F5)
Para testar a experiência final de PWA com Service Worker e recarregamento 100% offline via F5:
```bash
# 1. Compila o frontend e gera os assets do PWA
npm run build

# 2. Inicia o servidor servindo o bundle compilado + API SQLite
npm run preview
# (ou npm start)
```
Abra seu navegador em: 👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Como Executar os Testes Automatizados

O projeto conta com suíte de testes unitários e de integração utilizando **Vitest**:

```bash
# Executa todos os 37 testes automatizados
npm test

# Executa os testes em modo contínuo (watch) durante o desenvolvimento
npm run test:watch

# Validação estrita de tipos TypeScript
npm run lint

# Build de produção (Vite + PWA)
npm run build
```

---

## 📋 Guia de Testes Manuais (Passo a Passo)

Para validar o sistema manualmente na sua máquina, siga este roteiro de verificação:

### 1. Primeiro Acesso e Usuário Master
1. Acesse `http://localhost:3000`.
2. Se for o primeiro acesso, o sistema solicita a criação do **Usuário Master** inicial (ou permite login se já configurado).
3. Entre com o usuário e senha cadastrados.
4. Verifique no menu lateral o link **Painel Master**: confirme se consegue visualizar a lista de usuários, criar uma conta de teste e verificar a opção de redefinição de senha.

### 2. Teste de Lançamento e Divisão de Centavos
1. No menu lateral ou na barra superior, acesse **Contas P/R**.
2. Clique em **+ Nova Conta**:
   - Descrição: `Notebook Escritório`
   - Valor: `R$ 100,00`
   - Vencimento: escolha uma data
   - Selecione **Parcelado: 3x** com modo **Dividir valor total**.
3. Confirme o lançamento.
4. **O que verificar:** Na listagem de contas, devem surgir 3 lançamentos vinculados:
   - Parcela 1/3 com valor de **R$ 33,34**
   - Parcela 2/3 com valor de **R$ 33,33**
   - Parcela 3/3 com valor de **R$ 33,33**
   *(Soma total exata de R$ 100,00 sem perda de centavos).*

### 3. Teste de Baixa com Forma de Pagamento e Juros/Desconto
1. Localize a parcela `1/3` na lista.
2. Clique no botão de ação rápida **Baixar / Pagar**:
   - Selecione a forma de pagamento (ex.: `PIX`, `Boleto` ou `Cartão de Débito`).
   - Adicione opcionalmente um juros ou desconto de teste.
3. Confirme a baixa.
4. **O que verificar:** O status muda instantaneamente para **Pago** com badge verde. Ao clicar na conta para abrir o modo **Somente Leitura**, o recibo exibe a forma de pagamento e permite gerar o **Recibo em PDF**.

### 4. Teste de Importação de NF-e (XML) e Planilha (Excel)
1. Na tela de **Contas P/R**, clique no botão **Importar**:
   - **Importar XML:** Selecione um arquivo `.xml` de NF-e brasileira. O modal extrairá o emitente, CNPJ e listará cada duplicata `<dup>` como parcela pronta para importação.
   - **Importar Excel:** Selecione uma planilha `.xlsx` ou `.xls`. O sistema detectará as colunas automaticamente e permitirá ajustar o mapeamento antes de confirmar.

### 5. Teste de Funcionamento Offline (PWA)
1. No Google Chrome ou Edge, pressione `F12` para abrir o **DevTools**.
2. Vá até a aba **Network** (Rede) e altere a opção *"No throttling"* para **Offline**.
3. Na interface do FluxoClaro, observe que surge o indicador de **Modo Offline**.
4. Crie uma nova conta a pagar (ex.: `Compra de Café - R$ 25,00`).
5. A conta será gravada no **IndexedDB** e o botão **Sincronizar** na barra superior exibirá `1 pendência`.
6. No DevTools, volte a conexão para **Online**.
7. Clique em **Sincronizar** (ou recarregue a página). A conta será despachada e gravada com sucesso no SQLite do servidor.

### 6. Teste de Backup e Restauração Local
1. No menu lateral, acesse **Ajustes**.
2. Na seção **Backup Local**, clique em **Exportar Backup**:
   - O navegador fará o download imediato de um arquivo `.json` estruturado.
3. Clique em **Restaurar Backup** e selecione o arquivo baixado para validar a integridade da mescla de dados.

---

## 📁 Estrutura do Projeto

```
controle-financeiro/
├── data/                             # Banco SQLite local (ignorado pelo git)
│   ├── .gitkeep
│   └── fluxoclaro.db
├── src/
│   ├── components/
│   │   ├── ui/                       # Design System Atômico Reutilizável
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── MoneyInput.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── __tests__/            # Testes dos componentes UI
│   │   ├── AdminView.tsx             # Painel Usuário Master
│   │   ├── AnalyticsView.tsx         # Gráficos e inteligência financeira
│   │   ├── ContactsView.tsx          # Cadastro PF/PJ e consulta CEP/CNPJ
│   │   ├── DashboardView.tsx         # Dashboard com KPIs e drag-and-drop
│   │   ├── DateRangeFilter.tsx       # Filtro por período padronizado
│   │   ├── ExcelImportModal.tsx      # Modal de importação XLSX/XLS
│   │   ├── ReportsView.tsx           # Relatórios e exportação PDF/Excel
│   │   ├── SettingsView.tsx          # Ajustes, categorias e backup local
│   │   ├── SettleModal.tsx           # Baixa de contas
│   │   ├── TransactionModal.tsx      # Lançamento e parcelamento
│   │   ├── TransactionsView.tsx      # Listagem de contas a pagar/receber
│   │   └── XmlImportModal.tsx        # Modal de importação NF-e/XML
│   ├── hooks/                        # Custom hooks (online status, PWA)
│   ├── utils/                        # Cálculos financeiros e parsers
│   │   ├── format.ts                 # Formatação BRL, datas e parcelas
│   │   ├── xmlParser.ts              # Leitor de NF-e brasileira
│   │   ├── excelParser.ts            # Leitor de planilhas Excel
│   │   ├── offlineDb.ts              # Camada IndexedDB offline-first
│   │   ├── exporters.ts              # Geradores PDF e XLSX
│   │   └── __tests__/                # Testes unitários com Vitest
│   ├── App.tsx                       # Container principal da aplicação
│   ├── types.ts                      # Interfaces TypeScript
│   └── setupTests.ts                 # Setup do Vitest + Testing Library
├── server.ts                         # Servidor Express + SQLite embutido
├── vite.config.ts                    # Configurações do Vite, PWA e Vitest
├── tsconfig.json                     # Configuração do TypeScript
└── package.json                      # Scripts e dependências
```

---

## 🔒 Segurança e Privacidade de Dados

- **Sem Nuvem de Terceiros:** Todos os seus dados financeiros residem exclusivamente na sua máquina em `data/fluxoclaro.db`.
- **Proteção no Git:** O banco SQLite local e as chaves de sessão estão ignorados no `.gitignore` para impedir vazamento acidental de dados financeiros em repositórios remotos.
