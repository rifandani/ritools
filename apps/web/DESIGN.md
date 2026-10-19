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
  secondary: "#E6E2D8"
  muted: "#ECE9E1"
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

The system is flat and loud. It has no soft depth, no rounded corners, no gradients, and no glass. Contrast, rule weight, and the shape of a mark carry all hierarchy and all state. A control at rest is an outline. When you press it, it fills. When it is disabled, a line strikes through it. When it has keyboard focus, a heavy bracket stands on each side. You can read each state by shape, not only by color.

The density is high but strict. Showcases sit in equal cells on shared 2px rules. Numbers always use one numerals face in fixed columns. Only two diagonal angles occur in drawn shapes: a small tilt and a steeper slash.

**Key Characteristics:**

- Four brand colors: red, ink, paper, and white. The color mode does not change them.
- Three grounds: red (navbar), ink (rail), paper (content). A ground redefines the role tokens for what sits on it.
- Ransom names from cut-out chips in four display faces. All other text is Archivo.
- Martian Mono at 75% width for every number.
- Zero radius. No shadows for depth. 2px rules, 3px heavy rules.
- Printed-mark states: outline, double outline, solid fill, strike-through, bracket.
- Two angles only in drawn shapes: tilt (4deg) and slash (16deg).
- Color mode follows the OS by default. The server render is light.

## Colors

A print palette: one hot red, one near-black ink, warm off-white paper, and white stock, with semantic hues that stay away from the red.

### Primary

