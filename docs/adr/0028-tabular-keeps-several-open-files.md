# Tabular keeps several Table Files open

Tabular shows one File Tab per open Table File, like Folio's document tabs.
Opening a file adds a tab; it does not discard the current file. Each tab keeps
its own Session, Active Sheet, Edit History, and dirty state in the same Worker.
The tab strip names every open file and offers a plus mark to open more. The
active tab carries the close mark.

This supersedes the one-file rule in ADR-0023. A Merge still reads several files
and opens none.

## Considered options

- **One Worker per file.** Rejected: it multiplies parser memory and loses the
  shared engine lifecycle. A tab switch would need a new parse or a retained
  Worker per file.
- **Replace the open file on every open.** Rejected: it discards edits and
  contradicts the request.
- **A separate route per file.** Rejected: the Tool is one route, and a route
  change drops every open file.

## Consequences

- The Controller keeps a map of accepted models keyed by SessionId. A request
  that names a session reads that model; an open without a replacement adds a
  model.
- Closing a tab removes only that model. The Worker stops when the last tab
  closes.
- A file that opens in a new tab does not replace or discard another tab's
  edits. The discard contract applies to closing a tab and to leaving the route.
- The tab strip is not a Sheet list. Sheets stay in the Sheet menu.
