import { defineTranslation } from "@/core/libs/i18n/define-translation";
import type { LanguageMessages } from "@/core/libs/i18n/init";

export default {
  // #region COMMON
  locale: "en-US",
  backTo: "Back to {target} page",
  errorMinLength: "{field} must have at least {length} characters",
  error: "{module} error",
  toggleTheme: "Toggle theme",
  add: "Add",
  update: "Update",
  remove: "Remove",
  empty: "Empty",
  unsavedChanges: "You have unsaved changes - are you sure?",
  noPageContent: "No Content",
  attention: "Attention",
  language: "Language",
  cancel: "Cancel",
  continue: "Continue",
  reload: "Reload",
  appReady: "App is ready to use offline",
  newContentAvailable:
    "New content is available, click the reload button to update",
  newUpdateAvailable: "A new update is available",
  downloadAndInstallUpdate: "Download and install update",
  notFound: "Not Found",
  gone: "Sorry, we can't find the page you're looking for",
  welcome: "Welcome Back",
  // #endregion COMMON
  // #region HOME
  title: "Home",
  // #endregion HOME
  // #region TOOLS
  toolsTitle: "Tools",
  toolsIntro: "Small utilities that run entirely on your device.",
  toolsMore: "More tools are on the way.",
  homeLocalKicker: "Local only",
  homeLocalClaim: "No account. No upload. No server storage.",
  homeLocalLimit: "The only cap is your device.",
  homeToolLabel: defineTranslation("{count:plural}", {
    plural: { count: { one: "tool", other: "tools" } },
  }),
  homeOpenTool: "Open {tool}",
  homeFactFormats: "JPEG, PNG, WebP, AVIF, GIF, and BMP in.",
  homeFactOutputs: "JPEG, WebP, AVIF, or PNG out. Multi writes three at once.",
  homeFactModes:
    "One Target per image, one Batch budget, or one fixed quality.",
  homeNoteDevice:
    "The browser does the work. The files stay in this tab, and a reload clears the Batch.",
  // #endregion TOOLS
  // #region SQUEEZE
  squeezeName: "Squeeze",
  squeezeTagline: "Compress images to a target file size, on your device.",
  squeezeIntro:
    "Set the size you need, or one budget for the whole Batch. Squeeze searches the codec's quality ladder for the best result under your limit. No upload, no account, no cap.",
  squeezeFactLocal: "Runs on your device",
  squeezeFactTarget: "Hits your Target",
  squeezeFactBulk: "Takes the whole Batch",
  squeezeTicketTitle: "Job ticket",
  squeezeFilesHeading: "Files",
  squeezeSettingsHeading: "Settings",
  squeezeOutputFormat: "Output format",
  squeezeOutputJpeg: "JPEG",
  squeezeOutputWebp: "WebP",
  squeezeOutputAvif: "AVIF",
  squeezeOutputPng: "PNG",
  squeezeOutputKeep: "Keep",
  squeezeOutputMulti: "Multi",
  squeezeCodecJpeg: "MozJPEG · opens everywhere",
  squeezeCodecWebp: "Native · smaller than JPEG",
  squeezeCodecAvif: "WASM · smallest, slowest",
  squeezeCodecPng: "Lossless · a Target may reduce colors",
  squeezeCodecKeep: "The input format, unchanged",
  squeezeCodecMulti: "JPEG + WebP + AVIF · three files",
  squeezeCodecNotice:
    "Each codec loads on first use, then works offline. AVIF is 3.5 MiB.",
  squeezeSizeMode: "Size target",
  squeezeModePerImage: "Per image",
  squeezeModeBatchTotal: "Batch total",
  squeezeModeFixedQuality: "Fixed quality",
  squeezeModeNotePerImage:
    "One Target for every image. Override one row if it needs a different limit.",
  squeezeModeNoteBatchTotal:
    "One budget for the Batch. Each image gets an even share; unused bytes go to the images that miss.",
  squeezeModeNoteFixedQuality:
    "One quality for every image. No Target, no search.",
  squeezeTargetSize: "Target",
  squeezeTargetUnit: "KB per image",
  squeezeTargetHint: "10 KB to 10 MB.",
  squeezeBatchTotal: "Batch budget",
  squeezeBatchTotalUnit: "KB for the Batch",
  squeezeBudgetImagesLabel: "Images",
  squeezePerImageBudgetLabel: "Per image",
  squeezeBudgetNote: "Even split, then one redistribution pass.",
  squeezeQuality: "Quality",
  squeezeQualityHint: "10 to 95.",
  squeezeOptions: "Options",
  squeezeResize: "Resize larger images",
  squeezeMaxWidth: "Max width",
  squeezeMaxHeight: "Max height",
  squeezeResizeUnit: "px, fit inside both",
  squeezeResizeHint: "16 to 10000 px. Never upscales.",
  squeezePreserveExif: "Preserve EXIF",
  squeezePreserveFolders: "Preserve folder structure",
  squeezeExifNote:
    "JPEG output only. An image already under Target keeps its original file, metadata included.",
  squeezeExifMultiNote: "Applies to the JPEG file only.",
  squeezeFolderNote: "ZIP only. A dropped folder keeps its path.",
  squeezeReasonExifJpegOnly: "EXIF is kept for JPEG output only.",
  squeezeReasonNoJpegInput: "No JPEG output in this Batch.",
  squeezeReasonNoJpegSource: "No JPEG input in this Batch.",
  squeezeReasonNoFolders: "No folders in this Batch.",
  squeezeReasonPngLossless: "PNG has no quality setting. It stays lossless.",
  squeezeReasonTargetRange: "The Target must be between 10 KB and 10 MB.",
  squeezeReasonResizeRange: "Each size must be between 16 and 10000 px.",
  squeezeReasonQualityRange: "The quality must be between 10 and 95.",
  squeezeReasonMultiBatchTotal:
    "Multi writes three files per image. A Batch total counts one budget, not three files. Use Per image.",
  squeezeReasonShareTooSmall:
    "Under 10 KB per image. Raise the total or remove files.",
  squeezeActions: "Actions",
  squeezeCompressAll: "Compress all",
  squeezeCompressAllStale: defineTranslation("Compress all · {count:plural}", {
    plural: {
      count: { one: "{?} row out of date", other: "{?} rows out of date" },
    },
  }),
  squeezeCompressing: defineTranslation(
    "Stop · {done:number} of {total:number}",
    {}
  ),
  squeezeDownloadAll: "Download all as ZIP",
  squeezeClearAll: "Clear all",
  squeezeClearTitle: "Clear the Batch?",
  squeezeClearBody:
    "Every image and its result leaves this tab. Downloads already saved are not affected.",
  squeezeStaleHint: "Settings changed. Compress all again.",
  squeezeAllMiss:
    "Every row is over its Target. Raise the Target, resize, or try AVIF.",
  squeezeActionRaiseTarget: "Raise the Target",
  squeezeActionResize: "Resize",
  squeezeActionTryAvif: "Try AVIF",
  squeezeActionTryFormat: "Try another format",
  squeezeDropTitle: "Drop images or folders here.",
  squeezeDropHint:
    "JPEG, PNG, WebP, AVIF, GIF, BMP · GIF and BMP use the first frame · folders keep their paths.",
  squeezeChooseFiles: "Choose files",
  squeezeChooseFolder: "Choose folder",
  squeezeEmptyTitle: "No images yet.",
  squeezeEmptyHint: "Drop a Batch, or choose a folder.",
  squeezeBatchCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} image", other: "{?} images" } },
  }),
  squeezeUnderTargetSummary: defineTranslation(
    "{under:number} of {total:number} under Target",
    {}
  ),
  squeezeOverCount: defineTranslation("{count:number} over", {}),
  squeezeOverBudget: defineTranslation("Over budget by {amount}", {}),
  squeezeCodecOfflineAll: defineTranslation(
    "Connect once to load {format}.",
    {}
  ),
  squeezeWatchStart: "Watch folder",
  squeezeWatchStop: "Stop watching",
  squeezeWatchDenied: "Watch folder permission denied. Drop files instead.",
  squeezeWatchUnsupported:
    "Watch folder works in Chrome and Edge. Drop files instead.",
  squeezeDuplicateCount: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} was already in the Batch",
        other: "{?} were already in the Batch",
      },
    },
  }),
  squeezeSkippedCount: defineTranslation("{count:plural}", {
    plural: {
      count: { one: "{?} file skipped", other: "{?} files skipped" },
    },
  }),
  squeezeWatchedCount: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} new file · Compress all",
        other: "{?} new files · Compress all",
      },
    },
  }),
  squeezeZipLeftOut: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} row left out of the ZIP",
        other: "{?} rows left out of the ZIP",
      },
    },
  }),
  squeezeBatchTabNote: "The Batch lives in this tab. A reload clears it.",
  squeezeDeviceLimit:
    "No cap. Your device sets the limit: 2 to 4 images run at once, and a very large image can run out of memory.",
  squeezeColState: "State",
  squeezeColFile: "File",
  squeezeColIn: "In",
  squeezeColOut: "Out",
  squeezeColDelta: "Δ",
  squeezeColNotes: "Notes",
  squeezeStateDone: "Done",
  squeezeStateAlreadyFits: "Already fits",
  squeezeStateMiss: "Miss",
  squeezeStateBigger: "Bigger",
  squeezeStateRejected: "Rejected",
  squeezeStateQueued: "Queued",
  squeezeWorking: "Working",
  squeezeStale: "Stale",
  squeezeOverride: "Target for this image",
  squeezeOverrideHint: "Empty uses the Target.",
  squeezeNoteResized: "Resized {from} → {to}",
  squeezeNoteColorsReduced: "Colors reduced",
  squeezeNoteFlattened: "Flattened on white",
  squeezeNoteFirstFrame: "First frame",
  squeezeNoteExifKept: "EXIF kept",
  squeezeNoteBiggerThanInput: defineTranslation(
    "Bigger than input +{percent:number}%",
    {}
  ),
  squeezeNoteOriginalUsed: "Original used",
  squeezeNoteOutOfDate: "Out of date",
  squeezeNoteRaised: defineTranslation("Budget raised to {amount}", {}),
  squeezeNoteStillOver: defineTranslation(
    "Budget raised to {amount} · still over",
    {}
  ),
  squeezeNoteNoSmaller: "No smaller file; original kept.",
  squeezeSmallestStep: defineTranslation("Smallest attempt: {step}", {}),
  squeezeMissNote:
    "The smallest file is still over. Raise the Target, resize, or try another format.",
  squeezeBiggerNote:
    "The output is larger than the input. You asked for this format or size.",
  squeezeFileCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} file", other: "{?} files" } },
  }),
  squeezeWrittenCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} of 3 written", other: "{?} of 3 written" } },
  }),
  squeezeUnderTargetCount: defineTranslation("{count:plural}", {
    plural: {
      count: { one: "{?} of 3 under target", other: "{?} of 3 under target" },
    },
  }),
  squeezePartFailed: "Failed",
  squeezeDownload: "Download",
  squeezeDownloadMultiHint: "Download all three as a ZIP",
  squeezeRecompress: "Recompress",
  squeezeRemove: "Remove",
  squeezeProblemUnsupported: "Squeeze does not read this file type.",
  squeezeProblemUnreadable: "Squeeze cannot read this image.",
  squeezeProblemCodecFailed: "The encoder failed on this image.",
  squeezeProblemTooLarge: "Too large for this device. Try Resize.",
  squeezeProblemCodecOffline:
    "AVIF is not cached yet. Connect once, then it works offline.",
  squeezeAnnounceProgress: defineTranslation("Progress {percent:number}%", {}),
  squeezeWhyTitle: "Why a target beats a slider",
  squeezeWhyLead:
    "A quality slider guesses. A Target is the limit you already have: the upload cap, the inbox limit, the form's rule. Squeeze searches the quality ladder for the best rung under that limit, for every image in the Batch.",
  squeezeCaseSiteTitle: "A site with an upload cap.",
  squeezeCaseSiteBody:
    "A CMS or a product feed rejects a file over its cap. Set the cap once; every image lands under it.",
  squeezeCaseFormTitle: "A form with a strict limit.",
  squeezeCaseFormBody:
    "A visa, university, or government form sets a size per file. Squeeze fits each photo to that number.",
  squeezeCaseInboxTitle: "An inbox and a slide deck.",
  squeezeCaseInboxBody:
    "Mail and chat clients trim large attachments. A Target keeps the image intact and the message moving.",
  squeezeFaqHeading: "FAQ",
  squeezeFaqFreeQ: "Is Squeeze free?",
  squeezeFaqFreeA:
    "Yes. No account, no cap, no paid tier. The only cost is your device's memory and CPU.",
  squeezeFaqDeviceQ: "Do my images leave the device?",
  squeezeFaqDeviceA:
    "No. Squeeze reads and writes them in the browser. There is no upload endpoint.",
  squeezeFaqFormatsQ: "Which formats can I use?",
  squeezeFaqFormatsA:
    "Input: JPEG, PNG, WebP, AVIF, GIF, BMP. Output: JPEG, WebP, AVIF, PNG, the input format, or Multi (JPEG + WebP + AVIF). GIF and BMP use the first frame.",
  squeezeFaqPngQ: "Why did my PNG lose colors?",
  squeezeFaqPngA:
    "PNG has no quality setting. In a Target mode Squeeze can reduce the color count to reach the Target; the row says so. In Fixed quality it stays lossless.",
  squeezeFaqMissQ: "What is a Miss?",
  squeezeFaqMissA:
    "The smallest file Squeeze could make is still over the Target. The row keeps that file and shows the three ways out: raise the Target, resize, or try another format.",
  squeezeFaqOfflineQ: "Does it work offline?",
  squeezeFaqOfflineA:
    "After the page and a codec have loaded once, yes. Each codec loads on first use.",
  squeezeFaqAvifQ: "Why is AVIF slow?",
  squeezeFaqAvifA:
    "AVIF compresses harder and takes longer to encode. It is the smallest of the three web formats.",
  squeezeFaqCountQ: "How many images can I add?",
  squeezeFaqCountA:
    "No cap. Your device sets the limit: 2 to 4 images run at once, and a very large image can run out of memory.",
  squeezeFaqExifQ: "Is EXIF kept?",
  squeezeFaqExifA:
    "Only in JPEG output, when you turn it on. An image already under target keeps its original file, metadata included.",
  squeezeFaqGifQ: "What happens to an animated GIF?",
  squeezeFaqGifA:
    "Squeeze reads the first frame. The output is a still image; the animation is not kept.",
  squeezeFaqReloadQ: "Does a reload keep my Batch?",
  squeezeFaqReloadA: "No. The Batch lives in the tab. A reload clears it.",
  // #endregion SQUEEZE
} as const satisfies LanguageMessages;
