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
      manifest: {
        name: "Mi App Financiera",
        short_name: "Finanzas",
        display: "standalone",
        theme_color: "#4f46e5",
      },
    }),
  ],
  preview: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
    allowedHosts: ["mifront-production.up.railway.app"],
  },
});
