# MTG Helper — Design

Data: 2026-09-09
Status: aprovado para planejamento

## 1. Objetivo

Aplicativo de apoio à mesa de Magic (Commander/EDH) para um grupo fixo de
amigos. Resolve quatro tarefas concretas: cadastrar quem joga e com quais
decks, sortear os comandantes da partida, emular o sticker deck do Unfinity
sem as folhas físicas, e registrar o histórico das partidas de cada dia.

Toda carta exibida no app aparece com a imagem, nunca só o nome.

## 2. Contexto e restrições

- **Um único celular (iOS).** O app roda no aparelho de quem organiza a
  mesa. Não há múltiplos usuários, contas, login ou sincronização.
- **PWA**, adicionado à tela de início pelo Safari. Sem App Store, sem
  Apple Developer Program, sem TestFlight.
- **Local-only.** Nenhum backend. Todos os dados vivem no device.
- Uso presencial, esporádico (uma mesa por semana ou menos).

### Por que PWA e não Expo/nativo

O único ganho real do nativo aqui seria distribuição, e distribuição nativa
no iOS custa US$ 99/ano de Apple Developer Program mais um rebuild a cada
90 dias (builds de TestFlight expiram). Para um app que roda em um celular,
não se paga. Toda a lógica é pura e portável: se no futuro o grupo quiser em
vários aparelhos, migrar para Expo é trabalho de dias.

## 3. Arquitetura

Vite + React + TypeScript. `vite-plugin-pwa` para manifest e service
worker. Zustand com `persist` para estado. Vitest para os testes de domínio.
Deploy estático (Vercel, Netlify ou GitHub Pages).

### Princípio

A lógica de negócio mora em funções puras, sem React e sem storage. Stores
guardam estado e chamam o domínio. Componentes só desenham. Três das quatro
features são pura regra (sorteio com dois modos, draw de 3 em 10, agregação
de rankings) — isolá-las é o que torna possível testá-las de verdade, com
RNG injetável, em vez de clicar e torcer.

### Estrutura de pastas

```
src/
  domain/
    rng.ts                        # Rng = () => number; injetável
    commanders/drawCommanders.ts  # os dois modos de sorteio
    stickers/drawStickers.ts      # 3 de 10, sem repetição
    history/rankings.ts           # por jogador, por deck, por dia
  data/
    storage.ts                    # camada fina sobre localStorage
    sheets.json                   # 48 sticker sheets (gerado em build)
    scryfall.ts                   # autocomplete e busca de carta
  stores/
    peopleStore.ts                # pessoas + decks
    stickerStore.ts               # sticker deck + último draw
    historyStore.ts               # partidas
  ui/
    screens/                      # uma pasta por tela
    components/                   # CardImage, PersonPicker, etc.
  scripts/
    generate-sheets.ts            # roda uma vez, popula sheets.json
```

## 4. Modelo de dados

```ts
type Id = string   // crypto.randomUUID()

type CardRef = {
  scryfallId: string
  name: string
  artCrop: string          // image_uris.art_crop — listas e cards pequenos
  normal: string           // image_uris.normal   — resultado do sorteio
  colorIdentity: string[]  // ['W','U','B','G']
}

type Person = {
  id: Id
  name: string
  archived: boolean
}

type Deck = {
  id: Id
  personId: Id
  commander: CardRef
  archived: boolean
}

type StickerDeck = {
  sheetIds: string[]       // exatamente 10, dos 48 disponíveis, sem repetir
}

type StickerDraw = {
  sheetIds: string[]       // exatamente 3, subconjunto do deck
  drawnAt: string          // ISO
}

type MatchParticipant = {
  personId: Id
  deckId: Id
}

type Match = {
  id: Id
  playedOn: string         // 'YYYY-MM-DD', data local
  participants: MatchParticipant[]   // 2 ou mais
  winnerPersonId: Id       // deve estar entre os participants
}

type Sheet = {             // dado estático, imutável
  id: string               // scryfall id
  name: string
  collectorNumber: string
  image: string            // URL em cards.scryfall.io
}
```

