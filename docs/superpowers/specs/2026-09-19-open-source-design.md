# Abrir o MTG Helper — design

**Data:** 2026-09-19
**Estado:** aprovado

## Problema

O repositório `lucas-pmelo/mtg-helper` já é público, mas não está aberto: sem
licença, ninguém tem permissão clara para usar ou contribuir; sem CI, um PR não
tem como provar que não quebrou nada; sem proteção, `main` aceita push direto; e
o deploy sai da máquina do mantenedor pela CLI, então o que está no ar não tem
relação verificável com o que está no GitHub.

## Decisões

| Assunto | Decisão | Por quê |
|---|---|---|
| Licença | MIT | Permissiva e curta, a norma no ecossistema JS; menor atrito para quem contribui. |
| Deploy | Integração Vercel ↔ GitHub | Merge em `main` vira produção e todo PR ganha preview, sem guardar `VERCEL_TOKEN` no repositório. PR de fork continua ganhando preview, o que um workflow com secret não consegue. |
| CI | GitHub Actions, só verificação | O Actions prova que o PR passa; quem publica é o Vercel. Uma responsabilidade por peça. |
| Idioma | README em inglês, `README.pt-BR.md` ao lado | O código e os comentários já são em inglês; a UI e a mesa são em pt-BR. Os dois públicos existem. |
| Regras da `main` | PR obrigatório, 1 aprovação, check `ci` verde, sem force-push | É o contrato mínimo que faz a CI valer alguma coisa. |
| Bypass | Admin do repositório | O GitHub não deixa ninguém aprovar o próprio PR e o projeto tem um mantenedor só: sem bypass, o mantenedor não consegue mergear nada. A regra continua integral para qualquer pessoa de fora. |

## Arquitetura

Três camadas que não se cruzam:

1. **Documentos** (`LICENSE`, `README.md`, `README.pt-BR.md`, `CONTRIBUTING.md`,
   `CODE_OF_CONDUCT.md`) — dizem o que o projeto é, o que se pode fazer com ele
   e como mexer nele. Não dependem de nenhuma automação.
2. **Verificação** (`.github/workflows/ci.yml`) — um job `ci` que roda
   `npm ci`, `npm run validate`, `npm test` e `npm run build` em Node 24 (a
   versão que o Vercel usa), em todo PR e em todo push na `main`. Não publica
   nada.
3. **Publicação** (integração Vercel ↔ GitHub) — reage ao repositório, não ao
   Actions: `main` vira produção, PR vira preview.

O ruleset da `main` é o que liga (2) a (3): só chega em produção o que passou
pela verificação.

## Componentes

### LICENSE
MIT, `Copyright (c) 2026 Lucas Melo`. O GitHub passa a exibir a licença sozinho.

### package.json
Ganha `"license": "MIT"` e `"engines": { "node": ">=22" }` — algumas dependências
de build já exigem 22.12+, e o campo evita que alguém descubra isso pelo erro.

### README.md (inglês)
O que o app é, as features reais (sorteio e draft de comandantes com handicap e
anti-repetição, sticker deck do Unfinity, histórico com temporadas e
head-to-head, leitor de carta estrangeira pelo rodapé), a stack, como rodar,
testar e publicar, o aviso de que os dados vivem no `localStorage` e precisam de
backup, o badge do CI e o link para o pt-BR e para os specs de design.

### README.pt-BR.md
O README atual, preservado e atualizado com o que mudou.

### CONTRIBUTING.md
Setup, os três comandos de verificação (`npm test`, `npm run coverage`,
`npm run validate`), a expectativa de teste antes do código, o padrão de commit
(`feat:`, `fix:`) que o histórico já usa, e as convenções que o código de fato
segue: validação como `checkX(...): string | null` no domínio, store guarda e
tela busca, camelCase para módulos e PascalCase para componentes.

### CODE_OF_CONDUCT.md
Contributor Covenant 2.1, com o e-mail do mantenedor como contato.

### .github/workflows/ci.yml
Gatilhos `pull_request` e `push` em `main`. Job `ci` — o nome importa: é o
contexto que o ruleset exige. `actions/checkout@v5`, `actions/setup-node@v6` com
Node 24 e cache de npm, depois os quatro comandos.

### .github/dependabot.yml
npm semanal, agrupado em um PR por vez, mais as próprias actions.

### Templates
`.github/pull_request_template.md` (o que muda, por quê, como verificar) e
`.github/ISSUE_TEMPLATE/` com bug e feature.

### Ruleset da main
Via API: `pull_request` com 1 aprovação e dispensa de review obsoleta em novo push,
`required_status_checks` exigindo `ci`, `non_fast_forward` e `deletion`. `bypass_actors` com
o papel de admin do repositório.

## Verificação

- `npm run validate`, `npm test` e `npm run build` continuam verdes localmente.
- O workflow passa a existir no repositório e roda verde na primeira execução.
- `gh api repos/.../rulesets` devolve a regra ativa na `main`.
- O projeto Vercel aparece conectado ao repositório, e a produção passa a sair de
  `main` em vez da máquina do mantenedor.

## Fora de escopo

- `SECURITY.md`: o app não tem backend, conta nem dado de terceiro; uma política
  de divulgação seria cerimônia sem superfície.
- Publicação em npm, release automática e changelog: o entregável é um site, não
  um pacote.
- Tradução da interface: ela é, por decisão de produto, em pt-BR.
