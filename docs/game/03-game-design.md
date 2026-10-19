# 03 — Game Design Document (GDD)

This document gives the full rules of Heynbord v1. It uses the terms in [`packages/rules/CONTEXT.md`](../../packages/rules/CONTEXT.md). All numbers are start values for tests and tuning. The [Economy](./07-economy.md) document gives the currency numbers.

## 1. Overview

The player is a new **Hero** in the world of Heynbord. The player collects cards, builds a **Deck** and fights **Battles** against computer opponents. In a Battle, the player plays cards from the **Hand** into **Lanes**. Then the **Units** move and attack automatically. The player wins when the enemy Hero has 0 HP.

## 2. Core loop

```text
 ┌─────────────► Fight a Battle (Stage or Heynspire Floor)
 │                         │
 │                         ▼
 │          Get rewards: Marks, XP, cards, Stars
 │                         │
 │                         ▼
 │     Open Packs · Combine · Extract · Craft · upgrade Gear
 │                         │
 │                         ▼
 └──────────── Change the Deck for the next challenge
```

| Loop | Length | Content |
| --- | --- | --- |
| Battle loop | 3 to 6 minutes | Turns: countdowns tick, play cards, watch Units act. |
| Session loop | 10 to 30 minutes | 3 to 6 Battles, then Workshop and Deck changes. |
| Long loop | Weeks | Finish Regions, get all cards, reach Sunstone rank, climb Heynspire, unlock Cosmetics. |

## 3. World and story

### 3.1 Premise

Long ago, the peoples of Heynbord almost destroyed the world in war. Then the **Lanekeepers** (draft) wrote the **Accord** (draft). Under the Accord, all wars happen on marked battlefields with lanes, and all armies obey the same rules. Today, kings and chiefs settle every argument with a battle in the lanes. Some battles are about land. Many are about very small things, for example a stolen cheese or a rude song.

The player is a new Hero. The player travels through three Regions, wins the respect of each people, and finds out who wants to break the Accord.

### 3.2 Races (draft names)

| Race | Concept | Battle identity | Main Keywords |
| --- | --- | --- | --- |
| **Hearthkin** | Humans and stout folk of the river towns. Proud and stubborn. They love banners and long speeches. | Hold the line. Strong armor, Walls and support for allies. | Armor, Rally, Retaliation, Wall |
| **Thornwild** | Forest folk and plant spirits. Patient and old. | Control from range. Ranged Units, healing and small summons. | Regeneration, Summon, Flying |
| **Hollowborn** | Old spirits that wear bones and armor. They do not like to stay dead. | Many cheap Units that come back. | Rebirth, Last Breath, Frost damage |
| **Wildmaw** | Beast tribes of the badlands. Fast, loud and always hungry. | Rush the enemy Hero. High attack, low HP. | Charge, Heroic, Fire damage |

### 3.3 Regions (draft names)

| No. | Region | Main enemies | Lanes | Boss (draft) |
| --- | --- | --- | --- | --- |
| 1 | **Hearthvale** | Hearthkin outlaws | 1 to 2 | **Baron Brassbelly**, a bandit lord with a very large hat |
| 2 | **The Thornwood** | Thornwild and Wildmaw | 2 | **The Old Bramble**, a forest giant that wakes up angry |
| 3 | **The Hollow Marches** | Hollowborn and Wildmaw | 2 to 3 | **Queen Marrow**, ruler of the Hollowborn |

## 4. Battle

### 4.1 Board

- The Board has 1 to 4 **Lanes**. v1 Stages use 1 to 3 Lanes. Co-op modes after v1 use 4 Lanes.
- Each Lane has 12 **Squares**.
- **Columns** have numbers from 1 to 12. For the player, Column 1 is nearest to the player's Hero. For the enemy, the numbers go in the opposite direction.
- Each Hero stands at the end of the Lanes, outside the Board. The player's Hero is behind the player's Column 1. The enemy Hero is behind the player's Column 12.
- A Square holds 0 or 1 Unit.
- Your **Summon Column** is your Column 1. You can summon Units only into empty Squares of your Summon Column.

```text
           Column:  1   2   3   4   5   6   7   8   9  10  11  12
 Player   Lane 1: [ S ][   ][   ][   ][   ][   ][   ][   ][   ][   ][   ][ E ]   Enemy
 Hero     Lane 2: [ S ][   ][   ][   ][   ][   ][   ][   ][   ][   ][   ][ E ]   Hero
          Lane 3: [ S ][   ][   ][   ][   ][   ][   ][   ][   ][   ][   ][ E ]

 S = player Summon Column    E = enemy Summon Column
```