### Decisão: apagar é arquivar

Remover de verdade uma `Person` ou um `Deck` quebraria todo `Match` que
aponta para eles e destruiria o ranking de decks. "Apagar" na interface
marca `archived: true`: o registro some dos seletores e do sorteio, mas o
histórico antigo continua renderizando nome e arte normalmente.

### Decisão: `CardRef` é congelado

Nome e URLs de imagem são gravados no cadastro do deck e nunca re-buscados.
O app não depende da API do Scryfall estar no ar para funcionar, e não gasta
requisição a cada abertura.

## 5. Features

### 5.1 Pessoas e decks

CRUD de pessoas. Cada pessoa tem N decks; cada deck é exatamente um
comandante (uma carta). Sem apelido de deck, sem partner/background — o
comandante identifica o deck.

Cadastrar um deck: escolher a pessoa, digitar o nome do comandante num campo
com autocomplete do Scryfall (debounce de 300 ms), escolher a carta na lista,
e o app grava o `CardRef` completo.

A lista de decks de cada pessoa mostra a arte (`artCrop`) ao lado do nome.

### 5.2 Random Commanders

1. Tela lista todas as pessoas não arquivadas com checkbox. Marca-se quem
   está na mesa hoje.
2. Escolhe-se o modo:
   - **Próprios decks** (padrão): cada jogador presente recebe um deck
     sorteado entre os decks dele mesmo.
   - **Pool único**: junta os decks de todos os presentes num pool e
     distribui um para cada jogador, sem repetir deck.
3. Botão Sortear. O resultado mostra, para cada jogador, o nome do
   comandante com a imagem grande (`normal`).
4. Botão Sortear de novo repete com a mesma seleção.

O resultado do sorteio **não** cria partida no histórico — o registro de
partidas é independente (ver 5.4).

Assinatura do domínio:

```ts
drawCommanders(
  presentPlayers: Person[],
  decks: Deck[],
  mode: 'own' | 'pool',
  rng: Rng
): { personId: Id; deckId: Id }[]
```

### 5.3 Sticker sheets

Existe **um** sticker deck global no app (não é por jogador).

- Tela de edição: grade com as 48 folhas do set Unfinity (`SUNF`), cada uma
  com a imagem. Toca para incluir/excluir. Contador "7/10". Só é possível
  dar draw com exatamente 10 selecionadas.
- Botão Draw sorteia 3 das 10, sem repetição, e mostra as três em imagem
  grande, com zoom ao toque (os stickers são gráficos pequenos e precisam
  ser legíveis).
- O resultado fica **persistido**: fechar e reabrir o app no meio da partida
  mostra o mesmo draw. Só um novo Draw substitui.

```ts
drawStickers(deck: StickerDeck, rng: Rng): StickerDraw
```

Os 48 registros vêm de `sheets.json`, gerado uma vez por
`scripts/generate-sheets.ts` a partir de `q=set:sunf` no Scryfall. É dado
imutável de 2022 — nunca consultado em runtime.

### 5.4 Histórico de partidas

Registro **manual**, independente do sorteio, para funcionar também com
partidas não sorteadas.

**Nova partida:** data (padrão hoje, editável), lista de participantes onde
cada linha é jogador + deck (o seletor de deck filtra pelos decks daquele
jogador), e o vencedor escolhido entre os participantes. Mínimo de 2
participantes. Salvar grava um `Match`.

**Visualizações**, em abas:

- **Por dia** — partidas agrupadas por data, mais recente primeiro. Cada
  partida mostra os participantes com arte e nome do comandante, e destaca
  o vencedor. Cada dia traz um resumo dos vencedores do dia (útil para
  campeonatos internos: "quem ganhou hoje").
- **Ranking de jogadores** — vitórias, partidas jogadas e win rate por
  pessoa, ordenado por vitórias. Filtro de período: tudo / este dia.
- **Ranking de decks** — mesmas métricas por deck, com a arte do comandante.
  Decks arquivados continuam aparecendo se têm partidas.

