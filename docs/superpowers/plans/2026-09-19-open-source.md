# Abrir o MTG Helper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** deixar o repositório público `lucas-pmelo/mtg-helper` pronto para receber contribuição: licença, documentação em inglês e pt-BR, CI no GitHub Actions, deploy automático pela integração Vercel ↔ GitHub e regras de PR na `main`.

**Architecture:** três camadas independentes — documentos (não dependem de automação), verificação (Actions, job `ci`, não publica) e publicação (integração Vercel, reage ao repositório). O ruleset da `main` é o que amarra verificação a publicação.

**Tech Stack:** GitHub Actions, GitHub Rulesets API (via `gh api`), Vercel CLI, npm, Node 24.

**Spec:** [`docs/superpowers/specs/2026-09-19-open-source-design.md`](../specs/2026-09-19-open-source-design.md)

## Global Constraints

- **Nenhum agente commita.** Todo commit e push é do mantenedor. Tarefas terminam com os arquivos no working tree e um aviso do que commitar.
- Licença: MIT, `Copyright (c) 2026 Lucas Melo`.
- Node nas actions: **24** (a versão que o Vercel usa neste projeto).
- O job do CI chama-se exatamente **`ci`** — é o contexto exigido pelo ruleset.
- Contato do código de conduta: `lucas.pinheiro.melo@gmail.com`.
- Comandos de verificação do projeto: `npm run validate`, `npm test`, `npm run coverage`, `npm run build`.
- Nenhum secret novo no repositório: o deploy sai da integração Vercel, não do Actions.

---

### Task 1: Licença e metadados do pacote

**Files:**
- Create: `LICENSE`
- Modify: `package.json`

**Interfaces:**
- Produces: arquivo `LICENSE` na raiz (o GitHub passa a detectar a licença) e os campos `license` e `engines` em `package.json`, citados pelo README da Task 2.

- [x] **Step 1: Escrever o `LICENSE`** — texto MIT literal, ano 2026, titular `Lucas Melo`.
- [x] **Step 2: Acrescentar os campos ao `package.json`** — `"license": "MIT"` e `"engines": { "node": ">=22" }`, mantendo a ordem de chaves legível (após `version`).
- [x] **Step 3: Verificar** — `npm run validate` e `npm test` continuam verdes; `node -e "console.log(require('./package.json').license)"` imprime `MIT`.

---

### Task 2: Documentação pública

**Files:**
- Create: `README.pt-BR.md` (conteúdo do README atual, atualizado)
- Modify: `README.md` (reescrito em inglês)
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`

**Interfaces:**
- Consumes: `LICENSE` da Task 1 (a seção License aponta para ele).
- Produces: badge do workflow `ci.yml` no README — o nome do arquivo tem de bater com o da Task 3.

- [x] **Step 1: `README.pt-BR.md`** — partir do README atual, mantendo Rodar / Build / Verificação / Dados estáticos / Backup, e acrescentar as features e o link para o README em inglês.
- [x] **Step 2: `README.md` em inglês** — badge do CI, o que é o app, features reais, stack, rodar, testar, deploy, o aviso de backup do `localStorage`, licença, e links para `CONTRIBUTING.md`, `README.pt-BR.md` e os specs.
- [x] **Step 3: `CONTRIBUTING.md`** — setup, comandos de verificação, teste antes do código, commits `feat:`/`fix:`, as três convenções do código (validação `checkX(...): string | null` no domínio; store guarda e tela busca; camelCase para módulos, PascalCase para componentes), e o fluxo de PR.
- [x] **Step 4: `CODE_OF_CONDUCT.md`** — Contributor Covenant 2.1 com o e-mail de contato.
- [x] **Step 5: Verificar** — todo link relativo citado existe no disco (`ls` de cada alvo).

---

### Task 3: CI no GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

**Interfaces:**
- Consumes: os scripts do `package.json` (`validate`, `test`, `build`).
- Produces: o contexto de status **`ci`**, exigido pelo ruleset da Task 5, e o badge usado no README da Task 2.

- [x] **Step 1: Escrever `ci.yml`** — `on: pull_request` e `push` em `main`; job `ci` em `ubuntu-latest`; `actions/checkout@v5`; `actions/setup-node@v6` com `node-version: 24` e `cache: npm`; passos `npm ci`, `npm run validate`, `npm test`, `npm run build`.
- [x] **Step 2: Escrever `dependabot.yml`** — ecossistemas `npm` e `github-actions`, semanal, agrupando as atualizações menores.
- [x] **Step 3: Verificar a sintaxe** — o YAML precisa carregar sem erro (`python3 -c "import yaml,sys; yaml.safe_load(open(...))"`) e o job tem de se chamar `ci`.
- [x] **Step 4: Verificar os comandos localmente** — rodar `npm run validate && npm test && npm run build` na sequência exata do workflow.

---

### Task 4: Templates de PR e issue

**Files:**
- Create: `.github/pull_request_template.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

- [x] **Step 1: Template de PR** — o que muda, por quê, como verificar, e uma checklist curta (testes, validate, docs).
- [x] **Step 2: Template de bug** — o que aconteceu, o que era esperado, passos, aparelho/navegador (é um PWA de iPhone).
- [x] **Step 3: Template de feature** — problema na mesa que a ideia resolve, e alternativa considerada.
- [x] **Step 4: `config.yml`** — `blank_issues_enabled: true`.

---

### Task 5: Integração Vercel ↔ GitHub e regras da main

**Files:** nenhum no repositório — tudo é configuração remota.

**Interfaces:**
- Consumes: o contexto `ci` da Task 3.

- [x] **Step 1: Conectar o Vercel ao repositório** — `npx vercel git connect https://github.com/lucas-pmelo/mtg-helper`; se pedir autorização no navegador, parar e pedir ao mantenedor.
- [x] **Step 2: Confirmar a conexão** — `npx vercel project inspect mtg-helper` mostra o repositório ligado.
- [ ] **Step 3 (não feito — fora do que foi aprovado): Ligar o delete de branch após merge** — `gh api -X PATCH repos/lucas-pmelo/mtg-helper -f delete_branch_on_merge=true`.
- [x] **Step 4: Criar o ruleset da `main`** — via `gh api -X POST repos/lucas-pmelo/mtg-helper/rulesets`, com `pull_request` (1 aprovação, conversas resolvidas), `required_status_checks` exigindo `ci`, `non_fast_forward`, e `bypass_actors` com o papel de admin do repositório.
- [x] **Step 5: Verificar** — `gh api repos/lucas-pmelo/mtg-helper/rulesets` lista a regra como `active` e `gh api repos/.../rules/branches/main` mostra as regras valendo para a `main`.
- [x] **Step 6: Avisar o mantenedor** — o ruleset passa a valer imediatamente; o push do commit pendente continua possível pelo bypass de admin, mas o caminho normal passa a ser PR.

---

### Task 6: Fechamento

- [x] **Step 1: Verificação final** — `npm run validate`, `npm test`, `npm run build` verdes.
- [x] **Step 2: Listar para o mantenedor** o que está no working tree para commitar, e o que já valeu imediatamente no GitHub e no Vercel (configuração remota, não versionada).
