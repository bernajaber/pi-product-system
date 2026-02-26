# Progress — Implementação do Sistema

> **Para o agente que vai iniciar uma sessão:** Leia APENAS a última entrada. Não leia o arquivo inteiro.
> **Rotina de fim de sessão:** Adicione uma entrada aqui + atualize os checkboxes no TODO.md + git commit.
> **Rotação:** quando exceder 8 entradas, mova as mais antigas para PROGRESS-ARCHIVE.md.

---

## Sessão 2026-02-25 (noite cont. 8) — Teste end-to-end #2 + análise + correções

### O que foi feito
- **Teste completo com feature "categorias + datas de vencimento"** — ciclo inteiro funcionou: init → specify → clarify → Gate 1 → plan → Gate 2 → build → self-review → Gate 3 → publish → reset
- Self-review encontrou e corrigiu 3 bugs P1 reais (catInputOpen, XSS, pointer-events)
- App funcional: chips coloridos, date picker, filtro dropdown, destaque vencidos
- CHANGELOG.md criado automaticamente, workflow resetado com sucesso
- **GitHub remote configurado**: `bernajaber/pi-product-system` (privado)
- **Todo tool funciona** — o fix de `_signal` no todos.ts já resolve; agente só estava em sessão velha

### Problemas encontrados e corrigidos
1. **Artefatos em português** — spec e plan saíram em PT. Adicionado aviso ⚠️ LANGUAGE nas skills product-specify e auto-plan
2. **Commit único em vez de atômicos** — agente fez 798 linhas num commit só. Reforçado na build-loop: "each task = one commit"
3. **Não usou /loop self** — reforçado na build-loop como MANDATORY e no AGENTS.md
4. **Não leu skills antes de agir** — tabela do workflow agora diz "Skill to read FIRST"
5. **Não fez PR** — era por falta de remote. Agora tem GitHub remote configurado.

### Próximos passos
- Fazer mais um teste para verificar se as correções de disciplina funcionam
- Ou seguir para Fase 5 (pipeline de release com PR real)

---

## Sessão 2026-02-25 (noite cont. 7) — Fix: mesmos bugs de parâmetros em todos.ts e loop.ts

### O que foi feito
- Corrigido o mesmo bug de parâmetros trocados em mais 2 extensões do mitsupi:
  - `todos.ts` — faltava `_signal` na assinatura do execute → todo tool não funcionava
  - `loop.ts` — faltava `_signal` → signal_loop_success não recebia o context correto
- Criada skill `auto-publish` com fluxo via PR (gh pr create → review → merge → reset)
- São 3 extensões do mitsupi com o mesmo bug: uv.ts (corrigido antes), todos.ts, loop.ts

### ⚠️ Nota
Todas as correções são diretas no npm global. Se rodar `npm update -g mitsupi`, serão sobrescritas. Reportar upstream ao mitsuhiko.

---

## Sessão 2026-02-25 (noite cont. 6) — Reestruturação: AGENTS.md enxuto + skills detalhadas

### O que foi feito
- AGENTS.md reduzido de 7.6KB (230 linhas) para 4.1KB (132 linhas)
- Criada skill `build-loop` — concentra detalhes de /loop self, self-review, failure escalation
- Skill `product-validate` atualizada como auto-suficiente (surf, nohup, Gate 3)
- Arquitetura correta: AGENTS.md = O QUÊ e QUANDO, Skills = COMO

### Decisão tomada
- AGENTS.md só tem regras de protocolo e workflow — nenhum comando específico de ferramenta
- Cada skill é lida sob demanda pelo agente (reduz contexto carregado por default)
- O agente lê "Read skill X" na tabela do workflow e carrega a skill relevante

---

## Sessão 2026-02-25 (noite cont. 5) — Fase 4: Build Loop + Verificação Local

### O que foi feito
- **4.1 Build Loop:** loop.ts já carregado, aliases de modelo configurados (cheap=haiku-4-5, default=sonnet-4-6, heavy=opus-4-6), testado switch_model com alias
- **4.2 Sub-agentes:** já criados na sessão anterior (reviewer, spec-checker, scout) — todos em inglês
- **4.3 Self-Review:** review.ts carregado, REVIEW_GUIDELINES.md pronto, corrigido AGENTS.md (/review-auto não existe no mitsupi — usa /review uncommitted em ciclo)
- **4.4 Verificação Local:**
  - Descoberto bug crítico: bash tool trava com processos em background (`&`). Padrão correto: `nohup ... > /dev/null 2>&1 & disown`
  - surf testado com localhost: `window.new` → `screenshot` → `read` → `window.close` funciona perfeitamente
  - product-validate skill e AGENTS.md atualizados com o padrão correto
  - Interceptor de git push criado — bloqueia push main sem Gate 3

