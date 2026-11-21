# 📐 Workflow Guiado por Especificação (Matt Pocock / Attekita Dev)

> Baseado no pacote [mattpocock/skills](https://github.com/mattpocock/skills) e no workflow de desenvolvimento assistido por IA promovido pela desenvolvedora Attekita Dev.

---

## 🎯 Objetivo Central
Eliminar a ambiguidade antes de implementar qualquer linha de código. Agentes de IA funcionam com precisão cirúrgica quando recebem especificações fechadas, limites claros e critérios de aceite mensuráveis.

---

## 🔄 O Ciclo Completo (Trabalho Grande)

```text
Entrevista & Decisões (grill) → Especificação Técnica (to-spec) → Fatiamento em Tickets (to-tickets) → Implementação com TDD (implement) → Revisão de Código (code-review) → Entrega & Deploy
```

### 1. `grill` (Este Chat — Arquiteto):
- Conversar e fechar decisões com o Product Owner / Desenvolvedor.
- Tirar dúvidas de negócio reais (ex: "NF de venda usa `<dest>` ou `<emit>`?", "Como tratar vencimento anterior à emissão?").
- Registrar decisões que não podem ser revertidas facilmente.

### 2. `to-spec` & Fatiamento Vertical:
- Definir as fatias verticais que atravessam o sistema (do banco à interface), e não fatias horizontais quebradas (como "fazer só o banco" sem poder testar na tela).
- Cada fatia deve ser testável e verificável isoladamente.

### 3. `implement` com TDD (Outro Chat — Executor):
- Escrever o teste automatizado no Vitest que valida a regra de negócio.
- Implementar a menor alteração suficiente para o teste passar.
- Executar `npm run lint` e `npm test` para garantir zero regressões.

### 4. `code-review` & Verificação:
- Revisar o diff final commitado.
- Confirmar que nenhum requisito de usabilidade foi esquecido e nenhuma complexidade acidental foi adicionada.

---

## 🛡️ A Regra Anti-Caos: Respeitar a Sequência das Fases
Ficar pulando de fase ou mudando de assunto a cada meia hora é o que causa:
- Código pela metade e telas quebradas.
- Perda de foco e esquecimento de regras de negócio.
- Débito técnico acumulado.

**Regra:** Conclua uma fase do plano mestre (`docs/plano-execucao-refatoracao.md`), rode os testes, suba para o repositório, e só então inicie a próxima fase planejada.
