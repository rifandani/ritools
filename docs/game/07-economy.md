# 07 — Economy

This document defines the currencies, the sources and sinks, the Pack tables and the costs for v1. It also gives the rules for monetization after v1. All numbers are start values. Tune them with playtests and simulations.

Pillar 1 ("Fair to the player") controls all decisions in this document.

## 1. Currencies and resources

| Resource | Type | How the player gets it | What it is for |
| --- | --- | --- | --- |
| **Marks** (draft) | Soft currency | Battles, Star chests, Heynspire, Achievements | Packs, Combine, Gear upgrades |
| **Essence** | Craft resource | Extract, Heynspire milestones, Achievements | Craft |
| **XP** | Progress | Battles | Player level |
| **Stars** | Progress | Stage wins | Star chests |

- v1 has no premium currency.
- No resource has a time limit or a daily cap.
- There is no Energy. The player can do as many Battles as they want.

## 2. Sources (faucets)

### 2.1 Campaign Stages

| Region | Marks per win | XP per win | First win bonus |
| --- | --- | --- | --- |
| 1 Hearthvale | 60 | 40 | ×3 Marks, ×2 XP, and a fixed card |
| 2 The Thornwood | 100 | 70 | ×3 Marks, ×2 XP, and a fixed card |
| 3 The Hollow Marches | 150 | 100 | ×3 Marks, ×2 XP, and a fixed card |

- A Boss Stage gives ×2 of the values above.
- A loss gives 10% of the Marks and 25% of the XP of a win.
- A repeat win has a 20% chance to give one card from the Stage card pool, in its Base Rank.

### 2.2 Star chests

Each Region has 3 Star chests.

| Stars in the Region | Reward |
| --- | --- |
| 10 | 300 Marks and 1 Standard Pack |
| 20 | 30 Essence and 1 Race Pack (the Race of the Region) |
| 30 | 1 Cosmetic and 100 Essence |

### 2.3 Heynspire

| Floor | Reward for the first win |
| --- | --- |
| Each Floor *n* | 100 + 10 × *n* Marks, and 50 + 5 × *n* XP |
| Each 10th Floor | Also 1 Cosmetic and 150 Essence |

### 2.4 Achievements

Achievements give 50 to 500 Marks, 10 to 100 Essence, or a Cosmetic.

## 3. Sinks

### 3.1 Packs

| Pack | Cost | Cards | Content |
| --- | --- | --- | --- |
| **Standard Pack** | 500 Marks | 5 | All Creature Cards and Skill Cards |
| **Race Pack** | 700 Marks | 5 | Creature Cards of one Race. The player selects the Race. |

**Drop rates for each card in a Pack:**

| Rank | Chance |
| --- | --- |
| Stone | 62.0% |
| Jade | 27.0% |
| Sapphire | 9.0% |
| Amethyst | 1.8% |
| Sunstone | 0.2% |

**Pack rules:**

1. For each card, roll a Rank with the table above.
2. Select one card at random from the cards in the Pack pool with a Base Rank equal to or lower than the rolled Rank.
3. The card comes in the rolled Rank.
4. Each Pack has at least 1 card of Jade or higher. If the first 4 cards are all Stone, the fifth card is at least Jade.
5. Skill Cards come only for the current Hero Class. This keeps the Pack useful.
6. The Packs screen shows this table and these rules before the player opens a Pack.

### 3.2 Combine

| Target Rank | Copies needed | Marks |
| --- | --- | --- |
| Jade | 2 Stone | 50 |
| Sapphire | 2 Jade | 200 |
| Amethyst | 2 Sapphire | 800 |
| Sunstone | 2 Amethyst | 3,200 |

- Combine never fails.
- From Stone to Sunstone, a card needs 16 Stone copies and 8,200 Marks in total. This is the long-term chase.

### 3.3 Extract and Craft

| Rank | Essence from Extract | Essence cost to Craft (Base Rank) |
| --- | --- | --- |
| Stone | 5 | 40 |
| Jade | 15 | 120 |
| Sapphire | 50 | 400 |
| Amethyst | 175 | 1,400 |
| Sunstone | 600 | — (no card has Base Rank Sunstone) |

- Craft gives one copy in the card's Base Rank.
- The player can Craft only Discovered cards.
- Combine and then Extract changes Marks into Essence at about 10 to 13 Marks per Essence. This is intended. It gives players with many Marks a slow path to the card that they want.

### 3.4 Gear upgrades

The cost to upgrade an item to level *n* is 40 × *n*² Marks.

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marks | 40 | 160 | 360 | 640 | 1,000 | 1,440 | 1,960 | 2,560 | 3,240 | 4,000 |

One item from level 0 to 10 costs 15,400 Marks. All 4 items cost 61,600 Marks. This is the main Marks sink for the endgame.

## 4. Pacing targets

Use these targets to tune the numbers. Check them with an economy simulation and with playtests.

| Point in the game | Target |
| --- | --- |
| End of Region 1 (about 2 hours) | Player level 8 to 10. 3 to 5 Packs opened. First Combine done. |
| End of Region 2 (about 6 hours) | Player level 15 to 18. 12 to 18 Packs opened. 1 Amethyst card. |
| End of Region 3 (8 to 15 hours) | Player level 22 to 26. 25 to 35 Packs opened. 60% to 75% of cards Discovered. |
| Heynspire Floor 50 (about 30 hours) | Player level 30. All cards Discovered. 3 to 6 Sunstone cards. Gear mostly at level 7 or higher. |

- The XP for the next level is 50 + 25 × (current level − 1).
- Total XP to level 21 (Deck size 30) is 5,750. Total XP to level 30 is 11,600.

## 5. Monetization rules after v1

v1 has no shop. When a cosmetic shop comes in the online version, these rules apply:

1. **Cosmetics only.** Real money never buys cards, Marks, Essence, XP, Gear, or any boost.
2. **Direct purchase.** The player sees the exact item before they pay. There are no random paid items and no paid Packs.
3. **Clear prices.** Show the price in real money. If a premium currency exists, sell it only in amounts that match item prices, so no currency is left over.
4. **No pressure.** No countdown offers, no "only for you" pop-ups, and no ads that block play.
5. **Earnable.** Players can also get most Cosmetic types through Achievements and Heynspire.
6. **Minors.** Follow the law for minors in each country of release. Use parental controls where the law requires them.
7. **Refunds.** Follow the refund law of each country and platform.

## 6. Trading (after v1)

Trading between players is a risk for Pillar 1. People can sell cards for real money outside the game. This makes power available for money. A separate design review must decide trading before any work starts. Possible options:

- No trading. Players exchange only Cosmetics or nothing.
- Trading only with Essence and with limits.
- Trading only between guild members, with a daily limit.

## 7. Tuning tools

- An **economy simulation** script uses the rules package and the reward tables. It simulates a player through the Campaign and Heynspire, and it reports the values in section 4.
- During playtests, the game writes a local log of rewards and spending. The player can export the log and send it to the developer. The game never sends data automatically in v1.
