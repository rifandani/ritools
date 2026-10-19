# 08 — Roadmap

## 1. Overview

| Milestone | Weeks | Result |
| --- | --- | --- |
| M0 — Foundation | 1–2 | Documents, rules package, empty 3D scene in `apps/web` |
| M1 — Battle slice | 3–6 | One complete Battle with 20 cards and 3D presentation |
| M2 — Meta loop (**Playable alpha**) | 7–12 | Collection, Deck builder, Packs, Workshop, save, first Region |
| M3 — Content | 13–19 | 100 cards, 30 Stages, 3 bosses, both languages |
| M4 — Polish and release (**v1.0**) | 20–26 | Heynspire, Achievements, mobile landscape, audio, performance, playtests |

The schedule is for one developer. If a Milestone is late, cut **C** requirements, then **S** requirements (see the PRD). Do not move the end date of a Milestone more than 2 weeks before you cut scope.

## 2. Milestones

### M0 — Foundation (weeks 1–2)

- [ ] Approve these documents and the draft names.
- [ ] Create `packages/rules` with Vitest, the seeded random generator and the basic types.
- [ ] Add `three`, `@react-three/fiber` and `@react-three/drei` to `apps/web`. Show an empty Board on a lazy route.
- [ ] Select the AI image tool. Make the first 10 golden reference images.
- [ ] Test the empty scene on a real phone in landscape.

**Exit:** A 3D Board shows in the browser on desktop and phone. The rules package has a passing test.

### M1 — Battle slice (weeks 3–6)

- [ ] Battle rules: Turn structure, Countdown, summon, movement, attack, damage, death, win and loss (GDD section 4).
- [ ] 6 Keywords: Armor, Flying, Charge, Retaliation, Regeneration, Heroic.
- [ ] Enemy AI with the score method.
- [ ] 20 placeholder cards (2 Races, 2 Classes).
- [ ] Battle Events and the event player with simple animations.
- [ ] Hand UI, drag and drop, End Turn, speed ×1/×2 and Skip.
- [ ] Determinism tests.

**Exit:** A person can play a full Battle against the AI from start to end. Ask 3 people to play it. They must understand why they won or lost.

### M2 — Meta loop and playable alpha (weeks 7–12)

- [ ] All v1 Keywords, Damage Types, Skill Cards, Mastery and Field Effects.
- [ ] Profile model, IndexedDB save, export and import, migrations.
- [ ] Collection, Deck builder with validation, Packs, Combine, Extract, Craft.
- [ ] Player level, unlocks, Gear.
- [ ] Region 1 (10 Stages) with the tutorial and the first boss.
- [ ] Message Catalog structure for game text (`en-us` first).
- [ ] Style bible and first 30 final card art images.

**Exit (Playable alpha):** A new player can play Region 1 from the tutorial to the boss, and can open Packs and change the Deck. Do the first external playtest.

### M3 — Content (weeks 13–19)

- [ ] All 100 cards with final art.
- [ ] Regions 2 and 3, with bosses and story scenes.
- [ ] Balance simulation script. Tune cards to the targets in GDD section 13.
- [ ] Economy simulation script. Tune rewards to the targets in the Economy document.
- [ ] `id-id` translation of all text.
- [ ] Final names for Races, Ranks, currency, Regions and Heynspire.

**Exit:** A player can finish the full Campaign. Balance and economy reports meet their targets.

### M4 — Polish and release v1.0 (weeks 20–26)

- [ ] Heynspire (50 Floors).
- [ ] Achievements and Cosmetics.
- [ ] Auto-play, Battle log.
- [ ] Mobile landscape layout and touch input. Portrait warning.
- [ ] Sound effects and music.
- [ ] Accessibility options and keyboard play.
- [ ] Performance work to meet the budgets.
- [ ] PWA offline mode.
- [ ] Playtest with 5 to 10 people through the full Campaign.
- [ ] Trademark check and licence record.

**Exit:** The release criteria in PRD section 7 pass. Release v1.0.

## 3. After v1

The order of the versions after v1 can change after player feedback.

| Version | Content |
| --- | --- |
| **v1.x** | Bug fixes, balance updates, new Cosmetics, a few new cards |
| **v2 — Online** | Accounts, server, Profile on the server, asynchronous PvP against defense Decks, leaderboards and seasons, cosmetic shop |
| **v2.x — Social** | Guilds, guild bosses, friends, weekly Heynspire reset, events |
| **v3 — Co-op** | Battles with 4 Lanes, 2v2 and co-op bosses, real-time Turns with a 30-second timer |
| **v3.x — Expansion** | New Races, Hybrid Units, a sixth Rank, new Keywords and Damage Types |
| **To be decided** | Trading between players (needs a separate design review, see Economy section 6) |
