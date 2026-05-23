import { builtinModules } from "node:module";
import { defineConfig } from "vite-plus";

export default defineConfig({
	pack: {
		entry: ["src/index.ts"],
		format: ["esm"],
		dts: true,
		outDir: "dist",
		clean: true,
		minify: false,
		sourcemap: false,
		target: "es2022",
		platform: "node",
		deps: {
			neverBundle: [...builtinModules, ...builtinModules.map((moduleName) => `node:${moduleName}`)],
		},
	},
	lint: {
		plugins: ["typescript"],
		ignorePatterns: ["dist/**"],
		categories: {
			correctness: "warn",
			suspicious: "warn",
			perf: "warn",
		},
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
	fmt: {
		useTabs: true,
		singleQuote: false,
	},
});
