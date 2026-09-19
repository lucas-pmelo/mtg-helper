# MTG Helper

[![CI](https://github.com/lucas-pmelo/mtg-helper/actions/workflows/ci.yml/badge.svg)](https://github.com/lucas-pmelo/mtg-helper/actions/workflows/ci.yml)

A tabletop companion for Magic: The Gathering Commander, built for the one phone
that sits in the middle of the table. It is a local-only PWA: no backend, no
accounts, no sign-in. Add it to the home screen from Safari and it behaves like
an app.

> Leia em [português](README.pt-BR.md).

## What it does

- **Commander draw** — pick who is at the table, then let chance hand out the
  decks. Each player from their own decks, or everyone from a single pool, since
  playing someone else's deck is common. Three options combine freely: *avoid
  repeats* skips the deck you played last session, *handicap* gives the decks
  that win least a better shot at coming out, and *draft* deals three commanders
  per player to choose from, in turn.
- **Sticker deck** — draws the ten Unfinity sticker sheets the rules ask for.
- **Match history** — record the match in one tap straight from the draw, or by
  hand. Rankings by player and by deck, seasons with their own date range, and
  head-to-head between any two players.
- **Foreign card reader** — type the set code and number from a card's footer to
  read it in Portuguese. Cards old enough to have no set code are found by the
  two numbers they do print (`95/143`: the card number and the size of the set).

Everything is in Portuguese in the interface, on purpose: it is the language of
the table this was built for. The code and its comments are in English.

## Stack

React 19, TypeScript, Vite, Zustand, Vitest. Card data comes from the
[Scryfall API](https://scryfall.com/docs/api). No server of our own.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

To try it on a phone on the same network: `npm run dev -- --host`, then open the
address it prints.

## Verifying

```bash
npm test           # full suite (Vitest)
npm run coverage   # coverage of domain/, data/ and stores/
npm run validate   # tsc --noEmit
```

`domain/`, `data/` and `stores/` are held at 100% coverage.

## Building and deploying

```bash
npm run build      # typecheck + bundle into dist/
npm run preview    # serve dist/ locally
```

`dist/` is static, so it runs anywhere — Vercel, Netlify, GitHub Pages. This
repository deploys to Vercel: merging into `main` publishes to production, and
every pull request gets its own preview URL.

## Your data lives on your phone

There is no server, so there is nothing to sync and nothing to lose a password
to. The flip side: everything lives in `localStorage`, and iOS evicts storage
without warning. Match history cannot be reconstructed — export a backup from
**Ajustes → Exportar backup** now and then.

## Static data

`src/data/sheets.json` holds the 48 Unfinity sticker sheets (`set:sunf`), fetched
from Scryfall once. It is immutable 2022 data and is never fetched at runtime.
Regenerate it with `npm run generate:sheets`.

## Design notes

Each feature was designed before it was built, and the design documents are kept
in [`docs/superpowers/specs/`](docs/superpowers/specs/). They are the fastest way
to understand why something works the way it does.

## Contributing

Pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the setup,
the conventions this codebase follows, and what CI expects. By participating you
agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © 2026 Lucas Melo.
