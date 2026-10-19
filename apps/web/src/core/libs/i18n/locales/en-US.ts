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
} as const satisfies LanguageMessages;
