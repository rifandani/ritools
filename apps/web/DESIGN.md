---
name: Ritools
description: Small, local-only web tools, printed as a ransom note on paper with red and ink fields.
colors:
  red: "#D7001A"
  ink: "#0B0B0B"
  paper: "#F6F4EF"
  white: "#FFFFFF"
  primary-ink: "#B80016"
  primary-ink-dark: "#FF5468"
  primary-subtle: "rgb(215 0 26 / 0.1)"
  primary-subtle-fg: "#A10013"
  primary-subtle-fg-dark: "#FF7A8A"
  secondary: "#E6E2D8"
  muted: "#ECE9E1"
  muted-dark: "#23221F"
  muted-fg: "#57534B"
  border: "#CFCAC0"
  input: "#75716A"
  chip-stock: "#E6DFCF"
  chip-edge: "rgb(11 11 11 / 0.14)"
  carbon: "#161514"
  carbon-raised: "#1F1E1C"
  carbon-chip: "#2A2926"
  muted-fg-dark: "#ADA89D"
  border-dark: "#3A3835"
  input-dark: "#8A867E"
  rail-border: "#2E2C29"
  rail-muted-fg: "#B5B0A5"
  success: "#0B7A43"
  success-subtle-fg: "#075A31"
  success-dark: "#3DCB7F"
  warning: "#F2B200"
  warning-subtle-fg: "#6B4200"
  warning-subtle-fg-dark: "#FFD25C"
  danger: "#C2410C"
  danger-subtle-fg: "#8F2F08"
  danger-dark: "#F26B3A"
  danger-subtle-fg-dark: "#FF9A72"
  info-subtle: "rgb(11 11 11 / 0.07)"
  info-subtle-dark: "rgb(246 244 239 / 0.08)"
  info-subtle-fg: "#0B0B0B"
  info-subtle-fg-dark: "#F6F4EF"
  chart-1: "#D7001A"
  chart-2: "#0B0B0B"
  chart-3: "#57534B"
  chart-4: "#75716A"
  chart-5: "#8C877D"
  chart-1-dark: "#FF5468"
  chart-2-dark: "#F6F4EF"
  chart-3-dark: "#B5B0A5"
  chart-4-dark: "#8A867E"
  chart-5-dark: "#7C786F"
typography:
  display:
    fontFamily: "Anton, Abril Fatface, Alfa Slab One, Archivo, sans-serif"
    fontSize: "clamp(4rem, 9vw, 8.5rem)"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Anton, Abril Fatface, Alfa Slab One, Archivo, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 3.25rem)"
    fontWeight: 400
    lineHeight: 1
  numeral-display:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "clamp(6.5rem, 28vw, 15rem)"
    fontWeight: 800
    lineHeight: 0.82
    letterSpacing: "0"
    fontFeature: "tnum, zero"
    fontVariation: "wdth 75"
  poster-title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 6vw, 3.25rem)"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "wdth 75"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.5rem
    letterSpacing: "0.02em"
    fontVariation: "wdth 75"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5rem
  body-lead:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75rem
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.25rem
    letterSpacing: "0.05em"
    fontVariation: "wdth 87.5"
  label-group:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1rem
    letterSpacing: "0.08em"
    fontVariation: "wdth 87.5"
  numeral:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0"
    fontFeature: "tnum, zero"
    fontVariation: "wdth 75"
  code:
    fontFamily: "Martian Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1rem
    fontVariation: "wdth 87.5"
rounded:
  none: "0px"
  seal: "9999px"
spacing:
  rule: "2px"
  rule-heavy: "3px"
  gutter-phone: "16px"
  gutter-tablet: "32px"
  gutter-desktop: "48px"
  cell: "20px"
  card: "24px"
  entry-gap: "96px"
  category-gap: "128px"
  navbar-height: "64px"
  rail-width: "280px"
  touch-target: "44px"
components:
  button-primary:
    backgroundColor: "transparent"
    textColor: "{colors.primary-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.primary-ink}"
  button-primary-pressed:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-secondary-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-outline-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger-subtle-fg}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-danger-pressed:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
  button-seal:
    rounded: "{rounded.seal}"
    size: "44px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "{spacing.card}"
  card-title:
    typography: "{typography.title}"
  menu:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "6px"
  menu-item-focused:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    padding: "8px 12px"
  navbar:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
    height: "{spacing.navbar-height}"
    padding: "10px 16px"
  rail:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    width: "{spacing.rail-width}"
  variant-cell:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
    padding: "{spacing.cell}"
  ransom-chip-white:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
  ransom-chip-stock:
    backgroundColor: "{colors.chip-stock}"
    textColor: "{colors.ink}"
  ransom-chip-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  ransom-chip-red:
    backgroundColor: "{colors.red}"
    textColor: "{colors.white}"
---

# Design System: Ritools

## Overview

**Creative North Star: "The Pinned Ransom Note"**

Ritools looks like a note that a person cut from magazines and pinned to a print shop wall. Names are made from cut-out letters on paper chips. All other text is plain print. Hard ink rules divide the page. Three color fields set the structure: a red field for the navbar, an ink field for the side rail, and paper for the content.

The system is flat and loud. It has no soft depth, no rounded corners (the round seal is the one exception), no gradients for depth, and no glass. Contrast, rule weight, and the shape of a mark carry all hierarchy and all state. A control at rest is an outline. When you press it, it fills. When it is disabled, a line strikes through it. When it has keyboard focus, a heavy bracket stands on each side. You can read each state by shape, not only by color.

The density is high but strict. Showcases sit in equal cells on shared 2px rules. Numbers always use one numerals face in fixed columns. Only two diagonal angles occur in drawn shapes: a small tilt and a steeper slash.

