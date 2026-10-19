# Game rules are a deterministic package

All Heynbord game rules (Battle, Deck rules, Workshop, rewards, enemy AI and the Profile model) are in `packages/rules` (`@workspace/rules`). The package is pure TypeScript. It does not use React, Three.js or the DOM. The Three.js scene in `apps/web` only plays the Battle Events that the rules return. It never calculates a rule. All random results come from a seeded generator in the Battle state. All game values are integers. Thus the same seed and the same Commands always give the same result, on every browser and on a server.

We did this for three reasons. First, v2 adds asynchronous PvP: the server must run a Battle again from its seed and Commands, and accept the result only if it is the same. Second, replays and bug reports need only the seed and the Command list. Third, balance and economy simulations can run thousands of Battles without rendering.

## Considered Options

- **Rules inside the scene in `apps/web`.** Rejected. It is faster to start, but the rules then depend on frame timing and on React. It is very difficult to move them to a server later.
- **The name `packages/core`.** Rejected. [ADR-0004](./0004-module-resolution-has-a-single-source-of-truth.md) removed `@workspace/core` and says "do not restore" it. A new package with the same name gives confusion. `rules` also says what the package contains.

## Consequences

- Do not use `Math.random()`, `Date.now()` or floating-point game values in `packages/rules`.
- Rule unit tests are pure module logic, as in [ADR-0001](./0001-unit-tests-are-pure-module-logic.md).
- The package returns IDs and values, not text. `apps/web` owns the Message Catalogs.

## Amendments

**2026-10-03 — the rules use Effect data modules ([ADR-0007](./0007-effect-is-the-application-runtime.md)).** The package uses `Schema` (in place of Zod) for content data and save data, `Data.TaggedEnum` and `Match` for `Command` and `BattleEvent`, and `Array`, `Option` and `Result`. `step(state, command)` stays a synchronous pure function. It returns a `Result`. The package does not use the Effect runtime, the `Random` service or `Clock`: the seeded random state stays in `BattleState`, so a replay needs only the seed and the Commands, and headless simulations have no runtime cost in each `step`. All the consequences above stay true.

The package scaffold (`package.json`, `tsconfig.json`, a Vitest project) comes with the first rule code. An empty package fails two checks: the pre-commit `fallow fix` removes a dependency that no code imports, and Vitest fails a project with no tests (`passWithNoTests: false`).
