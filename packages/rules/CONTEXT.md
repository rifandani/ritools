# rules

The game rules of Heynbord: Battles, cards, Decks, progression and rewards. This context defines what happens in the game. It does not define how the game looks or sounds.

## Language

### Board

**Board**: The battlefield of one Battle. It is made of Lanes. _Avoid_: field, map, grid, arena

**Lane**: One row of 12 Squares between the two Heroes. Units move only along their Lane. _Avoid_: row, path, track

**Square**: One position in a Lane. It holds 0 or 1 Unit. _Avoid_: tile, cell, slot

**Column**: The set of Squares at the same distance from a Hero, across all Lanes. Each side counts Columns from its own Hero. _Avoid_: rank, line

**Summon Column**: A side's Column 1. The only place where that side can summon Units. _Avoid_: spawn zone, deploy row

**Field Effect**: An effect from a Skill Card that stays on a Square area for a number of Turns. _Avoid_: tile effect, battlefield skill, aura

### Battle

**Battle**: One match between two sides, from the first Turn to a win or a loss. _Avoid_: match, game, fight, duel

**Hero**: The commander of a side. The Hero stands behind the Lanes, has HP and a Class, and loses the Battle at 0 HP. _Avoid_: commander, avatar, general, player

**Player**: The person who plays Heynbord. The Player controls a Hero. _Avoid_: user, account, Hero

**Turn**: One side's sequence of Start Step, Play Phase, Resolution Phase and End Step. _Avoid_: round, move

**Turn number**: A count of rounds. Both sides take one Turn in each Turn number. _Avoid_: turn count, round number

**Play Phase**: The part of a Turn in which the active side plays Ready cards. _Avoid_: main phase, action phase

**Resolution Phase**: The part of a Turn in which the active side's Units move and attack automatically. _Avoid_: combat phase, battle phase, auto phase

**Sudden Death**: Damage to the active Hero in each Start Step from a set Turn number, so that every Battle ends. _Avoid_: fatigue, overtime

**Damage Type**: The kind of damage: Physical, Fire, Frost or Holy. _Avoid_: element, damage kind

**Battle seed**: The start value of the random numbers in one Battle. The same seed and the same Commands give the same Battle. _Avoid_: random seed, RNG

### Cards and Units

**Card**: A collectible item that a side can play from the Hand. A Card is a Creature Card or a Skill Card. _Avoid_: item

**Creature Card**: A Card that summons a Unit. It has a Race. _Avoid_: minion card, unit card, troop card

**Skill Card**: A Card with a one-time effect. It has a Class. _Avoid_: spell, ability card

**Unit**: A thing on the Board that a Creature Card or an effect puts there. _Avoid_: creature, minion, troop, character

**Token**: A Unit that an effect makes, with no Card. It disappears when it dies. _Avoid_: summon, spawn

**Countdown**: The number of Turns until a Card is Ready. It goes down by 1 in each Start Step of its owner. _Avoid_: mana, cost, cooldown, timer, wait

**Ready**: The state of a Card with a Countdown of 0. Only Ready Cards can be played. _Avoid_: active, available, playable

**Mastery**: The chance that a Skill Card goes back to the Hand after its effect. _Avoid_: recycle, return chance

**Hand**: The Cards that a side holds during a Battle. _Avoid_: queue

**Deck**: The Cards that a side brings into a Battle. _Avoid_: army, loadout

**Graveyard**: The place for a side's Cards that are used or dead. _Avoid_: discard pile, cemetery, crypt

**Keyword**: A named rule on a Card, for example Flying or Armor. _Avoid_: trait, perk, tag, ability

**Race**: The people that a Creature Card belongs to: Hearthkin, Thornwild, Hollowborn or Wildmaw. _Avoid_: faction, tribe, kingdom

**Class**: The type of a Hero, and of the Skill Cards that the Hero can use: Warrior, Ranger, Mage or Priest. _Avoid_: job, profession, role

**Rank**: The power grade of one copy of a Card: Stone, Jade, Sapphire, Amethyst or Sunstone. _Avoid_: rarity, tier, star, level, quality

**Base Rank**: The lowest Rank in which a Card exists. _Avoid_: rarity, starting tier

### Progression

**Collection**: All the Card copies that the Player owns. _Avoid_: inventory, library

**Discovered**: The state of a Card that the Player has owned at least one time. _Avoid_: unlocked, known, seen

**Combine**: The action that changes two copies of the same Card in the same Rank into one copy in the next Rank. _Avoid_: fuse, merge, upgrade, evolve

**Extract**: The action that changes one Card copy into Essence. _Avoid_: dismantle, disenchant, salvage, sell

**Craft**: The action that changes Essence into one copy of a Discovered Card in its Base Rank. _Avoid_: forge, make, fuse

**Essence**: The resource from Extract that pays for Craft. _Avoid_: dust, material, shards

**Marks**: The currency that the Player earns in the game. _Avoid_: gold, silver, coins, money

**Pack**: A set of random Cards that the Player buys with Marks. _Avoid_: booster, loot box, chest

**Drop Rate**: The chance of each Rank for each Card in a Pack. _Avoid_: odds, luck

**Gear**: The items in the Hero's 4 slots that give the Hero and its Units stats. _Avoid_: equipment, items

**Player level**: The level of the Player from XP. It sets the Hero HP and the Deck size limits. _Avoid_: account level, Hero level

**Workshop**: The place where the Player does Combine, Extract and Craft. _Avoid_: alchemy lab, forge

**Cosmetic**: An item that changes how something looks and never changes gameplay. _Avoid_: skin (as a general word), vanity item

**Achievement**: A goal that gives a reward when the Player completes it. _Avoid_: quest, mission, trophy

### Modes

**Stage**: One Battle in the Campaign, with a fixed enemy and rewards. _Avoid_: level, mission

**Boss Stage**: The last Stage of a Region, with special rules. _Avoid_: boss level, raid

**Region**: A group of 10 Stages. _Avoid_: chapter, world, area

**Campaign**: All Regions and their Stages. _Avoid_: story mode, adventure

**Stars**: The 1 to 3 result grade of a Stage win. _Avoid_: score, rating; never use for Rank

**Heynspire**: The tower mode with 50 Floors. _Avoid_: tower, ascension tower

**Floor**: One Battle in Heynspire. _Avoid_: level, stage

**Auto-play**: A mode in which the enemy AI logic plays the Player's Cards. _Avoid_: bot, auto battle

## Relationships

- A **Player** controls one **Hero**. The Hero has one **Class**.
- A **Deck** holds **Creature Cards** of any **Race** and **Skill Cards** of the Hero's Class only.
- A **Creature Card** becomes a **Unit** when the side summons it.
- A **Card copy** has one **Rank**. **Combine** raises the Rank. The **Countdown** does not change with the Rank.
- A **Region** has 10 **Stages**, and the last one is a **Boss Stage**.

## Example dialogue

> **Dev:** "When the Countdown of a Creature Card reaches 0, the card is Ready. In the Play Phase I put it into the Summon Column, and it becomes a Unit." **Designer:** "Yes. That Unit also acts in the Resolution Phase of the same Turn. If it dies, the Card goes to the Graveyard, but a Token just disappears."

## Flagged ambiguities

- The original games used "stars" for card grades. Heynbord uses **Rank** for card grades and **Stars** only for Stage results.
- "Fuse" in the original games was a random recipe system. Heynbord does not have it. **Combine** and **Craft** replace it.
- **Hero** and **Player** are different. A Player is a person. A Hero is the commander on the Board.
