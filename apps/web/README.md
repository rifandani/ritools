# @workspace/web

## Scripts

- `bun brand:gen` writes the icon set and `src/features/og/glyph-atlas.generated.ts` — the letterforms the Open Graph card prints from. It cuts the icons from `public/logo.png` and never overwrites that logo.
- `bun brand:shots` captures the manifest screenshots from the running app, with a real Batch in it.

## Maintenance

- /improve-codebase-architecture
- /improve-codebase-architecture to use /effect ecosystem in both FE and BE
- refactor whole codebase (except master-design) to follow best practices for react and composition patterns from /vercel-composition-patterns and /vercel-react-best-practices

## Todo

### Core

- 4a, 4b, 4c, 4d. Later work is new Tools. Each new Tool follows the Stage 3 pattern: shape, then engine, then UI, inside the established world.
- /impeccable shape refactor our "/squeeze" route to look (dont copy the design as is, i mean only the direction/pattern) and have functionality like this [initial image], after we fill in with images [filled in input fields]

### Infra

- add alchemy + cloudflare binding
