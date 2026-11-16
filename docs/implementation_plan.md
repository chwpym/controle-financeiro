# FluxoClaro — Sistema Simples de Contas a Pagar e Receber

Um sistema financeiro direto e responsivo em **Real (BRL)**, instalável como PWA e preparado para operar offline com sincronização automática. Inclui contas a pagar e receber com **parcelamento**, autenticação local simples apenas com **usuário e senha** (sem e-mail) gerida por **Usuário Master**, **backup local em arquivo**, consulta instantânea editável de **CEP e CNPJ** no cadastro PF/PJ, importação de pagamentos via **XML**, notificações de vencimento, gráficos mensais e exportação em **PDF e Excel**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Todos os ajustes solicitados foram incorporados: **sem Firebase**, **somente BRL**, **sem backup em nuvem (apenas backup local)**, **login apenas com usuário e senha sem e-mail (com Usuário Master)** e **parcelamento completo**.

- **Autenticação Local Sem E-mail (Confirmado)**: Acesso usando apenas **Nome de Usuário** e **Senha** (sem campo de e-mail no login ou cadastro). O sistema inicia com um **Usuário Master** pré-configurado que pode criar usuários, alterar/redefinir a senha de qualquer usuário, bloquear ou liberar acessos pelo Painel Administrativo. Qualquer usuário conectado também pode trocar sua própria senha.
- **Backup Apenas Local (Confirmado)**: Removido o backup em nuvem criptografado. O sistema gera e restaura **backups locais** diretamente em arquivo no dispositivo do usuário (contendo lançamentos, parcelas, contatos e categorias).
- **Parcelamento de Contas (Confirmado)**: Ao lançar uma conta a pagar ou receber, o usuário escolhe pagamento **à vista (1x)** ou **parcelado (2x até 60x)**, optando por dividir o valor total ou repetir o valor por parcela, gerando automaticamente todos os vencimentos mensais (`1/N`, `2/N`, ...) e agrupando parcelas vinculadas.
- **Moeda Única BRL & Persistência Simples**: Valores exclusivamente em **R$ (BRL)** armazenados no servidor local **Express + SQLite** com espelhamento e fila de sincronização automática em **IndexedDB** para uso offline no PWA.
- **Cadastro PF/PJ com Consulta Editável**: Alternância rápida entre Pessoa Física e Pessoa Jurídica na mesma tela, com botão **Consultar** para **CNPJ** e **CEP** preenchendo os campos automaticamente e mantendo tudo editável.

---

## 1. Overview & Core Concept

- **What It Does**: Centraliza em um fluxo simples o controle financeiro mensal em BRL: lançamento de contas à vista ou parceladas, baixa rápida de pagamentos/recebimentos, alertas de vencimento, cadastro unificado PF/PJ com consulta de CEP/CNPJ, importação de XML (NF-e e genérico), gráficos de desempenho, exportação PDF/Excel, backup local em arquivo e gestão de usuários pelo Usuário Master.
- **Target Audience / Persona**: Pequenas empresas, escritórios, comércios e profissionais autônomos que precisam controlar parcelas a pagar e receber no desktop ou celular, sem depender de nuvem externa ou configurações complexas.
- **Key Value**: Operação imediata e descomplicada — sem e-mail obrigatório, sem múltiplas moedas, funcionando offline como aplicativo instalado (PWA) e com agilidade no preenchimento via parcelamento automático, XML, CNPJ e CEP.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Login Local & Troca/Recuperação via Usuário Master**:
   - Tela de login minimalista solicitando apenas **Usuário** e **Senha** (além da opção de criar conta local ou aviso claro para solicitar redefinição de senha ao **Usuário Master** em caso de esquecimento).
   - No menu do usuário logado há a opção **Alterar Minha Senha** (informando senha atual e nova senha).
2. **Dashboard Mensal & Gráficos em Tempo Real**:
   - Seletor de mês/ano no topo com quatro indicadores em **R$ (BRL)**: **Saldo do Mês**, **Total a Receber**, **Total a Pagar** e **Contas Vencidas**.
   - Gráficos mensais em tempo real: comparativo **Receitas × Despesas** por mês e distribuição de **Despesas por Categoria**.
   - Central de alertas destacando parcelas vencidas, vencendo hoje e nos próximos dias, com suporte a notificações nativas do navegador.
3. **Contas a Pagar e Receber + Parcelamento + Importação XML**:
   - Filtros combinados por mês, tipo (`Todas`, `A Pagar`, `A Receber`), status (`Pendente`, `Pago/Recebido`, `Vencido`), categoria, contato e busca textual.
   - **Lançamento com Parcelamento**: Usuário informa valor, data do 1º vencimento e número de parcelas (`1x` ou `Nx`), escolhendo se o valor é *Total (dividir entre as parcelas)* ou *Valor da parcela*. O sistema cria todas as parcelas mensais identificadas como `1/N`, `2/N`... com possibilidade de editar/baixar individualmente ou excluir o carnê/grupo.
   - **Importação XML**: Lê arquivos `.xml` de **NF-e** (capturando automaticamente emitente, CNPJ, nota e cada duplicata `<dup>` como parcela já com seus respectivos vencimentos) ou permite mapear tags de um **XML genérico** antes de confirmar.
