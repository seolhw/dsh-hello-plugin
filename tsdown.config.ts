/**
 * dsh-talk 双面（dual-face）打包配置：
 *  - Node.js host（packages/host/src/index.ts）→ lib/index.mjs + index.cjs + d.ts
 *  - 浏览器 client（packages/client/src/index.ts）→ lib/client.js
 *    client 产物以 window.__ModuleLoader__.load({id, factory}) 交给 DSH 的
 *    web shell；react / cordis / ui-slots 等平台模块由 loader 的模块表提供，
 *    因此 externals（neverBundle），其余一律内联。
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { UserConfig } from "tsdown";

/** 浏览器平台模块（镜像 shell seed table） */
const PLATFORM_MODULES = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives",
] as const;

export default (): UserConfig[] => {
  const configs: UserConfig[] = [
    {
      name: "dsh-talk/host",
      entry: ["packages/host/src/index.ts"],
      outDir: "lib",
      format: ["esm", "cjs"],
      target: "es2022",
      dts: true,
      clean: true,
      // cordis / dsh 系 / schemastery 在运行期由 DSH 模块图提供（dev 走 repo node_modules）
      deps: {
        neverBundle: [
          "@deepseek-ai/cordis",
          "@deepseek-ai/dsh-settings",
          "@deepseek-ai/dsh-host-webserver",
          "@deepseek-ai/schemastery",
        ],
      },
    },
  ];

  if (existsSync(resolve(process.cwd(), "packages/client/src/index.ts"))) {
    configs.push({
      name: "dsh-talk/client",
      entry: { client: "packages/client/src/index.ts" },
      outDir: "lib",
      format: "cjs",
      platform: "browser",
      target: "es2022",
      dts: false,
      sourcemap: true,
      clean: false,
      deps: {
        neverBundle: [...PLATFORM_MODULES],
        // 不在平台模块表里的依赖（@dsh-talk/types、我们自己的代码等）一律内联
        alwaysBundle: (id: string) => (PLATFORM_MODULES.includes(id as never) ? undefined : true),
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
        "import.meta.env.MODE": JSON.stringify(process.env.NODE_ENV ?? "production"),
        "import.meta.env": JSON.stringify({ MODE: process.env.NODE_ENV ?? "production" }),
      },
      outputOptions: {
        entryFileNames: "client.js",
        banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify("dsh-talk")}, factory: (require) => {`,
        footer: "return module.exports; } });",
        intro: "var module = { exports: {} }; var exports = module.exports;",
      },
    });
  }

  return configs;
};
