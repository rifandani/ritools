# PNG may go lossy in Target size mode

In Target size mode, Squeeze may reduce the colours of a PNG, and the row says so. In Quality mode, a PNG stays lossless and only oxipng runs.

PNG has no quality setting, so a size target has no quality ladder to search. Without a lossy lever the only other lever is resolution, which changes the image in a way the user did not ask for, and which still fails on many files. The cost is real: a user who reads "PNG" as exact is surprised, so the Tool must name what it did.

## Consequences

The lever is a uniform quantiser: it cuts the low bits of each channel, at a fixed number of levels per rung, and leaves alpha exact. The output stays 8-bit RGBA, so the saving comes from the smaller colour set and from what PNG's deflate makes of it, not from an indexed-colour stream. A perceptual quantiser, or an indexed palette, would reach a smaller file at the same perceived quality; that is the upgrade path, and it needs a codec this project does not ship yet.
