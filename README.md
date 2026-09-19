# MTG Helper

PWA local-only para apoiar a mesa de Magic (Commander/EDH). Roda em um único
celular iOS, adicionado à tela de início pelo Safari. Sem backend, sem contas.

Design: [`docs/superpowers/specs/2026-09-09-mtg-helper-design.md`](docs/superpowers/specs/2026-09-09-mtg-helper-design.md)

## Rodar

```bash
bun install
bun run dev        # http://localhost:5173
```

Para testar no celular na mesma rede: `bun run dev --host` e abra o IP
mostrado no Safari.

## Build

```bash
bun run build      # typecheck + bundle em dist/
bun run preview    # serve o dist/ localmente
```

O `dist/` é estático: sobe em Vercel, Netlify ou GitHub Pages. O service worker
faz precache do app shell e cacheia as imagens de `cards.scryfall.io` com
CacheFirst.

## Verificação

```bash
bun run test       # suíte completa (Vitest) — use `run`, `bun test` é outro runner
bun run coverage   # cobertura de domain/, data/ e stores/
bun run validate   # tsc --noEmit
```

## Dados estáticos

`src/data/sheets.json` traz as 48 sticker sheets do Unfinity (`set:sunf`),
buscadas uma vez do Scryfall. É dado imutável de 2022 e nunca é consultado em
runtime. Para regerar:

```bash
bun run generate:sheets
```

## Backup

Os dados vivem no `localStorage` do aparelho. O Safari faz eviction de storage
sem aviso, e o histórico de partidas é insubstituível — use Ajustes →
Exportar backup de vez em quando.
