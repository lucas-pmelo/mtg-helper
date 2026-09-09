# Leitor de carta estrangeira

Data: 2026-09-09
Status: aprovado, pronto para implementação

## Problema

Alguém na mesa puxa uma carta em japonês, russo ou chinês. A partida para
enquanto três pessoas tentam achar a carta no Google pelo desenho. Acontece
várias vezes por noite e cada ocorrência custa 2-3 minutos.

## A ideia central

A carta já se identifica sozinha. Desde o frame M15 (2014), toda carta traz no
rodapé o número de coleção e o código do set **em caracteres latinos, mesmo nas
cartas japonesas e chinesas**: `123/291 MH3 · PT`.

O Scryfall resolve isso direto:

```
GET /cards/mh3/125/pt  -> printed_name: "Capturador Infernal"
                          printed_text: "Aproveitar (Quando esta criatura entra..."
                          image_uris.normal: a imagem da carta em português
GET /cards/neo/33/ja   -> printed_name: "穢れの一掃"  (name: "Repel the Vile")
```

Dois campos triviais de digitar entregam nome, texto e a imagem da versão
traduzida. OCR do nome estrangeiro ou reconhecimento de arte são caminhos muito
piores para o mesmo destino.

## Escopo

**Nesta entrega:** entrada manual do código, busca, exibição e cache local.

**Fora desta entrega:** câmera e OCR. O caminho é conhecido e fica reservado —
`<input type="file" capture="environment">` fotografa o rodapé e pré-preenche os
dois campos, sem `getUserMedia` (que tem bugs de permissão em PWA standalone no
iOS). Mas os campos manuais são o produto; o OCR seria só um acelerador, e não
vale as 8-14h de calibração antes de saber se a mesa usa a feature.

**Também fora, por decisão:** o leitor não cadastra nada. Não vira deck, não vira
pessoa, não escreve no histórico. É uma consulta que se faz em pé, lê e fecha.

## Decisões tomadas

| Decisão | Escolha | Por quê |
|---|---|---|
| Sem versão em PT | Cai pro idioma original com aviso | Ler inglês já resolve "a carta está em japonês"; um erro seco deixaria na mão justo no caso alvo |
| Navegação | 6ª aba "Carta" | Um toque no meio da partida, que é quando se precisa |
| Cache | Texto no `localStorage` + lista de recentes | A mesma carta reaparece a noite toda; funciona sem rede |
| Onde o cache mora | Store Zustand persistido | Igual aos três stores que já existem; cache vira função pura testável |
| Imagens | Service worker | Já cacheia `cards.scryfall.io` com `CacheFirst`; nenhuma config nova |
| Backup | Cache **não** entra | Dado descartável e re-buscável; o backup protege o insubstituível |

## Modelo de dados

Em `src/domain/types.ts`:

```ts
export type CardLookup = {
  key: string;             // "mh3/125" — normalizado, minúsculo
  set: string;
  collectorNumber: string;
  lang: string;            // idioma que de fato voltou: "pt", "en", ...
  printedName: string;     // nome no idioma retornado
  englishName: string;     // card.name, sempre em inglês
  typeLine: string;        // printed_type_line ?? type_line
  text: string;            // printed_text ?? oracle_text
  image: string;           // image_uris.normal do idioma retornado
  fetchedAt: string;       // ISO, ordena as recentes
};
```

`englishName` é guardado de propósito: é por ele que se acha ruling e discussão
online, e vem de graça na mesma resposta (o `name` do Scryfall é sempre inglês,
mesmo pedindo `/pt`).

## Camada de dados

Em `src/data/scryfall.ts`:

```ts
export async function fetchPrintedCard(
  set: string,
  collectorNumber: string,
  signal?: AbortSignal,
): Promise<CardLookup>
```

Tenta `/cards/{set}/{n}/pt`; no 404, cai pra `/cards/{set}/{n}`. O `lang` da
resposta é o que a tela usa pra decidir se mostra o aviso — não presumir, ler o
que o Scryfall disse.

Isso exige um ajuste no `get()` existente: hoje ele transforma qualquer resposta
não-ok num `Error` genérico, então não dá pra distinguir "não existe em PT" (404,
esperado, fallback) de "o Scryfall caiu" (500). Adicionar um `getOrNull()` que
devolve `null` no 404 e continua lançando no resto. **O `get()` atual fica
intocado e as duas funções existentes não mudam.**

Cartas de duas faces carregam as imagens nas faces, não na raiz — reusar
exatamente a lógica que `toCardRef` já tem para isso.

## Domínio

Módulo novo `src/domain/cards/cardCache.ts`, tudo função pura:

```ts
export const MAX_RECENT = 20;

export function cardKey(set: string, collectorNumber: string): string;
export function checkLookup(set: string, collectorNumber: string): string | null;
export function rememberCard(recent: CardLookup[], card: CardLookup): CardLookup[];
export function findCard(recent: CardLookup[], key: string): CardLookup | undefined;
```

