# Expose uses one metadata engine

Expose uses ExifTool 13.59 in `@colorhythm/exiftool-wasm` 1.0.4 for both reads
and writes. This supersedes ADR-0015. One vocabulary and one verification
reader let Expose accept images, PDF, video, audio, and Office files. The first
read must download the engine. Later reads and cleans work offline while the
runtime cache remains present. One session worker serializes engine calls.
The shipped interpreter retains heap pages between operations. After 32
operations, Expose releases the Perl runtime. The worker and WASM bytes stay
cached. This limits runtime lifetime without a file-size cap. Cancellation closes
the worker. A fatal interpreter error closes it and permits one
retry in a fresh worker. A WASM buffer bounds failure is also fatal. Node-only
fixture checks use the package reset API because they have no worker host.

## Engine gate, 2026-10-25

The registry reported 1.0.4 as the latest package. The reproducible probe is
`apps/web/scripts/expose-fixtures/engine-gate.mjs`. The generated PDF reads its
Info dictionary and page count. Removing `PDF:Author` fails with
`Can't load module mro, dynamic loading not available in this perl.` The next
JPEG read fails with `Failed to reset Perl interpreter`. A rebuild was not
available: Docker had no running daemon, and Apple Container was absent.
PDF therefore ships read only with `pdf-clean-unavailable`. No PDF writer or
unproved PDF content digest is enabled. A later engine build must pass both
the write gate and a bounded content check before this changes.

## Container adapters

The C2PA/JUMBF scanner reports manifest presence and claim text. It does not
validate signatures. The DNG inspector accepts only the approved LinearRaw
subset and stays read only. It reports a fixed set of bounded TIFF properties.
Neither adapter loads another metadata engine.

The current Perl build has no `Archive::Zip` support. The OOXML adapter reads
and rewrites only `docProps/core.xml`, `docProps/app.xml`,
`docProps/custom.xml`, and `docProps/thumbnail.jpeg`. It uses namespace-aware
XML parsing with no DTD or entity declarations. It accepts ZIP32 with stored
or Deflate entries, rejects repeated names, encryption, overlapping ranges,
and invalid offsets, and bounds each XML metadata part to 2 MiB and the
thumbnail to 20 MiB. These are adapter bounds, not a universal file-size cap.
The adapter keeps ZIP member order and copies every other compressed member
byte for byte. Unsupported ZIP64 packages fail with a named read error.

## Clean and verification

Fixed, family-aware tag maps own deletion. A rejected tag fails the operation;
it is never dropped for a retry. Empty selections, identical bytes, and selected
groups that do not shrink fail. The receipt keeps any remaining fields visible
and offers a download only when all selected fields are gone and content is
unchanged. Display Metadata stays locked.

Images use the existing payload extractors. MP4/MOV/M4V/M4A compare `mdat`
payloads and sample counts per track. Office compares the ordered non-property
member names, compression method, size, checksum, and compressed data,
including `[Content_Types].xml`. Each digest part has a length prefix. A failed
content check never produces a downloadable result. Fragmented media without
the supported sample tables fails verification. The engine never transcodes.

MP3, WAV, FLAC, OGG/Opus, WebM, MKV, AVI, DNG, and PDF remain read only.
JPEG XL still cannot remove AI Provenance (ADR-0018). PDF and Office explicitly
state that C2PA is not scanned. The 200 MB memory warning remains; no new hard
file-size limit is inferred from small fixtures.

Fixture sources, licences, sizes, and SHA-256 values are in
`apps/web/src/features/expose/fixtures/FILES.json`. New fixtures are generated
locally from CC0 content by `generate.py` and `tag-media.mjs`. Rebuilding the
engine requires the upstream [zeroperl build](https://github.com/colorhythm/zeroperl).

