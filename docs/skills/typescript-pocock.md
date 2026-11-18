# Skill: TypeScript Estrito & Contratos de Dados (Matt Pocock Style)

* **Origem:** [mattpocock/skills](https://github.com/mattpocock/skills)
* **Status no Projeto:** Cópia canônica de referência adaptada ao FluxoClaro.

---

## 🎯 Objetivo da Skill
Garantir que a base de código do FluxoClaro tenha **zero `any` implícito ou solto**, com tipos explícitos para todas as entidades financeiras, contratos de API e retornos de funções.

---

## 📐 Diretrizes Técnicas

### 1. Tipos Canônicos Centralizados (`src/types.ts`)
* Qualquer entidade que trafega entre cliente e servidor deve ter sua interface ou tipo registrado no `src/types.ts`.
* Exemplos: `Transaction`, `Contact`, `Category`, `User`, `PersonType`, `ContactKind`.
* Nunca crie tipos paralelos ou cópias locais com propriedades ligeiramente diferentes. Se precisar de uma variação (ex: dados de formulário), use utilitários do TypeScript como `Omit`, `Pick` ou `Partial`:
  ```ts
  export type CreateTransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;
  ```

### 2. Zero `any` Tolerado
* Não use `any` como atalho para calar o compilador.
* Se um dado for desconhecido (ex: retorno bruto de XML ou resposta da API do governo), use `unknown` e refine o tipo com Type Guards ou checagens explícitas:
  ```ts
  function isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
  }
  ```

### 3. Imutabilidade e Previsibilidade
* Prefira tipos discriminados (`discriminated unions`) para representar estados finitos:
  ```ts
  export type TransactionStatus = 'pending' | 'settled';
  export type PersonType = 'PF' | 'PJ';
  export type ContactKind = 'customer' | 'supplier' | 'both';
  ```
* Evite booleanos múltiplos conflitantes (como `isCustomer` e `isSupplier` soltos que poderiam permitir estados impossíveis).

### 4. Verificação Estrita no Build
* O comando `npm run lint` (`tsc --noEmit`) deve passar com **zero erros** antes de qualquer entrega ou alteração no repositório.
