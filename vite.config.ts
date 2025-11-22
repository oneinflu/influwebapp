import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// Middleware plugin to normalize trailing slashes for SPA routes
const normalizeTrailingSlash: Plugin = {
  name: "normalize-trailing-slash",
  configureServer(server: ViteDevServer) {
    server.middlewares.use(
      (
        req: { url?: string } & Record<string, unknown>,
        _res: unknown,
        next: () => void
      ) => {
        const url = req.url || "/";
        // Only adjust routes (no file extension) and avoid root
        const [path, search = ""] = url.split("?");
        const isAsset = /\.[a-zA-Z0-9]+$/.test(path);
        if (!isAsset && path.length > 1 && path.endsWith("/")) {
          req.url = path.replace(/\/+$/, "") + (search ? `?${search}` : "");
        }
        next();
      }
    );
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    normalizeTrailingSlash,
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    port: 5176,
    strictPort: true,
    host: "localhost",
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5176,
    strictPort: true,
  },
});
