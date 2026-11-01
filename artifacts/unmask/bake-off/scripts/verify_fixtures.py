"""Verify the Unmask fixtures against manifest.json.

Run from the repository root with Pillow:
    python artifacts/unmask/bake-off/scripts/verify_fixtures.py

It checks the bytes, SHA-256, dimensions, GIF frame count, GIF first frame,
BMP first frame, the alpha channel, and the 24 MP rule. It writes
artifacts/unmask/bake-off/fixtures-check.json.
"""

import hashlib
import json
import os
import sys

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
FIXTURES = os.path.join(ROOT, "artifacts", "unmask", "fixtures")
MANIFEST = os.path.join(FIXTURES, "manifest.json")
OUT = os.path.join(ROOT, "artifacts", "unmask", "bake-off", "fixtures-check.json")


def main() -> int:
    manifest = json.load(open(MANIFEST, encoding="utf-8"))
    results = []
    ok = True
    for entry in manifest["fixtures"]:
        path = os.path.join(FIXTURES, entry["file"])
        data = open(path, "rb").read()
        digest = hashlib.sha256(data).hexdigest()
        image = Image.open(path)
        checks = {
            "file": entry["file"],
            "bytes": len(data) == entry["bytes"],
            "sha256": digest == entry["sha256"],
            "width": image.width == entry["width"],
            "height": image.height == entry["height"],
        }
        if entry["file"] == "first-frame.gif":
            checks["frames"] = getattr(image, "n_frames", 1) == 2
            image.seek(0)
            first = image.convert("RGB").tobytes()
            image.seek(1)
            second = image.convert("RGB").tobytes()
            checks["frames_differ"] = first != second
        if entry["file"] == "first-frame.bmp":
            import numpy as np

            bmp = np.asarray(Image.open(path).convert("RGB"), dtype=np.int16)
            gif = Image.open(os.path.join(FIXTURES, "first-frame.gif"))
            gif.seek(0)
            first = np.asarray(gif.convert("RGB"), dtype=np.int16)
            gif.seek(1)
            second = np.asarray(gif.convert("RGB"), dtype=np.int16)
            to_first = float(np.abs(bmp - first).mean())
            to_second = float(np.abs(bmp - second).mean())
            checks["bmp_matches_gif_frame_one"] = to_first < 2.0
            checks["bmp_closer_to_frame_one"] = to_first < to_second
        if entry["file"] == "alpha-input.png":
            alpha = image.convert("RGBA").getchannel("A")
            low, high = alpha.getextrema()
            checks["alpha_has_transparency"] = low == 0 and high == 255
        if entry["file"] == "large-24mp.jpg":
            checks["above_24mp"] = image.width * image.height > 24_000_000
        passed = all(checks.values())
        ok = ok and passed
        results.append({"file": entry["file"], "passed": passed, "checks": checks})
    json.dump({"passed": ok, "fixtures": results}, open(OUT, "w", encoding="utf-8"), indent=2)
    for item in results:
        print(("PASS " if item["passed"] else "FAIL ") + item["file"])
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