### 4.2 Battle setup

1. Each side shuffles its Deck with the Battle seed.
2. Each side draws 4 cards.
3. Each card in the Hand shows its printed Countdown.
4. In PvE, the player takes the first Turn.
5. Some Stages put Units on the Board at the start. The Stage data defines them.

### 4.3 Turn structure

A **Turn number** counts rounds. In each Turn number, the first player and then the second player take one Turn.

Each Turn of the active side has these phases:

1. **Start Step**
   1. Start-of-turn effects resolve (for example Regeneration and Rally).
   2. If the Turn number is 20 or more, Sudden Death damage hits the active Hero (see 4.10).
   3. The Countdown of each card in the active Hand goes down by 1. The minimum is 0.
   4. The active side draws 1 card, if the Hand has fewer than 8 cards and the Deck is not empty.
2. **Play Phase**
   - The active side can play **all** Ready cards (Countdown 0), in any order.
   - A Creature Card goes into an empty Square of the Summon Column, in any Lane.
   - A Skill Card goes to its target (see 4.8).
   - The active side can also play no cards.
   - The phase ends when the player selects **End Turn**. In PvE there is no Turn timer.
3. **Resolution Phase**
   - The active side's Units act one at a time. Section 4.4 gives the order.
   - The other side's Units do not act. They can only use Retaliation and First Strike.
4. **End Step**
   1. Burn damage hits burning Units of the active side.
   2. Durations go down by 1 (Freeze, Field Effects and other timed effects).
   3. Units with 0 HP leave the Board.
   4. The Turn goes to the other side.

The Battle ends at once when a Hero has 0 HP, also in the middle of a phase.

### 4.4 Action order in the Resolution Phase

1. The Units act Lane by Lane, from Lane 1 to the last Lane.
2. In each Lane, the front Unit acts first. The front Unit is the Unit nearest to the enemy Hero.
3. Each Unit does these steps:
   1. **Movement** (see 4.5)
   2. **Attack** (see 4.6)
   3. **Retaliation** by the target, if the target has the Retaliation Keyword (see 4.7)
4. A Unit that you summoned in this Turn also acts in this Turn.
5. A Unit that another effect creates during the Resolution Phase acts at the end of the Resolution Phase, in the same order.
6. A Frozen Unit does not move and does not attack. Its Freeze then ends.

### 4.5 Movement

- Each Unit has a **Speed**. Speed is the maximum number of Squares that the Unit moves forward in one Turn.
- A ground Unit stops when the next Square holds any Unit. Units never move through other Units.
- A **Flying** Unit moves over other Units. It must stop in an empty Square.
- A Unit never moves past its last Column (Column 12 for the player).
- A **Ranged** Unit does not move if an enemy target is in its Range at the start of its action (see 4.6).
- A Unit with Speed 0 never moves.

### 4.6 Attack

- **Melee Unit:** It attacks the enemy Unit in the next Square in front of it. If the Unit is in its last Column and no enemy Unit is in front of it, it attacks the enemy Hero.
- **Ranged Unit:** It has a **Range** (number of Squares). It attacks the nearest enemy Unit in front of it, in the same Lane and in its Range. If no enemy Unit is in Range, and the enemy Hero is in Range, it attacks the enemy Hero. The enemy Hero is 1 Square past the last Column.
- A Unit with Attack 0 does not attack.
- A Unit attacks one time in each Turn, unless a Keyword says something different.

### 4.7 Damage

Each attack and each damage effect has a **Damage Type**.

| Damage Type | Effect |
| --- | --- |
| **Physical** | Normal damage. Melee or Ranged. |
| **Fire** | Normal damage. The target also gets **Burn**: 1 damage in each End Step of its owner, for the next 2 End Steps. A new Burn replaces the old Burn. |
| **Frost** | Normal damage. The target also gets **Freeze**: it skips its next action. |
| **Holy** | Armor does not reduce Holy damage. |

To calculate damage, do these steps in this order:

1. Start with the Attack value of the attacker (or the value of the effect).
2. Add bonuses (for example Heroic or Rally).
3. Subtract the Armor of the target, if the Damage Type is not Holy.
4. Roll **Crit** for the attacker's side. A Crit multiplies the damage by 2.
5. Roll **Block** for the target's side. A Block divides the damage by 2. Round up.
6. The minimum damage is 0.

