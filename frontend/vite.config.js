// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // If backend runs on your host:
        target: "http://localhost:8000",
        changeOrigin: true,
        // If your backend is inside Docker and your dev server is also in Docker,
        // use "http://backend:8000" instead.
        // target: "http://backend:8000",
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
