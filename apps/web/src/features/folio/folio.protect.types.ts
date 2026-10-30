/** One protection request: the bytes to protect and the PDF standard security settings. */
export interface FolioProtectRequest {
  readonly bytes: ArrayBuffer;
  readonly flags: number;
  readonly id: string;
  readonly ownerPassword: string;
  readonly userPassword: string;
}

export type FolioProtectReply =
  | {
      readonly bytes: ArrayBuffer;
      readonly id: string;
      readonly ok: true;
    }
  | {
      readonly id: string;
      readonly message: string;
      readonly ok: false;
    };

/** The PDF permission bits EmbedPDF's PDFium fork accepts. */
export const FOLIO_PDF_PERMISSION = {
  assembleDocument: 1024,
  copyContents: 16,
  extractForAccessibility: 512,
  fillForms: 256,
  modifyAnnotations: 32,
  modifyContents: 8,
  print: 4,
  printHighQuality: 2048,
} as const;

/** Every permission, the value a file without restrictions carries. */
export const FOLIO_PDF_ALLOW_ALL = 3900;
