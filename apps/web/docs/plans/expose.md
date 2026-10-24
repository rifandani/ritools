# Expose — confirmed brief and shape

Status: **confirmed** (2026-10-23). Stage 3 of the Ritools redesign.
Target: `apps/web`, route `src/routes/expose.tsx`, feature `src/features/expose/`.
Mode: **Operate**. World: **Ransom Calling Card**, unchanged.

> **Amendment (2026-10-23).** The explainer table is now a comparison table against Jimpl, Metadata2Go, and Image Scrubber. This supersedes the "no competitor names, no comparison table" lines in §1, §5, and §9. Every limit carries a checked date and a source link. The honesty box and the FAQ still state what Expose cannot do.

> **Amendment (2026-10-24).** Expose accepts a **Batch**. This supersedes "One file per session" in §3, §5, §7.1, and §9, "Batch cleaning" and "a batch queue, a folder" in §9 (but not "a watch folder"), the `exposeOneFile` copy, and the "One file" cell in the comparison table. One file keeps the Redaction Desk. Two or more files use a batch list with one shared Clean Preset, one Cleaned File and Verification per file, and a per-file or one-ZIP download. The Batch has no count cap; Expose warns once above 1 GB total and isolates a failed file. One engine Worker runs per clean run, not per file. See ADR-0019. The batch list, its states, and its copy are specified in #9.
>
> The changed copy: `exposeEmptyTitle` "No images yet."; `exposeEmptyBody` "Drop images or a folder, or open a Sample Image. Expose reads the metadata before it changes anything."; `exposeDropHint` "… One file or a folder."; `exposeChooseFile` "Choose files"; new `exposeChooseFolder` "Choose a folder"; `exposeRowBulk` "Batch"; `exposeValueOneFile` becomes `exposeValueManyFiles` "Many files"; `exposeOneFile` "One file or a whole folder."

This issue fixes the surface, the engine seam, the Sample Images, the copy, the format support matrix, and the page structure. It writes no production code.

Confirmed decisions from the issue:

1. **Name and route.** Expose, at `/expose`. The page title is "Expose — EXIF metadata viewer and remover". The title and meta description carry "EXIF" for search.
2. **Scope.** Images only, all eight ExifReader formats. Video, PDF, and Office files are out of scope.
3. **One file per session.** No batch. Squeeze owns batch work.
4. **Engines.** ExifReader reads. ExifTool in WebAssembly cleans, behind a lazy-loaded engine.
5. **Map.** The Offline Locator. No tiles, no reverse geocoding, no external map link.
6. **Removal model.** Removal is by Metadata Group. Display Metadata is locked and kept.
7. **Presets.** AI only, Personal, Everything, Custom. Selection is at group level only.
8. **Verification.** Every clean shows what will be removed and what will be kept. After the clean, Expose reads the Cleaned File again and reports the remaining fields, split into the selected groups and the kept groups.
9. **Honesty.** Expose removes metadata only. It does not remove Pixel Watermarks, and it does not claim to detect AI-generated images. It reports AI Provenance.
10. **Download.** Expose never overwrites the input. It downloads a new file.
11. **Default preset.** AI only. It is the least destructive preset and the Tool's distinctive job. The user opts into more.
12. **GIF and JPEG XL exceptions.** GIF reads image details and C2PA presence, and cleans AI Provenance only when a manifest is present. JPEG XL reads the full report but cannot remove its C2PA Manifest. The matrix names both. See ADR-0018.

---

## 1. Brief

### Job and audience

A person has an image they are about to send, publish, or upload, and they want to know what is inside it before someone else does. They may be a seller posting a photo of an item at home, a journalist checking a source image, a designer checking a client's export, or anyone who has heard that a photo can carry a GPS point, a camera serial number, or an AI manifest. They are not necessarily technical, and they will not install a desktop tool or make an account for one file.

The author is the first user and the standard: Expose must be good enough that he stops reaching for a desktop metadata viewer and a separate cleaner.

### Outcome and proof

Primary task: open one image, read the Metadata Report, choose a Clean Preset or Custom groups, press **Clean**, read the Verification, and download the Cleaned File.

Success: the report is readable without knowing a single tag name; the GPS point, the AI Provenance, and the thumbnail are visible before any clean; the clean panel states exactly what will be removed and what will stay; the Verification proves the result with a second read; the whole flow works with the keyboard alone; both Locales carry every string.

Proof: the named engines (ExifReader and ExifTool), the real Sample Images, the container badges, the field counts, the second read, the payload hash, and the local-only path. No testimonials, benchmarks, or competitor claims.

### Selected direction

The established **Ransom Calling Card** world. Palette, type, angles, motion grammar, and tokens are fixed. The signature composition is **The Redaction Desk**:

- the image is the **exhibit**;
- the Metadata Report is the **case file**, ruled into ten groups;
- the Clean Preset is the **redaction order**, stamped in red;
- the Verification is the **second read**, printed as a receipt.

The desk replaces the metadata-tool default: a centered file card over a wall of monospace tags. It is specific to the two verbs Expose performs: read, then remove. The surface brief carries the direction contract.

### Scope and boundaries

- `/expose` and `src/features/expose/` only. The shared shell does not change.
- Images only: JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, GIF.
- One file per session. No batch, no queue, no folder.
- No per-field removal. The selection is a Metadata Group.
- No video, PDF, or Office files. The page promises image files only.
- No ICC-profile or orientation removal. Display Metadata stays (ADR-0017).
- No reverse geocoding and no map tiles (ADR-0016).
- No Pixel Watermark removal, no AI-generated-pixel detection, no C2PA signature validation.
- No application code in this stage. No engine implementation.
- The below-the-Tool explainer is Ritools copy only. No competitor names, no comparison table.

### Interaction and layout, in brief

The empty page is a masthead, a drop zone, and two Sample Image actions. A file opens into the desk: the exhibit at left, the case file in the middle, the redaction order at right. The case file has **Report** and **Raw** views. The Report groups every Metadata Field by Metadata Group and counts it; the Raw view is the flat list with a filter. The Offline Locator and the AI evidence sit with the exhibit, because they are facts about the file, not groups to remove.

The redaction order offers four Clean Presets, a Custom selection, the remove and keep lines, the Display lock, the engine note, and the **Clean** mark. The Clean mark is the only red action mark on the page. While the engine loads and the clean runs, the mark becomes **Cancel**, and a printed progress line reports the engine download and the work. After the clean, the order is replaced by the Verification receipt and the Download mark.

### Constraints

- WCAG 2.2 AA in both colour modes, 390 px to 1440 px.
- Keyboard alone completes the flow. The drop zone is a button, not a drag-only target.
- Every count, byte size, coordinate, and percentage uses the one numerals face in fixed columns.
- Every state reads by text and shape, never by colour alone.
- Ransom only on "Expose". The outcome words use the Poster Title voice. The design rule reserves Ransom for names and the Squeeze outcome words.
- Controls are the standard React Aria components in `src/core/components/ui`.
- Copy uses the glossary terms exactly: Metadata, EXIF, Metadata Field, Metadata Group, Metadata Report, Display Metadata, AI Provenance, C2PA Manifest, JUMBF, Maker Note, Clean, Clean Preset, Cleaned File, Verification, Pixel Watermark, Sample Image, Offline Locator.
- No file bytes or metadata leave the device. No upload endpoint, no analytics on file content.
- The viewer loads ExifReader only. The cleaner loads ExifTool on demand and caches it offline.
- No hard file-size cap. Warn above 200 MB; a memory failure is a named error.
- The Sample Images are licensed for redistribution and ship with a notice.

---

## 2. Engine seam

The seam has five parts: `read`, `clean`, `CleanPreset`, `MetadataGroup`, and the named errors. The supporting report types are part of those five; they are not a sixth surface.

### Rules

1. **Two operations.** The UI calls `read` and `clean`. Nothing else.
2. **No library types cross the seam.** No ExifReader tag object, no ExifTool tag name, no `Tag`, `description`, `value` triple, no WASM handle, no worker message.
3. **The UI owns no writer.** The UI never builds an ExifTool argument, never touches a container, and never guesses a format's cleanliness.
4. **The engine owns the file name.** `clean` returns the Cleaned File name, `stem-clean.ext`.
5. **The report is semantic.** Every field is already classified into a Metadata Group and a container family, with a human label and a formatted text value.
6. **Counts are facts, not estimates.** The report counts fields per group. The clean summary uses those counts.
7. **The clean re-reads the input.** It does not trust a report or a count from the UI. It also re-reads the output for Verification.
8. **Cancellation is a named state.** Effect interruption stops the worker; the service maps it to `cancelled`.
9. **The seam is a Layer.** The UI consumes `ExposeEngine`; tests provide a fake Layer with fixtures.

### The types

The names are the public seam. Everything below is the shape the engine issue implements; supporting types are part of the report model, not a licence to expose a library.