### Decisões tomadas
- `nohup + disown` é obrigatório para servidores — documentado no AGENTS.md
- surf usa `window.new` (não `go`) para criar sessão isolada para verificação
- /review-auto não existe no mitsupi — self-review usa ciclo manual: /review → fix → /review (max 3 ciclos)

### O que falta testar (Fase 4)
- /loop tests em projeto com testes quebrados
- /review uncommitted detectando bugs intencionais
- Gate 3 completo com verificação local via surf
- Essas são verificações de integração — melhor testar no próximo fluxo end-to-end

### Próximos passos
- Rodar novo teste end-to-end completo (com skills refinadas + verificação local) para validar toda a Fase 4
- Ou partir para Fase 5 (pipeline de release) e testar tudo junto no final

---

## Sessão 2026-02-25 (noite cont. 4) — Refinamento: tudo em inglês + skills melhoradas

### O que foi feito
- Todos os artefatos convertidos para inglês (AGENTS.md, skills, review guidelines, sub-agents, progress.md, etc.)
- Regra de idioma adicionada ao AGENTS.md: "artifacts in English, operator communication in Portuguese"
- **Skill auto-plan refinada significativamente:**
  - Template agora exige: file structure, atomic tasks com "Done when" condition
  - Cada task deve mapear para cenários de aceite da spec
  - Cada task deve listar arquivos criados/modificados
- **Skill product-specify refinada:**
  - Agora exige incluir cenários de "empty state" e "error/edge case"
  - Template de Gate 1 com 3 opções explícitas
  - Instrução para atualizar workflow-state.json feature fields
- **Skill product-validate refinada:**
  - Fluxo para quando operador pede ajustes vs "não é isso"
  - Instrução para incrementar iterationCount
- Artefatos do teste anterior limpos (todo-app removido, workflow resetado)

### Decisão tomada
- Todos os documentos internos em inglês para melhor qualidade de output dos modelos
- Comunicação com operador permanece em português brasileiro
- Motivação: modelos produzem specs, planos e código significativamente melhores em inglês

### Próximos passos
1. Testar novamente o fluxo completo com as skills refinadas
2. Se o resultado for satisfatório, partir para Fase 4 (build loop + verification)

---

## Sessão 2026-02-25 (noite cont. 3) — Teste end-to-end: Fases 2 e 3 validadas

### O que foi feito
- Teste completo do fluxo: "quero criar um app de lista de tarefas simples"
- O agente seguiu o workflow inteiro sem intervenção manual:
  - init → leu artefatos → fez perguntas de produto
  - Ctrl+. (answer.ts) funcionou para clarificações
  - product-specify gerou spec com 8+ cenários, classificou reviewDepth como simple
  - Gate 1 via ask tool → operador aprovou
  - auto-plan gerou plano, criou branch feature/todo-app, escolheu HTML/CSS/JS puro
  - Gate 2 via ask tool → operador aprovou
  - Build: gerou app completo (343 linhas HTML/CSS/JS) usando skill frontend-design automaticamente
  - Iniciou servidor local para verificação
  - Travou na verificação local (surf/web-browser) — esperado, é trabalho da Fase 4

### Conquista principal
O sistema de Fases 1-3 está funcional end-to-end. O operador descreveu um produto em linguagem natural e o agente chegou até o build seguindo o protocolo sem intervenção.

### Próximos passos
1. Fase 4: configurar build loop (/loop), self-review (/review), e verificação local (surf/web-browser)
2. Resolver a verificação local travada — pode ser configuração do surf ou calibração do web-browser skill
3. Fase 4 permite chegar ao Gate 3 e completar o ciclo inteiro

### Onde parou
**Fases 0, 1, 2 e 3 concluídas.** Próxima: Fase 4 (build loop + self-review + verificação local).

---

## Sessão 2026-02-25 (noite cont. 2) — Bug crítico: bash tool crashando

### O que foi feito
- **Bug encontrado e corrigido**: o bash tool do Pi crashava com `TypeError: onUpdate is not a function` em TODO comando bash
- **Causa raiz**: `uv.ts` do pacote mitsupi tinha parâmetros na ordem errada na assinatura do `execute`
  - Errado: `execute(id, params, onUpdate, _ctx, signal)` 
  - Correto: `execute(id, params, signal, onUpdate, _ctx)`
