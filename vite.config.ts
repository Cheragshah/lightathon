import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: true,
    port: 3000,
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: [
      "cs8s8s4080gc0w84gsoskw8w.72.61.229.63.sslip.io",
    ],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
