import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  outDir: "dist",
  noSplitting: true,
  // Bundle @virtualtour/shared (TS workspace package) but keep
  // node_modules external so native binaries (Prisma) work correctly
  noExternal: ["@virtualtour/shared"],
  esbuildOptions(options) {
    options.alias = { "@": "./src" };
  },
});
