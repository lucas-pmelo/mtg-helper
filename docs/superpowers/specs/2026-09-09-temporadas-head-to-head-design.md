# Temporadas e head-to-head

Data: 2026-09-09
Status: aprovado, pronto para implementação
Bloco 2 de 4 (ver o fim deste documento)

## Problema

Duas dores no histórico:

1. **O ranking é eterno.** Quem jogou mais aparece na frente para sempre, e quem
   entrou no grupo esse ano nunca alcança. Não há como recomeçar.
2. **Rivalidades são invisíveis.** "Contra o Fulano eu nunca ganho" é a conversa
   mais comum da mesa, e o app tem os dados para responder mas não responde.

## Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| O que é uma temporada | Intervalo de datas nomeado | `Match` não muda, nenhuma partida antiga migra, backup só cresce |
| Escopo padrão do ranking | Temporada corrente, com seletor | Recomeçar do zero é o ponto da feature; padrão "desde sempre" faria da temporada decoração |
| Partida fora de toda temporada | Some do rank de temporada | Continua no histórico e em "Desde sempre"; nenhum dado se perde |
| Sobreposição de temporadas | **Proibida** | Uma partida em duas temporadas deixa "o rank da temporada" sem resposta única |
| Buraco entre temporadas | Permitido | O cadastro não vira quebra-cabeça de datas |
| Head-to-head multiplayer | Três números: você / ele / um terceiro | Em Commander não existe duelo; placar de 2 números sumiria com as partidas que um terceiro venceu |
| Como se chega no head-to-head | Tocando no jogador no ranking | Sem navegação nova; é onde a pergunta nasce |
| Onde se cadastra temporada | Ajustes | Ação rara (2x/ano); o Histórico é tela de leitura rápida |

## Modelo de dados

Em `src/domain/types.ts`:

```ts
export type Season = {
  id: Id;
  name: string;
  startsOn: string;        // 'YYYY-MM-DD'
  endsOn: string | null;   // null = aberta, é a temporada corrente
};
```

`Match` **não muda**. Uma partida pertence à temporada cujo intervalo contém seu
`playedOn`, com **ambos os limites inclusivos**.

## Domínio

### `src/domain/history/seasons.ts`

```ts
export function checkSeason(draft: Omit<Season, 'id'>, existing: readonly Season[]): string | null;
export function matchesInSeason(matches: readonly Match[], season: Season): Match[];
export function currentSeason(seasons: readonly Season[], today: string): Season | undefined;
export function sortSeasons(seasons: readonly Season[]): Season[];  // mais recente primeiro
```

`checkSeason` segue a convenção `checkX` registrada em `.claude/eva/patterns.md`:
devolve a razão em pt-BR ou `null`. Cobre:

- nome vazio;
- `startsOn` ausente ou fora de `YYYY-MM-DD`;
- `endsOn` anterior a `startsOn`;
- **sobreposição com qualquer temporada existente** (considerando `endsOn: null`
  como "até o infinito").

Ao editar uma temporada, ela própria é excluída da checagem de sobreposição —
senão toda edição colide consigo mesma.

`currentSeason` devolve a temporada cujo intervalo contém `today`. Se houver
temporada aberta e temporada fechada contendo a data, a proibição de
sobreposição garante que só uma existe.

### `src/domain/history/headToHead.ts`

```ts
export type Confrontation = {
  opponentId: Id;
  name: string;
  shared: number;        // mesas em comum
  wins: number;          // vitórias de quem foi consultado
  opponentWins: number;
  otherWins: number;     // venceu um terceiro
};

export function computeHeadToHead(
  matches: readonly Match[],
  people: readonly Person[],
  personId: Id,
): Confrontation[];
```

Ordenado por `shared` decrescente, desempate por `name.localeCompare`.

**Invariante:** `wins + opponentWins + otherWins === shared`, sempre. Testar
explicitamente.

Adversários com `shared === 0` não entram na lista.

### `rankings.ts` não muda

`computePlayerRanking` e `computeDeckRanking` já recebem `matches` como
parâmetro. A temporada filtra **antes**: a tela chama `matchesInSeason` e passa a
lista filtrada. Nenhuma assinatura muda, nenhum teste atual quebra.

## Store