```ts
import { Context, Effect, Schema } from "effect";

/* ------------------------------------------------------------------------- */
/* Vocabulary                                                                */
/* ------------------------------------------------------------------------- */

/** The ten Metadata Groups. Display is locked and never removable. */
export const MetadataGroup = Schema.Literals([
  "ai-provenance",
  "location",
  "time",
  "device-identity",
  "camera-settings",
  "authorship",
  "software-history",
  "thumbnails",
  "other-text",
  "display",
]);
export type MetadataGroup = typeof MetadataGroup.Type;

/** The four Clean Presets. Custom carries the user's group selection. */
export const CleanPreset = Schema.Literals([
  "ai-only",
  "personal",
  "everything",
  "custom",
]);
export type CleanPreset = typeof CleanPreset.Type;

/** The eight image formats ExifReader reads. */
export const ImageFormat = Schema.Literals([
  "jpeg",
  "jxl",
  "tiff",
  "png",
  "heic",
  "avif",
  "webp",
  "gif",
]);
export type ImageFormat = typeof ImageFormat.Type;

/** The container family a field came from. A family, not a library tag. */
export const MetadataContainer = Schema.Literals([
  "exif",
  "gps",
  "iptc",
  "xmp",
  "icc",
  "mpf",
  "makernote",
  "c2pa",
  "file",
]);
export type MetadataContainer = typeof MetadataContainer.Type;

/** Every named failure. There is no unnamed throw across the seam. */
export const ExposeErrorCode = Schema.Literals([
  "unsupported-format",
  "unreadable-file",
  "clean-not-supported",
  "engine-unavailable",
  "engine-failed",
  "too-large",
  "cancelled",
]);
export type ExposeErrorCode = typeof ExposeErrorCode.Type;

/* ------------------------------------------------------------------------- */
/* Input and read report                                                     */
/* ------------------------------------------------------------------------- */

/** One file. The engine sniffs the bytes; `type` and `name` are hints only. */
export interface ExposeSource {
  readonly bytes: Blob;
  readonly lastModified: number;
  readonly name: string;
  readonly type: string;
}

/** What the image is, independent of its metadata. */
export interface ImageFacts {
  readonly bytes: number;
  readonly format: ImageFormat;
  /** Null when the format does not report a frame count. */
  readonly frames: number | null;
  readonly height: number;
  readonly mime: string;
  readonly name: string;
  /** The EXIF orientation value, or 1 when the file has none. */
  readonly orientation: number;
  readonly width: number;
}

/**
 * One Metadata Field.
 *
 * `id` is an engine-owned stable key. It is not an ExifReader property name.
 * `value` is plain text and is always rendered as text, never as HTML.
 * Binary payloads (ICC, thumbnail, C2PA) are summarised as a label and a
 * size, never dumped as text. The thumbnail is in `Thumbnail`; the manifest
 * is in `AiProvenance`.
 */
export interface MetadataField {
  readonly container: MetadataContainer;
  readonly group: MetadataGroup;
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

/** One group's count and whether this format can remove it. */
export interface MetadataGroupReport {
  readonly containers: readonly MetadataContainer[];
  readonly count: number;
  readonly group: MetadataGroup;
  readonly removability: "removable" | "display" | "format";
}

/** A decimal GPS point, clamped to valid ranges. */
export interface GpsPoint {
  readonly altitudeMeters: number | null;
  readonly latitude: number;
  readonly longitude: number;
}

/** The C2PA evidence. Presence and size, never a validity claim. */
export interface C2paEvidence {
  readonly bytes: number;
  readonly claimGenerator: string | null;
  readonly hasThumbnail: boolean;
  readonly manifests: number;
  readonly claimedSigner: string | null;
}

/** One generation parameter read from the C2PA Manifest, as text. */
export interface AiParameter {
  readonly label: string;
  readonly value: string;
}

/** AI Provenance outside the C2PA Manifest, such as an XMP source type. */
export interface AiSignal {
  readonly container: MetadataContainer;
  readonly label: string;
  readonly value: string;
}

export interface AiProvenance {
  readonly c2pa: C2paEvidence | null;
  readonly digitalSourceTypes: readonly string[];
  readonly generationParameters: readonly AiParameter[];
  readonly signals: readonly AiSignal[];
}

/** An embedded preview. `data` is a Blob, never a base64 tag value. */
export interface Thumbnail {
  readonly bytes: number;
  readonly data: Blob;
  readonly height: number;
  readonly mime: string;
  readonly source: "exif" | "mpf" | "c2pa";
  readonly width: number;
}

export interface ReadCounts {
  readonly fields: number;
  readonly groups: number;
  readonly kept: number;
  readonly removable: number;
}

/**
 * A fact the UI must show beside the report. Codes are translated; `detail`
 * is developer-only and never printed.
 */
export type ReadNoteCode =
  | "maker-note"
  | "c2pa-unparsed"
  | "jxl-brotli"
  | "icc-not-read"
  | "gif-details-only"
  | "tiff-no-file-details";

export interface ReadNote {
  readonly code: ReadNoteCode;
  readonly detail: string | null;
}

export interface ReadReport {
  readonly ai: AiProvenance;
  readonly counts: ReadCounts;
  readonly facts: ImageFacts;
  readonly fields: readonly MetadataField[];
  readonly gps: GpsPoint | null;
  readonly groups: readonly MetadataGroupReport[];
  readonly notes: readonly ReadNote[];
  readonly thumbnail: Thumbnail | null;
}

/* ------------------------------------------------------------------------- */
/* Clean                                                                     */
/* ------------------------------------------------------------------------- */

/** The phases a clean reports. */
export type CleanPhase = "loading-engine" | "cleaning" | "verifying";

export interface CleanProgress {
  readonly loadedBytes: number | null;
  readonly percent: number | null;
  readonly phase: CleanPhase;
  readonly totalBytes: number | null;
}

/**
 * The resolved selection. The UI resolves a preset to groups; the engine
 * validates it. `display` is never accepted here.
 */
export interface CleanRequest {
  readonly groups: readonly MetadataGroup[];
  readonly preset: CleanPreset;
  /** Host-only progress sink. It never crosses the worker boundary. */
  readonly report?: (progress: CleanProgress) => void;
}

export interface GroupChange {
  readonly after: number;
  readonly before: number;
  readonly group: MetadataGroup;
}

export interface CleanedFile {
  readonly bytes: Uint8Array;
  readonly name: string;
  readonly type: string;
}

export interface Verification {
  readonly c2pa: {
    readonly afterBytes: number;
    readonly beforeBytes: number;
  };
  readonly display: GroupChange;
  readonly kept: readonly GroupChange[];
  readonly payload: {
    readonly afterHash: string;
    readonly beforeHash: string;
    readonly unchanged: boolean;
  };
  /** The second read of the Cleaned File. */
  readonly read: ReadReport;
  readonly selected: readonly GroupChange[];
}

export type CleanWarningCode =
  | "maker-note-removed"
  | "c2pa-not-validated"
  | "format-limit";

export interface CleanWarning {
  readonly code: CleanWarningCode;
  readonly detail: string | null;
  readonly group: MetadataGroup | null;
}

export interface EngineFacts {
  readonly name: string;
  readonly version: string;
}

export interface CleanResult {
  readonly engine: EngineFacts;
  readonly file: CleanedFile;
  readonly kept: readonly GroupChange[];
  readonly removed: readonly GroupChange[];
  readonly verification: Verification;
  readonly warnings: readonly CleanWarning[];
}

/* ------------------------------------------------------------------------- */
/* Errors and service                                                        */
/* ------------------------------------------------------------------------- */

export class ExposeError extends Schema.TaggedError<ExposeError>()(
  "ExposeError",
  {
    code: ExposeErrorCode,
    detail: Schema.String,
    format: Schema.optional(ImageFormat),
    group: Schema.optional(MetadataGroup),
  }
) {}

export interface ExposeEngineShape {
  readonly read: (
    source: ExposeSource
  ) => Effect.Effect<ReadReport, ExposeError>;
  readonly clean: (
    source: ExposeSource,
    request: CleanRequest
  ) => Effect.Effect<CleanResult, ExposeError>;
}

export class ExposeEngine extends Context.Service<
  ExposeEngine,
  ExposeEngineShape
>()("@ritools/web/ExposeEngine") {}
```

### The two operations

**`read(source)`**

1. Sniff the format from the bytes. Never trust `name` or `type`. A format outside the eight is `unsupported-format`.
2. Read with ExifReader, `expanded: true`, `async: true`, `computed: true`. Pass a DOM parser in the worker (for XMP) and a Brotli decompressor for JPEG XL where the environment lacks one.
3. Scan the container for a C2PA Manifest and parse its manifest JSON (not its signature). Record presence, bytes, manifests, claim generator, claimed signer label, actions, source types, generation parameters, and whether the manifest carries a thumbnail.
4. Classify every field into one Metadata Group and one container family. Drop the library's tag names, property objects, and raw value shapes.
5. Format the GPS point to decimals, clamp latitude to −90…90, longitude to −180…180, and altitude to a finite number.
6. Extract the thumbnail as bytes, with its MIME type and dimensions.
7. Count fields per group and in total. Return all ten group reports in glossary order, including groups with 0 fields; `counts.groups` counts only groups with at least one field. Mark a group `format` when the file contains the fields but its format cannot clean them (JPEG XL + AI Provenance).
8. Add the notes the page must show: Maker Note present, C2PA present but not parsed, JPEG XL Brotli fallback, ICC not read, GIF details only, TIFF file details absent.
9. Return a `ReadReport`. The viewer path never imports the cleaner.

**`clean(source, request)`**

1. Re-read the source. Reject a request that contains `display`.
2. Load the ExifTool WebAssembly on demand. Report `loading-engine` with bytes and percent. If the engine is not cached and the browser is offline, fail `engine-unavailable`.
3. Remove exactly the selected groups with the curated group-to-tag mapping. Remove `JUMBF:all` for AI Provenance. Remove a whole Maker Note when the selection touches one, and add a warning. Never remove ICC, orientation, or dimension fields.
4. Return the Cleaned File bytes and a name. The input is untouched.
5. Read the Cleaned File again with ExifReader and scan it for C2PA. Compare the image payload hashes. Report the remaining fields in the selected groups, the kept groups, and Display Metadata; the C2PA presence and bytes; and whether the payload changed.
6. Return the `CleanResult`. If the payload changed, the UI refuses the download and names it. The engine does not silently deliver a changed image.

### Preset resolution

The UI resolves a Clean Preset to Metadata Groups before it calls `clean`. The engine validates the list and ignores groups with 0 fields.

| Clean Preset | Metadata Groups |
| --- | --- |
| AI only | AI Provenance |
| Personal | Location, Time, Device identity, Authorship, Thumbnails and previews |
| Everything | AI Provenance, Location, Time, Device identity, Camera settings, Authorship, Software and edit history, Thumbnails and previews, Other text |
| Custom | The groups the user checks |

Display is never in a request. `Everything` never includes Display, and the engine rejects a request that does.

### The named errors

| Code | When | UI state |
| --- | --- | --- |
| `unsupported-format` | The bytes are not one of the eight formats. | Unsupported format |
| `unreadable-file` | The format is known but the file is damaged, truncated, or fits no container. | Read error |
| `clean-not-supported` | The format cannot remove a requested group without changing the image (JPEG XL + AI Provenance), or the format is not cleanable (none today, but the state exists). | Clean not supported |
| `engine-unavailable` | The cleaner is not cached and the browser is offline, or the runtime refuses WebAssembly. | Engine offline |
| `engine-failed` | The cleaner loads but fails, or returns no output. | Clean error |
| `too-large` | The device cannot allocate the file or the clean. | Large-file warning becomes an error |
| `cancelled` | The user cancels, or Effect interrupts the work. | Cancelled |

`detail` is a developer string. The UI never prints it. The UI maps `code` (plus `format` and `group`) to the copy contract, so every failure is named in both Locales.

