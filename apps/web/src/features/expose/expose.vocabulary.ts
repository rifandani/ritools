import { Schema } from "effect";

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

export const FileFormat = Schema.Literals([
  "dng",
  "jpeg",
  "jxl",
  "tiff",
  "png",
  "heic",
  "avif",
  "webp",
  "gif",
  "pdf",
  "mp4",
  "mov",
  "m4v",
  "webm",
  "mkv",
  "avi",
  "m4a",
  "mp3",
  "wav",
  "flac",
  "ogg",
  "docx",
  "xlsx",
  "pptx",
]);
export type FileFormat = typeof FileFormat.Type;

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