- The Gear of each Hero gives the Crit and Block chances (see 7.3).
- Heroes cannot Block.
- All rolls use the Battle seed, so a replay gives the same result.
- **Retaliation:** When a Unit with Retaliation survives a melee attack, it deals damage equal to its Attack to the attacker. Retaliation does not use Crit, and it does not start another Retaliation.
- **First Strike:** When an enemy melee Unit attacks a Unit with First Strike, the Unit with First Strike deals its damage first. If the attacker dies, its attack does not occur.

### 4.8 Skill Cards and Mastery

- A Skill Card has a **Target**. The Target can be a Unit, a Lane, a Square area, a Hero, the Hand, or all Units.
- After the effect, roll **Mastery**. If the roll succeeds, the card goes back to the Hand with its full Countdown. If the roll fails, the card goes to the **Graveyard**.
- A **Field Effect** is a Skill Card effect that stays on a Square area for a number of Turns. For example, *Wildfire* (draft) puts fire on 2 × 2 Squares for 2 Turns.

### 4.9 Death

- When a Unit has 0 HP, it leaves the Board and goes to its owner's Graveyard.
- Last Breath effects resolve when the Unit leaves the Board.
- **Rebirth:** The first time a Unit with Rebirth dies, it comes back in the same Square with 1 HP and without Rebirth.
- **Tokens** (Units that effects create) do not go to the Graveyard. They disappear.

### 4.10 Win, loss and Sudden Death

- You win when the enemy Hero has 0 HP.
- You lose when your Hero has 0 HP.
- **Sudden Death:** From Turn number 20, the active Hero takes 1 damage in each Start Step. From Turn number 40, the damage is 2.
- **Turn limit:** If no Hero has 0 HP at the end of Turn number 60, the defender wins. In PvE, the enemy is the defender.
- **Hero HP:** The player's Hero has 30 + player level HP, plus the Gear bonus. The Stage data defines the enemy Hero HP.

### 4.11 Stars

Each Stage win gives 1 to 3 **Stars**:

| Stars | Condition |
| --- | --- |
| ★ | Win the Battle. |
| ★★ | Win with 50% or more of your Hero HP. |
| ★★★ | Win with 50% or more of your Hero HP, before Turn number 15. |

The game shows the best Star result for each Stage. The word "star" is only for Stages. Ranks use gems (see 5.3).

### 4.12 Speed controls and Auto-play

- **Speed ×1 / ×2:** The player can change the animation speed at any time.
- **Skip:** The player can skip the animations of the current Resolution Phase. The result is the same.
- **Auto-play:** The AI plays the player's cards. Auto-play is available on Stages that the player has already won. The player can set a number of repeats (1 to 10). Repeats stop at the first loss.
- Speed, Skip and Auto-play never change the result, because the rules are deterministic.

## 5. Cards

### 5.1 Card types

| Type | Description |
| --- | --- |
| **Creature Card** | A card that summons a Unit onto the Board. It has a Race. |
| **Skill Card** | A card with a one-time effect. It has a Class. Only a Hero of the same Class can use it. |

A **Unit** is the thing on the Board. A Creature Card is the thing in the Hand or in the Deck. Do not mix the two words.

### 5.2 Card fields

**Creature Card**

| Field | Description | Typical values |
| --- | --- | --- |
| Name | Unique name of the card | — |
| Race | Hearthkin, Thornwild, Hollowborn or Wildmaw | — |
| Rank | Stone to Sunstone | — |
| Countdown | Turns until Ready | 1 to 6 |
| Attack | Damage of one attack | 0 to 12 |
| HP | Health | 1 to 30 |
| Speed | Squares per Turn | 0 to 4 |
| Attack type | Melee, or Ranged with Range | Range 2 to 5 |
| Damage Type | Physical, Fire, Frost or Holy | — |
| Keywords | 0 to 3 Keywords | — |
| Flavor text | A short line of lore or a joke | — |

**Skill Card**

| Field | Description | Typical values |
| --- | --- | --- |
| Name | Unique name of the card | — |
| Class | Warrior, Ranger, Mage or Priest | — |
| Rank | Stone to Sunstone | — |
| Countdown | Turns until Ready | 1 to 6 |
| Target | What the effect hits | — |
| Effect | Effect text, from templates | — |
| Mastery | Chance to go back to the Hand | 10% to 50% |

### 5.3 Ranks (draft names)

