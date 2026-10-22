import { defineTranslation } from "@/core/libs/i18n/define-translation";
import type { LanguageMessages } from "@/core/libs/i18n/init";

export default {
  // #region COMMON
  locale: "id-ID",
  backTo: "Kembali ke halaman {target}",
  error: "{module} eror",
  toggleTheme: "Ubah tema",
  remove: "Hapus",
  empty: "Data Kosong",
  language: "Bahasa",
  cancel: "Batal",
  close: "Tutup",
  skipToContent: "Lompat ke konten",
  loading: "Memuat",
  errorTitle: "Ups!",
  errorMessage: "Terjadi kesalahan",
  errorRetry: "Coba lagi",
  errorCode: "4xx",
  reload: "Muat ulang",
  appReady: "Aplikasi siap digunakan secara offline",
  newContentAvailable:
    "Konten baru tersedia, klik tombol muat ulang untuk memperbarui",
  notFound: "Tidak Ditemukan",
  gone: "Maaf, kami tidak bisa menemukan halaman yang anda cari",
  welcome: "Selamat Datang Kembali",
  // #endregion COMMON
  // #region HOME
  title: "Beranda",
  // #endregion HOME
  // #region TOOLS
  toolsTitle: "Alat",
  toolsIntro: "Utilitas kecil yang berjalan sepenuhnya di perangkat anda.",
  toolsMore: "Alat lain sedang disiapkan.",
  toolsAll: "Semua alat",
  homeLocalKicker: "Hanya lokal",
  homeLocalClaim: "Tanpa akun. Tanpa unggah. Tanpa penyimpanan server.",
  homeLocalLimit: "Batasnya hanya perangkat anda.",
  homeToolLabel: defineTranslation("{count:plural}", {
    plural: { count: { one: "alat", other: "alat" } },
  }),
  homeOpenTool: "Buka {tool}",
  homeFactFormats: "JPEG, PNG, WebP, AVIF, GIF, dan BMP masuk.",
  homeFactOutputs:
    "JPEG, WebP, AVIF, atau PNG keluar. Multi menulis tiga sekaligus.",
  homeFactModes:
    "Satu Target per gambar, satu anggaran Batch, atau satu kualitas tetap.",
  homeNoteDevice:
    "Browser yang bekerja. File tetap di tab ini, dan muat ulang menghapus Batch.",
  // #endregion TOOLS
  // #region SQUEEZE
  squeezeName: "Squeeze",
  squeezeTagline:
    "Kompres seluruh batch gambar ke ukuran file target, di perangkat anda",
  squeezeIntro:
    "Tanpa unggah, tanpa akun, tanpa kuota. Gambar sangat besar bisa kehabisan memori. Batch hidup di tab ini. Muat ulang akan menghapusnya.",
  squeezeFactLocal: "Berjalan di perangkat anda",
  squeezeTicketTitle: "Tiket kerja",
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
  squeezeDropTitle: "Letakkan gambar atau folder di sini.",
  squeezeDropHint:
    "JPEG, PNG, WebP, AVIF, GIF, BMP · GIF dan BMP memakai frame pertama · folder membawa jalurnya.",
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
  squeezeAltTitleLead: "Alternatif",
  squeezeAltTitleAccent: "TinyPNG gratis",
  squeezeAltTitleTail: "untuk kompresi massal",
  squeezeAltLead:
    "Squeeze memampatkan seluruh Batch ke ukuran file target — sepenuhnya di browser anda. Tanpa unggah, tanpa pendaftaran, tanpa kuota bulanan.",
  squeezeAltBody:
    "Jika anda memakai TinyPNG, Compressor.io, atau iLoveIMG dan menabrak batas 20 file, batas 5 MB, atau paywall mereka, Squeeze memberi anda codec yang sama tanpa semua batasan itu. Gambar anda diproses dengan codec standar industri (MozJPEG, libavif, oxipng), dan tidak pernah meninggalkan perangkat anda.",
  squeezeCompareHeading: "Perbandingan Squeeze",
  squeezeCompareCaption:
    "Squeeze dibanding TinyPNG, Squoosh, dan Compressor.io.",
  squeezeCompareFeature: "Fitur",
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
  squeezeValueNoCap: "Tanpa kuota",
  squeezeValueClientSide: "Sisi klien",
  squeezeValueServerSide: "Sisi server",
  squeezeValueTinyBulk: "20 file / batch",
  squeezeValueSquooshBulk: "1 file saja",
  squeezeValueCompressorBulk: "10 file gratis",
  squeezeValueTargetYes: "Ya (per gambar)",
  squeezeValueTinyMax: "5 MB gratis",
  squeezeValueCompressorMax: "10 MB gratis",
  squeezeValueFree: "Gratis",
  squeezeValueTinyCost: "Gratis → API berbayar",
  squeezeValueCompressorCost: "Gratis → Premium",
  squeezeValueFreeAlways: "Gratis, selalu",
  squeezeDisclaimerHeading: "Penafian",
  squeezeDisclaimer:
    "TinyPNG®, TinyJPG®, dan Tinfify® adalah merek dagang Voormedia B.V. Squoosh adalah proyek Google Chrome Labs. Compressor.io adalah merek dagang dari pemiliknya. Squeeze adalah alat independen yang dibuat oleh Ritools dan tidak berafiliasi dengan, tidak didukung, atau disponsori oleh perusahaan mana pun dari mereka. Perbandingan fitur didasarkan pada kemampuan yang terdokumentasikan secara publik dan diberikan hanya untuk tujuan informatif.",
  squeezeFaqHeading: "FAQ",
  squeezeFaqFreeQ: "Apakah Squeeze gratis?",
  squeezeFaqFreeA:
    "Ya. Tanpa akun, tanpa kuota, tanpa paket berbayar. Satu-satunya biaya adalah memori dan CPU perangkat anda.",
  squeezeFaqDeviceQ: "Apakah gambar saya meninggalkan perangkat?",
  squeezeFaqDeviceA:
    "Tidak. Squeeze membaca dan menulisnya di browser. Tidak ada endpoint unggah.",
  squeezeFaqFormatsQ: "Format apa yang bisa saya pakai?",
  squeezeFaqFormatsA:
    "Input: JPEG, PNG, WebP, AVIF, GIF, BMP. Output: JPEG, WebP, AVIF, PNG, format input, atau Multi (JPEG + WebP + AVIF). GIF dan BMP memakai frame pertama.",
  squeezeFaqPngQ: "Mengapa PNG saya kehilangan warna?",
  squeezeFaqPngA:
    "PNG tidak punya pengaturan kualitas. Dalam mode Target, Squeeze bisa mengurangi jumlah warna untuk mencapai Target; barisnya menyebutkan itu. Dalam Fixed quality, PNG tetap lossless.",
  squeezeFaqMissQ: "Apa itu Miss?",
  squeezeFaqMissA:
    "File terkecil yang bisa dibuat Squeeze masih di atas Target. Baris itu menyimpan file tersebut dan menunjukkan tiga jalan keluar: naikkan Target, perkecil, atau coba format lain.",
  squeezeFaqOfflineQ: "Apakah bekerja offline?",
  squeezeFaqOfflineA:
    "Ya, setelah halaman dan sebuah codec dimuat sekali. Setiap codec dimuat saat pertama dipakai.",
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
  // #endregion SQUEEZE
} as const satisfies LanguageMessages;
