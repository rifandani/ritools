import { defineTranslation } from "@/core/libs/i18n/define-translation";
import type { LanguageMessages } from "@/core/libs/i18n/init";

export default {
  // #region FOLIO
  folioLocalSession: "PDF",
  folioEngineUnavailable:
    "Mesin PDF lokal tidak dapat dimulai. Muat ulang halaman lalu coba lagi.",
  folioChoose: "Pilih file",
  folioDropHeading: "Letakkan file di sini",
  folioSampleUnavailable:
    "PDF sampel tidak tersedia. Pilih file dari perangkat Anda.",
  folioSample: "Buka sampel",
  folioOpening: "Membuka PDF",
  folioCloseFile: "Tutup file",
  folioDocuments: "Dokumen",
  folioUntitledDocument: "Dokumen",
  folioNewTab: "Buka file di tab baru",
  folioZoomLevel: "Tingkat perbesaran",
  folioZoomPresets: "Perbesaran",
  folioZoomFitPage: "Sesuaikan halaman",
  folioZoomFitWidth: "Sesuaikan lebar",
  folioZoomAutomatic: "Otomatis",
  folioZoomIn: "Perbesar",
  folioZoomOut: "Perkecil",
  folioCloseTab: "Tutup {name}",
  folioTabLoading: "Memuat",
  folioTabLocked: "Terkunci",
  folioTabError: "File ini tidak terbuka",
  folioCloseUnsavedTitle: "Tutup tanpa mengunduh?",
  folioCloseUnsavedBody:
    "“{name}” memiliki perubahan yang belum diunduh. Perubahan itu akan hilang.",
  folioCloseWithoutSaving: "Tutup tanpa menyimpan",
  folioSecurity: "Keamanan",
  folioProtectTitle: "Lindungi dokumen",
  folioProtectIntro:
    "Tambahkan kata sandi atau batasi yang dapat dilakukan pembaca dengan PDF ini. Salinan yang dilindungi menggantikan file yang terbuka.",
  folioProtectOpen: "Wajibkan kata sandi untuk membuka",
  folioProtectOpenHint:
    "Pembaca harus memasukkan kata sandi ini sebelum melihat dokumen.",
  folioProtectPassword: "Kata sandi dokumen",
  folioProtectConfirm: "Konfirmasi kata sandi dokumen",
  folioProtectMismatch: "Kata sandi tidak cocok.",
  folioProtectRestrict: "Batasi izin",
  folioProtectRestrictHint:
    "Batasi pencetakan, penyalinan, dan penyuntingan. Kata sandi pemilik diperlukan.",
  folioProtectOwner: "Kata sandi pemilik",
  folioProtectConfirmOwner: "Konfirmasi kata sandi pemilik",
  folioProtectAllowed: "Tindakan yang diizinkan",
  folioProtectPrint: "Cetak",
  folioProtectPrintHigh: "Cetak berkualitas tinggi",
  folioProtectCopy: "Salin isi",
  folioProtectAccess: "Ekstrak untuk aksesibilitas",
  folioProtectModify: "Ubah dokumen",
  folioProtectAnnotate: "Tambah atau ubah anotasi",
  folioProtectFill: "Isi formulir dan tanda tangani",
  folioProtectAssemble: "Susun dan ekstrak halaman",
  folioProtectNone: "Pilih setidaknya satu opsi perlindungan untuk diterapkan.",
  folioProtectApply: "Terapkan perlindungan",
  folioProtectApplying: "Menerapkan…",
  folioProtectCancel: "Batal",
  folioProtectFailed: "Dokumen tidak dapat dilindungi. Coba lagi.",
  folioProtectDone:
    "Perlindungan diterapkan. File yang terbuka kini terlindungi.",
  folioInvalidPdf: "File ini tidak dapat dibuka sebagai PDF. Pilih file lain.",
  folioPromise: "Lihat, sunting, dan kompres PDF di perangkat Anda.",
  folioFactInput: "PDF lokal. Tanpa unggahan.",
  folioFactEdit:
    "Baca, ubah kata, beri anotasi, redaksi, tanda tangani, isi formulir, atur halaman, dan kompres gambar JPEG.",
  folioFactOutput:
    "Unduh PDF baru dengan perubahan Anda atau salinan yang lebih kecil.",
  folioExplainerTitleLead: "Apa itu",
  folioExplainerTitleAccent: "Folio",
  folioExplainerTitleBridge: "dan",
  folioExplainerTitleTail: "mengapa penting",
  folioExplainerLede:
    "Folio adalah alat PDF yang berjalan di peramban ini. File dibuka di perangkat Anda, disunting di sana, dan ditulis sebagai PDF baru saat Anda mengunduh.",
  folioExplainerIntro:
    "PDF membawa kontrak, slip gaji, rekam medis, tiket, dan dokumen identitas. Sebagian besar penyunting PDF online mengunggah file ke server untuk mengolahnya. Folio tidak: mesin PDF diunduh sekali, lalu halaman, anotasi, formulir, tanda tangan, dan urutan halaman tetap di tab ini. File asli tidak berubah, tidak perlu akun, dan kunjungan berikutnya dapat bekerja offline. Folio menerapkan setiap perubahan sebagai langkah yang dapat diurungkan, dan unduhan menulis file baru.",
  folioCompareHeading: "Perbandingan Folio",
  folioCompareCaption:
    "Folio dibandingkan dengan iLovePDF, Smallpdf, dan Adobe Acrobat online.",
  folioCompareFeature: "Fitur",
  folioCompareChecked: "Diperiksa pada 30 Oktober 2026. Sumber:",
  folioCompareScroll: "Geser tabel untuk melihat setiap kolom.",
  folioColILovePdf: "iLovePDF",
  folioColSmallpdf: "Smallpdf",
  folioColAdobeAcrobat: "Adobe Acrobat",
  folioColFolio: "Folio",
  folioRowBrowser: "Berjalan di peramban",
  folioRowProcessing: "Pemrosesan",
  folioRowUpload: "PDF diunggah ke server?",
  folioRowFreePlan: "Batas paket gratis",
  folioRowEditText: "Menyunting teks yang ada",
  folioRowAnnotate: "Memberi anotasi dan menambah teks",
  folioRowPages: "Mengatur, menggabung, atau memisah halaman",
  folioRowForms: "Mengisi formulir yang ada",
  folioRowFormDesign: "Membuat atau menyunting bidang formulir",
  folioRowOcr: "OCR",
  folioRowRedact: "Menghapus konten secara permanen",
  folioRowSign: "Menambahkan tanda tangan",
  folioRowProtect: "Kata sandi dan izin",
  folioRowAttachments: "Membuka dan menambah lampiran",
  folioRowMeasure: "Mengukur jarak dan luas",
  folioRowConvert: "Pemadatan atau konversi",
  folioRowOffline: "Berjalan offline",
  folioRowAccount: "Akun untuk mengunduh",
  folioRowStorage: "Penyimpanan file",
  folioRowCost: "Biaya",
  folioValueYes: "Ya",
  folioValueNo: "Tidak",
  folioValueServerSide: "Sisi server",
  folioValueClientSide: "Sisi klien",
  folioValueILoveFree: "Tugas terbatas; batas edit 100 MB",
  folioValueSmallFree: "Batas unduhan harian; ukuran terbatas",
  folioValueAdobeFree: "100 MB; edit teks perlu Pro",
  folioValueFolioFree: "Tanpa unggahan; memori perangkat",
  folioValueProOnly: "Hanya Pro",
  folioValueFolioForms: "Formulir yang didukung dan sudah ada",
  folioValueFolioSign: "Ya, gambar, ketik, atau unggah",
  folioValueWithPermissions: "Ya, dengan izin",
  folioValuePasswordOnly: "Hanya kata sandi",
  folioValueOcrLimited: "Ya, terbatas",
  folioValueOcrLocal: "Ya, di perangkat Anda",
  folioValueCompressOnly: "Hanya kompres",
  folioValueFreeLimited: "Gratis dengan batas",
  folioValueFillOnly: "Hanya mengisi",
  folioValueDesktopPro: "Hanya Pro desktop",
  folioValueAccountNotRequired: "Tidak perlu",
  folioValueAdobeAccount: "ID Adobe gratis",
  folioValueILoveStorage: "Dihapus dalam 2 jam",
  folioValueSmallStorage: "Dihapus dalam 1 jam",
  folioValueAdobeStorage: "Hanya file yang disimpan ke akun",
  folioValueFolioStorage: "Tidak pernah diunggah",
  folioValueFolioOffline: "Ya, saat cache tersimpan",
  folioValuePaid: "Gratis → berbayar",
  folioValueFreeNoAccount: "Gratis, tanpa akun",
  folioValueBasicNoReflow: "Dasar; font sama, tanpa reflow",
  folioHonestyTitle: "Yang tidak dapat dilakukan Folio",
  folioHonestyBody:
    "Folio tidak dapat mengalirkan ulang, membungkus ulang, atau mengganti font teks yang sudah ada, dan Folio menolak suntingan yang melampaui cakupan glyph atau lebar kosong baris. Folio dapat mengompres gambar JPEG di dalam PDF, tetapi tidak dapat mengganti gambar dengan gambar lain, mengompres gambar yang bukan JPEG, atau mengonversinya ke format lain. Halaman dengan gambar yang berubah dibangun ulang, jadi tag di halaman itu bisa menjadi usang. OCR hanya memakai font Latin, jadi teks dalam aksara lain dilewati dan dihitung. Folio tidak memvalidasi tanda tangan digital atau memeriksa kesesuaian PDF/A dan PDF/UA. Tanda tangan yang Anda tambahkan adalah tanda visual, bukan tanda tangan digital berbasis sertifikat. File bertanda tangan digital, terenkripsi, dan tidak didukung dapat tetap hanya-baca, dan suatu tindakan berhenti dengan alasan jika mesin tidak dapat mempertahankan file.",
  folioFaqHeading: "FAQ",
  folioFaqDownloadQ: "Mengapa kunjungan pertama perlu koneksi?",
  folioFaqDownloadA:
    "Mesin PDF, worker-nya, dan fonta berukuran besar. Peramban menyimpannya di cache agar kunjungan berikutnya dapat bekerja offline. Jika cache dihapus, unduhan diperlukan lagi.",
  folioFaqSaveQ: "Apakah Folio menyimpan perubahan saya?",
  folioFaqSaveA:
    "Tidak. Unduhan membuat PDF baru. Sesi sunting, riwayatnya, dan kata sandi berakhir saat Anda pergi atau memuat ulang. File input tidak pernah ditimpa.",
  folioFaqEditQ: "Bisakah Folio mengubah teks di PDF?",
  folioFaqEditA:
    "Ya, satu objek teks setiap kali, dalam font dan ukuran objek itu sendiri. Folio menolak suntingan jika font tidak memiliki salah satu karakter atau teks baru tidak muat di baris, dan Folio tidak pernah mengalirkan ulang atau membungkus ulang. Redaksi menghapus konten yang ditandai secara permanen. Teks yang Anda tambahkan dengan alat anotasi tetap menjadi anotasi di atas halaman.",
  folioFaqSignedQ:
    "Bisakah Folio membuka PDF bertanda tangan atau terenkripsi?",
  folioFaqSignedA:
    "PDF yang dilindungi kata sandi dapat dibuka setelah Anda memasukkan kata sandi. Dokumen bertanda tangan digital dapat dibuka untuk dibaca, dan Folio tidak memvalidasi tanda tangannya. Tanda tangan yang Anda tambahkan adalah tanda visual, bukan tanda tangan digital berbasis sertifikat.",
  folioFaqOcrQ: "Apakah Folio menjalankan OCR atau memperbaiki aksesibilitas?",
  folioFaqOcrA:
    "Ya, untuk halaman pindaian. OCR berjalan di perangkat ini dengan model Inggris dan Indonesia, lalu menulis teks mesin ke salinan baru, agar pencarian dan salin berfungsi. Folio memakai font Latin, jadi aksara lain dilewati dan dihitung. File terenkripsi dan file bertanda tangan ditolak. Folio tidak memperbaiki urutan baca, tag, atau kesesuaian PDF/UA.",
  folioFaqCompressQ: "Apakah Folio mengompres PDF?",
  folioFaqCompressA:
    "Ya. Folio mengenkode ulang gambar JPEG di dalam PDF pada Ringan, Seimbang, atau Kuat, di perangkat ini. Teks, vektor, formulir, dan gambar lain dipertahankan oleh mesin. Halaman dengan gambar yang berubah dibangun ulang, jadi tag di halaman itu bisa menjadi usang, dan gambar yang dienkode ulang kehilangan metadata bawaannya. File bertanda tangan dan terenkripsi dilewati. File yang terbuka tidak berubah; unduhannya adalah salinan baru.",
  folioFaqBlockQ: "Apa yang menghentikan sebuah suntingan?",
  folioFaqBlockA:
    "Folio mempertahankan struktur dokumen yang mampu. Jika suatu tindakan tidak dapat mempertahankan kerangka dokumen, tag, lapisan, atau anotasi yang tidak didukung, Folio berhenti dengan alasan, bukan menulis file yang rusak.",
  folioFaqLimitQ: "Apakah ada batas ukuran file?",
  folioFaqLimitA:
    "Tidak ada batas unggahan tetap karena tidak ada yang diunggah. Memori perangkat menetapkan batasnya. Riwayat urungkan menyimpan hingga 100 perubahan.",
  folioDisclaimerHeading: "Penafian",
  folioCompareDisclaimer:
    "iLovePDF, Smallpdf, dan Adobe Acrobat adalah milik pemiliknya masing-masing. Folio independen dan tidak berafiliasi dengan mereka. Fitur dan batas diambil dari halaman publik mereka dan bisa berubah. Folio tidak memberikan nasihat hukum, keamanan, atau kepatuhan.",
  folioOcr: "OCR",
  folioOcrTitle: "Jalankan OCR",
  folioOcrIntro:
    "Baca teks dari gambar halaman dan tulis ke salinan baru, agar pencarian dan salin berfungsi. Teks dibuat mesin dan bisa salah. File asli tidak berubah.",
  folioOcrLanguages: "Bahasa",
  folioOcrLanguageEng: "Inggris",
  folioOcrLanguageInd: "Indonesia",
  folioOcrPages: "Halaman",
  folioOcrPage: "Halaman {page}",
  folioOcrChecking: "Membaca teks halaman…",
  folioOcrHasText: "Ada teks",
  folioOcrNoText: "Tanpa teks",
  folioOcrSelectAll: "Pilih semua",
  folioOcrSelectNone: "Kosongkan pilihan",
  folioOcrHonesty:
    "Teks OCR adalah dugaan mesin. Periksa hal penting sebelum Anda memakainya. Halaman yang sudah punya teks tidak dipilih, karena teksnya akan bertumpuk.",
  folioOcrStart: "Mulai OCR",
  folioOcrRunning: "OCR halaman {done} dari {total}",
  folioOcrStopped: "OCR berhenti setelah {done} halaman",
  folioOcrKeepHint:
    "Anda bisa menyimpan halaman yang selesai atau membuang proses ini.",
  folioOcrStop: "Hentikan",
  folioOcrDiscard: "Buang",
  folioOcrKeep: "Simpan {count} halaman",
  folioOcrClose: "Tutup",
  folioOcrDone: "OCR selesai. Salinan baru memuat teks mesin.",
  folioOcrSkipped:
    "{count} kata dilewati: font Latin tidak bisa menggambar karakternya.",
  folioOcrFailed: "OCR berhenti: {message}",
  folioOcrEncrypted:
    "PDF ini terenkripsi. Folio tidak bisa menulis salinan OCR. Hapus proteksinya dulu.",
  folioOcrSigned:
    "PDF ini punya tanda tangan. OCR menulis ulang file dan merusak tanda tangan itu, jadi Folio berhenti.",
  folioOcrRestricted:
    "PDF ini melarang ekstraksi teks. Folio tidak akan menyalin teksnya.",
  folioOcrCheckFailed:
    "Folio tidak bisa membaca lapisan teks. Semua halaman dipilih.",
  folioCompress: "Kompres",
  folioCompressTitle: "Kompres PDF",
  folioCompressIntro:
    "Enkode ulang gambar JPEG di dalam setiap PDF terbuka di perangkat ini, lalu unduh salinan yang lebih kecil. File yang terbuka tidak berubah.",
  folioCompressPreset: "Preset",
  folioCompressLight: "Ringan",
  folioCompressLightHint: "300 dpi · kualitas 90",
  folioCompressBalanced: "Seimbang",
  folioCompressBalancedHint: "150 dpi · kualitas 78",
  folioCompressStrong: "Kuat",
  folioCompressStrongHint: "100 dpi · kualitas 60",
  folioCompressNoteJpeg:
    "Hanya gambar JPEG yang dienkode ulang. Teks, vektor, formulir, dan gambar lain dipertahankan oleh mesin PDF.",
  folioCompressNoteRebuild:
    "Halaman dengan gambar yang berubah dibangun ulang oleh mesin PDF. Tag di halaman itu bisa menjadi usang.",
  folioCompressNoteMetadata:
    "Gambar yang dienkode ulang kehilangan metadata bawaannya, seperti EXIF atau C2PA.",
  folioCompressBatch: "Batch",
  folioCompressSelect: "Sertakan {name}",
  folioCompressSelectAll: "Pilih semua",
  folioCompressSelectNone: "Kosongkan pilihan",
  folioCompressPages: defineTranslation("{count:plural}", {
    plural: {
      count: { one: "{?} halaman", other: "{?} halaman" },
    },
  }),
  folioCompressQueued: "Menunggu",
  folioCompressWorking: "Mengompres",
  folioCompressDone: "Terkompres",
  folioCompressAlreadySmall: "Sudah kecil",
  folioCompressSkipped: "Dilewati",
  folioCompressFailed: "Gagal",
  folioCompressStopped: "Dihentikan",
  folioCompressReasonSigned:
    "Bertanda tangan. Penulisan ulang akan merusak tanda tangannya.",
  folioCompressReasonEncrypted: "Terenkripsi. Buka kuncinya dulu.",
  folioCompressReasonRestricted: "PDF ini tidak mengizinkan salinan unduhan.",
  folioCompressReasonAlreadySmall:
    "Tidak ada gambar JPEG yang bisa dibuat lebih kecil.",
  folioCompressReasonFailed: "File tidak dapat dikompres.",
  folioCompressReasonStopped: "Proses berhenti sebelum file ini selesai.",
  folioCompressImageProgress: "Gambar {done:number} dari {total:number}",
  folioCompressRun: "Kompres semua",
  folioCompressStop: "Hentikan · {done:number} dari {total:number}",
  folioCompressStopIdle: "Hentikan",
  folioCompressDownloadAll: "Unduh semua sebagai ZIP",
  folioCompressDownloadName: "Unduh {name}",
  folioCompressClear: "Hapus hasil",
  folioCompressStale: "Preset berubah. Kompres semua lagi untuk menerapkannya.",
  folioCompressTotals: "Total",
  folioCompressTotalIn: "Total masuk",
  folioCompressTotalOut: "Total keluar",
  folioCompressTotalSaved: "Dihemat",
  folioCompressTotalReduction: "Pengurangan",
  folioCompressEmpty: "Tidak ada PDF yang terbuka. Buka file, lalu coba lagi.",
  folioCompressLive: "Mengompres PDF terpilih di perangkat ini.",
  folioCompressLiveDone: "Kompresi selesai.",
  folioRepairTitle: "Salinan perbaikan",
  folioRepairIntro:
    "Tulis salinan baru PDF ini dengan tabel referensi silang dan pohon halaman yang baru. File yang terbuka tidak berubah.",
  folioRepairFile: "File",
  folioRepairNoteOpen:
    "Salinan perbaikan hanya bekerja pada file yang dapat dibuka oleh mesin. Fitur ini tidak dapat memulihkan file yang tidak terbuka.",
  folioRepairTriesTitle: "Yang dicoba Folio",
  folioRepairTryRewrite:
    "Tulis ulang dokumen yang dimuat. Ini menyimpan struktur yang dibaca oleh mesin.",
  folioRepairTryRebuild:
    "Jika penulisan ulang gagal dalam pemeriksaan, susun ulang file dari halamannya.",
  folioRepairRiskTitle: "Yang dapat hilang",
  folioRepairRisk:
    "Penyusunan ulang dari halaman menghapus formulir, kerangka, file lampiran, JavaScript, dan metadata. Anotasi juga dapat hilang. Hasilnya menyebutkan setiap kehilangan.",
  folioRepairChecks:
    "Sebelum unduhan, Folio membuka salinan itu lagi. Folio memeriksa jumlah halaman, urutan halaman, teks, dan render setiap halaman.",
  folioRepairRun: "Mulai perbaikan",
  folioRepairCancel: "Batal",
  folioRepairPathRewrite: "Tulis ulang",
  folioRepairPathRebuild: "Susun ulang dari halaman",
  folioRepairProgress:
    "{path} · memeriksa halaman {done:number} dari {total:number}",
  folioRepairProgressIdle: "Membaca file",
  folioRepairDoneTitle: "Salinan perbaikan terverifikasi",
  folioRepairPages: defineTranslation("{count:plural}", {
    plural: {
      count: { one: "{?} halaman dipulihkan", other: "{?} halaman dipulihkan" },
    },
  }),
  folioRepairPathUsed: "Jalur: {path}",
  folioRepairDamaged:
    "Tabel referensi silang rusak. Salinan ini memiliki tabel baru.",
  folioRepairNotDamaged:
    "Tabel referensi silang valid. Salinan ini memiliki tabel baru.",
  folioRepairLostNone: "Tidak ada struktur yang hilang.",
  folioRepairLost: "Hilang: {list}.",
  folioRepairLostForms: "formulir",
  folioRepairLostAnnotations: "anotasi",
  folioRepairLostOutlines: "kerangka",
  folioRepairLostAttachments: "file lampiran",
  folioRepairLostJavascript: "JavaScript",
  folioRepairLostMetadata: "metadata",
  folioRepairAttemptFailed: "{path} gagal dalam pemeriksaan {check}.",
  folioRepairCheckWrite: "penulisan",
  folioRepairCheckOpens: "pembukaan",
  folioRepairCheckPages: "jumlah halaman",
  folioRepairCheckText: "teks",
  folioRepairCheckOrder: "urutan halaman",
  folioRepairCheckRender: "render",
  folioRepairDownload: "Unduh salinan perbaikan",
  folioRepairFailedTitle: "Tidak ada salinan perbaikan",
  folioRepairFailedUnreadable:
    "Mesin tidak dapat membuka file ini. Salinan perbaikan tidak dapat memulihkannya.",
  folioRepairFailedEmpty:
    "File ini tidak memiliki halaman. Tidak ada yang dapat dipulihkan.",
  folioRepairFailedUnverified:
    "Tidak ada jalur yang membuat salinan yang lolos semua pemeriksaan. Folio membuang hasilnya.",
  folioRepairRefusedTitle: "Salinan perbaikan ditolak",
  folioRepairRefusedSigned:
    "Bertanda tangan. Penulisan ulang akan merusak tanda tangannya.",
  folioRepairRefusedEncrypted:
    "Terenkripsi. Salinan perbaikan tidak menulis salinan file terenkripsi.",
  folioRepairRefusedRestricted: "PDF ini tidak mengizinkan salinan unduhan.",
  folioRepairStopped: "Perbaikan dihentikan. Tidak ada file yang ditulis.",
  folioRepairError:
    "Mesin perbaikan berhenti karena galat. Tidak ada file yang ditulis.",
  folioRepairLive: "Memperbaiki PDF di perangkat ini.",
  folioExtractTitle: "Ekstrak dari PDF",
  folioExtractIntro:
    "Ambil teks, tautan, gambar halaman, atau file terlampir dari PDF ini. File yang terbuka tidak berubah.",
  folioExtractScope: "Halaman",
  folioExtractScopeAll: "Semua halaman ({count:number})",
  folioExtractScopeSelected: "Halaman terpilih ({count:number})",
  folioExtractSelectedHint: "Pilih halaman yang akan diekspor.",
  folioExtractSelectAll: "Pilih semua",
  folioExtractSelectNone: "Kosongkan pilihan",
  folioExtractPage: "Halaman {page:number}",
  folioExtractOutputs: "Keluaran",
  folioExtractText: "Teks",
  folioExtractTextHint: "Teks yang dapat dicari, satu file per halaman.",
  folioExtractTextFormat: "Format teks",
  folioExtractTextTxt: ".txt",
  folioExtractTextJson: ".json",
  folioExtractLinks: "Tautan",
  folioExtractLinksHint: "Anotasi tautan dengan halaman, kotak, dan target.",
  folioExtractLinkFormat: "Format tautan",
  folioExtractLinkCsv: ".csv",
  folioExtractLinkJson: ".json",
  folioExtractPages: "Gambar halaman",
  folioExtractPagesHint: "Pratinjau hasil render, satu gambar per halaman.",
  folioExtractImageFormat: "Format gambar",
  folioExtractImagePng: "PNG",
  folioExtractImageWebp: "WebP",
  folioExtractImageWidth: "Lebar gambar",
  folioExtractWidthStandard: "1440 px",
  folioExtractWidthDouble: "2× lebar halaman",
  folioExtractAttachments: "Lampiran",
  folioExtractAttachmentsHint: "File yang tertanam di dalam dokumen.",
  folioExtractEstimate: "≈ {size}",
  folioExtractEstimateUnknown: "Ukuran tidak diketahui",
  folioExtractTextWarning:
    "Ekspor teks tidak menjalankan OCR. Halaman pindaian dilaporkan tanpa teks.",
  folioExtractLinkLimit:
    "Hanya anotasi tautan yang diekspor. Teks yang tampak seperti URL tanpa anotasi tautan tidak dideteksi.",
  folioExtractPagesWarning:
    "Gambar halaman adalah pratinjau hasil render, bukan gambar asli yang tertanam.",
  folioExtractPixelCap:
    "Gambar halaman berhenti pada total {megapixels:number} megapiksel.",
  folioExtractPageCap:
    "Gambar halaman maksimal {count:number} halaman. Pilih lebih sedikit halaman.",
  folioExtractAttachmentLimit:
    "File yang dilampirkan ke anotasi halaman tidak disertakan.",
  folioExtractNoOutput: "Pilih setidaknya satu keluaran.",
  folioExtractNoPages: "Pilih setidaknya satu halaman.",
  folioExtractNoTextAll:
    "Tidak ada halaman terpilih yang memiliki teks yang dapat dicari.",
  folioExtractNoTextPages: defineTranslation("{count:plural}", {
    plural: {
      count: {
        other:
          "{?} halaman tidak memiliki teks yang dapat dicari dan dilewati.",
      },
    },
  }),
  folioExtractNoAttachments: "PDF ini tidak memiliki file terlampir.",
  folioExtractAttachmentsUnreadable: "File terlampir tidak dapat dibaca.",
  folioExtractDenied: "Beberapa keluaran tidak tersedia untuk PDF ini.",
  folioExtractDeniedText: "PDF ini tidak mengizinkan penyalinan teks.",
  folioExtractDeniedLinks: "PDF ini tidak mengizinkan pembacaan anotasi.",
  folioExtractDeniedPages: "PDF ini tidak mengizinkan render halaman.",
  folioExtractDeniedAttachments: "PDF ini tidak mengizinkan pengunduhan.",
  folioExtractProgress: "Progres ekstrak",
  folioExtractStart: "Mulai ekstrak",
  folioExtractStop: "Hentikan · {done:number} dari {total:number}",
  folioExtractStopIdle: "Hentikan",
  folioExtractLive: "Mengekstrak dari PDF yang terbuka di perangkat ini.",
  folioExtractLiveDone: "Ekstrak selesai.",
  folioExtractLiveStopped: "Ekstrak dihentikan.",
  folioExtractStopped: "Ekstrak dihentikan. Tidak ada file yang ditulis.",
  folioExtractDone: "Ekstrak selesai.",
  folioExtractReceipt: defineTranslation("{count:plural} · {size}", {
    plural: {
      count: { other: "{?} file" },
    },
  }),
  folioExtractDownloadZip: "Unduh ZIP",
  folioExtractDownloadFile: "Unduh {name}",
  folioExtractOutputFailed: "{output} gagal: {message}",
  folioExtractPageUnreadable: "Halaman {page:number} tidak dapat dibaca.",
  folioExtractPageTooLarge:
    "Halaman {page:number} terlalu besar untuk dirender pada lebar ini.",
  folioExtractPixelCapFailed:
    "Gambar halaman berhenti pada batas {megapixels:number} megapiksel.",
  folioExtractNothing: "Ekstrak tidak menghasilkan file.",
  folioExtractReset: "Mulai lagi",
  folioFlattenTitle: "Salinan rata",
  folioFlattenIntro:
    "Buat PDF baru tanpa bagian interaktif. File yang terbuka tidak berubah.",
  folioFlattenSelectedHint: "Pilih halaman yang akan disalin.",
  folioFlattenKept: "Tetap ada",
  folioFlattenKeptContent: "Isi halaman. Teks tetap dapat dicari.",
  folioFlattenKeptForms:
    "Nilai formulir saat ini dan tanda anotasi, sebagai isi halaman.",
  folioFlattenRemoved: "Dihapus",
  folioFlattenRemovedForms: "Bidang formulir",
  folioFlattenRemovedLinks: "Tautan dan aksi halaman",
  folioFlattenRemovedScripts: "JavaScript",
  folioFlattenRemovedAttachments: "Lampiran",
  folioFlattenRemovedMedia: "Multimedia",
  folioFlattenRemovedOutlines: "Kerangka (penanda)",
  folioFlattenRemovedTags: "Tag dan urutan baca",
  folioFlattenRemovedAnnotations: "Anotasi, sebagai objek yang dapat diedit",
  folioFlattenOutput: "File hasil",
  folioFlattenWarnAccessible:
    "Salinan tidak aksesibel. Pembaca layar tidak dapat memakai tag atau urutan bacanya.",
  folioFlattenWarnFill: "Salinan tidak dapat diisi. Bidang formulirnya hilang.",
  folioFlattenWarnMetadata:
    "Salinan menyimpan judul. Semua metadata dokumen lainnya hilang.",
  folioFlattenWarnLayers:
    "Lapisan tetap dalam keadaan saat ini. Folio menolak file yang halamannya memakai lapisan, karena lapisan tersembunyi dapat tampil di salinan.",
  folioFlattenVector:
    "Folio tidak mengompres, mengonversi, atau merasterisasi halaman. Teks dan garis tetap vektor.",
  folioFlattenRefusedSigned:
    "Bertanda tangan. Salinan menghapus tanda tangan, jadi file ini tetap hanya-baca.",
  folioFlattenRefusedEncrypted:
    "Terenkripsi. Salinan menghapus proteksi, jadi file ini tetap hanya-baca.",
  folioFlattenRefusedRestricted:
    "Dibatasi. PDF ini tidak mengizinkan salinan unduhan.",
  folioFlattenRefusedLayers:
    "Lapisan. Halaman memakai lapisan, dan salinan tidak dapat menyimpan keadaannya.",
  folioFlattenStart: "Buat salinan rata",
  folioFlattenProgress: "Progres perataan",
  folioFlattenLive: "Membuat salinan rata di perangkat ini.",
  folioFlattenLiveDone: "Salinan rata siap.",
  folioFlattenDone: "Salinan rata siap",
  folioFlattenReceipt: defineTranslation("{count:plural} · {size}", {
    plural: {
      count: { one: "{?} halaman", other: "{?} halaman" },
    },
  }),
  folioFlattenChecked:
    "Folio membuka salinan lagi dan memeriksanya: jumlah dan urutan halaman, teks, gambar halaman, tanpa bagian interaktif, dan tanpa kata sandi.",
  folioFlattenFailed: "Tidak ada salinan. Folio menghapus hasilnya.",
  folioFlattenCheckOpen: "Salinan tidak terbuka tanpa kata sandi.",
  folioFlattenCheckPages:
    "Salinan memiliki jumlah, urutan, atau ukuran halaman yang berbeda.",
  folioFlattenCheckText: "Satu halaman salinan kehilangan teks.",
  folioFlattenCheckRender:
    "Satu halaman salinan tidak tergambar, atau kehilangan isi.",
  folioFlattenCheckInteractive:
    "Salinan masih memiliki bagian interaktif. {names}",
  folioFlattenFailedVerify: "Salinan gagal dalam satu pemeriksaan.",
  folioFlattenFailedEngine: "Mesin PDF berhenti. Coba lagi.",
  folioFlattenFailedWrite: "Salinan tidak dapat ditulis.",
  folioFlattenFailedUnreadable: "Salinan halaman tidak dapat dibuka.",
  folioFlattenFailedBusy:
    "Salinan rata lain sedang dibuat. Tunggu, lalu coba lagi.",
  folioFlattenFailedCopy: "Halaman tidak dapat disalin.",
  folioFlattenStopped: "Dihentikan. Folio tidak membuat salinan.",
  folioTextMode: "Teks",
  folioTextBeta: "Teks (beta)",
  folioTextPanelTitle: "Sunting teks",
  folioTextPanelBody:
    "Ubah karakter satu objek teks. Folio mempertahankan font, ukuran, dan posisinya.",
  folioTextApply: "Terapkan perubahan",
  folioTextCancel: "Batal",
  folioTextTags:
    "Halaman ini bertag. Setelah disunting, tag-nya mungkin usang.",
  folioTextEmpty: "Halaman ini tidak memiliki teks yang dapat disunting.",
  folioTextInvisible:
    "Sebagian teks di halaman ini tidak terlihat. Penyuntingan tidak akan mengubahnya.",
  folioTextReading: "Membaca teks halaman…",
  folioTextReadFailed:
    "Folio tidak bisa membaca teks di halaman ini. Tutup panel lalu buka lagi.",
  folioTextUndo: "Urungkan perubahan teks",
  folioTextChanged: "Teks diubah. Unduh untuk menyimpannya.",
  folioTextFit: "Ruang kosong di baris ini: {free:number} pt.",
  folioTextOverflowFit:
    "Teks ini {needed:number} pt terlalu lebar untuk baris ini. Hanya {free:number} pt yang kosong.",
  folioTextRefusedEncrypted:
    "Folio tidak dapat menyunting teks dalam dokumen terenkripsi.",
  folioTextRefusedGlyph:
    "Font tidak dapat menggambar salah satu karakter ini. Hapus karakter itu, atau gunakan alat anotasi untuk menambah teks.",
  folioTextRefusedInvisible:
    "Teks ini tidak menggambar halaman. Mungkin ini lapisan OCR. Gunakan alat anotasi untuk menambah teks.",
  folioTextRefusedOverflow:
    "Teks baru lebih lebar daripada ruang kosong di baris ini. Pendekkan teksnya.",
  folioTextRefusedSigned:
    "Dokumen ini ditandatangani secara digital, jadi Folio membiarkannya hanya-baca.",
  folioTextRefusedPermission: "Dokumen ini tidak mengizinkan perubahan konten.",
  folioTextRefusedArtwork:
    "Perubahan akan mengubah halaman di luar objek teks. Tidak ada yang ditulis.",
  folioTextRefusedGeneric:
    "Perubahan tidak dapat diverifikasi. Tidak ada yang ditulis.",
  locale: "id-ID",
  backTo: "Kembali ke halaman {target}",
  error: "{module} eror",
  toggleTheme: "Ubah tema",
  remove: "Hapus",
  empty: "Data Kosong",
  language: "Bahasa",
  toolCatalog: "Katalog alat",
  breadcrumb: "Jejak navigasi",
  collapseSidebar: "Ciutkan bilah samping",
  expandSidebar: "Bentangkan bilah samping",
  openSidebar: "Buka bilah samping",
  cancel: "Batal",
  close: "Tutup",
  skipToContent: "Lompat ke konten",
  loading: "Memuat",
  errorTitle: "Ups!",
  errorMessage: "Terjadi kesalahan",
  errorRetry: "Coba lagi",
  errorCode: "4xx",
  reload: "Muat ulang",
  appReadyTitle: "Siap offline",
  appReady: "Aplikasi siap digunakan secara offline",
  newContentTitle: "Pembaruan siap",
  newContentAvailable:
    "Konten baru tersedia. Klik tombol muat ulang untuk memperbarui",
  notFound: "Tidak Ditemukan",
  gone: "Maaf, kami tidak bisa menemukan halaman yang anda cari",
  welcome: "Selamat Datang Kembali",
  // #endregion COMMON
  // #region HOME
  title: "Beranda",
  // #endregion HOME
  // #region TOOLS
  homeTitle: "Gratis & Lokal",
  toolsTitle: "Alat",
  homeLocalClaim:
    "Tanpa akun. Tanpa unggah. Tanpa penyimpanan server. Tanpa paket berbayar. Tanpa kuota harian.",
  homeLocalLimit: "Batasnya hanya perangkat anda.",
  homeOpenTool: "Buka {tool}",
  homeFactFormats: "JPEG, PNG, WebP, AVIF, GIF, dan BMP masuk.",
  homeFactOutputs:
    "JPEG, WebP, AVIF, atau PNG keluar. Multi menulis tiga sekaligus.",
  homeFactModes:
    "Satu Target per gambar, satu anggaran Batch, atau satu kualitas tetap.",
  homeFaqHeading: "FAQ",
  homeFaqLede: "Aturan yang sama berlaku untuk semua alat.",
  homeFaqFreeQ: "Apakah Ritools gratis?",
  homeFaqFreeA:
    "Ya. Tanpa akun, tanpa kuota, tanpa paket berbayar. Satu-satunya biaya adalah memori dan CPU perangkat anda.",
  homeFaqLocalQ: "Apakah file saya meninggalkan perangkat?",
  homeFaqLocalA:
    "Tidak. Setiap alat membaca dan menulis file di tab ini. Tidak ada endpoint unggah dan tidak ada penyimpanan server.",
  homeFaqOfflineQ: "Apakah bekerja offline?",
  homeFaqOfflineA:
    "Ya, setelah halaman dan codec-nya dimuat sekali. Setiap codec dimuat saat pertama dipakai.",
  homeFaqCommercialQ: "Bisakah saya memakainya untuk pekerjaan komersial?",
  homeFaqCommercialA: "Bisa. Ritools gratis untuk pekerjaan komersial.",
  // #endregion TOOLS
  // #region SQUEEZE
  squeezeTagline: "Kompres seluruh batch gambar ke ukuran file target",
  squeezeIntro:
    "Gambar sangat besar bisa kehabisan memori. Batch hidup di tab ini. Muat ulang akan menghapusnya.",
  squeezeTicketTitle: "Batch",
  squeezeFilesHeading: "File",
  squeezeSettingsHeading: "Pengaturan",
  squeezeOutputFormat: "Format keluaran",
  squeezeOutputJpeg: "JPEG",
  squeezeOutputWebp: "WebP",
  squeezeOutputAvif: "AVIF",
  squeezeOutputPng: "PNG",
  squeezeOutputKeep: "Tetap",
  squeezeOutputMulti: "Multi",
  squeezeCodecJpeg: "MozJPEG · terbuka di mana saja",
  squeezeCodecWebp: "Native · lebih kecil dari JPEG",
  squeezeCodecAvif: "WASM · paling kecil, paling lambat",
  squeezeCodecPng: "Lossless · Target bisa mengurangi warna",
  squeezeCodecKeep: "Format input, tanpa perubahan",
  squeezeCodecMulti: "JPEG + WebP + AVIF · tiga file",
  squeezeCodecNotice:
    "Setiap codec dimuat saat pertama dipakai, lalu bekerja offline. AVIF 3.5 MiB.",
  squeezeSizeMode: "Target ukuran",
  squeezeModePerImage: "Per gambar",
  squeezeModeBatchTotal: "Total Batch",
  squeezeModeFixedQuality: "Kualitas tetap",
  squeezeModeNotePerImage: "Satu Target untuk setiap gambar di Batch.",
  squeezeModeNoteBatchTotal:
    "Satu anggaran untuk Batch. Setiap gambar mendapat bagian rata; sisa byte diberikan ke gambar yang meleset.",
  squeezeModeNoteFixedQuality:
    "Satu kualitas untuk setiap gambar. Tanpa Target, tanpa pencarian.",
  squeezeTargetSize: "Target",
  squeezeTargetHint: "10 KB sampai 10 MB.",
  squeezeBatchTotal: "Anggaran Batch",
  squeezeBudgetImagesLabel: "Gambar",
  squeezePerImageBudgetLabel: "Per gambar",
  squeezeBudgetNote: "Dibagi rata, lalu satu putaran pembagian ulang.",
  squeezeQuality: "Kualitas",
  squeezeQualityHint: "10 sampai 95.",
  squeezeOptions: "Opsi",
  squeezeResize: "Perkecil gambar besar",
  squeezeMaxWidth: "Lebar maksimum",
  squeezeMaxHeight: "Tinggi maksimum",
  squeezeResizeHint: "16 sampai 10000 px. Tidak pernah memperbesar.",
  squeezePreserveExif: "Pertahankan EXIF",
  squeezePreserveFolders: "Pertahankan struktur folder",
  squeezeExifNote:
    "Hanya untuk keluaran JPEG. Gambar yang sudah masuk Target memakai file aslinya, termasuk metadata.",
  squeezeExifMultiNote: "Hanya berlaku untuk file JPEG.",
  squeezeFolderNote:
    "Hanya untuk ZIP. Folder yang dijatuhkan membawa jalurnya.",
  squeezeReasonExifJpegOnly: "EXIF hanya disimpan untuk keluaran JPEG.",
  squeezeReasonNoJpegInput: "Tidak ada keluaran JPEG di Batch ini.",
  squeezeReasonNoJpegSource: "Tidak ada input JPEG di Batch ini.",
  squeezeReasonNoFolders: "Tidak ada folder di Batch ini.",
  squeezeReasonPngLossless:
    "PNG tidak punya pengaturan kualitas. Tetap lossless.",
  squeezeReasonTargetRange: "Target harus antara 10 KB dan 10 MB.",
  squeezeReasonResizeRange: "Setiap ukuran harus antara 16 dan 10000 px.",
  squeezeReasonQualityRange: "Kualitas harus antara 10 dan 95.",
  squeezeReasonMultiBatchTotal:
    "Multi menulis tiga file per gambar. Total Batch menghitung satu anggaran, bukan tiga file. Pakai Per gambar.",
  squeezeReasonShareTooSmall:
    "Di bawah 10 KB per gambar. Naikkan total atau hapus file.",
  squeezeActions: "Aksi",
  squeezeCompressAll: "Kompres semua",
  squeezeCompressAllStale: defineTranslation("Kompres semua · {count:plural}", {
    plural: { count: { one: "{?} baris usang", other: "{?} baris usang" } },
  }),
  squeezeCompressing: defineTranslation(
    "Berhenti · {done:number} dari {total:number}",
    {}
  ),
  squeezeDownloadAll: "Unduh semua sebagai ZIP",
  squeezeClearAll: "Bersihkan semua",
  squeezeClearTitle: "Bersihkan Batch?",
  squeezeClearBody:
    "Semua gambar dan hasilnya keluar dari tab ini. Unduhan yang sudah tersimpan tidak terpengaruh.",
  squeezeStaleHint: "Pengaturan berubah. Kompres semua lagi.",
  squeezeAllMiss:
    "Setiap baris melewati Target. Naikkan Target, perkecil, atau coba AVIF.",
  squeezeActionRaiseTarget: "Naikkan Target",
  squeezeActionResize: "Perkecil",
  squeezeActionTryAvif: "Coba AVIF",
  squeezeActionTryFormat: "Coba format lain",
  squeezeDropTitle: "Letakkan gambar atau folder di sini",
  squeezeDropHint:
    "JPEG, PNG, WebP, AVIF, GIF, BMP · GIF dan BMP memakai frame pertama",
  squeezeChooseFiles: "Pilih file",
  squeezeChooseFolder: "Pilih folder",
  squeezeEmptyTitle: "Belum ada gambar.",
  squeezeEmptyHint: "Letakkan satu Batch, atau pilih folder.",
  squeezeBatchCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} gambar", other: "{?} gambar" } },
  }),
  squeezeUnderTargetSummary: defineTranslation(
    "{under:number} dari {total:number} di bawah Target",
    {}
  ),
  squeezeOverCount: defineTranslation("{count:number} lewat", {}),
  squeezeOverBudget: defineTranslation("Melebihi anggaran {amount}", {}),
  squeezeBudgetAboveInputs: "Anggaran lebih besar dari total masukan.",
  squeezeCodecOfflineAll: defineTranslation(
    "Sambungkan sekali untuk memuat {format}.",
    {}
  ),
  squeezeWatchStart: "Pantau folder",
  squeezeWatchStop: "Berhenti memantau",
  squeezeWatchDenied: "Izin folder pantau ditolak. Letakkan file saja.",
  squeezeWatchRevoked: "Akses folder pantau berhenti. Letakkan file saja.",
  squeezeWatchUnsupported:
    "Folder pantau bekerja di Chrome dan Edge. Letakkan file saja.",
  squeezeDuplicateCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} sudah ada di Batch" } },
  }),
  squeezeSkippedCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} file dilewati" } },
  }),
  squeezeWatchedCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} file baru · Kompres semua" } },
  }),
  squeezeZipFailed: "ZIP tidak bisa dibuat. Hasil anda masih ada.",
  squeezeZipLeftOut: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} baris tidak masuk ZIP" } },
  }),
  squeezeColOut: "Keluar",
  squeezeStateDone: "Selesai",
  squeezeStateAlreadyFits: "Sudah cukup",
  squeezeStateMiss: "Meleset",
  squeezeStateBigger: "Lebih besar",
  squeezeStateRejected: "Ditolak",
  squeezeStateQueued: "Menunggu",
  squeezeWorking: "Bekerja",
  squeezeNoteResized: "Diubah ukurannya {from} → {to}",
  squeezeNoteColorsReduced: "Warna dikurangi",
  squeezeNoteFlattened: "Diratakan di atas putih",
  squeezeNoteFirstFrame: "Frame pertama",
  squeezeNoteExifKept: "EXIF disimpan",
  squeezeNoteBiggerThanInput: defineTranslation(
    "Lebih besar dari input +{percent:number}%",
    {}
  ),
  squeezeNoteOriginalUsed: "File asli dipakai",
  squeezeNoteOutOfDate: "Sudah usang",
  squeezeNoteRaised: defineTranslation("Anggaran dinaikkan ke {amount}", {}),
  squeezeNoteStillOver: defineTranslation(
    "Anggaran dinaikkan ke {amount} · masih lebih",
    {}
  ),
  squeezeNoteNoSmaller: "Tidak ada file lebih kecil; file asli dipakai.",
  squeezeSmallestStep: defineTranslation("Percobaan terkecil: {step}", {}),
  squeezeMissNote:
    "File terkecil masih di atas Target. Naikkan Target, perkecil, atau coba format lain.",
  squeezeBiggerNote:
    "Hasilnya lebih besar dari input. Anda meminta format atau ukuran ini.",
  squeezeFileCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} file" } },
  }),
  squeezeWrittenCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} dari 3 tertulis" } },
  }),
  squeezeUnderTargetCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} dari 3 di bawah target" } },
  }),
  squeezePartFailed: "Gagal",
  squeezeDownload: "Unduh",
  squeezeDownloadMultiHint: "Unduh ketiganya sebagai ZIP",
  squeezeRetry: "Coba lagi",
  squeezeRemove: "Hapus",
  squeezeRemoveFile: defineTranslation("Hapus {name}", {}),
  squeezeTotalsHeading: "Total Batch",
  squeezeTotalIn: "Total masuk",
  squeezeTotalOut: "Total keluar",
  squeezeTotalSaved: "Hemat",
  squeezeTotalReduction: "Pengurangan",
  squeezeProblemUnsupported: "Squeeze tidak membaca jenis file ini.",
  squeezeProblemUnreadable: "Squeeze tidak bisa membaca gambar ini.",
  squeezeProblemCodecFailed: "Encoder gagal pada gambar ini.",
  squeezeProblemTooLarge: "Terlalu besar untuk perangkat ini. Coba Perkecil.",
  squeezeProblemCodecOffline: defineTranslation(
    "{format} belum di-cache. Sambungkan sekali, lalu bekerja offline.",
    {}
  ),
  squeezeAnnounceProgress: defineTranslation("Progres {percent:number}%", {}),
  squeezeAltTitleLead: "Apa itu",
  squeezeAltTitleAccent: "Squeeze",
  squeezeAltTitleBridge: "dan",
  squeezeAltTitleTail: "mengapa penting",
  squeezeAltLead:
    "Squeeze mengompres sekumpulan file dengan target ukuran total yang anda tentukan.",
  squeezeAltBody:
    "Jika anda memakai TinyPNG, Compressor.io, atau iLoveIMG dan menabrak batas 20 file, batas 5 MB, atau paywall mereka, Squeeze memberi anda codec yang sama tanpa semua batasan itu. Gambar anda diproses dengan codec standar industri (MozJPEG, libavif, oxipng), dan tidak pernah meninggalkan perangkat anda.",
  squeezeCompareHeading: "Perbandingan Squeeze",
  squeezeCompareCaption:
    "Squeeze dibanding TinyPNG, Squoosh, dan Compressor.io.",
  squeezeCompareFeature: "Fitur",
  squeezeCompareChecked: "Batas diperiksa pada 23 Oktober 2026. Sumber:",
  squeezeCompareScroll: "Geser ke samping untuk melihat semua kolom.",
  squeezeColTinyPng: "TinyPNG",
  squeezeColSquoosh: "Squoosh",
  squeezeColCompressorIo: "Compressor.io",
  squeezeColSqueeze: "Squeeze",
  squeezeRowBulk: "Kompresi massal",
  squeezeRowTarget: "Ukuran file target",
  squeezeRowMaxFile: "Ukuran file maksimum",
  squeezeRowProcessing: "Pemrosesan",
  squeezeRowUpload: "Apakah gambar diunggah ke server?",
  squeezeRowFormats: "JPEG / WebP / AVIF",
  squeezeRowZip: "Unduhan ZIP",
  squeezeRowCost: "Biaya",
  squeezeValueYes: "Ya",
  squeezeValueNo: "Tidak",
  squeezeValueNoAvif: "Tanpa AVIF",
  squeezeValueNoCap: "Tanpa kuota",
  squeezeValueClientSide: "Sisi klien",
  squeezeValueServerSide: "Sisi server",
  squeezeValueTinyBulk: "20 file / batch",
  squeezeValueSquooshBulk: "1 file saja",
  squeezeValueCompressorBulk: "50 / hari gratis",
  squeezeValueTargetYes: "Ya (per gambar)",
  squeezeValueTinyMax: "5 MB gratis",
  squeezeValueCompressorMax: "10 MB gratis",
  squeezeValueFree: "Gratis",
  squeezeValueTinyCost: "Gratis → paket berbayar",
  squeezeValueCompressorCost: "Gratis → Premium",
  squeezeValueFreeAlways: "Gratis, selalu",
  squeezeDisclaimerHeading: "Penafian",
  squeezeDisclaimer:
    "TinyPNG®, TinyJPG®, dan Tinfify® adalah merek dagang Voormedia B.V. Squoosh adalah proyek Google Chrome Labs. Compressor.io adalah merek dagang dari pemiliknya. Squeeze adalah alat independen yang dibuat oleh Ritools dan tidak berafiliasi dengan, tidak didukung, atau disponsori oleh perusahaan mana pun dari mereka. Perbandingan fitur didasarkan pada kemampuan yang terdokumentasikan secara publik dan diberikan hanya untuk tujuan informatif.",
  squeezeFaqHeading: "FAQ",
  squeezeFaqFormatsQ: "Format apa yang bisa saya pakai?",
  squeezeFaqFormatsA:
    "Input: JPEG, PNG, WebP, AVIF, GIF, BMP. Output: JPEG, WebP, AVIF, PNG, format input, atau Multi (JPEG + WebP + AVIF). GIF dan BMP memakai frame pertama.",
  squeezeFaqPngQ: "Mengapa PNG saya kehilangan warna?",
  squeezeFaqPngA:
    "PNG tidak punya pengaturan kualitas. Dalam mode Target, Squeeze bisa mengurangi jumlah warna untuk mencapai Target; barisnya menyebutkan itu. Dalam Fixed quality, PNG tetap lossless.",
  squeezeFaqMissQ: "Apa itu Miss?",
  squeezeFaqMissA:
    "File terkecil yang bisa dibuat Squeeze masih di atas Target. Baris itu menyimpan file tersebut dan menunjukkan tiga jalan keluar: naikkan Target, perkecil, atau coba format lain.",
  squeezeFaqAvifQ: "Mengapa AVIF lambat?",
  squeezeFaqAvifA:
    "AVIF memampatkan lebih kuat dan butuh waktu lebih lama untuk encode. Ia yang terkecil di antara tiga format web.",
  squeezeFaqCountQ: "Berapa banyak gambar yang bisa saya tambahkan?",
  squeezeFaqCountA:
    "Tanpa kuota. Perangkat anda yang menentukan: 2 sampai 4 gambar berjalan sekaligus, dan gambar sangat besar bisa kehabisan memori.",
  squeezeFaqExifQ: "Apakah EXIF disimpan?",
  squeezeFaqExifA:
    "Hanya di keluaran JPEG, saat anda menyalakannya. Gambar yang sudah masuk Target memakai file aslinya, termasuk metadata.",
  squeezeFaqGifQ: "Apa yang terjadi pada GIF animasi?",
  squeezeFaqGifA:
    "Squeeze membaca frame pertama. Hasilnya gambar diam; animasinya tidak disimpan.",
  squeezeFaqReloadQ: "Apakah muat ulang menyimpan Batch saya?",
  squeezeFaqReloadA: "Tidak. Batch hidup di tab. Muat ulang menghapusnya.",
  squeezeHonestyTitle: "Yang tidak dapat dilakukan Squeeze",
  squeezeHonestyBody:
    "Squeeze hanya mengompres. Squeeze tidak pernah memperbesar gambar, tidak bisa menulis GIF atau BMP, dan GIF animasi menjadi gambar diam. Jika hasil terkecil masih di atas Target, baris itu adalah Miss.",
  // #endregion SQUEEZE
  // #region EXPOSE
  exposePromise: "Baca metadata file, lalu hapus kelompok yang Anda pilih.",
  exposeDeck:
    "Setiap Metadata Field, titik GPS, Provenans AI, dan Pembersihan yang memberi tahu apa yang tersisa. File tidak pernah meninggalkan perangkat ini.",
  exposeFactFormats:
    "Gambar, DNG terbatas, PDF, video, audio, dan Office. Beberapa format hanya dapat dibaca.",
  exposeReadOnlyFormat:
    "Format ini dapat dibaca, tetapi mesin tidak dapat menghapus metadatanya. File Bersih tidak tersedia.",
  exposePdfCleanUnavailable:
    "Pembersihan PDF tidak tersedia pada versi ini. Laporan metadata tersedia.",
  exposeOfficePropertiesOnly:
    "Pembersihan Office hanya menghapus properti dokumen. Isi dokumen tidak berubah.",
  exposeMediaTagsOnly:
    "Pembersihan video dan audio hanya menghapus tag kontainer. Data media tidak berubah.",
  exposeC2paUnsupported: "C2PA tidak dipindai pada format ini.",
  exposePreviewUnavailable:
    "Pratinjau tidak tersedia di peramban ini. Laporan metadata tersedia.",
  exposeOfficePreviewUnavailable:
    "Pratinjau tidak tersedia untuk file Office. Laporan metadata tersedia.",
  exposeEngineBuildLimited: "Mesin versi ini tidak dapat menulis PDF.",
  exposeContainerRebuilt:
    "Kontainer ZIP dibuat ulang. Bagian dokumen tidak berubah.",
  exposePdfInfoAndXmp: "Hanya properti PDF Info dan XMP yang dipilih.",
  exposePdfPreview: "Pratinjau PDF",
  exposeVideoPreview: "Pratinjau video",
  exposeAudioPreview: "Pratinjau audio",
  exposeCoverArt: "Sampul",
  exposeFactCodec: "Kodek",
  exposeFactFamily: "Keluarga",
  exposeFactDuration: "Durasi",
  exposeFactPages: "Halaman",
  exposeFactSampleRate: "Laju sampel",
  exposeFactChannels: "Kanal",
  exposeFactParts: "Bagian",
  exposeFamilyImage: "Gambar",
  exposeFamilyRaw: "RAW",
  exposeFamilyDocument: "Dokumen",
  exposeFamilyVideo: "Video",
  exposeFamilyAudio: "Audio",
  exposeFamilyOffice: "Office",
  exposeReadOnlyTitle: "{format} · Hanya baca",
  exposeDngReadOnlyBody:
    "Expose membaca metadata DNG. Pembersihan tidak didukung karena metadata pribadi dapat tetap ada di pratinjau tertanam. File Anda tidak berubah.",
  exposeDngReadLimit:
    "Pembacaan DNG terbatas pada TIFF klasik dengan satu gambar utama LinearRaw bilangan bulat tanpa tanda. Laporan tidak mencakup semua field tertanam. Tata letak DNG lain tidak didukung.",
  exposePdfReadOnlyBody:
    "Expose membaca metadata PDF. Pembersihan tidak didukung pada versi ini. File Anda tidak berubah.",
  exposePdfReadLimit:
    "Pembacaan PDF mencakup properti PDF Info dan XMP. Laporan tidak mencakup semua field tertanam.",
  exposeMediaReadLimit:
    "Pembacaan video dan audio hanya mencakup tag kontainer. Data media tidak didekode.",
  exposeFactGroups: "Sepuluh Grup Metadata. Metadata Tampilan tetap.",
  exposeFactLocal:
    "File dan metadatanya tidak pernah meninggalkan perangkat ini.",
  exposeChooseFolder: "Pilih folder",
  exposeWatchStart: "Pantau folder",
  exposeWatchStop: "Berhenti memantau",
  exposeWatchDenied:
    "Izin memantau folder ditolak. Jatuhkan file sebagai gantinya.",
  exposeWatchRevoked: "Akses folder terhenti. Jatuhkan file sebagai gantinya.",
  exposeWatchUnsupported:
    "Pemantauan folder tersedia di Chrome dan Edge. Jatuhkan file sebagai gantinya.",
  exposeWatchActive: "Memantau file baru. Pilih Bersihkan saat Anda siap.",
  exposeBatchTitle: "Batch",
  exposeBatchCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} file", other: "{?} file" } },
  }),
  exposeBatchLargeTitle: "Batch ini lebih dari 1 GB",
  exposeBatchLargeBody:
    "Perangkat menentukan ukuran Batch yang sebenarnya. Setiap file di atas 200 MB dapat memerlukan lebih banyak memori. Lanjutkan membaca file ini, atau batalkan penambahan.",
  exposeCleanAll: "Bersihkan semua",
  exposeDownloadAll: "Unduh semua sebagai ZIP",
  exposeClear: "Kosongkan semua",
  exposeClearTitle: "Kosongkan Batch?",
  exposeClearBody:
    "Ini menghapus Batch dan File Bersih dari sesi ini. File masukan tidak diubah.",
  exposeRemoveNamed: "Hapus {name}",
  exposeDownloadNamed: "Unduh {name}",
  exposeBackToBatch: "Kembali ke Batch",
  exposeBatchList: "File dalam Batch",
  exposeActions: "Aksi",
  exposeBatchProgress: "Membersihkan Batch",
  exposeBatchAnnouncement: "Pembersihan Batch: {percent:number}% selesai.",
  exposeBatchSummary: "{cleaned:number} dari {count:number} file Bersih.",
  exposeBatchCancelled:
    "Dibatalkan. File Bersih yang selesai tetap tersedia. Gambar yang belum selesai kembali Siap.",
  exposeZipBuilding: "Membuat ZIP…",
  exposeZipDone:
    "ZIP diunduh. {count:number} gambar tidak disertakan karena belum Bersih.",
  exposeZipFailed:
    "ZIP tidak dapat dibuat. Coba lagi, atau unduh setiap File Bersih.",
  exposeAiBadge: "AI",
  exposeRemaining: "{count:number} kolom tersisa",
  exposeStateReady: "Siap",
  exposeStateCleaning: "Membersihkan",
  exposeStateCleaned: "Bersih",
  exposeStateIncomplete: "Belum lengkap",
  exposeStateNotSupported: "Tidak didukung",
  exposeStateTooLarge: "Terlalu besar",
  exposeStateRejected: "Ditolak",
  exposeStateFailed: "Gagal",
  exposeStateStale: "Kedaluwarsa",
  exposeDrop: "Letakkan file atau folder di sini",
  exposeChooseFile: "Pilih file",
  exposeDropHint:
    "Gambar, DNG, PDF, MP4, MOV, M4V, WebM, MKV, AVI, M4A, MP3, WAV, FLAC, OGG/Opus, DOCX, XLSX, PPTX",
  exposeSampleCamera: "Buka contoh kamera",
  exposeSampleAi: "Buka contoh AI",
  exposeSampleCameraLine:
    "Contoh kamera: Andy Parsons / Adobe, CC BY-SA 4.0, melalui file uji publik C2PA. Manifest C2PA dibuat oleh Nikon Z 9 untuk Adobe MAX 2022.",
  exposeSampleAiLine:
    "Contoh AI: Adobe Firefly, melalui Content Authenticity Initiative (MIT). Manifest C2PA ditandatangani oleh Adobe Inc.",
  exposeReading: "Membaca metadata…",
  exposeReadingHint:
    "Pembacaan memerlukan mesin metadata. Mesin diunduh sekali (5,5 MB terkompresi), lalu bekerja luring selama tersimpan.",
  exposeReadErrorTitle: "Expose tidak bisa membaca file ini.",
  exposeReadErrorBody: "File mungkin rusak atau tidak lengkap. Coba file lain.",
  exposeUnsupportedTitle: "Format tidak didukung.",
  exposeUnsupportedBody:
    "Pilih gambar, DNG, PDF, video, audio, DOCX, XLSX, atau PPTX yang didukung. RAW lain dan Office lama tidak didukung.",
  exposeNoMetadataTitle: "Tidak ada metadata yang bisa dihapus.",
  exposeNoMetadataBody:
    "Expose hanya menemukan Metadata Tampilan. Itu tetap, karena mengatur tampilan gambar.",
  exposeTryAnother: "Pilih file lain",
  exposeLargeTitle: "File ini lebih dari 200 MB.",
  exposeLargeBody:
    "Perangkat anda bisa kehabisan memori. Expose tidak membatasi file; perangkat yang membatasi.",
  exposeLargeRead: "Tetap baca",
  exposeLargeCancel: "Pilih file lain",
  exposeTooLargeTitle: "File ini terlalu besar untuk perangkat ini.",
  exposeTooLargeBody: "Pembacaan kehabisan memori. File anda tidak berubah.",
  exposeReport: "Laporan",
  exposeRaw: "Raw",
  exposeReportTitle: "Laporan Metadata",
  exposeReportHint: "Setiap Grup Metadata, dengan jumlahnya.",
  exposeRawHint: "Setiap field, tanpa grup.",
  exposeFilter: "Filter field",
  exposeFilterEmpty: "Tidak ada field yang cocok dengan filter ini.",
  exposeField: "Field",
  exposeValue: "Nilai",
  exposeGroup: "Grup",
  exposeContainer: "Wadah",
  exposeCopy: "Salin",
  exposeCopied: "Tersalin",
  exposeFieldCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} field" } },
  }),
  exposeNoFields: "Tidak ada field di grup ini.",
  exposeShowFields: "Tampilkan field",
  exposeHideFields: "Sembunyikan field",
  exposeShowMore: "Tampilkan lebih",
  exposeShowLess: "Tampilkan kurang",
  exposeReportCounts:
    "{fields} field · {groups} grup · {removable} bisa dihapus",
  exposeDisplayLocked: "Tetap",
  exposeNotesTitle: "Catatan",
  exposeGroupsTitle: "Grup Metadata",
  exposeGroupAi: "Provenans AI",
  exposeGroupLocation: "Lokasi",
  exposeGroupTime: "Waktu",
  exposeGroupDevice: "Identitas perangkat",
  exposeGroupCamera: "Pengaturan kamera",
  exposeGroupAuthorship: "Kepengarangan",
  exposeGroupSoftware: "Perangkat lunak dan riwayat edit",
  exposeGroupThumbnails: "Thumbnail dan pratinjau",
  exposeGroupOther: "Teks lain",
  exposeGroupDisplay: "Tampilan",
  exposeGroupFormatLimit: "Format ini tidak bisa menghapus grup ini.",
  exposeGroupReadOnly: "Format ini tidak menampilkan grup ini.",
  exposeGroupFormatLimitMark: "Batas format",
  exposeGroupRemovable: "Bisa dihapus",
  exposeNoteMakerNote:
    "Maker Note ada. Itu bisa mengulang field kamera, waktu, dan pengaturan.",
  exposeNoteC2paUnparsed:
    "Manifest C2PA ada, tetapi detailnya tidak bisa dibaca.",
  exposeNoteJxlBrotli:
    "Metadata JPEG XL dikompresi dengan Brotli. Beberapa pembaca tidak bisa mendekodenya.",
  exposeNoteIccNotRead:
    "Profil ICC tidak bisa dibaca dalam format ini. Itu tetap tidak diubah.",
  exposeNoteTiffNoFileDetails:
    "Dimensi TIFF berasal dari tag gambarnya sendiri.",
  exposeExhibitTitle: "Barang bukti",
  exposeCaseFileTitle: "Berkas kasus",
  exposePreviewAlt: "Gambar yang anda buka, seperti yang digambar peramban.",
  exposePlateBody:
    "Peramban tidak bisa menampilkan gambar ini. Laporan tetap membacanya.",
  exposeFactDimensions: "Dimensi",
  exposeFactSize: "Ukuran",
  exposeFactFormat: "Format",
  exposeFactOrientation: "Orientasi",
  exposeFactFrames: "Frame",
  exposeFactNotReported: "Tidak dilaporkan",
  exposeGpsTitle: "Pencari Lokasi Offline",
  exposeGpsEmpty: "Tidak ada titik GPS di file ini.",
  exposeGpsLatitude: "Lintang",
  exposeGpsLongitude: "Bujur",
  exposeGpsAltitude: "Ketinggian",
  exposeGpsCopy: "Salin koordinat",
  exposeGpsMapAlt: "Garis dunia dengan satu pin di {latitude}, {longitude}.",
  exposeAiTitle: "Provenans AI",
  exposeAiNone: "Tidak ada Provenans AI.",
  exposeAiC2pa: "Manifest C2PA",
  exposeAiC2paPresent: "Ada · {size}",
  exposeAiC2paAbsent: "Tidak ada",
  exposeAiGenerator: "Generator klaim",
  exposeAiSigner: "Penandatangan yang diklaim",
  exposeAiActions: "Aksi",
  exposeAiSourceType: "Jenis sumber digital",
  exposeAiParameters: "Parameter generasi",
  exposeAiNotValidated:
    "Expose menunjukkan apa yang diklaim manifest. Expose tidak memvalidasi tanda tangan.",
  exposeAiSignal: "Sinyal AI lain",
  exposeDngPreview: "Pratinjau DNG",
  exposeThumbnailTitle: "Thumbnail",
  exposeThumbnailNone: "Tidak ada thumbnail.",
  exposeThumbnailSize: "{width} × {height}",
  exposeThumbnailWarning:
    "Pratinjau yang tertanam bisa menunjukkan gambar asli, bahkan setelah pembersihan.",
  exposeThumbnailAlt:
    "Pratinjau tertanam yang mungkin menunjukkan gambar asli.",
  exposeCleanTitle: "Perintah redaksi",
  exposePresetTitle: "Preset Pembersihan",
  exposePresetAi: "Hanya AI",
  exposePresetPersonal: "Pribadi",
  exposePresetEverything: "Semua",
  exposePresetCustom: "Kustom",
  exposePresetAiNote:
    "Hapus Provenans AI: Manifest C2PA, JUMBF, parameter generasi, dan tanda tangan alat AI. EXIF kamera, GPS, dan kepengarangan tetap.",
  exposePresetPersonalNote:
    "Hapus Lokasi, Waktu, Identitas perangkat, Kepengarangan, dan Thumbnail dan pratinjau. Pengaturan kamera tetap.",
  exposePresetEverythingNote:
    "Hapus setiap Grup Metadata yang bisa dihapus. Metadata Tampilan tetap.",
  exposePresetCustomNote:
    "Pilih Grup Metadata yang akan dihapus. Metadata Tampilan selalu tetap.",
  exposePresetAiUnavailable:
    "Hanya AI tidak tersedia untuk JPEG XL. Pembersih tidak bisa menghapus Manifest C2PA-nya.",
  exposePresetEverythingUnavailable:
    "Semua tidak tersedia untuk JPEG XL selama Manifest C2PA-nya ada. Gunakan Kustom tanpa Provenans AI.",
  exposeRemoveLine: defineTranslation(
    "Akan menghapus {fields:plural} dalam {groups:plural}",
    {
      plural: { fields: { other: "{?} field" }, groups: { other: "{?} grup" } },
    }
  ),
  exposeKeepLine: defineTranslation(
    "Akan menyimpan {fields:plural} dalam {groups:plural}",
    {
      plural: { fields: { other: "{?} field" }, groups: { other: "{?} grup" } },
    }
  ),
  exposeKeptDisplayLine: defineTranslation(
    "Display Metadata stays: {fields:plural}.",
    {
      plural: { fields: { other: "{?} field" } },
    }
  ),
  exposeDisplayLock: "Metadata Tampilan tetap",
  exposeDisplayLockWhy:
    "Profil ICC, orientasi, dan dimensi mengatur tampilan gambar. Menghapusnya bisa menggeser warna atau memutar gambar.",
  exposeEngineNote:
    "Mesin metadata diunduh pada pembacaan pertama, lalu bekerja luring selama tersimpan.",
  exposeClean: "Bersihkan",
  exposeCleanDirty: defineTranslation("Bersihkan · {fields:plural}", {
    plural: { fields: { other: "{?} field" } },
  }),
  exposeCleanDisabled: "Pilih grup yang berisi field.",
  exposeCleanNoFields: "Tidak ada metadata yang bisa dihapus.",
  exposeCleanNotSupportedTitle: "Pembersihan tidak didukung.",
  exposeCleanNotSupportedGroup:
    "Expose tidak bisa menghapus {group} dari file {format}. File anda tidak berubah. Gunakan Kustom tanpa {group}, atau unduh file asli.",
  exposeCleanNotSupportedFormat:
    "Expose tidak bisa membersihkan file {format} ini tanpa mengubah gambar. File anda tidak berubah.",
  exposeDownloadOriginal: "Unduh file asli",
  exposeEngineLoadingTitle: "Memuat mesin metadata",
  exposeEngineLoadingBody:
    "Mesin metadata diunduh sekali. Pembacaan dan pembersihan berikutnya bekerja luring selama tersimpan.",
  exposeEngineLoadingPercent: "{percent}%",
  exposePhaseCleaning: "Membersihkan",
  exposePhaseVerifying: "Memverifikasi",
  exposeEngineOfflineTitle: "Mesin metadata belum tersimpan.",
  exposeEngineOfflineBody:
    "Hubungkan sekali untuk memuat mesin, lalu baca dan bersihkan secara luring selama mesin tersimpan.",
  exposeEngineFailedTitle: "Mesin metadata gagal dimuat.",
  exposeEngineFailedBody:
    "File anda tidak berubah. Coba lagi, atau unduh file asli.",
  exposeRetry: "Coba lagi",
  exposeCancelledTitle: "Pembersihan dibatalkan.",
  exposeCancelledBody: "File anda tidak berubah.",
  exposeCleanErrorTitle: "Pembersihan gagal.",
  exposeCleanErrorBody:
    "File anda tidak berubah. Coba lagi, atau unduh file asli.",
  exposeCancel: "Batal",
  exposeVerificationTitle: "Verifikasi",
  exposeVerificationDeck: "Pembacaan kedua atas File Bersih.",
  exposeVerificationMarksLabel: "Apa arti tanda Verifikasi",
  exposeVerificationMarksCheck: "Baris lulus.",
  exposeVerificationMarksMinus:
    "Tidak ada yang perlu dilaporkan: baris hanya berisi jumlah atau fakta.",
  exposeVerificationMarksFail: "Baris gagal, dan tombol Unduh dinonaktifkan.",
  exposeVerificationSelectedZero: "0 field tersisa di grup yang dipilih.",
  exposeVerificationSelectedSome: defineTranslation(
    "{count:plural} remain in the selected groups.",
    {
      plural: { count: { other: "{?} field tersisa" } },
    }
  ),
  exposeVerificationKept: "Grup yang disimpan masih terbaca: {groups}.",
  exposeVerificationKeptNone: "Tidak ada grup lain yang disimpan.",
  exposeVerificationDisplay:
    "Metadata Tampilan tetap: profil ICC, orientasi, dan dimensi.",
  exposeVerificationPayloadSame: "Isi file tidak berubah.",
  exposeVerificationPayloadChanged: "Isi file berubah. Unduhan diblokir.",
  exposeVerificationC2paGone: "Manifest C2PA sudah hilang.",
  exposeVerificationC2paRemains: "Manifest C2PA masih ada.",
  exposeVerificationC2paNone: "Tidak ada Manifest C2PA.",
  exposeVerificationRemoved: defineTranslation(
    "Menghapus {fields:plural} dari {groups:plural}.",
    {
      plural: { fields: { other: "{?} field" }, groups: { other: "{?} grup" } },
    }
  ),
  exposeVerificationMakerNote:
    "Maker Note dihapus bersama field kamera, waktu, dan pengaturannya.",
  exposeVerificationFormatLimit:
    "Format ini menyimpan grup yang tidak bisa dihapusnya.",
  exposeVerificationCounts: defineTranslation(
    "{before:plural} · {after:plural}",
    {
      plural: {
        before: { other: "{?} field sebelumnya" },
        after: { other: "{?} field sesudahnya" },
      },
    }
  ),
  exposeVerificationSize:
    "Ukuran file {before} sebelumnya · {after} sesudahnya · {delta}.",
  exposeVerificationReRead: "Baca lagi",
  exposeDownload: "Unduh File Bersih",
  exposeDownloadLine: "Mengunduh {name}. File input tidak berubah.",
  exposeDownloadSize: "{size}",
  exposeCleanAgain: "Bersihkan gambar ini lagi",
  exposeCleanAnother: "Bersihkan gambar lain",
  exposeHonestyTitle: "Apa yang tidak bisa dilakukan Expose",
  exposeHonestyBody:
    "Expose hanya menghapus metadata. Expose tidak bisa menghapus Watermark Piksel seperti SynthID, dan tidak mendeteksi gambar hasil AI. Expose melaporkan Provenans AI dan tidak memvalidasi tanda tangan C2PA.",
  exposeExplainerTitleLead: "Apa itu",
  exposeExplainerTitleAccent: "Expose",
  exposeExplainerTitleBridge: "dan",
  exposeExplainerTitleTail: "mengapa penting",
  exposeExplainerLede:
    "Expose membaca metadata file, lalu menghapus kelompok metadata yang Anda pilih.",
  exposeExplainerIntro:
    "Saat ponsel atau kamera menyimpan foto, perangkat menyematkan metadata EXIF (Exchangeable Image File Format): model kamera, lensa, pengaturan eksposur, stempel waktu, dan yang paling penting koordinat GPS jika lokasi aktif. Beberapa jejaring sosial seperti Instagram, Facebook, X menghapusnya sebelum menampilkan. Banyak tempat tidak: lampiran email, iklan marketplace, forum, tautan berbagi penyimpanan awan, transfer file langsung, foto cetak yang dipindai kembali. Expose menampilkan setiap tag di gambar Anda dan, dalam satu klik, memberi Anda salinan bersih dengan semuanya dihapus.",
  exposeCompareHeading: "Perbandingan Expose",
  exposeCompareCaption:
    "Expose dibandingkan dengan Jimpl, Metadata2Go, dan Image Scrubber.",
  exposeCompareFeature: "Fitur",
  exposeCompareChecked: "Batas diperiksa pada 23 Oktober 2026. Sumber:",
  exposeColJimpl: "Jimpl",
  exposeColMetadata2go: "Metadata2Go",
  exposeColImageScrubber: "Image Scrubber",
  exposeColExpose: "Expose",
  exposeRowBrowser: "Berjalan di peramban",
  exposeRowProcessing: "Pemrosesan",
  exposeRowUpload: "Gambar diunggah ke server?",
  exposeRowReport: "Laporan metadata",
  exposeRowChoose: "Pilih yang dihapus",
  exposeRowVerify: "Memeriksa hasil bersih",
  exposeRowFormats: "Format",
  exposeRowPixels: "Mempertahankan piksel",
  exposeRowInput: "Batas input",
  exposeRowBulk: "Massal",
  exposeRowCost: "Biaya",
  exposeValueYes: "Ya",
  exposeValueNo: "Tidak",
  exposeValueServerSide: "Sisi server",
  exposeValueClientSide: "Sisi klien",
  exposeValueExifGpsIcc: "EXIF + GPS + ICC",
  exposeValueFieldReport: "Laporan field",
  exposeValueRemovedFields: "Field yang dihapus",
  exposeValueGroupsGpsAi: "Grup + GPS + Provenans AI",
  exposeValuePerField: "Per field",
  exposeValuePresets: "Preset atau grup",
  exposeValueManualUpload: "Unggah ulang manual",
  exposeValueNoReread: "Tanpa baca ulang",
  exposeValueAutoReread: "Baca ulang otomatis",
  exposeValueAnyFileType: "Semua tipe file",
  exposeValueCommonImageTypes: "Tipe gambar umum",
  exposeValueBrowserImages: "Gambar peramban",
  exposeValueEightFormats: "Enam keluarga file",
  exposeValue50Mb: "50 MB",
  exposeValue75Mb: "75 MB gratis",
  exposeValue2500Px: "2500 px",
  exposeValueDeviceMemory: "Memori perangkat",
  exposeValueFivePerJob: "5 per tugas gratis",
  exposeValueOneFile: "Satu file",
  exposeValueManyFiles: "Banyak file",
  exposeValueFreeOpenSource: "Gratis, sumber terbuka",
  exposeValueFreeWithAds: "Gratis, dengan iklan",
  exposeValueFreeToPaid: "Gratis → berbayar",
  exposeValueFreeNoAccount: "Gratis, tanpa akun",
  exposeCompareDisclaimer:
    "Jimpl, Metadata2Go, dan Image Scrubber adalah milik pemiliknya masing-masing. Expose independen dan tidak berafiliasi dengan mereka. Batas diambil dari halaman publik mereka dan bisa berubah.",
  exposeFaqHeading: "FAQ",
  exposeFaqExifQ: "Apa itu metadata EXIF?",
  exposeFaqExifA:
    "EXIF (Exchangeable Image File Format) adalah data yang tertanam di sebagian besar foto oleh kamera atau ponsel anda: model kamera, lensa, eksposur, stempel waktu, nomor seri perangkat, dan sering juga koordinat GPS. Itu satu wadah metadata; gambar juga bisa membawa XMP, IPTC, ICC, dan Manifest C2PA.",
  exposeFaqC2paQ: "Apa itu Manifest C2PA?",
  exposeFaqC2paA:
    "Manifest C2PA adalah catatan bertanda tangan tentang bagaimana file dibuat dan diubah. Expose menunjukkan keberadaan dan ukurannya. Expose tidak memvalidasi tanda tangan, dan tidak memutuskan apakah gambar dihasilkan AI.",
  exposeFaqRemoveQ: "Mengapa harus menghapusnya?",
  exposeFaqRemoveA:
    "Karena gambar yang diposting online membawa data ini kecuali platform menghapusnya. Titik GPS mengungkap lokasi, stempel waktu mengungkap kebiasaan, dan nomor seri perangkat bisa menghubungkan akun yang berbeda.",
  exposeFaqSocialQ: "Apakah media sosial menghapusnya?",
  exposeFaqSocialA:
    "Beberapa melakukannya, seperti Facebook, Instagram, dan X. Beberapa tidak, seperti email, iklan pasar, dan transfer file langsung. Jika anda berbagi di luar media sosial besar, hapus sendiri.",
  exposeFaqFormatsQ: "Format apa yang didukung?",
  exposeFaqFormatsA:
    "Expose membaca gambar, LinearRaw DNG terbatas, PDF, video, audio, dan DOCX/XLSX/PPTX. PDF, DNG, WebM, MKV, AVI, MP3, WAV, FLAC, dan OGG/Opus hanya dapat dibaca. Pembersihan MP4/MOV/M4V/M4A menghapus tag kontainer. Pembersihan Office menghapus properti dokumen.",
  exposeFaqGroupsQ: "Bisakah saya menyimpan sebagian field?",
  exposeFaqGroupsA:
    "Bisa. Pilih Preset Pembersihan, atau gunakan Kustom untuk memilih Grup Metadata. Metadata Tampilan selalu tetap, karena profil ICC, orientasi, dan dimensi mengatur tampilan gambar.",
  exposeFaqWatermarkQ: "Apa itu Watermark Piksel?",
  exposeFaqWatermarkA:
    "Tanda di piksel, seperti SynthID. Pembersihan hanya menghapus metadata, jadi tidak bisa menghapus Watermark Piksel. Expose melaporkan Provenans AI dan tidak memvalidasi tanda tangan C2PA.",
  exposeDisclaimerHeading: "Penafian",
  // #endregion EXPOSE
  // #region TABULAR
  tabularName: "Tabular",
  tabularTitle: "Tabular — penampil, penyunting, dan konverter file tabel",
  tabularDescription:
    "Lihat, sunting, dan konversi file CSV, XLS, XLSX, TSV, TAB, dan TXT berpemisah di perangkat Anda. Tanpa unggahan.",
  tabularPromise: "Lihat, sunting, dan konversi file tabel di perangkat Anda.",
  tabularSourceSafe: "File asli tidak pernah ditimpa.",
  tabularExplainerTitleLead: "Apa itu",
  tabularExplainerTitleAccent: "Tabular",
  tabularExplainerTitleBridge: "dan",
  tabularExplainerTitleTail: "mengapa penting",
  tabularExplainerLede:
    "Ubah hasil ekspor mentah menjadi tabel yang rapi dan laporan yang siap dibagikan.",
  tabularExplainerIntro:
    "Perbaiki nilai, hapus baris duplikat, dan gabungkan file CSV di tab yang sama. Sisipkan baris atau kolom sebelum atau sesudah yang lain, lalu urungkan atau ulangi suntingan. Bagi tabel menjadi file CSV yang lebih kecil, gunakan Diff untuk memeriksa perubahan, atau lihat data sebagai bagan. Unduh CSV, Excel, JSON, atau laporan PDF. File tetap di perangkat Anda. File asli tidak pernah ditimpa.",
  tabularCompareHeading: "Perbandingan Tabular",
  tabularCompareCaption:
    "Tabular dibandingkan dengan CSVtoSheets, CSV Viewer Online, dan CSV Viewer.",
  tabularCompareFeature: "Fitur",
  tabularCompareChecked:
    "Fitur dan batas diperiksa pada 28 Oktober 2026. Sumber:",
  tabularColCsvToSheets: "CSVtoSheets",
  tabularColCsvViewerOnline: "CSV Viewer Online",
  tabularColCsvViewer: "CSV Viewer",
  tabularColTabular: "Tabular",
  tabularRowBrowser: "Berjalan di peramban",
  tabularRowProcessing: "Pemrosesan",
  tabularRowUpload: "File diunggah ke server?",
  tabularRowFormats: "Format yang dibuka",
  tabularRowWorkbook: "Membuka semua Lembar",
  tabularRowEdit: "Sunting sel",
  tabularRowExport: "Format ekspor",
  tabularRowSearchSort: "Cari dan urutkan",
  tabularRowStructure: "Baris dan kolom",
  tabularRowHistory: "Urungkan dan ulangi",
  tabularRowClipboard: "Salin dan tempel",
  tabularRowKeyboard: "Pintasan keyboard",
  tabularRowSplit: "Pisahkan CSV",
  tabularRowMerge: "Gabungkan CSV",
  tabularRowDedupe: "Dedupe",
  tabularRowDiff: "Diff",
  tabularRowCharts: "Bagan",
  tabularRowPdf: "Laporan PDF",
  tabularValueNotListed: "Tidak tercantum",
  tabularValueSeparateTool: "Alat terpisah",
  tabularValue20kRows: "20.000 baris gratis; lebih banyak dengan Pro",
  tabularValuePasteCsv: "Tempel teks CSV",
  tabularValueCopyViewPasteCsv: "Salin tampilan; tempel teks CSV",
  tabularValuePasteShortcut: "Ctrl/Cmd+V untuk menempel teks CSV",
  tabularValueSearchSort: "Cari di semua kolom; urutkan berdasarkan kolom",
  tabularValueStructure: "Sisipkan sebelum atau sesudah; hapus baris dan kolom",
  tabularValueHistory:
    "Urungkan dan ulangi suntingan; kembalikan nilai asli sel",
  tabularValueClipboard: "Salin rentang sebagai TSV; tempel blok sel",
  tabularValueKeyboard:
    "Tombol panah, Enter, Tab, salin/tempel, urungkan/ulangi, dan / untuk mencari",
  tabularValueSplit:
    "Pilih baris per bagian; ulangi tajuk; unduh bagian sebagai ZIP",
  tabularValueMerge:
    "Cocokkan kolom berdasarkan tajuk; pilih urutan file; unduh satu CSV",
  tabularValueDedupe:
    "Periksa semua atau kolom pilihan; simpan baris pertama; urungkan penghapusan",
  tabularValueDiff:
    "Temukan baris yang ditambah, dihapus, dan diubah; unduh laporan CSV",
  tabularValueCharts:
    "Garis, batang, area, donat, dan sebar dari rentang atau Tampilan Saat Ini",
  tabularValuePdf:
    "Judul, tajuk berulang, dan nomor halaman; periksa perkiraan halaman",
  tabularRowInput: "Batas input",
  tabularRowCost: "Biaya",
  tabularValueYes: "Ya",
  tabularValueEditCells: "Sunting nilai dan ganti nama tajuk",
  tabularValueNo: "Tidak",
  tabularValueOptInSheets: "Tidak (Sheets opsional)",
  tabularValueClientSide: "Sisi klien",
  tabularValueCsvOnly: "CSV saja",
  tabularValueCsvTsvTxt: "CSV, TSV, TXT",
  tabularValueTableFiles: "CSV, XLS, XLSX, TSV, TAB, TXT",
  tabularValueReadOnly: "Hanya baca",
  tabularValueAllSheets: "Ya, semua Lembar",
  tabularValueCsvPdfSheets: "CSV, PDF, Sheets",
  tabularValueCsvJson: "CSV, JSON",
  tabularValueCsvXlsxJson: "CSV, XLSX, JSON",
  tabularValueTabularExport: "CSV, XLS, XLSX, JSON, TSV, TAB, PDF",
  tabularValue100Mb10k: "100 MB · 10.000 baris",
  tabularValueDeviceMemory: "Memori perangkat",
  tabularValue100kRows: "100.000 baris gratis",
  tabularValueFreeNoAccount: "Gratis, tanpa akun",
  tabularValueFreeToPro: "Gratis → Pro",
  tabularCompareDisclaimer:
    "CSVtoSheets, CSV Viewer Online, dan CSV Viewer adalah milik pemiliknya masing-masing. Tabular independen dan tidak berafiliasi dengan mereka. Fitur dan batas diambil dari halaman publik mereka dan bisa berubah.",
  tabularHonestyTitle: "Yang tidak dapat dilakukan Tabular",
  tabularHonestyBody:
    "Tabular hanya mengekspor nilai. Rumus, bagan, makro, sel gabungan, dan gaya buku kerja tidak dipertahankan. Hasil rumus tersimpan mungkin sudah usang. Nilai berformat tanggal tetap sebagai teks yang ditampilkan, tanpa konversi zona waktu.",
  tabularFaqHeading: "FAQ",
  tabularFaqFormatsQ: "Format apa yang dapat dibuka Tabular?",
  tabularFaqFormatsA:
    "CSV, XLS, XLSX, TSV, TAB, dan TXT berpemisah. Satu file sekaligus, dengan semua Lembar di buku kerja.",
  tabularFaqEditQ: "Dapatkah saya menyunting data?",
  tabularFaqEditA:
    "Ya. Sunting sel, tambah atau hapus baris dan kolom, ganti nama tajuk, lalu urungkan atau ulangi. Salin rentang sebagai TSV.",
  tabularFaqFormulasQ: "Apakah rumus dan format dipertahankan?",
  tabularFaqFormulasA:
    "Tidak. Ekspor hanya menyimpan nilai. Rumus, bagan, makro, sel gabungan, dan gaya buku kerja dihilangkan. Hasil rumus tersimpan mungkin sudah usang.",
  tabularFaqLimitQ: "Berapa batas ukuran file?",
  tabularFaqLimitA:
    "Tidak ada batas tetap. Batasnya adalah memori perangkat Anda. File besar dapat menjadi lambat.",
  tabularFaqDatesQ: "Apakah tanggal dikonversi?",
  tabularFaqDatesA:
    "Tidak. Nilai berformat tanggal disimpan sebagai teks yang ditampilkan. Tabular tidak menerapkan konversi zona waktu.",
  tabularDisclaimerHeading: "Penafian",
  tabularOpen: "Buka file",
  tabularDrop: "Letakkan file di sini",
  tabularFormats: "CSV, XLS, XLSX, TSV, TAB, dan TXT berpemisah",
  tabularChoose: "Pilih file",
  tabularOneFile: "Buka satu file setiap kali. Pilih file yang akan dibuka.",
  tabularSample: "Buka contoh",
  tabularSampleStock: "Daftar stok — teks dan nol di depan",
  tabularSampleWorkbook: "Buku kerja nilai — Lembar dan hasil tersimpan",
  tabularClose: "Tutup file",
  tabularFileSummary: "{name} · {bytes} · {sheets} Lembar",
  tabularSheet: "Lembar",
  tabularSheetMenu: "File dan Lembar",
  tabularSheetCurrent: "Lembar saat ini",
  tabularSheetRows: "{name} · {rows} baris",
  tabularHidden: "Tersembunyi",
  tabularVeryHidden: "Sangat tersembunyi",
  tabularSearch: "Cari di semua kolom",
  tabularSearchValues: "Cari nilai",
  tabularClearSearch: "Hapus pencarian",
  tabularMoreActions: "Tindakan lain",
  tabularRowCounts: "{matched} / {total} baris · {columns} kolom",
  tabularNoMatches: "Tidak ada baris yang cocok dengan pencarian ini.",
  tabularEmptySheet: "Lembar ini kosong. Tambahkan kolom, lalu baris.",
  tabularEmptyRows: "Tidak ada baris data. Tambahkan baris untuk memulai.",
  tabularDelimiter: "Pemisah",
  tabularComma: "Koma",
  tabularSemicolon: "Titik koma",
  tabularPipe: "Garis tegak",
  tabularAuto: "Deteksi otomatis",
  tabularAmbiguous:
    "Hasil deteksi belum pasti. Periksa nilainya sebelum mengekspor.",
  tabularBlankHeader: "Tajuk kosong · kolom {column}",
  tabularNewline: "Akhir baris",
  tabularMixedNewlines: "Akhir baris campuran",
  tabularBom: "BOM UTF-8",
  tabularBomDetected: "BOM terdeteksi",
  tabularNoBom: "Tanpa BOM",
  tabularUseSource: "Gunakan aturan teks sumber",
  tabularApply: "Terapkan",
  tabularCancel: "Batal",
  tabularRetry: "Coba lagi",
  tabularChooseAnother: "Pilih file lain",
  tabularDetails: "Tampilkan rincian",
  tabularGridLabel: "{sheet} · Penyunting Lembar",
  tabularCellLabel: "Baris {row}, kolom {column}: {value}",
  tabularBlankValue: "Kosong",
  tabularEdited: "Disunting",
  tabularEditedCount: "Sel disunting: {count}",
  tabularHeaderCount: "Tajuk diubah: {count}",
  tabularStructureCount: "Suntingan struktur: {count}",
  tabularEditCell: "Sunting sel",
  tabularEditAddress: "Sunting {address}",
  tabularCellText: "Teks sel",
  tabularMultiline: "Perluas penyunting",
  tabularMultilineHint:
    "Enter menambahkan baris baru. Terapkan mencatat satu Suntingan.",
  tabularInlineHint:
    "Enter atau Tab menerapkan. Escape membatalkan. Alt+Enter menambahkan baris baru.",
  tabularUndo: "Urungkan",
  tabularRedo: "Ulangi",
  tabularNothingUndo: "Tidak ada Suntingan untuk diurungkan",
  tabularNothingRedo: "Tidak ada Suntingan untuk diulangi",
  tabularHistoryDone: "{operation} di {sheet}.",
  tabularCommitDone: "Sel diperbarui.",
  tabularRowNoMatch: "Baris yang disunting tidak lagi cocok dengan pencarian.",
  tabularAddRow: "Tambah baris di akhir",
  tabularAddColumn: "Tambah kolom",
  tabularInsertRowBefore: "Sisipkan baris sebelum",
  tabularInsertRowAfter: "Sisipkan baris sesudah",
  tabularInsertColumnBefore: "Sisipkan kolom sebelum",
  tabularInsertColumnAfter: "Sisipkan kolom sesudah",
  tabularDeleteRows: "Hapus baris terpilih",
  tabularDeleteColumns: "Hapus kolom terpilih",
  tabularDeleteRow: "Hapus baris",
  tabularDeleteColumn: "Hapus kolom",
  tabularRenameHeader: "Ganti nama tajuk",
  tabularSortAscending: "Urutkan naik",
  tabularSortDescending: "Urutkan turun",
  tabularClearSort: "Atur ulang urutan",
  tabularSorted: "{column} · {direction}",
  tabularSheetOrder: "Urutan Lembar",
  tabularPasteText: "Tempel teks",
  tabularPasteBounds:
    "Rentang tempelan tidak muat. Tambahkan baris atau kolom, lalu tempel lagi.",
  tabularPasteInvalid:
    "Teks tempelan memiliki kutipan atau baris tidak valid. Tidak ada sel yang berubah.",
  tabularPasteMismatch:
    "Blok tempelan tidak cocok dengan rentang terpilih. Pilih satu sel atau samakan ukuran rentang.",
  tabularRevertCell: "Pulihkan sel",
  tabularRevertHeader: "Pulihkan tajuk",
  tabularRevertAll: "Pulihkan semua",
  tabularUnresolved: "Nilai belum terselesaikan",
  tabularMissingResult:
    "Rumus ini tidak memiliki hasil tersimpan. Ganti nilainya atau keluarkan dari Cakupan Ekspor.",
  tabularFormulaError: "Hasil rumus tersimpan adalah kesalahan: {error}.",
  tabularCellError: "Sel sumber berisi kesalahan: {error}.",
  tabularUnsupportedValue:
    "Nilai sel ini tidak dapat ditampilkan. Ganti sebelum ekspor.",
  tabularNextUnresolved: "Ke nilai belum terselesaikan berikutnya",
  tabularValuesOnly:
    "Hanya nilai. Ekspor tidak menyertakan rumus, bagan, makro, sel gabungan, dan gaya buku kerja.",
  tabularStaleResults:
    "Hasil rumus adalah nilai tersimpan dan mungkin sudah usang. Tabular tidak menghitung ulang hasil tersebut.",
  tabularDateText:
    "Nilai berformat tanggal disimpan sebagai teks tampilan. Tidak ada konversi zona waktu.",
  tabularMerged:
    "Sel gabungan dibaca sebagai nilai utama dan sel kosong. Gabungan tidak diekspor.",
  tabularHiddenData:
    "Lembar, baris, dan kolom tersembunyi disertakan. Periksa Cakupan Ekspor.",
  tabularIgnoredFeatures:
    "Fitur buku kerja di luar nilai sel tidak dipertahankan.",
  tabularRagged:
    "Baris dengan bidang lebih sedikit dilengkapi teks kosong. Baris terdampak: {count}.",
  tabularPrecision:
    "Ketelitian angka yang sudah hilang di sumber tidak dapat dipulihkan.",
  tabularAllHiddenOutput:
    "Lembar keluaran pertama akan terlihat agar buku kerja dapat dibuka.",
  tabularExport: "Ekspor",
  tabularExportTitle: "Ekspor",
  tabularScope: "Cakupan Ekspor",
  tabularCurrentView: "Tampilan Saat Ini",
  tabularWholeSheet: "Seluruh Lembar",
  tabularWholeWorkbook: "Seluruh Buku Kerja",
  tabularSheetHint:
    "Semua baris dalam urutan Lembar. Pencarian dan pengurutan diabaikan.",
  tabularWorkbookHint:
    "Semua Lembar, termasuk Lembar tersembunyi, dalam urutan Lembar. Pencarian dan pengurutan diabaikan.",
  tabularFormat: "Format keluaran",
  tabularPdfReportHint:
    "PDF adalah laporan. CSV, XLSX, dan JSON menyimpan nilai persis.",
  tabularPageSize: "Ukuran halaman",
  tabularA4: "A4",
  tabularLetter: "Letter",
  tabularOrientation: "Orientasi",
  tabularPortrait: "Potret",
  tabularLandscape: "Lanskap",
  tabularPdfEstimate: "Sekitar {pages} halaman.",
  tabularPdfLarge:
    "PDF ini lebih dari 500 halaman. Periksa Cakupan Ekspor atau gunakan lanskap.",
  tabularPdfUnsupported:
    "{count} karakter tidak dapat ditampilkan di PDF. Karakter diganti dengan ?. Gunakan CSV atau XLSX untuk menyimpan teks persis.",
  tabularPdfUntagged:
    "PDF ini tidak bertag. Untuk pembaca layar, gunakan CSV atau XLSX.",
  tabularPdfDownloadReady: "PDF siap: {pages} halaman, {rows} baris data.",
  tabularJsonObjects: "Objek JSON",
  tabularJsonArrays: "Larik JSON",
  tabularJsonUnique: "Tajuk unik dan tidak kosong menjadi kunci objek.",
  tabularJsonDuplicate:
    "Larik JSON mempertahankan tajuk duplikat dan setiap kolom. Baris tajuk disertakan.",
  tabularJsonBlank:
    "Larik JSON mempertahankan tajuk kosong dan setiap kolom. Baris tajuk disertakan.",
  tabularJsonNoHeader: "Tajuk nonaktif. Larik JSON hanya berisi baris data.",
  tabularSafeText: "Teks aman untuk aplikasi spreadsheet",
  tabularSafeCount:
    "Sel keluaran diubah: {count}. Lembar yang terbuka tidak berubah.",
  tabularExact: "Nilai persis",
  tabularExactHint:
    "Ekspor nilai asli. Aplikasi spreadsheet dapat menafsirkan teks yang menyerupai rumus.",
  tabularBeforeAfter: "Sebelum: {before}. Sesudah: {after}.",
  tabularUnresolvedExport:
    "Selesaikan atau keluarkan {count} nilai dalam Cakupan Ekspor ini sebelum mengekspor.",
  tabularFormatLimit:
    "{sheet} melampaui batas {dimension} {format}: {actual} / {limit}. Tidak ada data yang dipotong. Pilih format atau cakupan lain.",
  tabularCreateDownload: "Buat unduhan",
  tabularDownload: "Unduh {format}",
  tabularDownloadReady: "Unduhan siap: {sheets} Lembar, {rows} baris data.",
  tabularDownloadHint:
    "Sesi Anda tetap sementara. Simpan file unduhan sebelum meninggalkan halaman.",
  tabularExportAgain: "Ekspor lagi",
  tabularCopy: "Salin",
  tabularCopied: "{rows} baris disalin.",
  tabularLoadingEngine: "Memuat mesin tabel…",
  tabularDetecting: "Mendeteksi pengaturan file…",
  tabularReading: "Membaca File Tabel…",
  tabularUpdatingView: "Memperbarui Tampilan Saat Ini…",
  tabularApplyingEdit: "Menerapkan Suntingan…",
  tabularCheckExport: "Periksa ekspor",
  tabularPlanningExport: "Memeriksa cakupan dan nilai ekspor…",
  tabularWriting: "Membuat file keluaran…",
  tabularVerifying: "Memeriksa file keluaran…",
  tabularProgress: "{completed} / {total} {unit}",
  tabularCancelled: "Dibatalkan. Sesi valid terakhir Anda tidak berubah.",
  tabularDiscardTitle: "Buang perubahan?",
  tabularDiscardBody:
    "Sel disunting: {cells}. Tajuk diubah: {headers}. Suntingan struktur: {structure}. Unduh hasil kerja sebelum melanjutkan.",
  tabularKeepWorking: "Lanjutkan menyunting",
  tabularDiscardContinue: "Buang dan lanjutkan",
  tabularEngineOfflineHint:
    "File mesin diunduh saat pertama digunakan. Setelah itu, mesin bekerja luring selama tetap tersimpan di cache. File Anda tidak pernah diunggah.",
  tabularLocalHeading: "File Anda tetap di sini.",
  tabularLocalBody:
    "Tabular membaca dan menyunting di tab ini. Tanpa akun, unggahan, atau penyimpanan server.",
  tabularValuesHeading: "Periksa nilai sebelum membagikan.",
  tabularValuesBody:
    "Hasil rumus tersimpan mungkin sudah usang. Ekspor mempertahankan nilai, bukan fitur buku kerja asli.",
  tabularUnsupportedFormat:
    "Format file ini tidak didukung. Pilih CSV, XLS, XLSX, TSV, TAB, atau TXT berpemisah.",
  tabularEncryptedFile:
    "File ini dienkripsi atau dilindungi kata sandi. Simpan salinan tanpa enkripsi di perangkat Anda, lalu buka.",
  tabularCorruptFile:
    "File tidak dapat dibaca secara lengkap. Periksa file sumber atau pilih file lain.",
  tabularInvalidEncoding:
    "File tidak dapat dibaca dengan pengodean {encoding}. Pilih file lain.",
  tabularInvalidDelimitedText:
    "Teks tidak valid pada rekaman {record}, kolom {column}. Periksa kutipan atau pemisah.",
  tabularInvalidRequest:
    "Tindakan ini tidak dapat diterapkan. Perbarui Tampilan dan coba lagi.",
  tabularMissingIdentity:
    "Sel atau struktur ini sudah tidak ada. Perbarui Tampilan.",
  tabularStaleSession:
    "Hasil ini berasal dari sesi sebelumnya. Hasil tidak diterapkan.",
  tabularRevisionConflict:
    "File berubah sebelum tindakan ini selesai. Periksa Tampilan terbaru dan coba lagi.",
  tabularStaleView: "Tampilan berubah. Pilih rentang lagi sebelum melanjutkan.",
  tabularStaleExportPlan: "Data berubah. Periksa kembali jumlah ekspor.",
  tabularMemoryLimit:
    "Perangkat ini tidak dapat menyelesaikan operasi dengan memori yang tersedia. Unduh hasil kerja saat ini jika tersedia, atau coba file yang lebih kecil.",
  tabularWorkerLost:
    "Mesin berhenti dan sesi dalam memori ini tidak dapat dipulihkan. Buka kembali sumber atau unduhan terakhir Anda.",
  tabularEngineOffline:
    "Mesin tabel belum tersimpan di cache perangkat ini. Sambungkan ke internet untuk memuatnya, lalu coba lagi.",
  tabularEngineFailed:
    "Mesin tabel tidak dapat dimulai atau diselesaikan. Coba lagi, atau pilih file lain.",
  tabularExportVerificationFailed:
    "Pemeriksaan keluaran gagal. Tidak ada unduhan yang dibuat. Pertahankan sesi dan coba format lain.",
  tabularClipboardDenied:
    "Browser tidak mengizinkan akses papan klip. Pilih teks atau unduh TSV.",
  tabularCopyDenied: "Browser tidak mengizinkan akses papan klip. Coba lagi.",
  tabularSelectText: "Pilih teks",
  tabularDownloadTsv: "Unduh TSV",
  tabularFactInput: "CSV, Excel, dan teks berpemisah masuk.",
  tabularFactOutput: "File tabel, JSON, dan papan klip keluar.",
  tabularFactLocal: "Satu file. Semua Lembar. Di perangkat ini.",
  tabularRows: "Baris",
  tabularColumns: "Kolom",
  tabularGridHint:
    "Tombol panah memindahkan sel. Shift + panah memilih rentang; di layar sentuh, tahan sel lalu seret. Ctrl/Cmd + panah melompat ke tepi lembar. Ctrl/Cmd + C menyalinnya. Enter atau Spasi menyunting sel. Ketik untuk menggantinya. Shift + Enter menambah baris. Alt + Backspace memulihkan sel aktif.",
  tabularShortcuts: "Pintasan keyboard",
  tabularShortcutKeysMove: "↑ ↓ ← →",
  tabularShortcutKeysRange: "Shift + panah",
  tabularShortcutKeysEdge: "Ctrl/Cmd + panah",
  tabularShortcutKeysCopy: "Ctrl/Cmd + C",
  tabularShortcutKeysEdit: "Enter atau Spasi",
  tabularShortcutKeysReplace: "Ketik",
  tabularShortcutKeysNewline: "Shift + Enter",
  tabularShortcutKeysRevert: "Alt + Backspace",
  tabularShortcutMove: "Pindah sel",
  tabularShortcutRange: "Pilih rentang",
  tabularShortcutEdge: "Ke tepi lembar",
  tabularShortcutCopy: "Salin",
  tabularShortcutEdit: "Sunting sel",
  tabularShortcutReplace: "Ganti nilai",
  tabularShortcutNewline: "Tambah baris",
  tabularShortcutRevert: "Pulihkan sel",
  tabularShortcutTouch:
    "Di layar sentuh, tahan sel lalu seret untuk memilih rentang.",
  tabularOutputBlocked:
    "Keluaran ini tidak dapat dibuat. Ubah format atau cakupan, atau selesaikan nilai yang tercantum.",
  tabularSelectScope: "Pilih Cakupan Ekspor",
  tabularSessionFacts: "{size} · {sheets} Lembar",
  tabularStoredCount:
    "Hasil rumus tersimpan: {count}. Nilai belum terselesaikan: {unresolved}.",
  tabularSelectionReady: "Rentang dipilih.",
  tabularCopyReady: "Teks siap. Salin dengan tombol berikutnya.",
  tabularClearFile: "Tutup file",
  tabularWidthHint:
    "Lebar kolom adalah pengaturan tampilan. File Anda tidak berubah.",
  tabularWarnings: "Catatan file",
  tabularSourceDialect: "{encoding} · {delimiter} · {newline}",
  tabularLf: "LF",
  tabularCrlf: "CRLF",
  tabularUnitBytes: "byte",
  tabularUnitRows: "baris",
  tabularUnitCells: "sel",
  tabularUnitSheets: "Lembar",
  tabularDimensionRows: "baris",
  tabularDimensionColumns: "kolom",
  tabularDimensionText: "teks sel",
  tabularDimensionName: "nama Lembar",
  tabularChart: "Bagan",
  tabularTable: "Tabel",
  tabularChartType: "Jenis bagan",
  tabularChartLine: "Bagan garis",
  tabularChartBar: "Bagan batang",
  tabularChartArea: "Bagan area",
  tabularChartDonut: "Bagan donat",
  tabularChartScatter: "Bagan sebar",
  tabularChartSelection: "Pilihan",
  tabularChartCaption: "{sheet} · {rows} baris",
  tabularChartBarCaption:
    "{sheet} · {shown} dari {total} kategori (Pilih rentang yang lebih kecil untuk melihat sisanya)",
  tabularChartAria:
    "{type}. {scope} di {sheet}. {rows} baris. Kategori: {category}. Seri: {series}.",
  tabularChartRowNumber: "Nomor baris",
  tabularChartSeries: "Seri",
  tabularChartSeriesHint: "Pilih hingga lima kolom angka.",
  tabularChartSeriesCount: "{shown} dari {total} dipilih",
  tabularChartDecimalComma: "Koma desimal",
  tabularChartDecimalCommaHint:
    "Baca satu koma sebagai pemisah desimal. Pemisah ribuan tidak diterima.",
  tabularChartDataTable: "Data bagan",
  tabularChartSampled:
    "Menampilkan {shown} dari {total} baris. Bagan mempertahankan baris pertama dan terakhir.",
  tabularChartDonutCapped:
    "Menampilkan {shown} kategori teratas. {count} kategori lainnya dijumlahkan sebagai {other}.",
  tabularChartDonutSkipped:
    "{count} nilai nol atau negatif tidak ada dalam donat.",
  tabularChartGroupsCapped:
    "Menampilkan lima grup pertama. Pilih rentang yang lebih kecil untuk melihat sisanya.",
  tabularChartOther: "Lainnya",
  tabularChartOtherRest: "Lainnya (sisa)",
  tabularChartEmptyNoNumbers:
    "Cakupan ini tidak memiliki kolom angka. Pilih rentang dengan angka, atau aktifkan Koma desimal.",
  tabularChartEmptyNoRows: "Cakupan ini tidak memiliki baris data.",
  tabularChartEmptyDonutLabel:
    "Donat membutuhkan kolom label. Pilih kolom teks dan satu kolom angka.",
  tabularChartEmptyDonutSeries:
    "Donat membutuhkan tepat satu kolom angka. Pilih kolom label dan satu kolom angka.",
  tabularChartEmptyScatter:
    "Sebar membutuhkan tepat dua kolom angka. Pilih kedua kolom.",
  tabularChartReady: "{type}: {rows} baris, {series} seri.",
  tabularSplit: "Pisah",
  tabularSplitTitle: "Pemisah CSV",
  tabularSplitRowsPerPart: "Baris per bagian",
  tabularSplitFirstFile: "File pertama: {name}",
  tabularSplitLastFile: "File terakhir: {name}",
  tabularSplitNoHeaders: "Tajuk nonaktif. Bagian hanya berisi baris data.",
  tabularSplitDialect: "CSV · {delimiter} · {newline} · {bom}",
  tabularSplitInvalidRows:
    "Masukkan bilangan bulat baris. Nilai minimum adalah 1.",
  tabularSplitEmpty: "Lembar ini tidak punya baris data untuk dipisah.",
  tabularSplitNoColumns: "Lembar ini tidak punya kolom untuk dipisah.",
  tabularSplitBuilding: "Membuat ZIP…",
  tabularSplitZipFailed: "ZIP tidak dapat dibuat. Tidak ada file yang diunduh.",
  tabularSplitMany:
    "Pemisahan ini membuat {parts} file. ZIP dibuat di perangkat ini dan dapat memakan waktu.",
  tabularMerge: "Gabung",
  tabularMergeTitle: "Penggabung CSV",
  tabularMergeAdd: "Tambah file",
  tabularMergeAddOpen: "Tambah file yang terbuka",
  tabularMergeEmpty:
    "Tambahkan setidaknya satu file. ZIP hasil pisah juga bisa.",
  tabularMergeSourceFacts: defineTranslation(
    "{rows:plural} · {columns:plural}",
    {
      plural: {
        rows: { one: "{?} baris", other: "{?} baris" },
        columns: { one: "{?} kolom", other: "{?} kolom" },
      },
    }
  ),
  tabularMergeMatched: "{matched} cocok · {added} baru",
  tabularMergeMoveUp: "Naikkan {name}",
  tabularMergeMoveDown: "Turunkan {name}",
  tabularMergeRemove: "Hapus {name}",
  tabularMergeHeader: "Baris pertama adalah tajuk",
  tabularMergeHeaderHint:
    "Kolom dicocokkan berdasarkan teks tajuk. Tajuk ganda atau kosong beralih ke posisi.",
  tabularMergeNoHeader:
    "Tajuk nonaktif. File gabungan tidak punya baris tajuk, dan kolom disejajarkan berdasarkan posisi.",
  tabularMergePositional:
    "Tajuk berulang atau kosong. Kolom disejajarkan berdasarkan posisi.",
  tabularMergeColumns: "Urutan tajuk",
  tabularMergeMore: "+{count} lagi",
  tabularMergeBlank: "{count} sel kosong mengisi kolom yang tidak ada.",
  tabularMergeUnresolved:
    "{count} nilai tidak punya hasil. Penggabungan diblokir.",
  tabularMergeUnresolvedSource: "{name}: {count}",
  tabularMergeZipFailed:
    "ZIP tidak dapat dibaca. Tidak ada file yang ditambahkan.",
  tabularMergeZipEmpty:
    "ZIP tidak punya file CSV. Tidak ada file yang ditambahkan.",
  tabularMergeDuplicate: "File itu sudah ada di daftar.",
  tabularMergeDialect: "CSV · {delimiter} · {newline} · {bom}",
  tabularMergeName: "Nama file: {name}",
  tabularMergeReading: "Membaca file…",
  tabularMergePlanning: "Merencanakan penggabungan…",
  tabularMergeMerging: "Menggabungkan file…",
  tabularMergeZeroRows:
    "File gabungan punya baris tajuk dan tidak punya baris data.",
  tabularMergeNoColumns: "Tidak ada kolom untuk ditulis.",
  tabularDedupe: "Hapus duplikat",
  tabularDedupeTitle: "Hapus duplikat",
  tabularDedupeScope: "Bandingkan",
  tabularDedupeAllColumns: "Semua kolom",
  tabularDedupeChosenColumns: "Kolom terpilih",
  tabularDedupeColumns: "Kolom yang dibandingkan",
  tabularDedupeNoColumns: "Pilih minimal satu kolom.",
  tabularDedupeCounts: "Jumlah duplikat",
  tabularDedupeRows: "Baris data",
  tabularDedupeDuplicates: "Baris duplikat",
  tabularDedupeRemaining: "Baris yang disimpan",
  tabularDedupeMatch:
    "Nilai dianggap sama jika teks yang ditampilkan sama. Huruf besar-kecil dan spasi dihitung. Baris pertama dipertahankan.",
  tabularDedupeHeader: "Baris tajuk tidak pernah dihapus.",
  tabularDedupeCounting: "Menghitung baris duplikat…",
  tabularDedupeNone: "Tidak ada baris duplikat.",
  tabularDedupeEmpty:
    "Lembar ini tidak punya baris data untuk diperiksa duplikatnya.",
  tabularDedupeNoSheetColumns:
    "Lembar ini tidak punya kolom untuk diperiksa duplikatnya.",
  tabularDedupeRemove: defineTranslation("Hapus {count:plural}", {
    plural: { count: { one: "{?} baris", other: "{?} baris" } },
  }),
  tabularDiff: "Diff",
  tabularDiffTitle: "Diff",
  tabularDiffOpenFile: "File terbuka",
  tabularDiffComparedFile: "File pembanding",
  tabularDiffBefore: "Sebelum",
  tabularDiffAfter: "Sesudah",
  tabularDiffSwap: "Tukar Sebelum dan Sesudah",
  tabularDiffAdd: "Tambah file",
  tabularDiffReplace: "Ganti file",
  tabularDiffNoFile:
    "Tambahkan satu file untuk dibandingkan dengan lembar ini.",
  tabularDiffOpenHeaderOff:
    "Lembar ini tidak punya baris tajuk. Aktifkan baris tajuk, lalu buka Diff lagi.",
  tabularDiffNoHeader: "File pembanding tidak punya baris tajuk.",
  tabularDiffNoShared:
    "Kedua tabel tidak punya kolom yang sama. Periksa tajuknya.",
  tabularDiffKey: "Cocokkan baris dengan",
  tabularDiffKeyHint:
    "Pilih satu atau lebih kolom. Setiap nilai kunci harus tidak kosong, dan kunci harus unik di kedua tabel.",
  tabularDiffNoKey: "Pilih minimal satu kolom kunci.",
  tabularDiffMissingKey: "Kolom kunci ini tidak ada di kedua tabel: {columns}.",
  tabularDiffBlankKey: defineTranslation("{side}: {count:plural}", {
    plural: {
      count: {
        one: "{?} baris punya nilai kunci kosong",
        other: "{?} baris punya nilai kunci kosong",
      },
    },
  }),
  tabularDiffRepeatedKey: defineTranslation("{side}: {count:plural}", {
    plural: {
      count: {
        one: "{?} baris mengulang kunci",
        other: "{?} baris mengulang kunci",
      },
    },
  }),
  tabularDiffRepeatedKeys: "Kunci berulang: {keys}",
  tabularDiffKeyValid: "Kunci unik di kedua tabel.",
  tabularDiffOneSided: "Tidak dibandingkan, hanya di {side}: {columns}.",
  tabularDiffUnresolved: defineTranslation("{side}: {count:plural}", {
    plural: {
      count: {
        one: "{?} nilai tidak punya hasil. Diff diblokir.",
        other: "{?} nilai tidak punya hasil. Diff diblokir.",
      },
    },
  }),
  tabularDiffOnlyKeys:
    "Hanya kolom kunci yang sama. Diff hanya melaporkan baris yang ditambah dan dihapus.",
  tabularDiffCounts: "Jumlah diff",
  tabularDiffAdded: "Ditambah",
  tabularDiffRemoved: "Dihapus",
  tabularDiffChanged: "Berubah",
  tabularDiffUnchanged: "Sama",
  tabularDiffAll: "Semua",
  tabularDiffResults: "Baris diff",
  tabularDiffPlanning: "Membandingkan tabel…",
  tabularDiffReading: "Membaca file pembanding…",
  tabularDiffEmpty: "Tidak ada baris untuk ditampilkan.",
  tabularDiffNoChanges:
    "Tabel sama berdasarkan kunci yang dipilih. Tidak ada baris yang ditambah, dihapus, atau berubah.",
  tabularDiffPage: "Baris {from}–{to} dari {total}",
  tabularDiffPrevious: "Sebelumnya",
  tabularDiffNext: "Berikutnya",
  tabularDiffChangedFields: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} kolom berubah",
        other: "{?} kolom berubah",
      },
    },
  }),
  tabularDiffOtherMatch: "Nilai perbandingan lainnya sama.",
  tabularDiffBlank: "Kosong",
  tabularDiffExport: "Unduh CSV perbandingan",
  tabularDiffExporting: "Menulis CSV perbandingan…",
  tabularDiffColumn: "Kolom",
  tabularDiffHeaderBlank: defineTranslation("{side}: {count:plural}", {
    plural: {
      count: {
        one: "{?} sel tajuk kosong",
        other: "{?} sel tajuk kosong",
      },
    },
  }),
  tabularDiffHeaderDuplicate: "{side}: tajuk ini berulang: {columns}.",
  tabularDiffFacts: defineTranslation("{rows:plural} · {columns:plural}", {
    plural: {
      rows: { one: "{?} baris", other: "{?} baris" },
      columns: { one: "{?} kolom", other: "{?} kolom" },
    },
  }),
  // #endregion TABULAR
} as const satisfies LanguageMessages;
