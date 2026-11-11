import { server } from "@test/msw";
import { Effect, Schema } from "effect";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { CHUNK_BYTES, VideoId } from "@/features/snag/snag";
import { answerRelay } from "@/features/snag/snag.relay.server";
import { fetchStream, SaveError } from "@/features/snag/snag.save";

const ID = VideoId.make("yh5IAUow4Hc");
const BYTES = CHUNK_BYTES + 1024;
const MEDIA = "https://rr1.googlevideo.com/videoplayback";
const PlayerRequest = Schema.Struct({
  context: Schema.Struct({
    client: Schema.Struct({ clientName: Schema.String }),
  }),
});

describe("Snag download", () => {
  it.each(["audio", "video"] as const)(
    "downloads all %s ranges without an expired-address error",
    async (kind) => {
      // youtubei.js captures fetch at module load. Load it after MSW starts.
      const { inspectVideo } =
        await import("@/features/snag/snag.inspect.server");
      const refresh = vi.fn(async () => {
        const fresh = await Effect.runPromise(inspectVideo(ID));
        const stream = fresh.streams.find((item) => item.kind === kind);
        if (stream === undefined) {
          throw new SaveError("expired");
        }
        return stream;
      });
      server.use(
        http.get("https://www.youtube.com/sw.js_data", () =>
          HttpResponse.text(
            `)]}'\n${JSON.stringify([[null, null, [[["en", "US"]], "test-key"]]])}`
          )
        ),
        http.post("https://www.youtube.com/youtubei/v1/config", () =>
          HttpResponse.json({})
        ),
        http.post(
          "https://www.youtube.com/youtubei/v1/player",
          async ({ request }) => {
            const body = Schema.decodeUnknownSync(PlayerRequest)(
              await request.json()
            );
            const client = body.context.client.clientName;
            return HttpResponse.json({
              playabilityStatus: { status: "OK" },
              videoDetails: {
                videoId: ID,
                title: "Public test video",
                author: "Test",
                lengthSeconds: "300",
              },
              streamingData: {
                adaptiveFormats: [
                  {
                    itag: 140,
                    mimeType: 'audio/mp4; codecs="mp4a.40.2"',
                    bitrate: 128_000,
                    audioQuality: "AUDIO_QUALITY_MEDIUM",
                    contentLength: String(BYTES),
                    url: `${MEDIA}?c=${client.toUpperCase()}&itag=140`,
                  },
                  {
                    itag: 160,
                    mimeType: 'video/mp4; codecs="avc1.4d400c"',
                    bitrate: 100_000,
                    width: 256,
                    height: 144,
                    qualityLabel: "144p",
                    contentLength: String(BYTES),
                    url: `${MEDIA}?c=${client.toUpperCase()}&itag=160`,
                  },
                ],
              },
            });
          }
        ),
        http.get("https://web.test/api/snag/media", ({ request }) => {
          const headers = new Headers(request.headers);
          headers.set("sec-fetch-site", "same-origin");
          return answerRelay(new Request(request, { headers }));
        }),
        http.get(MEDIA, ({ request }) => {
          const url = new URL(request.url);
          const [start, end] = (url.searchParams.get("range") ?? "")
            .split("-")
            .map(Number);
          // iOS refuses later bytes; Android VR also refuses video bytes.
          const client = url.searchParams.get("c");
          const restricted =
            client === "IOS" ||
            (client === "ANDROID_VR" && url.searchParams.get("itag") === "160");
          if (restricted && (end ?? 0) >= 262_144) {
            return new HttpResponse(null, { status: 403 });
          }
          return new HttpResponse(
            new Uint8Array((end ?? 0) - (start ?? 0) + 1),
            {
              headers: { "content-type": "audio/mp4" },
            }
          );
        })
      );

      const previousLocation = Object.getOwnPropertyDescriptor(
        globalThis,
        "location"
      );
      Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: new URL("https://web.test/snag"),
      });
      try {
        const video = await Effect.runPromise(inspectVideo(ID));
        const stream = video.streams.find((item) => item.kind === kind);
        expect(stream).toBeDefined();
        if (stream === undefined) {
          return;
        }
        await expect(
          fetchStream(stream, {
            onBytes: () => {},
            refresh,
            signal: new AbortController().signal,
          })
        ).resolves.toHaveProperty("size", BYTES);
        expect(refresh).not.toHaveBeenCalled();
      } finally {
        if (previousLocation === undefined) {
          Reflect.deleteProperty(globalThis, "location");
        } else {
          Object.defineProperty(globalThis, "location", previousLocation);
        }
      }
    }
  );
});
