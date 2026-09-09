# Registro em um toque

Data: 2026-09-09
Status: aprovado, pronto para implementação
Bloco 4 de 4 — último

## Problema

O histórico só é alimentado se alguém lembrar de abrir o formulário depois. Às
23h ninguém lembra, e o histórico é o **único dado insubstituível do app**: deck e
pessoa se recadastram em minutos, partida perdida é partida perdida.

Pior: o sorteio acabou de produzir exatamente a informação que o `MatchForm` pede
— quem jogou e com qual deck — e joga fora. O design original decidiu isso
explicitamente (`2026-09-09-mtg-helper-design.md` §5.2: "o resultado do sorteio
não cria partida no histórico"). Este spec reverte essa decisão.

## Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| Modelo do rascunho | `LiveMatch` separado no store | `Match`, `checkMatch`, `rankings` e `headToHead` ficam intocados, com vencedor obrigatório como já estão testados |
| Rascunho órfão | **Pergunta ao reabrir**, com a data à frente | Nada se perde por esquecimento, nada é gravado errado por automatismo |
| Como a partida nasce | Botão **"Iniciar partida"** no resultado | Sortear de novo não cria nada; a partida abre quando a mesa aceitou o resultado |
| Onde vive a faixa | No shell, visível em qualquer aba | É o que a torna lembrete em vez de mais uma tela para visitar |
| Jogador sem deck | **Fora do registro**, com aviso na faixa | `checkMatch` exige deck para todo participante — lei do domínio que não se afrouxa para caber feature nova |
| `liveMatch` no backup | **Não entra** | Estado efêmero de uma noite; um rascunho restaurado semanas depois em outro aparelho é só confusão |

## Modelo de dados

Em `src/domain/types.ts`:

```ts
export type LiveMatch = {
  startedOn: string;                  // 'YYYY-MM-DD'
  participants: MatchParticipant[];   // mesmo tipo do Match
};
```

`Match` **não muda**. `checkMatch`, `rankings.ts`, `headToHead.ts` e
`seasons.ts` **não mudam**.

## Domínio — `src/domain/history/liveMatch.ts`

```ts
export function toParticipants(assignments: readonly CommanderAssignment[]): MatchParticipant[];
export function checkLiveStart(assignments: readonly CommanderAssignment[]): string | null;
export function isStale(live: LiveMatch, today: string): boolean;
```

`toParticipants` converte a saída do sorteio em participantes, **descartando
quem tem `deckId: null`**. O sorteio passou a permitir jogador sem deck (ver
`drawCommanders`), mas `checkMatch` exige deck para todo participante. Em vez de
afrouxar o domínio, a pessoa sem deck fica fora do registro — ela jogou, mas não
há deck para registrar.

`checkLiveStart` segue a convenção `checkX` (razão em pt-BR ou `null`) e bloqueia
quando sobram menos de 2 participantes com deck. Mensagem deve nomear o problema,
não só recusar.

`isStale` é `live.startedOn !== today`.

## Store

No `historyStore`:

```ts
liveMatch: LiveMatch | null;
startLive: (participants: MatchParticipant[]) => void;
finishLive: (winnerPersonId: Id) => void;
discardLive: () => void;
```

- `startLive` grava o rascunho com `startedOn: today()`. Sobrescreve um rascunho
  anterior, se houver.
- `finishLive` cria o `Match` definitivo **pelo `addMatch` que já existe** — para
  herdar a validação do `checkMatch` sem duplicá-la — e então limpa o rascunho.
  Se `addMatch` lançar, o rascunho **não** é limpo: o erro sobe e a faixa
  continua lá. Perder o rascunho por causa de uma validação seria o pior
  resultado possível.
- `discardLive` só limpa.
- `liveMatch` é persistido no `localStorage` junto do resto do store (é o que faz
  o rascunho sobreviver ao app fechar), mas **fica fora do `Backup`**.
  `replaceAll` não o toca.

## Telas

### A faixa (`src/ui/components/LiveMatchBar.tsx`)

Vive no `App.tsx`, acima da tela ativa, visível em qualquer aba. Ausente quando
`liveMatch` é `null`.

**Recolhida:** "Partida em andamento" e a contagem de jogadores. Quando
`isStale`, muda para "Partida de 07/09 — quem venceu?" com a data formatada,
porque sem a data ninguém lembra de que partida se trata.

**Expandida:** um botão por participante para marcar o vencedor, mais
"Descartar partida" (com `confirm`, como o resto do app faz em ação destrutiva).

Quando o sorteio tinha alguém sem deck, a faixa mostra a nota: "<Nome> está na
mesa sem deck — não entra no registro."

Não pode cobrir conteúdo nem competir com a tab bar: a faixa fica no topo, o
`.screen` ganha o espaço dela.

### Sortear

O bloco de resultado ganha **"Iniciar partida"** ao lado de "Sortear de novo".
Vale para o sorteio seco e para o fim do draft — os dois já produzem
`CommanderAssignment[]`, de propósito (ver o bloco 3).

Desabilitado com o motivo visível quando `checkLiveStart` recusa.

## Testes

- `liveMatch.test.ts` — `toParticipants` descartando `deckId: null`,
  `checkLiveStart` recusando menos de 2 participantes com deck, `isStale` nos dois
  lados da virada de dia.
- `historyStore.test.ts` — `startLive`/`finishLive`/`discardLive`; que
  `finishLive` cria um `Match` com o vencedor certo e limpa o rascunho; e
  **explicitamente que o rascunho sobrevive a um `finishLive` que falha na
  validação.**
- `storage.test.ts` — que `liveMatch` **não** aparece no backup exportado e que
  `replaceAll` não o apaga.
- `App.test.tsx` — a faixa aparecendo com rascunho e ausente sem ele; o texto de
  `isStale`; marcar vencedor pela faixa criando a partida.

Fábricas novas em `src/tests/factories/make-<entidade>.ts` com
`(override: Partial<T> = {})`.

## Convenções deste repo

Ver `.claude/eva/patterns.md`:

- Validação é `checkX(...): string | null`, no domínio, razão em pt-BR.
- Store guarda; a tela busca.
- Módulos em camelCase, componentes React em PascalCase; fábricas em kebab-case.
- Código e comentários em inglês; strings visíveis ao usuário em pt-BR.

## Verificação

`npm test`, `npm run validate` e `npm run build` verdes. Cobertura de `domain/`,
`data/` e `stores/` está em 100% e deve continuar.

## Contexto: bloco 4 de 4

1. ~~Leitor de carta estrangeira~~
2. ~~Temporadas + head-to-head~~
3. ~~Sorteio inteligente~~
4. **Registro em um toque** (este spec) — fecha as sete features pedidas.
