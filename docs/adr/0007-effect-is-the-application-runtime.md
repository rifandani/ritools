# Effect is the application runtime, and Atom replaces TanStack Query

All logic in `apps/web` that is not rendering runs as Effect v4 programs: I/O, validation, config, logging and decisions, on the server and in the browser. Shared app state and server-derived state are Effect Atoms (`effect/reactivity` with `@effect/atom-react`). TanStack Query is removed. `packages/rules` uses Effect data modules (`Schema`, `Data`, `Match`, `Array`, `Result`), but its `step()` stays a synchronous pure function. We did this for three reasons. First, one model for typed errors, dependencies and validation from the server function to the component. Second, Schema replaces Zod in the app and in the rules content and save data, so there is one schema language in the repo. Third, typed failures go across the server-function wire, so atoms get the same error types as the server.

## Considered Options

- **`tim-smart/effect-atom` (`@effect-atom/atom-react`).** Rejected. It needs Effect v3. The same design, by the same author, is in Effect v4 core as `effect/reactivity` with `@effect/atom-react`. Do not add `@effect-atom/*` packages.
- **Keep TanStack Query next to Atom.** Rejected. Two caches for server state give two sources of truth and two SSR hydration paths. Atom does the same work: one `AtomRegistry` for each request in the router context, loaders `await AtomRegistry.getResult`, and the router's `dehydrate`/`hydrate` call `Hydration` for `Atom.serializable` atoms.
- **Effect `HttpApi` or `Rpc` as the backend transport.** Not now. `createServerFn` stays as a thin transport. Its handler decodes input with Schema, runs an Effect on a server `ManagedRuntime`, and encodes the result with `Schema.Exit`. This keeps the CSRF middleware, the loaders and the SSR calls. Domain logic is in Effect services, so a move to `HttpApi` or `Rpc` (for example for v2 asynchronous PvP) changes only the transport.
- **Effect programs in `packages/rules` (`step()` returns an `Effect`, random from `Random.withSeed`).** Rejected. The random state then is in a service, not in `BattleState`, so replays and checks of a Battle that is not finished become harder. A runtime in each `step()` also slows the headless balance simulations. [ADR-0006](./0006-game-rules-are-a-deterministic-package.md) stays true.

## Consequences

- React `useState` stays only for ephemeral, component-local UI state (React Aria internals, `core/components/ui`, DOM utility hooks). Shared, persisted or server-derived state is an atom.
- `zod`, `ky`, `@t3-oss/env-core`, `ts-pattern` and `radashi` are replaced by `Schema`, `HttpClient`, `Config`, `Match` and the Effect data modules. `core/utils/logger` is replaced by the Effect `Logger`.
- Components do not call `Effect.runPromise`. Effectful atoms come from one `Atom.runtime(ClientLayer)`.
- Unit tests test atoms with `AtomRegistry.make()` and services with `@effect/vitest` and test layers. MSW stays the network boundary ([ADR-0001](./0001-unit-tests-are-pure-module-logic.md), [ADR-0002](./0002-network-boundary-mocking-with-msw.md)).

## Amendments

**2026-10-03 — what the first implementation changed.**

- There are two atom runtimes, not one. `appRuntime` holds services that also build during a server render. `storageRuntime` holds `BrowserKeyValueStore.layerLocalStorage` for `Atom.kvs` atoms. A server render must never build it, because the server has no `localStorage`.
- A loader reads atoms with `AtomRegistry.getResult` when the value is shared state. A loader can run an Effect with `Effect.runPromise` when the value is only data for its route. The root loader gets the request Locale in this way, and the root component seeds `localeAtom` from it. The `Hydration` path in the router has unit tests, but no `Atom.serializable` atom uses it yet.
- `@effect/language-service` is not installed. The repo uses TypeScript 7 (native), which does not load TS plugins. `@effect/tsgo` replaces the compiler, and we did not take that risk for editor diagnostics.
