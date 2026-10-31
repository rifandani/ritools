import { createServerFn } from "@tanstack/react-start";
import { Effect, Option, Schema } from "effect";

import { makeServerFnContract } from "@/core/runtime/server-fn";
import { ServerRequest } from "@/core/runtime/server-request";
import { runServerFn } from "@/core/runtime/server.server";

import { SIDEBAR_COOKIE, sidebarOpenFromCookie } from "./sidebar-state";

const sidebarContract = makeServerFnContract({
  failure: Schema.Never,
  success: Schema.Boolean,
});

const readSidebarOpen = Effect.gen(function* () {
  const request = yield* ServerRequest;
  const cookie = yield* request.getCookie(SIDEBAR_COOKIE);
  return sidebarOpenFromCookie(Option.getOrUndefined(cookie));
});

const getRequestSidebarOpenFn = createServerFn({ method: "GET" }).handler(() =>
  runServerFn(sidebarContract, readSidebarOpen)
);

/**
 * The sidebar state the server renders with, read from the cookie before the
 * first paint. The browser writes the same cookie on a toggle.
 */
export const requestSidebarOpen = sidebarContract.call(() =>
  getRequestSidebarOpenFn()
);