4. **Cadastro Unificado PF / PJ com Botão "Consultar"**:
   - Alternância instantânea **Pessoa Física (CPF)** ↔ **Pessoa Jurídica (CNPJ)** no mesmo formulário.
   - Botão **Consultar** ao lado do **CNPJ** preenche Razão Social, Nome Fantasia, Endereço completo, Telefone e E-mail; botão **Consultar** ao lado do **CEP** preenche Logradouro, Bairro, Cidade e UF — todos os campos ficam editáveis após o preenchimento.
5. **Relatórios, Categorias & Backup Local**:
   - Relatório mensal detalhado com exportação direta em **PDF** e **Excel (.xlsx)**.
   - Tela de ajustes para gerenciar **Categorias Personalizadas**, instalar o **PWA** e executar **Backup Local** (baixar arquivo `.json` com os dados e restaurar a partir de um arquivo local).
6. **Painel Administrativo (Usuário Master)**:
   - Visível para o **Usuário Master** e administradores: lista usuários registrados com status em tempo real, permite criar usuários, editar nome/papel (`Master/Admin` ou `Usuário`), ativar/suspender acesso e **Alterar/Redefinir a Senha** de qualquer conta sem precisar de e-mail.

### Visual Identity & Theme

- **Aesthetic Direction**: Minimalista financeiro limpo — superfícies planas com bordas sutis de `1px`, espaçamento equilibrado e zero poluição visual.
- **Color Palette & Mood**:
  - **Modo Claro (Padrão)**: Fundo `#F8FAFC`, cartões `#FFFFFF` com borda `#E2E8F0`, texto `#0F172A` e secundário `#475569`.
  - **Modo Escuro**: Fundo `#0B1120`, superfícies `#111827` e `#1E293B`, bordas `#1F2937`, texto `#F8FAFC` com compensação óptica noturna.
  - **Acento & Semântica**: Verde-petróleo `#0F766E` nas ações principais; estados sempre acompanhados de texto claro — Pago/Recebido (`#16A34A`), Vence em breve (`#D97706`), Vencido (`#DC2626`).
- **Typography & Hierarchy**:
  - **Plus Jakarta Sans** nos títulos e navegação, **DM Sans** nos textos/formulários e **JetBrains Mono** (`tabular-nums`) em todos os valores `R$`, parcelas (`01/12`), datas e documentos.
- **Component Styling & Layout**:
  - **Desktop (1440px+)**: Menu lateral (`248px`) + barra superior enxuta com seletor de mês, status offline/sync, alternador de modo escuro e botão `+ Nova Conta`.
  - **Mobile (375px–430px)**: Cabeçalho compacto (`52px`) + barra inferior fixa no alcance do polegar (4 abas principais, respeitando teto de 15% da altura útil), alvos de toque ≥ `44x44px` e formulários em *bottom sheet*.

### Interactive Feedback & Motion

- Transições rápidas (`150ms`–`200ms`) restritas a `transform` e `opacity`.
- Indicador discreto de modo offline com contador de alterações aguardando sincronização automática, além de confirmações visuais para baixas, geração de parcelas, backup local e redefinição de senhas.

---

## 3. Key Product Decisions & Trade-Offs

- **Login Apenas com Usuário e Senha (Sem E-mail) + Usuário Master**:
  - *Chosen Approach*: Autenticação local baseada em `username` único e senha com hash seguro (`scrypt` + `salt`) no SQLite; Usuário Master pré-criado no sistema com poder total de redefinição de senhas e gestão de usuários.
  - *Why*: Atende exatamente ao pedido de simplicidade máxima sem e-mail e sem dependência de servidor SMTP ou Firebase, mantendo recuperação de senha imediata via Usuário Master ou troca direta pelo próprio usuário.
  - *Alternatives Considered*: Fluxo de e-mail exigiria servidor SMTP externo e campo de e-mail obrigatório.

- **Backup Local em Arquivo (Sem Nuvem)**:
  - *Chosen Approach*: Exportação e importação direta de arquivo `.json` versionado contendo todas as contas, parcelas, contatos e categorias do usuário.
  - *Why*: Garante que o usuário guarde sua cópia onde preferir (pendrive, computador, pasta local) sem complexidade de criptografia em nuvem.
  - *Alternatives Considered*: Cópia remota criptografada adicionaria atrito de frases-secretas e armazenamento em nuvem dispensado pelo usuário.

- **Parcelamento com Precisão em Centavos (BRL)**:
  - *Chosen Approach*: Todos os valores armazenados como inteiros em centavos (`amount_cents`) e geração de grupo de parcelas (`installment_group_id`, `installment_number`, `installment_total`), ajustando eventual diferença de arredondamento na 1ª parcela.
  - *Why*: Evita erros clássicos de ponto flutuante (ex.: `R$ 100,00 ÷ 3`) e permite tanto dar baixa individual em cada mês quanto gerenciar o parcelamento completo.