### The worker boundary

- `ExposeEngine` is a `Context.Service`. The Layer starts one worker on first use. The read path and the clean path are separate messages.
- The worker owns ExifReader and ExifTool. Neither is imported by the page, the route, or the viewer components.
- `read` posts `{ kind: "read", id, bytes }` and receives a report. It never sends a URL or a path; only bytes.
- `clean` posts `{ kind: "clean", id, bytes, preset, groups }` and receives progress and a result. The host keeps `request.report` and forwards each progress event to it; the callback never crosses the worker boundary.
- Effect interruption terminates the worker. The next call starts a fresh worker. An interrupted clean never answers the next clean.
- The cleaner module is a dynamic import inside the worker. A build test asserts that the viewer chunk does not contain the ExifTool package or the WASM.
- The WASM file is cached at runtime after the first load, through the existing codec cache route. It is never precached.

### What the seam deliberately does not expose

- ExifReader tag names, tag objects, `description` strings, or the shape of `tags.exif`.
- ExifTool arguments, group names, tag names, or the `-JUMBF:all` mechanism.
- The worker protocol, the WASM file, or the engine's version beyond `EngineFacts`.
- Raw metadata bytes, except the thumbnail Blob and the C2PA byte count.
- HTML. Every value is text.
- A validity claim about the C2PA signature, or an AI-detection score.

### Internal mapping (not the seam)

- **ExifReader groups** map to containers: `exif` and `gps` to EXIF/GPS; `iptc` to IPTC; `xmp` to XMP; `icc` to ICC; `mpf` to MPF; `makerNotes` to Maker Note; `file`, `jfif`, `png`, `riff`, and `gif` to File.
- **C2PA** is a container scan over JPEG APP11, PNG `caBX`, TIFF, WebP RIFF, HEIC/AVIF ISO BMFF, JXL ISO BMFF, and GIF application extensions. It parses the manifest JSON but does not validate the claim signature.
- **ExifTool cleaning** uses a curated table from each Metadata Group to group-qualified tags. It never removes `ICC_Profile`, `Orientation`, `ImageWidth`, `ImageHeight`, `PixelXDimension`, or `PixelYDimension`. AI Provenance uses `-JUMBF:all=`. A Maker Note uses `-MakerNotes:all=` plus the warning. The wrapper receives bytes and arguments as data, never as a shell string; a file name never starts an argument.
- **Verification** reads the Cleaned File with the same `read` path, then compares the payload hash from the engine's format-aware payload digest. The UI receives `payload.unchanged`, not the algorithm.

### Test obligations the engine issue inherits

- A UI type test imports `ExposeEngineShape` and fails if it sees an ExifReader or ExifTool type.
- A fake `ExposeEngine` Layer drives every component test and the route e2e, so the UI never needs the real WASM.
- Every `ExposeErrorCode` has a test that reaches it.
- The report never contains a raw ExifReader tag object or a library tag name. A fixture test walks the report and asserts the field keys are only `id`, `label`, `value`, `group`, `container`.
- `read` works for all eight formats. `clean` works for every cleanable group. The matrix in §4 is the acceptance table.
- A clean with `payload.unchanged === false` is a failure, not a success with a warning.
- The viewer build does not include the cleaner. A bundle test asserts the absence.

---

## 3. Sample Images

### The set

Both files live in `apps/web/public/samples/expose/` and ship unmodified. Only the file names changed; the SHA-256 values prove the bytes. The full notice is `apps/web/public/samples/expose/NOTICE.txt`, served with the files.

| Shipped file | Bytes | SHA-256 | What it proves | Licence |
| --- | ---: | --- | --- | --- |
| `camera-nikon-z9-c2pa.jpg` | 1,530,098 | `721e75362ccc4ff943f5140ebc89897aa501d056cfb0dc7a6aeb68382e412cc5` | A real camera JPEG with EXIF, GPS, a 160×120 thumbnail, and a real C2PA Manifest. | CC BY-SA 4.0 |
| `ai-firefly-c2pa.jpg` | 1,047,024 | `bdc5c19d4211d9c9f9f8dce5bf4e4dec29e9b32e308ff12a60979481e928154f` | A real AI-generated JPEG with generation parameters and a real C2PA Manifest. | MIT |

**Camera sample facts.** 4128×2752. Nikon Z 9, NIKKOR Z 24-70mm f/4 S, ISO 100, f/4, 1/80 s, 2022-10-25 11:27:32. Artist: Andy Parsons. Copyright: Adobe, Inc. GPS 40.736435, −73.99316, altitude 174 m. 160×120 JPEG thumbnail. C2PA claim generator `Nikon_Z_9_Sample_for_Adobe_MAX_2022` (c2pa-rs/0.14.0).

**AI sample facts.** 2304×1792. No EXIF, no camera fields, no GPS, no EXIF thumbnail. C2PA claim generator `Adobe_Firefly`. `c2pa.created` with `softwareAgent` Adobe Firefly, `com.adobe.firefly.version` `4.0.0-release-firefly_v4-main_78135.80468`, `com.adobe.firefly.operation` `text_to_image`, and `digitalSourceType` `trainedAlgorithmicMedia`. Claimed signer: Adobe Inc. The manifest carries its own thumbnail.

### Provenance and licences

- **Camera:** `c2pa-org/public-testfiles`, commit `22beccc075707475b038d8789d0136c009e43143`, `legacy/1.4/image/jpeg/nikon-20221019-building.jpeg`. Photo by Andy Parsons; copyright Adobe, Inc.; C2PA Manifest generated by Nikon_Z_9_Sample_for_Adobe_MAX_2022. The repository is CC BY-SA 4.0; the attribution and licence link ship in `NOTICE.txt`.
- **AI:** `contentauth/example-assets`, commit `c37f93e115289ac1ef00f899a860e6e08ab9886f`, `images/Firefly_tabby_cat.jpg`. Generated by Adobe Firefly; C2PA Manifest signed by Adobe Inc.; distributed by the Content Authenticity Initiative under the MIT License.

The exact provenance lines the UI prints:

> **Camera sample:** Andy Parsons / Adobe, CC BY-SA 4.0, via the C2PA public test files. C2PA Manifest generated by Nikon Z 9 for Adobe MAX 2022.

> **AI sample:** Adobe Firefly, via the Content Authenticity Initiative (MIT). C2PA Manifest signed by Adobe Inc.

They appear in the explainer's disclaimer line. The same text, with the source paths, commits, hashes, and the full MIT notice, is in `NOTICE.txt`.

### Offline and size

- The files are same-origin app assets. No third-party request is made for a sample.
- Both files are under Workbox's 2 MiB per-file precache ceiling, so the build precaches them. The total install cost is 2,577,122 bytes (2.58 MB decimal, 2.46 MiB).
- If a measured install budget objects, move them to the runtime cache and state "works offline after the first view" instead. Do not raise the 2 MiB ceiling.
- The Sample Image actions read the same `ExposeSource` shape as a dropped file. There is no special sample path in the engine.

### Why these two

The pair covers both ends of the Tool. The camera sample proves that Expose can read the metadata a normal person is worried about (GPS, camera, time, authorship, thumbnail) and that AI only leaves those fields in place. The AI sample proves that Expose can find and remove AI Provenance that has no camera metadata to hide behind. Both carry genuine C2PA Manifests, so the AI evidence card and the JUMBF removal are tested against real bytes, not a fixture we signed ourselves.

The pair does not prove the other six formats. The engine issue adds one fixture per format; those fixtures are tests, not Sample Images, and need not be licensed for redistribution beyond the repository's test policy.

---

## 4. Format support matrix

Sources: the ExifReader README support table and the ExifTool 13.59 supported-file-types table, both read on 2026-10-23. The engine issue verifies the matrix against the real writer and must not change it silently.

### Legend

- **Read — full:** Exif, GPS, XMP, IPTC (where the format carries it), ICC (where readable), Maker Note, thumbnail, and image details.
- **Read — partial:** image details plus the named containers; some containers are absent from the format or not read by ExifReader.
- **Clean — full:** every removable Metadata Group can be removed without changing the image payload.
- **Clean — partial:** the named groups cannot be removed; the rest can.
- **Clean — none:** the format is read but no group is cleanable. No row uses it today; if the engine spike finds one, the matrix changes in review, not silently.

### The matrix

| Format | Extensions | Read | Clean | Readable groups | Cleanable groups | Notes and named state |
| --- | --- | --- | --- | --- | --- | --- |
| **JPEG** | `.jpg`, `.jpeg`, `.jpe` | full | full | All ten | All nine removable groups | C2PA/JUMBF is deletable. MPF and EXIF thumbnails. Maker Notes. The reference format. |
| **JPEG XL** | `.jxl` | full | partial | All ten, with ICC limited | Eight; not AI Provenance | ExifTool writes EXIF and XMP in JXL but has no C2PA support, so the manifest stays. IPTC is absent. ICC in the codestream is not read. Brotli metadata needs a decompressor. `clean-not-supported` for AI only and Everything. ADR-0018. |
| **TIFF** | `.tif`, `.tiff` | full | full | All ten | All nine removable groups | C2PA/JUMBF is deletable. Dimensions come from the TIFF IFD, not from a browser decode. |
| **PNG** | `.png` | full | full | All ten | All nine removable groups | C2PA/JUMBF is deletable. Dimensions and ICC are in PNG chunks. |
| **HEIC/HEIF** | `.heic`, `.heif`, `.hif` | full | full | All ten | All nine removable groups | IPTC is not a native block; it is read from Exif. C2PA/JUMBF is deletable. The browser may not decode the image; the page shows a file-type plate. |
| **AVIF** | `.avif` | full | full | All ten | All nine removable groups | IPTC is not a native block; it is read from Exif. C2PA/JUMBF is deletable. |
| **WebP** | `.webp` | full | full | All ten | All nine removable groups | IPTC is read from Exif. C2PA/JUMBF is deletable in the RIFF container. |
| **GIF** | `.gif` | partial | partial | Display and AI Provenance only | AI Provenance, when a C2PA Manifest is present | ExifReader reads image details only; it does not read EXIF, IPTC, XMP, or ICC in GIF. ExifTool can delete C2PA/JUMBF, so AI only is offered when the manifest is present. There are no other readable groups to clean. |

### The named states

Two states need a name in the UI:

