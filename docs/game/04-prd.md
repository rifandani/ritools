# 04 — Product Requirements Document (PRD): Heynbord v1

## 1. Summary

Heynbord v1 is a single-player web game. It is a fantasy collectible card game with automatic lane battles and a countdown hand. The player plays a Campaign of 30 Stages and a tower of 50 Floors. The player collects about 100 cards and makes them stronger without real money. The game saves in the browser.

- Vision: [02 — Game Vision](./02-game-vision.md)
- Rules: [03 — Game Design](./03-game-design.md)
- Numbers: [07 — Economy](./07-economy.md)

## 2. Problem and opportunity

- Fans of *Kings and Legends* and *Rise of Mythos* lost their game when it shut down in 2019 and when Flash stopped in 2020.
- The 2023 revival has mostly negative reviews because of pay-to-win monetization.
- No modern, fair browser game gives the countdown-hand lane battle experience.

## 3. Goals

| ID | Goal | Measure |
| --- | --- | --- |
| G1 | Give a complete single-player experience | A player can finish the Campaign in 8 to 15 hours. |
| G2 | Make battles easy to read | 8 of 10 playtesters can explain why they won or lost. |
| G3 | Be fair | No playtester names "pay-to-win" or "grind" as their main problem. |
| G4 | Run well on the web | 60 fps on a normal laptop. 30 fps or more on a mid-range phone in landscape. |
| G5 | Be ready for online play | The server in v2 can use the rules package with no change to the rules. |

## 4. Non-goals for v1

- Online play, accounts, PvP, guilds, chat, leaderboards
- A shop, payments or ads
- Trading between players
- Native mobile apps
- Portrait layout on phones
- Hybrids, awakening, more than 4 Races, more than 5 Ranks

## 5. Users

| Persona | Needs |
| --- | --- |
| **Returning fan** (25 to 40 years old, played Flash card games) | The countdown feeling, deep Deck building, short sessions, no pay-to-win |
| **Strategy card player** (plays modern CCGs) | A new mechanic, clear rules, fast games, a good collection chase |

## 6. Requirements

Priority: **M** = Must (v1.0 cannot release without it), **S** = Should (do it if possible), **C** = Could (only if time permits).

### 6.1 Battle (BAT)

| ID | Requirement | Priority |
| --- | --- | --- |
| BAT-01 | The Board must support 1 to 4 Lanes with 12 Squares in each Lane. | M |
| BAT-02 | Each card in the Hand must show its Countdown. The Countdown must go down by 1 in each Start Step of its owner. | M |
| BAT-03 | The player must be able to play all Ready cards in one Play Phase. | M |
| BAT-04 | Creature Cards must go only into empty Squares of the Summon Column. | M |
| BAT-05 | Units must move and attack automatically by the rules in GDD section 4. | M |
| BAT-06 | The same seed, Decks and player actions must always give the same Battle result. | M |
| BAT-07 | The game must support the Damage Types Physical, Fire, Frost and Holy, and Crit and Block. | M |
| BAT-08 | The game must support all v1 Keywords in GDD section 5.4. | M |
| BAT-09 | Skill Cards must support Mastery and Field Effects. | M |
| BAT-10 | Sudden Death must start at Turn number 20, and the Turn limit must be Turn number 60. | M |
| BAT-11 | The player must be able to change speed (×1, ×2) and skip the Resolution Phase animation. | M |
| BAT-12 | Auto-play with 1 to 10 repeats must be available on won Stages. | S |
| BAT-13 | The player must be able to see a log of all actions in the current Battle. | S |
| BAT-14 | The player must be able to watch a replay of the last Battle. | C |

### 6.2 Cards and Decks (CRD)

| ID | Requirement | Priority |
| --- | --- | --- |
| CRD-01 | The game must have 100 collectible cards: 72 Creature Cards (18 for each Race) and 28 Skill Cards (7 for each Class). | M |
| CRD-02 | Each card must exist in all Ranks from its Base Rank to Sunstone. | M |
| CRD-03 | The UI must show Rank with a color and a number of pips. | M |
| CRD-04 | The Deck builder must check all Deck rules in GDD section 6 and show the reason when a Deck is not valid. | M |
| CRD-05 | The player must have 5 Deck slots. | M |
| CRD-06 | The Deck builder must have Auto-fill. | S |
| CRD-07 | The Deck builder must show the Countdown curve. | S |
| CRD-08 | Card text must come from Keyword and effect templates with values, not from free text. | M |

### 6.3 Progression (PRG)

| ID | Requirement | Priority |
| --- | --- | --- |
| PRG-01 | The player must get XP and levels up to level 30, with the unlocks in GDD section 7.1. | M |
| PRG-02 | The Collection must show all cards with filters, and hide cards that are not Discovered. | M |
| PRG-03 | The Workshop must support Combine, Extract and Craft with the costs in the Economy document. | M |
| PRG-04 | Combine and Gear upgrades must never fail and never cause a downgrade. | M |
| PRG-05 | The Hero must have 4 Gear slots with levels 0 to 10. | M |
| PRG-06 | The player must be able to change the Hero Class outside a Battle at no cost. | M |
| PRG-07 | Packs must use the drop rates and rules in the Economy document, and the game must show them before the player opens a Pack. | M |

### 6.4 Modes and content (MOD)

