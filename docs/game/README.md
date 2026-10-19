# Heynbord game documents

These documents define **Heynbord**. Heynbord is a web game: a fantasy collectible card game with lane battles that resolve automatically. It is a spiritual successor to *Kings and Legends* (2013) and *Rise of Mythos* (2013–2019).

All documents use ASD-STE100 Simplified Technical English.

## Reading order

| No. | Document | Purpose | Owner |
| --- | --- | --- | --- |
| 01 | [Design Pillars](./01-design-pillars.md) | The 5 rules that all design decisions must obey. | Game director |
| 02 | [Game Vision](./02-game-vision.md) | What Heynbord is, who it is for, and why it exists. | Game director |
| 03 | [Game Design](./03-game-design.md) | The full rules: battle, cards, progression, modes and content. | Game designer |
| 04 | [Product Requirements](./04-prd.md) | Requirements with IDs and priorities for v1, and release criteria. | Product owner |
| 05 | [Art and Audio Direction](./05-art-direction.md) | Visual style, AI art workflow, camera, UI and audio. | Art director |
| 06 | [Technical Design](./06-technical-design.md) | Architecture, the rules package, rendering, save data and tests. | Lead engineer |
| 07 | [Economy](./07-economy.md) | Currencies, sources and sinks, packs, costs and future monetization rules. | Game designer |
| 08 | [Roadmap](./08-roadmap.md) | Milestones for v1 and the plan after v1. | Product owner |

One person (the solo developer) has all the roles. The roles show which point of view each document has.

## Related files

- [`packages/rules/CONTEXT.md`](../../packages/rules/CONTEXT.md): the game glossary. All documents use its terms.
- [ADR-0006](../adr/0006-game-rules-are-a-deterministic-package.md): why the game rules are a separate deterministic package.

## Status of names

A name marked **(draft)** is a proposal. You can change it without a new design review. Before release, do a trademark check on the game name and all draft names.

## Decision record

These decisions come from a design review on 2026-10-03:

| Topic | Decision |
| --- | --- |
| Product type | Spiritual successor. All names, lore, units and art are new. |
| Online scope | v1 is single player with a local save. v2 adds asynchronous online play. |
| Business model | Free-to-play with cosmetics only. v1 has no shop. |
| Visual style | 2.5D: card art on planes in a 3D scene. |
| Team | One developer. AI tools make the art. |
| Schedule | Playable alpha in about 3 months. v1.0 in about 6 months. |
| Platform | Desktop browser first. The layout also works on mobile in landscape. |
| App structure | The game is in `apps/web` with React Three Fiber. The rules are in `packages/rules`. |
| World and tone | Heynbord is the name of the world. Bright high fantasy with some humor. |
| Resource system | Countdown hand, as in the original. |
| Board | Lanes, 12 squares long. v1 stages use 1 to 3 lanes. Co-op later uses 4. |
| Battle control | Automatic and deterministic, with speed control and auto-play. |
| v1 card set | 4 classes, 4 races, 5 ranks, about 100 cards. |
| Progression | Combine (no failure), Extract, Craft and hero gear. No Energy and no VIP. |
| Languages | `en-us` and `id-id` from v1. |
