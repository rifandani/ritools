import { defineTranslation } from "@/core/libs/i18n/define-translation";
import type { LanguageMessages } from "@/core/libs/i18n/init";

export default {
  // #region COMMON
  locale: "en-US",
  backTo: "Back to {target} page",
  errorMinLength: "{field} must have at least {length} characters",
  error: "{module} error",
  theme: "Theme",
  system: "System",
  light: "Light",
  dark: "Dark",
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
  // #endregion TOOLS
  // #region SQUEEZE
  squeezeName: "Squeeze",
  squeezeTagline: "Compress images to a target file size, on your device.",
  squeezeIntro:
    "Drop a folder of images. Squeeze searches for the best quality that still fits your target size, using the same codecs the professionals use. Your files never leave your browser.",
  squeezeFactLocal: "Runs on your device",
  squeezeFactTarget: "Hits your target size",
  squeezeFactBulk: "Takes a whole Batch at once",
  squeezeDropTitle: "Drop images here",
  squeezeDropHint: "or choose files. JPEG, PNG, WebP and AVIF, folders too.",
  squeezeChooseFiles: "Choose files",
  squeezeMode: "Mode",
  squeezeModeTarget: "Target size",
  squeezeModeQuality: "Quality",
  squeezeTargetSize: "Target size",
  squeezeTargetUnit: "KB per image",
  squeezeQuality: "Quality",
  squeezeMaxDimension: "Max dimension",
  squeezeMaxDimensionOff: "Off",
  squeezeMaxDimensionUnit: "px, longest edge",
  squeezeClear: "Clear",
  squeezeDownloadAll: "Download all as ZIP",
  squeezeSaved: defineTranslation("Saved {percent:number}%", {}),
  squeezeSavedTotal: "Saved {amount} in total",
  squeezeImageCount: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} image in the Batch",
        other: "{?} images in the Batch",
      },
    },
  }),
  squeezeDoneCount: defineTranslation("{count:plural}", {
    plural: { count: { one: "{?} done", other: "{?} done" } },
  }),
  squeezeMissCount: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} missed the target",
        other: "{?} missed the target",
      },
    },
  }),
  squeezeRejectedCount: defineTranslation("{count:plural}", {
    plural: {
      count: {
        one: "{?} could not be read",
        other: "{?} could not be read",
      },
    },
  }),
  squeezeProgress: defineTranslation(
    "{done:number} of {total:number} images done",
    {}
  ),
  squeezeStateCompressed: "Compressed",
  squeezeStateUnderTarget: "Already fits",
  squeezeStateMiss: "Target missed",
  squeezeStateRejected: "Not supported",
  squeezeWorking: "Working",
  squeezeDownload: "Download",
  squeezeRemove: "Remove",
  squeezeResized: "Resized",
  squeezeReducedColors: "Colors reduced",
  squeezeOverride: "Target size for this image",
  squeezeOverrideHint: "Empty uses the Batch target size.",
  squeezeProblemUnsupported: "Squeeze does not read this file type.",
  squeezeProblemUnreadable: "Squeeze cannot read this image.",
  squeezeProblemCodecFailed: "The encoder failed on this image.",
  squeezeNoCap:
    "No upload, no signup, no cap. Another compressor has to limit a batch or charge for it; Squeeze cannot, because the work never leaves your device.",
  squeezeAlsoTried:
    "If you have used TinyPNG, Squoosh or iLoveIMG, the caps are what you came here to avoid.",
  // #endregion SQUEEZE
} as const satisfies LanguageMessages;