| Rank | Gem color | Symbol | Mastery for Skill Cards | Stat scale (Attack and HP) |
| --- | --- | --- | --- | --- |
| **Stone** | Grey | 1 pip | 10% | ×1.0 |
| **Jade** | Green | 2 pips | 20% | ×1.2 |
| **Sapphire** | Blue | 3 pips | 30% | ×1.45 |
| **Amethyst** | Purple | 4 pips | 40% | ×1.75 |
| **Sunstone** | Orange | 5 pips | 50% | ×2.1 |

- The Countdown never changes with the Rank.
- Keyword values can also go up with the Rank. The card data defines this.
- Stat values are integers. Round to the nearest integer.
- Each card has a **Base Rank**. This is the lowest Rank in which the card exists. A card can go up to Sunstone with Combine.
- The UI shows each Rank with a color **and** a number of pips, so that players with color blindness can see the Rank.

### 5.4 Keywords (v1)

| Keyword | Rule |
| --- | --- |
| **Armor N** | Reduces damage to this Unit by N. It does not reduce Holy damage. |
| **Charge** | +2 Speed in the Turn when you summon this Unit. |
| **First Strike** | See 4.7. |
| **Flying** | Moves over other Units. See 4.5. |
| **Heroic N** | +N damage when this Unit attacks a Hero. |
| **Last Breath: X** | X occurs when this Unit leaves the Board. |
| **Rally N** | In your Start Step, other friendly Units in the same Lane get +N Attack until the end of the Turn. |
| **Rebirth** | See 4.9. |
| **Regeneration N** | In your Start Step, this Unit heals N HP. It cannot go above its maximum HP. |
| **Retaliation** | See 4.7. |
| **Summon X** | When you summon this Unit, a Token X also appears in an empty Square next to it (behind it, or the same Column in a next Lane). If no Square is empty, no Token appears. |
| **Unique** | Only one copy of this card can be on your side of the Board. |
| **Wall** | Speed 0 and Attack 0. It blocks its Lane. |

New Keywords after v1 must go through the balance process in section 13.

### 5.5 Classes

The Hero has one Class. The Class decides which Skill Cards the Deck can hold.

| Class | Role | Example Skill Cards (draft) |
| --- | --- | --- |
| **Warrior** | Buffs and tempo | *War Drums*: the Countdown of 2 random cards in your Hand goes down by 1. *Shield Wall*: friendly Units in one Lane get Armor 1 for 2 Turns. |
| **Ranger** | Control and Hero damage | *Long Shot*: 4 Physical damage to the enemy Hero. *Distraction*: the Countdown of 1 random card in the enemy Hand goes up by 1. |
| **Mage** | Area damage and Field Effects | *Fireball*: 3 Fire damage to a 2 × 1 area. *Wildfire*: Field Effect, 2 Fire damage per Turn on 2 × 2 Squares for 2 Turns. |
| **Priest** | Healing, protection and return | *Mend*: heal 6 HP to one Unit. *Return from Rest*: summon the last friendly Creature from your Graveyard into your Summon Column. |

The player can change the Class at any time outside a Battle, at no cost. A Deck that has Skill Cards of another Class is not valid until the player removes them.

### 5.6 Unit roles

Each Creature Card has a role. Use the role to balance the card and to explain it in the UI.

| Role | Description |
| --- | --- |
| Frontliner | High HP, low Speed. Protects the Lane. |
| Striker | High Attack, low HP. Kills Units. |
| Runner | High Speed or Flying. Damages the Hero. |
| Shooter | Ranged. Stays back and attacks. |
| Support | Rally, Regeneration or Summon. Makes other Units better. |
| Wall | Blocks a Lane. |

## 6. Deck building

| Rule | Value |
| --- | --- |
| Maximum Deck size | 10 at player level 1. +1 per level. 30 at level 21 and higher. |
| Minimum Deck size | 5 at player level 1. +1 per level. 15 at level 11 and higher. |
| Copies of one card | Maximum 3, of any Rank. |
| Skill Cards | Only Skill Cards of the Hero's Class. |
| Races | The Deck can mix all Races. |
| Saved Decks | 5 Deck slots. |

- The Deck builder has an **Auto-fill** button. It fills the Deck with the strongest valid cards.
- The Deck builder shows the Countdown curve (how many cards have each Countdown).
- The game does not let the player start a Battle with a Deck that is not valid. It shows the reason.

## 7. Hero and progression

### 7.1 Player level