- **SQLite Embutido + IndexedDB Offline-First**:
  - *Chosen Approach*: API REST no Express gravando em SQLite local, combinada com cache em IndexedDB e fila de sincronização automática quando a conexão retorna.
  - *Why*: Funciona como PWA instalado mesmo sem internet e sincroniza automaticamente ao reconectar.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PWA Shell (Service Worker)                        │
│   Cache Offline · Instalação Web/iOS · Sincronização em Segundo Plano   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                 Camada de Estado, Sync & Notificações                   │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐  │
│  │ Sessão Local     │  │ IndexedDB + Fila  │  │ Alertas de Vencimento│  │
│  │ (Usuário/Senha)  │  │ Sync Automática   │  │ (Hoje / Atraso / N d)│  │
│  └────────┬─────────┘  └─────────┬─────────┘  └──────────┬───────────┘  │
└───────────┼──────────────────────┼────────────────────────┼─────────────┘
            │                      │                        │
┌───────────▼──────────────────────▼────────────────────────▼─────────────┐
│                    Telas Responsivas (Light / Dark)                     │
│  ┌─────────────┐ ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Dashboard   │ │ Contas P/R      │ │ Cadastros    │ │ Relatórios   │  │
│  │ & Gráficos  │ │ + Parcelas/XML  │ │ PF/PJ + API  │ │ PDF / Excel  │  │
│  └──────┬──────┘ └────────┬────────┘ └───────┬──────┘ └──────┬───────┘  │
│  ┌──────┴─────────────────┴──────────────────┴───────────────┴───────┐  │
│  │   Categorias & Backup Local (.json)   ·   Painel Usuário Master   │  │
│  └──────────────────────────────────┬────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────┘
                                      │ REST API (/api/*)
┌─────────────────────────────────────▼───────────────────────────────────┐
│                   Servidor Express + SQLite Embutido                    │
│  · Auth (/auth/* sem e-mail) · Contas & Parcelas   · Contatos PF/PJ     │
│  · Proxy Consultar CEP/CNPJ  · Backup Local Export · Gestão Master      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **`users`**: `id`, `username` (único, sem e-mail), `display_name`, `password_hash`, `role` (`'master' | 'admin' | 'user'`), `status` (`'active' | 'suspended'`), `last_login_at`, `created_at`, `updated_at`.
- **`categories`**: `id`, `user_id`, `name`, `type` (`'payable' | 'receivable' | 'both'`), `color`, `created_at`.
- **`contacts`**: `id`, `user_id`, `person_type` (`'PF' | 'PJ'`), `name`, `trade_name`, `document` (CPF/CNPJ), `email` (opcional do contato), `phone`, `cep`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`, `kind` (`'supplier' | 'customer' | 'both'`), `created_at`, `updated_at`.
- **`transactions`**: `id`, `user_id`, `type` (`'payable' | 'receivable'`), `description`, `amount_cents`, `due_date`, `paid_at`, `status` (`'pending' | 'settled'`), `category_id`, `contact_id`, `document_number`, `installment_group_id`, `installment_number`, `installment_total`, `notes`, `source` (`'manual' | 'xml'`), `created_at`, `updated_at`.
- **Estado Offline (IndexedDB)**: Cache local completo de `transactions`, `contacts`, `categories` e `sync_queue` para criação, edição, baixa e exclusão offline com envio automático na reconexão.

### Interactive Component & State Mapping

- **Auth Screen & Troca de Senha**: Formulário simples de `Usuário` e `Senha` (Entrar / Criar Conta), com modal interno de **Alterar Senha** para o usuário logado e orientação para solicitar redefinição ao **Usuário Master** caso esqueça a senha.
- **Dashboard & Charts**: Recalcula instantaneamente Saldo do Mês, A Pagar, A Receber, Vencidas e gráficos mensais a partir das parcelas do mês e do ano.
- **Transaction Modal & Parcelamento**: Seletor de parcelas (`1x` a `60x`), modo de cálculo (`Dividir valor total` ou `Repetir valor da parcela`), prévia em tempo real das datas e valores antes de confirmar, além de baixa rápida em 1 clique na listagem.
- **XML Importer**: Extrai automaticamente emitente e cada duplicata (`<dup>`) de arquivos NF-e como parcelas vinculadas, ou mapeia manualmente tags de XML genérico antes da importação em lote.
- **Unified PF/PJ Contact Form**: Alternância instantânea PF/PJ na mesma tela; botões **Consultar** em CNPJ e CEP buscam os dados via API e mantêm todos os campos abertos para edição manual.
- **Backup Local Manager**: Botão **Exportar Backup Local** gera download imediato de arquivo `.json` estruturado; botão **Restaurar Backup Local** valida o arquivo escolhido e importa/mescla os registros no banco local e no servidor.
- **Painel Administrativo Master**: Permite ao Usuário Master visualizar usuários registrados em tempo real, criar contas, alterar papel/status (`active`/`suspended`), editar dados e **Alterar/Redefinir a Senha** de qualquer usuário diretamente na tabela.
