import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    allowedHosts: ["codexalpha.cloud", "www.codexalpha.cloud"]
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: ["codexalpha.cloud", "www.codexalpha.cloud"]
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
