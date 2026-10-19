# 01 — Design Pillars

## Purpose

The design pillars are the 5 rules for all design decisions in Heynbord. When two options are both good, use the pillars to select one. If a feature does not support a pillar, remove it or change it.

The pillars have an order. When two pillars disagree, the pillar with the lower number wins.

## Pillar 1 — Fair to the player

The player never pays for power. The player never loses progress because of luck.

**This means:**

- No real money buys cards, currency, gear or any gameplay advantage.
- Combine and gear upgrades never fail and never cause a downgrade.
- The game shows the drop rates of all packs.
- There is no Energy and no other limit on how many battles a player can do.
- A player can get every card through play.

**This does not mean:**

- The game is easy. Battles can be hard.
- All rewards are fixed. Random packs are permitted, because they cost only currency from play.

**Test:** "Does a player with more money or more luck get an advantage that other players cannot get through play?" If yes, change the feature.

## Pillar 2 — Plan, then watch

The player makes all decisions before the units act. Then the battle resolves by clear, fixed rules, and the player watches the result.

**This means:**

- The player decides which card to play, which lane to use and when to play it.
- After the player ends the turn, units move and attack automatically.
- The same start state and the same player actions always give the same result.
- Each unit action is easy to see and easy to understand in the 3D scene.

**This does not mean:**

- The player has no skill expression. Deck building, timing and lane choice are the skill.
- Battles must be slow. The player can use speed ×2, skip or auto-play.

**Test:** "Can the player explain why they won or lost after they watch the battle?" If no, make the rule or its presentation clearer.

## Pillar 3 — Timing is the resource

The countdown is the core mechanic. Each card becomes ready after a number of turns. The main decisions are when to play a card and when to wait.

**This means:**

- Heynbord does not use mana or a similar cost resource.
- Strong cards have a long countdown. Weak cards have a short countdown.
- Effects that change countdowns are an important card family.

**This does not mean:**

- Countdown is the only limit. The hand limit, the summon column and the lanes are also limits.

**Test:** "Does this card or rule make the player think about timing?" Prefer designs that do.

## Pillar 4 — Every card has a future

No card is useless. Duplicate cards and weak cards always have a use.

**This means:**

- Two identical cards of the same rank can Combine into one card of the next rank.
- The player can Extract any card into Essence, and then Craft the card that they want.
- Low-rank cards can be good in some decks, because their countdown is short.

**This does not mean:**

- All cards are equally strong. Some cards are better than others.

**Test:** "When the player gets this card, can they do something useful with it?" If no, add a use.

## Pillar 5 — Light and readable on the web

Heynbord is a web game. It opens fast in a browser, it runs well on normal computers and phones, and it is easy to read on a small screen.

**This means:**

- The first screen loads quickly. The game loads large assets only when it needs them.
- The 3D scene supports the cards. Effects must not hide the board or the stats.
- The game works with a mouse, a keyboard and touch.
- The game is playable on a phone in landscape.

**This does not mean:**

- The game looks cheap. 2.5D art with good light and effects can look rich.

**Test:** "Does this asset or effect make the game slower to load, slower to run or harder to read?" If yes, make it smaller or remove it.

## How to use the pillars

1. Before you add a feature, write which pillar it supports.
2. Check the feature against the test of each pillar.
3. If the feature fails a test, change it or remove it.
4. Record important decisions in the [Game Design](./03-game-design.md) document or in an ADR.
