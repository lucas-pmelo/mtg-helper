# MTG Helper

[![CI](https://github.com/lucas-pmelo/mtg-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/lucas-pmelo/mtg-helper/actions/workflows/ci.yml)

PWA local-only para apoiar a mesa de Magic (Commander/EDH). Roda em um único
celular iOS, adicionado à tela de início pelo Safari. Sem backend, sem contas.

> Read this in [English](README.md).

## O que ele faz

- **Sorteio de comandantes** — quem está na mesa hoje, e quem joga com o quê.
  Cada um com os próprios decks ou todos num pool único (jogar com o deck do
  outro é comum na mesa). Com três opções que se combinam: *evitar repetição*
  pula o deck da última sessão, *equilibrar* faz quem ganha menos sair mais, e
  *draft* dá três cartas para cada um escolher, na vez.
- **Sticker deck** — sorteia as 10 folhas de sticker do Unfinity, como manda a
  regra.
- **Histórico** — registra a partida em um toque a partir do sorteio, ou na mão.
  Ranking por jogador e por deck, temporadas com data de início e fim, e
  head-to-head entre dois jogadores.
- **Leitor de carta estrangeira** — digite o set e o número do rodapé e veja a
  carta em português. Cartas antigas, que não trazem o código do set, se acham
  pelos dois números do rodapé (`95/143`: o número da carta e o tamanho do set).

Design: [`docs/superpowers/specs/`](docs/superpowers/specs/)

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

Para testar no celular na mesma rede: `npm run dev -- --host` e abra o IP
mostrado no Safari.

## Build

```bash
npm run build      # typecheck + bundle em dist/
npm run preview    # serve o dist/ localmente
```

O `dist/` é estático: sobe em Vercel, Netlify ou GitHub Pages. O service worker
faz precache do app shell e cacheia as imagens de `cards.scryfall.io` com
CacheFirst.

## Verificação

```bash
npm test           # suíte completa (Vitest)
npm run coverage   # cobertura de domain/, data/ e stores/
npm run validate   # tsc --noEmit
```

## Dados estáticos

`src/data/sheets.json` traz as 48 sticker sheets do Unfinity (`set:sunf`),
buscadas uma vez do Scryfall. É dado imutável de 2022 e nunca é consultado em
runtime. Para regerar:

```bash
npm run generate:sheets
```

## Backup

Os dados vivem no `localStorage` do aparelho. O Safari faz eviction de storage
sem aviso, e o histórico de partidas é insubstituível — use Ajustes →
Exportar backup de vez em quando.

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md). Toda mudança entra por PR, com a CI
verde.

## Licença

[MIT](LICENSE).
