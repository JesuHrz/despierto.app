import { defineConfig } from "astro/config";

import sitemap from "@astrojs/sitemap";

// Static output: Netlify serves dist/ directly, no adapter needed.
// prefixDefaultLocale:false keeps "/" as Spanish (preserving the indexed URLs)
// and puts English under "/en".
export default defineConfig({
  site: "https://despierto.app",

  i18n: {
    defaultLocale: "es",
    locales: ["es", "en"],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: "es",
        locales: { es: "es-ES", en: "en-US" },
      },
    }),
  ],
});