- Isso fazia signal, onUpdate e context serem passados nas posições erradas ao bash tool
- **Correção**: editado `/opt/homebrew/lib/node_modules/mitsupi/pi-extensions/uv.ts` diretamente
- Verificado: bash funciona em todos os diretórios (oh-my-pi-plan, pi-product-system, pi-system-test)

### ⚠️ Nota importante
A correção foi feita direto no pacote npm global. Se rodar `pi update` ou `npm update -g mitsupi`, a correção será sobrescrita. Monitorar: se o bug voltar, reaplicar a correção ou reportar upstream ao mitsuhiko.

### Próximos passos
1. Bernardo pode agora testar o fluxo completo: abrir Pi em ~/pi-product-system/ e descrever um produto
2. O agente deve conseguir ler os arquivos de estado e executar comandos bash normalmente
3. Completar Fase 2 (teste dos gates) e Fase 3 (teste das skills com produto real)

### Onde parou
Bug corrigido. Sistema pronto para teste de fluxo completo.

---

## Sessão 2026-02-25 (noite cont.) — Fase 2: Interação Estruturada

### O que foi feito
- Fase 2 era principalmente testes — código já estava pronto da Fase 1
- Teste 1 (ask tool): agente chamou a ferramenta, TUI apareceu com opções clicáveis, navegação por setas funcionou, seleção confirmada ✓
- Teste 2 (answer.ts / Ctrl+.): agente escreveu perguntas em prosa, Ctrl+. abriu TUI com as perguntas extraídas automaticamente em campos de resposta ✓
- Corrigido: `initialIndex` não é opção válida da API do Pi (ignorado silenciosamente, sem impacto)

### Observação
O answer.ts extrai as perguntas em inglês (traduz automaticamente) — comportamento do mitsupi, não é problema. As respostas voltam ao agente normalmente.

### Próximos passos
1. **Fase 3 concluída antecipadamente** — skills já criadas na Fase 1 (product-specify, product-clarify, auto-plan, product-validate)
2. Próxima sessão: testar as skills na prática com um produto real (critério de pronto da Fase 3)
3. Frase-teste: "quero um app de lista de tarefas simples" → verificar se gera spec com cenários + classifica reviewDepth

### Onde parou
**Fase 2 concluída.** Toda a interação estruturada funcionando. Pronto para Fase 3 (testes das skills).

---

## Sessão 2026-02-25 (noite) — Fase 1: Sistema Nervoso Central

### O que foi feito
- Criados 3 artefatos de continuidade: `workflow-state.json`, `feature-list.json`, `progress.md`
- Criado `AGENTS.md` completo com todas as seções: identidade, rotinas de sessão, workflow map, gates, protocolos de falha e escopo
- Criada extensão `workflow-engine.ts` com 4 blocos: bloqueio de push/deploy, injeção de contexto, compaction-aware, comando /workflow-status
- Criada extensão `ask-tool.ts` com single-select + multi-select + opção de resposta livre
- Copiadas 4 extensões do mitsupi: `answer.ts`, `loop.ts`, `review.ts`, `todos.ts`
- Criados 3 agentes: `reviewer.md`, `spec-checker.md`, `scout.md`
- Criadas 4 skills: `product-specify`, `product-clarify`, `auto-plan`, `product-validate`
- Criado `REVIEW_GUIDELINES.md` com regras de produto
- Commit em `~/pi-product-system/` com 20 arquivos

### Decisões tomadas
- `compact()` importado estaticamente (não dinamicamente) — conforme padrão do loop.ts do mitsuhiko
- Skills criadas junto com Fase 1 (antecipando Fase 3) — aproveitamento do contexto
- Extensões copiadas do pacote mitsupi npm (não clonando repo separado — mais simples)

### Problemas encontrados
- `tsx --noEmit` não funciona na versão de Node — verificado via inspeção do loader.ts do Pi; extensões resolvem imports via jiti com virtualModules, então erros de tsc são esperados e não bloqueantes

### Teste crítico — resultado
Pi abre em `~/pi-product-system/` com:
- AGENTS.md carregado como [Context] ✓
- 4 skills do projeto listadas ✓
- ask-tool.ts e workflow-engine.ts carregadas sem erros ✓
- Mitsupi (loop, review, answer, todos) disponível globalmente ✓
- Zero conflitos após remover extensões duplicadas e corrigir YAML ✓

