import { Effect } from "effect";
import { Innertube, Utils } from "youtubei.js";

import { SnagRefusal } from "@/features/snag/snag";
import type { SnagVideo, VideoId } from "@/features/snag/snag";
import { refusalOfThrown, videoOf } from "@/features/snag/snag.inspect";
import type { RawVideo } from "@/features/snag/snag.inspect";

/**
 * Asks the video site about one video (ADR-0039).
 *
 * Snag reads with the VisionOS client: the web clients no longer give direct
 * media addresses, and iOS and Android VR can refuse later media bytes.
 * VisionOS gives direct addresses without a player script, so nothing here
 * evaluates code from the video site. The media addresses work only from
 * this server's IP address, which is why the Video Relay carries the bytes.
 *
 * The session holds no account and no cookie. One session serves the process.
 */
let session: Promise<Innertube> | null = null;

const sessionOf = async (): Promise<Innertube> => {
  session ??= Innertube.create({ retrieve_player: false });
  try {
    return await session;
  } catch (error) {
    // The next request tries again with a new session.
    session = null;
    throw error;
  }
};

/** One SnagVideo, or the SnagRefusal that names why there is none. */
export const inspectVideo = (
  id: VideoId
): Effect.Effect<SnagVideo, SnagRefusal> =>
  Effect.tryPromise({
    catch: (error) =>
      new SnagRefusal({
        reason:
          error instanceof Utils.ParsingError
            ? "unplayable"
            : error instanceof Utils.InnertubeError
              ? refusalOfThrown(error.message)
              : "unreachable",
      }),
    try: async () => {
      const innertube = await sessionOf();
      const info: RawVideo = await innertube.getBasicInfo(id, {
        client: "VISIONOS",
      });
      return info;
    },
  }).pipe(
    Effect.flatMap((raw) => {
      const result = videoOf(id, raw);
      return result.ok
        ? Effect.succeed(result.video)
        : Effect.fail(new SnagRefusal({ reason: result.reason }));
    })
  );
