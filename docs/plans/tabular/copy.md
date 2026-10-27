# Message specification

The two columns are the complete Tabular message source for issue 20. Keys are
flat, with the `tabular` prefix when moved into the existing Message Catalogs.
Keep placeholders identical. Format counts with the active Locale; use separate
labels rather than English plural suffix logic. Sheet names and values are
interpolated as text. Never translate a file name, format extension, or Tabular.
Use the glossary's English domain terms in code. Indonesian UI copy uses the
paired terms below. Browser-native reload/discard prompts use browser copy.

## Page, input, and settings

| Key suffix | en-us | id-id |
| --- | --- | --- |
| Name | Tabular | Tabular |
| Title | Tabular — table file viewer, editor, and converter | Tabular — penampil, penyunting, dan konverter file tabel |
| Description | View, edit, and convert CSV, XLS, XLSX, TSV, TAB, and delimited TXT files on your device. No upload. | Lihat, sunting, dan konversi file CSV, XLS, XLSX, TSV, TAB, dan TXT berpemisah di perangkat Anda. Tanpa unggahan. |
| Promise | View, edit, and convert table files on your device. | Lihat, sunting, dan konversi file tabel di perangkat Anda. |
| Local | No upload. Your file stays on this device. | Tanpa unggahan. File Anda tetap di perangkat ini. |
| Lifetime | Download your work before you leave. Files and edits are lost when you reload or leave this page. | Unduh hasil kerja sebelum meninggalkan halaman. File dan suntingan hilang saat Anda memuat ulang atau meninggalkan halaman ini. |
| SourceSafe | The input file is never overwritten. | File asli tidak pernah ditimpa. |
| Open | Open file | Buka file |
| Drop | Drop one table file here, or choose a file. | Letakkan satu file tabel di sini, atau pilih file. |
| Formats | CSV, XLS, XLSX, TSV, TAB, and delimited TXT | CSV, XLS, XLSX, TSV, TAB, dan TXT berpemisah |
| Choose | Choose a file | Pilih file |
| OneFile | Open one file at a time. Choose which file to open. | Buka satu file setiap kali. Pilih file yang akan dibuka. |
| Sample | Try a sample | Coba contoh |
| SampleStock | Stock list — text and leading zeros | Daftar stok — teks dan nol di depan |
| SampleWorkbook | Values workbook — Sheets and stored results | Buku kerja nilai — Lembar dan hasil tersimpan |
| Close | Close file | Tutup file |
| FileSummary | {name} · {bytes} · {sheets} Sheets | {name} · {bytes} · {sheets} Lembar |
| Sheet | Sheet | Lembar |
| SheetRows | {name} · {rows} rows | {name} · {rows} baris |
| Hidden | Hidden | Tersembunyi |
| VeryHidden | Very hidden | Sangat tersembunyi |
| Search | Search all columns | Cari di semua kolom |
| ClearSearch | Clear search | Hapus pencarian |
| RowCounts | {matched} / {total} rows · {columns} columns | {matched} / {total} baris · {columns} kolom |
| NoMatches | No rows match this search. | Tidak ada baris yang cocok dengan pencarian ini. |
| EmptySheet | This Sheet is empty. Add a column, then a row. | Lembar ini kosong. Tambahkan kolom, lalu baris. |
| EmptyRows | No data rows. Add a row to start. | Tidak ada baris data. Tambahkan baris untuk memulai. |
| Delimiter | Delimiter | Pemisah |
| Comma | Comma | Koma |
| Semicolon | Semicolon | Titik koma |
| Pipe | Pipe | Garis tegak |
| Auto | Detect automatically | Deteksi otomatis |
| Ambiguous | Detection was uncertain. Check the values before you export. | Hasil deteksi belum pasti. Periksa nilainya sebelum mengekspor. |
| BlankHeader | Blank header · column {column} | Tajuk kosong · kolom {column} |
| Newline | Line endings | Akhir baris |
| MixedNewlines | Mixed line endings | Akhir baris campuran |
| Bom | UTF-8 BOM | BOM UTF-8 |
| BomDetected | BOM detected | BOM terdeteksi |
| NoBom | No BOM | Tanpa BOM |
| UseSource | Use source dialect | Gunakan aturan teks sumber |
| Apply | Apply | Terapkan |
| Cancel | Cancel | Batal |
| Retry | Retry | Coba lagi |
| ChooseAnother | Choose another file | Pilih file lain |
| Details | Show details | Tampilkan rincian |

## Editing and navigation

