# Rendering

The app runs on [TanStack Start](https://tanstack.com/start). The server renders and streams the full HTML document for each request. Then React hydrates it.

## Rules

- Do not make a module-level router, `AtomRegistry`, or other per-user store. `getRouter()` in `src/router.tsx` makes new ones for each request. Get them with `useRouter()`, the atom hooks of `@effect/atom-react`, or the route `context` (`context.registry`).
- Set `ssr` on each route:

  | Mode | Use it when |
  | --- | --- |
  | `true` | The page is public and must have content in the HTML. |
  | `"data-only"` | The server can load the data, but the component needs the browser (for example, WebGL). |
  | `false` | `beforeLoad` or `loader` reads browser-only state, for example `localStorage`. |

- Put server-only code in `*.server.ts`. The build fails if client code imports a `*.server.ts` file.
- Export server functions from `*.functions.ts`. Give each one that takes input a `.validator(Schema.toStandardSchemaV1(...))`. Its handler runs an Effect with `runServerFn(contract, effect)`, and the client calls it with `contract.call(...)`. See [Effect](effect.md#server-functions) and `src/features/i18n/locale.functions.ts`.
- Validate search params with `Schema.toStandardSchemaV1(...)` in `validateSearch`. See `src/routes/master-design.tsx`.
- An atom that a server render reads must not need the browser. Give it a server value with `Atom.withServerValue(...)`. See `src/features/color-mode/color-mode.atoms.ts`.
- In a loader, use `await` only for data that the first paint must have. Return other promises without `await`, so they stream.
- Use the route `head()` for meta tags. See [SEO](seo.md).
- Keep the CSRF middleware in `src/start.ts` if you add more request middleware.

## Offline (PWA)

Pages are network-first. The service worker keeps each page that the user opens. Offline, a page that the user did not open shows `public/offline.html`. A route that calls a server function in its `loader` does not work offline.

## Deployment

Nitro builds the server. It finds Vercel with no configuration. For a different runtime, set `NITRO_PRESET` (for example `bun` or `netlify`) for the build. For Node.js, use `bun run build`, then `bun run start`.

Response headers are Nitro `routeRules` in `vite.config.ts`.
