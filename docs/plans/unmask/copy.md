# Copy contract

## Rules

- `en-US` and `id-ID` carry the same keys, in the same order. The catalog
  parity test enforces it.
- Use the glossary terms exactly: Unmask, Cutout, Subject, Background,
  Backdrop, Matte, Magic Brush, Restore, Erase, Ghost, Feather.
- "Background" is the part that is removed. "Backdrop" is the fill behind the
  Subject. Do not use one word for the other.
- "Cut out" is the action. "Cutout" is the result. Do not use "remove
  background" as the action label; it is the search phrase in the page title
  and the meta description only.
- Do not use "mask", "alpha channel", "selection", "eraser", "magic wand",
  "foreground", "object", or "person" in the UI. The glossary avoids them.
- The copy never claims a perfect, automatic, one-click, or guaranteed Cutout.
  It names the limits: hair, fur, glass, motion blur, low contrast, and thin
  straps.
- The en-US page title is fixed: **Unmask — background remover for a clean
  Cutout**. The id-ID title carries the same meaning with "penghapus latar".
  The Tool name stays Unmask in both.
- The meta description carries "background remover" and the input format list
  for search. The visible page does not.
- The input file is never changed. The copy says so at the download.
- "No upload" is a fact. Do not say "secure", "private", or "encrypted".
- "The device sets the limit" is a fact. Do not say "unlimited".
- Placeholders: `{count}`, `{width}`, `{height}`, `{size}`, `{format}`,
  `{name}`, `{percent}`, `{path}`, `{ready}`, `{failed}`, `{queued}`.
- Plural forms use the catalog's plural option for the count keys:
  `unmaskSkipped`, `unmaskBatchCount`, `unmaskBatchSkipped`,
  `unmaskOperationCount`, `unmaskCutOutCount`, `unmaskDownloadZipLine`.
- id-ID uses "anda" in lower case, as the existing catalog does.

## Page metadata

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskPageTitle` | Unmask — background remover for a clean Cutout | Unmask — penghapus latar untuk Cutout yang bersih |
| `unmaskMetaDescription` | Unmask is a browser background remover for JPEG, PNG, WebP, AVIF, GIF, and BMP images. Refine the Matte with the Magic Brush, choose a Transparent, Solid, or Blur Backdrop, and download PNG, WebP, AVIF, or JPEG. No upload. | Unmask adalah penghapus latar di browser untuk gambar JPEG, PNG, WebP, AVIF, GIF, dan BMP. Perbaiki Matte dengan Magic Brush, pilih Backdrop Transparan, Solid, atau Blur, lalu unduh PNG, WebP, AVIF, atau JPEG. Tanpa unggah. |
| `unmaskOgAlt` | Unmask, in ransom letters on a red field, with the line: remove the background, then fix the Matte with the Magic Brush. | Unmask, dalam huruf tebusan di bidang merah, dengan baris: hapus latar, lalu perbaiki Matte dengan Magic Brush. |

## Promise and page

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskName` | Unmask | Unmask |
| `unmaskPromise` | Remove the background. Then fix the Matte. | Hapus latar. Lalu perbaiki Matte. |
| `unmaskDeck` | A Cutout over a Transparent, Solid, or Blur Backdrop. The Magic Brush repairs what the model misses. The file stays on this device. | Cutout di atas Backdrop Transparan, Solid, atau Blur. Magic Brush memperbaiki bagian yang terlewat oleh model. File tetap di perangkat ini. |
| `unmaskLocal` | Runs on your device | Berjalan di perangkat anda |
| `unmaskLocalNote` | No upload, no account, no server storage. | Tanpa unggah, tanpa akun, tanpa penyimpanan server. |
| `unmaskOneFile` | One image opens the editor. Two or more open the batch list. | Satu gambar membuka editor. Dua gambar atau lebih membuka daftar batch. |
| `unmaskFormatLine` | JPEG, PNG, WebP, AVIF, GIF, or BMP. GIF and BMP use the first frame. | JPEG, PNG, WebP, AVIF, GIF, atau BMP. GIF dan BMP memakai frame pertama. |
| `unmaskFactFormats` | Six input formats. Four output formats. One Cutout per image. | Enam format input. Empat format output. Satu Cutout per gambar. |
| `unmaskFactModel` | ISNet int8, MIT. The model is fetched once and cached. | ISNet int8, MIT. Model diambil sekali dan disimpan. |
| `unmaskFactLocal` | No image byte leaves this device. | Tidak ada byte gambar yang meninggalkan perangkat ini. |
| `unmaskFactBatch` | Shared Backdrop, format, Feather, and quality. Per-image Matte. | Backdrop, format, Feather, dan kualitas dibagi. Matte per gambar. |
| `unmaskModelNote` | The model is fetched once, then works offline while the browser keeps the cache. | Model diambil sekali, lalu bekerja offline selama browser menyimpan cache. |
| `unmaskModelFirstRun` | The first Cutout downloads the model, about 44 MB. It works offline while the browser keeps the cache. | Cutout pertama mengunduh model, sekitar 44 MB. Setelah itu bekerja offline selama browser menyimpan cache. |
| `unmaskModelCached` | The model is cached. | Model sudah tersimpan. |
| `unmaskModelLink` | Model licence and source | Lisensi dan sumber model |
| `unmaskModelName` | ISNet int8 | ISNet int8 |
| `unmaskModelLicence` | MIT | MIT |
| `unmaskResultModel` | Model: ISNet int8 · MIT | Model: ISNet int8 · MIT |