| Key suffix | en-us | id-id |
| --- | --- | --- |
| GridLabel | {sheet} · Sheet editor | {sheet} · Penyunting Lembar |
| CellLabel | Row {row}, column {column}: {value} | Baris {row}, kolom {column}: {value} |
| BlankValue | Blank | Kosong |
| Edited | Edited | Disunting |
| EditedCount | Edited cells: {count} | Sel disunting: {count} |
| HeaderCount | Changed headers: {count} | Tajuk diubah: {count} |
| StructureCount | Structure Edits: {count} | Suntingan struktur: {count} |
| EditCell | Edit cell | Sunting sel |
| EditAddress | Edit {address} | Sunting {address} |
| CellText | Cell text | Teks sel |
| Multiline | Expand editor | Perluas penyunting |
| MultilineHint | Enter adds a new line. Apply commits one Edit. | Enter menambahkan baris baru. Terapkan mencatat satu Suntingan. |
| InlineHint | Enter or Tab commits. Escape cancels. Alt+Enter adds a new line. | Enter atau Tab menerapkan. Escape membatalkan. Alt+Enter menambahkan baris baru. |
| Undo | Undo | Urungkan |
| Redo | Redo | Ulangi |
| NothingUndo | No Edit to undo | Tidak ada Suntingan untuk diurungkan |
| NothingRedo | No Edit to redo | Tidak ada Suntingan untuk diulangi |
| HistoryDone | {operation} in {sheet}. | {operation} di {sheet}. |
| CommitDone | Cell updated. | Sel diperbarui. |
| RowNoMatch | The edited row no longer matches the search. | Baris yang disunting tidak lagi cocok dengan pencarian. |
| RowColumn | Row / column | Baris / kolom |
| AddRow | Add row at end | Tambah baris di akhir |
| AddColumn | Add column | Tambah kolom |
| InsertRowBefore | Insert row before | Sisipkan baris sebelum |
| InsertRowAfter | Insert row after | Sisipkan baris sesudah |
| InsertColumnBefore | Insert column before | Sisipkan kolom sebelum |
| InsertColumnAfter | Insert column after | Sisipkan kolom sesudah |
| DeleteRows | Delete selected rows | Hapus baris terpilih |
| DeleteColumns | Delete selected columns | Hapus kolom terpilih |
| DeleteRow | Delete row | Hapus baris |
| DeleteColumn | Delete column | Hapus kolom |
| DeleteConfirm | Delete {rows} rows and {columns} columns? You can undo this Edit. | Hapus {rows} baris dan {columns} kolom? Suntingan ini dapat diurungkan. |
| RenameHeader | Rename header | Ganti nama tajuk |
| HeaderText | Header text | Teks tajuk |
| ColumnWidth | Column width in pixels | Lebar kolom dalam piksel |
| InsertViewWarning | Rows are added in Sheet order. Search and sort will be cleared to show the new rows. | Baris ditambahkan dalam urutan Lembar. Pencarian dan pengurutan akan dihapus untuk menampilkan baris baru. |
| SortAscending | Sort ascending | Urutkan naik |
| SortDescending | Sort descending | Urutkan turun |
| ClearSort | Reset sort | Atur ulang urutan |
| Sorted | {column} · {direction} | {column} · {direction} |
| SheetOrder | Sheet order | Urutan Lembar |
| PasteText | Paste text | Tempel teks |
| PasteBounds | The pasted range does not fit. Add rows or columns, then paste again. | Rentang tempelan tidak muat. Tambahkan baris atau kolom, lalu tempel lagi. |
| PasteMismatch | The pasted block does not match the selected range. Select one cell or match the range size. | Blok tempelan tidak cocok dengan rentang terpilih. Pilih satu sel atau samakan ukuran rentang. |
| PasteInvalid | The pasted text has invalid quotes or rows. No cells changed. | Teks tempelan memiliki kutipan atau baris tidak valid. Tidak ada sel yang berubah. |
| RevertCell | Revert cell | Pulihkan sel |
| RevertHeader | Revert header | Pulihkan tajuk |
| RevertAll | Revert all | Pulihkan semua |
| RevertConfirm | Restore the original values and structure in every Sheet? This is one undoable Edit. | Pulihkan nilai dan struktur asli di semua Lembar? Ini adalah satu Suntingan yang dapat diurungkan. |
| Unresolved | Unresolved value | Nilai belum terselesaikan |
| MissingResult | This formula has no stored result. Replace the value or exclude it from the Export Scope. | Rumus ini tidak memiliki hasil tersimpan. Ganti nilainya atau keluarkan dari Cakupan Ekspor. |
| FormulaError | The stored formula result is an error: {error}. | Hasil rumus tersimpan adalah kesalahan: {error}. |
| CellError | The source cell contains an error: {error}. | Sel sumber berisi kesalahan: {error}. |
| UnsupportedValue | This cell value cannot be represented. Replace it before export. | Nilai sel ini tidak dapat ditampilkan. Ganti sebelum ekspor. |
| NextUnresolved | Go to next unresolved value | Ke nilai belum terselesaikan berikutnya |

