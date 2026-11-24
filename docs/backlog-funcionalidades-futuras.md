# 📋 Backlog de Funcionalidades Futuras & Roadmap Estratégico — FluxoClaro

Este documento consolida os requisitos de negócio, funcionalidades estratégicas e melhorias arquiteturais para as próximas fases do produto, garantindo rastreabilidade e alinhamento entre produto e engenharia.

---

## 🗺️ Visão Geral das Próximas Fases

| Fase | Título | Objetivo Principal | Status |
| :--- | :--- | :--- | :--- |
| **Fase 8** | **Módulo Excel Avançado & Drag-and-Drop** | Upload por arraste nativo, mapeamento flexível e redução de `ExcelImportModal.tsx` de 824 para < 200 linhas | ✅ Concluída |
| **Fase 9** | **Multi-Empresas, Visão Consolidada, Logotipos e Permissões** | Múltiplos CNPJs, seletor global, logo nos recibos, RBAC e trava anti-fraude | ✅ Concluída |
| **Fase 10** | **Central de Atualizações, Deploy Badge & Licenciamento** | Badge no footer, verificação de deploy/PWA, código de liberação e trava de expiração | ✅ Concluída |
| **Fase 11** | **Modularização das Telas Restantes & Refinamento Fiscal do XML** | Decomposição de telas grandes e inteligência de cruzamento de CNPJ (Minha Empresa vs Fornecedor) no XML | ⏳ Próxima (Amanhã) |
| **Fase 12** | **Auditoria Geral de Consistência e UI** | Pente fino de padronização em 100% dos botões, inputs, pills, drawers e mensagens | 📋 Planejada |

---

## 📊 0. Importador Excel Modular com Drag-and-Drop Nativo (Fase 8)
**Objetivo:** Permitir que o usuário arraste uma planilha Excel/CSV diretamente para a tela sem abrir caixas de diálogo do Windows, com feedback visual moderno e modularização completa em submódulos sob `src/components/excel-import/`.

### Requisitos:
* **Drag-and-Drop Nativo:** Suporte completo aos eventos `onDragOver`, `onDragLeave` e `onDrop` em `ExcelDropzone.tsx`. Ao soltar o arquivo `.xlsx`, `.xls` ou `.csv`, ele é processado instantaneamente em memória sem abrir o explorador de arquivos.
* **Seleção de Abas:** Suporte dinâmico a planilhas multi-abas via `ExcelSheetSelector.tsx`.
* **Mapeamento Flexível:** Tabela interativa para associar colunas com toggles opcionais (`ExcelMappingTable.tsx`).
* **Valores Padrão:** Formulário de fallback para valores não preenchidos (`ExcelDefaultsForm.tsx`).
* **Pré-visualização e Autocadastro:** Tabela de conferência (`ExcelPreviewTable.tsx`) com detecção de contatos novos e autocadastro em lote.
* **Componente Orquestrador Enxuto:** `ExcelImportModal.tsx` com menos de 200 linhas.

---

## 🏢 1. Multi-Empresas ("Minhas Empresas"), Visão Consolidada, Logotipos e Permissões (Fase 9)
**Objetivo:** Permitir que o gestor cadastre e gerencie múltiplos CNPJs/Empresas (Matriz, Filiais ou empresas de diferentes segmentos), possibilitando visualizar o fluxo financeiro de forma individual ou consolidada em todo o sistema.

### Requisitos Estratégicos:
* **Multi-CNPJ com Status Ativo/Inativo:**
  * Cadastro completo de cada empresa: Razão Social, Nome Fantasia, CNPJ (com validação matemática), IE, IM, Endereço completo (ViaCEP), Telefone, WhatsApp, E-mail, cor de identificação visual e status (`Ativa` / `Inativa`).
  * Upload de Logotipo individual por empresa (PNG, JPG, WebP, SVG) para impressão de recibos com identidade visual própria.
* **Visão Consolidada vs. Individual (Seletor Global no Header):**
  * Seletor de empresa no topo do sistema: permite alternar para uma empresa específica ou para `🌐 Todas as Empresas (Visão Consolidada)`.
  * Dashboard, Gráficos e Contas adaptam-se instantaneamente ao filtro selecionado.
