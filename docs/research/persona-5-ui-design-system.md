# Persona 5 Royal visual and UI design research

**Purpose:** Describe the visual and interface principles in *Persona 5* and *Persona 5 Royal*. Use these findings to inform the Ritools UI component design system.

**Research date:** 2026-10-19

## Evidence and limits

This note separates statements from designers and official sources from visual analysis.

- The Atlus site and PlayStation page are first-party product sources. The PlayStation page says that *Persona 5 Royal* keeps the game's signature visual style and provides official screenshots.[^atlus][^playstation]
- The CEDEC+KYUSHU press release is an official event source. It lists the session topic and the design questions that the speakers planned to cover.[^cedec]
- Famitsu reports on that session with comments attributed to Atlus art director and UI lead Masayoshi Sutou, and Persona team lead Kazuhisa Wada. This is a report of the speakers' presentation, not an Atlus UI manual.[^famitsu]
- Persona Central hosts an English translation of a 2016 Weekly Famitsu interview with Sutou. The page credits Play-Asia for the translation. Treat it as a translated interview, not an official English transcript.[^interview]
- The section named **Visual analysis** describes features that I can see in official screenshots. These statements are observations. They are not claims about the designers' intent.[^playstation]

## Design principles reported by the creators

### A clear visual identity

The CEDEC session described the Persona UI as both a graphic design system for the title and a tool that sends information to the player. Its stated goal was to protect usability while it pursued a strong visual style. The official session announcement also says that information meaning, information priority, colour, visual weight, and space can all help form a layout.[^cedec][^famitsu]

Sutou said that the team chose the main colour first. The team then chose the logo and key font. The session report says that *Persona 5* uses red as its main colour and limits other UI colours, with some exceptions for values such as HP and MP. It describes the concept as “pop punk”: mass appeal joined with an anti-establishment attitude.[^famitsu]

In a translated interview, Sutou said that the team compared black and white text with the crimson main colour. He also described a preference for solid graphic fills over gradients and a trial-and-error design process.[^interview]

### Guide attention through layout and contrast

The session report says that the team used a white line through the centre of the main menu to guide the eye. It also changed the layout and viewing angle between menu levels to make the current position clear. The report says that areas with more important information received more light, while lower-priority areas received less.[^famitsu]

This is a useful design lesson: colour is only one way to show priority. Position, shape, contrast, space, and movement can also show what matters.[^cedec][^famitsu]

### Add motion with a clear purpose

The session report describes a character model that moves and changes pose as the player moves through the main menu. It also says that the team planned the model's poses and motion with custom tools. Sutou's translated interview says that menu entries animate and that the menu should appear without delay.[^famitsu][^interview]

The reported design goal was to guide players in a direct but subtle way, with some room for play and surprise. The session report also describes close work between designers and programmers. It says that both groups adjusted the final placement and motion details.[^famitsu]

## Visual analysis of official screenshots

The official PlayStation gallery shows character art and in-game scenes. In the visible dialogue scene, a large portrait and a sharply cut speech panel share the screen. The panel uses a strong outline, angled edges, and high contrast. The image gives the dialogue a clear visual frame while it keeps the scene visible.[^playstation]

Across the official promotional images and game screenshots, I observe a compact colour set built around red, black, and white. I also observe strong diagonal cuts, cropped shapes, large character poses, and varied panel angles. These features create an urgent and theatrical feel. This is visual analysis, not an official list of design tokens.[^atlus][^playstation]

The interface often gives information a visible shape. It does not treat every label as plain text on a flat box. The shape, angle, contrast, and position of an element help mark its role. This makes the interface feel active, but it also raises the need for clear text and stable layout.[^playstation][^famitsu]

## What Ritools can reuse

Ritools is one web app with a shared shell. Each Tool has its own route. The Component Catalog is a development page for visual inspection of core UI components.[^ritools-adr][^ritools-context]

Use the design principles from *Persona 5* as guidance. Do not copy its game screen or its branded art.

| Ritools component | Useful principle to adapt |
| --- | --- |
| Buttons and icon buttons | Give the main action the clearest contrast and shape. Use a small angle, cut corner, or graphic notch as a product motif. Keep the label and focus state easy to read. |
| Navigation and tabs | Make the current location clear through position and a strong selected state. Use a short movement or line to guide attention when it helps the user. |
| Tool Entries | Give each entry one strong visual anchor, such as a title or icon. Use spacing and contrast to show its order and importance. Keep the grid easy to scan. |
| Inputs and file areas | Keep labels and boundaries plain. Use the product motif around the control, not in a way that makes the input area unclear. Keep validation and focus visible without relying on colour alone. |
| Status, progress, and alerts | Use contrast and position to make the next useful fact easy to find. Keep semantic colours for meaning, such as success, warning, and error. Do not make the brand accent carry every status. |
| Dialogs and overlays | Use a clear title, a strong main action, and simple supporting actions. Use motion only to show where the dialog came from or what changed. |

### Suggested direction for a future design pass

1. Choose one Ritools accent colour and a small set of neutral colours. Keep semantic colours separate from the brand colour.
2. Choose one graphic motif, such as an angled edge or a bold focus line. Apply it to selected states and high-value actions first.
3. Set information priority with spacing, type size, position, and contrast. Use colour as support.
4. Use a bold display style for short headings. Keep body text and control labels calm and easy to scan.
5. Add motion only when it shows a state change or guides attention. Keep the movement brief. Respect reduced-motion settings.
6. Review each component in the Component Catalog at small and large sizes, and in both themes if the component supports them.

These points transfer the design approach, not the full game art direction. A game menu can use more motion and visual density than a web Tool. Ritools must keep its controls clear while it develops a stronger identity.

## Sources

[^atlus]: [Persona 5 Royal official website — Atlus](https://persona.atlus.com/p5r/). First-party game overview, feature descriptions, images, and credits.
[^playstation]: [Persona 5 Royal — PlayStation](https://www.playstation.com/en-us/games/persona-5-royal/). First-party product page and official video, screenshot, and wallpaper gallery. The page says that the game keeps its signature visual style.
[^cedec]: [CEDEC+KYUSHU 2017 press release](https://cedec-kyushu.jp/2017/press/release_20170928.pdf). Official session announcement. It lists the session's intended coverage: usability, visual style, information priority, colour, visual weight, and space.
[^famitsu]: [Famitsu report on the Persona UI design session](https://www.famitsu.com/news/201711/13145540.html). Report from the 2017 CEDEC+KYUSHU session with Masayoshi Sutou and Kazuhisa Wada. The findings above are attributed to their presentation as reported by Famitsu.
[^interview]: [Persona 5 developer interview on UI design, sound design, and music](https://personacentral.com/persona-5-interview-ui-design-sound-music/). English translation of a Weekly Famitsu interview with Masayoshi Sutou; the page credits Play-Asia for the translation.
[^ritools-adr]: [ADR-0009: Ritools is one app, and a Tool is a route](../adr/0009-ritools-is-one-app-and-a-tool-is-a-route.md).
[^ritools-context]: [Web context](../../apps/web/CONTEXT.md), including the project terms “Tool,” “Tool Entry,” “Component Catalog,” and “Component Entry.”
