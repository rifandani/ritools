const BYTES_PER_KB = 1000;

/**
 * A file size a person reads, in bytes, kilobytes, megabytes, or gigabytes, in
 * the given Locale. Each unit above bytes prints at most one decimal place.
 */
export const formatBytes = (bytes: number, locale: string): string => {
  const units = ["B", "KB", "MB", "GB"];
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= BYTES_PER_KB && unit < units.length - 1) {
    value /= BYTES_PER_KB;
    unit += 1;
  }
  const digits = unit === 0 || Number.isInteger(value) ? 0 : 1;
  const label = units[unit] ?? "B";
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)} ${label}`;
};

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
