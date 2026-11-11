import { describe, expect, it, vi } from "vitest";

import { relayUrlOf } from "@/features/snag/snag";
import { answerRelay } from "@/features/snag/snag.relay.server";

const MEDIA = "https://rr1---sn-abc.googlevideo.com/videoplayback?id=1";

const requestOf = (
  path: string,
  site: string | null = "same-origin"
): Request =>
  new Request(`https://ritools.test${path}`, {
    headers: site === null ? {} : { "sec-fetch-site": site },
  });

const media = relayUrlOf(MEDIA, { end: 9, start: 0 });

describe("answerRelay", () => {
  it("streams one range with a safe content type and no caching", async () => {
    const send = vi.fn((_url: URL, _init: RequestInit) =>
      Promise.resolve(
        new Response("0123456789", {
          headers: {
            "content-length": "10",
            "content-type": "video/mp4; codecs=avc1",
            "set-cookie": "a=b",
          },
          status: 200,
        })
      )
    );
    const response = await answerRelay(requestOf(media), send);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("0123456789");
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("content-length")).toBe("10");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url?.searchParams.get("range")).toBe("0-9");
    expect(init?.redirect).toBe("manual");
  });

  it("sends an unknown content type as bytes", async () => {
    const response = await answerRelay(requestOf(media), () =>
      Promise.resolve(
        new Response("x", { headers: { "content-type": "text/html" } })
      )
    );
    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream"
    );
  });

  it.each([null, "cross-site", "same-site", "none"])(
    "refuses a request whose Sec-Fetch-Site is %s",
    async (site) => {
      const send = vi.fn();
      const response = await answerRelay(requestOf(media, site), send);
      expect(response.status).toBe(403);
      expect(send).not.toHaveBeenCalled();
    }
  );

  it("refuses a host outside the allowlist without fetching it", async () => {
    const send = vi.fn();
    const response = await answerRelay(
      requestOf(relayUrlOf("https://example.com/x", { end: 1, start: 0 })),
      send
    );
    expect(response.status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("follows a redirect to another media host", async () => {
    const send = vi
      .fn<(url: URL, init: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        new Response(null, {
          headers: { location: "https://rr2---sn-def.googlevideo.com/v" },
          status: 302,
        })
      )
      .mockResolvedValueOnce(new Response("ok"));
    const response = await answerRelay(requestOf(media), send);
    expect(response.status).toBe(200);
    expect(send.mock.calls[1]?.[0].hostname).toBe(
      "rr2---sn-def.googlevideo.com"
    );
  });

  it("refuses a redirect to another host", async () => {
    const send = vi.fn(() =>
      Promise.resolve(
        new Response(null, {
          headers: { location: "http://169.254.169.254/" },
          status: 302,
        })
      )
    );
    const response = await answerRelay(requestOf(media), send);
    expect(response.status).toBe(403);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("stops after three redirects", async () => {
    const send = vi.fn(() =>
      Promise.resolve(
        new Response(null, {
          headers: { location: "https://rr3.googlevideo.com/loop" },
          status: 302,
        })
      )
    );
    const response = await answerRelay(requestOf(media), send);
    expect(response.status).toBe(403);
    expect(send).toHaveBeenCalledTimes(4);
  });

  it("names the upstream status of a failed fetch", async () => {
    const response = await answerRelay(requestOf(media), () =>
      Promise.resolve(new Response("no", { status: 403 }))
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("x-snag-upstream")).toBe("403");
  });

  it("answers 502 when the network fails", async () => {
    const response = await answerRelay(requestOf(media), () =>
      Promise.reject(new TypeError("fetch failed"))
    );
    expect(response.status).toBe(502);
    expect(response.headers.get("x-snag-upstream")).toBeNull();
  });

  it("answers 400 for a bad range", async () => {
    const response = await answerRelay(
      requestOf(`/api/snag/media?u=${encodeURIComponent(MEDIA)}`),
      vi.fn()
    );
    expect(response.status).toBe(400);
  });
});
