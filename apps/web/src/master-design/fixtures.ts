import type { ChartConfig } from "@/core/components/ui/chart";

/**
 * Deterministic sample data shared across data-driven showcases. Hand-written
 * constants (no faker) so the catalog renders identically on every reload,
 * which keeps it useful for eyeballing visual regressions.
 */

export const revenueData = [
  { month: "Jan", Revenue: 4200, Expenses: 2400 },
  { month: "Feb", Revenue: 4600, Expenses: 2210 },
  { month: "Mar", Revenue: 5100, Expenses: 2290 },
  { month: "Apr", Revenue: 4780, Expenses: 2000 },
  { month: "May", Revenue: 5890, Expenses: 2181 },
  { month: "Jun", Revenue: 6390, Expenses: 2500 },
  { month: "Jul", Revenue: 7490, Expenses: 2100 },
];

export const revenueConfig = {
  Revenue: { label: "Revenue" },
  Expenses: { label: "Expenses" },
} satisfies ChartConfig;

export const shareData = [
  { name: "Chrome", value: 275 },
  { name: "Safari", value: 200 },
  { name: "Firefox", value: 187 },
  { name: "Edge", value: 173 },
  { name: "Other", value: 90 },
];

/** HSL so hue-channel color widgets don't throw (`Unknown color channel: hue` on RGB hex). */
export const brandHsl = "hsl(216, 98%, 52%)";

export const shareConfig = {
  Chrome: { label: "Chrome" },
  Safari: { label: "Safari" },
  Firefox: { label: "Firefox" },
  Edge: { label: "Edge" },
  Other: { label: "Other" },
} satisfies ChartConfig;

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
