# 📋 Backlog de Funcionalidades Futuras — FluxoClaro

Este documento consolida os requisitos de negócio e funcionalidades estratégicas solicitadas para as próximas fases do produto, garantindo que nada se perca entre as sessões.

---

## 🏢 1. Cadastro da Empresa Emitente ("Minha Empresa")
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

## 🖼️ 2. Upload do Logotipo da Empresa
**Objetivo:** Personalizar a identidade visual do sistema e dos documentos emitidos para os clientes.

### Requisitos:
* Campo de upload de imagem (formatos suportados: PNG, JPG, WebP, SVG).
* Pré-visualização em tempo real (crop/ajuste básico).
* Armazenamento seguro no banco de dados SQLite (base64 ou blob em tabela de configurações do tenant/sistema).
* **Renderização Dinâmica:** Inserção automática do logo no cabeçalho do `TransactionDetailModal` / `ReceiptPDF` ao emitir recibos com 1 clique.

---

## 🔐 3. Licenciamento, Chave de Ativação e Trava por Tempo de Uso
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

*Documento registrado em 18/11/2026 como referência de produto.*
