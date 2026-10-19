# 02 — Game Vision

## Elevator pitch

Heynbord is a fantasy card game for the web browser. You collect heroes, beasts and spells, build a deck, and send your units into battle lanes. Each card has a countdown. You decide when and where to play it. Then your army marches and fights automatically.

## High concept

*A collectible card game crossed with lane tower defense, where timing replaces mana.*

## Facts

| Item | Value |
| --- | --- |
| Name | Heynbord |
| Genre | Collectible card game (CCG), lane strategy, auto-battler |
| Platform | Web browser. Desktop first, mobile in landscape. |
| Technology | React, Three.js (React Three Fiber), TypeScript |
| Mode in v1 | Single player (PvE) with a local save |
| Mode after v1 | Asynchronous online PvP, guilds and co-op |
| Business model | Free-to-play with cosmetics only. v1 has no shop. |
| Languages | English (`en-us`) and Indonesian (`id-id`) |
| Team | One developer. AI tools make the art. |
| Target for v1.0 | About 6 months after the start of development |

## Why Heynbord exists

*Kings and Legends* and *Rise of Mythos* were Flash browser games from 2013. Players loved three things in them:

1. **The countdown hand.** Each card became ready after a number of turns, so timing was the main skill.
2. **The lane battles.** Units moved and fought by themselves, so placement and timing were the main decisions.
3. **The collection chase.** Players combined cards into higher ranks and built strong decks.

*Rise of Mythos* shut down in 2019. Adobe stopped Flash at the end of 2020. A 2023 revival on Steam has mostly negative reviews, because players say it is pay-to-win.

Today, no game gives this experience in a modern browser and in a fair way. Heynbord fills this gap.

## Target players

### Primary: the returning fan

- Age 25 to 40.
- Played Flash and Facebook card games in the early 2010s.
- Has little free time. Plays in sessions of 10 to 30 minutes.
- Dislikes pay-to-win games and aggressive monetization.
- Wants depth in deck building, but not the speed of real-time games.

### Secondary: the strategy card player

- Plays *Hearthstone*, *Marvel Snap*, *Teamfight Tactics* or *Legends of Runeterra*.
- Wants a new mechanic, and likes to "theory-craft" decks.
- Plays on a desktop browser at work breaks, or on a phone at home.

## Experience goals

When a player plays Heynbord, they must feel:

| Feeling | How the game gives it |
| --- | --- |
| **"I planned that."** | The player sees a combo work after many turns of patience. |
| **Tension** | Countdowns tick down on both sides. The player waits for the right moment. |
| **Discovery** | New cards open new deck ideas. Keywords combine in unexpected ways. |
| **Progress** | Each session gives new cards, higher ranks or a new stage. |
| **Respect** | The game never asks for money for power and never wastes the player's time. |

## Unique selling points

1. **Countdown hand in place of mana.** This is rare in card games and very specific to this genre.
2. **Automatic lane battles in 3D.** Card art stands on a 3D board, with light, camera movement and spell effects.
3. **Fair by design.** No pay for power, no failure chance, no Energy, and the drop rates are shown.
4. **No install.** The game opens from a link on desktop or phone.

## Comparable games

| Game | What Heynbord takes | What Heynbord does differently |
| --- | --- | --- |
| *Kings and Legends* / *Rise of Mythos* | Countdown hand, lanes, auto-combat, ranks, Combine | Fair economy, modern 3D web presentation, smaller and clearer rule set |
| *Hearthstone* | Polish, readable board, card feel | No mana. Units move in lanes. |
| *Plants vs. Zombies* | Lane readability, unit roles | Both sides are players with decks. |
| *Teamfight Tactics* | Watch-the-battle satisfaction | Turn-based with a hand of cards, not a shop and a bench |

## World and tone

Heynbord is the name of the world. It is a bright high-fantasy world with some humor. Four peoples live in it (the race names are drafts):

- **Hearthkin:** Humans and stout folk of the river towns. Shields, horses and banners.
- **Thornwild:** Forest folk and plant spirits. Archers, vines and poison.
- **Hollowborn:** Old spirits that wear bones and armor. They return after death.
- **Wildmaw:** Beast tribes of the badlands. Fast, loud and strong.

The tone is like a classic adventure story. It is colorful and heroic, and characters sometimes make jokes. There is no gore.

## Scope of v1

v1 includes:

- A campaign of 3 regions with about 30 stages and 3 bosses.
- **Heynspire** (draft name): a tower of 50 floors for the endgame.
- About 100 cards: 4 races, 4 classes, 5 ranks.
- Collection, deck builder, packs, Combine, Extract, Craft and hero gear.
- Achievements that unlock cosmetics.
- A local save with export and import.
- English and Indonesian.

v1 does not include:

- Online play, accounts, PvP, guilds or chat.
- A shop or real-money payments.
- Trading between players.
- Hybrids, awakening, or more than 4 races.

## What Heynbord is not

- It is **not** a copy of the original games. All names, lore, art and numbers are new.
- It is **not** a real-time action game. The player has time to think.
- It is **not** a game about money. Monetization never touches game power.

## Definition of success

| Level | Success means |
| --- | --- |
| v1.0 | A player can finish the campaign in 8 to 15 hours. Playtesters want to continue in Heynspire. |
| Quality | Battles are easy to read. In playtests, 8 of 10 players can explain why they won or lost. |
| Fairness | No playtester says "pay-to-win" or "too much grind" as their main problem. |
| Technical | The game runs at 60 fps on a normal laptop and at 30 fps or more on a mid-range phone. |
| Personal | The developer finishes and releases v1.0, and the architecture is ready for v2 online play. |