## Empty state

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskEmptyTitle` | No image yet. | Belum ada gambar. |
| `unmaskEmptyBody` | Drop one image or a folder. Unmask reads it on this device. | Letakkan satu gambar atau folder. Unmask membacanya di perangkat ini. |
| `unmaskDrop` | Drop images here | Letakkan gambar di sini |
| `unmaskChoose` | Choose files | Pilih file |
| `unmaskDropHint` | JPEG, PNG, WebP, AVIF, GIF, or BMP. One image opens the editor. | JPEG, PNG, WebP, AVIF, GIF, atau BMP. Satu gambar membuka editor. |
| `unmaskFolderHint` | A folder keeps its path. Non-image files are skipped and counted. | Folder menyimpan path-nya. File non-gambar dilewati dan dihitung. |
| `unmaskSkipped` | {count} non-image files skipped. | {count} file non-gambar dilewati. |

## Reading and model

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskReading` | Reading the image… | Membaca gambar… |
| `unmaskReadingHint` | The file stays in this tab. | File tetap di tab ini. |
| `unmaskModelLoadingTitle` | Loading the model | Memuat model |
| `unmaskModelLoadingBody` | The first run downloads the model. It works offline after that. | Proses pertama mengunduh model. Setelah itu bekerja offline. |
| `unmaskModelLoadingPercent` | {percent}% | {percent}% |
| `unmaskRemoving` | Removing the Background… | Menghapus latar… |
| `unmaskRemovingHint` | This is a local model. The page stays responsive. | Ini model lokal. Halaman tetap responsif. |
| `unmaskCancel` | Cancel | Batal |
| `unmaskModelOfflineTitle` | The model is not cached. | Model belum tersimpan. |
| `unmaskModelOfflineBody` | Connect once to download it. The rest of the page still works offline. | Sambungkan sekali untuk mengunduhnya. Bagian lain halaman tetap bekerja offline. |
| `unmaskModelUnavailableTitle` | The model is not available. | Model tidak tersedia. |
| `unmaskModelUnavailableBody` | The download failed, or the browser could not start the model. The image is unchanged. Try again. | Unduhan gagal, atau browser tidak bisa memulai model. Gambar tidak berubah. Coba lagi. |
| `unmaskModelFailedTitle` | The model failed. | Model gagal. |
| `unmaskModelFailedBody` | The image is unchanged. Try again, or choose another image. | Gambar tidak berubah. Coba lagi, atau pilih gambar lain. |
| `unmaskRetry` | Try again | Coba lagi |
| `unmaskChooseAnother` | Choose another file | Pilih file lain |