Problemas encontrados e resolvidos durante o teste:
- answer.ts/loop.ts/review.ts/todos.ts copiados para .pi/extensions/ conflitavam com mitsupi global → removidos
- pi-review-loop duplicado em ~/.pi/agent/extensions/ → removido
- YAML das skills com quebra de linha em aspas → corrigido para linha única

### Próximos passos
1. Fase 2 (interação estruturada) — pode ser curta, ask-tool.ts já existe
2. Testar ask tool na prática: abrir Pi em ~/pi-product-system/, pedir ao agente para usar o ask tool com uma pergunta simples
3. Verificar Ctrl+. (answer.ts) para clarificações

### Onde parou
**Fase 1 concluída.** Sistema nervoso funcionando. Pi abre limpo em ~/pi-product-system/.

---

## Sessão 2026-02-25 (tarde) — Fase 0: Instalação do ambiente

### O que foi feito
- Verificações básicas: Node.js v24.1.0, Pi v0.55.0 (via pi-mono local), auth.json configurado, gh autenticado
- Backup do global: `~/.pi/agent-backup-20260225`
- Instalados 8 pacotes Pi (um por um, sem erros): pi-web-access, pi-model-switch, pi-subagents, pi-interactive-shell, pi-interview, pi-review-loop, pi-prompt-template-model, mitsupi
- Instalado surf-cli v2.6.0 (npm global)
- Criado `~/pi-product-system/` com estrutura `.pi/` completa e git inicializado
- Criado `~/pi-system-test/` como sandbox de teste

### Decisões tomadas
- Pi roda via alias `pi=/Users/bernardojaber/Documents/pi-mono/pi-test.sh` (fonte local, não npm global) — sem impacto no sistema
- surf extension Chrome: pendente de configuração manual por Bernardo (não bloqueante para Fase 1)
- Diretório do sistema: `~/pi-product-system/` (conforme WORKFLOW-SPEC.md)

### Problemas encontrados
- Nenhum. Todas as instalações sem erros.

### Próximos passos (próxima sessão)
1. **Bernardo**: configurar extensão Chrome do surf (caminho: `/opt/homebrew/lib/node_modules/surf-cli/dist`) — pode fazer quando quiser, não bloqueia próximas fases
2. Iniciar Fase 1: criar artefatos de continuidade (workflow-state.json, progress.md, feature-list.json)
3. Criar AGENTS.md do sistema (o arquivo mais importante)
4. Criar extensão workflow-engine.ts
5. Instalar extensões do mitsuhiko (answer.ts, loop.ts, review.ts, todos.ts)

### Onde parou
Fase 0 concluída (exceto configuração manual do surf Chrome). Pronto para iniciar Fase 1.

---

## Sessão 2026-02-25 — Planejamento inicial

### O que foi feito
- Analisamos Pi vs oh-my-pi (diferenças de API, gaps de ferramentas)
- Mapeamos os gaps para pacotes instaláveis (nicobailon, mitsuhiko)
- Geramos o plano v5.0 completo adaptado para Pi padrão
- Criamos os 3 documentos: WORKFLOW-SPEC.md, TODO.md, PARA-BERNARDO.md
- Inicializamos o repositório git
- Adicionamos protocolo de segurança (kill switch, backup, instalação sequencial)

### Decisões tomadas
- Plataforma: Pi padrão (não oh-my-pi) — confirmado por Bernardo
- Ask tool: porta direta do oh-my-pi (ctx.ui.select + ctx.ui.input)
- Clarificação: answer.ts (mitsuhiko) para perguntas em prosa natural
- Build loop: loop.ts (mitsuhiko) com /loop self + signal_loop_success
- Compaction: função compact() do Pi (não hints — garantia real)
- Sub-agentes: pi-subagents (nicobailon) para reviewer, scout, spec-checker
- Commit: skill commit do mitsupi (Sprint 1), extensão completa depois

### Estado atual
- Fase 0 do TODO: **não iniciada** (nada instalado ainda)
- Repositório: criado com 2 commits
- Documentação: completa para todas as 10 fases

### Próximos passos (para a próxima sessão)
1. Verificar que `pi` está instalado e funcionando
2. Iniciar Fase 0: backup do global → instalar pacotes um por um com verificação
3. Criar `~/pi-system-test/` como diretório de teste isolado
4. Ao fim: marcar checkboxes da Fase 0 no TODO.md + commit

### Onde parou
Nenhuma implementação iniciada. Toda a sessão foi de planejamento e documentação.

