import { defineTranslation } from "@/core/libs/i18n/define-translation";
import type { LanguageMessages } from "@/core/libs/i18n/init";

export default {
  // #region COMMON
  locale: "id-ID",
  backTo: "Kembali ke halaman {target}",
  errorMinLength: "{field} harus memiliki minimal {length} karakter",
  error: "{module} eror",
  theme: "Tema",
  system: "Sistem",
  light: "Terang",
  dark: "Gelap",
  add: "Tambah",
  update: "Ubah",
  remove: "Hapus",
  empty: "Data Kosong",
  unsavedChanges: "Buang perubahan yang belum disimpan - anda yakin?",
  noPageContent: "Tidak Ada Konten",
  attention: "Perhatian",
  language: "Bahasa",
  cancel: "Batal",
  continue: "Lanjutkan",
  reload: "Muat ulang",
  appReady: "Aplikasi siap digunakan secara offline",
  newContentAvailable:
    "Konten baru tersedia, klik tombol muat ulang untuk memperbarui",
  newUpdateAvailable: "Versi baru tersedia",
  downloadAndInstallUpdate: "Unduh dan instal pembaruan",
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
  // #endregion TOOLS
  // #region SQUEEZE
  squeezeName: "Squeeze",
  squeezeTagline: "Kompres gambar ke ukuran file target, di perangkat anda.",
  squeezeIntro:
    "Letakkan satu folder gambar. Squeeze mencari kualitas terbaik yang masih masuk ukuran target anda, memakai codec yang sama dengan para profesional. File anda tidak pernah meninggalkan browser.",
  squeezeFactLocal: "Berjalan di perangkat anda",
  squeezeFactTarget: "Mencapai ukuran target",
  squeezeFactBulk: "Menangani satu Batch sekaligus",
  squeezeDropTitle: "Letakkan gambar di sini",
  squeezeDropHint:
    "atau pilih file. JPEG, PNG, WebP dan AVIF, termasuk folder.",
  squeezeChooseFiles: "Pilih file",
  squeezeMode: "Mode",
  squeezeModeTarget: "Ukuran target",
  squeezeModeQuality: "Kualitas",
  squeezeTargetSize: "Ukuran target",
  squeezeTargetUnit: "KB per gambar",
  squeezeQuality: "Kualitas",
  squeezeMaxDimension: "Dimensi maksimum",
  squeezeMaxDimensionOff: "Nonaktif",
  squeezeMaxDimensionUnit: "px, sisi terpanjang",
  squeezeClear: "Bersihkan",
  squeezeDownloadAll: "Unduh semua sebagai ZIP",
  squeezeSaved: defineTranslation("Hemat {percent:number}%", {}),
  squeezeSavedTotal: "Total hemat {amount}",
  squeezeImageCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} gambar di Batch" } },
  }),
  squeezeDoneCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} selesai" } },
  }),
  squeezeMissCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} tidak mencapai target" } },
  }),
  squeezeRejectedCount: defineTranslation("{count:plural}", {
    plural: { count: { other: "{?} tidak bisa dibaca" } },
  }),
  squeezeProgress: defineTranslation(
    "{done:number} dari {total:number} gambar selesai",
    {}
  ),
  squeezeStateCompressed: "Dikompres",
  squeezeStateUnderTarget: "Sudah cukup",
  squeezeStateMiss: "Target tidak tercapai",
  squeezeStateRejected: "Tidak didukung",
  squeezeWorking: "Bekerja",
  squeezeDownload: "Unduh",
  squeezeRemove: "Hapus",
  squeezeResized: "Ukurannya diubah",
  squeezeReducedColors: "Warna dikurangi",
  squeezeOverride: "Ukuran target untuk gambar ini",
  squeezeOverrideHint: "Kosong berarti memakai ukuran target Batch.",
  squeezeProblemUnsupported: "Squeeze tidak membaca jenis file ini.",
  squeezeProblemUnreadable: "Squeeze tidak bisa membaca gambar ini.",
  squeezeProblemCodecFailed: "Encoder gagal pada gambar ini.",
  squeezeNoCap:
    "Tanpa unggah, tanpa pendaftaran, tanpa batas. Kompresor lain harus membatasi Batch atau memungut biaya; Squeeze tidak bisa, karena pekerjaannya tidak pernah meninggalkan perangkat anda.",
  squeezeAlsoTried:
    "Kalau anda pernah memakai TinyPNG, Squoosh atau iLoveIMG, batasan merekalah yang membuat anda ke sini.",
  // #endregion SQUEEZE
} as const satisfies LanguageMessages;
