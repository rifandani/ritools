# 05 — Art and Audio Direction

## 1. Visual goal

Heynbord looks like a **painted fantasy card game in a small 3D diorama**. Card art stands on a 3D Board like cardboard figures on a game table. Light, shadows, camera movement and spell effects make the scene feel alive.

Key words: **bright, warm, clear, handmade, a little funny.**

Not: dark, realistic, gory, noisy, neon.

## 2. 2.5D presentation

| Element | How it looks |
| --- | --- |
| **Units** | Card art cut out (transparent background) on a flat plane, standing on a small round base. The plane always faces the camera on the vertical axis (billboard). |
| **Board** | A real 3D model: a table-land with Lanes of stone or wood tiles. Each Region has its own Board skin. |
| **Heroes** | A larger cut-out figure at the end of the Lanes, with a 3D frame and an HP bar. |
| **Cards in the Hand** | 2D UI (React), not in the 3D scene. This keeps text sharp. |
| **Effects** | 3D particles, simple shaders and light flashes. |
| **Background** | A painted panorama behind the Board, with slow parallax. |

### 2.1 Unit feedback without animation rigs

Units are flat images, so the game shows actions with movement of the plane:

| Action | Feedback |
| --- | --- |
| Idle | Slow up-and-down movement (breath) and a small sway |
| Move | Small hops from Square to Square |
| Attack (melee) | Lean back, then a fast lunge forward, and a hit flash |
| Attack (ranged) | A projectile (arrow, bolt, orb) flies to the target |
| Hit | Shake, a red tint for a short time, and a damage number |
| Crit | A larger damage number, a short camera shake |
| Block | A shield icon and a "clang" sound |
| Death | The figure falls back flat and fades out with dust or spirit particles |
| Summon | The figure rises from the Square with a light ring in the Race color |

## 3. Camera

- Angle: a 3/4 view from behind the player's side, about 35° to 45° down.
- The Lanes go from left (player) to right (enemy). This fits landscape screens.
- The camera does a small push-in for Crits, Boss attacks and the last hit of the Battle.
- With "reduced motion" on, the camera does not move or shake.
- The camera never hides any Square. All Units must stay visible at all times.

## 4. Color

### 4.1 Race colors

| Race | Main color | Second color | Materials |
| --- | --- | --- | --- |
| Hearthkin | Royal blue | Gold | Steel, cloth banners, wood |
| Thornwild | Leaf green | Warm brown | Bark, leaves, flowers |
| Hollowborn | Pale teal | Bone white | Old bronze, bone, spirit fire |
| Wildmaw | Burnt orange | Dark red | Leather, fur, rough iron |

### 4.2 Rank colors

Stone (grey), Jade (green), Sapphire (blue), Amethyst (purple), Sunstone (orange). The card frame shows the Rank color and pips (see GDD 5.3).

### 4.3 Damage Type colors and icons

| Damage Type | Color | Icon |
| --- | --- | --- |
| Physical | White | Sword |
| Fire | Orange-red | Flame |
| Frost | Light blue | Snowflake |
| Holy | Gold-yellow | Sun |

Always use the icon with the color, for players with color blindness.

## 5. AI art workflow

### 5.1 Style guide

Before production, make a **style bible** with:

1. 10 to 15 "golden" reference images that show the target style. Make them with the AI tool, and then fix them by hand.
2. A fixed prompt template for each Race (see 5.2).
3. A character sheet for each Hero, boss and important Unit (front view, colors, key shapes).
4. A list of words that are not permitted in prompts: the names of living artists, other games, and other companies' characters.

### 5.2 Prompt template

```text
[subject], [Race] of Heynbord, [pose], full body, centered,
painterly fantasy card illustration, bright warm light, clean silhouette,
soft brush texture, [Race main color] and [Race second color] palette,
plain background, no text, no frame
```

### 5.3 Steps for each card

1. Write the card concept: name, Race, role, one sentence of description.
2. Make 4 to 8 images with the prompt template and the style references.
3. Select one image with the review checklist (5.4).
4. Fix problems by hand or with inpainting (hands, weapons, extra parts).
5. Remove the background, for the Unit cut-out.
6. Make 2 exports: card art (portrait, with background) and Unit cut-out (transparent).
7. Compress the textures (see Technical Design, section 6).
8. Write the record (5.5).

### 5.4 Review checklist

- [ ] The silhouette is clear at 128 px tall.
- [ ] The Race colors are correct.
- [ ] The light comes from the upper left, as in all other art.
- [ ] No extra fingers, broken weapons or strange body parts.
- [ ] No text, logo or signature in the image.
- [ ] The image does not look like a known character from another game.
- [ ] The style matches the golden references.

### 5.5 Licence record

For each asset, record: the file name, the tool and version, the date, the prompt, the seed (if available), the licence terms of the tool, and the hand changes. Keep the record in the repository. Use only tools whose terms permit commercial use.

## 6. User interface style

- The UI uses the existing React Aria component library in `apps/web`, with a Heynbord theme.
- Panels look like parchment and wood, but text sits on flat, high-contrast areas.
- Fonts: one display font for titles (fantasy style, used only in large sizes) and one clear sans-serif font for all other text. Both fonts must support Indonesian characters.
- Countdown numbers on cards are large and bold. A Ready card has a gold glow.
- Icons are simple and flat, with the same line width.

## 7. Audio direction

### 7.1 Music

- Style: light orchestral folk. Flutes, strings, small drums. Each Region has its own theme.
- Tracks for v1: Title, Camp, 3 Region Battle themes, 1 Boss theme, Victory sting, Defeat sting.
- Source: AI music tools, with the same licence record as the art. Music has low priority. The game must be complete without music.

### 7.2 Sound effects

- Source: sound effect packs with a free licence that permits commercial use (for example CC0).
- Each Battle action has a sound: summon, move, each attack type, each Damage Type, Crit, Block, death, Countdown "tick" when a card becomes Ready, End Turn.
- Each UI action has a short, soft sound.
- Races have small sound differences (for example metal for Hearthkin, wood for Thornwild).

### 7.3 Mix

- Separate volume controls: master, music, effects.
- At speed ×2, the game plays fewer sounds at the same time, so that the sound stays clear.
