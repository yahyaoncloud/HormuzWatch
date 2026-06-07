import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env variables regardless of the VITE_ prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
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
          // Use the loaded env object here
          target: env.VITE_API_URL || "http://localhost:8080", 
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
  };
});