import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "logo.png", "icon-192.png", "icon-512.png"],
      manifest: {
        name: "Think - Finanzas Inteligentes",
        short_name: "Think",
        description: "Tu asesor financiero personal y control de finanzas con inteligencia artificial.",
        theme_color: "#863bff",
        background_color: "#ede9fe",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    }),
  ],
  preview: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    allowedHosts: ["mifront-production.up.railway.app"],
  },
});
