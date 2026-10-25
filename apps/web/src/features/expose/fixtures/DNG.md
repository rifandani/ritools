# Original DNG test images

`linear-raw-le.dng` and `linear-raw-be.dng` are original, generated test images under this repository's MIT licence. They contain a 1 × 1 RGB preview in IFD0, a 32 × 24 unsigned 16-bit LinearRaw image in a SubIFD, orientation 6, and a test Artist field. They contain no photograph or user data. Each file is 5,614 bytes.

SHA-256:

- Little endian: `c1503ffb5c9a2e1d3a0a3f38a1b202ad51a45c5f1286dcd17da9bf0b2f5ec039`
- Big endian: `acee6ad26d3f2c1740683cc01975aedd6d5c849b034ced9220fd790679e7cb05`

LibRaw 0.22.1 through rawpy 0.27.1 reads and renders both files. Unit tests derive damaged files in memory. These small files cover directory handling, identity, and the read-only guard. The app does not ship these test files.

## Embedded JPEG previews

`linear-raw-preview-le.dng` and `linear-raw-preview-be.dng` add an original 24 × 16 FFmpeg test pattern to the corresponding LinearRaw files. The JPEG has EXIF orientation 6. The browser displays it at 16 × 24. The RAW image stays at 32 × 24. These files contain no photograph or user data and use the repository's MIT licence.

Run `python3 apps/web/scripts/expose-fixtures/dng-preview.py` from the repository root to generate them. FFmpeg must be installed. The script changes only the JPEG and RGB preview fixtures.

The reader accepts a complete baseline or progressive 8-bit JPEG in one reduced RGB or YCbCr image strip, or in a JPEG interchange range. It follows validated classic TIFF directory links. Tiled and multiple-strip previews use the unavailable state. Each preview is limited to 16 MiB, 24 million pixels, and 16,384 pixels on either axis. The directory walk is limited to 128 directories and 16,384 entries. Optional directory failures and cycles suppress the preview; they do not invalidate a separately validated RAW image.

## Uncompressed RGB previews

`linear-raw-rgb-le.dng` and `linear-raw-rgb-be.dng` contain six original test pixels in a 2 × 3 reduced RGB image. They use the repository's MIT licence. Their 8-bit RGB samples, single strip, and orientation 6 cover the preview layout found in the Canon sample used to reproduce a missing preview. The PNG preview displays at 3 × 2. The source DNG stays unchanged.

The reader converts only a reduced image with one complete, uncompressed, chunky 8-bit RGB strip. It applies the preview's orientation, or IFD0's orientation when absent, and writes a local PNG. The same byte and dimension bounds apply. RAW samples, planar images, predictors, tiles, and other sample depths remain outside this preview path.
