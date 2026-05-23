import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
  },
  plugins: [
    {
      name: "spa-tour-rewrite",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url && req.url.startsWith("/tour/")) {
            req.url = "/";
          }
          next();
        });
      },
    },
  ],
});
