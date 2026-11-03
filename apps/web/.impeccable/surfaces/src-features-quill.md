---
version: 1
slug: "src-features-quill"
primary_target: "src/features/quill"
related_targets: ["src/routes/quill.tsx"]
---

# Quill (/quill)

## Scope

- Surface: the Tool at `/quill`, feature `src/features/quill`.
- Mode: Operate. A person creates or imports Markdown, finds a document in a
  nested Library, edits it, checks the result, and exports a new file.
- This surface extends the existing Ransom Calling Card system. Use the shared
  shell, tokens, type, controls, and state marks.
- The user's marked contact sheet sets the workbench structure. Keep the
  Ritools visual system when applying that structure.

## Audience and job

A person needs a local Markdown editor with files and folders. They need to
switch between documents, see source and rendered content together, and keep
their work after a reload. A downloaded Library Backup gives them a copy
outside the browser. Imported files stay unchanged.

## Outcome and proof

The main task is to find a document, edit its source, check the live preview,
and download the result. The Library tree, open-file strip, local save status,
and export controls remain available in the same workbench.

The proof is the source text, the rendered result, the save state, and the
downloaded file. Browser storage can be cleared. The storage note must keep
the Library Backup action clear. Do not claim permanent storage.

## Constraints

- Use Archivo for interface and reading text, the existing mono face for code
  and source, and `num` for counts. The shell name is Ransom “Quill”.
- Use shared semantic color tokens in light and dark mode. Use square controls,
  2px rules, and the red foot for selection. Keep the shared focus and disabled
  states. Add no new palette, shadow, blur, or decorative asset.
- Use the shared React Aria controls for buttons, trees, menus, and toolbars.
  Give icon controls accessible names. Keep both Locales complete.
- Keyboard controls must reach the explorer actions, document controls,
  formatting commands, and exports. Keep each panel within the page width.
- Keep local saves, conflict recovery, backups, source protection, and all
  existing export formats. A layout change must not weaken these behaviors.

## Direction contract

THESIS: Quill is a full-width Markdown workbench. The explorer sits beside the
document area. The open-file strip sits above one compact format bar. Split
mode gives source and live preview equal columns.

OWN-WORLD: Keep the Ritools system. Paper, ink, carbon, and the existing red
tokens carry the surfaces and states. Rules divide the work. Ransom names the
Tool in the shell; Archivo names its actions; mono shows its source.

STORY: The person finds a file in the explorer or creates one. Opening it adds
it to the strip. They type in source, use a format control or caret slash
command, and check the live preview. The status line reports the local save.
They export the document or download a Library Backup.

FIRST VIEWPORT: The shared shell ends its breadcrumb in Ransom “Quill”. The
promise and document actions lead into the workbench. The left explorer has
create marks, search, Library and Trash controls, nested entries, row menus,
and a file count. The document area starts with open files, then formatting,
then source and preview. Save status and the storage note close the workbench.

FORM: Existing-system extension from the user's marked screenshots. No new
visual direction or global design change is part of this surface.

FINISH: Check the rendered workbench in light and dark mode at desktop, 1280px,
and phone widths. Keep visual evidence separate from functional test results.

## Surface matrix

| Width / mode | Structure | Capture |
| --- | --- | --- |
| Desktop / light | Explorer, file strip, format bar, equal source and preview columns | [PNG](../review/quill/desktop.png) |
| Desktop / dark | Same structure with existing dark tokens | [PNG](../review/quill/desktop-dark.png) |
| 1280px / light | Actions wrap above the same two-column document area | [PNG](../review/quill/user-1280.png) |
| 1280px / dark | Same wrapping and split | [PNG](../review/quill/user-1280-dark.png) |
| Phone / light | Collapsible explorer; file strip scrolls; format bar wraps; source then preview | [PNG](../review/quill/mobile.png) |
| Phone / dark | Same stacking with existing dark tokens | [PNG](../review/quill/mobile-dark.png) |

