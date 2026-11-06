/* oxlint-disable typescript/no-empty-interface, typescript/no-empty-object-type -- Schema records use the project interface convention. */
import { Schema } from "effect";

const Revision = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
);
const Byte = Schema.Int.check(
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(255)
);
export const Entry = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.NonEmptyString,
  parent: Schema.NullOr(Schema.String),
  name: Schema.NonEmptyString,
  kind: Schema.Literals(["document", "folder"]),
  revision: Revision,
  trash: Schema.NullOr(Schema.String),
});
export interface Entry extends Schema.Schema.Type<typeof Entry> {}
export const Body = Schema.Struct({
  version: Schema.Literal(1),
  id: Schema.NonEmptyString,
  source: Schema.String,
  revision: Revision,
  original: Schema.NullOr(Schema.Array(Byte)),
  originalSource: Schema.NullOr(Schema.String),
  copies: Schema.Array(
    Schema.Struct({ source: Schema.String, at: Schema.Number })
  ),
});
export interface Body extends Schema.Schema.Type<typeof Body> {}
export const LinkFailure = Schema.Struct({
  href: Schema.String,
  reason: Schema.Literals([
    "invalid",
    "outside-root",
    "missing",
    "folder",
    "open",
  ]),
});
export interface LinkFailure extends Schema.Schema.Type<typeof LinkFailure> {}
export interface LinkTarget {
  readonly id: string;
  readonly fragment: string | null;
}
export interface LinkNavigation extends LinkTarget {
  readonly sequence: number;
}
export class QuillError extends Schema.TaggedError<QuillError>()("QuillError", {
  link: Schema.optional(LinkFailure),
  reason: Schema.Literals([
    "storage",
    "migration",
    "unreadable",
    "invalid",
    "conflict",
    "conversion",
    "offline",
    "resource",
    "export",
  ]),
}) {}
export type Mode = "split" | "visual" | "source" | "read";
export type SaveState = "saved" | "dirty" | "saving" | "failed" | "conflict";
export interface Document extends Body {
  readonly name: string;
  readonly compatibility: Compatibility;
}
export interface Compatibility {
  readonly safe: boolean;
  readonly affected: readonly string[];
  readonly converted: string | null;
}
export interface View {
  readonly entries: readonly Entry[];
  readonly document: Document | null;
  readonly save: SaveState;
  readonly mode: Mode;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly persistence: boolean | null;
  readonly unreadable: number;
}
export interface Mutation {
  readonly expected: readonly {
    readonly id: string;
    readonly revision: number | null;
  }[];
  readonly entries: readonly Entry[];
  readonly bodies: readonly Body[];
  readonly remove: readonly string[];
}
export interface FileInput {
  readonly path: string;
  readonly bytes: Uint8Array;
}
export interface Output {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly mime: string;
}
