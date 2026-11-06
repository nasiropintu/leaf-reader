import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { publicPlatformScript } from "./server/_core/publicConfig";

// Static development and static publishing whitelist.
// Runtime-only secrets never enter the browser bundle.
function vitePluginPublicPlatformConfig(): Plugin {
  return {
    name: "public-platform-config",
    configureServer(server) {
      server.middlewares.use("/api/platform/config.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-store");
        res.end(publicPlatformScript());
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "api/platform/config.js", source: publicPlatformScript() });
    },
  };
}

// Generate 404.html for SPA fallback on GitHub Pages & inject build assets into service-worker.js
function vitePluginPwaAndSpa(): Plugin {
  return {
    name: "pwa-and-spa-builder",
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, "dist/public");
      const indexPath = path.join(distDir, "index.html");
      const notFoundPath = path.join(distDir, "404.html");
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
      }

      // Collect compiled assets from dist/public/assets and inject into service-worker.js
      const assetsDir = path.join(distDir, "assets");
      const swPath = path.join(distDir, "service-worker.js");
      if (fs.existsSync(assetsDir) && fs.existsSync(swPath)) {
        const assetFiles = fs.readdirSync(assetsDir);
        const assetUrls = assetFiles.map((file) => `  "./assets/${file}"`).join(",\n");
        let swContent = fs.readFileSync(swPath, "utf-8");
        if (swContent.includes("/* __BUILD_ASSETS__ */")) {
          swContent = swContent.replace(
            "/* __BUILD_ASSETS__ */",
            `,\n${assetUrls}`
          );
          fs.writeFileSync(swPath, swContent, "utf-8");
        }
      }
    },
  };
}

const plugins = [
  vitePluginPublicPlatformConfig(),
  vitePluginPwaAndSpa(),
  react(),
  tailwindcss(),
  jsxLocPlugin(),
];

export default defineConfig({
  plugins,
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 3000,
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