- The player gets XP from each Battle. A loss gives 25% of the XP of a win.
- The maximum player level in v1 is 30.
- Each level gives +1 Hero HP and changes the Deck size limits.

| Level | Unlock |
| --- | --- |
| 1 | Campaign, Deck builder |
| 2 | Packs |
| 3 | Workshop: Combine and Extract |
| 5 | Gear |
| 6 | Workshop: Craft |
| Finish Region 3 | Heynspire |

### 7.2 Collection

- The Collection shows all cards. A card that the player has not owned is a dark outline with its name hidden.
- A card is **Discovered** after the player owns it one time. The player can see Discovered cards in all Ranks, and can Craft them.
- The Collection shows the number of copies of each card in each Rank.
- Filters: Race, Class, Rank, Countdown, Keyword, owned or not owned.

### 7.3 Gear

The Hero has 4 Gear slots. Each slot has one item. Each item has a level from 0 to 10. The player upgrades items with Marks. An upgrade never fails, and the level never goes down.

| Slot | Stat | Level 0 | Level 10 |
| --- | --- | --- | --- |
| Weapon | Unit Crit chance | 0% | 10% |
| Armor | Hero HP bonus | +0 | +20 |
| Trinket | Hero Crit chance (Skill Card damage) | 0% | 15% |
| Banner | Unit Block chance | 0% | 10% |

Cosmetics can change the look of each item. Cosmetics never change the stats.

### 7.4 Workshop

| Action | Input | Output | Notes |
| --- | --- | --- | --- |
| **Combine** | 2 copies of the same card in the same Rank, and Marks | 1 copy of that card in the next Rank | It never fails. The maximum Rank is Sunstone. |
| **Extract** | 1 copy of a card | Essence | The game asks for confirmation if the copy is in a saved Deck. |
| **Craft** | Essence | 1 copy of a Discovered card in its Base Rank | The player selects the card. |

The [Economy](./07-economy.md) document gives the costs.

## 8. Game modes

### 8.1 Campaign

- 3 Regions. Each Region has 10 Stages. Stage 10 of each Region is a **Boss Stage**.
- The Stages in a Region unlock in order. A Region unlocks when the player wins the Boss Stage of the previous Region.
- Each Stage defines: enemy Hero, enemy Deck, enemy Hero HP, number of Lanes, Units at the start, special rules, and rewards.
- **First win reward:** a fixed card, Marks and XP.
- **Repeat win reward:** Marks, XP, and a chance of a card from the Stage card pool.
- **Star chests:** Each Region gives a chest at 10, 20 and 30 Stars.

**Boss Stages** have special rules. For example:

- A large Hero HP and a large Deck.
- A Unique boss Unit that starts on the Board.
- A rule that changes the Board, for example "Lane 2 is closed until Turn 5".

### 8.2 Heynspire (draft name)

- Heynspire unlocks after the player wins the Region 3 Boss Stage.
- It has 50 **Floors**. The player climbs one Floor at a time.
- The enemies come from the Campaign card pool with higher Ranks and higher Hero HP on each Floor.
- From Floor 20, Floors use 3 Lanes.
- Each Floor gives a reward for the first win. Each 10th Floor gives a Cosmetic and Essence.
- v1 has no weekly reset, because a local clock is not reliable. Online versions can add a weekly reset.

### 8.3 Tutorial

The tutorial is part of Region 1. Each step teaches one idea.

| Stage | Lanes | Lesson |
| --- | --- | --- |
| 1-1 | 1 | Countdown, Ready cards, summon, watch the Units act. |
| 1-2 | 2 | Lane choice. Block a fast enemy. |
| 1-3 | 2 | Skill Cards and Mastery. |
| After 1-3 | — | Deck builder: add 2 new cards to the Deck. |
| Level 2 | — | Open the first free Pack. |
| Level 3 | — | Combine 2 copies. |

The tutorial uses short text, arrows and highlights. The player can skip text, but the player cannot skip Stage 1-1.

## 9. Enemy AI

- The AI uses the same rules and the same information as a player. It does not see the player's Hand.
- In each Play Phase, the AI gives a score to each legal play (each Ready card in each legal place). It plays the best play, and then scores again. It stops when no play has a score above its threshold.
- The score uses: threat in each Lane, damage that the AI's Hero will take, Units that the play can kill, and the value of the card.
- Some cards have a hold rule. For example, the AI keeps a healing card until a Unit has lost 50% of its HP.
- Difficulty comes from the enemy Deck, card Ranks and Hero HP. The AI logic is the same in all Stages.
- Auto-play uses the same AI for the player's side.

