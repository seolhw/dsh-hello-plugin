# M0-2 双半包本地加载实验（结论）

> 对应任务：docs/TASKS.md `M0-2`。目的：验证「第三方双半包」能被本地 `dsh web` 识别、下发与加载（R1 文档 §7.2 的本地加载路径问题）。

## 结论

**可行，路径已跑通（服务端侧证据充分）**：
`npm 包（dsh.client + exports["./client"]）→ 安装进 profile node_modules → dsh 顶层 --patch 以包名 insert 一行 → `dsh web` 启动后 client-modules 把该行扫描进 `window.__DSH_BOOT__`，浏览器组合脚本 `/plugins/??…/dsh-talk-m02/client.js` 正常下发`。

浏览器内的实际渲染留给 M2 联调/人工 GUI 验收（本实验无浏览器环境）。

## 证据（2025-… 本地隔离 profile，DSH_HOME=E:\dsh-talk\.research\dshhome）

1. 构建产物契约成立：tsdown 双配置产出
   - `lib/index.js`（host 半 ESM）
   - `lib/client.js`（CJS 浏览器半，`window.__ModuleLoader__.load({id:'dsh-talk-m02', factory: (require) => …})`，`react` 等平台种子保持 external 走 `require`）。
   - 关键配置：`fixedExtension:false`（否则 ESM 产物叫 index.mjs 与 exports 不匹配）；loader banner/footer/intro 复刻上游 `packages/client/tsdown.client.ts`。
2. 扫描与组图：GUI 页面 HTML（GET /?token=…）含 5 处 `dsh-talk-m02`，且 `__DSH_BOOT__` 组合 `<script src="/plugins/??…,dsh-talk-m02/client.js,…&rev=…">` 在预载列表内。
3. 产物下发：GET 该组合 URL → 200，正文包含 `dsh-talk-m02`、注册调用 `sidebar.footer.action` 与文案 `Talk (M02)`。
4. host 半：启动无 FAILED/error 日志（activation 失败会 loud throw），host `apply` 静默通过。
5. 隔离方法（沙箱内可复现）：
   - `$env:DSH_HOME=<workspace>` 指向工作区内 home（注意勿用 `$home`，PowerShell 只读变量）；
   - `dsh --dump-config`/`dsh web` 会离线准备 profile（cordis.yml/patch/package.json）；
   - 包装进 `profiles\web\node_modules\<pkg>`（免 pnpm/网络）；
   - 顶层参数顺序：`dsh --patch <overlay> --profile web --port <port> --no-open`（`--patch` 是 dsh 顶层参数，不在 web 子命令后）；
   - 页面带启动日志打印的 `?token=` 才能 200（否则 401）；本机系统代理会干扰 localhost 探测 → 用 `HttpClientHandler.UseProxy=false`。

## 落地要点（M2-1 照做）

- 主包 `package.json`：补 `exports["./client"]`（→ `lib/client.js`）、`"dsh": {"client": {"inject":[…], "platform":"web"}}`、`files` 收 `lib/client.js`。
- `tsdown.config.ts`：改双配置（host ESM + client CJS/browser/loader-banner）；平台种子模块 external 清单见 R1 文档 §4。
- 本地联调脚本：`experiments/m0-2/overlay.yml` 模式 → 装 profile node_modules → `dsh --patch … web --no-open --port <p>`；把该流程固化为根 `scripts/dev-web.sh`（M4 前可选）。
- client 半渲染层面验收（按钮真实出现在侧栏）→ M2-12 双 profile 联调 / 人工 GUI 确认。

## 局限与后续

- 未在真实浏览器执行 bundle（无 headless 环境）：apply 内 `document.documentElement.dataset` 标记、footer action 的实际渲染待 M2 端到端。
- 未验证 `ctx.slots.inject` 在**激活时序**上的真实运行（依赖 ui-sidebar 等先于本包激活；`inject` 语义即为此设计，理论成立）。此点在 M2 UI 联调中一并观察。

## 相关文件

- 实验：`experiments/m0-2/`（package.json / src/index.ts / src/client/index.ts / tsdown.config.ts / overlay.yml）
- 上游参照：`packages/client/tsdown.client.ts`、`packages/client/web/src/platform.ts`
