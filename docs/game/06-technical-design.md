# 06 — Technical Design

## 1. Summary

Heynbord runs in the existing Bun monorepo. There are two main parts:

- **`packages/rules`** (`@workspace/rules`): a pure TypeScript package with all game rules. It does not use React, Three.js or the DOM. It is deterministic.
- **`apps/web`**: the existing React app. It shows the menus, the Collection and the Workshop with React components. It shows the Battle in a Three.js scene with React Three Fiber.

[ADR-0006](../adr/0006-game-rules-are-a-deterministic-package.md) records why the rules are a separate package. [ADR-0007](../adr/0007-effect-is-the-application-runtime.md) records why `apps/web` runs its logic as Effect programs and keeps its shared state in Effect Atoms.

## 2. Architecture

```text
┌──────────────────────────── apps/web ────────────────────────────┐
│                                                                  │
│  React UI (React Aria, TanStack Router)                          │
│  Title · Camp · Deck builder · Collection · Workshop · Settings  │
│                                                                  │
│  Battle view                                                     │
│  ┌──────────────┐  Commands   ┌────────────────────────────────┐ │
│  │ Hand and HUD ├────────────►│ Battle controller              │ │
│  │ (React)      │             │ - sends Commands to the rules   │ │
│  └──────────────┘             │ - plays Battle Events in order │ │
│  ┌──────────────┐  Events     │ - controls speed and skip      │ │
│  │ 3D scene     │◄────────────┤                                │ │
│  │ (R3F, drei)  │             └───────────────┬────────────────┘ │
│  └──────────────┘                             │                  │
│                                               │                  │
│  Save store (IndexedDB) ◄── Profile ──────────┤                  │
│  Message Catalogs (en-us, id-id)              │                  │
└───────────────────────────────────────────────┼──────────────────┘
                                                │ import
┌──────────────────────── packages/rules ───────▼──────────────────┐
│  Battle engine · Card data · Deck rules · Workshop rules         │
│  Rewards · Enemy AI · Seeded random · Profile model              │
│  (pure TypeScript, no DOM, no React, no Three.js)                │
└──────────────────────────────────────────────────────────────────┘
```

In v2, a server also imports `packages/rules` and checks asynchronous PvP results with the same code.

## 3. The rules package

### 3.1 Principles

