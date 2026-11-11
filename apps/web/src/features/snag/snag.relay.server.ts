/* oxlint-disable eslint/no-await-in-loop -- Each redirect depends on the answer before it. */
import { isRelayHost, readRelayRequest } from "@/features/snag/snag";

/**
 * The Video Relay (ADR-0039): one same-origin GET that fetches one range of a
 * media stream, or one thumbnail, and streams it back.
 *
 * It keeps nothing and logs nothing. It fetches only HTTPS addresses on the
 * media and thumbnail hosts, follows a redirect only to those hosts, and
 * answers only this site's own pages.
 */

const MAX_REDIRECTS = 3;
const PASSED_TYPE = /^(?:video|audio|image)\/[\w.+-]+$/u;

const NO_STORE = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
} as const;

const refuse = (status: number, upstream?: number): Response =>
  new Response(null, {
    headers:
      upstream === undefined
        ? NO_STORE
        : { ...NO_STORE, "x-snag-upstream": String(upstream) },
    status,
  });

type Fetch = (input: URL, init: RequestInit) => Promise<Response>;

const fetchAllowed = async (
  start: URL,
  signal: AbortSignal,
  send: Fetch
): Promise<Response | null> => {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await send(url, {
      headers: { accept: "*/*" },
      redirect: "manual",
      signal,
    });
    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || location === null) {
      return response;
    }
    await response.body?.cancel();
    const next = new URL(location, url);
    if (next.protocol !== "https:" || !isRelayHost(next.hostname)) {
      return null;
    }
    url = next;
  }
  return null;
};

/** Answers one relay request. `send` is `fetch`, replaced in tests. */
export const answerRelay = async (
  request: Request,
  send: Fetch = fetch
): Promise<Response> => {
  // Only this site's pages may use the relay. A browser always sends this
  // header; a page on another site cannot forge it.
  if (request.headers.get("sec-fetch-site") !== "same-origin") {
    return refuse(403);
  }
  const checked = readRelayRequest(new URL(request.url).searchParams);
  if (!checked.ok) {
    return refuse(checked.status);
  }
  let upstream: Response | null;
  try {
    upstream = await fetchAllowed(checked.upstream, request.signal, send);
  } catch {
    return refuse(502);
  }
  if (upstream === null) {
    return refuse(403);
  }
  if (upstream.status !== 200 && upstream.status !== 206) {
    await upstream.body?.cancel();
    return refuse(502, upstream.status);
  }
  const type = upstream.headers.get("content-type")?.split(";")[0]?.trim();
  const headers = new Headers(NO_STORE);
  headers.set(
    "content-type",
    type !== undefined && PASSED_TYPE.test(type)
      ? type
      : "application/octet-stream"
  );
  const length = upstream.headers.get("content-length");
  if (length !== null) {
    headers.set("content-length", length);
  }
  return new Response(upstream.body, { headers, status: 200 });
};
