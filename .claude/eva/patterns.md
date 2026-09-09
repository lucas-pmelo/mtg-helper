---
id: mtg-helper
scope: local
confidence: confirmed
updated: 2026-09-09
---

# MTG Helper — local patterns

PWA local-only (React + TypeScript + Vite + Zustand, sem backend). Estas regras
**têm precedência** sobre a base global onde as duas falam do mesmo assunto.

## Validação é `checkX(...): string | null`, no domínio

**Rule:** validação de entrada mora no domínio como uma função
`checkX(...): string | null`, que devolve a razão em pt-BR ou `null` quando a
ação pode acontecer. A tela usa o retorno para desabilitar o botão e exibir o
motivo. Nada de exception no caminho feliz.

**Why:** a tela precisa do motivo para mostrar ao usuário, não só do fato de que
falhou — uma exception obrigaria a tela a formatar mensagem a partir do tipo do
erro, e a razão deixaria de ser testável como valor.

**Override de:** `error-handling.md` (global), que manda lançar classes de erro
tipadas e validar no adapter. Aqui não há camada HTTP nem status para escolher:
o consumidor da validação é uma tela.

**✅**
```ts
export function checkLookup(set: string, collectorNumber: string): string | null {
  if (!normalizeCode(set)) return 'Digite o código do set';
  return null;
}

// na tela
const reason = checkLookup(set, collectorNumber);
<button disabled={Boolean(reason)}>Buscar</button>
{reason && <p className="error">{reason}</p>}
```

**❌** `if (!set) throw new ValidationError('set obrigatório')`

_Evidence: src/domain/commanders/drawCommanders.ts:22,
src/domain/history/checkMatch.ts:5, src/domain/cards/cardCache.ts:21; consumo em
src/ui/screens/CardScreen.tsx:31._

## O store guarda; a tela busca

**Rule:** um store Zustand guarda estado e delega regra ao domínio. Nenhuma
chamada de rede dentro do store — o `fetch` vive no componente que dispara a
ação, com `AbortController` cancelando a busca anterior.

**Why:** o store fica testável sem mock de rede, e cancelamento e estado de
carregamento pertencem à tela que os exibe. Um store que busca acopla
persistência a I/O e obriga todo teste de estado a simular a rede.

**✅**
```ts
// store: só guarda
remember: (card) => set((state) => ({ recent: rememberCard(state.recent, card) })),

// tela: busca e cancela
pending.current?.abort();
const found = await fetchPrintedCard(set, number, controller.signal);
```

_Evidence: src/stores/cardStore.ts:17, src/ui/components/CardAutocomplete.tsx:31,
src/ui/screens/CardScreen.tsx:34; peopleStore, stickerStore e historyStore não
têm rede alguma._

## Arquivos: camelCase para módulos, PascalCase para componentes

**Rule:** módulos em camelCase (`cardCache.ts`, `drawCommanders.ts`,
`historyStore.ts`); componentes React em PascalCase (`CardScreen.tsx`,
`CardImage.tsx`). **Exceção:** fábricas de teste seguem kebab-case
(`make-card-lookup.ts`), como na base global.

**Why:** é o idioma do ecossistema React — o nome do arquivo casa com o nome do
componente exportado, e o import fica previsível.

**Override de:** `naming.md` (global), que pede kebab-case para todo arquivo.

_Evidence: src/domain/cards/cardCache.ts, src/stores/cardStore.ts,
src/ui/screens/CardScreen.tsx, src/tests/factories/make-card-lookup.ts._