`checkLookup` segue a convenção de `checkDraw` e `checkMatch`: devolve a razão em
português para a tela mostrar, ou `null` quando válido. Cobre set vazio, número
vazio e caracteres fora de `a-z 0-9` no set. **O número aceita letra** — existe
`125a` e números de cartas promocionais; isso o Scryfall julga, não o app.

`rememberCard` insere no topo, deduplica pela `key` (consultar de novo promove em
vez de duplicar) e corta em `MAX_RECENT`.

`cardKey` normaliza com `trim` + `toLowerCase` e nada mais. Não remover zero à
esquerda: `005` e `5` são a mesma carta pro Scryfall, mas normalizar isso do lado
do app é adivinhação sobre um formato que não controlamos. O custo de errar é uma
entrada duplicada no cache, não uma busca errada.

## Store

`src/stores/cardStore.ts`, no mesmo molde dos três existentes:

```ts
type CardState = {
  recent: CardLookup[];
  remember: (card: CardLookup) => void;
  clear: () => void;
};
```

Com `persist` e chave nova `cards: 'mtg-helper:cards'` no `STORAGE_KEYS`.

O store **não busca nada** — só guarda. O `fetch` fica na tela, que é onde o
`CardAutocomplete` já faz isso hoje. Não inventar padrão novo.

O `storage.ts` fica intocado fora da linha do `STORAGE_KEYS`: o cache não entra
no `Backup`.

Espaço: ~1 KB por carta, 20 recentes = ~20 KB dos ~5 MB que o Safari dá por
origem. O limite de 20 é sobre a lista ficar navegável, não sobre espaço.

## Tela

`src/ui/screens/CardScreen.tsx`, registrada como 6ª aba em `App.tsx` com um ícone
novo no `Icon.tsx`. Posição na tab bar: **antes de Ajustes** — Ajustes continua
sendo a última, que é onde se espera achá-la.

**Campos.** Set com `autocapitalize="characters"` e `autocorrect="off"` — sem
isso o iOS "corrige" `MH3`. Número com teclado de texto, **não** numérico:
`inputMode="numeric"` mostraria só dígitos no iPhone e impediria digitar `125a`.
Trade-off consciente: troca-se de camada pra digitar número, mas nenhum código
fica impossível.

**Resultado.** Imagem grande (é o que resolve a mesa), nome impresso, nome em
inglês abaixo em tom mudo, tipo e texto. Quando o `lang` retornado não é `pt`,
uma pill de aviso "sem versão em português" aparece acima da imagem.

**Recentes.** Sempre listadas embaixo. Tocar numa delas **não busca nada** — lê
do cache e pinta na hora.

## Erros

| Situação | Tratamento |
|---|---|
| Campo vazio ou set inválido | `checkLookup` desabilita o botão e mostra a razão, igual ao Sortear |
| 404 nos dois idiomas | "Não achei a carta MH3 125. Confira o código no rodapé." |
| Sem rede | "Sem conexão. As cartas já consultadas continuam aí embaixo." — a lista de recentes continua funcionando |
| Scryfall fora do ar | "Não foi possível falar com o Scryfall" |

Busca em andamento é cancelada por `AbortController` se outra começar — mesmo
padrão do `CardAutocomplete`.

## Testes

- `src/domain/cards/cardCache.test.ts` — puro, sem mock: dedupe, promoção ao
  topo, corte em 20, validação de entrada.
- `src/data/scryfall.test.ts` — casos novos pro `fetchPrintedCard` usando o
  `stubFetch` que já existe no arquivo: caminho PT, fallback no 404, erro de
  rede. O `stubFetch` atual devolve uma resposta fixa; **estendê-lo pra responder
  por URL sem quebrar os testes que já o usam.**
- `src/stores/cardStore.test.ts` — persistência e `remember`.
- `src/ui/App.test.tsx` — a asserção `toHaveLength(5)` da tab bar vira 6, mais um
  caso cobrindo a aba Carta renderizando.

## Verificação

`npm test`, `npm run validate` e `npm run build` verdes.

## Contexto: este é o bloco 1 de 4

As sete features pedidas foram decompostas em quatro blocos, nesta ordem:

1. **Leitor de carta estrangeira** (este spec) — isolado, não toca em nada.
2. **Temporadas + head-to-head** — análise sobre `Match[]`; temporadas mexe no
   modelo de dados e no backup.
3. **Sorteio inteligente** — anti-repetição, handicap e draft de comandantes.
   Os três mexem na assinatura de `drawCommanders`; fazer juntos evita mudá-la
   três vezes.
4. **Registro em um toque** — depende do formato de saída do bloco 3.

Temporadas vem antes do handicap de propósito: o handicap usa win rate, e
temporadas redefine o que win rate significa (campeonato inteiro ou temporada
corrente). Ordem invertida obrigaria a reajustar o handicap depois.
