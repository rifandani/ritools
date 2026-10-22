import { Context } from "effect";

import type { CodecWorkerPort } from "@/features/squeeze/squeeze";

/**
 * Creates one codec Worker.
 *
 * The browser supplies the real one from `squeeze.worker-client.ts`, and a unit
 * test supplies a fake, so the pool itself needs no Worker to be tested.
 */
export class CodecWorkerFactory extends Context.Service<
  CodecWorkerFactory,
  { readonly create: () => CodecWorkerPort }
>()("@ritools/web/CodecWorkerFactory") {}
