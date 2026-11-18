# Diretrizes de Arquitetura e Engenharia — FluxoClaro

Este documento estabelece as regras de organização de código, limites de complexidade e arquitetura em camadas do **FluxoClaro**.

---

## 🏛️ 1. Princípios Gerais de Arquitetura

1. **Responsabilidade Única (Single Responsibility Principle - SRP):**
   * Cada arquivo deve fazer apenas uma coisa e fazê-la bem.
   * Telas cuidam da composição visual;
   * Hooks cuidam do estado e das chamadas de API;
   * Utilitários cuidam de funções puras e cálculos matemáticos.
2. **Limite de Complexidade (Regra dos 250 linhas):**
   * Nenhum arquivo de componente ou rota deve exceder **250 linhas**.
   * Se um componente começar a crescer, extraia subcomponentes (ex: gavetas, modais, cabeçalhos ou filtros) para arquivos separados.
3. **Padrão Offline-First & SQLite:**
   * O backend utiliza SQLite com modo WAL (*Write-Ahead Logging*) para máxima velocidade e integridade local.
   * O frontend utiliza IndexedDB para cache e suporte a operações offline, sincronizando quando houver conexão.

---

## 📁 2. Estrutura de Diretórios Recomendada

### Frontend (`src/`)

```
src/
├── components/
│   ├── ui/                    # Componentes Atômicos Puros (Agnósticos de regra de negócio)
│   │   ├── Button.tsx         # Variantes: primary, secondary, danger, ghost
│   │   ├── Input.tsx          # Input padrão com label e estado de erro
│   │   ├── MoneyInput.tsx     # Input monetário mascarado automático em centavos (R$)
│   │   ├── Badge.tsx          # Badges de status: Pago, Pendente, Vencido
│   │   ├── Card.tsx           # Container com bordas e elevação padronizadas
│   │   ├── Modal.tsx          # Modal base acessível com backdrop e foco
│   │   ├── ConfirmDialog.tsx  # Diálogo padronizado para confirmações críticas
│   │   └── EmptyState.tsx     # Ilustração e mensagem para listagens vazias
│   │
│   ├── common/                # Moléculas de Negócio Reutilizáveis
│   │   ├── DateRangeFilter.tsx# Filtro de datas com modos pré-definidos e customizados
│   │   ├── SearchBar.tsx      # Barra de busca com debounce automático
│   │   └── KpiCard.tsx        # Card numérico de saldo/receita com tabular-nums
│   │
│   ├── ContactDrawer.tsx      # Gaveta lateral de cadastro/edição PF/PJ com abas ERP
│   ├── ContactsView.tsx       # Tela ampla de listagem e gestão de contatos
│   ├── DashboardView.tsx      # Painel de indicadores com cards organizados
│   ├── TransactionsView.tsx   # Contas a pagar e receber com filtros
│   └── SettleModal.tsx        # Baixa individual com juros/desconto e forma de pagamento
│
├── hooks/                     # Desacoplamento de Estado e Efeitos
│   ├── useOnlineStatus.ts     # Detecção de conectividade e reconexão
│   └── usePWAInstall.ts       # Gerenciamento de instalação PWA
│
├── utils/                     # Funções Puras e Utilitárias
│   ├── format.ts              # Formatação de BRL, datas, máscaras e cálculos
│   ├── api.ts                 # Cliente HTTP com tratamento de erros (ApiError)
│   ├── excelParser.ts         # Parser e validador de planilhas XLSX/XLS
│   └── xmlParser.ts           # Parser de NF-e e documentos fiscais
│
└── types.ts                   # Contratos de Dados Canônicos
```

---

## 🔌 3. Camadas do Backend (`server.ts`)

Para evitar arquivos monolíticos de backend, o servidor deve operar em 3 camadas conceituais:

1. **Camada de Rotas (Controllers):**
   * Validação de parâmetros de entrada e autenticação (`requireAuth`).
   * Retorno padronizado de códigos HTTP (200, 400, 404, 500).
2. **Camada de Negócio (Services):**
   * Regras financeiras, cálculo de parcelas e conciliação.
3. **Camada de Dados (Prepared Statements do SQLite):**
   * Queries SQL preparadas com bind de parâmetros (`?`), impedindo qualquer risco de SQL Injection.
   * Transações atômicas (`db.transaction`) para operações em lote (ex: carnês de até 60x ou exclusões múltiplas).

---

## 🔒 4. Regras de Segurança e Privacidade

1. **Armazenamento 100% Local:**
   * Sem envio de dados para servidores terceiros não autorizados.
   * Backups são gerados exclusivamente em arquivos locais `.json`.
2. **Autenticação Local:**
   * Hash de senhas via `scrypt` com salt aleatório.
   * Controle de privilégios entre Usuário Comum, Administrador e Usuário Master.
3. **Validação de Documentos no Banco:**
   * Trava de segurança no SQLite para impedir contatos com o mesmo CPF/CNPJ pertencentes ao mesmo usuário.