---

## Sessão 2026-02-25 (noite cont. 9) — Performance fix + testes Fase 4

### O que foi feito
- **Fase 4 testes**: /loop tests validado (3 falhas → fix → 7/7), scout subagent testado e funcionando
- **Scout fix**: agents de projeto precisavam de `tools` e `model` no frontmatter YAML
- **Pi global instalado**: `npm install -g @mariozechner/pi-coding-agent` v0.55.1
- **Startup 3x mais rápido**: de 13s (source/tsx) para 3.2s (compilado)
- **Removidos**: alias `pi` no .zshrc, symlink ~/bin/pi, wrapper ~/.pi/agent/bin/pi — tudo apontava pro source

### Problemas encontrados
- pi-subagents funciona mas só com agents que têm `tools`/`model` no frontmatter
- `npx tsx` trava quando já existe outro npx tsx rodando (contention do cache)
- Múltiplas referências ao pi-test.sh causavam confusão (alias, symlink, wrapper)

### Próximos passos
- Fase 4 completa (21/21) — seguir para próxima fase
- Testar interactive_shell overlay no TUI agora que Pi abre rápido

---

## Sessão 2026-02-25 (noite cont. 10) — Teste E2E automatizado + interactive_shell

### O que foi feito
- **interactive_shell funciona**: overlay testado por Bernardo, dispatch+background+sendInput testado programaticamente
- **Ask tool auto-test mode**: `PI_AUTO_TEST=true` auto-aprova gates sem TUI
- **Teste E2E completo automatizado**: counter app criado do zero via `PI_AUTO_TEST=true pi --print`
  - Spec em inglês ✅, Plan em inglês ✅, PR criado ✅, tag v0.3.0 ✅, workflow reset ✅
- **Pi global instalado**: v0.55.1 via npm, startup de 13s → 3.6s
- **Removidos**: alias zshrc, symlink ~/bin/pi — causavam confusão de versão

### Problemas restantes
- CHANGELOG não atualizado automaticamente para v0.3.0
- Commits ainda não atômicos por task (1 commit "feat: counter app" em vez de 1 por task)
- Esses são problemas de disciplina do agente, não de infraestrutura

### Próximos passos
- Reforçar atomic commits e changelog update nas skills
- Seguir para próximas fases do TODO

---

## Sessão 2026-02-25 (noite cont. 11) — Correção de disciplina validada

### O que foi feito
- **Atomic commits**: reforçado na build-loop skill com regra ⚠️ explícita
- **CHANGELOG obrigatório**: reforçado na auto-publish skill como MANDATORY
- **Teste E2E stopwatch**: 5 tasks no plan → 5 commits atômicos, CHANGELOG atualizado, PR #2 merged, tag v0.4.0
- **Resultado**: os dois problemas de disciplina (commits e changelog) estão corrigidos

### Estado atual do pi-product-system
- 4 versões entregues: v0.1.0 (todo), v0.2.0 (categories), v0.3.0 (counter), v0.4.0 (stopwatch)
- 2 PRs merged no GitHub
- CHANGELOG.md atualizado
- Workflow state: idle, pronto pra próxima feature

### Nota sobre timeout
- O --print com workflow completo leva ~5 min, timeout de 300s às vezes não basta
- O build completa mas o publish pode ficar cortado — pode ser completado em chamada separada

---

## Sessão 2026-02-25 (noite cont. 12) — CI pipeline + testes automatizados

### O que foi feito
- **GitHub Actions CI no PR**: `.github/workflows/ci.yml` — valida HTML e roda testes em todo PR
- **GitHub Actions Release na tag**: `.github/workflows/release.yml` — cria GitHub Release com notas do CHANGELOG
- **Auto-plan atualizado**: task final "Write tests" é obrigatório em todo plan
- **Auto-publish atualizado**: Step 3 espera CI passar antes de mergear
- **Teste E2E tip calculator**: 7 tasks no plan, 25 testes escritos, CI passou, Release criado, v0.5.0

### Problema residual
- Atomic commits: tip calculator teve 2 commits em vez de 7 (stopwatch teve 5/5 correto). Inconsistente.

### Próximos passos
- Fase 5.3: versionar o próprio sistema
- Fase 6.2-6.3: prompt templates + proteção de custo
- Fase 7: Product Constitution (com Bernardo)
- Fase 8: piloto end-to-end

---

## Sessão 2026-02-25 (noite cont. 13) — Fase 5.3 + Fase 6 completas