1. **`clean-not-supported` for a format and group.** JPEG XL + AI Provenance. The report shows the C2PA Manifest, but the AI only and Everything presets are disabled with the reason; Custom works for the other eight groups. The engine returns `clean-not-supported` if the group reaches it.
2. **`details-only` for GIF.** The report says "Image details and AI Provenance only. GIF metadata groups are not readable." AI only is offered only when a C2PA Manifest is present; Personal and Everything have no fields to act on and the Clean mark is disabled with "No removable metadata." The format is read but not fully cleanable, and the page says so.

No ExifReader format is wholly read-only. The named state is a format-and-group state; JPEG XL + AI Provenance is the case every UI test must cover.

### Display Metadata

| Format | ICC profile | Orientation | Dimensions |
| --- | --- | --- | --- |
| JPEG | Read and kept | Read and kept | Read and kept |
| JPEG XL | Codestream ICC not read; kept if present | Read and kept | Read and kept |
| TIFF | Read and kept | Read and kept | Read and kept |
| PNG | Read and kept | Read and kept | Read and kept |
| HEIC/HEIF | Read and kept | Read and kept | Read and kept |
| AVIF | Read and kept | Read and kept | Read and kept |
| WebP | Read and kept | Read and kept | Read and kept |
| GIF | Not read; no ICC block is exposed | Not read | Read and kept |

Display Metadata is never in a removable group. The engine whitelists it in every clean, including Everything. The Verification reports it separately.

### Matrix consequences for the UI

- The Clean Preset cards are enabled from the report, not from a hard-coded format table. A preset is available when at least one of its groups has a field and every present group is `removable`.
- A group row shows a count, its container badges, and one of three states: removable, Display (locked), or format-limited (named reason).
- `Everything` includes the nine removable groups. On JPEG XL, if AI Provenance is present, Everything is disabled; if it is absent, Everything is available for the other groups.
- `AI only` is disabled on JPEG XL with the named reason, even when the C2PA Manifest is visible.
- `Personal` includes Location, Time, Device identity, Authorship, and Thumbnails and previews. It never includes Camera settings or Display.
- GIF shows the `details-only` note in the report header and the clean order.

---

## 5. Copy contract

### Rules

- en-US and id-ID carry the same keys, in the same order. The catalog parity test enforces it.
- Use the glossary terms exactly. "Metadata" is the concept; "EXIF" is one container. Do not say "EXIF data", "tags", "strip", "scrub", or "sanitize".
- "Clean" is the action and the product term. "Cleaned File" is the output. "Verification" is the second read.
- "AI only" removes AI Provenance; it does not promise to remove a Pixel Watermark.
- "Everything" removes every removable group, not every byte of metadata. Display Metadata stays.
- The page title is fixed in both Locales: **Expose — EXIF metadata viewer and remover**.
- The meta description carries "EXIF" and the format list for search.
- All values from a file are untrusted text. The copy never promises that a value is safe, valid, or true.
- Placeholders: `{count}`, `{fields}`, `{groups}`, `{format}`, `{group}`, `{name}`, `{size}`, `{percent}`. Plural forms use the catalog's `plural` option.

### Page metadata

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposePageTitle` | Expose — EXIF metadata viewer and remover | Expose — EXIF metadata viewer and remover |
| `exposeMetaDescription` | View EXIF, GPS, XMP, IPTC, ICC, and C2PA metadata in JPEG, PNG, HEIC, AVIF, WebP, TIFF, JPEG XL, and GIF images. Remove the groups you choose, on your device. | Lihat metadata EXIF, GPS, XMP, IPTC, ICC, dan C2PA dalam gambar JPEG, PNG, HEIC, AVIF, WebP, TIFF, JPEG XL, dan GIF. Hapus grup yang anda pilih, di perangkat anda. |
| `exposeOgAlt` | Expose, in ransom letters on a red field, with the line: read the metadata in an image, then remove the groups you choose. | Expose, dalam huruf tebusan di bidang merah, dengan baris: baca metadata dalam gambar, lalu hapus grup yang anda pilih. |

### Format labels

Format labels are not localized. The `{format}` placeholder uses these strings.

| Code | Label |
| --- | --- |
| `jpeg` | JPEG |
| `jxl` | JPEG XL |
| `tiff` | TIFF |
| `png` | PNG |
| `heic` | HEIC/HEIF |
| `avif` | AVIF |
| `webp` | WebP |
| `gif` | GIF |

### Promise and page

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeName` | Expose | Expose |
| `exposePromise` | Read the metadata in an image, then remove the groups you choose. | Baca metadata dalam gambar, lalu hapus grup yang anda pilih. |
| `exposeDeck` | Every Metadata Field, the GPS point, the AI Provenance, and a Clean that tells you what stayed. The file never leaves this device. | Setiap Metadata Field, titik GPS, Provenans AI, dan Pembersihan yang memberi tahu apa yang tersisa. File tidak pernah meninggalkan perangkat ini. |
| `exposeLocal` | Runs on your device | Berjalan di perangkat anda |
| `exposeLocalNote` | No upload, no account, no server storage. | Tanpa unggah, tanpa akun, tanpa penyimpanan server. |
| `exposeOneFile` | One file per session. | Satu file per sesi. |
| `exposeFormatLine` | JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, or GIF. | JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, atau GIF. |
| `exposeFactFormats` | Eight formats: JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, GIF. | Delapan format: JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, GIF. |
| `exposeFactGroups` | Ten Metadata Groups. Display Metadata stays. | Sepuluh Grup Metadata. Metadata Tampilan tetap. |
| `exposeFactLocal` | The file and its metadata never leave this device. | File dan metadatanya tidak pernah meninggalkan perangkat ini. |

### Empty state and samples

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeEmptyTitle` | No image yet. | Belum ada gambar. |
| `exposeEmptyBody` | Drop one image, or open a Sample Image. Expose reads the metadata before it changes anything. | Letakkan satu gambar, atau buka Gambar Contoh. Expose membaca metadata sebelum mengubah apa pun. |
| `exposeDrop` | Drop an image here | Letakkan gambar di sini |
| `exposeChooseFile` | Choose a file | Pilih file |
| `exposeDropHint` | JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, or GIF. One file. | JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, atau GIF. Satu file. |
| `exposeSampleCamera` | Open the camera sample | Buka contoh kamera |
| `exposeSampleAi` | Open the AI sample | Buka contoh AI |
| `exposeSampleNote` | Both Sample Images ship with Expose and work offline. | Kedua Gambar Contoh disertakan dengan Expose dan bekerja offline. |
| `exposeSampleCameraLine` | Camera sample: Andy Parsons / Adobe, CC BY-SA 4.0, via the C2PA public test files. C2PA Manifest generated by Nikon Z 9 for Adobe MAX 2022. | Contoh kamera: Andy Parsons / Adobe, CC BY-SA 4.0, melalui file uji publik C2PA. Manifest C2PA dibuat oleh Nikon Z 9 untuk Adobe MAX 2022. |
| `exposeSampleAiLine` | AI sample: Adobe Firefly, via the Content Authenticity Initiative (MIT). C2PA Manifest signed by Adobe Inc. | Contoh AI: Adobe Firefly, melalui Content Authenticity Initiative (MIT). Manifest C2PA ditandatangani oleh Adobe Inc. |

### Read states

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeReading` | Reading the metadata… | Membaca metadata… |
| `exposeReadingHint` | The file stays in this tab. | File tetap di tab ini. |
| `exposeReadErrorTitle` | Expose cannot read this file. | Expose tidak bisa membaca file ini. |
| `exposeReadErrorBody` | It may be damaged or incomplete. Try another file. | File mungkin rusak atau tidak lengkap. Coba file lain. |
| `exposeUnsupportedTitle` | Unsupported format. | Format tidak didukung. |
| `exposeUnsupportedBody` | Expose reads JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, and GIF images. | Expose membaca gambar JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, dan GIF. |
| `exposeNoMetadataTitle` | No removable metadata. | Tidak ada metadata yang bisa dihapus. |
| `exposeNoMetadataBody` | Expose found only Display Metadata. It stays, because it controls how the image looks. | Expose hanya menemukan Metadata Tampilan. Itu tetap, karena mengatur tampilan gambar. |
| `exposeTryAnother` | Choose another file | Pilih file lain |
| `exposeLargeTitle` | This file is over 200 MB. | File ini lebih dari 200 MB. |
| `exposeLargeBody` | Your device may run out of memory. Expose does not cap the file; the device does. | Perangkat anda bisa kehabisan memori. Expose tidak membatasi file; perangkat yang membatasi. |
| `exposeLargeRead` | Read it anyway | Tetap baca |
| `exposeLargeCancel` | Choose another file | Pilih file lain |
| `exposeTooLargeTitle` | This file is too large for this device. | File ini terlalu besar untuk perangkat ini. |
| `exposeTooLargeBody` | The read ran out of memory. Your file is unchanged. | Pembacaan kehabisan memori. File anda tidak berubah. |

