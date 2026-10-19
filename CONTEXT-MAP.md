# Context Map

## Contexts

- [web](./apps/web/CONTEXT.md) — React app on TanStack Start (server-rendered)
- [rules](./packages/rules/CONTEXT.md) — Heynbord game rules: Battles, cards, Decks, progression and rewards

## Relationships

- web owns Message Catalogs, `initI18n`, and the React Translation Provider
- web → rules: web sends Commands to rules and plays the Battle Events that rules return. rules has no knowledge of rendering, React or Locale
- rules returns IDs and values. web changes them into text with its Message Catalogs
