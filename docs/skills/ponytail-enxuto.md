# 🪓 Ponytail: Princípio do Código Enxuto (Anti-Overengineering)

> Baseado no repositório oficial [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) e nas práticas de engenharia pragmática recomendadas por Attekita Dev e Fábio Akita.

---

## 🎯 Objetivo Central
Evitar que agentes de IA e desenvolvedores criem soluções maiores do que a tarefa exige. O Ponytail estabelece uma postura pragmática: inspecionar o que já existe, reaproveitar código e recursos nativos e **só adicionar abstrações, dependências ou camadas quando forem estritamente necessárias**.

> [!IMPORTANT]
> **"Não escrever menos a qualquer custo"**: Reduzir código não significa apagar validação, segurança, acessibilidade, testes ou o comportamento solicitado. O objetivo é eliminar **complexidade acidental**, não os requisitos do produto.

---

## ⚙️ Modos de Operação

| Modo | Foco | Quando Usar |
| :--- | :--- | :--- |
| **`lite`** | **Design & UI** | Tarefas visuais, formulários, componentes de tela. Preserva todos os detalhes visuais, acessibilidade, breakpoints e animações, focando apenas em não criar bibliotecas desnecessárias. |
| **`full`** (Padrão) | **Lógica & Arquitetura** | Tarefas de regras de negócio, refatorações, cálculo financeiro e rotas. Exige reaproveitar funções existentes antes de inventar novas. |
| **`ultra`** | **Limpeza & Auditoria** | Tarefas de remoção de débito técnico, poda de código morto ou auditoria de complexidade. |

---

## 📋 Regras de Ouro no FluxoClaro

1. **Inspecione Antes de Criar:** Antes de criar um componente ou função nova, procure em `src/components/common/`, `src/utils/format.ts` ou nos componentes existentes se já não existe algo pronto.
2. **Sem Dependências Desnecessárias:** Use os recursos nativos do navegador, do React e do Tailwind CSS antes de cogitar adicionar um pacote novo no `package.json`.
3. **Fatias Verticais Demonstráveis:** Toda mudança deve funcionar de ponta a ponta e ser comprovada com `npm run lint` e `npm test` verdes.
4. **Respeite o Design System:** Conforme o `docs/guia-design-system-e-motion.md`, preserve a paleta Slate, fontes mono-tabulares para valores monetários e metas de toque mínimas de 44px.
