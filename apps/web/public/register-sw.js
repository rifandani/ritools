/*
 * Registers the generated service worker before (and independently of) the
 * React bundle. `ReloadPromptSw` registers the same URL again to own the
 * update prompt; the browser resolves a duplicate registration to the same
 * worker, so this only starts the install earlier.
 *
 * Kept as a separate public file instead of an inline script so a strict
 * Content-Security-Policy can still use `script-src 'self'`.
 */
window.addEventListener("load", async () => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch (error) {
    console.error("Service Worker registration error", error);
  }
});
