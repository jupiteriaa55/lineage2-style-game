import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/*.png"],
      manifest: {
        name: "Chronicle Elfs",
        short_name: "Chronicle Elfs",
        description:
          "Chronicle Elfs \u2014 3D top-down MMORPG-style game inspired by Lineage 2.",
        theme_color: "#1a1a2e",
        background_color: "#0a0a14",
        display: "standalone",
        orientation: "landscape",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: "es2022",
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