- **Poster Red** (#D7001A): The fill red. It is the navbar field, the solid fill of a pressed primary button, the red ransom chip, the link rule, the route stroke in the rail, the slash bar on fallback pages, text selection, and the browser theme color. White text on it is 5.4:1. Do not use it as a text color on paper.
- **Text Red** (#B80016 light, #FF5468 dark): A separate token (`--primary-ink`) for red words and for the primary button outline text. It is 6.3:1 on paper and 5.5:1 on the dark ground. On the red ground it becomes white.
- **Red Wash** (`rgb(215 0 26 / 0.1)`): The hover fill of a primary mark. Text on the wash is #A10013.

### Neutral

- **Ink** (#0B0B0B): Body text in light mode, the rail field, the ink ransom chip, all rules in light mode, the hover bar in lists and menus, and the focus bracket in light mode.
- **Paper** (#F6F4EF): The page ground in light mode. Text on ink and in dark mode. Rules and the focus bracket in dark mode.
- **White Stock** (#FFFFFF): Cards, popovers, menus, and the white ransom chip. Small text on the red field is always white.
- **Chip Stock** (#E6DFCF): The fourth ransom chip, a warm newsprint tone. It appears only in Ransom.
- **Secondary Paper** (#E6E2D8): The rest fill of a secondary button.
- **Muted Paper** (#ECE9E1) and **Muted Ink** (#57534B): Quiet surfaces and secondary text in light mode.
- **Hairline** (#CFCAC0): Default border for low-weight dividers (menu separators, IntentUI-era borders).
- **Control Edge** (#75716A light, #8A867E dark): The outline of an `outline` button and of inputs. It is 4:1 on paper, above the 3:1 floor for UI parts. Also the scrollbar thumb.
- **Carbon** (#161514): The page ground in dark mode. **Carbon Raised** (#1F1E1C) is the dark card, popover, and rail hover surface. **Carbon Chip** (#2A2926) is the ink chip and the secondary fill in dark mode, one step above Carbon so it stays visible.
- **Dark Muted Ink** (#ADA89D), **Dark Hairline** (#3A3835): Secondary text and dividers in dark mode. On the ink rail, muted text is #B5B0A5 and dividers are #2E2C29.

### Semantic

- **Signal Green** (#0B7A43 light, #3DCB7F dark): Success fills. Text on the success wash is #075A31.
- **Caution Yellow** (#F2B200, both modes): Warning fills, always with ink text. Text on the warning wash is #6B4200 light, #FFD25C dark.
- **Burnt Vermilion** (#C2410C light, #F26B3A dark): Danger fills. Its hue is orange-red, clearly apart from Poster Red. Text on the danger wash is #8F2F08 light, #FF9A72 dark.

### Named Rules

**The Own-Hue Rule.** Semantic colors never borrow the brand red. Danger is burnt vermilion, not Poster Red. A red mark means "brand" or "primary action"; it never means "error".

**The Two-Reds Rule.** Poster Red fills; Text Red writes. Use `--primary` for fields, fills, and rules. Use `--primary-ink` for red words on paper or carbon.

**The Ground Rule.** A color field redefines the role tokens for its children (`.ground-red`, `.ground-ink`). On red, the primary becomes white, rules become white, and the red chip becomes ink. On ink, rules become paper and the ink chip lifts to Carbon Chip. Put a stock control on a ground; do not add new props for it.

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
- **Group Label** (Archivo 700–800, 87.5% width, 0.75–0.8125rem, uppercase, 0.07–0.08em): Menu section headers and rail Category names. It names a group of items; it never sits above a headline as a kicker.
- **Numeral** (Martian Mono, 75% width, tabular and slashed zero): Every count, date segment, and figure, through the `num` utility.
- **Code** (Martian Mono, 87.5% width): `code`, `kbd`, `samp`, `pre`, and the prop captions in Variant cells.

### Named Rules

**The Ransom Rule.** Ransom is only for names: Component Entry titles, Category headings, the Ritools wordmark, Tool names, and Squeeze state words (for example "Done", "Miss"). Never use it for labels, inputs, numbers, or body text. Assistive technology reads the plain name, never the chips.

**The One Numerals Rule.** Every number uses the `num` utility: Martian Mono, 75% width, tabular figures, slashed zero. Numbers sit in fixed columns (for example a `3ch` width for catalog counts) so they do not shift when they change.

**The Same Cut Rule.** One text always cuts the same way. A stable hash of the text seeds the face, chip, tilt, lift, and scissor cut of each letter, so the server and the client render the same note.

## Layout

The shell is a red navbar strip (min height 64px, 16px side padding, 24px from 640px). It holds the ransom wordmark at 1.75rem on the left, and the theme and language toggles on the right. A Tool adds content under it, never new chrome.

The Component Catalog is two columns from 768px: a sticky ink rail 280px wide at full viewport height, and a content column. A sticky paper filter bar tops the content column, with a 3px rule under it, the search field on the left, and the count on the right. Below 768px the rail folds into a menu button inside the filter bar.

Content gutters are 16px on phones, 32px from 640px, and 48px from 1024px. Categories are 128px apart; Component Entries are 96px apart. A 3px rule runs under each Category heading to the right page edge. The general `Container` is at most 1280px wide with 16px padding (24px from 640px).

The Variant grid fills tracks at `minmax(min(100%, 13.5rem), 1fr)`. Each cell has 20px padding, a 20px gap, and its own closed 2px frame. The grid pulls each cell 2px up and left, so a shared rule prints once at the same weight. A wide showcase spans two tracks or the full row.

Poster pages (404, error, offline, empty filter) stack left-aligned: numeral, red slash bar (176px × 12px, slashed at 16deg), poster title, lead text, one action. They center on the viewport height under the navbar.

### Named Rules

**The Strict Grid Rule.** Showcases sit in equal cells on shared 2px rules. Do not float cards, add gaps between cells, or let a cell grow its own height style.

## Elevation & Depth

The system is flat. Every Tailwind shadow and drop-shadow token resolves to `0 0 #0000`. Depth comes from color fields (red, ink, paper, white stock) and from rule weight. A popover or menu is white stock with a 2px rule frame on the page; it does not float on a shadow.

`box-shadow` appears in three places, and each one draws an edge, not elevation: the 1px hairline edge of a ransom chip, the inset 2px second outline of a hovered mark, and the red fill that rises from the rule of a hovered ink link (`inset 0 -1.3em 0`).

### Named Rules

**The Print Has No Lift Rule.** Nothing floats. If two surfaces must separate, use a rule or a field change, never a shadow or blur.

## Shapes

All corners are square. Every Tailwind radius token resolves to 0px. The one exception is the round seal (`rounded-full`), which an icon button can take with `isCircle`.

Lines are hard and flat: 2px ink rules for frames, cards, popovers, and cells; 3px for the filter bar rule, the Category underline, the primary button, and the focus bracket. In dark mode and on the ink rail, rules are paper; on the red field they are white.

Drawn diagonals use two angles only. **Tilt** (4deg) is a rotation: ransom chips rest at -4deg, 0, or +4deg, and a popover drops in from a -4deg tilt. **Slash** (16deg) is a lean from vertical: the slash bar on poster pages, the scissor cut on ink and red ransom chips, and the fly-in rotation of chips. The cut width is the chip height × tan(16deg) (0.2867).

Loaders keep the square: a square track with one solid run that travels its edge (`ring`), and four square blocks that light in turn (`spin`). Nothing rotates, so no third angle appears.

### Named Rules

**The Two Angles Rule.** A drawn diagonal is 4deg or 16deg. Icon glyphs keep their own drawing.

## Components

### Buttons

Printed marks: confident, flat, and legible by shape in every state.

- **Shape:** Square corners (0px). Uppercase label at 87.5% width with 0.05em tracking. Size `md` is 44px tall on phones and 40px from 640px, with 16px / 14px side padding. Icon-only sizes (`sq-*`) carry a 44px touch target.
- **Primary:** A 3px Poster Red outline with Text Red label at rest. Hover adds the red wash and an inset 2px second outline. Press fills solid red with a white label and moves the mark down 1px.
- **Secondary:** Secondary Paper fill with a 2px rule outline. Press fills solid ink with a paper label.
- **Outline:** A 2px Control Edge outline. Hover doubles the outline in ink. Press fills solid ink.
- **Plain:** No outline at rest. Hover draws the 2px ink outline. Used for the language toggle on the navbar.
- **Success / Warning / Danger:** The same mark model in the semantic hue: outline and wash text at rest, solid semantic fill when pressed.
- **Disabled:** The outline fades to 40%, the label to 55%, and a 3px line strikes through the whole mark.
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

- **Stage 1 state:** Inputs, search fields, and date fields still carry IntentUI structure under the new tokens (square corners, Control Edge borders). Date segments use the `num` numerals face. A full input restyle is a later stage; see Do's and Don'ts.

### Navigation

- **Navbar:** A red ground strip with the ransom wordmark (red chips become ink on this ground) and two toggles. The theme toggle is an outline icon mark; the language toggle is a plain mark with a globe and the language name (globe only on phones). Both open menus.
- **Category rail:** An ink ground. The catalog name sits at the top in the Title voice over a count in the numerals face and a 2px paper rule. Categories are collapsible Group Label rows with their entry counts in fixed `3ch` columns. Entries are Archivo 0.9375rem, muted at rest; the active entry is bold paper.
- **Route stroke:** One 4px Poster Red line runs from a 12px square station at the active Category down to the active entry, then turns 16px into it. It moves over 500ms with the expo ease, and the turn draws after a 300ms delay.
- **Phone menu:** Below 768px, a secondary `sm` button in the filter bar opens the same list as a menu, grouped by Category.

### Ransom (signature component)

- **Chips:** Each letter sits on a paper chip: white, chip stock, ink, or red. On a red ground no chip is red; on an ink ground no chip is ink. Next letters never share a face or a chip color.
- **Faces:** Anton (1.06em), Abril Fatface (1.02em), Alfa Slab One (0.9em), Archivo 900 at 125% width (0.86em). The sizes match a shared cap height.
- **Pose:** Each chip tilts -4deg, 0, or +4deg and lifts by up to ±0.05em. About 28% of letters after the first are lowercase. About 30% of ink and red chips have one side cut on the slash angle; narrow letters are never cut. Chip padding is 0.04em 0.11em 0.02em, gap 0.06em, word gap 0.28em, with a 1px hairline edge.
- **Assembly:** When a heading enters the view, its chips fly in from scattered positions at 1.4× scale and settle over 560ms with the expo ease, 26ms apart, out of reading order. A heading already in view assembles at once through CSS alone.
- **Reduced motion:** The chips hold the composed note. Nothing travels.

### Variant cell

- A closed 2px frame, 20px padding, a Code-style caption in muted ink, then the specimen. `data-demo` on a cell forces hover, pressed, focus, or disabled, so every state prints side by side.

### Loader

- **Spin (default):** Four 9-unit squares round a square, lighting in turn (0.8s, stepped, 0.2s apart).
- **Ring:** A square track at 22% opacity with one solid run that travels its edge (0.9s, linear). The pending route uses it at 48px in Text Red.

## Do's and Don'ts

### Do:

- **Do** put names in Ransom and everything else in Archivo. Give every Ransom its plain name for assistive technology.
- **Do** use `--primary` (Poster Red) for fills and rules, and `--primary-ink` (Text Red) for red words.
- **Do** put white text on the red field. Small text on red is never ink.
- **Do** set every number with the `num` utility, in a fixed-width column.
- **Do** show every control state by shape: outline, double outline, solid fill, strike-through, bracket.
- **Do** use a ground class (`ground-red`, `ground-ink`) to place stock controls on a color field.
- **Do** separate surfaces with 2px rules (3px for the heaviest divisions) or with a field change.
- **Do** use 4deg for tilts and 16deg for slashes and cuts.
- **Do** keep reduced motion in the composed end state: chips assembled, popovers in place, loaders still.
- **Do** follow the OS color mode by default, and render light on the server.

### Don't:

- **Don't** use Poster Red or Text Red for errors or other semantic states. Danger is burnt vermilion.
- **Don't** let red be the only signal for a state.
- **Don't** round a corner, except the round seal on an icon button.
- **Don't** add shadows, blur, glass, or gradients for depth.
- **Don't** draw a diagonal at any angle other than 4deg or 16deg.
- **Don't** use Ransom for labels, inputs, numbers, buttons, or body text.
- **Don't** use a second numerals face, or proportional figures for numbers.
- **Don't** load fonts from a CDN. Fonts are self-hosted and open-licensed.
- **Don't** bring back the IntentUI look: Inter, blue primary, zinc grays, rounded cards, soft focus glows.
- **Don't** treat the IntentUI structure that remains in the other components (about 85, plus the Sonner toast) as part of this system. They wait for later stages.
