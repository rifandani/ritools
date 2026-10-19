# Effect

Logic that is not rendering is an Effect v4 program. Shared state and server data are Effect Atoms. The reasons are in [ADR-0007](../../../docs/adr/0007-effect-is-the-application-runtime.md). For API questions, use the `effect` skill and `repos/effect`.

## Files

Keep `src/routes/` thin. `src/core/` holds shared infrastructure. A feature lives in `src/features/<feature>/`:

| File | Holds |
| --- | --- |
| `<name>.ts` | Schemas and pure functions |
| `<name>.service.ts` | A `Context.Service` class and `static readonly layer` |
| `<name>-<role>.ts` | An Effect that needs the server, for example `locale-cookie.ts` |
| `<name>.functions.ts` | The `createServerFn` transport |
| `<name>.atoms.ts` | Atoms |
| `use-<name>.ts` | A React hook over atoms |
| `components/` | UI |
| `*.unit.test.ts` | Tests |

A service id has this form: `@heynbord/web/CdnClient`.

## Atoms

- Shared, persisted, or server-derived state is an atom. State of one component is React `useState`.
- Build an effectful atom with `appRuntime.atom` or `appRuntime.fn` (`src/core/runtime/client.ts`).
- An `Atom.kvs` atom uses `storageRuntime` and `Atom.withServerValue`. The server has no `localStorage`.
- `Atom.withServerValue` covers the atom a component reads. An atom that reads a browser-only atom needs its own server value.
- An atom that a component seeds (for example `localeAtom`) is `Atom.keepAlive`.
- An atom whose value the server sends to the browser is `Atom.serializable({ key, schema })`.

## Config

- Effect code reads the `AppConfig` service (`src/core/config/app-config.ts`). The server runtime provides it.
- Synchronous code, for example a route `head()`, reads `APP_CONFIG`.
- Only `src/core/config/env.ts` reads `import.meta.env`.

## Loaders

- A loader reads an atom with `AtomRegistry.getResult(context.registry, atom)` when the value is shared state.
- A loader can run an Effect with `Effect.runPromise` when the value is only data for its route. An example is the request Locale in `src/routes/__root.tsx`.

## Server functions

A server function is a thin transport. Copy `src/features/i18n/locale.functions.ts`.

- `makeServerFnContract` encodes the Effect `Exit` as JSON. A typed failure on the server is the same tagged error in the browser. A defect becomes the text "Internal server error" in the browser ([Observability](observability.md)).
- A call that does not finish, or a response that does not decode, fails with `ServerFnError`.
- Read the request from `ServerRequest`. `runServerFn` copies the request before the Effect starts and writes cookies after it ends. TanStack `getCookie` and `setCookie` read AsyncLocalStorage, and a fiber can run on another request.

## Errors

- Define an error with `Schema.TaggedError`. Fail with `return yield* new MyError({...})`.
- A service defines a `Schema.TaggedError` for each failure of its domain. A service that only sends HTTP requests (for example `CdnClient`) can fail with `ApiError | HttpClientError`. These errors are tagged, and `toErrorMessage` reads them.
- A non-2xx HTTP response is `ApiError { status, envelope, text }`. `envelope` is an `Option`.
- Show a person the text from `toErrorMessage` in `@/core/utils/error`.

## Tests

- Test an Effect with `it.effect` from `@effect/vitest`. Use `it.live` when the test needs real time or the real scheduler, for example an atom that runs an Effect.
- Test an atom with `AtomRegistry.make()`: `get`, `set`, `mount`, and `AtomRegistry.getResult` for an `AsyncResult`.
- Give a service its dependencies with `Effect.provide(layer)` or `Effect.provideService(Tag, fake)`. MSW is the network boundary ([ADR-0002](../../../docs/adr/0002-network-boundary-mocking-with-msw.md)).
- Put logic in a tested sibling of a framework seam. Coverage omits `*.functions.ts`, `*.server.ts`, `core/config/env.ts`, `core/runtime/client.ts`, and `use-*.ts` (`vitest.config.ts`).