| ID | Requirement | Priority |
| --- | --- | --- |
| MOD-01 | The Campaign must have 3 Regions with 10 Stages each, and Stage 10 of each Region must be a Boss Stage. | M |
| MOD-02 | Each Stage must give 1 to 3 Stars and the rewards in the Economy document. | M |
| MOD-03 | The tutorial must teach the lessons in GDD section 8.3. | M |
| MOD-04 | Heynspire must have 50 Floors and unlock after the Region 3 Boss Stage. | S |
| MOD-05 | The enemy AI must use the score method in GDD section 9 and must not see the player's Hand. | M |
| MOD-06 | The game must have about 40 Achievements and about 30 Cosmetics. | S |
| MOD-07 | The story must have short scenes at the start and end of each Region. | S |

### 6.5 User interface (UI)

| ID | Requirement | Priority |
| --- | --- | --- |
| UI-01 | The game must have all screens in GDD section 11.1. | M |
| UI-02 | The player must be able to play with a mouse, with touch, and with only a keyboard. | M |
| UI-03 | On a phone in portrait, the game must ask the player to turn the phone to landscape. | M |
| UI-04 | The Battle screen must show the Attack and HP of each Unit at all times. | M |
| UI-05 | Hover or long press must show the full card details. | M |
| UI-06 | Settings must include text size, reduced motion, high-contrast Board, audio volume and language. | S |

### 6.6 Save data (SAV)

| ID | Requirement | Priority |
| --- | --- | --- |
| SAV-01 | The game must save progress in IndexedDB after each Battle and each Workshop action. | M |
| SAV-02 | The save must have a schema version. The game must migrate old saves to the new version. | M |
| SAV-03 | The player must be able to export the save to a file and import it from a file. | M |
| SAV-04 | The game must check an imported file and refuse it if it is not valid. It must not change the current save in this case. | M |
| SAV-05 | The save model must be able to move to a server account in v2. | S |

### 6.7 Languages (LOC)

| ID | Requirement | Priority |
| --- | --- | --- |
| LOC-01 | All text must be available in `en-us` and `id-id`. | M |
| LOC-02 | All text must use Translation Keys in the Message Catalogs. No text is written directly in components. | M |
| LOC-03 | The player must be able to change the language in Settings and on the Title screen. | M |

### 6.8 Art and audio (ART)

| ID | Requirement | Priority |
| --- | --- | --- |
| ART-01 | All card art must follow the [Art Direction](./05-art-direction.md) style guide. | M |
| ART-02 | Each Unit must have idle, move, attack, hit and death feedback. | M |
| ART-03 | The game must have sound effects for all Battle actions and UI actions. | M |
| ART-04 | The game must have music for the menus, the Battle and the Boss Stages. | S |
| ART-05 | All AI art and audio must have a record of the tool, the licence and the prompt. | M |

### 6.9 Non-functional requirements (NFR)

| ID | Requirement | Priority |
| --- | --- | --- |
| NFR-01 | Frame rate: 60 fps on a 2022 laptop with integrated graphics. 30 fps or more on a 2022 mid-range Android phone. | M |
| NFR-02 | First load: the Title screen is interactive in less than 3 seconds on a 4G connection. | M |
| NFR-03 | Battle assets load only when needed. The first Battle must start in less than 5 seconds after the player selects it. | M |
| NFR-04 | Browsers: the last 2 versions of Chrome, Edge, Firefox and Safari (desktop and mobile). | M |
| NFR-05 | Graphics: WebGL 2. The game must show a clear message if WebGL 2 is not available. | M |
| NFR-06 | UI contrast must meet WCAG 2.2 AA. | M |
| NFR-07 | The rules package must have unit tests for each rule in GDD section 4. | M |
| NFR-08 | The game must work offline after the first load (PWA). | S |
| NFR-09 | The game must not send any player data to a server in v1. | M |

## 7. Release criteria for v1.0

1. All **M** requirements are done.
2. A playtest group of 5 to 10 people finishes the Campaign without a blocking bug.
3. Goals G2, G3 and G4 pass in the playtest.
4. Balance simulations show archetype win rates of 45% to 55%.
5. All text is complete in `en-us` and `id-id`.
6. A trademark check of the name "Heynbord" and the draft names is done.
7. The art and audio licence record is complete.

## 8. Assumptions

- One developer works on the game part-time or full-time for about 6 months.
- AI tools can make art in a consistent style with a good workflow.
- The existing `apps/web` stack (React, TanStack, Vite, PWA) is the base.
- Players accept a local save if export and import are available.

## 9. Risks

| Risk | Effect | Action |
| --- | --- | --- |
| AI art is not consistent | The game looks cheap | Use a strict style guide, reference sheets and a review checklist (see Art Direction). |
| The scope is too large for one person | Late release | Keep v1 small. Cut **C** and then **S** requirements first. Use the milestones in the Roadmap. |
| Balance is hard with 100 cards | Some Decks are too strong | Use headless simulations from the start. |
| 3D performance on phones | Low frame rate | Use performance budgets (see Technical Design). Test on a real phone from Milestone 1. |
| Legal claims about similarity to the original games | Forced changes | Use new names, art, text and numbers. Do not copy assets or card text. |
| AI tool licence changes | Art cannot be used | Keep the licence record. Use tools whose terms permit commercial use. |
| Loss of local save | Players stop | Export and import. Remind the player to export a backup after long sessions. |

## 10. Open questions

| No. | Question | Owner | Due |
| --- | --- | --- | --- |
| 1 | Final names for Races, Ranks, currency, Regions and Heynspire | Game director | Milestone 3 |
| 2 | Which AI image tool and which audio sources | Art director | Milestone 1 |
| 3 | Domain name and hosting for the public release | Product owner | Milestone 4 |
