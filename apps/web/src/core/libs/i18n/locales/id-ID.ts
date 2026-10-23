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
  // #region EXPOSE
  exposeName: "Expose",
  exposePromise: "Baca metadata dalam gambar, lalu hapus grup yang anda pilih.",
  exposeDeck:
    "Setiap Metadata Field, titik GPS, Provenans AI, dan Pembersihan yang memberi tahu apa yang tersisa. File tidak pernah meninggalkan perangkat ini.",
  exposeLocal: "Berjalan di perangkat anda",
  exposeLocalNote: "Tanpa unggah, tanpa akun, tanpa penyimpanan server.",
  exposeOneFile: "Satu file per sesi.",
  exposeFormatLine:
    "JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, atau GIF.",
  exposeFactFormats:
    "Delapan format: JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, GIF.",
  exposeFactGroups: "Sepuluh Grup Metadata. Metadata Tampilan tetap.",
  exposeFactLocal:
    "File dan metadatanya tidak pernah meninggalkan perangkat ini.",
  exposeEmptyTitle: "Belum ada gambar.",
  exposeEmptyBody:
    "Letakkan satu gambar, atau buka Gambar Contoh. Expose membaca metadata sebelum mengubah apa pun.",
  exposeDrop: "Letakkan gambar di sini",
  exposeChooseFile: "Pilih file",
  exposeDropHint:
    "JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, atau GIF. Satu file.",
  exposeSampleCamera: "Buka contoh kamera",
  exposeSampleAi: "Buka contoh AI",
  exposeSampleNote:
    "Kedua Gambar Contoh disertakan dengan Expose dan bekerja offline.",
  exposeSampleBadge: "Gambar Contoh",
  exposeSampleAbout: "Tentang contoh",
  exposeSampleCameraLine:
    "Contoh kamera: Andy Parsons / Adobe, CC BY-SA 4.0, melalui file uji publik C2PA. Manifest C2PA dibuat oleh Nikon Z 9 untuk Adobe MAX 2022.",
  exposeSampleAiLine:
    "Contoh AI: Adobe Firefly, melalui Content Authenticity Initiative (MIT). Manifest C2PA ditandatangani oleh Adobe Inc.",
  exposeReading: "Membaca metadata…",
  exposeReadingHint: "File tetap di tab ini.",
  exposeReadErrorTitle: "Expose tidak bisa membaca file ini.",
  exposeReadErrorBody: "File mungkin rusak atau tidak lengkap. Coba file lain.",
  exposeUnsupportedTitle: "Format tidak didukung.",
  exposeUnsupportedBody:
    "Expose membaca gambar JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, dan GIF.",
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
  exposeNoteGifDetails:
    "GIF hanya menampilkan detail gambar. Expose tidak membaca EXIF, IPTC, XMP, atau ICC-nya.",
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
  exposeGpsNote: "Tanpa tile, tanpa geocoding balik. Titik berasal dari file.",
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
  exposeAiThumbnail: "Manifest membawa thumbnail sendiri.",
  exposeAiSignal: "Sinyal AI lain",
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
    "Will remove {fields:plural} in {groups:plural}",
    {
      plural: { fields: { other: "{?} field" }, groups: { other: "{?} grup" } },
    }
  ),
  exposeKeepLine: defineTranslation(
    "Will keep {fields:plural} in {groups:plural}",
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
  exposeEngineNote: "Pembersih diunduh sekali, lalu bekerja offline.",
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
  exposeEngineLoadingTitle: "Memuat pembersih",
  exposeEngineLoadingBody:
    "Pembersihan pertama mengunduh pembersih. Setelah itu bekerja offline.",
  exposeEngineLoadingPercent: "{percent}%",
  exposePhaseCleaning: "Membersihkan",
  exposePhaseVerifying: "Memverifikasi",
  exposeEngineOfflineTitle: "Pembersih belum tersimpan.",
  exposeEngineOfflineBody:
    "Sambungkan sekali untuk memuat pembersih. Penampil tetap bekerja offline.",
  exposeEngineFailedTitle: "Pembersih gagal dimuat.",
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
  exposeVerificationPayloadSame: "Payload gambar tidak berubah.",
  exposeVerificationPayloadChanged:
    "Payload gambar berubah. Jangan gunakan file ini.",
  exposeVerificationC2paGone: "Manifest C2PA sudah hilang.",
  exposeVerificationC2paRemains: "Manifest C2PA masih ada.",
  exposeVerificationC2paNone: "Tidak ada Manifest C2PA.",
  exposeVerificationRemoved: defineTranslation(
    "Removed {fields:plural} from {groups:plural}.",
    {
      plural: { fields: { other: "{?} field" }, groups: { other: "{?} grup" } },
    }
  ),
  exposeVerificationMakerNote:
    "Maker Note dihapus bersama field kamera, waktu, dan pengaturannya.",
  exposeVerificationFormatLimit:
    "Format ini menyimpan grup yang tidak bisa dihapusnya.",
  exposeVerificationCounts: defineTranslation(
    "{before:plural} sebelumnya · {after:plural}",
    {
      plural: {
        before: { other: "{?} field sebelumnya" },
        after: { other: "{?} field sesudahnya" },
      },
    }
  ),
  exposeVerificationReRead: "Baca lagi",
  exposeDownload: "Unduh File Bersih",
  exposeDownloadLine: "Mengunduh {name}. File input tidak berubah.",
  exposeDownloadSize: "{size}",
  exposeCleanAgain: "Bersihkan gambar ini lagi",
  exposeCleanAnother: "Bersihkan gambar lain",
  exposeHonestyTitle: "Apa yang tidak bisa dilakukan Expose",
  exposeHonestyBody:
    "Expose hanya menghapus metadata. Expose tidak bisa menghapus Watermark Piksel seperti SynthID, dan tidak mendeteksi gambar hasil AI. Expose melaporkan Provenans AI dan tidak memvalidasi tanda tangan C2PA.",
  exposeExplainerTitle: "Apa itu metadata, dan mengapa penting",
  exposeExplainerExifTitle: "EXIF adalah satu wadah",
  exposeExplainerExifBody:
    "EXIF menyimpan field kamera, waktu, dan GPS. Itu satu wadah metadata, bukan seluruh metadata. Gambar juga bisa membawa XMP, IPTC, ICC, dan Manifest C2PA.",
  exposeExplainerGpsTitle: "Titik GPS adalah alamat rumah",
  exposeExplainerGpsBody:
    "Foto yang diambil di rumah bisa membawa koordinat rumah itu. Pencari Lokasi Offline menunjukkan titiknya tanpa mengirimnya ke mana pun.",
  exposeExplainerC2paTitle: "Manifest C2PA mencatat asal-usul",
  exposeExplainerC2paBody:
    "Manifest C2PA adalah catatan bertanda tangan tentang bagaimana file dibuat dan diubah. Expose menunjukkan keberadaan dan ukurannya. Expose tidak memvalidasi tanda tangan, dan tidak memutuskan apakah gambar dihasilkan AI.",
  exposeExplainerWatermarkTitle: "Watermark Piksel tetap ada",
  exposeExplainerWatermarkBody:
    "Watermark Piksel adalah tanda di piksel, seperti SynthID. Menghapus metadata tidak menghapusnya. Tangkapan layar atau pengodean ulang bisa menghapus metadata, dan juga bisa menghapus watermark; Expose tidak melakukan keduanya.",
  exposeExplainerLocalTitle: "File tetap di sini",
  exposeExplainerLocalBody:
    "Expose membaca dan menulis di tab ini. Tidak ada endpoint unggah, tidak ada akun, dan tidak ada penyimpanan server.",
  // #endregion EXPOSE
} as const satisfies LanguageMessages;
