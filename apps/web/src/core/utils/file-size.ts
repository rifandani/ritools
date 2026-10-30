const BYTES_PER_KB = 1000;

/**
 * A file size a person reads, in kilobytes. The File menus print one unit, so
 * 61,194 bytes prints as 61.2 KB and never as a raw byte count. Files are
 * quoted in decimal units, like the Expose and Squeeze size lines.
 */
export const formatKilobytes = (bytes: number, locale: string): string => {
  const value = Number.isFinite(bytes) ? Math.max(0, bytes) / BYTES_PER_KB : 0;
  const digits = Number.isInteger(value) ? 0 : 1;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)} KB`;
};
