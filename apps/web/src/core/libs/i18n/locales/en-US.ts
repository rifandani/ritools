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
  squeezeDropTitle: "Drop images or folders here.",
  squeezeDropHint:
    "JPEG, PNG, WebP, AVIF, GIF, BMP · GIF and BMP use the first frame.",
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
  squeezeAltTitleLead: "A free",
  squeezeAltTitleAccent: "TinyPNG alternative",
  squeezeAltTitleTail: "for bulk compression",
  squeezeAltLead: "Squeeze compresses a whole Batch to a target file size.",
  squeezeAltBody:
    "If you have been using TinyPNG, Compressor.io, or iLoveIMG and hitting their 20-file caps, 5 MB file limits, or paywalls, Squeeze gives you the same codecs without any of those constraints. Your images are processed with industry-standard codecs (MozJPEG, libavif, oxipng), and they never leave your device.",
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
  exposePromise:
    "Read the metadata in an image, then remove the groups you choose.",
  exposeDeck:
    "Every Metadata Field, the GPS point, the AI Provenance, and a Clean that tells you what stayed. The file never leaves this device.",
  exposeFactFormats:
    "Eight formats: JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, GIF.",
  exposeFactGroups: "Ten Metadata Groups. Display Metadata stays.",
  exposeFactLocal: "The file and its metadata never leave this device.",
  exposeEmptyBody:
    "Drop one file or a folder, or open a Sample Image. Expose reads the metadata before it changes anything.",
  exposeRowDownload: "Download",
  exposeChooseFolder: "Choose a folder",
  exposeWatchStart: "Watch folder",
  exposeWatchStop: "Stop watching",
  exposeWatchDenied: "Watch folder permission denied. Drop files instead.",
  exposeWatchRevoked: "Watch folder access stopped. Drop files instead.",
  exposeWatchUnsupported:
    "Watch folder works in Chrome and Edge. Drop files instead.",
  exposeWatchActive: "Watching for new images. Use Clean when you are ready.",
  exposeBatchTitle: "Batch · {count:number} images",
  exposeBatchLifetime: "A Batch does not survive a reload or a route change.",
  exposeBatchMemory: "The device sets the true Batch size. No file-count cap.",
  exposeBatchLargeTitle: "This Batch is above 1 GB",
  exposeBatchLargeBody:
    "The device sets the true Batch size. Each file above 200 MB may need more memory. Continue to read these files, or cancel this addition.",
  exposeCleanAll: "Clean all",
  exposeDownloadAll: "Download all as ZIP",
  exposeClear: "Clear",
  exposeClearTitle: "Clear the Batch?",
  exposeClearBody:
    "This removes the Batch and its Cleaned Files from this session. It does not touch the input files.",
  exposeRemove: "Remove",
  exposeRemoveNamed: "Remove {name}",
  exposeDownloadNamed: "Download {name}",
  exposeBackToBatch: "Back to the batch",
  exposeBatchList: "Images in the Batch",
  exposeBatchProgress: "Cleaning the Batch",
  exposeBatchAnnouncement: "Batch cleaning: {percent:number}% complete.",
  exposeBatchSummary: "{cleaned:number} of {count:number} images Cleaned.",
  exposeBatchCancelled:
    "Cancelled. Finished Cleaned Files stay. Unfinished images are Ready.",
  exposeBatchSkipped:
    "{skipped:number} non-images skipped. {duplicates:number} duplicate files skipped.",
  exposeZipBuilding: "Building ZIP…",
  exposeZipDone:
    "ZIP downloaded. {count:number} images left out because they are not Cleaned.",
  exposeZipFailed:
    "The ZIP could not be built. Try again, or download each Cleaned File.",
  exposeFileColumn: "File",
  exposeFormatColumn: "Format / size",
  exposeFieldsColumn: "Fields",
  exposeSignalsColumn: "GPS / AI",
  exposeStateColumn: "State / actions",
  exposeAiBadge: "AI",
  exposeNoSignals: "No GPS or AI evidence found",
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
  exposeDrop: "Drop images or a folder here",
  exposeChooseFile: "Choose files",
  exposeDropHint:
    "JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, or GIF. One file or a folder.",
  exposeSampleCamera: "Open the camera sample",
  exposeSampleAi: "Open the AI sample",
  exposeSampleCameraLine:
    "Camera sample: Andy Parsons / Adobe, CC BY-SA 4.0, via the C2PA public test files. C2PA Manifest generated by Nikon Z 9 for Adobe MAX 2022.",
  exposeSampleAiLine:
    "AI sample: Adobe Firefly, via the Content Authenticity Initiative (MIT). C2PA Manifest signed by Adobe Inc.",
  exposeReading: "Reading the metadata…",
  exposeReadingHint: "The file stays in this tab.",
  exposeReadErrorTitle: "Expose cannot read this file.",
  exposeReadErrorBody: "It may be damaged or incomplete. Try another file.",
  exposeUnsupportedTitle: "Unsupported format.",
  exposeUnsupportedBody:
    "Expose reads JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, and GIF images.",
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
  exposeNoteGifDetails:
    "GIF exposes image details only. Expose does not read its EXIF, IPTC, XMP, or ICC.",
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
  exposeEngineNote: "The cleaner downloads once, then works offline.",
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
  exposeEngineLoadingTitle: "Loading the cleaner",
  exposeEngineLoadingBody:
    "The first Clean downloads the cleaner. It works offline after that.",
  exposeEngineLoadingPercent: "{percent}%",
  exposePhaseCleaning: "Cleaning",
  exposePhaseVerifying: "Verifying",
  exposeEngineOfflineTitle: "The cleaner is not cached.",
  exposeEngineOfflineBody:
    "Connect once to load the cleaner. The viewer still works offline.",
  exposeEngineFailedTitle: "The cleaner failed to load.",
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
  exposeVerificationPayloadSame: "The image payload is unchanged.",
  exposeVerificationPayloadChanged:
    "The image payload changed. Do not use this file.",
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
  exposeExplainerTitleLead: "What metadata is,",
  exposeExplainerTitleAccent: "and why it matters",
  exposeExplainerLede:
    "A photo is not only pixels. It also carries Metadata: the camera model, the time, and often the GPS point. Expose shows every Metadata Field, then removes the Metadata Groups you choose.",
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
  exposeValueEightFormats: "8 image formats",
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
    "JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, and GIF. GIF exposes image details and AI Provenance only. JPEG XL keeps its C2PA Manifest.",
  exposeFaqGroupsQ: "Can I keep some fields and remove others?",
  exposeFaqGroupsA:
    "Yes. Choose a Clean Preset, or use Custom to select Metadata Groups. Display Metadata always stays, because the ICC profile, the orientation, and the dimensions control how the image looks.",
  exposeFaqWatermarkQ: "What is a Pixel Watermark?",
  exposeFaqWatermarkA:
    "A mark in the pixels, such as SynthID. A Clean removes metadata only, so it cannot remove a Pixel Watermark. Expose reports AI Provenance and does not validate the C2PA signature.",
  exposeDisclaimerHeading: "Disclaimer",
  // #endregion EXPOSE
} as const satisfies LanguageMessages;
