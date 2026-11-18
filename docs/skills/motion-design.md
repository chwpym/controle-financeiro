# Skill: Motion Design & Microinterações Úteis

* **Origem:** [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) e [Jakubantalik/transitions.dev](https://github.com/Jakubantalik/transitions.dev)
* **Status no Projeto:** Cópia canônica de referência adaptada ao FluxoClaro.
* **Implementação Técnica:** Utiliza a biblioteca nativa **`motion`** (`^12.23.24`) já instalada no projeto.

---

## 🎯 Objetivo da Skill
Garantir que as animações sirvam exclusivamente para **fornecer feedback tátil, continuidade espacial e clareza de estado**, eliminando efeitos decorativos lentos que atrapalham a agilidade da rotina financeira.

---

## ⏱️ Regras de Tempo e Curvas de Aceleração (Timing & Easing)

| Tipo de Interação | Duração Recomendada | Curva (Easing) | Exemplo no FluxoClaro |
| :--- | :---: | :--- | :--- |
| **Micro-feedback (Clique/Toggle)** | 100ms – 150ms | `ease-out` | Clique de botão, seleção de aba PF/PJ, check de filtro. |
| **Transição de Painéis / Modais** | 200ms – 250ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Deslize da gaveta lateral (*Slide-over Drawer*), abertura de modal. |
| **Expansão de Linhas / Acordeão** | 150ms – 200ms | `ease-in-out` | Detalhes de uma conta, extrato de faturas. |
| **Notificações / Toasts** | 200ms | `ease-out` (entrada) / `ease-in` (saída) | Alerta de conta salva com sucesso. |

> [!WARNING]
> Nenhuma animação no sistema deve durar mais de 300ms. Animações longas geram percepção de lentidão no lançamento de contas e registros bancários.

---

## ♿ Acessibilidade e `prefers-reduced-motion`

O sistema deve sempre respeitar a configuração do sistema operacional do usuário:
* Se `prefers-reduced-motion: reduce` estiver ativo, desativar transformações de deslocamento (slide/translate) e manter apenas um fade rápido e sutil (ou transição instantânea).
* Exemplo com a biblioteca `motion`:
  ```tsx
  import { motion, useReducedMotion } from 'motion/react';
  
  const shouldReduceMotion = useReducedMotion();
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.2 };
  ```

---

## 🧭 O que Animar vs. O que NÃO Animar

### O que ANIMAR (Agrega Valor):
1. **Feedback de Ação Concluída:** Animação discreta ao confirmar pagamento/recebimento de uma conta.
2. **Entrada de Gaveta Lateral e Modais:** Slide suave da direita para a esquerda e fade de backdrop.
3. **Alternância de Abas:** Transição limpa da linha indicadora entre abas (*1. Geral* e *2. Endereço*).
4. **Remoção de Itens da Lista:** Fade out e recolhimento de altura suave da linha excluída para a lista não dar um pulo brusco.

### O que NÃO ANIMAR (Proibido):
* Textos se dividindo letra por letra (*SplitText*).
* Números rolando sem parar em cada recarregamento de página.
* Partículas ou fundos 3D flutuantes.
* Cards do dashboard girando ou fazendo efeitos elásticos exagerados.
