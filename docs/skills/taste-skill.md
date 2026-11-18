# Skill: Design Taste Frontend (Anti-Slop UI)

* **Origem:** [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)
* **Status no Projeto:** Cópia canônica de referência adaptada ao FluxoClaro.

---

## 🎯 Objetivo da Skill
Eliminar o aspecto genérico de "template feito por IA" (*AI-slop*), assegurando que o sistema tenha aparência, acabamento e ergonomia de um software bancário/fintech profissional.

---

## 📐 Princípios Fundamentais

### 1. Auditoria Antes da Ação (Audit Before Coding)
* Nunca altere uma tela sem antes listar:
  * Qual é o objetivo principal da tela?
  * Quais são as restrições de negócio e os dados obrigatórios?
  * O que já funciona e deve ser estritamente preservado?
* Se for um redesign, apresente primeiro a proposta de layout antes de alterar rotas, rótulos ou lógica de formulário.

### 2. Optical Alignment & Tipografia Numérica
* **`tabular-nums` obrigatório:** Todos os valores monetários (`R$ 1.234,56`), datas (`18/11/2026`), documentos (`CPF/CNPJ`) e contadores devem usar numerais tabulares para garantir que colunas de tabelas e extratos fiquem matematicamente alinhadas verticalmente.
* **Hierarquia de Casas Decimais:** Diferenciar visualmente o valor inteiro dos centavos quando necessário para facilitar escaneamento de grandes quantias.

### 3. Paleta Semântica e Acessibilidade (WCAG AA/AAA)
* Fim de Tailwind desordenado com 8 linhas de cores arbitrárias.
* **Tokens Semânticos Padronizados:**
  * Verde (Receitas / Liquidado): Tom esmeralda/teal de alto contraste, legível em fundos claros e escuros.
  * Vermelho (Despesas / Vencido): Tom rubi/rose controlado, sem saturação radioativa que canse a vista.
  * Âmbar (Pendente / Atenção): Alerta moderado com contraste suficiente para leitura de texto.
  * Slate (Neutros): Fundo e bordas neutras calibradas para modo escuro suave (`#0F172A` e `#111827`).
* Todos os estados interativos devem ter foco visível acessível (`focus-visible:ring-2 focus-visible:ring-teal-500`).

### 4. Estados Vazios e Carregamento Suave
* Nenhuma lista deve exibir apenas uma tela em branco.
* Deve sempre exibir um **Empty State ilustrado com mensagem amigável** e um botão de ação primária (ex: `+ Novo Lançamento` ou `+ Cadastrar Primeiro Contato`).
* Em carregamentos, usar *skeletons* com shimmer suave na mesma proporção dos dados finais.

### 5. Densidade e Espaçamento Consciente
* Interfaces financeiras operacionais exigem boa densidade de dados (evitar paddings gigantescos que forçam rolagem excessiva), mas com espaçamento suficiente para cliques seguros no celular (área de toque mínima de 40x40px).