* **Vínculo por Lançamento:**
  * Cada conta a pagar/receber registra qual empresa do grupo é responsável (`company_id`).
  * Na listagem, tags visuais identificam rapidamente a empresa da conta.
* **Painel de Avisos Dinâmico e Drawer Lateral (`AlertsDrawer.tsx`):**
  * O botão `[ 🔔 AVISOS ]` abre o popover rápido com as contas urgentes (limite de 3 a 5 itens) filtradas pela empresa ativa.
  * Ao clicar em *"Ver todos os avisos"*, abre um **Drawer lateral (Slide-over da direita)** idêntico ao `ContactDrawer.tsx`, exibindo a lista completa de contas vencidas e a vencer com filtros e botões de baixa imediata (`Pagar` / `Receber`).
* **Controle de Acesso, Clonagem e Permissões por Usuário (RBAC):**
  * `Master` e `Admin`: têm acesso irrestrito a todas as empresas do grupo e à visão consolidada.
  * `User` (Operacional): tem seu acesso restrito apenas às empresas autorizadas pelo administrador.
  * **Clonagem Rápida:** Botão `[ 📋 Copiar de Outro Usuário ]` para replicar permissões de funcionários existentes com 1 clique.
  * **Trava Anti-Fraude:** Opção de desmarcar permissão de exclusão (`[✓] Pode excluir lançamentos`), impedindo que operadores apaguem histórico financeiro sem consentimento do gerente.

---

## 🚀 3. Central de Atualizações, Deploy Badge & Licenciamento por Tempo de Uso (Fase 10)
**Objetivo:** Governança de versão, eliminação de gargalos de cache do PWA e controle comercial de liberação do software (SaaS / On-Premise) com bloqueio pós-vencimento:

### 3.1. Central de Atualizações & Deploy Badge no Footer (Passo 10.1):
* **Injeção Automática de Versão e Commit:**
  * Configuração no build (Vite) para injetar automaticamente `__APP_VERSION__`, `__COMMIT_HASH__` (via Git ou `RENDER_GIT_COMMIT`) e `__BUILD_TIME__`.
  * Endpoint leve de verificação `/api/version` no Express.
* **Badge Discreto no Footer:**
  * Posicionado no rodapé da aplicação: `v1.9.3 • 1b9a829` acompanhado de um indicador verde de status (*Conectado*).
  * Ao clicar no badge, abre a **Central de Atualizações** (em modal ou gaveta deslizante elegante).
* **Painel da Central de Atualizações:**
  * Resumo com Versão Instalada, Commit Ativo, Data do Deploy e Status do Banco SQLite.
  * Botão `[ 🔄 Verificar Novas Atualizações ]`: consulta a API e o Service Worker. Se houver deploy novo concluído no Render mas o navegador ainda estiver com código em cache, exibe aviso imediato.
  * Botão `[ 🚀 Atualizar Sistema Agora ]`: esvazia caches do Service Worker e recarrega a página com o bundle mais recente sem perder a sessão.
  * Log de diagnóstico visual e lista com o que há de novo nas últimas entregas.

### 3.2. Licenciamento & Liberação do Sistema (Passo 10.2):
* **Chave Criptografada (Código de Liberação / Token):**
  * Contém payload assinado criptograficamente (HMAC / AES) atrelado ao CNPJ da empresa, data do sistema e validade acordada.
* **Comportamento do Sistema:**
  * **Alerta Prévio:** Quando faltarem X dias para expirar (ex: 5 dias antes), exibe alerta sutil de renovação.
  * **Ao Expirar (Bloqueio):** Bloqueia ações de escrita (inserção, edição e exclusão), exibindo a tela de bloqueio com redirecionamento para liberação.
* **Tela de Liberação do Sistema:**
  * Modal com Data do Sistema, CNPJ ativo e campo formatado `Código de Liberação: [ - - - - - - ]`.
  * Botões `[ Confirmar ]` e `[ Abandonar ]`.
  * Validação instantânea da chave e desbloqueio imediato do sistema sem perda de dados.

---

