import { Schema } from "effect";

import {
  FileFormat,
  MetadataGroup,
  ExposeErrorCode,
} from "@/features/expose/expose.vocabulary";

export class ExposeError extends Schema.TaggedError<ExposeError>()(
  "ExposeError",
  {
    code: ExposeErrorCode,
    detail: Schema.String,
    format: Schema.optional(FileFormat),
    group: Schema.optional(MetadataGroup),
  }
) {}