### Report and Raw

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeReport` | Report | Laporan |
| `exposeRaw` | Raw | Raw |
| `exposeReportHint` | Every Metadata Group, with counts. | Setiap Grup Metadata, dengan jumlahnya. |
| `exposeRawHint` | Every field, ungrouped. | Setiap field, tanpa grup. |
| `exposeFilter` | Filter fields | Filter field |
| `exposeFilterEmpty` | No field matches this filter. | Tidak ada field yang cocok dengan filter ini. |
| `exposeField` | Field | Field |
| `exposeValue` | Value | Nilai |
| `exposeGroup` | Group | Grup |
| `exposeContainer` | Container | Wadah |
| `exposeCopy` | Copy | Salin |
| `exposeCopied` | Copied | Tersalin |
| `exposeFieldCount` | {count} fields | {count} field |
| `exposeNoFields` | No fields in this group. | Tidak ada field di grup ini. |
| `exposeShowFields` | Show fields | Tampilkan field |
| `exposeHideFields` | Hide fields | Sembunyikan field |
| `exposeReportCounts` | {fields} fields · {groups} groups · {removable} removable | {fields} field · {groups} grup · {removable} bisa dihapus |
| `exposeDisplayLocked` | Kept | Tetap |

### Metadata Groups

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeGroupsTitle` | Metadata Groups | Grup Metadata |
| `exposeGroupAi` | AI Provenance | Provenans AI |
| `exposeGroupLocation` | Location | Lokasi |
| `exposeGroupTime` | Time | Waktu |
| `exposeGroupDevice` | Device identity | Identitas perangkat |
| `exposeGroupCamera` | Camera settings | Pengaturan kamera |
| `exposeGroupAuthorship` | Authorship | Kepengarangan |
| `exposeGroupSoftware` | Software and edit history | Perangkat lunak dan riwayat edit |
| `exposeGroupThumbnails` | Thumbnails and previews | Thumbnail dan pratinjau |
| `exposeGroupOther` | Other text | Teks lain |
| `exposeGroupDisplay` | Display | Tampilan |
| `exposeGroupFormatLimit` | This format cannot remove this group. | Format ini tidak bisa menghapus grup ini. |
| `exposeGroupReadOnly` | This format does not expose this group. | Format ini tidak menampilkan grup ini. |
| `exposeNoteMakerNote` | A Maker Note is present. It can repeat camera, time, and settings fields. | Maker Note ada. Itu bisa mengulang field kamera, waktu, dan pengaturan. |
| `exposeNoteC2paUnparsed` | A C2PA Manifest is present, but its details could not be read. | Manifest C2PA ada, tetapi detailnya tidak bisa dibaca. |
| `exposeNoteJxlBrotli` | JPEG XL metadata is Brotli-compressed. Some readers cannot decode it. | Metadata JPEG XL dikompresi dengan Brotli. Beberapa pembaca tidak bisa mendekodenya. |
| `exposeNoteIccNotRead` | The ICC profile is not readable in this format. It stays untouched. | Profil ICC tidak bisa dibaca dalam format ini. Itu tetap tidak diubah. |
| `exposeNoteGifDetails` | GIF exposes image details only. Expose does not read its EXIF, IPTC, XMP, or ICC. | GIF hanya menampilkan detail gambar. Expose tidak membaca EXIF, IPTC, XMP, atau ICC-nya. |
| `exposeNoteTiffNoFileDetails` | TIFF dimensions come from the image's own tags. | Dimensi TIFF berasal dari tag gambarnya sendiri. |

### Offline Locator

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeGpsTitle` | Offline Locator | Pencari Lokasi Offline |
| `exposeGpsEmpty` | No GPS point in this file. | Tidak ada titik GPS di file ini. |
| `exposeGpsLatitude` | Latitude | Lintang |
| `exposeGpsLongitude` | Longitude | Bujur |
| `exposeGpsAltitude` | Altitude | Ketinggian |
| `exposeGpsCopy` | Copy coordinates | Salin koordinat |
| `exposeGpsNote` | No tiles, no reverse geocoding. The point comes from the file. | Tanpa tile, tanpa geocoding balik. Titik berasal dari file. |
| `exposeGpsMapAlt` | A world outline with one pin at {latitude}, {longitude}. | Garis dunia dengan satu pin di {latitude}, {longitude}. |

### AI evidence

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeAiTitle` | AI Provenance | Provenans AI |
| `exposeAiNone` | No AI Provenance found. | Tidak ada Provenans AI. |
| `exposeAiC2pa` | C2PA Manifest | Manifest C2PA |
| `exposeAiC2paPresent` | Present · {size} | Ada · {size} |
| `exposeAiC2paAbsent` | Not present | Tidak ada |
| `exposeAiGenerator` | Claim generator | Generator klaim |
| `exposeAiSigner` | Claimed signer | Penandatangan yang diklaim |
| `exposeAiActions` | Actions | Aksi |
| `exposeAiSourceType` | Digital source type | Jenis sumber digital |
| `exposeAiParameters` | Generation parameters | Parameter generasi |
| `exposeAiNotValidated` | It shows what the manifest claims. Expose does not validate the signature. | Expose menunjukkan apa yang diklaim manifest. Expose tidak memvalidasi tanda tangan. |
| `exposeAiThumbnail` | The manifest carries its own thumbnail. | Manifest membawa thumbnail sendiri. |
| `exposeAiSignal` | Other AI signal | Sinyal AI lain |

### Thumbnail

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeThumbnailTitle` | Thumbnail | Thumbnail |
| `exposeThumbnailNone` | No thumbnail. | Tidak ada thumbnail. |
| `exposeThumbnailSize` | {width} × {height} | {width} × {height} |
| `exposeThumbnailWarning` | An embedded preview can show the original image, even after a clean. | Pratinjau yang tertanam bisa menunjukkan gambar asli, bahkan setelah pembersihan. |

### Clean Presets

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeCleanTitle` | Redaction order | Perintah redaksi |
| `exposePresetTitle` | Clean Preset | Preset Pembersihan |
| `exposePresetAi` | AI only | Hanya AI |
| `exposePresetPersonal` | Personal | Pribadi |
| `exposePresetEverything` | Everything | Semua |
| `exposePresetCustom` | Custom | Kustom |
| `exposePresetAiNote` | Remove AI Provenance: the C2PA Manifest, JUMBF, generation parameters, and AI-tool signatures. Camera EXIF, GPS, and authorship stay. | Hapus Provenans AI: Manifest C2PA, JUMBF, parameter generasi, dan tanda tangan alat AI. EXIF kamera, GPS, dan kepengarangan tetap. |
| `exposePresetPersonalNote` | Remove Location, Time, Device identity, Authorship, and Thumbnails and previews. Camera settings stay. | Hapus Lokasi, Waktu, Identitas perangkat, Kepengarangan, dan Thumbnail dan pratinjau. Pengaturan kamera tetap. |
| `exposePresetEverythingNote` | Remove every removable Metadata Group. Display Metadata stays. | Hapus setiap Grup Metadata yang bisa dihapus. Metadata Tampilan tetap. |
| `exposePresetCustomNote` | Choose the Metadata Groups to remove. Display Metadata always stays. | Pilih Grup Metadata yang akan dihapus. Metadata Tampilan selalu tetap. |
| `exposePresetAiUnavailable` | AI only is not available for JPEG XL. The cleaner cannot remove its C2PA Manifest. | Hanya AI tidak tersedia untuk JPEG XL. Pembersih tidak bisa menghapus Manifest C2PA-nya. |
| `exposePresetEverythingUnavailable` | Everything is not available for JPEG XL while its C2PA Manifest is present. Use Custom without AI Provenance. | Semua tidak tersedia untuk JPEG XL selama Manifest C2PA-nya ada. Gunakan Kustom tanpa Provenans AI. |

### Remove and keep

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeRemoveLine` | Will remove {fields} fields in {groups} groups | Akan menghapus {fields} field di {groups} grup |
| `exposeKeepLine` | Will keep {fields} fields in {groups} groups | Akan menyimpan {fields} field di {groups} grup |
| `exposeKeptDisplayLine` | Display Metadata stays: {fields} fields. | Metadata Tampilan tetap: {fields} field. |
| `exposeDisplayLock` | Display Metadata stays | Metadata Tampilan tetap |
| `exposeDisplayLockWhy` | The ICC profile, the orientation, and the dimensions control how the image looks. Removing them can shift the colours or rotate the image. | Profil ICC, orientasi, dan dimensi mengatur tampilan gambar. Menghapusnya bisa menggeser warna atau memutar gambar. |
| `exposeEngineNote` | The cleaner downloads once, then works offline. | Pembersih diunduh sekali, lalu bekerja offline. |
| `exposeClean` | Clean | Bersihkan |
| `exposeCleanDirty` | Clean · {fields} fields | Bersihkan · {fields} field |
| `exposeCleanDisabled` | Select a group with fields. | Pilih grup yang berisi field. |
| `exposeCleanNoFields` | No removable metadata. | Tidak ada metadata yang bisa dihapus. |

### Clean not supported

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeCleanNotSupportedTitle` | Clean not supported. | Pembersihan tidak didukung. |
| `exposeCleanNotSupportedGroup` | Expose cannot remove {group} from a {format} file. Your file is unchanged. Use Custom without {group}, or download the original. | Expose tidak bisa menghapus {group} dari file {format}. File anda tidak berubah. Gunakan Kustom tanpa {group}, atau unduh file asli. |
| `exposeCleanNotSupportedFormat` | Expose cannot clean this {format} file without changing the image. Your file is unchanged. | Expose tidak bisa membersihkan file {format} ini tanpa mengubah gambar. File anda tidak berubah. |
| `exposeDownloadOriginal` | Download the original | Unduh file asli |

