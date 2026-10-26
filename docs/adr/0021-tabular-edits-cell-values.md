# Tabular edits cell values

Tabular is the third Tool, at `/tabular`. It views, edits, and converts local table files. The first release edits cell values. It does not preserve a workbook as an Excel document. This keeps the Tool focused on correcting and converting data, with local processing and predictable exports.

XLS and XLSX formulas contribute their stored results. Tabular does not calculate formulas. A formula with no stored result has an unresolved state and must be replaced or excluded from the Export Scope before export. Stored results can be stale; the UI says that Tabular has not recalculated them. Export writes values only. It does not preserve formulas, charts, macros, merged cells, or workbook styling. The input file is never changed. The UI states this boundary when opening a workbook and before exporting it.

A full spreadsheet editor was considered. It needs formula calculation, workbook-feature preservation, and a much larger interaction model. That is outside this release. Sheet selection, cell and range editing, and row and column changes remain in scope.
