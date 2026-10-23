/* eslint-disable eslint/complexity -- the group table is a semantic classification of hundreds of tag names */
/* oxlint-disable anti-slop/no-known-value-widening, react-doctor/js-combine-iterations, react-doctor/js-set-map-lookups -- the table is the owner of the group contract */
import type {
  MetadataContainer,
  MetadataGroup,
  ReadReport,
} from "@/features/expose/expose";

/**
 * Internal metadata classification and the curated tag table.
 *
 * ExifReader's tag names and ExifTool's tag names never leave this module. The
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
    "orientation",
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

/** The container family an ExifReader key maps to. */
const CONTAINER_BY_KEY: Record<string, MetadataContainer> = {
  composite: "exif",
  exif: "exif",
  gif: "file",
  gps: "gps",
  icc: "icc",
  iptc: "iptc",
  jfif: "file",
  makerNotes: "makernote",
  mpf: "mpf",
  png: "file",
  pngFile: "file",
  pngText: "file",
  riff: "file",
  xmp: "xmp",
  file: "file",
};

const containerFor = (key: string): MetadataContainer =>
  CONTAINER_BY_KEY[key] ?? "file";

/** The Metadata Group a field in one container belongs to. */
export const groupOf = (
  container: MetadataContainer,
  label: string,
  fallback?: MetadataGroup
): MetadataGroup => {
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
    return groupOfName(label, "camera-settings");
  }
  if (container === "xmp" || container === "iptc" || container === "exif") {
    return groupOfName(
      label,
      fallback ?? (container === "iptc" ? "other-text" : "camera-settings")
    );
  }
  return groupOfName(label, fallback ?? "display");
};

export { containerFor };

/* -------------------------------------------------------------------------- */
/* The curated ExifTool table                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The tags one group removes. Tags are qualified where a bare name would also
 * match a Display field or a field in another group. `display` is empty on
 * purpose: no clean removes Display Metadata.
 */
export const GROUP_TAGS: Record<MetadataGroup, readonly string[]> = {
  "ai-provenance": [
    "JUMBF:all",
    "XMP-iptcExt:DigitalSourceType",
    "XMP-plus:DigitalSourceType",
  ],
  location: [
    "GPS:all",
    "XMP-iptcCore:Location",
    "XMP-photoshop:City",
    "XMP-photoshop:Country",
    "XMP-photoshop:CountryCode",
    "XMP-photoshop:State",
    "XMP-photoshop:Location",
    "XMP-iptcExt:LocationCreated",
    "XMP-iptcExt:LocationShown",
    "IPTC:City",
    "IPTC:Sub-location",
    "IPTC:Province-State",
    "IPTC:Country-PrimaryLocationName",
    "IPTC:Country-PrimaryLocationCode",
    "PNG:Location",
  ],
  time: [
    "EXIF:DateTimeOriginal",
    "EXIF:CreateDate",
    "EXIF:ModifyDate",
    "EXIF:DateTimeDigitized",
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
    "XMP-iptcCore:DateCreated",
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
    "EXIF:BodySerialNumber",
    "EXIF:LensSerialNumber",
    "EXIF:CameraSerialNumber",
    "EXIF:InternalSerialNumber",
    "EXIF:OwnerName",
    "EXIF:CameraOwnerName",
    "EXIF:ImageUniqueID",
    "XMP-tiff:Make",
    "XMP-tiff:Model",
    "XMP-exifEX:LensModel",
    "XMP-exif:BodySerialNumber",
    "XMP-exifEX:LensSerialNumber",
    "XMP-aux:SerialNumber",
    "XMP-aux:OwnerName",
    "XMP-aux:Lens",
    "XMP-aux:LensModel",
    "PNG:Make",
    "PNG:Model",
  ],
  "camera-settings": [
    "EXIF:ExposureTime",
    "EXIF:FNumber",
    "EXIF:ISO",
    "EXIF:ISOSpeedRatings",
    "EXIF:SensitivityType",
    "EXIF:RecommendedExposureIndex",
    "EXIF:ExposureProgram",
    "EXIF:ExposureMode",
    "EXIF:ExposureBiasValue",
    "EXIF:ExposureCompensation",
    "EXIF:MeteringMode",
    "EXIF:Flash",
    "EXIF:FocalLength",
    "EXIF:FocalLengthIn35mmFilm",
    "EXIF:FocalLengthIn35mmFormat",
    "EXIF:LensSpecification",
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
    "XMP-exif:ISOSpeedRatings",
    "XMP-exif:ExposureProgram",
    "XMP-exif:ExposureBiasValue",
    "XMP-exif:MeteringMode",
    "XMP-exif:Flash",
    "XMP-exif:FocalLength",
    "XMP-exif:FocalLengthIn35mmFilm",
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
    "XMP-photoshop:Artist",
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
    "PNG:Subject",
  ],
  display: [],
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
    for (const tag of GROUP_TAGS[group]) {
      tags.add(tag);
    }
  }
  if (makerNote) {
    tags.add("MakerNotes:all");
  }
  return { makerNote, tags: [...tags] };
};
