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
  // Agrega este bloque para el servidor de desarrollo (npm run dev)
  server: {
    host: true, // Esto permite conexiones desde tu red local (Wi-Fi)
    port: 5173, // El puerto por defecto de Vite
    allowedHosts: [
      "mifront-production.up.railway.app", // Para Railway
      "localhost", // Para tu PC
      ".local" // Permite acceso desde móviles en la misma red
    ],
  },

  preview: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    allowedHosts: ["mifront-production.up.railway.app"],
  },
});
