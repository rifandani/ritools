import { defineTranslation } from "@/core/libs/i18n/define-translation";
import type { LanguageMessages } from "@/core/libs/i18n/init";

export default {
  // #region COMMON
  locale: "en-US",
  backTo: "Back to {target} page",
  error: "{module} error",
  toggleTheme: "Toggle theme",
  remove: "Remove",
  empty: "Empty",
  language: "Language",
  cancel: "Cancel",
  close: "Close",
  skipToContent: "Skip to content",
  loading: "Loading",
  errorTitle: "Oops!",
  errorMessage: "Something went wrong",
  errorRetry: "Try again",
  errorCode: "4xx",
  reload: "Reload",
  appReady: "App is ready to use offline",
  newContentAvailable:
    "New content is available, click the reload button to update",
  notFound: "Not Found",
  gone: "Sorry, we can't find the page you're looking for",
  welcome: "Welcome Back",
  // #endregion COMMON
  // #region HOME
  title: "Home",
  // #endregion HOME
  // #region TOOLS
  homeTitle: "Free & Local",
  toolsTitle: "Tools",
  homeLocalClaim:
    "No account. No upload. No server storage. No paid-tier. No daily caps.",
  homeLocalLimit: "The only cap is your device.",
  homeOpenTool: "Open {tool}",
  homeFactFormats: "JPEG, PNG, WebP, AVIF, GIF, and BMP in.",
  homeFactOutputs: "JPEG, WebP, AVIF, or PNG out. Multi writes three at once.",
  homeFactModes:
    "One Target per image, one Batch budget, or one fixed quality.",
  homeFaqHeading: "FAQ",
  homeFaqLede: "The same rules hold for every tool.",
  homeFaqFreeQ: "Is Ritools free?",
  homeFaqFreeA:
    "Yes. No account, no cap, no paid tier. The only cost is your device's memory and CPU.",
  homeFaqLocalQ: "Do my files leave the device?",
  homeFaqLocalA:
    "No. Each tool reads and writes your files in this tab. There is no upload endpoint and no server storage.",
  homeFaqOfflineQ: "Does it work offline?",
  homeFaqOfflineA:
    "After the page and its codecs have loaded once, yes. Each codec loads on first use.",
  homeFaqCommercialQ: "Can I use it for commercial work?",
  homeFaqCommercialA: "Yes. Ritools is free for commercial work.",
  // #endregion TOOLS
  // #region SQUEEZE
  squeezeName: "Squeeze",
  squeezeTagline: "Compress the whole batch of images to a target file size",
  squeezeIntro:
    "A very large image can run out of memory. The Batch lives in this tab. A reload clears it.",
  squeezeTicketTitle: "Batch",
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
  squeezeModeNotePerImage: "One Target for every image in the Batch.",
  squeezeModeNoteBatchTotal:
    "One budget for the Batch. Each image gets an even share; unused bytes go to the images that miss.",
  squeezeModeNoteFixedQuality:
    "One quality for every image. No Target, no search.",
  squeezeTargetSize: "Target",
  squeezeTargetHint: "10 KB to 10 MB.",
  squeezeBatchTotal: "Batch budget",
  squeezeBudgetImagesLabel: "Images",
  squeezePerImageBudgetLabel: "Per image",
  squeezeBudgetNote: "Even split, then one redistribution pass.",
  squeezeQuality: "Quality",
  squeezeQualityHint: "10 to 95.",
  squeezeOptions: "Options",
  squeezeResize: "Resize larger images",
  squeezeMaxWidth: "Max width",
  squeezeMaxHeight: "Max height",
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
  squeezeDropTitle: "Drop images or folder here",
  squeezeDropHint:
    "JPEG, PNG, WebP, AVIF, GIF, BMP · GIF and BMP use the first frame",
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
  squeezeBudgetAboveInputs: "The budget is larger than the total input.",
  squeezeCodecOfflineAll: defineTranslation(
    "Connect once to load {format}.",
    {}
  ),
  squeezeWatchStart: "Watch folder",
  squeezeWatchStop: "Stop watching",
  squeezeWatchDenied: "Watch folder permission denied. Drop files instead.",
  squeezeWatchRevoked: "Watch folder access stopped. Drop files instead.",
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
  squeezeZipFailed: "The ZIP could not be built. Your results are still here.",
  squeezeZipLeftOut: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} row left out of the ZIP",
        other: "{?} rows left out of the ZIP",
      },
    },
  }),
  squeezeColOut: "Out",
  squeezeStateDone: "Done",
  squeezeStateAlreadyFits: "Already fits",
  squeezeStateMiss: "Miss",
  squeezeStateBigger: "Bigger",
  squeezeStateRejected: "Rejected",
  squeezeStateQueued: "Queued",
  squeezeWorking: "Working",
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
  squeezeRetry: "Try again",
  squeezeRemove: "Remove",
  squeezeRemoveFile: defineTranslation("Remove {name}", {}),
  squeezeTotalsHeading: "Batch totals",
  squeezeTotalIn: "Total in",
  squeezeTotalOut: "Total out",
  squeezeTotalSaved: "Saved",
  squeezeTotalReduction: "Reduction",
  squeezeProblemUnsupported: "Squeeze does not read this file type.",
  squeezeProblemUnreadable: "Squeeze cannot read this image.",
  squeezeProblemCodecFailed: "The encoder failed on this image.",
  squeezeProblemTooLarge: "Too large for this device. Try Resize.",
  squeezeProblemCodecOffline: defineTranslation(
    "{format} is not cached yet. Connect once, then it works offline.",
    {}
  ),
  squeezeAnnounceProgress: defineTranslation("Progress {percent:number}%", {}),
  squeezeAltTitleLead: "What",
  squeezeAltTitleAccent: "Squeeze",
  squeezeAltTitleBridge: "is, and",
  squeezeAltTitleTail: "why it matters",
  squeezeAltLead:
    "Squeeze compresses a batch of files to your target total size.",
  squeezeAltBody:
    'Most compression tools let you pick a quality percentage (50%, 70%, etc.) and hope the output is small enough. That\'s backwards for the most common real world need: "make this fit under 500 KB" — whether for a WordPress upload limit, a Shopify product image, an email attachment, or a job application portal. Squeeze solves this issues. You set a maximum file size (per image), and Squeeze finds the highest possible quality that stays under that limit — automatically, for every image in your batch.',
  squeezeCompareHeading: "How Squeeze compares",
  squeezeCompareCaption: "Squeeze against TinyPNG, Squoosh, and Compressor.io.",
  squeezeCompareFeature: "Feature",
  squeezeCompareChecked: "Limits checked on 23 October 2026. Sources:",
  squeezeCompareScroll: "Scroll sideways to see every tool.",
  squeezeColTinyPng: "TinyPNG",
  squeezeColSquoosh: "Squoosh",
  squeezeColCompressorIo: "Compressor.io",
  squeezeColSqueeze: "Squeeze",
  squeezeRowBulk: "Bulk compression",
  squeezeRowTarget: "Target file size",
  squeezeRowMaxFile: "Max file size",
  squeezeRowProcessing: "Processing",
  squeezeRowUpload: "Images upload to a server?",
  squeezeRowFormats: "JPEG / WebP / AVIF",
  squeezeRowZip: "ZIP download",
  squeezeRowCost: "Cost",
  squeezeValueYes: "Yes",
  squeezeValueNo: "No",
  squeezeValueNoAvif: "No AVIF",
  squeezeValueNoCap: "No cap",
  squeezeValueClientSide: "Client-side",
  squeezeValueServerSide: "Server-side",
  squeezeValueTinyBulk: "20 files / batch",
  squeezeValueSquooshBulk: "1 file only",
  squeezeValueCompressorBulk: "50 / day free",
  squeezeValueTargetYes: "Yes (per image)",
  squeezeValueTinyMax: "5 MB free",
  squeezeValueCompressorMax: "10 MB free",
  squeezeValueFree: "Free",
  squeezeValueTinyCost: "Free → paid plans",
  squeezeValueCompressorCost: "Free → Premium",
  squeezeValueFreeAlways: "Free, always",
  squeezeDisclaimerHeading: "Disclaimer",
  squeezeDisclaimer:
    "TinyPNG®, TinyJPG®, and Tinfify® are trademarks of Voormedia B.V. Squoosh is a project of Google Chrome Labs. Compressor.io is a trademark of its respective owner. Squeeze is an independent tool built by Ritools and is not affiliated with, endorsed by, or sponsored by any of these companies. Feature comparisons are based on publicly documented capabilities and are provided for informational purposes only.",
  squeezeFaqHeading: "FAQ",
  squeezeFaqFormatsQ: "Which formats can I use?",
  squeezeFaqFormatsA:
    "Input: JPEG, PNG, WebP, AVIF, GIF, BMP. Output: JPEG, WebP, AVIF, PNG, the input format, or Multi (JPEG + WebP + AVIF). GIF and BMP use the first frame.",
  squeezeFaqPngQ: "Why did my PNG lose colors?",
  squeezeFaqPngA:
    "PNG has no quality setting. In a Target mode Squeeze can reduce the color count to reach the Target; the row says so. In Fixed quality it stays lossless.",
  squeezeFaqMissQ: "What is a Miss?",
  squeezeFaqMissA:
    "The smallest file Squeeze could make is still over the Target. The row keeps that file and shows the three ways out: raise the Target, resize, or try another format.",
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
  // #region EXPOSE
  exposeName: "Expose",
  exposePromise: "Read file metadata, then remove the groups you choose.",
  exposeDeck:
    "Every Metadata Field, the GPS point, the AI Provenance, and a Clean that tells you what stayed. The file never leaves this device.",
  exposeFactFormats:
    "Images, bounded DNG, PDF, video, audio, and Office. Some formats are read only.",
  exposeReadOnlyFormat:
    "This format can be read, but the engine cannot remove its metadata. No Cleaned File is offered.",
  exposePdfCleanUnavailable:
    "PDF cleaning is not available in this build. The metadata report is available.",
  exposeOfficePropertiesOnly:
    "Office cleaning removes document properties only. The document content is unchanged.",
  exposeMediaTagsOnly:
    "Video and audio cleaning removes container tags only. The media data is unchanged.",
  exposeC2paUnsupported: "C2PA is not scanned in this format.",
  exposePreviewUnavailable:
    "Preview is not available in this browser. The metadata report is available.",
  exposeOfficePreviewUnavailable:
    "Preview is not available for Office files. The metadata report is available.",
  exposeEngineBuildLimited: "This engine build cannot write PDF.",
  exposeContainerRebuilt:
    "The ZIP container was rebuilt. Document parts are unchanged.",
  exposePdfInfoAndXmp: "Only PDF Info and XMP properties were selected.",
  exposePdfPreview: "PDF preview",
  exposeVideoPreview: "Video preview",
  exposeAudioPreview: "Audio preview",
  exposeCoverArt: "Cover art",
  exposeFactCodec: "Codec",
  exposeFactFamily: "Family",
  exposeFactDuration: "Duration",
  exposeFactPages: "Pages",
  exposeFactSampleRate: "Sample rate",
  exposeFactChannels: "Channels",
  exposeFactParts: "Parts",
  exposeFamilyImage: "Image",
  exposeFamilyRaw: "RAW",
  exposeFamilyDocument: "Document",
  exposeFamilyVideo: "Video",
  exposeFamilyAudio: "Audio",
  exposeFamilyOffice: "Office",
  exposeReadOnlyTitle: "{format} · Read only",
  exposeDngReadOnlyBody:
    "Expose reads DNG metadata. Cleaning is not supported because private metadata can remain in embedded previews. Your file is unchanged.",
  exposeDngReadLimit:
    "DNG reading is limited to classic TIFF with one unsigned integer LinearRaw primary image. The report does not include every embedded field. Other DNG layouts are not supported.",
  exposePdfReadOnlyBody:
    "Expose reads PDF metadata. Cleaning is not supported in this build. Your file is unchanged.",
  exposePdfReadLimit:
    "PDF reading covers PDF Info and XMP properties. The report does not include every embedded field.",
  exposeMediaReadLimit:
    "Video and audio reading covers container tags only. The media data is not decoded.",
  exposeFactGroups: "Ten Metadata Groups. Display Metadata stays.",
  exposeFactLocal: "The file and its metadata never leave this device.",
  exposeChooseFolder: "Choose folder",
  exposeWatchStart: "Watch folder",
  exposeWatchStop: "Stop watching",
  exposeWatchDenied: "Watch folder permission denied. Drop files instead.",
  exposeWatchRevoked: "Watch folder access stopped. Drop files instead.",
  exposeWatchUnsupported:
    "Watch folder works in Chrome and Edge. Drop files instead.",
  exposeWatchActive: "Watching for new files. Use Clean when you are ready.",
  exposeBatchTitle: "Batch",
  exposeBatchCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} file", other: "{?} files" } },
  }),
  exposeBatchLargeTitle: "This Batch is above 1 GB",
  exposeBatchLargeBody:
    "The device sets the true Batch size. Each file above 200 MB may need more memory. Continue to read these files, or cancel this addition.",
  exposeCleanAll: "Clean all",
  exposeDownloadAll: "Download all as ZIP",
  exposeClear: "Clear all",
  exposeClearTitle: "Clear the Batch?",
  exposeClearBody:
    "This removes the Batch and its Cleaned Files from this session. It does not touch the input files.",
  exposeRemoveNamed: "Remove {name}",
  exposeDownloadNamed: "Download {name}",
  exposeBackToBatch: "Back to the batch",
  exposeBatchList: "Files in the Batch",
  exposeActions: "Actions",
  exposeBatchProgress: "Cleaning the Batch",
  exposeBatchAnnouncement: "Batch cleaning: {percent:number}% complete.",
  exposeBatchSummary: "{cleaned:number} of {count:number} files Cleaned.",
  exposeBatchCancelled:
    "Cancelled. Finished Cleaned Files stay. Unfinished files are Ready.",
  exposeZipBuilding: "Building ZIP…",
  exposeZipDone:
    "ZIP downloaded. {count:number} files left out because they are not Cleaned.",
  exposeZipFailed:
    "The ZIP could not be built. Try again, or download each Cleaned File.",
  exposeAiBadge: "AI",
  exposeRemaining: "{count:number} fields remain",
  exposeStateReady: "Ready",
  exposeStateCleaning: "Cleaning",
  exposeStateCleaned: "Cleaned",
  exposeStateIncomplete: "Incomplete",
  exposeStateNotSupported: "Not supported",
  exposeStateTooLarge: "Too large",
  exposeStateRejected: "Rejected",
  exposeStateFailed: "Failed",
  exposeStateStale: "Stale",
  exposeDrop: "Drop files or a folder here",
  exposeChooseFile: "Choose files",
  exposeDropHint:
    "Images, DNG, PDF, MP4, MOV, M4V, WebM, MKV, AVI, M4A, MP3, WAV, FLAC, OGG/Opus, DOCX, XLSX, PPTX",
  exposeSampleCamera: "Open the camera sample",
  exposeSampleAi: "Open the AI sample",
  exposeSampleCameraLine:
    "Camera sample: Andy Parsons / Adobe, CC BY-SA 4.0, via the C2PA public test files. C2PA Manifest generated by Nikon Z 9 for Adobe MAX 2022.",
  exposeSampleAiLine:
    "AI sample: Adobe Firefly, via the Content Authenticity Initiative (MIT). C2PA Manifest signed by Adobe Inc.",
  exposeReading: "Reading the metadata…",
  exposeReadingHint:
    "Reading needs the metadata engine. It downloads once (5.5 MB compressed), then works offline while cached.",
  exposeReadErrorTitle: "Expose cannot read this file.",
  exposeReadErrorBody: "It may be damaged or incomplete. Try another file.",
  exposeUnsupportedTitle: "Unsupported format.",
  exposeUnsupportedBody:
    "Choose a supported image, DNG, PDF, video, audio, DOCX, XLSX, or PPTX. Other RAW and legacy Office files are not supported.",
  exposeNoMetadataTitle: "No removable metadata.",
  exposeNoMetadataBody:
    "Expose found only Display Metadata. It stays, because it controls how the image looks.",
  exposeTryAnother: "Choose another file",
  exposeLargeTitle: "This file is over 200 MB.",
  exposeLargeBody:
    "Your device may run out of memory. Expose does not cap the file; the device does.",
  exposeLargeRead: "Read it anyway",
  exposeLargeCancel: "Choose another file",
  exposeTooLargeTitle: "This file is too large for this device.",
  exposeTooLargeBody: "The read ran out of memory. Your file is unchanged.",
  exposeReport: "Report",
  exposeRaw: "Raw",
  exposeReportTitle: "Metadata Report",
  exposeReportHint: "Every Metadata Group, with counts.",
  exposeRawHint: "Every field, ungrouped.",
  exposeFilter: "Filter fields",
  exposeFilterEmpty: "No field matches this filter.",
  exposeField: "Field",
  exposeValue: "Value",
  exposeGroup: "Group",
  exposeContainer: "Container",
  exposeCopy: "Copy",
  exposeCopied: "Copied",
  exposeFieldCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} field", other: "{?} fields" } },
  }),
  exposeNoFields: "No fields in this group.",
  exposeShowFields: "Show fields",
  exposeHideFields: "Hide fields",
  exposeShowMore: "Show more",
  exposeShowLess: "Show less",
  exposeReportCounts:
    "{fields} fields · {groups} groups · {removable} removable",
  exposeDisplayLocked: "Kept",
  exposeNotesTitle: "Notes",
  exposeGroupsTitle: "Metadata Groups",
  exposeGroupAi: "AI Provenance",
  exposeGroupLocation: "Location",
  exposeGroupTime: "Time",
  exposeGroupDevice: "Device identity",
  exposeGroupCamera: "Camera settings",
  exposeGroupAuthorship: "Authorship",
  exposeGroupSoftware: "Software and edit history",
  exposeGroupThumbnails: "Thumbnails and previews",
  exposeGroupOther: "Other text",
  exposeGroupDisplay: "Display",
  exposeGroupFormatLimit: "This format cannot remove this group.",
  exposeGroupReadOnly: "This format does not expose this group.",
  exposeGroupFormatLimitMark: "Format limit",
  exposeGroupRemovable: "Removable",
  exposeNoteMakerNote:
    "A Maker Note is present. It can repeat camera, time, and settings fields.",
  exposeNoteC2paUnparsed:
    "A C2PA Manifest is present, but its details could not be read.",
  exposeNoteJxlBrotli:
    "JPEG XL metadata is Brotli-compressed. Some readers cannot decode it.",
  exposeNoteIccNotRead:
    "The ICC profile is not readable in this format. It stays untouched.",
  exposeNoteTiffNoFileDetails:
    "TIFF dimensions come from the image's own tags.",
  exposeExhibitTitle: "Exhibit",
  exposeCaseFileTitle: "Case file",
  exposePreviewAlt: "The image you opened, as the browser draws it.",
  exposePlateBody:
    "The browser cannot show this image. The report still reads it.",
  exposeFactDimensions: "Dimensions",
  exposeFactSize: "Size",
  exposeFactFormat: "Format",
  exposeFactOrientation: "Orientation",
  exposeFactFrames: "Frames",
  exposeFactNotReported: "Not reported",
  exposeGpsTitle: "Offline Locator",
  exposeGpsEmpty: "No GPS point in this file.",
  exposeGpsLatitude: "Latitude",
  exposeGpsLongitude: "Longitude",
  exposeGpsAltitude: "Altitude",
  exposeGpsCopy: "Copy coordinates",
  exposeGpsMapAlt: "A world outline with one pin at {latitude}, {longitude}.",
  exposeAiTitle: "AI Provenance",
  exposeAiNone: "No AI Provenance found.",
  exposeAiC2pa: "C2PA Manifest",
  exposeAiC2paPresent: "Present · {size}",
  exposeAiC2paAbsent: "Not present",
  exposeAiGenerator: "Claim generator",
  exposeAiSigner: "Claimed signer",
  exposeAiActions: "Actions",
  exposeAiSourceType: "Digital source type",
  exposeAiParameters: "Generation parameters",
  exposeAiNotValidated:
    "It shows what the manifest claims. Expose does not validate the signature.",
  exposeAiSignal: "Other AI signal",
  exposeDngPreview: "DNG preview",
  exposeThumbnailTitle: "Thumbnail",
  exposeThumbnailNone: "No thumbnail.",
  exposeThumbnailSize: "{width} × {height}",
  exposeThumbnailWarning:
    "An embedded preview can show the original image, even after a clean.",
  exposeThumbnailAlt: "An embedded preview that may show the original image.",
  exposeCleanTitle: "Redaction order",
  exposePresetTitle: "Clean Preset",
  exposePresetAi: "AI only",
  exposePresetPersonal: "Personal",
  exposePresetEverything: "Everything",
  exposePresetCustom: "Custom",
  exposePresetAiNote:
    "Remove AI Provenance: the C2PA Manifest, JUMBF, generation parameters, and AI-tool signatures. Camera EXIF, GPS, and authorship stay.",
  exposePresetPersonalNote:
    "Remove Location, Time, Device identity, Authorship, and Thumbnails and previews. Camera settings stay.",
  exposePresetEverythingNote:
    "Remove every removable Metadata Group. Display Metadata stays.",
  exposePresetCustomNote:
    "Choose the Metadata Groups to remove. Display Metadata always stays.",
  exposePresetAiUnavailable:
    "AI only is not available for JPEG XL. The cleaner cannot remove its C2PA Manifest.",
  exposePresetEverythingUnavailable:
    "Everything is not available for JPEG XL while its C2PA Manifest is present. Use Custom without AI Provenance.",
  exposeRemoveLine: defineTranslation(
    "Will remove {fields:plural} in {groups:plural}",
    {
      plural: {
        fields: { one: "{?} field", other: "{?} fields" },
        groups: { one: "{?} group", other: "{?} groups" },
      },
    }
  ),
  exposeKeepLine: defineTranslation(
    "Will keep {fields:plural} in {groups:plural}",
    {
      plural: {
        fields: { one: "{?} field", other: "{?} fields" },
        groups: { one: "{?} group", other: "{?} groups" },
      },
    }
  ),
  exposeKeptDisplayLine: defineTranslation(
    "Display Metadata stays: {fields:plural}.",
    {
      plural: { fields: { one: "{?} field", other: "{?} fields" } },
    }
  ),
  exposeDisplayLock: "Display Metadata stays",
  exposeDisplayLockWhy:
    "The ICC profile, the orientation, and the dimensions control how the image looks. Removing them can shift the colours or rotate the image.",
  exposeEngineNote:
    "The metadata engine downloads on the first read, then works offline while cached.",
  exposeClean: "Clean",
  exposeCleanDirty: defineTranslation("Clean · {fields:plural}", {
    plural: { fields: { one: "{?} field", other: "{?} fields" } },
  }),
  exposeCleanDisabled: "Select a group with fields.",
  exposeCleanNoFields: "No removable metadata.",
  exposeCleanNotSupportedTitle: "Clean not supported.",
  exposeCleanNotSupportedGroup:
    "Expose cannot remove {group} from a {format} file. Your file is unchanged. Use Custom without {group}, or download the original.",
  exposeCleanNotSupportedFormat:
    "Expose cannot clean this {format} file without changing the image. Your file is unchanged.",
  exposeDownloadOriginal: "Download the original",
  exposeEngineLoadingTitle: "Loading the metadata engine",
  exposeEngineLoadingBody:
    "The metadata engine downloads once. Later reads and cleans work offline while cached.",
  exposeEngineLoadingPercent: "{percent}%",
  exposePhaseCleaning: "Cleaning",
  exposePhaseVerifying: "Verifying",
  exposeEngineOfflineTitle: "The metadata engine is not cached.",
  exposeEngineOfflineBody:
    "Connect once to load the engine, then read and clean offline while it stays cached.",
  exposeEngineFailedTitle: "The metadata engine failed to load.",
  exposeEngineFailedBody:
    "Your file is unchanged. Try again, or download the original.",
  exposeRetry: "Try again",
  exposeCancelledTitle: "Clean cancelled.",
  exposeCancelledBody: "Your file is unchanged.",
  exposeCleanErrorTitle: "The Clean failed.",
  exposeCleanErrorBody:
    "Your file is unchanged. Try again, or download the original.",
  exposeCancel: "Cancel",
  exposeVerificationTitle: "Verification",
  exposeVerificationDeck: "A second read of the Cleaned File.",
  exposeVerificationMarksLabel: "What the Verification marks mean",
  exposeVerificationMarksCheck: "The line passed.",
  exposeVerificationMarksMinus:
    "Nothing to report: the line only gives a count or a fact.",
  exposeVerificationMarksFail: "The line failed, and the download is disabled.",
  exposeVerificationSelectedZero: "0 fields remain in the selected groups.",
  exposeVerificationSelectedSome: defineTranslation(
    "{count:plural} remain in the selected groups.",
    {
      plural: {
        count: { one: "{?} field remains", other: "{?} fields remain" },
      },
    }
  ),
  exposeVerificationKept: "Kept groups still read: {groups}.",
  exposeVerificationKeptNone: "No other groups were kept.",
  exposeVerificationDisplay:
    "Display Metadata is kept: the ICC profile, the orientation, and the dimensions.",
  exposeVerificationPayloadSame: "The file content is unchanged.",
  exposeVerificationPayloadChanged:
    "The file content changed. Download is blocked.",
  exposeVerificationC2paGone: "The C2PA Manifest is gone.",
  exposeVerificationC2paRemains: "The C2PA Manifest is still present.",
  exposeVerificationC2paNone: "No C2PA Manifest was present.",
  exposeVerificationRemoved: defineTranslation(
    "Removed {fields:plural} from {groups:plural}.",
    {
      plural: {
        fields: { one: "{?} field", other: "{?} fields" },
        groups: { one: "{?} group", other: "{?} groups" },
      },
    }
  ),
  exposeVerificationMakerNote:
    "A Maker Note was removed with its camera, time, and settings fields.",
  exposeVerificationFormatLimit: "This format kept a group it cannot remove.",
  exposeVerificationCounts: defineTranslation(
    "{before:plural} · {after:plural}",
    {
      plural: {
        before: { one: "{?} field before", other: "{?} fields before" },
        after: { one: "{?} field after", other: "{?} fields after" },
      },
    }
  ),
  exposeVerificationSize:
    "File size {before} before · {after} after · {delta}.",
  exposeVerificationReRead: "Read again",
  exposeDownload: "Download the Cleaned File",
  exposeDownloadLine: "Downloads {name}. The input file stays untouched.",
  exposeDownloadSize: "{size}",
  exposeCleanAgain: "Clean this image again",
  exposeCleanAnother: "Clean another image",
  exposeHonestyTitle: "What Expose cannot do",
  exposeHonestyBody:
    "Expose removes metadata only. It cannot remove a Pixel Watermark such as SynthID, and it does not detect AI-generated images. It reports AI Provenance and does not validate the C2PA signature.",
  exposeExplainerTitleLead: "What",
  exposeExplainerTitleAccent: "Expose",
  exposeExplainerTitleBridge: "is, and",
  exposeExplainerTitleTail: "why it matters",
  exposeExplainerLede:
    "Expose reads file metadata, then removes the metadata's groups you choose.",
  exposeExplainerIntro:
    "When a phone or camera saves a photo, it embeds an EXIF (Exchangeable Image File Format) metadata: camera model, lens, exposure settings, timestamp, and most importantly GPS coordinates if location is enabled. Some social networks like Instagram, Facebook, X strip this before displaying. Many places don't: email attachments, marketplace listings, forums, cloud storage share links, direct file transfers, printed photos scanned back in. Expose views every tag in your image and, in one click, gives you a clean copy with everything removed.",
  exposeCompareHeading: "How Expose compares",
  exposeCompareCaption:
    "Expose against Jimpl, Metadata2Go, and Image Scrubber.",
  exposeCompareFeature: "Feature",
  exposeCompareChecked: "Limits checked on 23 October 2026. Sources:",
  exposeColJimpl: "Jimpl",
  exposeColMetadata2go: "Metadata2Go",
  exposeColImageScrubber: "Image Scrubber",
  exposeColExpose: "Expose",
  exposeRowBrowser: "Runs in the browser",
  exposeRowProcessing: "Processing",
  exposeRowUpload: "Images upload to a server?",
  exposeRowReport: "Metadata report",
  exposeRowChoose: "Choose what to remove",
  exposeRowVerify: "Verifies the clean",
  exposeRowFormats: "Formats",
  exposeRowPixels: "Keeps the pixels",
  exposeRowInput: "Input limit",
  exposeRowBulk: "Bulk",
  exposeRowCost: "Cost",
  exposeValueYes: "Yes",
  exposeValueNo: "No",
  exposeValueServerSide: "Server-side",
  exposeValueClientSide: "Client-side",
  exposeValueExifGpsIcc: "EXIF + GPS + ICC",
  exposeValueFieldReport: "Field report",
  exposeValueRemovedFields: "Removed fields",
  exposeValueGroupsGpsAi: "Groups + GPS + AI Provenance",
  exposeValuePerField: "Per field",
  exposeValuePresets: "Presets or groups",
  exposeValueManualUpload: "Manual re-upload",
  exposeValueNoReread: "No re-read",
  exposeValueAutoReread: "Automatic re-read",
  exposeValueAnyFileType: "Any file type",
  exposeValueCommonImageTypes: "Common image types",
  exposeValueBrowserImages: "Browser images",
  exposeValueEightFormats: "Six file families",
  exposeValue50Mb: "50 MB",
  exposeValue75Mb: "75 MB free",
  exposeValue2500Px: "2500 px",
  exposeValueDeviceMemory: "Device memory",
  exposeValueFivePerJob: "5 per job free",
  exposeValueOneFile: "One file",
  exposeValueManyFiles: "Many files",
  exposeValueFreeOpenSource: "Free, open source",
  exposeValueFreeWithAds: "Free, with ads",
  exposeValueFreeToPaid: "Free tier → paid",
  exposeValueFreeNoAccount: "Free, no account",
  exposeCompareDisclaimer:
    "Jimpl, Metadata2Go, and Image Scrubber are the property of their owners. Expose is independent and is not affiliated with them. Limits come from their public pages and can change.",
  exposeFaqHeading: "FAQ",
  exposeFaqExifQ: "What is EXIF metadata?",
  exposeFaqExifA:
    "EXIF (Exchangeable Image File Format) is data embedded in most photos by your camera or phone: camera model, lens, exposure, timestamp, device serial, and often GPS coordinates. It is one metadata container; an image can also carry XMP, IPTC, ICC, and a C2PA Manifest.",
  exposeFaqC2paQ: "What is a C2PA Manifest?",
  exposeFaqC2paA:
    "A C2PA Manifest is the signed record of how a file was made and changed. Expose shows its presence and size. It does not validate the signature, and it does not decide whether an image is AI-generated.",
  exposeFaqRemoveQ: "Why should I remove it?",
  exposeFaqRemoveA:
    "Because an image posted online carries this data unless the platform strips it. A GPS point reveals location, a timestamp reveals habits, and a device serial can link separate accounts.",
  exposeFaqSocialQ: "Do social networks strip it?",
  exposeFaqSocialA:
    "Some do, such as Facebook, Instagram, and X. Some do not, such as email, marketplace listings, and direct file transfer. If you share outside a major social network, remove it yourself.",
  exposeFaqFormatsQ: "Which formats are supported?",
  exposeFaqFormatsA:
    "Expose reads images, bounded LinearRaw DNG, PDF, video, audio, and DOCX/XLSX/PPTX. PDF, DNG, WebM, MKV, AVI, MP3, WAV, FLAC, and OGG/Opus are read only. MP4/MOV/M4V/M4A cleaning removes container tags. Office cleaning removes document properties.",
  exposeFaqGroupsQ: "Can I keep some fields and remove others?",
  exposeFaqGroupsA:
    "Yes. Choose a Clean Preset, or use Custom to select Metadata Groups. Display Metadata always stays, because the ICC profile, the orientation, and the dimensions control how the image looks.",
  exposeFaqWatermarkQ: "What is a Pixel Watermark?",
  exposeFaqWatermarkA:
    "A mark in the pixels, such as SynthID. A Clean removes metadata only, so it cannot remove a Pixel Watermark. Expose reports AI Provenance and does not validate the C2PA signature.",
  exposeDisclaimerHeading: "Disclaimer",
  // #endregion EXPOSE
  // #region TABULAR
  tabularName: "Tabular",
  tabularTitle: "Tabular — table file viewer, editor, and converter",
  tabularDescription:
    "View, edit, and convert CSV, XLS, XLSX, TSV, TAB, and delimited TXT files on your device. No upload.",
  tabularPromise: "View, edit, and convert table files on your device.",
  tabularSourceSafe: "The input file is never overwritten.",
  tabularExplainerTitleLead: "What",
  tabularExplainerTitleAccent: "Tabular",
  tabularExplainerTitleBridge: "is, and",
  tabularExplainerTitleTail: "why it matters",
  tabularExplainerLede:
    "Tabular opens, edits, and converts table files. The work happens in this tab, on your device.",
  tabularExplainerIntro:
    "A table file is the usual way to move data between people: a database export, a bank statement, a stock list, a report. Most online viewers ask you to upload the file first. That copy then sits on a server you do not control. Tabular reads the file in this browser tab and keeps every Sheet. Change a cell, add a row, rename a header, then export a new file. The input file is never overwritten.",
  tabularCompareHeading: "How Tabular compares",
  tabularCompareCaption:
    "Tabular against CSVtoSheets, CSV Viewer Online, and CSV Viewer.",
  tabularCompareFeature: "Feature",
  tabularCompareChecked: "Limits checked on 27 October 2026. Sources:",
  tabularColCsvToSheets: "CSVtoSheets",
  tabularColCsvViewerOnline: "CSV Viewer Online",
  tabularColCsvViewer: "CSV Viewer",
  tabularColTabular: "Tabular",
  tabularRowBrowser: "Runs in the browser",
  tabularRowProcessing: "Processing",
  tabularRowUpload: "Files upload to a server?",
  tabularRowFormats: "Formats opened",
  tabularRowWorkbook: "Opens every Sheet",
  tabularRowEdit: "Cell editing",
  tabularRowExport: "Export formats",
  tabularRowInput: "Input limit",
  tabularRowCost: "Cost",
  tabularValueYes: "Yes",
  tabularValueYesUndo: "Yes, with undo",
  tabularValueNo: "No",
  tabularValueOptInSheets: "No (opt-in Sheets)",
  tabularValueClientSide: "Client-side",
  tabularValueCsvOnly: "CSV only",
  tabularValueCsvTsvTxt: "CSV, TSV, TXT",
  tabularValueTableFiles: "CSV, XLS, XLSX, TSV, TAB, TXT",
  tabularValueReadOnly: "Read-only",
  tabularValueAllSheets: "Yes, every Sheet",
  tabularValueCsvPdfSheets: "CSV, PDF, Sheets",
  tabularValueCsvJson: "CSV, JSON",
  tabularValueCsvXlsxJson: "CSV, XLSX, JSON",
  tabularValueTabularExport: "CSV, XLS, XLSX, JSON, TSV, TAB",
  tabularValue100Mb10k: "100 MB · 10,000 rows",
  tabularValueDeviceMemory: "Device memory",
  tabularValue100kRows: "100,000 rows free",
  tabularValueFreeNoAccount: "Free, no account",
  tabularValueFreeToPro: "Free tier → Pro",
  tabularCompareDisclaimer:
    "CSVtoSheets, CSV Viewer Online, and CSV Viewer are the property of their owners. Tabular is independent and is not affiliated with them. Limits come from their public pages and can change.",
  tabularHonestyTitle: "What Tabular cannot do",
  tabularHonestyBody:
    "Tabular exports values only. Formulas, charts, macros, merged cells, and workbook styling are not kept. Stored formula results may be stale. Date-formatted values stay as displayed text, with no timezone conversion.",
  tabularFaqHeading: "FAQ",
  tabularFaqFormatsQ: "Which formats does Tabular open?",
  tabularFaqFormatsA:
    "CSV, XLS, XLSX, TSV, TAB, and delimited TXT. One file at a time, with every Sheet in the workbook.",
  tabularFaqEditQ: "Can I edit the data?",
  tabularFaqEditA:
    "Yes. Edit a cell, add or delete rows and columns, rename a header, and undo or redo. Copy a range as TSV.",
  tabularFaqFormulasQ: "Does it keep formulas and formatting?",
  tabularFaqFormulasA:
    "No. Exports keep values only. Formulas, charts, macros, merged cells, and workbook styling are omitted. Stored formula results may be stale.",
  tabularFaqLimitQ: "What is the file size limit?",
  tabularFaqLimitA:
    "There is no fixed limit. The limit is your device memory. Large files can be slow.",
  tabularFaqDatesQ: "Are dates converted?",
  tabularFaqDatesA:
    "No. Date-formatted values are kept as displayed text. Tabular does not apply a timezone conversion.",
  tabularDisclaimerHeading: "Disclaimer",
  tabularOpen: "Open file",
  tabularDrop: "Drop one table file here, or choose a file.",
  tabularFormats: "CSV, XLS, XLSX, TSV, TAB, and delimited TXT",
  tabularChoose: "Choose a file",
  tabularOneFile: "Open one file at a time. Choose which file to open.",
  tabularSample: "Try a sample",
  tabularSampleStock: "Stock list — text and leading zeros",
  tabularSampleWorkbook: "Values workbook — Sheets and stored results",
  tabularClose: "Close file",
  tabularFileSummary: "{name} · {bytes} · {sheets} Sheets",
  tabularSheet: "Sheet",
  tabularSheetRows: "{name} · {rows} rows",
  tabularHidden: "Hidden",
  tabularVeryHidden: "Very hidden",
  tabularSearch: "Search all columns",
  tabularSearchValues: "Search values",
  tabularClearSearch: "Clear search",
  tabularRowCounts: "{matched} / {total} rows · {columns} columns",
  tabularNoMatches: "No rows match this search.",
  tabularEmptySheet: "This Sheet is empty. Add a column, then a row.",
  tabularEmptyRows: "No data rows. Add a row to start.",
  tabularDelimiter: "Delimiter",
  tabularComma: "Comma",
  tabularSemicolon: "Semicolon",
  tabularPipe: "Pipe",
  tabularAuto: "Detect automatically",
  tabularAmbiguous:
    "Detection was uncertain. Check the values before you export.",
  tabularBlankHeader: "Blank header · column {column}",
  tabularNewline: "Line endings",
  tabularMixedNewlines: "Mixed line endings",
  tabularBom: "UTF-8 BOM",
  tabularBomDetected: "BOM detected",
  tabularNoBom: "No BOM",
  tabularUseSource: "Use source dialect",
  tabularApply: "Apply",
  tabularCancel: "Cancel",
  tabularRetry: "Retry",
  tabularChooseAnother: "Choose another file",
  tabularDetails: "Show details",
  tabularGridLabel: "{sheet} · Sheet editor",
  tabularCellLabel: "Row {row}, column {column}: {value}",
  tabularBlankValue: "Blank",
  tabularEdited: "Edited",
  tabularEditedCount: "Edited cells: {count}",
  tabularHeaderCount: "Changed headers: {count}",
  tabularStructureCount: "Structure Edits: {count}",
  tabularEditCell: "Edit cell",
  tabularEditAddress: "Edit {address}",
  tabularCellText: "Cell text",
  tabularMultiline: "Expand editor",
  tabularMultilineHint: "Enter adds a new line. Apply commits one Edit.",
  tabularInlineHint:
    "Enter or Tab commits. Escape cancels. Alt+Enter adds a new line.",
  tabularUndo: "Undo",
  tabularRedo: "Redo",
  tabularNothingUndo: "No Edit to undo",
  tabularNothingRedo: "No Edit to redo",
  tabularHistoryDone: "{operation} in {sheet}.",
  tabularCommitDone: "Cell updated.",
  tabularRowNoMatch: "The edited row no longer matches the search.",
  tabularAddRow: "Add row at end",
  tabularAddColumn: "Add column",
  tabularInsertRowBefore: "Insert row before",
  tabularInsertRowAfter: "Insert row after",
  tabularInsertColumnBefore: "Insert column before",
  tabularInsertColumnAfter: "Insert column after",
  tabularDeleteRows: "Delete selected rows",
  tabularDeleteColumns: "Delete selected columns",
  tabularDeleteRow: "Delete row",
  tabularDeleteColumn: "Delete column",
  tabularRenameHeader: "Rename header",
  tabularSortAscending: "Sort ascending",
  tabularSortDescending: "Sort descending",
  tabularClearSort: "Reset sort",
  tabularSorted: "{column} · {direction}",
  tabularSheetOrder: "Sheet order",
  tabularPasteText: "Paste text",
  tabularPasteBounds:
    "The pasted range does not fit. Add rows or columns, then paste again.",
  tabularPasteInvalid:
    "The pasted text has invalid quotes or rows. No cells changed.",
  tabularPasteMismatch:
    "The pasted block does not match the selected range. Select one cell or match the range size.",
  tabularRevertCell: "Revert cell",
  tabularRevertHeader: "Revert header",
  tabularRevertAll: "Revert all",
  tabularUnresolved: "Unresolved value",
  tabularMissingResult:
    "This formula has no stored result. Replace the value or exclude it from the Export Scope.",
  tabularFormulaError: "The stored formula result is an error: {error}.",
  tabularCellError: "The source cell contains an error: {error}.",
  tabularUnsupportedValue:
    "This cell value cannot be represented. Replace it before export.",
  tabularNextUnresolved: "Go to next unresolved value",
  tabularValuesOnly:
    "Values only. Exports omit formulas, charts, macros, merged cells, and workbook styling.",
  tabularStaleResults:
    "Formula results are stored values and can be stale. Tabular does not recalculate them.",
  tabularDateText:
    "Date-formatted values are kept as displayed text. No timezone conversion is applied.",
  tabularMerged:
    "Merged cells are read as an anchor value and blank cells. Merges are not exported.",
  tabularHiddenData:
    "Hidden Sheets, rows, and columns are included. Check the Export Scope.",
  tabularIgnoredFeatures:
    "Workbook features outside cell values are not preserved.",
  tabularRagged:
    "Rows with fewer fields are padded with empty text. Affected rows: {count}.",
  tabularPrecision:
    "Numeric precision already lost in the source cannot be restored.",
  tabularAllHiddenOutput:
    "The first output Sheet will be visible so the workbook can be opened.",
  tabularExport: "Export",
  tabularExportTitle: "Export",
  tabularScope: "Export Scope",
  tabularCurrentView: "Current View",
  tabularWholeSheet: "Whole Sheet",
  tabularWholeWorkbook: "Whole Workbook",
  tabularSheetHint: "All rows in Sheet order. Search and sort are ignored.",
  tabularWorkbookHint:
    "Every Sheet, including hidden Sheets, in Sheet order. Search and sort are ignored.",
  tabularFormat: "Output format",
  tabularPdfReportHint:
    "PDF is a report. CSV, XLSX, and JSON keep the exact values.",
  tabularPageSize: "Page size",
  tabularA4: "A4",
  tabularLetter: "Letter",
  tabularOrientation: "Orientation",
  tabularPortrait: "Portrait",
  tabularLandscape: "Landscape",
  tabularPdfEstimate: "About {pages} pages.",
  tabularPdfLarge:
    "This PDF is longer than 500 pages. Check the Export Scope or use landscape.",
  tabularPdfUnsupported:
    "{count} characters cannot be shown in the PDF. They are replaced with ?. Use CSV or XLSX to keep the exact text.",
  tabularPdfUntagged:
    "This PDF is not tagged. For screen readers, use CSV or XLSX.",
  tabularPdfDownloadReady: "PDF ready: {pages} pages, {rows} data rows.",
  tabularJsonObjects: "JSON objects",
  tabularJsonArrays: "JSON arrays",
  tabularJsonUnique: "Unique, non-empty headers become object keys.",
  tabularJsonDuplicate:
    "Array JSON keeps duplicate headers and every column. The header row is included.",
  tabularJsonBlank:
    "Array JSON keeps blank headers and every column. The header row is included.",
  tabularJsonNoHeader: "Headers are off. Array JSON contains data rows only.",
  tabularSafeText: "Spreadsheet-safe text",
  tabularSafeCount:
    "Changed output cells: {count}. The open Sheet is unchanged.",
  tabularExact: "Exact values",
  tabularExactHint:
    "Export the original values. A spreadsheet application may interpret formula-like text.",
  tabularBeforeAfter: "Before: {before}. After: {after}.",
  tabularUnresolvedExport:
    "Resolve or exclude {count} values in this Export Scope before export.",
  tabularFormatLimit:
    "{sheet} exceeds the {format} {dimension} limit: {actual} / {limit}. Nothing was truncated. Choose another format or scope.",
  tabularCreateDownload: "Create download",
  tabularDownload: "Download {format}",
  tabularDownloadReady: "Download ready: {sheets} Sheets, {rows} data rows.",
  tabularDownloadHint:
    "Your session is still temporary. Keep the downloaded file before leaving.",
  tabularExportAgain: "Export again",
  tabularCopy: "Copy",
  tabularCopied: "Copied {rows} rows.",
  tabularLoadingEngine: "Loading the table engine…",
  tabularDetecting: "Detecting file settings…",
  tabularReading: "Reading the Table File…",
  tabularUpdatingView: "Updating the Current View…",
  tabularApplyingEdit: "Applying the Edit…",
  tabularCheckExport: "Check export",
  tabularPlanningExport: "Checking export scope and values…",
  tabularWriting: "Creating the output file…",
  tabularVerifying: "Checking the output file…",
  tabularProgress: "{completed} / {total} {unit}",
  tabularCancelled: "Cancelled. Your last valid session is unchanged.",
  tabularDiscardTitle: "Discard changes?",
  tabularDiscardBody:
    "Edited cells: {cells}. Changed headers: {headers}. Structure Edits: {structure}. Download your work before you continue.",
  tabularKeepWorking: "Keep working",
  tabularDiscardContinue: "Discard and continue",
  tabularEngineOfflineHint:
    "Engine files download on first use. Then they work offline while they remain cached. Your file is never uploaded.",
  tabularLocalHeading: "Your file stays here.",
  tabularLocalBody:
    "Tabular reads and edits in this tab. There is no account, upload, or server storage.",
  tabularValuesHeading: "Check the values before you share.",
  tabularValuesBody:
    "Stored formula results may be stale. Export keeps values, not the original workbook features.",
  tabularUnsupportedFormat:
    "This file format is not supported. Choose CSV, XLS, XLSX, TSV, TAB, or delimited TXT.",
  tabularEncryptedFile:
    "This file is encrypted or password-protected. Save an unencrypted copy on your device, then open it.",
  tabularCorruptFile:
    "The complete file could not be read. Check the source file or choose another file.",
  tabularInvalidEncoding:
    "The file could not be decoded as {encoding}. Choose another file.",
  tabularInvalidDelimitedText:
    "Invalid text at record {record}, column {column}. Check the quotes or delimiter.",
  tabularInvalidRequest:
    "This action could not be applied. Refresh the View and try again.",
  tabularMissingIdentity:
    "This cell or structure no longer exists. Refresh the View.",
  tabularStaleSession:
    "This result belongs to an earlier session. It was not applied.",
  tabularRevisionConflict:
    "The file changed before this action finished. Check the latest View and try again.",
  tabularStaleView:
    "The View changed. Select the range again before continuing.",
  tabularStaleExportPlan: "The data changed. Check the export counts again.",
  tabularMemoryLimit:
    "This device could not finish this operation with its available memory. Download the current work if available, or try a smaller file.",
  tabularWorkerLost:
    "The engine stopped and this in-memory session could not be recovered. Open the source or your last download again.",
  tabularEngineOffline:
    "The table engine is not cached on this device. Connect once to load it, then retry.",
  tabularEngineFailed:
    "The table engine could not start or finish. Retry, or choose another file.",
  tabularExportVerificationFailed:
    "The output check failed. No download was created. Keep your session and try another format.",
  tabularClipboardDenied:
    "The browser did not allow clipboard access. Select the text or download TSV instead.",
  tabularCopyDenied: "The browser did not allow clipboard access. Try again.",
  tabularSelectText: "Select text",
  tabularDownloadTsv: "Download TSV",
  tabularFactInput: "CSV, Excel, and delimited text in.",
  tabularFactOutput: "Table files, JSON, and clipboard out.",
  tabularFactLocal: "One file. Every Sheet. On this device.",
  tabularRows: "Rows",
  tabularColumns: "Columns",
  tabularGridHint:
    "Arrow keys move. Shift + arrows selects a range; on touch, hold a cell and drag. Ctrl/Cmd + arrows jumps to the sheet edge. Ctrl/Cmd + C copies it. Enter or Space edits a cell. Type to replace it. Shift + Enter adds a line. Alt + Backspace reverts the active cell.",
  tabularOutputBlocked:
    "This output cannot be created. Change the format or scope, or resolve the listed values.",
  tabularSelectScope: "Choose an Export Scope",
  tabularAcknowledgeExport: "I understand: export values only.",
  tabularSessionFacts: "{size} bytes · {sheets} Sheets",
  tabularStoredCount:
    "Stored formula results: {count}. Unresolved values: {unresolved}.",
  tabularSelectionReady: "Range selected.",
  tabularCopyReady: "Text is ready. Copy it from the next button.",
  tabularClearFile: "Close file",
  tabularWidthHint:
    "Column width is a view setting. It does not change your file.",
  tabularWarnings: "File notes",
  tabularSourceDialect: "{encoding} · {delimiter} · {newline}",
  tabularLf: "LF",
  tabularCrlf: "CRLF",
  tabularUnitBytes: "bytes",
  tabularUnitRows: "rows",
  tabularUnitCells: "cells",
  tabularUnitSheets: "Sheets",
  tabularDimensionRows: "rows",
  tabularDimensionColumns: "columns",
  tabularDimensionText: "cell text",
  tabularDimensionName: "Sheet name",
  // #endregion TABULAR
} as const satisfies LanguageMessages;
