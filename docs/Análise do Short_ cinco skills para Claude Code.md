# Análise do Short: cinco skills para Claude Code

## O que o Short apresenta

O Short reúne cinco ferramentas chamadas de “skills” para tarefas diferentes em desenvolvimento: mapear relações de um repositório, revisar prosa, criar novas skills, ensinar a arquitetura do código e produzir diagramas visuais. Elas não são cinco partes de uma única ferramenta: vêm de autores e projetos distintos, e algumas são plugins ou CLIs além das instruções para o agente. [1]

## As cinco ferramentas

### 1. Graphify: mapa consultável do codebase

[Graphify](https://github.com/Graphify-Labs/graphify) cria um grafo de conhecimento do projeto, com relações entre módulos, funções, documentos e outros elementos. No fim, gera `graph.html`, `GRAPH_REPORT.md` e `graph.json`; depois, o agente pode consultar caminhos e conexões em vez de reler tudo. O código é analisado localmente por AST. A análise semântica de documentos, imagens ou outros materiais pode chamar o modelo do agente ou uma API configurada. [2] [3]

O README atual do repositório indica Python 3.11.5–3.14 e recomenda instalar o CLI `graphifyy` com `uv` ou `pipx`. A página Quickstart menciona Python 3.10+, portanto há uma diferença entre a faixa de versões anunciada nas duas páginas. Para evitar incompatibilidade, prefira atender ao requisito mais restritivo do README atual:

```bash
uv tool install graphifyy
graphify install
```

No repositório do projeto, rode a skill no agente com:

```text
/graphify .
```

A instalação padrão registra a skill no perfil do agente. Para instalar no próprio repositório, o README também documenta `graphify install --project`. Após alterações grandes, atualize o grafo e verifique o relatório gerado; não trate relações marcadas como inferidas como fatos extraídos diretamente do código. [2] [3]

**Quando usar:** entrar num repositório desconhecido, localizar chamadas de um componente compartilhado ou rastrear o caminho entre uma rota, serviço e armazenamento.

### 2. Humanizer: revisão de prosa

[Humanizer](https://github.com/blader/humanizer) é uma skill comunitária que procura padrões comuns de texto genérico de IA e propõe reescritas mais naturais. Não é uma ferramenta para escrever código. Pode ser invocada com `/humanizer` ou apontada para um arquivo de texto. O projeto diz explicitamente que não tenta contornar detectores de texto gerado por IA. [4]

No Claude Code 2.1.142 ou mais recente, o repositório documenta:

```text
/plugin marketplace add blader/humanizer
/plugin install humanizer@humanizer
```

Para versões mais antigas do Claude Code, o repositório recomenda instalar a skill pelo CLI:

```bash
npx skills add blader/humanizer --global --agent claude-code
```

Ao revisar prosa em português, confira manualmente se a edição manteve sentido, tom, termos técnicos e variações regionais. É possível fornecer uma amostra da própria escrita para orientar a voz. [4]

**Quando usar:** revisar texto de uma landing page, publicação, documentação explicativa ou mensagem dirigida a clientes. Evite usar automaticamente em contratos, documentação normativa ou texto em que cada termo tenha de permanecer literal.

### 3. Skill Creator: criar e testar skills

A Anthropic mantém a skill [Skill Creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator) e um plugin correspondente no [marketplace oficial do Claude Code](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/skill-creator). Ela ajuda a especificar uma habilidade, criar ou melhorar `SKILL.md` e avaliar o comportamento com prompts de teste. O fluxo completo prevê iteração a partir dos resultados; “Skill is valid!” confirma uma validação estrutural, não prova que a skill atende bem a todos os casos. [5] [6]

No Claude Code, a instalação pelo marketplace é:

```text
/plugin install skill-creator@claude-plugins-official
```

Depois, descreva a tarefa recorrente que deseja transformar em skill e defina quando ela deve ser acionada, qual saída espera e quais casos-limite devem ser testados. O repositório oficial trata avaliação e melhoria iterativa como parte do processo. [5] [6]

**Quando usar:** procedimentos repetidos e com entradas/saídas claras, como classificar documentos, aplicar uma revisão de conteúdo ou gerar um relatório com estrutura fixa. Uma instrução vaga não vira uma skill confiável sem exemplos e testes.

### 4. Codebase to Course: curso interativo sobre o código

[Codebase to Course](https://github.com/zarazhangrui/codebase-to-course) transforma um repositório em um curso interativo de página única HTML. O material pode incluir módulos navegáveis, visualizações, quizzes e trechos reais de código acompanhados de explicações em linguagem simples. O resultado é um arquivo HTML autocontido, pensado para aprendizagem e onboarding. [7]

O repositório não apresenta um comando universal de instalação como os outros itens. Para Claude Code, as instruções dizem para copiar a pasta `codebase-to-course` para `~/.claude/skills/`, abrir o projeto e pedir, por exemplo:

```text
Turn this codebase into an interactive course.
```

**Quando usar:** explicar a arquitetura a uma pessoa nova na equipe ou criar um material de estudo do próprio produto. Revise afirmações e exemplos contra o código; um curso gerado pode simplificar demais fluxos complexos ou não refletir mudanças recentes.

### 5. Diagram Design: diagramas editoriais em HTML/SVG

[Diagram Design](https://github.com/cathrynlavery/diagram-design) gera diagramas de arquitetura, fluxos, sequências e outros formatos como um arquivo HTML autocontido com SVG inline. O repositório informa 45 tipos de diagrama e opções de exportação. [8]

Para o Claude Code:

```text
/plugin marketplace add cathrynlavery/diagram-design
/plugin install diagram-design@diagram-design
```

Ou, em um agente que usa o formato Agent Skills:

```bash
npx skills add cathrynlavery/diagram-design
```

O resultado pode ser visualmente mais adequado para publicação, mas não funciona como uma fonte textual simples para revisar em diffs. O próprio projeto recomenda Mermaid para diagramas de documentação que mudam frequentemente com o código. Revise também o arquivo de privacidade do projeto e instale apenas a partir do repositório oficial. [8]

**Quando usar:** produzir uma visualização para apresentação, explicação ou documentação publicada. Para diagramas técnicos que precisam ficar versionados e atualizados junto com o código, prefira Mermaid/PlantUML ou outra fonte editável em texto.

## Um fluxo útil para aplicar no projeto

1. **Entenda antes de alterar.** Abra o repositório, identifique instruções e estrutura. Use Graphify se a base for grande ou desconhecida; gere o grafo e leia o relatório antes de pedir uma mudança.
2. **Documente o que precisa ser explicado.** Use Diagram Design para uma figura de apresentação ou Codebase to Course para onboarding. Confira os caminhos e exemplos no código real.
3. **Implemente e valide.** Skill Creator não substitui testes do software: ele cria instruções de agente e deve ser avaliado separadamente com casos reais. Mantenha testes, lint e revisão humana para o código do projeto.
4. **Revise a prosa quando houver texto para usuários.** Use Humanizer como uma sugestão de edição, não como árbitro de voz ou veracidade.
5. **Não instale tudo por padrão.** Escolha a ferramenta que resolve o gargalo atual. Antes de instalar plugins de terceiros, confira autor, repositório, permissões e arquivos que a skill cria ou modifica. O marketplace oficial da Anthropic também recomenda confiar no plugin antes de instalar, atualizar ou usar. [6]

As cinco ferramentas tratam de problemas diferentes. **Graphify** ajuda a entender conexões do código; **Diagram Design** cria uma figura; **Codebase to Course** ensina o sistema; **Skill Creator** ajuda a padronizar uma tarefa recorrente; **Humanizer** revisa prosa. Nenhuma delas substitui revisão técnica, testes ou validação humana.

## Referências

[1]: https://www.youtube.com/watch?v=or3_n8vYQtw "Short analisado"
[2]: https://github.com/Graphify-Labs/graphify "Repositório oficial Graphify"
[3]: https://docs.graphify.com/quickstart "Quickstart oficial Graphify"
[4]: https://github.com/blader/humanizer "Repositório Humanizer"
[5]: https://github.com/anthropics/skills/tree/main/skills/skill-creator "Skill Creator mantida pela Anthropic"
[6]: https://github.com/anthropics/claude-plugins-official "Marketplace oficial de plugins do Claude Code"
[7]: https://github.com/zarazhangrui/codebase-to-course "Repositório Codebase to Course"
[8]: https://github.com/cathrynlavery/diagram-design "Repositório Diagram Design"
