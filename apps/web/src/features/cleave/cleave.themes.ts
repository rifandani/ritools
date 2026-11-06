// Metadata from every bundled @pierre/highlights 0.4.0 theme.
// Keep palettes lazy: the diff library loads the selected theme on demand.
const THEME_CATALOG = [
  {
    id: "andromeeda",
    name: "Andromeeda",
    mode: "dark",
  },
  {
    id: "aurora-x",
    name: "Aurora X",
    mode: "dark",
  },
  {
    id: "ayu-dark",
    name: "Ayu Dark",
    mode: "dark",
  },
  {
    id: "ayu-light",
    name: "Ayu Light",
    mode: "light",
  },
  {
    id: "ayu-mirage",
    name: "Ayu Mirage",
    mode: "dark",
  },
  {
    id: "catppuccin-frappe",
    name: "Catppuccin Frappé",
    mode: "dark",
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    mode: "light",
  },
  {
    id: "catppuccin-macchiato",
    name: "Catppuccin Macchiato",
    mode: "dark",
  },
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    mode: "dark",
  },
  {
    id: "dark-plus",
    name: "Dark Plus",
    mode: "dark",
  },
  {
    id: "dracula",
    name: "Dracula Theme",
    mode: "dark",
  },
  {
    id: "dracula-soft",
    name: "Dracula Theme Soft",
    mode: "dark",
  },
  {
    id: "everforest-dark",
    name: "Everforest Dark",
    mode: "dark",
  },
  {
    id: "everforest-light",
    name: "Everforest Light",
    mode: "light",
  },
  {
    id: "github-dark",
    name: "GitHub Dark",
    mode: "dark",
  },
  {
    id: "github-dark-default",
    name: "GitHub Dark Default",
    mode: "dark",
  },
  {
    id: "github-dark-dimmed",
    name: "GitHub Dark Dimmed",
    mode: "dark",
  },
  {
    id: "github-dark-high-contrast",
    name: "GitHub Dark High Contrast",
    mode: "dark",
  },
  {
    id: "github-light",
    name: "GitHub Light",
    mode: "light",
  },
  {
    id: "github-light-default",
    name: "GitHub Light Default",
    mode: "light",
  },
  {
    id: "github-light-high-contrast",
    name: "GitHub Light High Contrast",
    mode: "light",
  },
  {
    id: "gruvbox-dark-hard",
    name: "Gruvbox Dark Hard",
    mode: "dark",
  },
  {
    id: "gruvbox-dark-medium",
    name: "Gruvbox Dark Medium",
    mode: "dark",
  },
  {
    id: "gruvbox-dark-soft",
    name: "Gruvbox Dark Soft",
    mode: "dark",
  },
  {
    id: "gruvbox-light-hard",
    name: "Gruvbox Light Hard",
    mode: "light",
  },
  {
    id: "gruvbox-light-medium",
    name: "Gruvbox Light Medium",
    mode: "light",
  },
  {
    id: "gruvbox-light-soft",
    name: "Gruvbox Light Soft",
    mode: "light",
  },
  {
    id: "horizon",
    name: "Horizon",
    mode: "dark",
  },
  {
    id: "horizon-bright",
    name: "Horizon Bright",
    mode: "light",
  },
  {
    id: "houston",
    name: "Houston",
    mode: "dark",
  },
  {
    id: "kanagawa-dragon",
    name: "Kanagawa Dragon",
    mode: "dark",
  },
  {
    id: "kanagawa-lotus",
    name: "Kanagawa Lotus",
    mode: "light",
  },
  {
    id: "kanagawa-wave",
    name: "Kanagawa Wave",
    mode: "dark",
  },
  {
    id: "laserwave",
    name: "LaserWave",
    mode: "dark",
  },
  {
    id: "light-plus",
    name: "Light Plus",
    mode: "light",
  },
  {
    id: "material-theme",
    name: "Material Theme",
    mode: "dark",
  },
  {
    id: "material-theme-darker",
    name: "Material Theme Darker",
    mode: "dark",
  },
  {
    id: "material-theme-lighter",
    name: "Material Theme Lighter",
    mode: "light",
  },
  {
    id: "material-theme-ocean",
    name: "Material Theme Ocean",
    mode: "dark",
  },
  {
    id: "material-theme-palenight",
    name: "Material Theme Palenight",
    mode: "dark",
  },
  {
    id: "min-dark",
    name: "Min Dark",
    mode: "dark",
  },
  {
    id: "min-light",
    name: "Min Light",
    mode: "light",
  },
  {
    id: "monokai",
    name: "Monokai",
    mode: "dark",
  },
  {
    id: "night-owl",
    name: "Night Owl",
    mode: "dark",
  },
  {
    id: "night-owl-light",
    name: "Night Owl Light",
    mode: "light",
  },
  {
    id: "nord",
    name: "Nord",
    mode: "dark",
  },
  {
    id: "one-dark-pro",
    name: "One Dark Pro",
    mode: "dark",
  },
  {
    id: "one-light",
    name: "One Light",
    mode: "light",
  },
  {
    id: "pierre-dark",
    name: "Pierre Dark",
    mode: "dark",
  },
  {
    id: "pierre-dark-protanopia-deuteranopia",
    name: "Pierre Dark Protanopia & Deuteranopia",
    mode: "dark",
  },
  {
    id: "pierre-dark-soft",
    name: "Pierre Dark Soft",
    mode: "dark",
  },
  {
    id: "pierre-dark-tritanopia",
    name: "Pierre Dark Tritanopia",
    mode: "dark",
  },
  {
    id: "pierre-dark-vibrant",
    name: "Pierre Dark Vibrant",
    mode: "dark",
  },
  {
    id: "pierre-light",
    name: "Pierre Light",
    mode: "light",
  },
  {
    id: "pierre-light-protanopia-deuteranopia",
    name: "Pierre Light Protanopia & Deuteranopia",
    mode: "light",
  },
  {
    id: "pierre-light-soft",
    name: "Pierre Light Soft",
    mode: "light",
  },
  {
    id: "pierre-light-tritanopia",
    name: "Pierre Light Tritanopia",
    mode: "light",
  },
  {
    id: "pierre-light-vibrant",
    name: "Pierre Light Vibrant",
    mode: "light",
  },
  {
    id: "plastic",
    name: "Plastic",
    mode: "dark",
  },
  {
    id: "poimandres",
    name: "Poimandres",
    mode: "dark",
  },
  {
    id: "red",
    name: "Red",
    mode: "dark",
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    mode: "dark",
  },
  {
    id: "rose-pine-dawn",
    name: "Rosé Pine Dawn",
    mode: "light",
  },
  {
    id: "rose-pine-moon",
    name: "Rosé Pine Moon",
    mode: "dark",
  },
  {
    id: "slack-dark",
    name: "Slack Dark",
    mode: "dark",
  },
  {
    id: "slack-ochin",
    name: "Slack Ochin",
    mode: "light",
  },
  {
    id: "snazzy-light",
    name: "Snazzy Light",
    mode: "light",
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    mode: "dark",
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    mode: "light",
  },
  {
    id: "synthwave-84",
    name: "Synthwave '84",
    mode: "dark",
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    mode: "dark",
  },
  {
    id: "vesper",
    name: "Vesper",
    mode: "dark",
  },
  {
    id: "vitesse-black",
    name: "Vitesse Black",
    mode: "dark",
  },
  {
    id: "vitesse-dark",
    name: "Vitesse Dark",
    mode: "dark",
  },
  {
    id: "vitesse-light",
    name: "Vitesse Light",
    mode: "light",
  },
] as const;

export type DiffTheme = (typeof THEME_CATALOG)[number]["id"];
export type ThemeMode = (typeof THEME_CATALOG)[number]["mode"];
export const themesForMode = (mode: ThemeMode) =>
  THEME_CATALOG.filter((theme) => theme.mode === mode);
