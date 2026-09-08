import { defineConfig } from "tsdown";

/** Platform seed modules served by the DSH loader table (must stay external). */
const PLATFORM = new Set([
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-store",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives",
]);

export default defineConfig([
  // Node half: plain ESM library consumed by the Loader as lib/index.js.
  {
    entry: { index: "src/index.ts" },
    outDir: "lib",
    format: ["esm"],
    platform: "node",
    target: "es2022",
    dts: false,
    clean: false,
    fixedExtension: false,
  },
  // Browser half: CJS bundle registering through window.__ModuleLoader__.
  {
    entry: { client: "src/client/index.ts" },
    outDir: "lib",
    format: ["cjs"],
    platform: "browser",
    target: "es2022",
    dts: false,
    clean: false,
    deps: {
      neverBundle: (specifier: string) => PLATFORM.has(specifier),
      alwaysBundle: (specifier: string) => !PLATFORM.has(specifier),
    },
    outputOptions: {
      entryFileNames: "client.js",
      banner:
        'window.__ModuleLoader__.load({ id: "dsh-talk-m02", factory: (require) => {',
      footer: "return module.exports; } });",
      intro: "var module = { exports: {} }; var exports = module.exports;",
    },
  },
]);