## Values, export, progress, and session

| Key suffix | en-us | id-id |
| --- | --- | --- |
| ValuesOnly | Values only. Exports omit formulas, charts, macros, merged cells, and workbook styling. | Hanya nilai. Ekspor tidak menyertakan rumus, bagan, makro, sel gabungan, dan gaya buku kerja. |
| StaleResults | Formula results are stored values and can be stale. Tabular does not recalculate them. | Hasil rumus adalah nilai tersimpan dan mungkin sudah usang. Tabular tidak menghitung ulang hasil tersebut. |
| DateText | Date-formatted values are kept as displayed text. No timezone conversion is applied. | Nilai berformat tanggal disimpan sebagai teks tampilan. Tidak ada konversi zona waktu. |
| Merged | Merged cells are read as an anchor value and blank cells. Merges are not exported. | Sel gabungan dibaca sebagai nilai utama dan sel kosong. Gabungan tidak diekspor. |
| HiddenData | Hidden Sheets, rows, and columns are included. Check the Export Scope. | Lembar, baris, dan kolom tersembunyi disertakan. Periksa Cakupan Ekspor. |
| IgnoredFeatures | Workbook features outside cell values are not preserved. | Fitur buku kerja di luar nilai sel tidak dipertahankan. |
| Ragged | Rows with fewer fields are padded with empty text. Affected rows: {count}. | Baris dengan bidang lebih sedikit dilengkapi teks kosong. Baris terdampak: {count}. |
| Precision | Numeric precision already lost in the source cannot be restored. | Ketelitian angka yang sudah hilang di sumber tidak dapat dipulihkan. |
| AllHiddenOutput | The first output Sheet will be visible so the workbook can be opened. | Lembar keluaran pertama akan terlihat agar buku kerja dapat dibuka. |
| Export | Export… | Ekspor… |
| ExportTitle | Export | Ekspor |
| Scope | Export Scope | Cakupan Ekspor |
| CurrentView | Current View | Tampilan Saat Ini |
| WholeSheet | Whole Sheet | Seluruh Lembar |
| WholeWorkbook | Whole Workbook | Seluruh Buku Kerja |
| SheetHint | All rows in Sheet order. Search and sort are ignored. | Semua baris dalam urutan Lembar. Pencarian dan pengurutan diabaikan. |
| WorkbookHint | Every Sheet, including hidden Sheets, in Sheet order. Search and sort are ignored. | Semua Lembar, termasuk Lembar tersembunyi, dalam urutan Lembar. Pencarian dan pengurutan diabaikan. |
| Format | Output format | Format keluaran |
| PdfReportHint | PDF is a report. CSV, XLSX, and JSON keep the exact values. | PDF adalah laporan. CSV, XLSX, dan JSON menyimpan nilai persis. |
| PageSize | Page size | Ukuran halaman |
| A4 | A4 | A4 |
| Letter | Letter | Letter |
| Orientation | Orientation | Orientasi |
| Portrait | Portrait | Potret |
| Landscape | Landscape | Lanskap |
| PdfEstimate | About {pages} pages. | Sekitar {pages} halaman. |
| PdfLarge | This PDF is longer than 500 pages. Check the Export Scope or use landscape. | PDF ini lebih dari 500 halaman. Periksa Cakupan Ekspor atau gunakan lanskap. |
| PdfUnsupported | {count} characters cannot be shown in the PDF. They are replaced with ?. Use CSV or XLSX to keep the exact text. | {count} karakter tidak dapat ditampilkan di PDF. Karakter diganti dengan ?. Gunakan CSV atau XLSX untuk menyimpan teks persis. |
| PdfUntagged | This PDF is not tagged. For screen readers, use CSV or XLSX. | PDF ini tidak bertag. Untuk pembaca layar, gunakan CSV atau XLSX. |
| PdfDownloadReady | PDF ready: {pages} pages, {rows} data rows. | PDF siap: {pages} halaman, {rows} baris data. |
| JsonObjects | JSON objects | Objek JSON |
| JsonArrays | JSON arrays | Larik JSON |
| JsonUnique | Unique, non-empty headers become object keys. | Tajuk unik dan tidak kosong menjadi kunci objek. |
| JsonDuplicate | Array JSON keeps duplicate headers and every column. The header row is included. | Larik JSON mempertahankan tajuk duplikat dan setiap kolom. Baris tajuk disertakan. |
| JsonBlank | Array JSON keeps blank headers and every column. The header row is included. | Larik JSON mempertahankan tajuk kosong dan setiap kolom. Baris tajuk disertakan. |
| JsonNoHeader | Headers are off. Array JSON contains data rows only. | Tajuk nonaktif. Larik JSON hanya berisi baris data. |
| SafeText | Spreadsheet-safe text | Teks aman untuk aplikasi spreadsheet |
| SafeCount | Changed output cells: {count}. The open Sheet is unchanged. | Sel keluaran diubah: {count}. Lembar yang terbuka tidak berubah. |
| Exact | Exact values | Nilai persis |
| ExactHint | Export the original values. A spreadsheet application may interpret formula-like text. | Ekspor nilai asli. Aplikasi spreadsheet dapat menafsirkan teks yang menyerupai rumus. |
| BeforeAfter | Before: {before}. After: {after}. | Sebelum: {before}. Sesudah: {after}. |
| UnresolvedExport | Resolve or exclude {count} values in this Export Scope before export. | Selesaikan atau keluarkan {count} nilai dalam Cakupan Ekspor ini sebelum mengekspor. |
| FormatLimit | {sheet} exceeds the {format} {dimension} limit: {actual} / {limit}. Nothing was truncated. Choose another format or scope. | {sheet} melampaui batas {dimension} {format}: {actual} / {limit}. Tidak ada data yang dipotong. Pilih format atau cakupan lain. |
| CreateDownload | Create download | Buat unduhan |
| Download | Download {format} | Unduh {format} |
| DownloadReady | Download ready: {sheets} Sheets, {rows} data rows. | Unduhan siap: {sheets} Lembar, {rows} baris data. |
| DownloadHint | Your session is still temporary. Keep the downloaded file before leaving. | Sesi Anda tetap sementara. Simpan file unduhan sebelum meninggalkan halaman. |
| ExportAgain | Export again | Ekspor lagi |
| Copy | Copy | Salin |
| Copied | Copied {rows} rows. | {rows} baris disalin. |
| LoadingEngine | Loading the table engine… | Memuat mesin tabel… |
| Detecting | Detecting file settings… | Mendeteksi pengaturan file… |
| Reading | Reading the Table File… | Membaca File Tabel… |
| UpdatingView | Updating the Current View… | Memperbarui Tampilan Saat Ini… |
| ApplyingEdit | Applying the Edit… | Menerapkan Suntingan… |
| PlanningExport | Checking export scope and values… | Memeriksa cakupan dan nilai ekspor… |
| Writing | Creating the output file… | Membuat file keluaran… |
| Verifying | Checking the output file… | Memeriksa file keluaran… |
| Progress | {completed} / {total} {unit} | {completed} / {total} {unit} |
| Cancelled | Cancelled. Your last valid session is unchanged. | Dibatalkan. Sesi valid terakhir Anda tidak berubah. |
| DiscardTitle | Discard changes? | Buang perubahan? |
| DiscardBody | Edited cells: {cells}. Changed headers: {headers}. Structure Edits: {structure}. Download your work before you continue. | Sel disunting: {cells}. Tajuk diubah: {headers}. Suntingan struktur: {structure}. Unduh hasil kerja sebelum melanjutkan. |
| KeepWorking | Keep working | Lanjutkan menyunting |
| DiscardContinue | Discard and continue | Buang dan lanjutkan |
| EngineOfflineHint | Engine files download on first use. Then they work offline while they remain cached. Your file is never uploaded. | File mesin diunduh saat pertama digunakan. Setelah itu, mesin bekerja luring selama tetap tersimpan di cache. File Anda tidak pernah diunggah. |
| LocalHeading | Your file stays here. | File Anda tetap di sini. |
| LocalBody | Tabular reads and edits in this tab. There is no account, upload, or server storage. | Tabular membaca dan menyunting di tab ini. Tanpa akun, unggahan, atau penyimpanan server. |
| ValuesHeading | Check the values before you share. | Periksa nilai sebelum membagikan. |
| ValuesBody | Stored formula results may be stale. Export keeps values, not the original workbook features. | Hasil rumus tersimpan mungkin sudah usang. Ekspor mempertahankan nilai, bukan fitur buku kerja asli. |