Cada partida pode ser editada ou apagada (correção de registro errado).

```ts
computePlayerRanking(matches: Match[], people: Person[]): PlayerStat[]
computeDeckRanking(matches: Match[], decks: Deck[]): DeckStat[]
groupMatchesByDay(matches: Match[]): DaySummary[]
```

### 5.5 Export / Import

Botão nas configurações que exporta todo o estado (pessoas, decks, sticker
deck, partidas) como um arquivo JSON, e outro que importa de volta,
substituindo o estado atual após confirmação.

Isto não é sincronização — é proteção contra perda de dados. O Safari faz
eviction de storage de sites, e o histórico de partidas é o único dado do
app que é insubstituível. Serve também para trocar de aparelho.

## 6. Scryfall

Uso restrito a duas chamadas, ambas só no cadastro:

- `GET /cards/autocomplete?q=<termo>` — sugestões de nome enquanto digita.
- `GET /cards/named?exact=<nome>` — busca a carta escolhida para montar o
  `CardRef`.

Regras de boa cidadania exigidas pelo Scryfall: header `User-Agent` próprio
identificando o app, `Accept: application/json`, e no máximo ~10 requisições
por segundo. O debounce do autocomplete já mantém o app bem abaixo disso.

Imagens são servidas direto de `cards.scryfall.io`, nunca copiadas para o
repositório.

## 7. Offline e cache

O service worker faz precache do app shell e cacheia imagens de
`cards.scryfall.io` sob estratégia CacheFirst com expiração longa.

Na prática isso basta: os decks são cadastrados em casa, com rede, e as 48
folhas são fixas — quando a mesa acontece, tudo relevante já está no cache.
Se aparecer uma imagem nova sem rede, o app degrada para exibir o nome da
carta em vez de quebrar.

Não há download proativo de todas as imagens no v1.

## 8. Casos de erro e borda

| Situação | Comportamento |
|---|---|
| Sortear com menos de 2 presentes | Botão desabilitado, mensagem "selecione ao menos 2 jogadores" |
| Presente sem nenhum deck (modo próprios decks) | Bloqueia o sorteio e nomeia quem falta cadastrar |
| Pool com menos decks que jogadores | Bloqueia o sorteio e explica quantos decks faltam |
| Draw com o sticker deck incompleto | Botão desabilitado, contador mostra "7/10" |
| Scryfall fora do ar ou sem rede no cadastro | Mensagem de erro no campo de busca; o resto do app segue funcionando |
| Imagem que não carrega | Placeholder com o nome da carta |
| Importar JSON inválido | Rejeita com mensagem, mantém o estado atual intacto |
| Partida com vencedor fora dos participantes | Impossível pela interface; validado também no domínio |

## 9. Testes

O domínio é testado com Vitest e RNG determinístico injetado:

- `drawCommanders` — modo próprios decks só entrega deck do próprio dono;
  modo pool nunca repete deck; todos os presentes recebem exatamente um
  deck; distribuição uniforme ao longo de muitas execuções; erros das
  situações de borda acima.
- `drawStickers` — sempre 3, sempre do deck, nunca repetido.
- `rankings` — contagem de vitórias e partidas, win rate, agrupamento por
  dia, comportamento com pessoas e decks arquivados.

Stores e componentes recebem testes só onde há lógica não trivial. O alvo
não é cobertura total da UI, é confiança nas três regras que ninguém
consegue conferir de olho.

## 10. Fora de escopo

Explicitamente adiado ou descartado, para não voltar como surpresa:

- Qualquer backend, conta, login ou sincronização entre aparelhos.
- Múltiplos sticker decks ou sticker deck por jogador.
- Partner, background ou segundo comandante no mesmo deck.
- Regra de "não repetir o deck da sessão anterior" no sorteio.
- Life counter (mercado saturado, muita UI para pouco retorno).
- Cache offline proativo de todas as imagens.
- Empate em partida (todo `Match` tem exatamente um vencedor).
- Build nativo com Expo, TestFlight, App Store.
