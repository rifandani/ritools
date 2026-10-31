/** The cookie that remembers whether the app shell sidebar is open. */
export const SIDEBAR_COOKIE = "shell_sidebar_state";

const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/** Only the picker's own `false` closes the sidebar; an absent cookie opens it. */
export const sidebarOpenFromCookie = (value?: string) => value !== "false";

/** Persists the state for the next server render. Browser only. */
export const persistSidebarOpen = (open: boolean) => {
  // oxlint-disable-next-line unicorn/no-document-cookie -- The Cookie Store API is not universal; this is one preference key, written after a press.
  document.cookie = `${SIDEBAR_COOKIE}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`;
};
