import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Codes&Bytes Sales",
        short_name: "CB Sales",
        description: "Partner & Associate sales tracking for Codes&Bytes products",
        theme_color: "#5b5bf0",
        background_color: "#f7f8fb",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml" },
          { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": "http://localhost:4500",
      "/go": "http://localhost:4500",
    },
  },
});
