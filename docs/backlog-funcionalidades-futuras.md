# 📋 Backlog de Funcionalidades Futuras & Roadmap Estratégico — FluxoClaro

Este documento consolida os requisitos de negócio, funcionalidades estratégicas e melhorias arquiteturais para as próximas fases do produto, garantindo rastreabilidade e alinhamento entre produto e engenharia.

---

## 🗺️ Visão Geral das Próximas Fases

| Fase | Título | Objetivo Principal | Status |
| :--- | :--- | :--- | :--- |
| **Fase 8** | **Módulo Excel Avançado & Drag-and-Drop** | Upload por arraste nativo, mapeamento flexível e redução de `ExcelImportModal.tsx` de 824 para < 200 linhas | ⏳ Pronta para Início |
| **Fase 9** | **Cadastro da Empresa & Logotipo** | Identificação oficial da empresa (CNPJ, IE, Endereço ViaCEP) e logo nos Recibos PDF | 📋 Planejada |
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

## 🏢 1. Cadastro da Empresa Emitente ("Minha Empresa") (Fase 9)
**Objetivo:** Permitir que o gestor configure os dados completos da sua empresa para emissão oficial de recibos em PDF, orçamentos e relatórios gerenciais.

### Campos Necessários:
* **Identificação:**
  * Razão Social
  * Nome Fantasia / Nome Usual
  * CNPJ (com máscara e validação matemática de dígitos verificadores)
  * Inscrição Estadual (IE)
  * Inscrição Municipal (IM)
* **Localização e Endereço:**
  * CEP (com busca automática por ViaCEP)
  * Logradouro, Número, Complemento, Bairro, Cidade e UF
* **Contatos Oficiais:**
  * Telefone Comercial
  * WhatsApp de Contato
  * E-mail Financeiro / Cobrança
* **Dados Contábeis (Opcionais):**
  * Nome do Contador / CRC Contador

---

## 🖼️ 2. Upload do Logotipo da Empresa (Fase 9)
**Objetivo:** Personalizar a identidade visual do sistema e dos documentos emitidos para os clientes.

### Requisitos:
* Campo de upload de imagem (formatos suportados: PNG, JPG, WebP, SVG).
* Pré-visualização em tempo real (crop/ajuste básico).
* Armazenamento seguro no banco de dados SQLite (base64 ou blob em tabela de configurações do tenant/sistema).
* **Renderização Dinâmica:** Inserção automática do logo no cabeçalho do `TransactionDetailModal` / `ReceiptPDF` ao emitir recibos com 1 clique.

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
