import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

/**
 * Vite Configuration for PHASE 2 Client
 *
 * Features:
 * - React 19 with Fast Refresh
 * - TypeScript support
 * - API proxy for backend integration
 * - Optimized build for production
 * - Source maps for debugging
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: ".",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8081",
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
    middlewareMode: false,
  },
  preview: {
    port: 4173,
    host: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "leaflet",
      "recharts",
      "lucide-react",
    ],
  },
});
