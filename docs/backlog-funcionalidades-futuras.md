# 📋 Backlog de Funcionalidades Futuras & Roadmap Estratégico — FluxoClaro

Este documento consolida os requisitos de negócio, funcionalidades estratégicas e melhorias arquiteturais para as próximas fases do produto, garantindo rastreabilidade e alinhamento entre produto e engenharia.

---

## 🗺️ Visão Geral das Próximas Fases

| Fase | Título | Objetivo Principal | Status |
| :--- | :--- | :--- | :--- |
| **Fase 8** | **Módulo Excel Avançado & Drag-and-Drop** | Upload por arraste nativo, mapeamento flexível e redução de `ExcelImportModal.tsx` de 824 para < 200 linhas | ✅ Concluída |
| **Fase 9** | **Multi-Empresas, Visão Consolidada, Logotipos e Permissões** | Múltiplos CNPJs, seletor de empresa (individual ou consolidado), logo nos recibos e permissões por usuário | ⏳ Pronta para Início |
| **Fase 10** | **Licenciamento & Trava por Tempo de Uso** | Proteção de licença comercial, token assinado, aviso prévio e tela de liberação | 📋 Planejada |
| **Fase 11** | **Modularização das Telas Restantes** | Decomposição de Contatos, Configurações, Relatórios e Renegociação | 📋 Planejada |

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

## 🏢 1. Multi-Empresas ("Minhas Empresas"), Visão Consolidada e Logotipos (Fase 9)
**Objetivo:** Permitir que o gestor cadastre e gerencie múltiplos CNPJs/Empresas (Matriz, Filiais ou empresas de diferentes segmentos), possibilitando visualizar o fluxo financeiro de forma individual ou consolidada em todo o sistema.

### Requisitos Estratégicos:
* **Multi-CNPJ:**
  * Cadastro completo de cada empresa: Razão Social, Nome Fantasia, CNPJ (com validação matemática), IE, IM, Endereço completo (ViaCEP), Telefone, WhatsApp, E-mail e cor de identificação visual.
  * Upload de Logotipo individual por empresa (PNG, JPG, WebP, SVG) para impressão de recibos com identidade visual própria.
* **Visão Consolidada vs. Individual (Seletor Global no Header):**
  * Seletor de empresa no topo do sistema: permite alternar para uma empresa específica ou para `🌐 Todas as Empresas (Visão Consolidada)`.
  * Dashboard, Gráficos e Contas adaptam-se instantaneamente ao filtro selecionado.
* **Vínculo por Lançamento:**
  * Cada conta a pagar/receber registra qual empresa do grupo é responsável (`company_id`).
  * Na listagem, tags visuais identificam rapidamente a empresa da conta.
* **Controle de Acesso e Permissões por Usuário (RBAC):**
  * `Master` e `Admin`: têm acesso irrestrito a todas as empresas do grupo e à visão consolidada.
  * `User` (Operacional): pode ter seu acesso restrito apenas às empresas autorizadas pelo administrador. Usuários sem permissão não visualizam contas, relatórios nem o CNPJ da empresa bloqueada.

---

## 🔐 3. Licenciamento, Chave de Ativação e Trava por Tempo de Uso (Fase 10)
**Objetivo:** Mecanismo de liberação e controle de licença de uso do software (SaaS / Desktop / On-Premise), com bloqueio automático após o vencimento do prazo acordado.

### Requisitos:
* **Chave Criptografada (License Key / Token):**
  * Contém payload assinado criptograficamente (HMAC / AES) com:
    * ID do Cliente / CNPJ
    * Data de Expiração da Licença (ex: `validUntil: '2026-12-31'`)
    * Módulos habilitados
* **Comportamento do Sistema:**
  * **Alerta Prévio:** Quando faltarem X dias para vencer (ex: 5 dias antes), exibe um banner no topo avisando: *"Sua licença expira em X dias. Entre em contato para renovar."*
  * **Ao Expirar (Bloqueio):** Bloqueia as ações de escrita (não permite criar novos lançamentos nem exportações), redirecionando para a tela **"Liberação do Sistema"**.
* **Tela de Liberação do Sistema:**
  * Campo para o administrador colar a nova chave de ativação fornecida pelo desenvolvedor/suporte.
  * Validação instantânea da chave e desbloqueio imediato do sistema sem perda de dados.

---

## 🧱 4. Modularização das Telas Restantes (Fase 11)
**Objetivo:** Concluir a decomposição arquitetural das telas que ainda possuem mais de 500 linhas, garantindo manutenibilidade e escalabilidade futura:
* `ContactsView.tsx` e `ContactDrawer.tsx` -> Submódulos em `src/components/contacts/`
* `SettingsView.tsx` -> Submódulos em `src/components/settings/`
* `ReportsView.tsx` -> Submódulos em `src/components/reports/`
* `InstallmentManagerModal.tsx` -> Submódulos em `src/components/installment-manager/`

---

*Atualizado em 23/11/2026 para alinhamento com o Plano Mestre de Execução e Arquitetura Ponytail.*
