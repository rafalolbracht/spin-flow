// @ts-check
import { defineConfig } from "astro/config";
import analogjsangular from "@analogjs/astro-angular";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  output: "server",
  site: "https://spin-flow.app",
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
    ssr: {
      external: ["node:async_hooks"],
    },
  },
  adapter: cloudflare({
    mode: "advanced",
    platformProxy: {
      enabled: true,
    },
  }),
  devToolbar: {
    enabled: false,
  },
});
