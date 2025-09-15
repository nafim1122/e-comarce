import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    // Bind explicitly to IPv4 loopback and use the fixed port Playwright and tests expect.
    // This avoids occasional IPv6 vs IPv4 binding mismatches on Windows which lead to
    // ERR_CONNECTION_REFUSED from scripts that resolve localhost to IPv4.
    host: "127.0.0.1",
    port: 5173,
    // Fail fast if the port is taken so the developer sees the conflict immediately.
    strictPort: true,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