## Errors

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskUnsupportedTitle` | Unsupported format. | Format tidak didukung. |
| `unmaskUnsupportedBody` | Unmask reads JPEG, PNG, WebP, AVIF, GIF, and BMP images. | Unmask membaca gambar JPEG, PNG, WebP, AVIF, GIF, dan BMP. |
| `unmaskUnreadableTitle` | Unmask cannot read this image. | Unmask tidak bisa membaca gambar ini. |
| `unmaskUnreadableBody` | It may be damaged, or this browser may not decode the format. Try another file. | File mungkin rusak, atau browser ini tidak bisa mendekode formatnya. Coba file lain. |
| `unmaskTooLargeTitle` | This image is too large for this device. | Gambar ini terlalu besar untuk perangkat ini. |
| `unmaskTooLargeBody` | The image needs more memory than this device can give. The file is unchanged. Try a smaller image. | Gambar ini butuh memori lebih besar dari yang bisa diberikan perangkat. File tidak berubah. Coba gambar yang lebih kecil. |
| `unmaskEncodeFailedTitle` | Unmask could not write the Cutout. | Unmask tidak bisa menulis Cutout. |
| `unmaskEncodeFailedBody` | The Matte is safe. Try another format, or a lower quality. | Matte aman. Coba format lain, atau kualitas yang lebih rendah. |
| `unmaskCancelledTitle` | Cancelled. | Dibatalkan. |
| `unmaskCancelledBody` | The image is unchanged. | Gambar tidak berubah. |
| `unmaskDidNotOpen` | This image did not open. | Gambar ini tidak terbuka. |

## Canvas and comparison

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskCanvasLabel` | Cutout canvas | Kanvas Cutout |
| `unmaskCanvasHint` | Zoom and pan. Use the Magic Brush to repair the Matte. | Perbesar dan geser. Gunakan Magic Brush untuk memperbaiki Matte. |
| `unmaskCompare` | Compare | Bandingkan |
| `unmaskCompareActive` | The comparison is active. Close it to paint. | Perbandingan aktif. Tutup untuk melukis. |
| `unmaskOriginal` | Original | Asli |
| `unmaskCutout` | Cutout | Cutout |
| `unmaskZoomIn` | Zoom in | Perbesar |
| `unmaskZoomOut` | Zoom out | Perkecil |
| `unmaskZoomFit` | Fit | Pas |
| `unmaskZoomActual` | 100% | 100% |
| `unmaskPan` | Pan | Geser |
| `unmaskCanvasKeyboard` | Arrow keys move the brush. Enter applies. Escape ends the stroke. | Tombol panah menggerakkan brush. Enter menerapkan. Escape mengakhiri goresan. |

## Magic Brush

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskMagicBrush` | Magic Brush | Magic Brush |
| `unmaskWand` | Wand | Wand |
| `unmaskBrush` | Brush | Brush |
| `unmaskRestore` | Restore | Pulihkan |
| `unmaskErase` | Erase | Hapus |
| `unmaskGhost` | Ghost | Ghost |
| `unmaskGhostNote` | Show the original pixels under the removed area. | Tampilkan piksel asli di area yang dihapus. |
| `unmaskBrushSize` | Size | Ukuran |
| `unmaskTolerance` | Tolerance | Toleransi |
| `unmaskConnectivity` | Edges | Tepi |
| `unmaskFourConnected` | 4-connected | 4-terhubung |
| `unmaskEightConnected` | 8-connected | 8-terhubung |
| `unmaskUndo` | Undo | Urungkan |
| `unmaskRedo` | Redo | Ulangi |
| `unmaskOperationCount` | {count} edits | {count} edit |
| `unmaskMagicBrushHint` | Restore brings pixels back. Erase removes them. | Pulihkan mengembalikan piksel. Hapus membuangnya. |
| `unmaskWandHint` | Click a colour-similar region. | Klik area dengan warna mirip. |
| `unmaskBrushHint` | Drag to paint. The edge is soft. | Seret untuk melukis. Tepinya lembut. |
| `unmaskRestoreHint` | The Ghost shows the original pixels. | Ghost menampilkan piksel asli. |
| `unmaskEraseHint` | Removed pixels become transparent. | Piksel yang dihapus menjadi transparan. |
| `unmaskNoEdits` | No Matte edits. | Tidak ada edit Matte. |

## Backdrop and Feather

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskBackdrop` | Backdrop | Backdrop |
| `unmaskBackdropTransparent` | Transparent | Transparan |
| `unmaskBackdropSolid` | Solid | Solid |
| `unmaskBackdropBlur` | Blur | Blur |
| `unmaskBackdropTransparentNote` | A checkerboard in the preview. Alpha in the file. | Kotak-kotak di pratinjau. Alpha di file. |
| `unmaskBackdropSolidNote` | One colour behind the Subject. | Satu warna di belakang Subjek. |
| `unmaskBackdropBlurNote` | The original image, blurred. | Gambar asli, diburamkan. |
| `unmaskColor` | Colour | Warna |
| `unmaskBlurRadius` | Blur radius | Radius blur |
| `unmaskFeather` | Feather | Feather |
| `unmaskFeatherNote` | Softens the Matte edge, not the Backdrop. | Melembutkan tepi Matte, bukan Backdrop. |