### Engine states

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeEngineLoadingTitle` | Loading the cleaner | Memuat pembersih |
| `exposeEngineLoadingBody` | The first Clean downloads the cleaner. It works offline after that. | Pembersihan pertama mengunduh pembersih. Setelah itu bekerja offline. |
| `exposeEngineLoadingPercent` | {percent}% | {percent}% |
| `exposePhaseCleaning` | Cleaning | Membersihkan |
| `exposePhaseVerifying` | Verifying | Memverifikasi |
| `exposeEngineOfflineTitle` | The cleaner is not cached. | Pembersih belum tersimpan. |
| `exposeEngineOfflineBody` | Connect once to load the cleaner. The viewer still works offline. | Sambungkan sekali untuk memuat pembersih. Penampil tetap bekerja offline. |
| `exposeEngineFailedTitle` | The cleaner failed to load. | Pembersih gagal dimuat. |
| `exposeEngineFailedBody` | Your file is unchanged. Try again, or download the original. | File anda tidak berubah. Coba lagi, atau unduh file asli. |
| `exposeRetry` | Try again | Coba lagi |
| `exposeCancelledTitle` | Clean cancelled. | Pembersihan dibatalkan. |
| `exposeCancelledBody` | Your file is unchanged. | File anda tidak berubah. |
| `exposeCleanErrorTitle` | The Clean failed. | Pembersihan gagal. |
| `exposeCleanErrorBody` | Your file is unchanged. Try again, or download the original. | File anda tidak berubah. Coba lagi, atau unduh file asli. |
| `exposeCancel` | Cancel | Batal |

### Verification

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeVerificationTitle` | Verification | Verifikasi |
| `exposeVerificationDeck` | A second read of the Cleaned File. | Pembacaan kedua atas File Bersih. |
| `exposeVerificationMarksLabel` | What the Verification marks mean | Apa arti tanda Verifikasi |
| `exposeVerificationMarksCheck` | The line passed. | Baris lulus. |
| `exposeVerificationMarksMinus` | Nothing to report: the line only gives a count or a fact. | Tidak ada yang perlu dilaporkan: baris hanya berisi jumlah atau fakta. |
| `exposeVerificationMarksFail` | The line failed, and the download is disabled. | Baris gagal, dan tombol Unduh dinonaktifkan. |
| `exposeVerificationSelectedZero` | 0 fields remain in the selected groups. | 0 field tersisa di grup yang dipilih. |
| `exposeVerificationSelectedSome` | {count} fields remain in the selected groups. | {count} field tersisa di grup yang dipilih. |
| `exposeVerificationKept` | Kept groups still read: {groups}. | Grup yang disimpan masih terbaca: {groups}. |
| `exposeVerificationKeptNone` | No other groups were kept. | Tidak ada grup lain yang disimpan. |
| `exposeVerificationDisplay` | Display Metadata is kept: the ICC profile, the orientation, and the dimensions. | Metadata Tampilan tetap: profil ICC, orientasi, dan dimensi. |
| `exposeVerificationPayloadSame` | The image payload is unchanged. | Payload gambar tidak berubah. |
| `exposeVerificationPayloadChanged` | The image payload changed. Do not use this file. | Payload gambar berubah. Jangan gunakan file ini. |
| `exposeVerificationC2paGone` | The C2PA Manifest is gone. | Manifest C2PA sudah hilang. |
| `exposeVerificationC2paRemains` | The C2PA Manifest is still present. | Manifest C2PA masih ada. |
| `exposeVerificationC2paNone` | No C2PA Manifest was present. | Tidak ada Manifest C2PA. |
| `exposeVerificationRemoved` | Removed {fields} fields from {groups} groups. | Menghapus {fields} field dari {groups} grup. |
| `exposeVerificationMakerNote` | A Maker Note was removed with its camera, time, and settings fields. | Maker Note dihapus bersama field kamera, waktu, dan pengaturannya. |
| `exposeVerificationFormatLimit` | This format kept a group it cannot remove. | Format ini menyimpan grup yang tidak bisa dihapusnya. |
| `exposeVerificationCounts` | {before} fields before · {after} fields after | {before} field sebelumnya · {after} field sesudahnya |
| `exposeVerificationSize` | File size {before} before · {after} after · {delta}. | Ukuran file {before} sebelumnya · {after} sesudahnya · {delta}. |
| `exposeVerificationReRead` | Read again | Baca lagi |

### Download

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeDownload` | Download the Cleaned File | Unduh File Bersih |
| `exposeDownloadLine` | Downloads {name}. The input file stays untouched. | Mengunduh {name}. File input tidak berubah. |
| `exposeDownloadSize` | {size} | {size} |
| `exposeCleanAgain` | Clean this image again | Bersihkan gambar ini lagi |
| `exposeCleanAnother` | Clean another image | Bersihkan gambar lain |

### Honesty and explainer

| Key | en-US | id-ID |
| --- | --- | --- |
| `exposeHonestyTitle` | What Expose cannot do | Apa yang tidak bisa dilakukan Expose |
| `exposeHonestyBody` | Expose removes metadata only. It cannot remove a Pixel Watermark such as SynthID, and it does not detect AI-generated images. It reports AI Provenance and does not validate the C2PA signature. | Expose hanya menghapus metadata. Expose tidak bisa menghapus Watermark Piksel seperti SynthID, dan tidak mendeteksi gambar hasil AI. Expose melaporkan Provenans AI dan tidak memvalidasi tanda tangan C2PA. |
| `exposeExplainerTitle` | What metadata is, and why it matters | Apa itu metadata, dan mengapa penting |
| `exposeExplainerExifTitle` | EXIF is one container | EXIF adalah satu wadah |
| `exposeExplainerExifBody` | EXIF holds camera, time, and GPS fields. It is one metadata container, not all metadata. An image can also carry XMP, IPTC, ICC, and a C2PA Manifest. | EXIF menyimpan field kamera, waktu, dan GPS. Itu satu wadah metadata, bukan seluruh metadata. Gambar juga bisa membawa XMP, IPTC, ICC, dan Manifest C2PA. |
| `exposeExplainerGpsTitle` | A GPS point is a home address | Titik GPS adalah alamat rumah |
| `exposeExplainerGpsBody` | A photo taken at home can carry the coordinates of that home. The Offline Locator shows the point without sending it anywhere. | Foto yang diambil di rumah bisa membawa koordinat rumah itu. Pencari Lokasi Offline menunjukkan titiknya tanpa mengirimnya ke mana pun. |
| `exposeExplainerC2paTitle` | A C2PA Manifest records origin | Manifest C2PA mencatat asal-usul |
| `exposeExplainerC2paBody` | A C2PA Manifest is the signed record of how a file was made and changed. Expose shows its presence and size. It does not validate the signature, and it does not decide whether an image is AI-generated. | Manifest C2PA adalah catatan bertanda tangan tentang bagaimana file dibuat dan diubah. Expose menunjukkan keberadaan dan ukurannya. Expose tidak memvalidasi tanda tangan, dan tidak memutuskan apakah gambar dihasilkan AI. |
| `exposeExplainerWatermarkTitle` | A Pixel Watermark survives | Watermark Piksel tetap ada |
| `exposeExplainerWatermarkBody` | A Pixel Watermark is a mark in the pixels, such as SynthID. Removing metadata does not remove it. A screenshot or a re-encode can remove metadata, and can also remove the watermark; Expose does neither. | Watermark Piksel adalah tanda di piksel, seperti SynthID. Menghapus metadata tidak menghapusnya. Tangkapan layar atau pengodean ulang bisa menghapus metadata, dan juga bisa menghapus watermark; Expose tidak melakukan keduanya. |
| `exposeExplainerLocalTitle` | The file stays here | File tetap di sini |
| `exposeExplainerLocalBody` | Expose reads and writes in this tab. There is no upload endpoint, no account, and no server storage. | Expose membaca dan menulis di tab ini. Tidak ada endpoint unggah, tidak ada akun, dan tidak ada penyimpanan server. |

### Copy parity

- Every key above exists in both `en-US.ts` and `id-ID.ts`, in the same order, with the same placeholders.
- `exposeFieldCount`, `exposeRemoveLine`, `exposeKeepLine`, `exposeKeptDisplayLine`, `exposeCleanDirty`, `exposeVerificationSelectedSome`, `exposeVerificationRemoved`, and `exposeVerificationCounts` use the catalog's plural form for the count.
- The copy uses `{fields}` and `{groups}` for counts that need a plural. The id-ID strings use the same placeholders; the plural rule for id-ID has one form.
- `exposePageTitle` is the only string with an em dash. Use the exact character.

---

## 6. Page structure

### Route contract

- `/expose` is server-rendered. The promise, the empty state, the two Sample Image actions, and the explainer are in the HTML. Every browser-only call waits behind an event or an effect.
- The route head is its own: title "Expose — EXIF metadata viewer and remover", the meta description from §5, and `ogImagePath({ kind: "tool", path: "/expose" })` with the `exposeOgAlt` text.
- The Open Graph card is drawn on request by `GET /api/og` from the Tool Catalog and the Message Catalog. It is not a committed file.
- The Tool Catalog entry is `{ name: "Expose", path: "/expose", promiseKey: "exposePromise", factKeys: ["exposeFactFormats", "exposeFactGroups", "exposeFactLocal"] }`.
- The Sample Images are static files under `/samples/expose/`; the notice is served beside them. No route or API reads a user file.

### Hierarchy

At 1440 the page is one desk with three zones. At 390 the same DOM stacks into one column. It is one component tree, not two pages.

```text
1440
┌ navbar ──────────────────────────────────────────────────────────────┐
│ RITOOLS · Tools                                  Theme · Language     │
├───────────────────────────────────────────────────────────────────────┤
│ Expose [Ransom]    Read the metadata...                LOCAL ONLY    │
├──────────────────────────┬───────────────────────────┬────────────────┤
│ EXHIBIT                  │ CASE FILE                 │ REDACTION      │
│                          │                           │ ORDER          │
│ ┌──────────────────────┐ │ Metadata Report  Report Raw│ Clean Preset   │
│ │ image preview        │ │                           │ ○ AI only      │
│ │ or format plate      │ │ AI Provenance        12   │ ○ Personal     │
│ └──────────────────────┘ │ Location              6   │ ○ Everything   │
│ 4128×2752 · 1.5 MB · JPEG│ Time                  4   │ ○ Custom       │
│                          │ Device identity       3   │                │
│ OFFLINE LOCATOR [ink]    │ Camera settings      18   │ Will remove 34 │
│ 40.7364, -73.9932        │ Authorship            2   │ Will keep 12   │
│ 174 m                    │ Software history      4   │ Display locked │
│                          │ Thumbnails            1   │ [Clean]        │
│ AI EVIDENCE              │ Other text            3   │                │
│ C2PA · Present · 1.2 MB  │ Display (locked)      3   │                │
│                          │                           │                │
│ THUMBNAIL [160×120]      │                           │                │
├──────────────────────────┴───────────────────────────┴────────────────┤
│ VERIFICATION (after a clean)                          Download        │
├───────────────────────────────────────────────────────────────────────┤
│ EXPLAINER: EXIF · GPS · C2PA · Pixel Watermark · Local only           │
└───────────────────────────────────────────────────────────────────────┘

390
navbar
masthead (Ransom Expose, promise, local note)
EXHIBIT
  image preview / plate
  file facts
  Offline Locator
  AI evidence
  Thumbnail
CASE FILE
  Report | Raw
  metadata groups
  field disclosures
REDACTION ORDER
  presets
  remove / keep
  Display lock
  engine note
  Clean
VERIFICATION (after a clean)
  receipt + Download + Clean again