PDF chrome uses only data-derived strings: the Sheet name, the source file name,
and page numbers. No localized words appear in the file. The PDF `/Lang`
metadata uses the active Locale.

## Failures and recovery

Use the exact engine tag to select a message; never show a raw exception. The
rows below supply the remaining failure text. Reuse the action labels above.

| Tag / key suffix | en-us | id-id |
| --- | --- | --- |
| UnsupportedFormat | This file format is not supported. Choose CSV, XLS, XLSX, TSV, TAB, or delimited TXT. | Format file ini tidak didukung. Pilih CSV, XLS, XLSX, TSV, TAB, atau TXT berpemisah. |
| EncryptedFile | This file is encrypted or password-protected. Save an unencrypted copy on your device, then open it. | File ini dienkripsi atau dilindungi kata sandi. Simpan salinan tanpa enkripsi di perangkat Anda, lalu buka. |
| CorruptFile | The complete file could not be read. Check the source file or choose another file. | File tidak dapat dibaca secara lengkap. Periksa file sumber atau pilih file lain. |
| InvalidEncoding | The file could not be decoded as {encoding}. Choose another file. | File tidak dapat dibaca dengan pengodean {encoding}. Pilih file lain. |
| InvalidDelimitedText | Invalid text at record {record}, column {column}. Check the quotes or delimiter. | Teks tidak valid pada rekaman {record}, kolom {column}. Periksa kutipan atau pemisah. |
| InvalidRequest | This action could not be applied. Refresh the View and try again. | Tindakan ini tidak dapat diterapkan. Perbarui Tampilan dan coba lagi. |
| MissingIdentity | This cell or structure no longer exists. Refresh the View. | Sel atau struktur ini sudah tidak ada. Perbarui Tampilan. |
| StaleSession | This result belongs to an earlier session. It was not applied. | Hasil ini berasal dari sesi sebelumnya. Hasil tidak diterapkan. |
| RevisionConflict | The file changed before this action finished. Check the latest View and try again. | File berubah sebelum tindakan ini selesai. Periksa Tampilan terbaru dan coba lagi. |
| StaleView | The View changed. Select the range again before continuing. | Tampilan berubah. Pilih rentang lagi sebelum melanjutkan. |
| StaleExportPlan | The data changed. Check the export counts again. | Data berubah. Periksa kembali jumlah ekspor. |
| MemoryLimit | This device could not finish this operation with its available memory. Download the current work if available, or try a smaller file. | Perangkat ini tidak dapat menyelesaikan operasi dengan memori yang tersedia. Unduh hasil kerja saat ini jika tersedia, atau coba file yang lebih kecil. |
| WorkerLost | The engine stopped and this in-memory session could not be recovered. Open the source or your last download again. | Mesin berhenti dan sesi dalam memori ini tidak dapat dipulihkan. Buka kembali sumber atau unduhan terakhir Anda. |
| EngineOffline | The table engine is not cached on this device. Connect once to load it, then retry. | Mesin tabel belum tersimpan di cache perangkat ini. Sambungkan ke internet untuk memuatnya, lalu coba lagi. |
| EngineFailed | The table engine could not start or finish. Retry, or choose another file. | Mesin tabel tidak dapat dimulai atau diselesaikan. Coba lagi, atau pilih file lain. |
| ExportVerificationFailed | The output check failed. No download was created. Keep your session and try another format. | Pemeriksaan keluaran gagal. Tidak ada unduhan yang dibuat. Pertahankan sesi dan coba format lain. |
| ClipboardDenied | The browser did not allow clipboard access. Select the text or download TSV instead. | Browser tidak mengizinkan akses papan klip. Pilih teks atau unduh TSV. |
| SelectText | Select text | Pilih teks |
| DownloadTsv | Download TSV | Unduh TSV |

`DiscardRequired` uses DiscardTitle/DiscardBody. `UnresolvedValues` uses
UnresolvedExport. `InvalidPaste` uses PasteInvalid, PasteBounds, PasteMismatch, or
StaleView by reason. `HistoryEmpty` uses NothingUndo/NothingRedo. `Cancelled`
uses Cancelled, except a cancelled first open with no session uses “Cancelled.” /
“Dibatalkan.”. Unit labels are bytes/baris/sel/Lembar for id-id and
bytes/rows/cells/Sheets for en-us. Dimension labels use rows, columns, cell text,
or Sheet name, paired with baris, kolom, teks sel, or nama Lembar. These are
separate message values, not interpolated internal enum strings.
