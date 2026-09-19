# Contributing

Thanks for taking an interest. This is a small project with one maintainer, so
the process is light — but the conventions below are what keep it small.

## Getting set up

```bash
npm install
npm run dev        # http://localhost:5173
```

Node 22 or newer. No environment variables, no services to start: the app talks
only to the public Scryfall API and stores everything in `localStorage`.

## Before you open a pull request

```bash
npm run validate   # tsc --noEmit
npm test           # the full Vitest suite
npm run build      # typecheck + production bundle
```

CI runs exactly these three, in this order, on every pull request. Running them
locally first saves a round trip.

`domain/`, `data/` and `stores/` sit at 100% coverage (`npm run coverage`), and
the intent is to keep them there. The UI is covered by flow tests in
`src/ui/App.test.tsx` rather than by chasing a number.

## Write the test first

Every behaviour change starts with a failing test. Not as a ritual: a test
written afterwards passes immediately, which proves nothing about whether it
would have caught the bug.

- One behaviour per test, named after the behaviour.
- Use the real code. Mocks only where the network makes them unavoidable — see
  `stubFetch` in `src/data/scryfall.test.ts`.
- Test factories live in `src/tests/factories/`.

## Conventions this codebase follows

These are not preferences invented for this document; they are the rules the
existing code already obeys. Matching them keeps a pull request easy to read.

**Validation is `checkX(...): string | null`, and it lives in the domain.**
Input validation returns the reason in Portuguese, or `null` when the action can
happen. The screen uses that return to disable the button and show the reason.
No exceptions on the happy path.

```ts
export function checkLookup(set: string, collectorNumber: string): string | null {
  if (!normalizeCode(set)) return 'Digite o código do set';
  return null;
}
```

**The store keeps; the screen fetches.** A Zustand store holds state and
delegates rules to the domain. No network calls inside a store — `fetch` lives
in the component that triggers it, with an `AbortController` cancelling the
previous request. This keeps stores testable without mocking the network.

**File names:** camelCase for modules (`cardCache.ts`, `drawCommanders.ts`),
PascalCase for React components (`CardScreen.tsx`), kebab-case for test
factories (`make-card-lookup.ts`).

**Where things go:** `src/domain/` is pure logic with no React and no I/O,
`src/data/` talks to Scryfall and to storage, `src/stores/` holds state, and
`src/ui/` renders. Dependencies point inward — the domain imports from nobody.

**Language:** code, comments and test names in English; anything a player reads
in Portuguese. Comments explain why, not what.

## Commits

The history uses a light Conventional Commits style — `feat:`, `fix:`, `docs:`,
`refactor:`, `test:` — with the subject in the imperative. Keep commits focused;
a commit that touches one thing is a commit that can be reverted.

## Pull requests

- Branch off `main`, open the PR against `main`.
- `main` is protected: merges require a green CI run and a review.
- Every PR gets its own Vercel preview URL — use it to check the change on a
  phone-sized screen, since that is the only screen this app was designed for.
- If the change alters behaviour, say how you verified it. "Tests pass" is
  enough when the tests cover it.

## Design documents

Larger features were designed before they were written, in
[`docs/superpowers/specs/`](docs/superpowers/specs/). If you are proposing
something substantial, open an issue first and we can sketch it there — it is
much cheaper than discovering the disagreement in a diff.

## Code of Conduct

By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
