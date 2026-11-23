# Guia de Design System & Motion — FluxoClaro

Este guia define a direção visual, a paleta de cores, os tokens tipográficos e os princípios de microinterações adotados no **FluxoClaro**, inspirados na **`taste-skill`**, nas **`mobbin/skills`** e na **`motion-design-skill`**.

---

## 🎨 1. Paleta de Cores e Tokens Visuais

O sistema utiliza a família **Slate** para neutros e tons semânticos de alta legibilidade bancária.

### Cores Neutras (Modo Claro e Modo Escuro)
* **Background da Página:**
  * Modo Claro: `#F8FAFC` (`slate-50`)
  * Modo Escuro: `#0A0F1D` / `#0F172A` (`slate-950` / `slate-900`)
* **Cards e Superfícies Elevadas:**
  * Modo Claro: `#FFFFFF` com borda `border-slate-200`
  * Modo Escuro: `#111827` / `#0F172A` com borda `border-slate-800`
* **Textos:**
  * Títulos e Destaques: `slate-900` (claro) / `slate-100` ou `white` (escuro)
  * Corpo e Subtítulos: `slate-600` (claro) / `slate-400` (escuro)

### Cores Semânticas de Negócio
* **Teal / Esmeralda (Identidade & Receitas):**
  * Botões de ação primária: `bg-teal-700 hover:bg-teal-800 text-white` (obrigatório em todos os botões de Salvar/Gravar de todos os drawers e modais).
  * Valores e badges de recebimento: `text-emerald-700 dark:text-emerald-400`
* **Neutro / Slate (Ações de Consulta e Secundárias):**
  * Botões de cancelar/fechar: `border border-slate-200 dark:border-slate-700 text-slate-700 hover:bg-slate-50`
  * Botões utilitários de consulta (`[ Consultar ]` CNPJ/CEP): `bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900` ou `variant="secondary"` padronizado.
  * Segmented controls (pills ativas): padrão unificado em todo o sistema.
* **Rose / Vermelho (Despesas & Vencidos):**
  * Valores e badges de despesas: `text-rose-700 dark:text-rose-400`
  * Alertas de vencimento: `text-red-600 dark:text-red-400`
* **Âmbar (Pendências & Avisos):**
  * Contas pendentes a vencer: `text-amber-600 dark:text-amber-400`
  * Banners de aviso: `bg-amber-50 dark:bg-amber-950/40 border-amber-200`

---

## 🔢 2. Tipografia e Numerais Tabulares (`tabular-nums`)

Em software financeiro, o alinhamento visual de colunas é crítico:
* Sempre adicione a classe `font-mono-tabular` em:
  * Valores em BRL: `R$ 1.250,00`
  * Datas de vencimento: `18/11/2026`
  * Contadores de parcelas: `1/12`
  * Documentos e telefones: `12.345.678/0001-90`, `(11) 98765-4321`

---

## 🗄️ 3. Quando Usar Gaveta Lateral (*Drawer*) vs. Modal Central

Para manter a consistência da experiência do usuário:

| Padrão | Quando Usar | Exemplo no Sistema |
| :--- | :--- | :--- |
| **Gaveta Lateral (*Slide-over Drawer*)** | Formulários com muitas informações, abas temáticas (*Geral*, *Endereço*), ou cadastros complexos onde é bom manter o contexto da tela ao fundo. | **Cadastro de Pessoas (`ContactDrawer`)**, **Cadastro de Empresas (`CompaniesSettingsTab`)**, **Avisos Completos (`AlertsDrawer`)** |
| **Modal Centralizado** | Ações focadas e curtas, confirmações rápidas ou consultas específicas com 1 a 3 decisões. | **Baixa de Conta (SettleModal)**, **Recibo / Ficha Financeira**, **Importar XML/Excel** |
| **Diálogo de Confirmação (*ConfirmDialog*)** | Ações destrutivas com aviso em vermelho e botões claros de *Confirmar* e *Cancelar*. | **Excluir Conta**, **Excluir Cadastro** |

### 🔘 Padronização Rígida de Botões nos Formulários e Gavetas (Design System):
Para evitar discrepâncias visuais entre telas diferentes:
1. **Botão de Gravar / Salvar:** SEMPRE o botão verde Teal primário (`bg-teal-700 hover:bg-teal-800 text-white font-medium min-h-[42px] rounded-xl`) em TODOS os formulários e gavetas.
2. **Botão de Cancelar / Abandonar:** SEMPRE o botão outline/secundário neutro (`border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 min-h-[42px] rounded-xl`).
3. **Botões de Consulta Rápida (`[ Consultar ]` CNPJ/CEP):** Devem possuir o mesmo padrão visual idêntico em todas as telas (estilo pílula consistente ao lado do input com loading animado).
4. **Controles Segmentados (Ex: PF/PJ, Participação Cliente/Fornecedor/Ambos):** O estado selecionado/ativo deve ter a mesma cor em todas as telas, sem usar preto em um lugar e verde em outro.

---

## 🎬 4. Princípios de Motion (Biblioteca `motion`)

1. **Rapidez Inegociável:** Nenhuma transição pode durar mais de **250ms**.
2. **Entrada da Gaveta Lateral:** Desliza suavemente a partir do lado direito (`animate-in slide-in-from-right duration-300`).
3. **Fade do Backdrop:** Escurecimento sutil do fundo em 200ms (`fade-in duration-200`).
4. **Respeito ao Usuário:** Se `prefers-reduced-motion` estiver ativo no sistema operacional, reduza a transição para 0ms.
