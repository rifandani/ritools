# Pixel watermark

Expose removes metadata only. It does not remove a Pixel Watermark, and it does not claim to detect one.

## Why this is out of scope

A Pixel Watermark lives in the image pixels, not in the metadata. A Clean removes metadata containers with ExifTool. It cannot reach a mark such as SynthID. SynthID is designed to survive re-encoding, cropping, and screenshots.

Removal is not reliable. A destructive transform can damage the image and still leave the mark. A removal feature would need a detector to measure its success rate. SynthID has no open local detector that Expose can ship. ADR-0007 requires every Tool to work on local data only, so a hosted detector is not an option.

Removal also hides AI origin. That conflicts with the honesty stance and with the promise that every claim is verifiable. Detection carries a weaker form of the same problem. A presence claim needs the exact scheme, a detector that works on the device, and a measured false-positive rate. Expose has none of these.

The page states the limit in three places: the honesty box, the FAQ, and the comparison table. The comparison row "Keeps the pixels" says that a Clean leaves the pixel payload unchanged. It makes no removal claim.

If a local, verifiable detector becomes available, the correct next step is a new decision issue. That issue must name the scheme, the sample set, and the measured false-positive rate. That is a new design, not a change to this one.

## Prior requests

- #12: "[Decision] Expose: handle pixel watermarks (detect or remove?)"
