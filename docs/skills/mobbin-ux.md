# Skill: Mobbin UX, Redesign Seguro & Plain Writing

* **Origem:** [mobbin/skills](https://github.com/mobbin/skills)
* **Status no Projeto:** Cópia canônica de referência adaptada ao FluxoClaro.

---

## 🎯 Objetivo da Skill
Orientar como pesquisar referências de produtos reais consolidados no mercado (Fintechs, ERPs, Bancos digitais) e garantir que redesenhos mantenham **paridade funcional estrita** e **comunicação textual direta**.

---

## 🛡️ As 3 Regras de Ouro do Redesign Seguro (`redesign-screen`)

1. **Paridade Funcional Obrigatória:**
   * Jamais remova um campo, filtro, atalho de teclado ou botão existente ao redesenhar uma tela.
   * Se um recurso for movido de lugar (ex: de um painel fixo para uma gaveta com abas), ele deve continuar acessível com no máximo o mesmo número de cliques.
2. **Separação entre Estrutura e Cosmética:**
   * Primeiro garanta que o fluxo de dados, validações e persistência funcionam.
   * Só depois aplique polimento visual e transições.
3. **Auditoria de Regras Ocultas:**
   * Verificar se a tela possui atalhos de teclado (ex: `Esc` para fechar gavetas, `Enter` para salvar), estados de foco e comportamento no celular.

---

## ✍️ Microcopy Direto e Sem Ruído (`plain-writing`)

Em sistemas financeiros de uso diário, o usuário precisa de rapidez e certeza.

| ❌ Evitar (Prolixo / Genérico de IA) | ✅ Adotar (Direto / Padrão ERP e Fintech) |
| :--- | :--- |
| "Por favor, clique aqui para registrar os dados no sistema" | **Gravar Cadastro** |
| "Deseja realmente abandonar esta operação agora?" | **Abandonar (Cancelar)** |
| "Atenção: verifique se o número de inscrição estadual ou nacional está correto" | **Informe os 14 dígitos do CNPJ** |
| "Sucesso: os dados foram inseridos com êxito na base local" | **Cadastro salvo com sucesso** |
| "Esta ação causará a exclusão permanente do item do banco" | **Eliminar contato? (Confirmar / Não)** |

---

## 🏗️ Padrões de Alta Usabilidade (`best-practices`)

### 1. Zonas de Ações Destrutivas
* Botões de ação destrutiva (ex: `Excluir`, `Eliminar`) devem ficar **isolados visualmente** (ex: alinhados à esquerda no rodapé), longe do botão primário de salvar.
* Devem usar cor de atenção (vermelho suave) e exigir **confirmação em duas etapas** (inline ou diálogo de confirmação), impedindo exclusões acidentais.

### 2. Ações Primárias Fixas
* Em formulários longos ou gavetas, os botões `Gravar` e `Abandonar` devem ficar fixados no rodapé, sempre visíveis independente da rolagem do formulário.

### 3. Validação Preventiva com Saída Rápida
* Quando o sistema detectar um dado duplicado ou inválido (ex: CNPJ duplicado), nunca apenas bloquear o usuário: ofereça um caminho de resolução imediato (ex: botão `[Editar existente]`).