### O que foi feito
- **5.3 Versionamento**: `package.json` criado (v0.5.0), auto-publish atualizado pra sincronizar versão
- **6.2 Prompt templates**: 3 atalhos criados em `.pi/prompts/`:
  - `/spec-mode` → Sonnet + product-specify
  - `/review-mode` → Sonnet + product-validate
  - `/heavy-debug` → Opus + scout
- **6.3 Proteção de custo**: regras adicionadas ao AGENTS.md (max reviews, max Opus, max turns)
- **Fix**: modelo global atualizado de `claude-3-7-sonnet-latest` (deprecado) para `claude-sonnet-4-20250514`

### Decisões
- Prompt templates ficam no projeto (`.pi/prompts/`) e não no global — cada projeto pode ter os seus
- Proteção de custo usa limites soft (avisa operador) não hard (não bloqueia)

### Próximos passos
- Fase 7: Product Constitution (sessão com Bernardo)
- Fase 8: Piloto end-to-end

---

## Sessão 2026-02-25 (noite cont. 14) — Fase 7 concluída: Product Constitution

### O que foi feito
- **Conversa profunda com Bernardo** sobre quem ele é como criador de produtos
- **Pesquisa de referências**: SpecKit constitution template, NanoClaw philosophy, Pi blog post (Mario Zechner)
- **Product Constitution global** criada em `~/.pi/agent/product-constitution.md`:
  - 7 princípios fundamentais (4 inegociáveis + 3 importantes)
  - Seção "quem sou eu" — contexto sobre o operador
  - Seção "como eu trabalho" — processo, aprovação, comunicação
  - Governance — como a constitution evolui
- **Engineering Constitution** criada em `.pi/engineering-constitution.md`:
  - Tradução técnica de cada princípio
  - Standards de visual, performance, qualidade, arquitetura, dados
  - Process standards: version control, testing, communication
- **AGENTS.md atualizado**: lê product constitution no início de toda sessão
- **Fase 11 adicionada ao TODO**: extensões de produtividade do Pi (pós-conclusão)

### Decisões
- Constitution global (quem é o Bernardo) vs por projeto (contexto específico)
- Product constitution na linguagem do operador, engineering constitution na linguagem do agente
- Inspiração direta de Pi ("if I don't need it, won't build it") e NanoClaw ("skills over features")
- "O sim é claro. O talvez é não. O quem sabe é não." virou princípio #1

### Próximos passos
- Fase 8: Piloto end-to-end (testar tudo junto com projeto real)

---

## Session 2026-02-26 — Phase 9: Consolidation + Pilot Fixes

### What was done
- **Consolidated everything into single GitHub repo** (github.com/bernajaber/pi-product-system)
  - Skills, extensions, agents, constitution, guidelines, docs — all in one place
  - install.sh / uninstall.sh for symlink-based installation
  - Professional README with structure, install, usage docs
  - CHANGELOG.md for release tracking
  - .pi/AGENTS.md for system development sessions
  - Migrated PARA-BERNARDO.md and WORKFLOW-SPEC.md to docs/

- **Fixed pilot issues discovered during testing:**
  - Agent ignored workflow → rewrote AGENTS.md template to be imperative
  - Agent used `interview` tool instead of `ask` tool → moved ask-tool.ts to global, updated all skills
  - Agent didn't research references → added mandatory research step to product-specify skill
  - Model switching not reverting → removed spec-mode, review-mode, heavy-debug prompt templates
  - Skills/extensions trapped in pi-product-system → moved to global via symlinks

- **Architecture decision: Option D (file-based workflow)**
  - No enforcement extension — AGENTS.md + skills govern the process
  - /setup is deterministic (extension), workflow is creative (files)
  - Aligned with operator's philosophy: simple, maintainable, extensible

- **Product Constitution converted to English** (v1.1.0)
  - All artifacts now in English, operator communication remains Portuguese

### Decisions
- Single repo replaces oh-my-pi-plan + pi-product-system + scattered ~/.pi/agent files
- Symlinks over copies: edit in repo, changes take effect everywhere
- ask-tool.ts restored for interactive gate approvals (uses native ctx.ui.select)
- Option D chosen over enforcement extension — files over code for workflow control
- /setup as extension (deterministic) not prompt template (LLM-interpreted)

### Next steps
- Complete Phase 8 pilot: test full flow with blog project
- Clean up ~/bernardo-blog and run /setup → full workflow
- Archive ~/oh-my-pi-plan and ~/pi-product-system (old locations)
