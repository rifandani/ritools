import type { ChartConfig } from "@/core/components/ui/chart";

/**
 * Deterministic sample data shared across data-driven showcases. Hand-written
 * constants (no faker) so the catalog renders identically on every reload,
 * which keeps it useful for eyeballing visual regressions.
 */

/**
 * Five Batches of ten images each, sorted by where each image lands against
 * the 200 KB Target. The five bands are the five chart series.
 */
export const batchRuns = [
  {
    batch: "B01",
    "Under 100": 3,
    "100–150": 3,
    "150–200": 2,
    "Over 200": 1,
    Miss: 1,
  },
  {
    batch: "B02",
    "Under 100": 2,
    "100–150": 4,
    "150–200": 2,
    "Over 200": 2,
    Miss: 0,
  },
  {
    batch: "B03",
    "Under 100": 4,
    "100–150": 2,
    "150–200": 3,
    "Over 200": 0,
    Miss: 1,
  },
  {
    batch: "B04",
    "Under 100": 1,
    "100–150": 3,
    "150–200": 4,
    "Over 200": 1,
    Miss: 1,
  },
  {
    batch: "B05",
    "Under 100": 3,
    "100–150": 2,
    "150–200": 2,
    "Over 200": 2,
    Miss: 1,
  },
];

/** One Batch did not report the Over 200 band. */
export const batchRunsGap = batchRuns.map((run, index) =>
  index === 3 ? { ...run, "Over 200": null } : run
);

/** The totals of the five Batches, for the pie and the radial rings. */
export const batchOutcomes = [
  { band: "Under 100", value: 13 },
  { band: "100–150", value: 14 },
  { band: "150–200", value: 13 },
  { band: "Over 200", value: 6 },
  { band: "Miss", value: 4 },
];

/** One row, one key per band: the five rings of the radial bar. */
export const batchRings = [
  {
    band: "Batches 01–05",
    "Under 100": 13,
    "100–150": 14,
    "150–200": 13,
    "Over 200": 6,
    Miss: 4,
  },
];

export const batchConfig = {
  "Under 100": { label: "Under 100 KB" },
  "100–150": { label: "100–150 KB" },
  "150–200": { label: "150–200 KB" },
  "Over 200": { label: "Over 200 KB" },
  Miss: { label: "Miss" },
} satisfies ChartConfig;

/**
 * A user-picked color for the color widgets. HSL so hue-channel widgets don't
 * throw (`Unknown color channel: hue` on RGB hex). This is content, not chrome:
 * the control keeps the true color the user picked.
 */
export const pickedHsl = "hsl(174, 72%, 32%)";

/** The same pick with alpha, for the alpha channel. */
export const pickedHslA = "hsla(174, 72%, 32%, 0.6)";

export interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Editor" | "Viewer";
  status: "Active" | "Invited" | "Suspended";
}

export const demoUsers: DemoUser[] = [
  {
    id: 1,
    name: "Ava Thompson",
    email: "ava@example.com",
    role: "Admin",
    status: "Active",
  },
  {
    id: 2,
    name: "Liam Chen",
    email: "liam@example.com",
    role: "Editor",
    status: "Active",
  },
  {
    id: 3,
    name: "Noah Patel",
    email: "noah@example.com",
    role: "Viewer",
    status: "Invited",
  },
  {
    id: 4,
    name: "Mia Rodriguez",
    email: "mia@example.com",
    role: "Editor",
    status: "Suspended",
  },
];

export interface BatchFile {
  name: string;
  format: "JPEG" | "PNG" | "WebP" | "AVIF";
  /** Size before Squeeze, as shown to the user. */
  before: string;
  /** Size after Squeeze; `null` is a Miss: the image did not reach its Target. */
  after: string | null;
}

/** A Squeeze Batch with a 200 KB Target: one image per format, and one Miss. */
export const batchFiles: BatchFile[] = [
  { name: "IMG_4021.jpg", format: "JPEG", before: "3.2 MB", after: "198 KB" },
  {
    name: "receipt-scan.png",
    format: "PNG",
    before: "1.8 MB",
    after: "187 KB",
  },
  {
    name: "hero-banner.webp",
    format: "WebP",
    before: "940 KB",
    after: "196 KB",
  },
  {
    name: "team-photo.avif",
    format: "AVIF",
    before: "412 KB",
    after: "171 KB",
  },
  { name: "screenshot-0912.png", format: "PNG", before: "6.1 MB", after: null },
  { name: "IMG_4022.jpg", format: "JPEG", before: "2.9 MB", after: "199 KB" },
  { name: "logo-final.png", format: "PNG", before: "88 KB", after: "61 KB" },
  {
    name: "product-01.webp",
    format: "WebP",
    before: "1.1 MB",
    after: "194 KB",
  },
  { name: "IMG_4023.jpg", format: "JPEG", before: "4.4 MB", after: "200 KB" },
  {
    name: "map-export.avif",
    format: "AVIF",
    before: "730 KB",
    after: "190 KB",
  },
];
