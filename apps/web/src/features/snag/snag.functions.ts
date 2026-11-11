import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";

import { makeServerFnContract } from "@/core/runtime/server-fn";
import { runServerFn } from "@/core/runtime/server.server";
import { SnagRefusal, SnagVideo, VideoId } from "@/features/snag/snag";
import { inspectVideo } from "@/features/snag/snag.inspect.server";

const inspectContract = makeServerFnContract({
  failure: SnagRefusal,
  success: SnagVideo,
});

const inspectVideoFn = createServerFn({ method: "POST" })
  .validator(Schema.toStandardSchemaV1(Schema.Struct({ id: VideoId })))
  .handler(({ data }) => runServerFn(inspectContract, inspectVideo(data.id)));

/** The video, its streams, and its thumbnail, read by the server. */
export const inspectVideoLink = (id: VideoId) =>
  inspectContract.call(() => inspectVideoFn({ data: { id } }));
