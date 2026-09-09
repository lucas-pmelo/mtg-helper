# Sorteio inteligente

Data: 2026-09-09
Status: aprovado, pronto para implementação
Bloco 3 de 4 (ver o fim deste documento)

## Problema

Três dores do sorteio atual, que hoje é um `rng()` seco:

1. **Repetição.** Quem tem três decks cai no mesmo duas semanas seguidas e o
   sorteio deixa de ser interessante.
2. **Desequilíbrio.** O ranking de decks já denuncia o deck que ganha 70% das
   partidas — informação que hoje não faz nada.
3. **Falta de agência.** Cair num deck que você não queria jogar hoje azeda a
   noite inteira, e não há nada a fazer.

## Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| Draft × modos | Interruptor **ortogonal** a próprios/pool | 4 combinações; draft não é uma variação do modo |
| Colisão em pool + draft | **Sequencial**: o escolhido sai das opções seguintes | É o draft de verdade, funciona com pool pequeno, e passar o celular já é o ritual da mesa |
| Escopo do handicap | **Temporada corrente**, caindo pro histórico inteiro se não houver | Mesmo recomeço que a temporada promete; um deck desmontado não carrega punição eterna |
| Janela da anti-repetição | **Último dia jogado** | A última sessão de verdade, que pode ter sido semana passada — não "ontem" |
| Arquitetura | Peso, filtro e máquina de estado **separados** | O draft tem turno e escolha; não é um sorteio, e virar caso especial de `drawCommanders` inchava a função mais testada do repo |

## Arquitetura

Quatro peças, porque são quatro responsabilidades:

```ts
// 1. anti-repetição: quais decks a pessoa pode receber
eligibleDecks(decks, matches, personId, today): Deck[]

// 2. handicap: com que probabilidade cada deck sai
weightsFor(decks, matches): Map<Id, number>

// 3. sorteio seco — como hoje, agora consumindo 1 e 2
drawCommanders(presentPlayers, decks, mode, rng, options?)

// 4. draft — máquina de estado
startDraft(presentPlayers, decks, mode, rng, context): DraftState
pickInDraft(state, deckId, context, rng): DraftState
```

O draft **não é uma variação do sorteio**: tem turno, escolha, e um deck que sai
de circulação a cada passo. Modelar como estado é o que o torna testável sem
simular cliques.

## Anti-repetição — `src/domain/commanders/eligibleDecks.ts`

```ts
export function lastPlayedDay(matches: readonly Match[], personId: Id, today: string): string | null;
export function eligibleDecks(
  decks: readonly Deck[],
  matches: readonly Match[],
  personId: Id,
  today: string,
): Deck[];
```

**Regra:** remove dos decks ativos da pessoa aqueles que ela usou no **último dia
em que jogou**, ignorando partidas de `today` (a sessão em curso não conta como
"a anterior").

**Fallback:** se a filtragem esvaziar a lista, devolve os decks ativos sem
filtro. Um jogador com um deck só continua jogando.

Quando o fallback dispara, a atribuição resultante é marcada — ver
`CommanderAssignment.repeated` abaixo.

## Handicap — `src/domain/commanders/weightsFor.ts`

```ts
export function weightsFor(decks: readonly Deck[], matches: readonly Match[]): Map<Id, number>;
```

**Fórmula:**

```
weight(deck) = 1 - (wins + 1) / (played + 2)
```

É suavização de Laplace com prior de 0.5. Escolhida por três propriedades que
importam aqui:

- **Um deck com 1 vitória em 1 partida não zera.** `1 - 2/3 = 0.333`, não `0`.
  Sem a suavização, uma única partida bastaria para banir um deck.
- **O peso nunca chega a zero nem a um.** `(wins+1)/(played+2) < 1` sempre, então
  todo deck mantém chance real de sair. Handicap não é banimento.
- **Um deck sem partida alguma vale 0.5**, exatamente o neutro. Deck novo não é
  premiado nem punido.

Exemplos: `5V/8P → 0.4`; `1V/8P → 0.8`; `0V/0P → 0.5`. A razão entre o pior e o
melhor fica em torno de 2:1 — perceptível, não brutal.

**Onde o peso se aplica:**

- **Modo próprios:** escolhe qual dos decks da pessoa sai.
- **Draft:** escolhe quais decks aparecem como opção.
- **Modo pool:** quando o pool tem mais decks que jogadores, o peso escolhe
  **quais decks entram** na rodada; a atribuição a cada jogador segue sendo
  embaralhamento uniforme. Quando o pool tem exatamente um deck por jogador, o
  peso não muda nada e não deve fingir que muda.

## Sorteio — `drawCommanders`

Assinatura estendida com um objeto opcional, para não quebrar chamador algum:

```ts
export type DrawOptions = {
  matches?: readonly Match[];
  today?: string;
  avoidRepeat?: boolean;
  handicap?: boolean;
};

export function drawCommanders(
  presentPlayers: readonly Person[],
  decks: readonly Deck[],
  mode: DrawMode,
  rng: Rng,
  options?: DrawOptions,
): CommanderAssignment[];
```