## Output

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskFormat` | Format | Format |
| `unmaskFormatPng` | PNG | PNG |
| `unmaskFormatWebp` | WebP | WebP |
| `unmaskFormatAvif` | AVIF | AVIF |
| `unmaskFormatJpeg` | JPEG | JPEG |
| `unmaskFormatPngNote` | Lossless. Keeps alpha. | Lossless. Menyimpan alpha. |
| `unmaskFormatWebpNote` | Good size. Keeps alpha. | Ukuran baik. Menyimpan alpha. |
| `unmaskFormatAvifNote` | Smallest. Slower to write. | Paling kecil. Lebih lambat ditulis. |
| `unmaskFormatJpegNote` | No transparency. | Tanpa transparansi. |
| `unmaskFormatJpegBlocked` | JPEG has no transparency. Choose a Solid or Blur Backdrop, or PNG, WebP, or AVIF. | JPEG tidak punya transparansi. Pilih Backdrop Solid atau Blur, atau PNG, WebP, atau AVIF. |
| `unmaskQuality` | Quality | Kualitas |
| `unmaskQualityNote` | 1 is smallest. 100 is best. | 1 paling kecil. 100 paling baik. |
| `unmaskQualityPng` | PNG is lossless. Quality does not apply. | PNG lossless. Kualitas tidak berlaku. |
| `unmaskCutOut` | Cut out | Buat Cutout |
| `unmaskCutOutAgain` | Cut out again | Buat Cutout lagi |
| `unmaskCutOutCount` | Cut out {count} | Buat Cutout {count} |
| `unmaskCutOutDisabled` | Choose an image first. | Pilih gambar dulu. |
| `unmaskCutOutDisabledTransparentJpeg` | JPEG cannot hold transparency. | JPEG tidak bisa menyimpan transparansi. |

## Result and download

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskResultReady` | Cutout ready | Cutout siap |
| `unmaskResultEdited` | Matte edited | Matte diedit |
| `unmaskResultStale` | Settings changed. Cut out again to download. | Pengaturan berubah. Buat Cutout lagi untuk mengunduh. |
| `unmaskResultDownloaded` | Downloaded {name} | Sudah diunduh {name} |
| `unmaskResultLine` | {width} × {height} · {size} · {format} | {width} × {height} · {size} · {format} |
| `unmaskResultAlpha` | The input alpha was kept. | Alpha input dipertahankan. |
| `unmaskDownload` | Download the Cutout | Unduh Cutout |
| `unmaskDownloadZip` | Download ZIP | Unduh ZIP |
| `unmaskDownloadLine` | Downloads {name}. The input file is unchanged. | Mengunduh {name}. File input tidak berubah. |
| `unmaskDownloadZipLine` | One ZIP with {count} Cutouts. The input files are unchanged. | Satu ZIP dengan {count} Cutout. File input tidak berubah. |
| `unmaskInputUnchanged` | The input file is not changed. | File input tidak berubah. |
| `unmaskCutAnother` | Cut out another image | Buat Cutout gambar lain |
| `unmaskBackToBatch` | Back to the batch | Kembali ke batch |

