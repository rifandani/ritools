import { Context, Effect, Option } from "effect";

interface CookieOptions {
  readonly httpOnly?: boolean;
  readonly maxAge?: number;
  readonly path?: string;
  readonly sameSite?: "lax" | "strict" | "none";
  readonly secure?: boolean;
}

interface CookieWrite {
  readonly name: string;
  readonly value: string;
  readonly options: CookieOptions;
}

/**
 * The incoming request of the current server function, and the cookies its
 * response sets. Server-function Effects yield this instead of calling
 * TanStack's request helpers, which read an AsyncLocalStorage that an Effect
 * fiber does not reliably run inside.
 */
export class ServerRequest extends Context.Service<
  ServerRequest,
  {
    readonly getCookie: (name: string) => Effect.Effect<Option.Option<string>>;
    readonly getHeader: (name: string) => Effect.Effect<Option.Option<string>>;
    readonly setCookie: (
      name: string,
      value: string,
      options: CookieOptions
    ) => Effect.Effect<void>;
  }
>()("@heynbord/web/ServerRequest") {}

/**
 * A `ServerRequest` over a snapshot that the handler reads synchronously, while
 * TanStack's request context is current. Cookie writes are collected
 * in `cookieWrites`; the handler applies them when the Effect is done.
 */
export const makeRequestSnapshot = (request: {
  readonly cookies: Readonly<Record<string, string>>;
  readonly headers: Pick<Headers, "get">;
}) => {
  const cookieWrites: CookieWrite[] = [];
  const service = ServerRequest.of({
    getCookie: (name) =>
      Effect.sync(() => Option.fromUndefinedOr(request.cookies[name])),
    getHeader: (name) =>
      Effect.sync(() => Option.fromNullishOr(request.headers.get(name))),
    setCookie: (name, value, options) =>
      Effect.sync(() => {
        cookieWrites.push({ name, options, value });
      }),
  });
  return { cookieWrites, service };
};
