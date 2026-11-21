# Índice de Skills de Referência — Projeto FluxoClaro

Este diretório contém a cópia local e canônica das **skills e princípios de engenharia** adotados no projeto.

Ter essas skills salvas no repositório garante:
1. **Contexto Permanente:** Qualquer agente de IA ou desenvolvedor humano pode consultar as regras exatas a qualquer momento, sem depender de ferramentas de terceiros ou conexão externa.
2. **Zero Poluição de Dependências:** O conhecimento está versionado em Markdown, sem necessidade de pacotes extras no `package.json`.
3. **Rastreabilidade e Atualização:** Cada arquivo indica a URL oficial do repositório de origem para você consultar periodicamente se houve melhorias ou novas versões.

---

## 📚 Mapa das Skills Salvas

| Arquivo Local | Skill / Referência Original | Repositório Oficial | Papel no FluxoClaro |
| :--- | :--- | :--- | :--- |
| [`taste-skill.md`](./taste-skill.md) | **Taste Skill** (Leonxlnx) | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | Direção visual anti-slop, design tokens, optical alignment para finanças e auditoria de UI. |
| [`motion-design.md`](./motion-design.md) | **Motion Design Skill** (LottieFiles) | [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) | Princípios de movimento com propósito (150–250ms), microinterações e acessibilidade. |
| [`mobbin-ux.md`](./mobbin-ux.md) | **Mobbin Skills** (Mobbin) | [mobbin/skills](https://github.com/mobbin/skills) | Redesign seguro sem perda de funções, microcopy direto (*plain-writing*) e padrões de fintechs. |
| [`ub-mode-tdd.md`](./ub-mode-tdd.md) | **UB-Mode / Clean Code** (Uncle Bob) | [unclebob/ub-mode](https://github.com/unclebob/ub-mode) | TDD estrito (Red-Green-Refactor), regras financeiras puras em centavos e qualidade de código. |
| [`typescript-pocock.md`](./typescript-pocock.md) | **TypeScript Skills** (Matt Pocock) | [mattpocock/skills](https://github.com/mattpocock/skills) | TypeScript estrito, zero `any`, contratos de dados fortes e previsibilidade de tipos. |
| [`ponytail-enxuto.md`](./ponytail-enxuto.md) | **Ponytail** (Dietrich Gebert / Akita) | [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | Código enxuto, anti-overengineering, reaproveitamento de componentes e zero bibliotecas supérfluas. |
| [`workflow-especificacao.md`](./workflow-especificacao.md) | **Workflow Guiado por Spec** (Attekita / Pocock) | [mattpocock/skills](https://github.com/mattpocock/skills) | Desenvolvimento guiado por especificação: grill -> to-spec -> tickets verticais -> TDD -> review. |

---

## 🔄 Como Consultar Atualizações no Futuro

Para verificar se os repositórios originais receberam melhorias ou novas diretrizes:

1. **Visitar o repositório oficial** clicando no link da tabela acima.
2. **Revisar o histórico de commits ou releases** recentes do autor.
3. Se houver novos padrões úteis para software financeiro, atualize o arquivo correspondente em `docs/skills/` e replique a melhoria para as diretrizes do projeto em `docs/`.