EXPLAINER
sticky bar: Clean · N fields (only while a report is open and the order is above the fold)
```

### The exhibit

- The image preview sits in a white stock frame with a 2px ink rule and a small plate that names the format. It never exceeds 420 px tall at 1440; at 390 it is the full column width with a 4:3 or 3:2 fit.
- When the browser cannot decode the format (HEIC/HEIF is the common case), the preview is a file-type plate: the format name in Poster Title, the dimensions, and a line that says "The browser cannot show this image. The report still reads it." The plate is not a broken image.
- Below the preview, one ruled facts line: dimensions, file size, format, orientation, and frame count when it is known. All numbers use the numerals face.
- The image is decorative evidence. It never receives a click action that is not also a button.

### The Offline Locator

- An ink plate with a world outline, a red pin, the coordinates, the altitude, and a **Copy coordinates** action.
- The world outline is Natural Earth 1:110m land (public domain), simplified to one SVG path that ships with the app. No tiles, no tile URL, no external link.
- The SVG is `role="img"` with the `exposeGpsMapAlt` label; the coordinates and altitude are in a `<figcaption>` in text. A screen reader gets the same point twice: once as the image label and once as the caption. That is deliberate; the map is never the only source.
- No GPS point: an empty plate with "No GPS point in this file." The rest of the exhibit stays.
- The copy action copies `40.736435, -73.993160` (six decimals), with a toast that says "Copied".
- No reverse geocoding. The UI never prints a city, country, or place name from the coordinates.

### The case file (Report and Raw)

- A paper sheet with a 3px top rule and the heading "Metadata Report" in Poster Title. The **Report** and **Raw** tabs are React Aria tabs; the selected tab is a solid ink bar with paper words. Arrow keys move between them.
- **Report** lists the ten Metadata Groups in the fixed order of the glossary. Each row is a disclosure, and rows open independently: several may be open at once:
  - the group name;
  - a count in a 9ch numeral column;
  - container badges, at most three plus a `+N`;
  - a state mark: removable, Display (locked), or format-limited;
  - the fields inside, when open: label and value in a two-column rule. Values are text, truncated at 120 characters with a **Show more** button; the full value stays in the DOM for copy.
- A group with 0 fields is still shown, muted, with `0`, so the ten-group structure is stable and the user can see what the format does not carry. On GIF, the eight non-display groups are muted with the `details-only` note.
- The Display row is locked. It never has a checkbox. Its count is the fields the clean keeps; it opens to show the ICC, orientation, and dimensions.
- **Raw** is the flat list of every field: Field, Value, Group, Container. A filter matches text, label, container, and group. A **Copy** action per row copies the value as text. At 390 the table becomes a stacked definition list with the same labels; on a narrow column the table scrolls inside its frame, never the page.
- The report header carries the `counts` line: "N fields · M groups · K removable". The counts use the numerals face.
- The report header carries the format notes from `ReadNote`: `details-only` for GIF, `Maker Note` present, `C2PA not parsed`, `JPEG XL Brotli fallback`, `ICC not read`, `TIFF file details absent`. Each note is a small line with a square plate, not a colour-only badge.

### The redaction order

- A paper card with a 3px red top rule. The title is "Redaction order"; the section label is "Clean Preset".
- The four presets are a radio group, one card each:
  - AI only (default);
  - Personal;
  - Everything;
  - Custom.
  Each card has the name, a one-line note, and a count of the fields it would remove. The selected card takes the solid ink bar and the 4px red foot. A disabled card is muted and struck on the words, with the reason below.
- **Custom** reveals the group checkboxes. Only groups with fields are enabled. Display is a locked row, not a checkbox. A format-limited group is disabled with its reason.
- The summary sits above the mark:
  - "Will remove N fields in M groups";
  - "Will keep N fields in M groups";
  - "Display Metadata stays: N fields."
  The numbers use the numerals face; the counts come from the report, not from a second read.
- The Display lock is a row with a padlock mark, the line "Display Metadata stays", and the why line: the ICC profile, the orientation, and the dimensions control how the image looks. It is not a toggle.
- The engine note says the cleaner downloads once and then works offline. The page does not claim a transfer size; the engine issue measures the real browser transfer and load time.
- **Clean** is a primary mark: red outline at rest, red wash and doubled outline on hover, solid red when pressed, bracket on focus.
- During a clean the mark becomes **Cancel**. The progress line is a printed bar: "Loading the cleaner 42%" then "Cleaning" then "Verifying". The bar uses ink; status is carried by the word, not by hue. Cancel is available until Verifying.
- At 390 the order follows the case file. A sticky bar at the bottom edge shows "Clean · N fields" while the order is above the fold; pressing it scrolls to the order, it does not start a clean. The bottom bar never covers the last row of the report; the page reserves its height.

### The Verification receipt

- After a successful clean, the order is replaced by the receipt on white stock with a 3px ink top rule and "Verification" in Poster Title. It is not a toast; it is part of the page.
- The receipt rows, each with a square mark and text:
  1. **Selected groups:** "0 fields remain in the selected groups." If the count is not 0, the row is a danger note and the Download is disabled.
  2. **Kept groups:** "Kept groups still read: Location, Time, …" with the field counts.
  3. **Display:** "Display Metadata is kept: the ICC profile, the orientation, and the dimensions."
  4. **Payload:** "The image payload is unchanged." A changed payload is a danger note and the Download is disabled.
  5. **C2PA:** "The C2PA Manifest is gone." when AI Provenance was selected and present; otherwise the row names the remaining manifest or says it was not present.
  6. **Counts:** "Removed N fields from M groups." with before/after counts.
  7. **Size:** the file size before and after, with the difference, such as "File size 1.5 MB before · 1.3 MB after · −238 KB."
  8. **Warnings:** the Maker Note warning when one was removed; the format limit when one applies.
- The receipt's Download mark: "Download the Cleaned File", with the new name and size. The input file is untouched; the copy says so.
- **Clean this image again** returns to the order with the same file and the same selection. **Clean another image** clears the desk and returns to the empty state.
- Focus moves to the Verification heading after the clean. The live region announces the selected-group count, the payload result, and the download availability.

### The AI evidence card

- A paper card above the Offline Locator, with the plate "AI".
- If there is no AI Provenance: one line, "No AI Provenance found." The card stays, so its absence is a fact, not a blank.
- If there is a C2PA Manifest: the card shows:
  - "C2PA Manifest · Present · 1.2 MB";
  - the claim generator;
  - the claimed signer (label only);
  - the actions;
  - the digital source type;
  - the generation parameters, in a ruled list;
  - a line that the manifest carries its own thumbnail;
  - the honesty line: "It shows what the manifest claims. Expose does not validate the signature."
- If AI Provenance exists outside C2PA (an XMP `DigitalSourceType`, an AI-tool signature), the card lists each signal with its container badge.
- The card never uses a "verified" or "authentic" word. It never says an image is AI-generated; it reports the metadata that claims a source.
- The generation parameters are text. A prompt can be long; it truncates with **Show more**, and a copy action copies the full value.

### The thumbnail card

- A card between the facts line and the AI evidence card, with the embedded preview, its dimensions, and its source (EXIF, MPF, or C2PA).
- The warning is permanent, not a tooltip: "An embedded preview can show the original image, even after a clean." The thumbnail is in the Thumbnails and previews group for EXIF/MPF; the C2PA thumbnail goes with AI Provenance. The warning covers both.
- No thumbnail: "No thumbnail." The card stays.
- The thumbnail is an `<img>` with an alt that says it is an embedded preview and may show the original. It is not the main image preview.

### The explainer

Below the Tool, four short blocks in a two-column rule at 1440 and one column at 390:

1. **EXIF is one container.**
2. **A GPS point is a home address.**
3. **A C2PA Manifest records origin.**
4. **A Pixel Watermark survives.**
5. **The file stays here.**

The copy is in §5. No competitor names, no comparison table, no statistics. The "About the samples" line carries the two provenance lines.

### State matrix

Every state in the issue is covered here. A state is not a toast unless the table says so.

| State | Trigger | Page region | Copy | Actions | Announced |
| --- | --- | --- | --- | --- | --- |
| **Empty** | No file. | The desk is not rendered. Masthead, drop zone, two Sample Image actions. | `exposeEmptyTitle`, `exposeEmptyBody`, `exposeDrop`, `exposeDropHint`, `exposeSample*` | Choose a file, drop a file, open a sample. | The drop zone is a labelled button; the hint is described by it. |
| **Sample** | A Sample Image opens. | The full desk. The provenance lines are in the explainer's disclaimer. | `exposeSampleCameraLine`, `exposeSampleAiLine` | Read the report, clean, open a file. | The report heading receives focus. |
| **Reading** | A file or sample is selected. | The exhibit and case file reserve their space; a square loader and the reading line. | `exposeReading`, `exposeReadingHint` | Cancel is not offered for a read; the file can be replaced. | Polite live region: "Reading the metadata." |
| **Read error** | `unreadable-file`. | A note replaces the case file; the exhibit keeps the file facts if they exist. | `exposeReadErrorTitle`, `exposeReadErrorBody` | Try another file. | Assertive: the title and the body. |
| **Unsupported format** | `unsupported-format`. | The same note region, with the format list. | `exposeUnsupportedTitle`, `exposeUnsupportedBody` | Try another file. | Assertive. |
| **No metadata** | The report has no removable fields. | The report shows the ten groups with 0; the clean order is disabled. | `exposeNoMetadataTitle`, `exposeNoMetadataBody`, `exposeCleanNoFields` | Download the original, clean another. | Polite; the Clean mark is described by the reason. |
| **Large-file warning** | The source is over 200 MB. | A confirm dialog before the read. | `exposeLargeTitle`, `exposeLargeBody`, `exposeLargeRead`, `exposeLargeCancel` | Read it anyway, choose another file. | Assertive; focus lands on "Read it anyway". |
| **Clean not supported** | `clean-not-supported`, or a preset needs a format-limited group. | The clean order, with the disabled preset or group and the reason. | `exposeCleanNotSupportedTitle`, `exposeCleanNotSupportedGroup`, `exposeDownloadOriginal` | Use Custom without the group, download the original, clean another. | Assertive when it follows a Clean press; polite when the preset is disabled. |
| **Engine loading** | The first clean starts and the WASM is not cached. | The clean order; a printed progress bar. | `exposeEngineLoadingTitle`, `exposeEngineLoadingBody`, `exposeEngineLoadingPercent` | Cancel. | Polite progress at 25, 50, 75, and completion. |
| **Engine offline** | `engine-unavailable` while offline. | The clean order; a note replaces the progress. | `exposeEngineOfflineTitle`, `exposeEngineOfflineBody` | Retry is disabled while offline; Download the original. | Assertive. |
| **Engine failed** | `engine-failed`. | The clean order; a note. | `exposeEngineFailedTitle`, `exposeEngineFailedBody` | Try again, Download the original. | Assertive. |
| **Cancelled** | The user presses Cancel, or Effect interrupts. | The clean order returns; the report is unchanged. | `exposeCancelledTitle`, `exposeCancelledBody` | Clean again, choose another file. | Polite. |
| **Clean error** | `too-large` during a clean, or an unexpected engine failure. | The clean order; a danger note. | `exposeTooLargeTitle`, `exposeTooLargeBody` or `exposeCleanErrorTitle`, `exposeCleanErrorBody` | Try again, Download the original. | Assertive. |
| **Success** | The clean returns and Verification passes. | The Verification receipt replaces the order; the Download is enabled. | `exposeVerification*`, `exposeDownload`, `exposeDownloadLine` | Download the Cleaned File, clean again, clean another. | Polite summary; focus moves to the Verification heading. |

A failure is always shown in the region where the action happened, not as a toast. A toast is reserved for a copy action.

### First viewport and responsive rules

- **1440.** The masthead, the three desk zones, and the Clean mark are in the first viewport for a typical 1.5 MB JPEG. The image preview is capped at 420 px tall; the ten group rows fit without scrolling at a 900 px viewport height. The clean order is sticky below the navbar when the case file is longer than the viewport.
- **390.** The masthead, the image preview, and the start of the case file are in the first viewport. The clean order follows the case file; the sticky bottom bar names the Clean action without starting it. The explainer is below the receipt.
- No horizontal scroll at either width. The Raw view stacks; the coordinates wrap at the comma.
- The report counts and the group counts sit in fixed columns, so they do not shift when a group opens or a filter runs.
- The image preview and the thumbnail use `object-fit: contain`; no crop that hides a part of the image.

### Colour modes

| Viewport | Mode | What changes |
| --- | --- | --- |
| 1440 | Light | Paper ground, ink rules, red navbar, white exhibit frame, ink locator plate. |
| 1440 | Dark | Carbon ground, paper text, red navbar, carbon-raised exhibit frame, ink locator plate with paper rules. The red words use `--primary-ink-dark`; fills use `--primary`. |
| 390 | Light | Same tokens, one column; the sticky bar is paper with a 2px ink top rule. |
| 390 | Dark | Same tokens, one column; the sticky bar is carbon with a 2px paper top rule. |

The two reds rule holds: `--primary` for fills and rules, `--primary-ink` for red words. Danger is burnt vermilion, never Poster Red. Every state mark has text; no state is carried by colour alone. Both modes meet AA for body text, labels, counts, and the disabled reason.

### Accessibility

- **Landmarks:** banner, main, the desk as sections with headings, the explainer as a section. The skip link comes first.
- **Keyboard:** the drop zone is a `<button>`; the Sample Image actions are buttons; the Report/Raw views are tabs with arrow keys; each group disclosure is a button with `aria-expanded`; the presets are a radio group; the Custom groups are a checkbox group; the Display row is a locked description, not a focusable checkbox; Clean and Cancel are buttons; the Download is a link with `download`.
- **Focus:** after a read, the report heading; after a Clean, the Verification heading; after Cancel, the Clean mark; after an error, the error heading; after a download, the Download stays focused. The sticky bar's action moves focus to the Clean mark, not to the top of the page.
- **Live regions:** one polite region for read and Verification, one assertive region for errors. Progress is announced at 25, 50, 75, and completion, never per byte. The clean summary is in the DOM, not announced on every keystroke.
- **Tables:** the Raw view is a real table at 1440 with `<th scope="col">`; at 390 it is a definition list with the same labels. The filter is a labelled search field; the result count is announced.
- **Maps:** the Offline Locator has a text alternative; the coordinates and altitude are always visible as text. A keyboard user can copy the coordinates.
- **Images:** the exhibit has a meaningful alt or a file-type plate with text; the thumbnail's alt says it is an embedded preview.
- **Motion:** the chips assemble, the receipt slams in, the progress bar prints. Reduced motion holds the composed state and removes the stagger. No animation carries state.
- **Zoom:** 200% at 390 reflows without horizontal scrolling; the desk becomes one column earlier if needed.
- **Language:** both Locales are complete; the `lang` attribute follows the Locale; the coordinates use the Latin digits in both Locales (the numerals face is tabular).

### Performance and security

- **Read:** the viewer chunk contains ExifReader only. The cleaner chunk contains ExifTool; the route lazy-imports it on the first Clean. A bundle test enforces the split.
- **Worker:** read and clean run in a worker. The main thread paints the progress bar and the report.
- **Cache:** the cleaner WASM is cached at runtime after the first load (ADR-0010 pattern). The Sample Images are precached because each is under 2 MiB; the total is 2,577,122 bytes. The viewer works offline without the cleaner.
- **Memory:** one file per session; the source bytes are held once; the Cleaned File is held once. Warn at 200 MB; `too-large` when allocation fails.
- **No network:** no upload, no analytics on file content, no external map, no reverse geocoding, no CDN, no font fetch. The Sample Images are same-origin assets.
- **Text only:** every Metadata Field value, thumbnail alt, AI parameter, and C2PA string is rendered as text. No `innerHTML`, no `dangerouslySetInnerHTML`, no HTML from a tag. File names are escaped by React and sanitized for the download header.
- **Coordinates:** latitude, longitude, and altitude are clamped and formatted with a fixed precision. A non-finite value is `null`.
- **Arguments:** the engine never passes a user file name or a tag value as an ExifTool option. The wrapper receives bytes and a fixed group table. A file name is used only for the download name, after sanitizing path separators and control characters.
- **C2PA:** the UI shows presence and size, the claim generator, and the claimed signer. It never prints "valid", "verified", or "authentic". The copy says the signature is not checked.

---

## 7. Product truth

### 7.1 `PRODUCT.md` — Capabilities

Add under Capabilities:

> - Expose is the second Tool, at `/expose`. It reads the Metadata in JPEG, JPEG XL, TIFF, PNG, HEIC/HEIF, AVIF, WebP, and GIF images, shows the Metadata Report, the GPS point on an Offline Locator, and the AI Provenance, and writes a Cleaned File with the selected Metadata Groups removed. Display Metadata stays. The Cleaned File is read again for Verification. GIF exposes image details and AI Provenance only. JPEG XL keeps its C2PA Manifest.

Add to the technical constraints:

> - Expose handles images only, one file per session. It does not accept video, PDF, or Office files.
> - ExifReader reads; ExifTool in WebAssembly cleans behind a lazy-loaded engine (ADR-0015). The viewer works without the cleaner.
> - The Offline Locator loads no tiles and does no reverse geocoding (ADR-0016).
> - A Clean keeps Display Metadata: the ICC profile, the orientation, and the dimensions (ADR-0017).
> - JPEG XL can be read but its C2PA Manifest cannot be removed (ADR-0018). AI only and Everything are unavailable for it.
> - Expose removes metadata only. It does not remove Pixel Watermarks, detect AI-generated images, or validate C2PA signatures.

Change "Any Tool after Squeeze" to "Any Tool after Expose."

### 7.2 ADR-0018

`docs/adr/0018-jpeg-xl-keeps-its-c2pa-manifest.md` records why JPEG XL keeps its manifest and what the UI does instead. It is written in this issue. ADR-0015, ADR-0016, and ADR-0017 are reviewed and unchanged.

### 7.3 Glossary check

The copy uses the existing terms in `apps/web/GLOSSARY.md`: Metadata, EXIF, Metadata Field, Metadata Group, Metadata Report, Display Metadata, AI Provenance, C2PA Manifest, JUMBF, Maker Note, Clean, Clean Preset, Cleaned File, Verification, Pixel Watermark, Sample Image, Offline Locator. No new term is introduced. "Redaction order" is a surface metaphor, not a domain term; it never replaces "Clean Preset" in the UI labels. If it reads as a domain term in review, rename it to "Clean order".

### 7.4 Sample notice

`apps/web/public/samples/expose/NOTICE.txt` ships with the files. It records the source, commit, original name, bytes, SHA-256, licence, attribution, and the MIT notice. The UI's "About the samples" disclosure repeats the short provenance lines; the notice carries the full record.

---

## 8. Surface concept round

No seed roll. The world is fixed, and the two verbs — read and remove — constrain the composition more than a roll would. Three structures were drawn inside the Ransom Calling Card; one was selected on 2026-10-23. The direction contract is in the surface brief, not here.

| Position | Structure | Thesis | Honest risk |
| --- | --- | --- | --- |
| **Selected** | **The Redaction Desk** | The image is the exhibit, the Metadata Report is the case file, and the Clean Preset is a redaction order. Three objects, one paper desk. | Three zones at 1440 can read as three apps; the shared paper rules, the one ink locator, and the one red Clean mark must hold them together. |
| Alternate | **The Contact Sheet** | The ten groups are contact-sheet cells around the image; the clean is a bottom bar. | It turns the report into a gallery, hides the counts, and makes the clean a settings bar. The field values become hard to read. |
| Alternate | **The Dossier Column** | The report is one long column at left, the clean is a sticky panel at right, the image sits above both. | It pushes the exhibit below the fold and repeats Squeeze's sticky settings column without Squeeze's ledger. |

The Redaction Desk was selected because it keeps the three things a person needs visible at once at 1440, and because the same three objects stack into a readable order at 390 without a second page.

## 9. Out of scope

- Production code, the engine implementation, and the page components.
- Video, PDF, and Office files.
- Batch cleaning.
- Per-field removal.
- Removing ICC profiles or orientation.
- Reverse geocoding and map tiles.
- Detecting AI-generated pixels or removing Pixel Watermarks.
- C2PA signature validation.
- A comparison table or competitor names.
- A batch queue, a folder, or a watch folder.

---

## 10. Open decisions for the UI issue

These do not block the shape. The builder decides them with a measurement or a review.

1. **Sticky order at 1440.** The brief makes the redaction order sticky below the navbar. If the sticky column clips the last group at a 768 px viewport height, let it scroll with the case file and keep only the Clean mark sticky.
2. **Raw at 390.** The brief stacks the table into a definition list. If the builder keeps a table, it must not introduce horizontal page scroll; a scrollable region with a visible label is the fallback.
3. **Sample precache.** The two files are 2,577,122 bytes together and each is under the 2 MiB ceiling. Precache them for a true offline sample. If the measured install budget objects, move them to the runtime cache and change the copy to "works offline after the first view". Do not raise the Workbox ceiling.
4. **Generation parameter display.** The AI card lists every parameter the manifest carries. If a manifest carries a prompt longer than 500 characters, the card truncates with Show more; the download never includes the prompt separately.
5. **Map outline.** Natural Earth 1:110m land is public domain and settles the data licence. The builder generates one simplified SVG path and commits it with a provenance line; no tile library and no external fetch.
