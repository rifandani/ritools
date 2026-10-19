import { defineConfig } from "@vite-pwa/assets-generator/config";

// Dark backdrop for icons that cannot be transparent (same as the dark `theme-color`).
const background = "#020203";

export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  images: ["public/logo.png"],
  preset: {
    apple: {
      sizes: [180],
      resizeOptions: { background },
    },
    maskable: {
      sizes: [192, 384, 512, 1024],
      resizeOptions: { background },
    },
    transparent: {
      favicons: [[48, "favicon.ico"]],
      sizes: [64, 192, 384, 512, 1024],
    },
  },
});
