import { defineConfig } from "tsup";

export default defineConfig([
  {
    entryPoints: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    minify: false,
    outDir: "dist/",
    clean: true,
    sourcemap: false,
    bundle: true,
    splitting: false,
    treeshake: false,
    target: "es2022",
    platform: "node",
    tsconfig: "./tsconfig.json",
    cjsInterop: true,
    keepNames: true,
    skipNodeModulesBundle: false,
  },
]);
