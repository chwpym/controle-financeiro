# Skill: UB-Mode (Uncle Bob TDD & Clean Code)

* **Origem:** [unclebob/ub-mode](https://github.com/unclebob/ub-mode)
* **Status no Projeto:** Cópia canônica de referência adaptada ao FluxoClaro.

---

## 🎯 Objetivo da Skill
Assegurar que nenhuma regra de cálculo financeiro, parcelamento ou integridade de dados seja implementada sem testes automatizados determinísticos.

---

## 🔁 O Ciclo R-G-R (Red - Green - Refactor)

1. **🔴 Red (Escreva o teste que falha):**
   * Antes de codificar uma função de cálculo ou validação, escreva o teste unitário descrevendo o comportamento esperado.
   * Rode o teste e certifique-se de que ele falha pelo motivo correto.
2. **🟢 Green (Faça o teste passar da forma mais simples):**
   * Escreva o código mínimo estritamente necessário para o teste passar.
3. **🔵 Refactor (Limpe a estrutura sem quebrar os testes):**
   * Remova duplicações, extraia funções auxiliares e melhore os nomes das variáveis com a segurança de que o teste garante a corretude.

---

## 💰 Regras Inquebráveis do Domínio Financeiro

### 1. Representação Exclusiva em Centavos Inteiros
* **Nunca armazene valores monetários como números decimais de ponto flutuante (`10.50`).**
* No SQLite e nas interfaces TypeScript, todo valor em dinheiro é um número inteiro de centavos:
  * R$ 10,50 = `1050`
  * R$ 0,01 = `1`
  * R$ 1.000,00 = `100000`
* Funções puras em `src/utils/format.ts` cuidam da conversão:
  * `parseBRLToCents("10,50")` -> `1050`
  * `formatBRL(1050)` -> `"R$ 10,50"`

### 2. Divisão Exata de Parcelas (O Problema do Centavo)
* Na divisão de parcelas de um carnê ou compra, a soma de todas as parcelas deve ser **estritamente idêntica** ao valor total original.
* O centavo excedente resultante do resto da divisão deve ser atribuído à 1ª parcela:
  * Exemplo: R$ 100,00 (`10000` centavos) em 3x:
    * Parcela 1: `3334` (R$ 33,34)
    * Parcela 2: `3333` (R$ 33,33)
    * Parcela 3: `3333` (R$ 33,33)
    * Total somado = `10000` (R$ 100,00).

### 3. Funções Puras e Sem Efeitos Colaterais
* Funções que calculam multas, juros, descontos, datas de vencimento ou duplicação de lançamentos devem ser **puras**:
  * Mesma entrada -> sempre a mesma saída.
  * Zero dependência de estado global, rede ou variáveis de ambiente mutáveis.