## 10. Achievements and Cosmetics

- Achievements are goals, for example "Win a Battle with only Hollowborn Units" or "Combine a card to Sunstone".
- Achievements give Cosmetics, Marks or Essence.
- Cosmetic types in v1:
  - **Card backs**
  - **Board skins** (Lane and Square look)
  - **Hero portraits**
  - **Gear looks**
- Cosmetics never change gameplay.

## 11. User interface

### 11.1 Screens

| Screen | Content |
| --- | --- |
| Title | Start, Continue, Settings, Language |
| **Camp** (draft hub name) | Links to all screens below. A 3D camp scene with the Hero. |
| Campaign map | Regions and Stages, Stars, rewards |
| Heynspire | Floor list, current Floor, rewards |
| Battle | Board, Hand, Heroes, controls (see 11.2) |
| Deck builder | Deck slots, cards, Countdown curve, validation |
| Collection | All cards, filters, card details |
| Workshop | Combine, Extract, Craft |
| Hero | Class, Gear, portrait |
| Packs | Pack types, drop rates, open animation |
| Achievements | List, progress, rewards |
| Settings | Audio, language, speed, reduced motion, text size, save export and import |

### 11.2 Battle screen layout (landscape)

```text
┌──────────────────────────────────────────────────────────────┐
│ [Turn 7]                                 [×1/×2] [Skip] [⚙]  │
│                                                              │
│ [Player Hero]   ======== Lanes on a 3D Board ========  [Enemy │
│  HP 34/40       ===================================     Hero] │
│                 ===================================   HP 22/45│
│                                                              │
│ [Deck 12]  [Card 0] [Card 0] [Card 2] [Card 3] [Card 5] [End  │
│ [Grave 3]                                                Turn]│
└──────────────────────────────────────────────────────────────┘
```

- The Hand is at the bottom. Each card shows its Countdown in a large number. Ready cards glow.
- The player can drag a Ready card to a Square, or tap the card and then tap the Square.
- Hover (desktop) or long press (touch) shows the full card details.
- The Board shows Unit Attack and HP above each Unit at all times.
- The enemy Hand shows the number of cards and the Countdown of each card, but not the card faces.

### 11.3 Accessibility

- Rank uses color and pips.
- Damage Types use color and an icon.
- Options: text size, reduced motion, speed, and high-contrast Board.
- The player can play a full Battle with the keyboard only.
- UI text follows WCAG 2.2 AA contrast.

## 12. Content for v1

| Content | Count |
| --- | --- |
| Creature Cards | 72 (18 for each Race) |
| Skill Cards | 28 (7 for each Class) |
| Total collectible cards | 100 |
| Tokens | About 8 |
| Campaign Stages | 30 (with 3 Boss Stages) |
| Heynspire Floors | 50 |
| Achievements | About 40 |
| Cosmetics | About 30 |

Base Rank mix of the 100 cards:

| Base Rank | Share |
| --- | --- |
| Stone | 40% |
| Jade | 30% |
| Sapphire | 20% |
| Amethyst | 10% |
| Sunstone | 0% (only from Combine) |

## 13. Balance process

1. Each Creature Card gets **power points** from its stats and Keywords.
   - Start formula: `power = Attack × 2 + HP + Speed × 2 + Keyword points`.
   - Keyword points are in the card data table. For example, Flying = 4, Armor N = N × 3, Rebirth = 5.
2. Each Countdown has a power budget for the Base Rank. Start formula: `budget = 6 + Countdown × 5`.
3. A card must be within ±10% of its budget. A card outside this range needs a written reason (for example "weak stats, strong combo").
4. Run headless simulations with the rules package: thousands of AI-against-AI Battles for each Deck archetype.
5. Check each archetype's win rate. The target is 45% to 55% against the other archetypes.
6. Check Stage difficulty. The target win rate for a new player Deck on the first try is 60% to 80% for normal Stages and 30% to 50% for Boss Stages.

## 14. Items for later versions

These items are not in v1. The [Roadmap](./08-roadmap.md) shows when they can come.

- Asynchronous PvP against defense Decks, leaderboards, seasons
- Guilds, guild bosses, co-op Battles with 4 Lanes
- More Races, Hybrid Units, a sixth Rank
- More Keywords and Damage Types
- Weekly Heynspire reset and events
- A cosmetic shop
- Trading between players (needs a separate design review for fairness and fraud)