## Batch

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskBatchTitle` | Batch | Batch |
| `unmaskBatchCount` | {count} images | {count} gambar |
| `unmaskBatchShared` | Shared settings | Pengaturan bersama |
| `unmaskBatchPerImage` | The Matte is per image. | Matte per gambar. |
| `unmaskBatchOpen` | Open | Buka |
| `unmaskBatchQueued` | Queued | Dalam antrean |
| `unmaskBatchRunning` | Running | Berjalan |
| `unmaskBatchReady` | Ready | Siap |
| `unmaskBatchEdited` | Edited | Diedit |
| `unmaskBatchStale` | Stale | Usang |
| `unmaskBatchFailed` | Failed | Gagal |
| `unmaskBatchCancelled` | Cancelled | Dibatalkan |
| `unmaskBatchDownloaded` | Downloaded | Sudah diunduh |
| `unmaskBatchCancel` | Cancel | Batal |
| `unmaskBatchCancelAll` | Cancel the batch | Batalkan batch |
| `unmaskBatchFolder` | Folder: {path} | Folder: {path} |
| `unmaskBatchSkipped` | {count} non-image files skipped. | {count} file non-gambar dilewati. |
| `unmaskBatchZip` | One ZIP for the batch. | Satu ZIP untuk batch. |
| `unmaskBatchEmpty` | No image in the batch. | Tidak ada gambar di batch. |
| `unmaskBatchSummary` | {ready} ready · {failed} failed · {queued} queued | {ready} siap · {failed} gagal · {queued} dalam antrean |

## Honesty and explainer

| Key | en-US | id-ID |
| --- | --- | --- |
| `unmaskHonestyTitle` | What Unmask cannot do | Apa yang tidak bisa dilakukan Unmask |
| `unmaskHonestyBody` | Unmask does not make a perfect Cutout. Hair, fur, glass, motion blur, low contrast, and thin straps can lose pixels. Use the Magic Brush to repair the Matte. | Unmask tidak membuat Cutout yang sempurna. Rambut, bulu, kaca, blur gerakan, kontras rendah, dan tali tipis bisa kehilangan piksel. Gunakan Magic Brush untuk memperbaiki Matte. |
| `unmaskExplainerTitle` | What Unmask does, and why the Matte matters | Apa yang dilakukan Unmask, dan mengapa Matte penting |
| `unmaskExplainerWhatTitle` | A Cutout is the Subject over a Backdrop | Cutout adalah Subjek di atas Backdrop |
| `unmaskExplainerWhatBody` | Unmask removes the Background, keeps the Subject, and writes a Cutout. The Backdrop is Transparent, Solid, or Blur. | Unmask menghapus latar, menyimpan Subjek, dan menulis Cutout. Backdrop-nya Transparan, Solid, atau Blur. |
| `unmaskExplainerMatteTitle` | The Matte is the opacity map | Matte adalah peta opasitas |
| `unmaskExplainerMatteBody` | The Matte is one alpha value per pixel. The model gives a starting Matte. The Magic Brush edits it. Feather softens its edge. | Matte adalah satu nilai alpha per piksel. Model memberi Matte awal. Magic Brush mengeditnya. Feather melembutkan tepinya. |
| `unmaskExplainerLimitsTitle` | The model has limits | Model punya batas |
| `unmaskExplainerLimitsBody` | Hair, fur, glass, motion blur, low contrast, and thin straps are hard. Check the Cutout and repair it. | Rambut, bulu, kaca, blur gerakan, kontras rendah, dan tali tipis sulit. Periksa Cutout dan perbaiki. |
| `unmaskExplainerBackdropTitle` | The Backdrop is not the Background | Backdrop bukan latar |
| `unmaskExplainerBackdropBody` | The Background is removed. The Backdrop is the fill behind the Subject. A Blur Backdrop uses the original image. | Latar dihapus. Backdrop adalah isian di belakang Subjek. Backdrop Blur memakai gambar asli. |
| `unmaskExplainerLocalTitle` | The file stays here | File tetap di sini |
| `unmaskExplainerLocalBody` | Unmask reads, removes, and writes in this tab. There is no upload endpoint, no account, and no server storage. | Unmask membaca, menghapus, dan menulis di tab ini. Tidak ada endpoint unggah, tidak ada akun, dan tidak ada penyimpanan server. |

## Copy parity

- Every key above exists in both `en-US.ts` and `id-ID.ts`, in the same order,
  with the same placeholders.
- `unmaskPageTitle` is the only string with an em dash. Use the exact character.
- The count keys use the catalog's plural form. id-ID has one plural form.
- The visible page never says "background remover" or "penghapus latar". Only
  the page title and the meta description carry the search phrase.
- The visible page never claims a perfect, automatic, one-click, or guaranteed
  Cutout. It never says "AI magic", "secure", "private", "encrypted", or
  "unlimited".
- The copy names the six limits at least once: hair, fur, glass, motion blur,
  low contrast, thin straps.
- The copy names the model licence (MIT) and the one-time download.
- The copy says the input is not changed and no image byte leaves the device.
