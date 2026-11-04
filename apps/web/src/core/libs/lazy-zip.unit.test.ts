import { strFromU8, unzipSync } from "fflate";
import { expect, it } from "vitest";

import { makeZip } from "./lazy-zip";

it("downloads ZIP support on demand and returns a readable archive stream", async () => {
  const stream = await makeZip([
    { name: "local.txt", input: new TextEncoder().encode("local data") },
  ]);
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  const archive = unzipSync(bytes);
  expect(Object.keys(archive)).toEqual(["local.txt"]);
  expect(strFromU8(archive["local.txt"] ?? new Uint8Array())).toBe(
    "local data"
  );
});
