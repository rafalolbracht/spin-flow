// @ts-check
import { defineConfig } from "astro/config";
import analogjsangular from "@analogjs/astro-angular";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [analogjsangular(), sitemap()],
  server: {
    port: 4300,
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        // No external dependencies needed - using native fetch for Cloudflare Workers compatibility
      },
    },
  },
  adapter: cloudflare(),
  devToolbar: {
    enabled: false,
  },
});
