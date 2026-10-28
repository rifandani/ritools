# A Merge reads several files and opens none

Tabular keeps one open Table File per session and does not convert a batch of
files. A CSV Merge needs several files at once. The Merge is a file action: it
reads its Merge Sources, appends their rows into one CSV, and opens no session.
The open Table File stays the same, and the one-file rule still holds for
editing, export, and Split.

A Merge must also restore the Parts of a Split. The user can split one CSV,
merge the Parts back, and get the same header, columns, rows, and values. This
is the test that decides whether the Merge works.

## Considered options

- **One session per source.** Rejected: it multiplies memory, breaks the
  discard contract, and cannot read a Split ZIP as one action.
- **A separate Tool at `/merge`.** Rejected: the user reaches the action from
  the open Table File, and the parser, writer, and format Worker already belong
  to Tabular.
- **Merge only the Sheets of the open workbook.** Rejected: the request is to
  append files, and stacking Sheets is a different operation.

## Consequences

- `docs/plans/tabular.md` names the Merge as the one batch file action.
- A Merge Source is a snapshot. The open file contributes its Active Sheet and
  its edits. A later edit does not change a plan or a Merged CSV.
- The Merge writes CSV only. It is not an Export Format and it does not enter
  the Format list.
- The Merge reads a Split ZIP on the device. `fflate` is already a dependency.
- The round-trip test compares values and dialect, not bytes. The Split writer
  can normalize quoting, write an empty field as `""`, and add a final newline.