## 🧱 4. Modularização das Telas Restantes & Inteligência Fiscal de XML (Fase 11)
**Objetivo:** Concluir a decomposição arquitetural das telas que ainda possuem mais de 500 linhas e refinar o importador XML para diferenciar perfeitamente "Minhas Empresas" de "Contatos (Fornecedor/Cliente)":
* **Inteligência de CNPJ no XML (Cenário Fortlub / Genuína):**
  * Quando um XML é importado e nenhuma das empresas (nem Emitente nem Destinatário) estiver previamente cadastrada no sistema:
    * O sistema deve identificar com clareza o papel de cada parte:
      1. **Destinatário (Comprador)**: Opção de cadastrar como **"Minha Empresa"** (`companies`), ou vincular a uma empresa existente do usuário.
      2. **Emitente (Vendedor)**: Cadastrar na tabela de **Contatos** como **"Fornecedor"** (`contacts`, `kind: 'supplier'`).
      3. **Operação**: Definir automaticamente como **Conta a Pagar**.
    * Cada entidade entra na sua tabela e funcionalidade correta, sem misturar empresas do sistema com contatos de fornecedor!
* `ContactsView.tsx` e `ContactDrawer.tsx` -> Submódulos em `src/components/contacts/`
* `SettingsView.tsx` -> Submódulos em `src/components/settings/`
* `ReportsView.tsx` -> Submódulos em `src/components/reports/`
* `InstallmentManagerModal.tsx` -> Submódulos em `src/components/installment-manager/`

---

## 🎨 5. Auditoria Geral de Consistência e Padronização do Frontend (Fase 12)
**Objetivo:** Garantir acabamento de software de classe mundial, com 100% dos componentes e telas obedecendo estritamente aos tokens de design system:
* **Botões Padronizados:** Todos os botões de ação primária (Gravar/Salvar) em Verde Teal (`bg-teal-700`), secundários em outline neutro e botões de consulta rápida no mesmo estilo.
* **Controles de Seleção (Pills):** Padronização das pílulas ativas de tipos e classificações em todas as gavetas e tabelas.
* **Validações e Mensagens:** Garantia de que nenhum erro de validação fique oculto sob modais ou telas escuras.
* **Tipografia Numérica:** Conferência e aplicação estrita de `font-mono-tabular` em todos os valores, datas e códigos fiscais.

---

## 💼 6. Módulos Financeiros Avançados & SaaS Billing (Roadmap Pós-Fase 12)
Funcionalidades estratégicas catalogadas a partir de práticas consagradas de ERP e automação financeira:
* **Assinatura Recorrente da Licença do Software (SaaS Billing com Webhooks):**
  * Integração com gateways de pagamento brasileiros (Asaas, Mercado Pago ou EFI/Gerencianet).
  * Emissão de cobrança automática por Pix com QR Code Copia e Cola, Boleto Bancário ou Cartão de Crédito.
  * Webhook automatizado: ao receber confirmação de pagamento do gateway, chama `renewCompanyLicense(companyId, 30)` e estende a validade do cliente em 3 segundos sem intervenção manual.
* **Cobrança & Alertas via WhatsApp:**
  * Comunicação e envio automático de avisos de vencimento preventivo e notificações de contas vencidas diretamente para clientes via WhatsApp.
* **PIX Integrado e Recibos com QR Code:**
  * Geração e impressão de PIX Copia e Cola / QR Code dinâmico vinculado a duplicatas, recibos de caixa e faturas.
* **Comunicação Bancária CNAB (Layouts 240 e 400):**
  * Geração de arquivos de remessa bancária e leitura/conciliação de retorno bancário com detecção de títulos não encontrados e liquidação automática.
* **Conciliação Bancária Avançada (Extratos OFX & CSV):**
  * Importação de arquivos `.OFX` e `.CSV` de bancos com tela de conciliação lado a lado e matching automático de lançamentos.
* **Demonstrativo das Movimentações Financeiras & Implantação de Saldos:**
  * Módulo dedicado para implantação de saldos bancários e de caixa iniciais por conta, com DFC (Demonstrativo de Fluxo de Caixa) contábil/gerencial.
* **Demonstrativo das Movimentações Financeiras & Implantação de Saldos:**
  * Módulo dedicado para implantação de saldos bancários e de caixa iniciais por conta, com DFC (Demonstrativo de Fluxo de Caixa) contábil/gerencial.

---

*Atualizado em 24/11/2026 para alinhamento com a Fase 10 (Central de Atualizações + Licenciamento) e Backlog Estratégico.*