**Key Characteristics:**

- Four brand colors: red, ink, paper, and white. The color mode does not change them.
- Three grounds: red (navbar), ink (rail), paper (content). A ground redefines the role tokens for what sits on it.
- Ransom names from cut-out chips in four display faces. All other text is Archivo.
- Martian Mono at 75% width for every number.
- Zero radius, except the round seal: opt-in on an icon button, a badge, and an avatar, and always on a radio indicator. No shadows for depth. 2px rules, 3px heavy rules.
- Printed-mark states: outline, double outline, solid fill, red foot (selected), strike-through, bracket. An invalid selection prints hollow in a doubled danger rule.
- Two angles only in drawn shapes: tilt (4deg) and slash (16deg).
- Color mode follows the OS by default. The server render is light.
- Overlays print on the page: a flat ink scrim, a 2px rule frame, and a slam from the side they came from. Nothing blurs.

## Colors

A print palette: one hot red, one near-black ink, warm off-white paper, and white stock, with semantic hues that stay away from the red.

### Primary

- **Poster Red** (#D7001A): The fill red. It is the navbar field, the solid fill of a pressed primary button, the red ransom chip, the link rule, the route stroke in the rail, the slash bar on fallback pages, text selection, and the browser theme color. White text on it is 5.4:1. Do not use it as a text color on paper.
- **Text Red** (#B80016 light, #FF5468 dark): A separate token (`--primary-ink`) for red words and for the primary button outline text. It is 6.3:1 on paper and 5.5:1 on the dark ground. On the red ground it becomes white.
- **Red Wash** (`rgb(215 0 26 / 0.1)`, text #A10013): The hover fill of a primary mark. On carbon the wash deepens to 14% and its ink lifts to #FF7A8A.

### Neutral

- **Ink** (#0B0B0B): Body text in light mode, the rail field, the ink ransom chip, all rules in light mode, the hover bar in lists and menus, and the focus bracket in light mode.
- **Paper** (#F6F4EF): The page ground in light mode. Text on ink and in dark mode. Rules and the focus bracket in dark mode.
- **White Stock** (#FFFFFF): Cards, popovers, menus, and the white ransom chip. Small text on the red field is always white.
- **Chip Stock** (#E6DFCF): The fourth ransom chip, a warm newsprint tone. It appears only in Ransom.
- **Secondary Paper** (#E6E2D8): The rest fill of a secondary button.
- **Muted Paper** (#ECE9E1, #23221F on carbon) and **Muted Ink** (#57534B): Quiet surfaces and secondary text in light mode.
- **Hairline** (#CFCAC0): Default border for low-weight dividers (menu separators and table column rules).
- **Control Edge** (#75716A light, #8A867E dark): The outline of an `outline` button and of inputs. It is 4:1 on paper, above the 3:1 floor for UI parts. Also the scrollbar thumb.
- **Carbon** (#161514): The page ground in dark mode. **Carbon Raised** (#1F1E1C) is the dark card, popover, and rail hover surface. **Carbon Chip** (#2A2926) is the ink chip and the secondary fill in dark mode, one step above Carbon so it stays visible.
- **Dark Muted Ink** (#ADA89D), **Dark Hairline** (#3A3835): Secondary text and dividers in dark mode. On the ink rail, muted text is #B5B0A5 and dividers are #2E2C29.

### Semantic

- **Signal Green** (#0B7A43 light, #3DCB7F dark): Success fills. Text on the success wash is #075A31.
- **Caution Yellow** (#F2B200, both modes): Warning fills, always with ink text. Text on the warning wash is #6B4200 light, #FFD25C dark.
- **Burnt Vermilion** (#C2410C light, #F26B3A dark): Danger fills. Its hue is orange-red, clearly apart from Poster Red. Text on the danger wash is #8F2F08 light, #FF9A72 dark.
- **Ink Wash** (7% ink light, 8% paper dark, text ink/paper): The info note and the info badge. Info is the neutral status: a wash of the text color, never a fourth hue.

### Named Rules

**The Own-Hue Rule.** Semantic colors never borrow the brand red. Danger is burnt vermilion, not Poster Red. A red mark means "brand" or "primary action"; it never means "error".

**The Two-Reds Rule.** Poster Red fills; Text Red writes. Use `--primary` for fields, fills, and rules. Use `--primary-ink` for red words on paper or carbon.

**The Hollow Invalid Rule.** A selected control that is invalid never fills with danger: a danger fill next to a red mark changes only the hue. It prints hollow: no fill, no foot, the edge doubled in danger (an inset 2px second rule), and its numeral or glyph in the danger wash ink. This holds for dates, range ends, checkboxes, radios, and choice box options.

**The Wash Ink Rule.** A status tone is carried by its wash foreground, never by its fill hue. The fill hues are for fields: Caution Yellow never reaches 3:1 on paper. A note takes the wash ink for its frame, a meter takes it for its fill, a tracker block takes it for its plate.

**The Ground Rule.** A color field redefines the role tokens for its children (`.ground-red`, `.ground-ink`). On red, the primary becomes white, rules become white, and the red chip becomes ink. On ink, rules become paper and the ink chip lifts to Carbon Chip. Put a stock control on a ground; do not add new props for it.

**The Proof Mark Rule.** A chart series is named by a tone and a proof mark. Five series never depend on color: every fill carries a pattern, every line a dash, and the legend prints the same mark. The two closest tones (04 and 05) always differ by mark. A chart is a proof sheet, not a color wheel.

## Typography

**Display Font:** Ransom set: Anton, Abril Fatface, Alfa Slab One, and Archivo 900 at 125% width (with Archivo as fallback) **Body Font:** Archivo, variable width 62–125%, weight 100–900 (with ui-sans-serif, system-ui) **Label/Mono Font:** Martian Mono, variable width 75–112.5% (with ui-monospace)

**Character:** A cut-and-paste display set against one disciplined grotesque. Archivo changes width to change voice: 75% for poster titles and card titles, 87.5% for button and group labels, 100% for reading text. Martian Mono at 75% width is the only numerals face. All fonts are self-hosted from `public/fonts` under the SIL OFL. There is no Google Fonts import, so the PWA works offline.

### Hierarchy

- **Display** (Ransom, clamp(4rem, 9vw, 8.5rem), line-height 1): Category headings. The heading is wider than the column and the right page edge crops it.
- **Headline** (Ransom, clamp(2rem, 4.2vw, 3.25rem), line-height 1): Component Entry titles. With `fit`, a long word shrinks to its line.
- **Numeral Display** (Martian Mono 800, 75% width, clamp(6.5rem, 28vw, 15rem), line-height 0.82): Status codes on fallback pages and the "0" of an empty result.
- **Poster Title** (Archivo 900, 75% width, clamp(2rem, 6vw, 3.25rem), line-height 1, uppercase, 0.01em): The words under a numeral display, and the offline page title.
- **Title** (Archivo 800, 75% width, 1.125rem / 1.5rem, uppercase, 0.02em): Card titles. The rail name "Component Catalog" uses the same voice at 1.625rem, weight 900.
- **Body** (Archivo 400, 1rem / 1.5rem): Reading text. **Body Lead** (1.125rem / 1.75rem, muted) is the message on poster pages, at most 52ch wide.
- **Label** (Archivo 700, 87.5% width, 0.875rem / 1.25rem, uppercase, 0.05em): Button text. Size `xs` to `lg` steps from 0.75rem to 0.9375rem.
- **Group Label** (Archivo 700–800, 87.5% width, 0.75–0.8125rem, uppercase, 0.07–0.08em): Menu section headers, rail Category names, and fieldset legends. It names a group of items; it never sits above a headline as a kicker.
- **Numeral** (Martian Mono, 75% width, tabular and slashed zero): Every count, date segment, and figure, through the `num` utility.
- **Code** (Martian Mono, 87.5% width): `code`, `kbd`, `samp`, `pre`, and the prop captions in Variant cells.

### Named Rules

**The Ransom Rule.** Ransom is only for names: Component Entry titles, Category headings, the Ritools wordmark, Tool names, the title of a pinned note (a dialog, a sheet, a drawer), and Squeeze outcome words at poster scale (for example the all-miss "Miss"). Never use it for labels, inputs, numbers, or body text. Assistive technology reads the plain name, never the chips. In the Squeeze ledger, where an outcome must read at a glance across a hundred rows, the five outcomes (Done, Already fits, Miss, Bigger, Rejected) take the Poster Title voice at 0.875rem instead; the word and its state mark carry the row.

**The One Numerals Rule.** Every number uses the `num` utility: Martian Mono, 75% width, tabular figures, slashed zero. Numbers sit in fixed columns (for example a `3ch` width for catalog counts) so they do not shift when they change.

**The Same Cut Rule.** One text always cuts the same way. A stable hash of the text seeds the face, chip, tilt, lift, and scissor cut of each letter, so the server and the client render the same note.

## Layout

The shell is a red navbar strip (min height 64px, 16px side padding, 24px from 640px). It holds the ransom wordmark at 1.75rem on the left, and the theme and language toggles on the right. A Tool adds content under it, never new chrome.

The Component Catalog is two columns from 768px: a sticky ink rail 280px wide at full viewport height, and a content column. A sticky paper filter bar tops the content column, with a 3px rule under it, the search field on the left, and the count on the right. Below 768px the rail folds into a menu button inside the filter bar.

Content gutters are 16px on phones, 32px from 640px, and 48px from 1024px. Categories are 128px apart; Component Entries are 96px apart. A 3px rule runs under each Category heading to the right page edge. The general `Container` is at most 1280px wide with 16px padding (24px from 640px).

The Variant grid fills tracks at `minmax(min(100%, 13.5rem), 1fr)`. Each cell has 20px padding, a 20px gap, and its own closed 2px frame. The grid pulls each cell 2px up and left, so a shared rule prints once at the same weight. A wide showcase spans two tracks or the full row.

Poster pages (404, error, offline, empty filter) stack left-aligned: numeral, red slash bar (176px × 12px, slashed at 16deg), poster title, lead text, one action. They center on the viewport height under the navbar.

### Squeeze surface

`/squeeze` is the one surface that adds a second red field and a wider container. Its proof ledger is a two-rail composition: a 280px ink rail holds a paper job ticket, the Batch prints as a ruled ledger with one 2px rule under each row and no column rules, and a sticky red Actions bar sits under the ledger. That bar's 4px top edge is its measure: it grows as rows land. The ledger's rows are read, not selected, so the row hover bar and the red foot do not apply. The Tool's `Container` may widen to 1440px to hold the seven ledger columns; the catalog and every other page keep 1280px.

### Tool Catalog surface

`/` is a printer's proof sheet under the red navbar. A page-title course holds the plain h1 `Tools` in the Poster Title voice at a larger scale (Archivo 900, 75% width, clamp(3.5rem, 9vw, 6.5rem), line-height 0.9), the one-line deck at most 44ch, and the Tool count in a fixed `2ch` numerals column. Beside it from 1024px, a red LOCAL ONLY stamp plate carries white text, white 2px rules, and the three promises. A 3px rule closes the course. The sheet below is one full-width 2px frame: each Tool prints as a numbered proof with a `2.5rem` numeral column at 1024px, a ruled note band closes it, and a 2px closing rule carries "More tools are on the way." The band holds at one Tool and at ten; no column is held open for a note.

The sheet enters once: the stamp presses from 1.12 scale and a 2px rise (320ms), the top rule prints from the left (420ms), and the count numeral lands (220ms), offset by 80/160/300ms on the expo ease. Reduced motion holds the composed sheet.

### Named Rules

**The Strict Grid Rule.** Showcases sit in equal cells on shared 2px rules. Do not float cards, add gaps between cells, or let a cell grow its own height style.

## Elevation & Depth

The system is flat. Every Tailwind shadow and drop-shadow token resolves to `0 0 #0000`. Depth comes from color fields (red, ink, paper, white stock) and from rule weight. A popover or menu is white stock with a 2px rule frame on the page; it does not float on a shadow.

An overlay separates with a field, not with blur: a flat ink scrim at 50% over the page (70% in dark mode) holds the page still and sharp behind a dialog, a sheet, a drawer, a menu, or the command menu.

`box-shadow` draws edges only, never elevation: the 1px hairline edge of a ransom chip, the inset 2px second rule of a hovered mark, an open or invalid well, an invalid drop zone, a hollow invalid selection (date, range end, checkbox, radio, choice box option), and an active code slot, the red foot of a selected mark (`inset 0 -4px 0`), and the red fill that rises from the rule of a hovered ink link (`inset 0 -1.3em 0`). A date cell draws its foot and its strike as a background image from the border box instead, so they join from date to date.

### Named Rules

**The Print Has No Lift Rule.** Nothing floats. If two surfaces must separate, use a rule or a field change, never a shadow or blur.

## Shapes

All corners are square. Every Tailwind radius token resolves to 0px. The one round shape is the seal, and it is opt-in: an icon button takes it with `isCircle`, a radio indicator is always a seal so a radio never reads as a checkbox, a badge takes it with `isCircle`, and an avatar takes it with `isSquare={false}`. A badge and an avatar are square by default, and the round one holds a single mark, never a word.

Lines are hard and flat: 2px ink rules for frames, cards, popovers, and cells; 3px for the filter bar rule, the Category underline, the primary button, the focus bracket, the slider thumb frame, and the disabled strike. In dark mode and on the ink rail, rules are paper; on the red field they are white.

Drawn diagonals use two angles only. **Tilt** (4deg) is a rotation: ransom chips rest at -4deg, 0, or +4deg, and a popover drops in from a -4deg tilt. **Slash** (16deg) is a lean from vertical: the slash bar on poster pages, the scissor cut on ink and red ransom chips, and the fly-in rotation of chips. The cut width is the chip height × tan(16deg) (0.2867).

Loaders keep the square: a square track with one solid run that travels its edge (`ring`), and four square blocks that light in turn (`spin`). Nothing rotates, so no third angle appears.

A dial is a square frame, not a circle: a 2.5-unit frame in a 24-unit box, the run travelling its edge, and the figure set in the middle in the numerals face. It is an SVG icon like the loaders, so its frame is stated in units and never promoted to a rule weight.

A popover and a tooltip meet their trigger with a square tab: a 12px square of the panel's own stock that overlaps the trigger by 2px and breaks the frame where it joins, so the note reads as one cut shape. It is never a triangle.

### Named Rules

**The Two Angles Rule.** A drawn diagonal is 4deg or 16deg. Icon glyphs keep their own drawing.

**The Inside Bracket Rule.** A row takes the bracket inside its own edge, not 7px outside it: a 3px bracket with 10px arms at each side, drawn on the row's own border. An outside bracket would cross the rows above and below. A card that sits at the edge of a clip takes the same inside placement, and it clears its own rule on focus, so the bracket stands clear instead of thickening the edge.

## Components

### Buttons

Printed marks: confident, flat, and legible by shape in every state.

- **Shape:** Square corners (0px). Uppercase label at 87.5% width with 0.05em tracking. Size `md` is 44px tall on phones and 40px from 640px, with 16px / 14px side padding. Icon-only sizes (`sq-*`) carry a 44px touch target.
- **Primary:** A 3px Poster Red outline with Text Red label at rest. Hover adds the red wash and an inset 2px second outline. Press fills solid red with a white label and moves the mark down 1px.
- **Secondary:** Secondary Paper fill with a 2px rule outline. Press fills solid ink with a paper label.
- **Outline:** A 2px Control Edge outline. Hover doubles the outline in ink. Press fills solid ink.
- **Plain:** No outline at rest. Hover draws the 2px ink outline. Used for the language toggle on the navbar.
- **Success / Warning / Danger:** The same mark model in the semantic hue: outline and wash text at rest, solid semantic fill when pressed.
- **Disabled:** The outline fades to 40%, the label turns muted ink in every intent (at least 5:1 on every ground and tint; a faded hue fails AA), and a 3px line strikes through the whole mark.
- **Focus:** A 3px bracket 7px outside the mark, with 10px arms at each side. It snaps in from a scale of 1.12 × 1.3 over 260ms.
- **Pending:** The label changes (for example "Saving") and a square loader can sit in the mark. The cursor shows progress.

### Links

- **Ink link:** Archivo 600 with a 2px Poster Red underline at 0.24em offset. Hover and press fill the words with red from the rule up and turn the text white. Disabled strikes the words through in muted ink. Focus uses the same bracket as a button.
- The wordmark link in the navbar has no underline and no fill.

### Cards / Containers

- **Corner Style:** Square (0px).
- **Background:** White Stock in light mode, Carbon Raised in dark mode.
- **Shadow Strategy:** None (see Elevation & Depth).
- **Border:** 2px rule on all sides. A footer with `border-t` takes a 2px rule.
- **Internal Padding:** 24px gutter on all sides and between parts.
- **Title:** Title style (Archivo 800, 75% width, uppercase). Description in muted ink, 0.875rem / 1.5rem.

### Menus and Popovers

- **Surface:** White Stock (Carbon Raised in dark mode), 2px rule frame, square, 6px inner padding for menus. At most 20rem wide.
- **Motion:** A popover drops in like a pinned note: it unclips from the top, moves 6px down, and settles from a -4deg tilt over 280ms. It lifts out over 140ms.
- **Items:** Archivo 500, 0.875rem / 1.5rem (1rem on phones). Hover and keyboard focus put a solid ink bar behind the item with paper text (paper bar with ink text in dark mode). A selected item is bold with a check. A disabled item is muted and struck through.
- **Section header:** Group Label style. With `separator`, a 2px rule closes it.
- **Danger / warning items:** Text in the wash foreground of the semantic hue. Focus fills with the semantic wash.

### Inputs / Fields

Wells: the box a value is typed or picked into. The well is the wrapper and carries the rule, the bracket, and the strike. The input in it has no border of its own.

- **Shape:** Square (0px). A 2px rule in Control Edge on a transparent ground. Text is Archivo 1rem / 1.5rem (0.875rem from 640px). The placeholder is muted ink.
- **Hover:** The rule turns ink. It also stays ink while focus is inside the well.
- **Open:** While a select, combo box, or multiple select list is out, or while a date picker calendar is out, the ink rule doubles (an inset 2px second rule).
- **Focus:** The heavy bracket of a button, outside the well. It shows when keyboard focus lands anywhere inside it.
- **Invalid:** The rule doubles in danger, and the field prints an error line: an exclamation icon and Archivo 500 text in the danger wash ink. The hue is never the only signal.
- **Pressed:** A select trigger is a button, so a press fills it solid ink with paper text and chevron. While the list is out, it prints the open rule instead.
- **Disabled:** The rule fades to 40%, the text turns muted, and a 3px muted line strikes through the whole well. The field does not fade as a whole, so its label and description keep their contrast.
- **Inner marks:** The search clear button, the combo box list button, the number steppers, and the calendar button of a date picker sit inside the 2px rule. They are muted at rest, ink on hover, and solid ink when pressed. Number steppers are 44px wide (36px from 640px), with 2px Control Edge dividers. A stepper fades at its bound. The calendar button is 44px wide (36px from 640px), behind a 2px Control Edge divider. While the calendar is out, it prints ink, not the press.
- **Textarea:** No resize grip, because its hatch would be a third diagonal. The box grows with its content, from a minimum of 6rem.
- **Multiple select:** A well holds the picked tags (the Tag mark) and an outline add mark. In the popover, the search strip drops its well, and a 2px rule closes it.
- **Labels:** Plain Archivo 600, 1rem / 1.5rem (0.875rem from 640px), sentence case. Never Ransom. A required field takes a bold ink asterisk, not red. A disabled label turns muted.
- **Description:** Muted ink, 0.875rem / 1.5rem.
- **Legend:** The Group Label voice (Archivo 700, 87.5% width, 0.75rem, uppercase, 0.08em) over a 2px rule. It names a group of fields.
- **Checkbox and radio:** A 20px indicator (18px from 640px) with a 2px Control Edge. Hover turns the edge ink. Press fills it solid ink. Selected is solid ink with a paper glyph: a check or a dash for the checkbox, and a square paper dot for the radio. The radio indicator is a round seal, so it never reads as a checkbox. When the control is selected, hover doubles the edge outward with a 2px ink outline. Invalid turns the edge danger; selected and invalid print hollow (The Hollow Invalid Rule): the edge doubles in danger and the glyph or dot takes the danger wash ink. Disabled fades the edge to 40% and strikes the label. Focus brackets the whole control, indicator and label. The option label is Archivo 400 (500 when a description follows).
- **Switch:** A square track with a square block. Off: a Control Edge outline with the block in Control Edge at the start (ink on hover). On: a solid ink track with the paper block at the end. The place of the block is the signal, not the fill. Disabled fades the track and strikes the label.
- **Numbers:** The number field value, the slider output, and the one-time-code slots use the `num` face. The slider output sits right-aligned in a 6ch column.
- **One-time code:** 44px square slots (40px from 640px) that share their 2px rules. The active slot doubles its ink rule. Invalid slots double in danger. The whole code takes one bracket on focus and one strike when disabled.
- **Slider:** The run is a 2px Control Edge rule. The reach is a 4px ink stroke, so the value reads by weight, not by hue. The thumb is a 20px square with a 3px ink frame on paper: hover doubles the frame, a drag fills it solid ink, and focus takes the bracket. Disabled fades the run, the reach, and the frame, and strikes the output.
- **Date and time segments:** Each segment is a number in the `num` face, so the value does not move while you type. An empty segment shows its placeholder in muted ink. The segment that has focus prints solid: ink with paper text, or danger when the field is invalid. A time field uses the same segments.
- **Date picker:** One well holds the date and the calendar button. The date input in it drops its own well. While the calendar is out, the well prints the open rule. A date range picker puts both dates in one well. A range dash (a square rule, 8px × 2px) sits between them. It turns muted when the field is disabled.
- **Calendar surface:** On a wide screen, the calendar is a popover with 16px padding and no arrow. On a phone, it is a sheet: White Stock, square, with a 2px rule on top and no blur behind it.
- **Calendar header:** The month select (short name) and the year select are at the start. Two outline icon marks for the last and next month are at the end. The year uses the `num` face. Weekday initials use the Group Label voice in muted ink, over a 2px rule. An invalid date does not make the month and year selects invalid.
- **Date cell:** A fixed square, 44px (36px from 640px). The numeral uses the `num` face. Dates of other months are hidden.
  - At rest, the date is a bare numeral. Hover draws a 2px ink frame. Press fills it solid ink.
  - Selected is solid ink with the red foot: a 4px Poster Red bar on the bottom edge. Hover on a selected date makes the foot 6px.
  - Today takes a 4px square tick above the numeral.
  - The bracket shows on the date that holds the tab stop.
- **Unavailable dates:** The numeral turns muted, and a 3px line strikes through the full width of the cell. The strikes of adjacent dates join, so a run of dates out of reach reads as one rule.
- **Invalid date:** A selected date that is invalid prints hollow (The Hollow Invalid Rule): no fill, no foot, a doubled 2px danger rule, and a bold numeral in the danger wash ink.
- **Range:** A range is the selected print, split in two.
  - The two end dates are solid ink with the red foot.
  - The dates between them stay on the bare ground with a bold numeral. The foot runs under them as one red rule from end to end.
  - A range of one day prints as one selected date.
  - In an invalid range, the ends print hollow in the doubled danger rule. The foot and the numerals between them turn danger.
  - Two months stack on a phone. From 640px, they sit side by side, 24px apart.
- **Tag:** A small printed mark with a 2px Control Edge rule, at least 28px tall, with 8px side padding.
  - Text is Archivo 500, 0.875rem / 1.25rem, in the case it was given. Numbers in a tag use the `num` face; a unit stays in Archivo.
  - Hover doubles the rule in ink. Press fills it solid ink. Selected is solid ink with the red foot. Disabled fades the rule and strikes the tag. Focus takes the bracket.
  - Tags sit 6px apart and wrap.
  - The remove button is an inner mark, 24px square: the ink of the tag at rest, a 2px inset outline on hover, and solid when pressed.
- **Tag field:** A text field with its tags in a list under the well, not in it. Enter, a comma, or a semicolon adds a tag. A required tag field with no tags prints the error line.
- **Choice box:** Each option is a printed mark with a 2px Control Edge rule and 16px padding. The label is Archivo 600. The description is muted.
  - Hover doubles the rule in ink. Press fills it solid ink. Selected is solid ink with the red foot.
  - On the solid print, the description and the checkbox change to the paper side, so they stay legible.
  - Disabled fades the option and strikes it. Focus takes the bracket.
  - With no gap, the options share their 2px rules, as the Variant grid does.
- **Drop zone:** A well for files, at least 176px tall, with 24px padding. The content is centered.
  - At rest, it has a 2px Control Edge rule. Hover turns the rule ink.
  - When files are over it, it prints the pressed print: solid ink, with the content on the paper side.
  - Invalid (`data-invalid`) doubles the rule in danger, and an error line with an icon prints under the zone.
  - Disabled fades the rule, turns the text muted, and strikes the zone with a 3px muted line.
  - Focus takes the bracket.
- **Forced colors:** Invalid wells use `Mark`, disabled wells use `GrayText`, and the selected checkbox, radio, and switch use `Highlight`. Selected dates, tags, and choice box options use `Highlight`, with a `HighlightText` foot. An invalid selection uses a `Mark` edge. Unavailable dates use `GrayText`.
- **Color controls:** A color control keeps its true color output and takes the printed chrome. A 2px Control Edge plate holds an area or a wheel; a 2px frame holds a slider track; a swatch is a square stamp with a 2px rule; a picker item is a stamp with a 2px rule, a red foot and a paper check plate when selected. The thumb is a 20px square with a 3px ink frame and a paper hairline; hover doubles the frame, a drag thickens it to 6px so the true color stays visible, and focus takes the bracket. Disabled fades the chrome and strikes the well, the output, or the wheel. A color ramp and the alpha checker are content, not decoration.

### Overlays

A panel is a note pinned over the page. It never floats and it never blurs the page.

- **Scrim:** A flat ink field at 50% (70% in dark mode) under a dialog, a sheet, a drawer, a menu, and the command menu. There is no blur and no glass behind it. A tooltip and a popover take no scrim.
- **Surface:** White Stock (Carbon Raised in dark mode), a closed 2px rule, square corners, and a 20px gutter (24px from 640px). Every panel shares this surface.
- **Frame:** A dialog puts a 2px rule under its header and over its footer. A sheet and a drawer drop the edge that lies against the viewport edge; a floating sheet keeps all four edges and sits 8px inside them.
- **Title:** A dialog, a sheet, and a drawer carry their name in Ransom with `fit`, and keep the plain name for assistive technology. The description is Body at 0.875rem / 1.5rem in muted ink.
- **Width:** A dialog takes a step from `2xs` to `5xl` (at most 64rem). The command menu takes `xs` to `3xl` (at most 48rem), opens at 10% from the top, and holds at most 80% of the visual viewport. A sheet is three quarters of the viewport wide and a drawer is full width; each is at most 320px, except a floating drawer, which takes at most 32rem.
- **Motion:** A modal slams in from the side it came from, leaning on the slash angle (16deg) over 340ms with the expo ease, and unpins over 180ms. A sheet and a drawer take a 32px offset on the same slam. A popover drops from a -4deg tilt over 280ms and lifts out over 140ms. A tooltip tips toward its trigger over 200ms. Reduced motion puts every panel in place.
- **Command menu:** A search strip with a 2px closing rule over the list, a Group Label head, and key caps: a 2px rule frame on secondary paper at 0.6875rem, uppercase, 0.08em. The footer prints the same caps. An empty result prints the local poster: `0` in the numerals face and one line of words.
- **Tooltip:** White Stock with a 2px rule, at most 20rem wide, 10px / 6px padding, at 0.875rem / 1.5rem from 640px. The inverse form is the one inverted panel: a solid ink block with paper words and muted text at 60%.
- **Arrow:** A popover and a tooltip carry the square tab from Shapes, never a triangle.

### Navigation

- **Navbar:** A red ground strip with the ransom wordmark (red chips become ink on this ground) and two toggles. The theme toggle is an outline icon mark that swaps sun for moon; a press sweeps the new palette out of the button in a 500ms circle, and reduced motion swaps at once. The language toggle is a plain mark with a globe and the language name (globe only on phones) and opens a menu.
- **Category rail:** An ink ground. The catalog name sits at the top in the Title voice over a count in the numerals face and a 2px paper rule. Categories are collapsible Group Label rows with their entry counts in fixed `3ch` columns. Entries are Archivo 0.9375rem, muted at rest; the active entry is bold paper.
- **Tabs:** A tab is a printed mark: muted words at rest, ink on hover, a solid ink block with paper words when selected, struck when disabled. The list closes on a 2px rule; a 4px Poster Red route stroke slides along that rule to the selected tab over 500ms, and a vertical list takes the stroke on its start edge.
- **Breadcrumbs:** Links in a row, separated by a 14px × 2px rule leaned on the slash angle (16deg).
- **Pagination:** A row of page marks in the button model, 6px apart, each a 36px cell on phones and 32px from 640px, with the number in the numerals face. The current page is a solid ink print with the red foot.
- **Route stroke:** One 4px Poster Red line runs from a 12px square station at the active Category down to the active entry, then turns 16px into it. It moves over 500ms with the expo ease, and the turn draws after a 300ms delay.
- **Phone menu:** Below 768px, a secondary `sm` button in the filter bar opens the same list as a menu, grouped by Category.

### Ransom (signature component)

- **Chips:** Each letter sits on a paper chip: white, chip stock, ink, or red. On a red ground no chip is red; on an ink ground no chip is ink. Next letters never share a face or a chip color.
- **Faces:** Anton (1.06em), Abril Fatface (1.02em), Alfa Slab One (0.9em), Archivo 900 at 125% width (0.86em). The sizes match a shared cap height.
- **Pose:** Each chip tilts -4deg, 0, or +4deg and lifts by up to ±0.05em. About 28% of letters after the first are lowercase. About 30% of ink and red chips have one side cut on the slash angle; narrow letters are never cut. Chip padding is 0.04em 0.11em 0.02em, gap 0.06em, word gap 0.28em, with a 1px hairline edge.
- **Assembly:** When a heading enters the view, its chips fly in from scattered positions at 1.4× scale and settle over 560ms with the expo ease, 26ms apart, out of reading order. A heading already in view assembles at once through CSS alone.
- **Reduced motion:** The chips hold the composed note. Nothing travels.

### Variant cell

- A closed 2px frame, 20px padding, a Code-style caption in muted ink, then the specimen. `data-demo` on a cell forces hover, pressed, focus, or disabled, so every state prints side by side. A forced state prints on every mark in the cell, so a cell that shows one holds one mark. The cell is a group: a mark inside it reads the cell's forced state. A calendar takes `data-date-demo` instead: it forces the state only on the date that holds the tab stop, because `data-demo` would also force the header controls.

### Loader

- **Spin (default):** Four 9-unit squares round a square, lighting in turn (0.8s, stepped, 0.2s apart).
- **Ring:** A square track at 22% opacity with one solid run that travels its edge (0.9s, linear). The pending route uses it at 48px in Text Red.

### Data display

The shared devices of the Feedback and Data Display families. One record here, not a paragraph per component.

- **The row:** A table row, a grid-list row, a tree row, a list-box item, a bar-list row and a leaderboard row print on the paper ground. Hover and press put a solid ink bar behind the row with paper words. Selected, where the row can be selected, keeps the bar and takes the red foot. Focus takes the inside bracket. Disabled mutes the words and strikes them.
- **The ledger:** A table is a 2px ink rule frame with separated borders, a Group Label head over a rule, and a 2px rule under every cell.
- **The stamp:** A badge is a square 2px frame in the label voice, one word tall. On a solid ink bar it turns to the paper side. The round seal is opt-in.
- **The measure:** A progress bar and a meter are a 2px rule frame with a solid fill inside, and the figure beside them in the one numerals face, in a fixed column. A bar-list row and a leaderboard row are a 2px Control Edge rule with a 4px ink reach over it.
- **The note:** A square 2px frame, a wash of the status hue, and a 24px square indicator plate with a 2px rule holding the glyph that names the state. The frame takes the wash foreground, not the fill hue. The glyphs are fixed: an `i` for info, a triangle for warning, an exclamation for danger, a check for success. The default note carries no plate, only the card surface and the rule.
- **The dial:** A square frame with a run travelling its edge and the figure set in the middle in the numerals face.
- **The blank:** A loading skeleton is a muted plate that blinks in hard steps and holds the full plate under reduced motion.

**The Reach Rule.** A bar that ranks values takes the slider's reach: a 2px Control Edge rule with a 4px ink stroke over it, so the value reads by weight and not by hue. A bar-list row and a leaderboard row use it, and the figure stays in a fixed column beside it.

**The Ink Measure Rule.** A measure fills with ink. A status hue arrives only when the caller asks for one, and then the caller owns the word that names it. The progress bar is the one brand measure and fills with Poster Red. The figure beside a measure is in the one numerals face, in a fixed 6-character column.

**The Strike on the Words Rule.** A disabled row is muted and struck through, and the strike is drawn on the elements that hold the words. A text decoration does not cross a block box, so a strike on the row alone would print on the row's own line and nowhere else.

**The Paper Side Rule.** A badge on a solid ink bar turns to the paper side: the border and the words take the bar's foreground, and the badge's own wash clears.

**The Local Poster Rule.** An empty result reuses the poster page at a local scale: the numeral `0` in the numeral-display voice, a 16deg red slash bar, and one line of words.

**The Ledger Rule.** A table draws its rules per cell, with separated borders, so a row rule and a column rule never collapse into one another. The red foot of a selected row prints on the cell, over its own rule.

### Charts

A chart is a proof sheet, not a color wheel. The shared devices of every chart type sit here; the series palette is a system decision, not a local choice.

**The five tones.** The light values sit on paper or white stock; the dark values sit on carbon or carbon raised. Every tone clears 3:1 on both grounds.

| Series | Light | On paper / white | Dark | On carbon / raised |
| --- | --- | --- | --- | --- |
| 01 | Poster Red `#D7001A` | 4.9:1 / 5.4:1 | Text Red `#FF5468` | 5.8:1 / 5.3:1 |
| 02 | Ink `#0B0B0B` | 17.9:1 / 19.7:1 | Paper `#F6F4EF` | 16.6:1 / 15.2:1 |
| 03 | Muted Ink `#57534B` | 7.0:1 / 7.7:1 | Rail Muted `#B5B0A5` | 8.4:1 / 7.7:1 |
| 04 | Control Edge `#75716A` | 4.4:1 / 4.9:1 | Control Edge `#8A867E` | 5.0:1 / 4.6:1 |
| 05 | Warm Gray `#8C877D` | 3.3:1 / 3.6:1 | Warm Gray `#7C786F` | 4.2:1 / 3.8:1 |

**The five proof marks.** 01 solid, 02 16° rules, 03 4° rules, 04 square dots, 05 4° + 16° crosshatch. Every filled mark takes its pattern; bars, areas, and radars take a 2px tone stroke, and a pie splits its slices with a 2px ground gap. Every line takes its dash (in order: solid, 10 4, 6 4, 14 4 3 4, 1 5), a square cap, and a 6px point marker (square, hollow square, plus, bar, upright bar). The legend prints the same mark on a paper chip, so the chip reads on the ink bar.

- **Plot:** 2px hairline grid rules and a 2px ink baseline on the Category axis. The cell carries the frame; the chart adds none.
- **Axes:** Category words in Archivo. Every figure on the value axis uses `num`, in a fixed column.
- **Tooltip:** White Stock (Carbon Raised), 2px rule, square, no blur or shadow. The Category label is the Group Label; series names are muted; the value is in `num`.
- **Legend:** Printed marks. Hover and focus put the solid ink bar behind the item; selected keeps the bar and takes the red foot. One press solos a series; a second press clears it.
- **No gradients.** The area chart's `fillType="gradient"` keeps its prop and prints the default proof screen instead. `solid` prints a low solid tone; `none` prints the stroke only. A true color ramp and the alpha checker are content, not decoration.
- **Sizes:** 370px tall from a wide screen, 200px on a phone by default. A pie, radar, or radial chart may set its own height. The chart never scrolls sideways.
- **Polar charts:** A pie, radar, and radial bar share the proof ground: a 2px hairline polar grid, no radius axis, and a paper-chip legend. A radial bar keeps a 25% center hole and prints one ring per row.
- **Reduced motion:** Marks hold the composed state.

## Do's and Don'ts

### Do:

- **Do** put names in Ransom and everything else in Archivo. Give every Ransom its plain name for assistive technology.
- **Do** use `--primary` (Poster Red) for fills and rules, and `--primary-ink` (Text Red) for red words.
- **Do** put white text on the red field. Small text on red is never ink.
- **Do** set every number with the `num` utility, in a fixed-width column.
- **Do** show every control state by shape: outline, double outline, solid fill, red foot, strike-through, bracket.
- **Do** use a ground class (`ground-red`, `ground-ink`) to place stock controls on a color field.
- **Do** separate surfaces with 2px rules (3px for the heaviest divisions) or with a field change.
- **Do** use 4deg for tilts and 16deg for slashes and cuts.
- **Do** draw the focus bracket inside a row, on the row's own border, so it never crosses the rows above and below.
- **Do** separate an overlay from the page with the ink scrim, and separate a surface inside it with a 2px rule.
- **Do** carry a status tone in its wash foreground, never in its fill hue.
- **Do** keep reduced motion in the composed end state: chips assembled, popovers in place, loaders still.
- **Do** follow the OS color mode by default, and render light on the server.

### Don't:

- **Don't** use Poster Red or Text Red for errors or other semantic states. Danger is burnt vermilion.
- **Don't** let red be the only signal for a state.
- **Don't** fill a selected control with danger when it is invalid. Print it hollow in a doubled danger rule.
- **Don't** fade a disabled label's hue. Use muted ink, and let the strike carry the state.
- **Don't** round a corner, except the round seal: an icon button with `isCircle`, a radio indicator, a badge with `isCircle`, and an avatar with `isSquare={false}`.
- **Don't** add shadows, blur, glass, or gradients for depth.
- **Don't** draw a diagonal at any angle other than 4deg or 16deg.
- **Don't** use Ransom for labels, inputs, numbers, buttons, or body text.
- **Don't** use a second numerals face, or proportional figures for numbers.
- **Don't** load fonts from a CDN. Fonts are self-hosted and open-licensed.
- **Don't** bring back the IntentUI look: Inter, blue primary, zinc grays, rounded cards, soft focus glows.
- **Don't** give a popover or a tooltip a triangle arrow. It takes the square tab.
- **Don't** treat the Sonner toast as part of this system. It is the one component still on the old structure, with a blur and a soft shadow, and it waits for its own stage.
