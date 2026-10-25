/* eslint-disable unicorn/no-unreadable-array-destructuring -- the fixed property descriptors carry container, namespace, name, and semantic group */
import type {
  FormatFamily,
  FileFormat,
  MetadataContainer,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";
/* eslint-disable eslint/complexity -- the group table is a semantic classification of hundreds of tag names */
/* oxlint-disable anti-slop/no-known-value-widening, react-doctor/js-combine-iterations, react-doctor/js-set-map-lookups -- the table is the owner of the group contract */

/**
 * Internal metadata classification and the curated tag table.
 *
 * ExifTool tag names never leave this module. The
 * report gets a Metadata Group and a container family; the cleaner gets a
 * fixed list of group-qualified ExifTool tags.
 */

const normalize = (label: string): string =>
  label.toLowerCase().replaceAll(/[^a-z0-9]/gu, "");

const NAMES = {
  ai: new Set([
    "digitalsourcetype",
    "softwareagent",
    "prompt",
    "generationparameters",
    "generationtool",
    "generatortool",
    "c2pa",
    "jumbf",
    "trainedalgorithmicmedia",
    "compositewithtrainedalgorithmicmedia",
    "algorithmicmedia",
    "aimodel",
    "aigenerated",
    "synthetic",
  ]),
  authorship: new Set([
    "artist",
    "copyright",
    "copyrightnotice",
    "creator",
    "creators",
    "rights",
    "byline",
    "credit",
    "source",
    "xpauthor",
    "usageterms",
    "webstatement",
    "licensor",
    "licence",
    "license",
    "attribution",
    "author",
  ]),
  camera: new Set([
    "exposuretime",
    "exposureprogram",
    "exposuremode",
    "exposurebiasvalue",
    "exposurecompensation",
    "fnumber",
    "aperturevalue",
    "maxaperturevalue",
    "shutterspeedvalue",
    "iso",
    "isospeedratings",
    "isospeed",
    "sensitivitytype",
    "recommendedexposureindex",
    "focallength",
    "focallengthin35mmfilm",
    "flash",
    "flashpixversion",
    "meteringmode",
    "whitebalance",
    "lightsource",
    "scenecapturetype",
    "scenetype",
    "sensingmethod",
    "filesource",
    "customrendered",
    "contrast",
    "saturation",
    "sharpness",
    "gaincontrol",
    "subjectdistance",
    "subjectdistancerange",
    "digitalzoomratio",
    "brightnessvalue",
    "lensspecification",
    "composition",
    "cfaPattern",
    "colourspace",
  ]),
  device: new Set([
    "make",
    "lens",
    "model",
    "cameramodelname",
    "lensmake",
    "lensmodel",
    "serialnumber",
    "bodyserialnumber",
    "cameraserialnumber",
    "lensserialnumber",
    "internalserialnumber",
    "ownername",
    "cameraownername",
    "imageuniqueid",
    "uniqueid",
    "firmware",
    "firmwareversion",
  ]),
  display: new Set([
    "applicationrecordversion",
    "orientation",
    "exifimagewidth",
    "exifimageheight",
    "interopindex",
    "interopversion",
    "imagewidth",
    "imagelength",
    "imageheight",
    "pixelxdimension",
    "pixelydimension",
    "xresolution",
    "yresolution",
    "resolutionunit",
    "bitspersample",
    "colorspace",
    "colourspace",
    "ycbcrpositioning",
    "compression",
    "photometricinterpretation",
    "samplesperpixel",
    "rowsperstrip",
    "stripbytecounts",
    "stripoffsets",
    "subfiletype",
    "interlace",
    "filter",
    "colortype",
    "bitdepth",
    "filetype",
    "filetypeextension",
    "mimetype",
    "imagesize",
    "megapixels",
    "duration",
    "trackduration",
    "mediaduration",
    "videoframerate",
    "audiosamplerate",
    "audiochannels",
    "codec",
    "codecid",
    "compressorid",
    "compressorname",
    "audiobitdepth",
    "audiobitrate",
    "samplecount",
    "pagecount",
    "pdfversion",
    "pagesize",
    "partcount",
    "jfifversion",
    "jfifthumbnailwidth",
    "jfifthumbnailheight",
    "jfifthumbnail",
    "thumbnailoffset",
    "thumbnaillength",
    "thumbnailimage",
    "imagelength",
    "planarconfiguration",
    "predictor",
    "tilewidth",
    "tilelength",
    "tileoffsets",
    "tilebytecounts",
    "stripoffsets",
    "stripbytecounts",
    "extrasamples",
    "samplerate",
    "sampleformat",
    "mpfversion",
    "numberofimages",
    "mpoffsets",
    "componentsconfiguration",
    "exifversion",
    "flashpixversion",
    "exififdpointer",
    "gpsifdpointer",
    "interoperabilityifdpointer",
    "interoperabilityindex",
    "interoperabilityversion",
    "compressedbitsperpixel",
    "cfapattern",
    "compositeimage",
    "recordversion",
    "applicationnotes",
    "iptcnaa",
  ]),
  location: new Set([
    "gps",
    "gpslatitude",
    "gpslongitude",
    "gpsaltitude",
    "gpsaltituderef",
    "gpslatituderef",
    "gpslongituderef",
    "gpstimestamp",
    "gpsdatestamp",
    "gpsversionid",
    "gpsmapdatum",
    "gpssatellites",
    "gpsmeasuremode",
    "gpsdop",
    "gpsspeed",
    "gpsspeedref",
    "gpsimgdirection",
    "gpsimgdirectionref",
    "gpsdestlatitude",
    "gpsdestlongitude",
    "gpsdestbearing",
    "gpsdestbearingref",
    "gpsdestdistance",
    "gpsdestdistanceref",
    "gpsprocessingmethod",
    "gpsareainformation",
    "gpsdifferential",
    "gpthpositioning",
    "latitude",
    "longitude",
    "altitude",
    "city",
    "country",
    "countrycode",
    "state",
    "province",
    "provincestate",
    "sublocation",
    "location",
    "coordinates",
    "position",
    "address",
    "postalcode",
    "worldregion",
    "locationcreated",
    "locationshown",
  ]),
  software: new Set([
    "software",
    "softwareversion",
    "creatortool",
    "processingsoftware",
    "hostcomputer",
    "history",
    "derivedfrom",
    "xmptoolkit",
    "originatingprogram",
    "programversion",
    "firmware",
  ]),
  thumbnails: new Set([
    "thumbnail",
    "thumbnailimage",
    "mpimage",
    "mpimage2",
    "mpimage3",
    "previewimage",
    "jpgfromraw",
    "otherimage",
    "preview",
    "numberofimages",
  ]),
  time: new Set([
    "datetime",
    "datetimeoriginal",
    "datetimedigitized",
    "modifydate",
    "createdate",
    "offsettime",
    "offsettimeoriginal",
    "offsettimedigitized",
    "subsectime",
    "subsectimeoriginal",
    "subsectimedigitized",
    "datecreated",
    "timecreated",
    "datemodified",
    "metadatadate",
    "creationdate",
    "expiredate",
    "releasedate",
    "modifytimestamp",
  ]),
} as const;

const isTime = (name: string): boolean => {
  if (
    name.includes("exposuretime") ||
    name.includes("shutterspeed") ||
    name.includes("focallength") ||
    name.includes("digitalzoom") ||
    name.includes("subsectime") ||
    name.includes("offsettime")
  ) {
    return NAMES.time.has(name) || name.startsWith("subsectime");
  }
  return (
    NAMES.time.has(name) ||
    (name.endsWith("date") && !name.includes("candidate")) ||
    (name.endsWith("time") && !name.includes("timestamp"))
  );
};

/** The Metadata Group a tag label belongs to. */
const groupOfName = (label: string, fallback: MetadataGroup): MetadataGroup => {
  const name = normalize(label);
  if (name.length === 0) {
    return fallback;
  }
  if (NAMES.thumbnails.has(name) || name.includes("thumbnail")) {
    return "thumbnails";
  }
  if (NAMES.display.has(name)) {
    return "display";
  }
  if (NAMES.location.has(name) || name.startsWith("gps")) {
    return "location";
  }
  if (NAMES.device.has(name)) {
    return "device-identity";
  }
  if (NAMES.authorship.has(name)) {
    return "authorship";
  }
  if (NAMES.software.has(name)) {
    return "software-history";
  }
  if (
    NAMES.thumbnails.has(name) ||
    name.includes("thumbnail") ||
    name.startsWith("mpimage")
  ) {
    return "thumbnails";
  }
  if (
    NAMES.ai.has(name) ||
    name.includes("digitalsourcetype") ||
    name.includes("aigenerated") ||
    name.includes("softwareagent")
  ) {
    return "ai-provenance";
  }
  if (isTime(name)) {
    return "time";
  }
  if (
    NAMES.camera.has(name) ||
    name.startsWith("exposure") ||
    name.startsWith("iso") ||
    name.startsWith("focal") ||
    name.endsWith("program") ||
    name.endsWith("mode") ||
    name.includes("metering") ||
    name.includes("whitebalance") ||
    name.includes("flash")
  ) {
    return "camera-settings";
  }
  if (
    name.includes("description") ||
    name.includes("comment") ||
    name.includes("caption") ||
    name.includes("keyword") ||
    name.includes("subject") ||
    name.includes("title") ||
    name === "label" ||
    name === "rating" ||
    name === "genre" ||
    name.startsWith("xp")
  ) {
    return "other-text";
  }
  return fallback;
};

/** Map ExifTool's group vocabulary to container families. */
export const containerFor = (
  key: string,
  family: FormatFamily = "image"
): MetadataContainer => {
  if (key.startsWith("XMP")) {
    return family === "document" ? "pdf-xmp" : "xmp";
  }
  if (key === "PDF") {
    return "pdf-info";
  }
  if (key.startsWith("ID3")) {
    return "id3";
  }
  if (/Vorbis|Opus/u.test(key)) {
    return "vorbis";
  }
  if (/Matroska|Info/u.test(key) && family === "video") {
    return "matroska";
  }
  if (key === "RIFF") {
    return family === "image" ? "file" : "riff-info";
  }
  if (["ItemList", "Keys", "UserData"].includes(key)) {
    return "item-list";
  }
  if (/QuickTime|Track|Media/u.test(key)) {
    return "quicktime";
  }
  if (key === "GPS") {
    return "gps";
  }
  if (key.startsWith("ICC")) {
    return "icc";
  }
  if (key === "IPTC") {
    return "iptc";
  }
  if (/^MP(?:F\d*|Image\d+)$/u.test(key)) {
    return "mpf";
  }
  if (["JUMBF", "CBOR", "JSON", "Jpeg2000"].includes(key)) {
    return "c2pa";
  }
  if (
    ["IFD0", "IFD1", "ExifIFD", "InteropIFD", "EXIF", "SubIFD"].includes(key)
  ) {
    return "exif";
  }
  if (/Nikon|Canon|Sony|Olympus|Panasonic|Pentax|Fuji|Maker/u.test(key)) {
    return "makernote";
  }
  return "file";
};

/* -------------------------------------------------------------------------- */
/* The curated ExifTool table                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The tags one group removes. Tags are qualified where a bare name would also
 * match a Display field or a field in another group. `display` is empty on
 * purpose: no clean removes Display Metadata.
 */
const IMAGE_TAGS: Record<MetadataGroup, readonly string[]> = {
  "ai-provenance": ["JUMBF:all", "XMP-iptcExt:DigitalSourceType"],
  location: [
    "GPS:all",
    "XMP-iptcCore:Location",
    "XMP-photoshop:City",
    "XMP-photoshop:Country",
    "XMP-photoshop:State",
    "XMP-iptcExt:LocationCreated",
    "XMP-iptcExt:LocationShown",
    "IPTC:City",
    "IPTC:Sub-location",
    "IPTC:Province-State",
    "IPTC:Country-PrimaryLocationName",
    "IPTC:Country-PrimaryLocationCode",
  ],
  time: [
    "EXIF:DateTimeOriginal",
    "EXIF:CreateDate",
    "EXIF:ModifyDate",
    "EXIF:OffsetTime",
    "EXIF:OffsetTimeOriginal",
    "EXIF:OffsetTimeDigitized",
    "EXIF:SubSecTime",
    "EXIF:SubSecTimeOriginal",
    "EXIF:SubSecTimeDigitized",
    "XMP-xmp:CreateDate",
    "XMP-xmp:ModifyDate",
    "XMP-xmp:MetadataDate",
    "XMP-photoshop:DateCreated",
    "IPTC:DateCreated",
    "IPTC:TimeCreated",
    "PNG:CreateDate",
    "PNG:ModifyDate",
  ],
  "device-identity": [
    "EXIF:Make",
    "EXIF:Model",
    "EXIF:LensMake",
    "EXIF:LensModel",
    "EXIF:SerialNumber",
    "EXIF:LensSerialNumber",
    "EXIF:CameraSerialNumber",
    "EXIF:OwnerName",
    "EXIF:ImageUniqueID",
    "XMP-tiff:Make",
    "XMP-tiff:Model",
    "XMP-exifEX:LensModel",
    "XMP-exifEX:LensSerialNumber",
    "XMP-aux:SerialNumber",
    "XMP-aux:OwnerName",
    "XMP-aux:Lens",
    "PNG:Make",
    "PNG:Model",
  ],
  "camera-settings": [
    "EXIF:ExposureTime",
    "EXIF:FNumber",
    "EXIF:ISO",
    "XMP-exif:ISO",
    "XMP-exif:ExposureCompensation",
    "XMP-exif:FocalLengthIn35mmFormat",
    "EXIF:SensitivityType",
    "EXIF:RecommendedExposureIndex",
    "EXIF:ExposureProgram",
    "EXIF:ExposureMode",
    "EXIF:ExposureCompensation",
    "EXIF:MeteringMode",
    "EXIF:Flash",
    "EXIF:FocalLength",
    "EXIF:FocalLengthIn35mmFormat",
    "EXIF:LensInfo",
    "XMP-aux:LensInfo",
    "EXIF:ShutterSpeedValue",
    "EXIF:ApertureValue",
    "EXIF:MaxApertureValue",
    "EXIF:BrightnessValue",
    "EXIF:LightSource",
    "EXIF:WhiteBalance",
    "EXIF:SceneCaptureType",
    "EXIF:SceneType",
    "EXIF:SensingMethod",
    "EXIF:FileSource",
    "EXIF:CustomRendered",
    "EXIF:Contrast",
    "EXIF:Saturation",
    "EXIF:Sharpness",
    "EXIF:GainControl",
    "EXIF:SubjectDistance",
    "EXIF:SubjectDistanceRange",
    "EXIF:DigitalZoomRatio",
    "XMP-exif:ExposureTime",
    "XMP-exif:FNumber",
    "XMP-exif:ExposureProgram",
    "XMP-exif:MeteringMode",
    "XMP-exif:Flash",
    "XMP-exif:FocalLength",
    "XMP-exif:WhiteBalance",
    "XMP-exif:SceneCaptureType",
    "XMP-exif:Contrast",
    "XMP-exif:Saturation",
    "XMP-exif:Sharpness",
    "XMP-exif:SubjectDistance",
    "XMP-exif:DigitalZoomRatio",
  ],
  authorship: [
    "EXIF:Artist",
    "EXIF:Copyright",
    "XMP-dc:Creator",
    "XMP-dc:Rights",
    "XMP-photoshop:Credit",
    "XMP-photoshop:Source",
    "XMP-xmpRights:WebStatement",
    "XMP-xmpRights:UsageTerms",
    "IPTC:By-line",
    "IPTC:CopyrightNotice",
    "IPTC:Credit",
    "IPTC:Source",
    "PNG:Artist",
    "PNG:Copyright",
    "PNG:Author",
  ],
  "software-history": [
    "EXIF:Software",
    "EXIF:ProcessingSoftware",
    "EXIF:HostComputer",
    "XMP-xmp:CreatorTool",
    "XMP-xmpMM:History",
    "XMP-xmpMM:DerivedFrom",
    "XMP-xmpMM:PreservedFileName",
    "IPTC:OriginatingProgram",
    "IPTC:ProgramVersion",
    "PNG:Software",
  ],
  thumbnails: [
    "ThumbnailImage",
    "MPF:all",
    "PreviewImage",
    "JpgFromRaw",
    "OtherImage",
  ],
  "other-text": [
    "EXIF:ImageDescription",
    "EXIF:UserComment",
    "EXIF:XPTitle",
    "EXIF:XPComment",
    "EXIF:XPSubject",
    "EXIF:XPKeywords",
    "XMP-dc:Description",
    "XMP-dc:Title",
    "XMP-dc:Subject",
    "XMP-xmp:Rating",
    "XMP-xmp:Label",
    "IPTC:Caption-Abstract",
    "IPTC:ObjectName",
    "IPTC:Keywords",
    "IPTC:SpecialInstructions",
    "PNG:Description",
    "PNG:Comment",
    "PNG:Title",
  ],
  display: [],
};

const emptyMap = (): Record<MetadataGroup, readonly string[]> => ({
  "ai-provenance": [],
  location: [],
  time: [],
  "device-identity": [],
  "camera-settings": [],
  authorship: [],
  "software-history": [],
  thumbnails: [],
  "other-text": [],
  display: [],
});
const MEDIA_TAGS = {
  ...emptyMap(),
  location: [
    "QuickTime:GPSCoordinates",
    "Keys:GPSCoordinates",
    "XMP-iptcCore:Location",
  ],
  time: [
    "QuickTime:CreateDate",
    "QuickTime:ModifyDate",
    "QuickTime:TrackCreateDate",
    "QuickTime:TrackModifyDate",
    "QuickTime:MediaCreateDate",
    "QuickTime:MediaModifyDate",
    "Keys:CreationDate",
    "XMP-xmp:CreateDate",
    "XMP-xmp:ModifyDate",
  ],
  "device-identity": [
    "QuickTime:Make",
    "QuickTime:Model",
    "Keys:Make",
    "Keys:Model",
  ],
  authorship: [
    "QuickTime:Artist",
    "QuickTime:Author",
    "ItemList:Artist",
    "ItemList:Author",
    "UserData:Author",
    "XMP-dc:Creator",
    "XMP-dc:Rights",
  ],
  "software-history": [
    "QuickTime:Software",
    "Keys:Software",
    "UserData:SoftwareVersion",
    "ItemList:Encoder",

    "XMP-xmp:CreatorTool",
  ],
  thumbnails: ["ItemList:CoverArt", "QuickTime:CoverArt"],
  "other-text": [
    "QuickTime:Title",
    "QuickTime:Comment",
    "ItemList:Title",
    "ItemList:Comment",
    "UserData:Title",
    "UserData:Comment",
    "XMP-dc:Title",
    "XMP-dc:Description",
  ],
};
export const TAG_MAP: Record<
  FormatFamily,
  Record<MetadataGroup, readonly string[]>
> = {
  image: IMAGE_TAGS,
  raw: emptyMap(),
  document: emptyMap(),
  video: MEDIA_TAGS,
  audio: MEDIA_TAGS,
  office: {
    ...emptyMap(),
    time: [
      "ooxml-core:created",
      "ooxml-core:modified",
      "ooxml-core:lastPrinted",
      "ooxml-app:TotalTime",
    ],
    authorship: [
      "ooxml-core:creator",
      "ooxml-core:lastModifiedBy",
      "ooxml-core:rights",
      "ooxml-app:Manager",
    ],
    "software-history": [
      "ooxml-app:Application",
      "ooxml-app:AppVersion",
      "ooxml-app:Company",
      "ooxml-app:Template",
      "ooxml-core:revision",
      "ooxml-core:version",
    ],
    "other-text": [
      "ooxml-core:title",
      "ooxml-core:subject",
      "ooxml-core:description",
      "ooxml-core:keywords",
      "ooxml-core:category",
      "ooxml-custom:property",
      "ooxml-core:Other property",
      "ooxml-app:Other property",
    ],
    thumbnails: ["docProps/thumbnail.jpeg"],
  },
};
const TAG_GROUPS = new Map(
  Object.entries(TAG_MAP).flatMap(([family, groups]) =>
    Object.entries(groups).flatMap(([group, tags]) =>
      tags.map((tag) => {
        const colon = tag.indexOf(":");
        const prefix = colon === -1 ? "EXIF" : tag.slice(0, colon);
        const label = colon === -1 ? tag : tag.slice(colon + 1);
        const container = prefix.startsWith("ooxml-")
          ? prefix
          : containerFor(prefix);
        // SAFETY: every group comes from the fixed TAG_MAP MetadataGroup keys.
        return [
          `${family}:${container}:${normalize(label)}`,
          group as MetadataGroup,
        ] as const;
      })
    )
  )
);

/** The Metadata Group a field in one container belongs to. */
export const groupOf = (
  family: FormatFamily,
  container: MetadataContainer,
  label: string,
  fallback?: MetadataGroup
): MetadataGroup => {
  const fixed = TAG_GROUPS.get(`${family}:${container}:${normalize(label)}`);
  if (fixed !== undefined) {
    return fixed;
  }
  if ((family === "video" || family === "audio") && container === "quicktime") {
    return "display";
  }
  if (container === "ooxml-custom") {
    return "other-text";
  }
  if (label === "CoverArt" || label === "Picture" || label === "Thumbnail") {
    return "thumbnails";
  }
  if (label === "Creator" && family === "document") {
    return "software-history";
  }
  if (
    [
      "Producer",
      "Application",
      "AppVersion",
      "Company",
      "Encoder",
      "EncoderSettings",
      "MuxingApp",
      "WritingApp",
      "XMPToolkit",
    ].includes(label)
  ) {
    return "software-history";
  }
  if (label === "LastModifiedBy") {
    return "authorship";
  }
  if (
    [
      "TrackCreateDate",
      "TrackModifyDate",
      "MediaCreateDate",
      "MediaModifyDate",
      "DateUTC",
      "CreationDate",
    ].includes(label)
  ) {
    return "time";
  }
  if (container === "icc") {
    return "display";
  }
  if (container === "c2pa") {
    return "ai-provenance";
  }
  if (container === "gps") {
    return "location";
  }
  if (container === "mpf") {
    return "thumbnails";
  }
  if (container === "makernote") {
    const group = groupOfName(label, "camera-settings");
    return group === "display" ? "camera-settings" : group;
  }
  if (container === "xmp" || container === "iptc" || container === "exif") {
    return groupOfName(
      label,
      fallback ?? (container === "iptc" ? "other-text" : "camera-settings")
    );
  }
  return groupOfName(
    label,
    fallback ??
      (["item-list", "pdf-info", "pdf-xmp"].includes(container)
        ? "other-text"
        : "display")
  );
};

export const canRemoveGroup = (
  format: FileFormat,
  group: MetadataGroup
): boolean => {
  if (
    ["dng", "pdf", "webm", "mkv", "avi", "mp3", "wav", "flac", "ogg"].includes(
      format
    )
  ) {
    return false;
  }
  if (format === "jxl" && group === "ai-provenance") {
    return false;
  }
  const family = ["mp4", "mov", "m4v"].includes(format)
    ? "video"
    : format === "m4a"
      ? "audio"
      : ["docx", "xlsx", "pptx"].includes(format)
        ? "office"
        : "image";
  return TAG_MAP[family][group].length > 0;
};

export interface CleanTags {
  /** Tag names to remove. The value is always empty: ExifTool deletes it. */
  readonly tags: readonly string[];
  /** Whether the selection touches a Maker Note and removes it whole. */
  readonly makerNote: boolean;
}

/** The groups a Maker Note can repeat. A note is never left partial. */
const MAKER_NOTE_GROUPS: readonly MetadataGroup[] = [
  "time",
  "device-identity",
  "camera-settings",
  "authorship",
  "software-history",
  "other-text",
];

const groupsInMakerNote = (report: ReadReport): readonly MetadataGroup[] => {
  const hasMakerNote =
    report.notes.some((note) => note.code === "maker-note") ||
    report.fields.some((field) => field.container === "makernote");
  return hasMakerNote ? MAKER_NOTE_GROUPS : [];
};

/**
 * The ExifTool tags a clean removes for the selected groups.
 *
 * A Maker Note repeats camera, time, and settings fields. When a selection
 * touches any group the note carries, the whole note goes, and the caller
 * adds the warning.
 */
export const cleanTagsFor = (
  selected: readonly MetadataGroup[],
  report: ReadReport
): CleanTags => {
  const groups = selected.filter((group) => group !== "display");
  const makerNoteGroups = groupsInMakerNote(report);
  const makerNote =
    makerNoteGroups.length > 0 &&
    groups.some((group) => makerNoteGroups.includes(group));
  const tags = new Set<string>();
  for (const group of groups) {
    for (const tag of TAG_MAP[report.facts.family][group]) {
      tags.add(tag);
    }
  }
  if (makerNote) {
    tags.add("MakerNotes:all");
  }
  return { makerNote, tags: [...tags] };
};