The workbench uses the available content width. The explorer is 16rem on the
main desktop layout, 13rem at widths up to 64rem, and 18rem from 110rem. At
widths up to 48rem, the workbench has one column. Source and preview keep their
own bounded scroll areas. The phone Library control can hide the explorer
without closing the current document. The file strip scrolls inside its frame.

## Interaction

1. Create a document or folder from the explorer. Import Markdown or a folder
   from the page actions. Keep nested Library paths.
2. Search entry names without regard to letter case. Show matching entries
   and their ancestors. Expand those ancestor folders while search is active.
3. Open a document from the tree or the file strip. Closing its strip entry
   leaves the Library document in storage.
4. Open file and folder actions by right-click, the row menu, Shift+F10, or
   the Context Menu key. The actions include create, rename, move, download,
   and Trash; a document can also be duplicated. Strip menus offer Close,
   Close others, and Close all.
5. Choose Split, Visual, Source, or Read. Split shows source on the left and a
   live preview on the right at desktop widths. On phones, preview follows
   source. Formatting stays directly below the file strip.
6. Type `/` at the start of a source line to open block commands at the caret.
   Further text filters commands. Arrow keys move the active option; Enter or
   Tab inserts it; Escape closes the list. Pointer selection keeps editor
   focus. The format bar also exposes the block commands.
7. Keep Undo and Redo specific to the document. Report pending, saving, saved,
   and failed states in the status area. Do not mark a save complete before
   the storage transaction completes.
8. Export a document as Markdown. Export folders or the Library
   as ZIP. Keep Library Backup and restore separate from ordinary ZIP export.

## States and source protection

- Empty: explain the local Library and provide New document.
- Loading: report work in progress while the editor or reader loads.
- Ready: show the current file, source or reading panel, counts, and save state.
- Protected source: keep the warning beside the document. Source and Markdown
  download remain available. Visual editing needs explicit conversion and a
  committed recovery copy.
- Save conflict or failure: keep the local draft and the stored version.
  Recovery and Save as another document stay available.
- Trash: offer restore and explicit permanent removal. Closing a file is a
  separate action from moving it to Trash.
- Export warning or failure: preserve source and Markdown download. Rich
  export preparation uses a fixed snapshot of the document.
- Storage unavailable or invalid records: keep raw recovery available. Do not
  reset the database to recover readable work.
- Offline capability unavailable: name the unavailable capability and keep
  the document source. Previously loaded capabilities work while cached.

## Evidence and existing drift

Checked the user's marked contact sheet, the six linked captures, `PRODUCT.md`,
`DESIGN.md`, the sibling Squeeze and Unmask briefs, and the Quill page, explorer,
file strip, source commands, styles, and feature README. The captures show the
requested workbench structure in both modes. They do not prove menu behavior,
keyboard operation, save safety, exports, or accessibility conformance.

The existing documents have older statements: `PRODUCT.md` lists Quill as
pending. `DESIGN.md` describes the current side rail and breadcrumb shell, but
its Navigation section also describes an older red navbar. Its width text
lists full-width Tool desks, then later limits that exception to Squeeze.
These statements were not changed by this surface brief.

The existing Quill renderer uses collapsed table borders and native task
checkboxes. These rules are present in the base revision. They differ from
the shared ledger border model and custom control forms. This workbench
extension retains them; it introduces no global design rule for rendered
Markdown.

## Boundaries

- Data stays in this browser profile and site origin. Import does not grant
  access to change the original disk file.
- The Library can contain nested Markdown documents and folders. It is not a
  system file manager.
- Source remains the authority for unchanged reading and Markdown export.
  Unsupported content must remain protected.
- No product promise, design token, shell rule, or global design document is
  changed by this brief.

## Control removal (3 November 2026)

The user marked the Visual mode button and its visual-editor toolbar for
removal. Keep the formatting toolbar in Split and Source. Keep Split, Source,
Read, Undo, Redo, slash commands, and source keyboard shortcuts. A stored Visual
preference opens Source.