As temporadas entram no `historyStore`, junto das partidas — mesmo precedente do
`peopleStore`, que guarda `people` e `decks` juntos por serem relacionados.

```ts
type HistoryState = {
  matches: Match[];
  seasons: Season[];                                  // novo
  // ... ações existentes, intocadas
  addSeason: (draft: Omit<Season, 'id'>) => void;
  updateSeason: (id: Id, draft: Omit<Season, 'id'>) => void;
  removeSeason: (id: Id) => void;
  replaceAll: (matches: Match[], seasons: Season[]) => void;   // assinatura estendida
};
```

`addSeason`/`updateSeason` validam com `checkSeason` e lançam, no mesmo molde do
`assertValid` que já existe para partidas.

Remover uma temporada **não apaga partida nenhuma** — as partidas dela passam a
ficar fora de qualquer temporada.

## Backup

`Backup` ganha `seasons: Season[]`. A compatibilidade nos dois sentidos é
requisito, não detalhe:

- Backup **antigo** (sem `seasons`) importa normalmente e vira `[]`.
- Backup **novo** importa em qualquer versão do app.
- `BACKUP_VERSION` **fica em 1**: o formato não quebrou, só cresceu.

`hasBackupShape` deve aceitar `seasons` ausente. Não exigir o campo.

## Telas

### Histórico

Um seletor de temporada no topo, acima das abas Dias / Jogadores / Decks, com as
temporadas (mais recente primeiro) e a opção **"Desde sempre"**. Abre na
temporada corrente; se não houver, abre em "Desde sempre".

O seletor escopa **as três abas**, não só os rankings — incluindo Dias. Um
seletor que vale para parte da tela engana em pé no meio da mesa.

### Jogadores → head-to-head

Cada linha do ranking de Jogadores vira tocável e **expande em acordeão**,
mostrando os confrontos daquele jogador logo abaixo dela. Expandir no lugar, em
vez de navegar, mantém o ranking visível para comparar enquanto lê.

Uma linha por adversário, com os três números rotulados. O jogador consultado
não aparece na própria lista.

### Ajustes → temporadas

Seção nova para criar, editar e remover temporadas: nome, início e fim (fim
vazio = temporada aberta). Erros vêm de `checkSeason`, exibidos como no resto do
app.

## Testes

- `seasons.test.ts` — pertencimento por intervalo **incluindo os limites**
  (partida exatamente em `startsOn` e em `endsOn` entra), temporada aberta
  (`endsOn: null`), rejeição de sobreposição, buraco permitido, edição que não
  colide consigo mesma.
- `headToHead.test.ts` — os três números, a invariante
  `wins + opponentWins + otherWins === shared`, dois jogadores que nunca
  dividiram mesa, e um jogador sem partida alguma.
- `storage.test.ts` — **teste explícito de que um backup sem `seasons` importa** e
  vira `[]`. É a regressão que dói se acontecer.
- `historyStore.test.ts` — CRUD de temporada, validação, e que remover temporada
  não apaga partida.
- `rankings.test.ts` — inalterado; serve de prova de que a assinatura não mudou.
- `App.test.tsx` — o seletor de temporada e o acordeão de confrontos.

Fábricas de teste novas seguem `src/tests/factories/make-<entidade>.ts` com
assinatura `(override: Partial<T> = {})`.

## Convenções deste repo

Ver `.claude/eva/patterns.md`:

- Validação é `checkX(...): string | null`, no domínio, razão em pt-BR.
- Store guarda; a tela busca. Nenhuma rede no store.
- Módulos em camelCase, componentes React em PascalCase; fábricas em kebab-case.
- Código e comentários em inglês; strings visíveis ao usuário em pt-BR.

## Verificação

`npm test`, `npm run validate` e `npm run build` verdes. A cobertura de
`domain/`, `data/` e `stores/` está em 100% e deve continuar.

## Contexto: bloco 2 de 4

1. ~~Leitor de carta estrangeira~~ — feito.
2. **Temporadas + head-to-head** (este spec).
3. **Sorteio inteligente** — anti-repetição, handicap e draft de comandantes.
   Os três mexem na assinatura de `drawCommanders`; fazer juntos evita mudá-la
   três vezes. O handicap usa win rate e vai poder usar o escopo de temporada
   definido aqui.
4. **Registro em um toque** — depende do formato de saída do bloco 3.