1. **Pure functions.** The main function is `step(state, command) → Result<{ state, events }, RuleViolation>`. It does not change the input state. It uses Effect data modules (`Schema`, `Data`, `Match`, `Array`, `Result`), but not the Effect runtime ([ADR-0006](../adr/0006-game-rules-are-a-deterministic-package.md#amendments)).
2. **Deterministic.** All random results come from a seeded random number generator inside the state. The package never calls `Math.random()`, `Date.now()` or other sources that change.
3. **Integer math.** All game values are integers. Percentages are stored as basis points (1% = 100). This gives the same result on all browsers and on the server.
4. **Data-driven content.** Cards, Stages, Floors and rewards are data. Effect `Schema` schemas check the data when tests run and when the app loads it.
5. **No text.** The package returns IDs and values, not text. `apps/web` changes IDs into text with the Message Catalogs.

### 3.2 Main types (draft)

```ts
type BattleState = {
  seed: RandomState;
  turnNumber: number;
  activeSide: Side;
  phase: "start" | "play" | "resolution" | "end" | "finished";
  board: Board; // lanes × 12 squares
  sides: Record<Side, SideState>; // hero, hand, deck, graveyard
  fieldEffects: FieldEffect[];
  result?: BattleResult;
};

type Command =
  | { type: "playCard"; handIndex: number; target: Target }
  | { type: "endTurn" };

type BattleEvent =
  | { type: "countdownTicked"; side: Side }
  | { type: "cardDrawn"; side: Side; cardId?: CardId } // hidden for the enemy
  | { type: "unitSummoned"; unitId: UnitId; at: SquareRef }
  | { type: "unitMoved"; unitId: UnitId; from: SquareRef; to: SquareRef }
  | { type: "unitAttacked"; unitId: UnitId; target: TargetRef }
  | { type: "damageDealt"; target: TargetRef; amount: number; damageType: DamageType; crit: boolean; blocked: boolean }
  | { type: "unitDied"; unitId: UnitId }
  | { type: "battleEnded"; result: BattleResult };
```

The Resolution Phase runs completely inside `step()` when the rules get the `endTurn` Command. The app gets the list of Battle Events and plays them as animations. The rules never wait for an animation.

### 3.3 Replay

A Battle replay is: the Battle seed, the two Decks, the Stage ID, and the list of Commands. When the app runs the same Commands again, it gets the same Battle Events. This supports:

- Replays (BAT-14)
- Bug reports: the player can export a replay file
- Result checks on the server in v2

### 3.4 Enemy AI

The AI is a function `chooseCommands(state, side) → Command[]` in the rules package. It uses only information that the side can see. It uses the score method in GDD section 9. The same function runs Auto-play.

### 3.5 Content data

- One file for each Race or Class with its card definitions.
- Card abilities use **effect templates** with parameters, for example `{ effect: "damage", amount: 3, damageType: "fire", area: { w: 2, h: 1 } }`.
- The card text in the UI comes from the same template ID and parameters. One Translation Key for each template gives the text in both languages. This keeps translation work small.

## 4. The 3D Battle scene

### 4.1 Libraries

- `three`, `@react-three/fiber`, `@react-three/drei`. Add them to `apps/web`.
- Optional: `@react-three/postprocessing` for bloom. Turn it off on low-end devices.

### 4.2 Scene structure

- One `<Canvas>` only on the Battle screen (and a small one on the Camp screen). Load the Battle scene with a lazy route, so the Three.js code is not in the first bundle.
- The Board is one glTF model for each Region skin.
- Units are planes with an alpha texture. Use one shared geometry and one material for each texture atlas.
- Damage numbers and Unit stats use drei `Text` or HTML overlays. Select the option with better performance during Milestone 1.

### 4.3 Event player

- The Battle controller keeps a queue of Battle Events.
- Each event type has an animation handler that returns a promise.
- Speed ×2 halves the duration of all animations. Skip resolves all animations at once and shows the final state.
- The scene state always comes from the last applied event. The scene never calculates game rules.

### 4.4 Input

- Desktop: drag and drop from the Hand to a Square, or click and click.
- Touch: tap the card, then tap the Square. Drag is also possible.
- Keyboard: arrow keys select the card and the Square, Enter plays, E ends the Turn.
- Use raycasting on the Squares of the Summon Column only. Highlight legal Squares.

## 5. Save data

- Storage: IndexedDB, through a small wrapper.
- The **Profile** model is in the rules package. It has: player level and XP, Marks, Essence, owned card copies, Decks, Gear levels, Stage results, Heynspire progress, Achievements, Cosmetics and settings.
- Each save has a `schemaVersion`. Migrations are pure functions in the rules package: `migrate(v1) → v2 → v3`.
- The app saves after each Battle and after each Workshop, Pack or Gear action.
- **Export:** a JSON file with the Profile and a checksum. **Import:** check the schema and the checksum, run migrations, then replace the save only if all checks pass.
- In v2, the server keeps the Profile and does all reward and Workshop actions. The local save becomes a cache. The shape of the Profile stays the same.

## 6. Performance budgets

| Item | Budget |
| --- | --- |
| First JavaScript bundle (Title screen) | Less than 250 KB gzip |
| Battle chunk (Three.js and scene code) | Less than 400 KB gzip |
| Assets for one Battle | Less than 8 MB |
| Draw calls in a Battle | Less than 150 |
| Texture size | Unit cut-outs 512 px tall. Card art 768 × 1024. Use KTX2 (Basis) or WebP. |
| Frame time | 16.7 ms on desktop. 33 ms on a mid-range phone. |
| Device pixel ratio | Maximum 2. Lower it when the frame rate drops. |

- Use texture atlases for Units of the same Region.
- Preload the assets of the next Stage when the player opens the Stage screen.
- Measure with the browser profiler and `r3f-perf` in each Milestone.

## 7. Languages

- The game uses the existing Message Catalogs in `apps/web` (`en-us`, `id-id`).
- Card names, flavor text and template text use Translation Keys. Example keys: `card.hearthkin.shieldbearer.name`, `effect.damage.area`.
- A unit test checks that each Translation Key exists in both catalogs.

## 8. Tests

| Layer | Tool | Scope |
| --- | --- | --- |
| Rules unit tests | Vitest (Node) | Each rule in GDD section 4, each Keyword, each Workshop action, migrations. Follows [ADR-0001](../adr/0001-unit-tests-are-pure-module-logic.md). |
| Determinism tests | Vitest | Run the same replay many times and compare the results. Property tests with random Decks and seeds. |
| Content tests | Vitest | All card and Stage data pass the Effect `Schema` schemas. All Translation Keys exist. |
| Balance simulations | Bun script | Headless AI-against-AI Battles. Reports win rates (GDD section 13). |
| Economy simulation | Bun script | Reports the pacing targets (Economy section 4). |
| End-to-end | Playwright | Start the game, finish Stage 1-1, open a Pack, Combine, export and import the save. |

## 9. Deployment

- v1 deploys as a static SPA with the existing build and CI.
- The PWA service worker caches the app and the assets for offline play.
- v1 has no backend.

## 10. Plan for v2 (online)

| Need | Plan |
| --- | --- |
| Accounts | An auth provider. Decide in a v2 ADR. |
| Server | A TypeScript server that imports `@workspace/rules`. |
| Asynchronous PvP | The defender saves a defense Deck. The attacker's client runs the Battle with the AI for the defender, and sends the seed and Commands. The server runs the replay again and accepts the result only if it is the same. |
| Rewards and Workshop | Only the server changes the Profile. |
| Real-time PvP and co-op | Later. The server runs `step()` and sends Battle Events to the clients. |