Sem `options`, o comportamento é **exatamente** o de hoje. Os testes existentes
de `drawCommanders` não podem mudar.

`CommanderAssignment` ganha um campo opcional:

```ts
export type CommanderAssignment = {
  personId: Id;
  deckId: Id | null;
  /** True when anti-repeat had to give back a deck for lack of an alternative. */
  repeated?: boolean;
};
```

`checkDraw` não muda.

## Draft — `src/domain/commanders/draft.ts`

```ts
export const OPTIONS_PER_TURN = 3;

export type DraftContext = {
  decks: readonly Deck[];
  mode: DrawMode;
  matches: readonly Match[];
  today: string;
  avoidRepeat: boolean;
  handicap: boolean;
};

export type DraftState = {
  order: Id[];                        // ordem dos jogadores
  turn: number;                       // índice em `order`
  options: Id[];                      // opções de quem está na vez
  picks: CommanderAssignment[];
  taken: Id[];                        // decks já escolhidos (relevante em pool)
  done: boolean;
};

export function startDraft(presentPlayers, context, rng): DraftState;
export function pickInDraft(state, deckId, context, rng): DraftState;
export function checkDraftStart(presentPlayers, context): string | null;
```

**Regras:**

- A ordem dos jogadores é embaralhada por `rng` — quem escolhe primeiro tem
  vantagem, então não pode ser sempre o mesmo.
- Cada turno oferece até `OPTIONS_PER_TURN` decks, sorteados **com peso** entre
  os elegíveis. Menos que 3 se não houver 3 disponíveis; nunca zero.
- Em **pool**, o deck escolhido entra em `taken` e some das opções seguintes.
  Em **próprios**, `taken` não filtra nada — decks são de donos diferentes.
- `pickInDraft` rejeita um `deckId` que não esteja em `state.options` e rejeita
  jogar num draft com `done: true`. Erro de programação, não de usuário: lança.
- `checkDraftStart` segue a convenção `checkX` (razão em pt-BR ou `null`) e cobre
  o caso do pool sem decks suficientes.

## Testes

Além do de sempre, três exigências específicas:

1. **Teste estatístico do handicap.** Sorteio ponderado erra em silêncio: um peso
   errado não quebra teste nenhum, só faz um deck sair 15% mais do que devia,
   para sempre. Rodar milhares de sorteios com RNG semeado e verificar que a
   distribuição observada bate com os pesos dentro de uma margem. Já existe
   precedente no repo: `should distribute own decks uniformly over many draws`.
2. **Teste de que `drawCommanders` sem `options` não mudou.** Os casos atuais
   servem; nenhum deles pode ser editado.
3. **Invariantes do draft:** nenhum deck escolhido duas vezes em pool; todo
   jogador termina com exatamente uma escolha; `options` nunca vem vazio antes de
   `done`.

Cobrir também: fallback da anti-repetição, `weightsFor` nos três exemplos
numéricos acima, e a ordem do draft sendo de fato embaralhada.

## Telas

Em **Sortear**, abaixo do segmented de modo:

- Dois interruptores: **"Evitar repetição"** e **"Equilibrar"**, ambos desligados
  por padrão. Ligar qualquer um recomeça o resultado (`setResult(null)`), como já
  acontece ao trocar de modo.
- Um interruptor **"Draft"**, que troca o botão "Sortear" por "Começar draft".

**Fluxo do draft na tela:** um cartão grande com o nome de quem está na vez, as
opções como imagens de carta tocáveis, e o progresso ("2 de 4"). Tocar numa
opção registra a escolha e passa ao próximo. Ao terminar, mostra o mesmo
resultado final do sorteio seco.

O celular circula pela mesa — o nome de quem está na vez precisa ser legível **a
um braço de distância**, maior que o resto da tela.

No resultado, uma atribuição com `repeated: true` mostra uma nota discreta
("mesmo deck da última sessão — sem alternativa"), para a mesa não achar que o
filtro falhou.

## Convenções deste repo

Ver `.claude/eva/patterns.md`:

- Validação é `checkX(...): string | null`, no domínio, razão em pt-BR.
- Store guarda; a tela busca.
- Módulos em camelCase, componentes React em PascalCase; fábricas em kebab-case.
- Código e comentários em inglês; strings visíveis ao usuário em pt-BR.

## Verificação

`npm test`, `npm run validate` e `npm run build` verdes. Cobertura de `domain/`,
`data/` e `stores/` está em 100% e deve continuar.

## Contexto: bloco 3 de 4

1. ~~Leitor de carta estrangeira~~ — feito.
2. ~~Temporadas + head-to-head~~ — feito.
3. **Sorteio inteligente** (este spec).
4. **Registro em um toque** — consome a saída daqui. O formato que ele vai ler é
   `CommanderAssignment[]`, tanto do sorteio seco quanto de `DraftState.picks`;
   por isso o draft termina produzindo exatamente a mesma estrutura.
