import { defineConfig } from "@vite-pwa/assets-generator/config";

// Use the paper ground from the master design for icons that need a background.
const background = "#F6F4EF";

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
