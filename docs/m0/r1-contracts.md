# M0-1 客户端契约核对（R1）—— dsh-talk 挂载与打包依据

> 对应任务：docs/TASKS.md `M0-1`。目标：消除 PRD §14 R1（客户端 UI 契约缺失）。
> 依据（本地源码）：`E:\dsh-talk\.research\deepseek-harness`（tag `dsh-v0.1.2-rc.1`，与已安装 @deepseek-ai/* 0.1.2-rc.1 一致）。
> 状态：初稿已完成主要契约核对；「待审计」条目等待 M0-1 全量审计（已委托 research-sub）合入。

## 1. 结论速览（Go 判据）

- 第三方「双半包」完全可行：一个 npm 包同时是 Cordis 插件（host 半）与浏览器 UI 插件（client 半），由 `dsh.client` 声明 + `exports["./client"]` 加入 Web 插件表；**只要 cordis.yml 以包名挂载即生效，无需重建 Web 应用**。
- 挂载孔位可用：侧栏脚部动作 `sidebar.footer.action`（list，root）是第三方入口的现成落点；设置区/全屏面板候选见 §6。
- 浏览器 bundle 是**约定产物**（CJS + `window.__ModuleLoader__.load({id, factory})`），而非自由 ESM；React/槽/原语等由平台表提供，必须保持 external。
- 结论：**R1 不构成 Go/No-Go 障碍**；M0-2 需在本地验证第三方包的装载路径（profile node_modules 解析）。

## 2. 双半包契约（package.json）

证据：`packages/client/ui-sidebar/package.json`、`packages/client/web/package.json`、`packages/client/AGENTS.md`、`docs/subsystems/client-modules.md`。

- `name` = `@deepseek-ai/dsh-client-<x>`（第三方用自己 scope 亦可，机制按包名解析）。
- `"type": "module"`；`main: lib/index.js`（host 半），`types: lib/types/index.d.ts`。
- `exports` 必须含：
  - `"."` → host 半 `./lib/index.js`；
  - `"./client"` → 浏览器半 `./lib/client.js`（types: `./lib/types/client/index.d.ts`）；
  - `"./src/*"`、`"./package.json"`（内仓惯例；第三方可按需）。
- `"dsh": { "client": { "inject": [<包名…>], "platform": "web" } }`
  - `platform: 'web'` 固定；
  - `inject`：**信息性依赖边**（预检展示/HMR diff），不决定激活顺序；client 半 manifest 扫描要求存在 `./client` 导出；
  - `immediately: true` 仅基础设施预取行，普通功能插件**不要**设；
  - `external`：非基线模块请求（功能插件不应使用，跨插件协作走 slots/cordis 服务，见 `packages/client/AGENTS.md`）。
- `files` 必须覆盖发布产物：`lib/index.js`、`lib/client.js`、`lib/types/**/*.d.ts`（publint 强制精确发布视图）。
- Cordis 保持 `peerDependencies` + `devDependencies` 匹配（`@deepseek-ai/cordis`；本包 peer 中已有 `^4.0.2`）。

生效机制（`docs/subsystems/client-modules.md` §“A package joins the table…”）：host 侧 `ctx.clientModules` 增量扫描已启用 Loader entry 中声明 `dsh.client` 的包 → 组合 `window.__DSH_BOOT__` 入口图 → 在 `/plugins` 提供带版本组合脚本 + index 注入。浏览器半为 lazy-CJS 模块表（`ctx.modules`）。两个 active Loader source 解析到同一包名会组合失败（我们的包只被一个行引用）。

## 3. 浏览器 bundle 产物契约（决定 M0-2 打包方式）

证据：`packages/client/tsdown.client.ts`（`clientConfig`，行 428–571）。

- 输出：`lib/client.js`，`format: cjs`、`platform: browser`、`entryFileNames: 'client.js'`。
- 包一层 closure：`intro: var module = { exports: {} }; var exports = module.exports;`，
  `banner: window.__ModuleLoader__.load({ id: <包名>, factory: (require) => {`，
  `footer: return module.exports; } });`。
- **externals = 请求表**：基线 `PLATFORM_MODULES` + `PRELOADED_CLIENT_EXTERNALS` + 本包 `dsh.client.external`（功能插件通常空）；其余一切依赖内联进 bundle（`deps.neverBundle: isRequested`）。同步 `require` 由加载器给出，**未在表中注册的 specifier 会当场抛错**。
- CSS：CSS Modules/全局/内联 css 由 preset 用 lightningcss + 虚拟模块处理，产物里 `style[data-plugin-css]` 注入。**第三方 v1 建议避开 CSS Modules**（外部包无此 preset），改用内联样式 / ui-primitives 自带样式的组件 / 手动 style 注入 effect。
- 产物由 `ctx.clientModules` 从 `exports["./client"]` 提供；`dsh` 开发模式 `dev:web` 只监听带 `dsh.client` 声明的包并重写其 `lib/client.js`（`docs/api-gateway.md` L148）。

## 4. 平台种子模块表（bundle 里必须 external 的基线）

证据：`packages/client/web/src/platform.ts`（tag dsh-v0.1.2-rc.1）：

```
react, react/jsx-runtime, react-dom, react-dom/client,
@deepseek-ai/cordis,
@deepseek-ai/dsh-client-store,
@deepseek-ai/dsh-client-ui-slots,
@deepseek-ai/dsh-client-ui-primitives
```
（`PRELOADED_CLIENT_EXTERNALS` 该 tag 为空。）

含义：client 半代码可 `require('react')`、`require('@deepseek-ai/dsh-client-ui-slots')`、`require('@deepseek-ai/dsh-client-ui-primitives')` 等；`@deepseek-ai/cordis` 提供客户端 Context 类型与服务代理。

## 5. Slot 系统核心契约

证据：`packages/client/ui-slots/src/index.ts`（SlotMap/类型系统 + 运行期），`packages/client/ui-sidebar/src/client/index.ts`（注册样板），`packages/client/AGENTS.md`（纪律）。

- `ctx.slots` 服务由 `ui-renderer` client 半提供（类型合并：`declare module '@deepseek-ai/dsh-client-ui-slots' { interface SlotMap … }` 由各包扩展，见 `ui-sidebar/src/client/contract/slots.ts`）。
- SlotMap 条目：`{ kind: 'single'|'list'|'keyed'|'chain'; scope: 'root'|'session-maybe'|'session'; owner?: OwnerProps }`。
- `ctx.slots.register(options, Component)`（返回 disposer）：
  - 选项类型实为 `BaseOptions` + `KindOptions`（`ui-slots/src/index.ts:511-581`）：`{ name, children?, store?, locale?, registrant? }` + kind 专属（list→`id`、keyed→`key`、chain→`select`）；
  - `name` 槽名；`locale` 命名空间；`children`：本组件声明并会渲染的子孔表（`{[P in SlotMap]?: {kind, scope}}`）——**children = 声明 + 授权**，渲染未声明孔或声明他人已声明孔 → load 期失败；
  - `inject`：apply 闭包返回的 plain data/callback 工厂（注册方私有注入面）；
  - `store`（可选）：跨 entry/重挂载共享状态（handle 或工厂，来自 `dsh-client-store`）；
  - `hooks`（保留座位）：注册方私有裸 observable。
  - 约束（运行期校验）：list 槽占用**必须带 `id`**；同 cell 同 priority 二次注册抛错；children 声明重复抛错；list 排序 = priority 升序 → order 升序（`ui-slots/src/index.ts:830-899`）。
- 顺序无关：占用他人孔用 `ctx.slots.inject('<孔名>', () => ctx.slots.register(...))` ——等待声明就位、声明消失即移除、重新声明后重挂；可用 generator 原子安装多个注册（`ui-renderer/src/client/registry.ts:172-234`）。
- 组件 props = 四份共享（`PropsRuntime`/`PropsRenderSlots`/`PropsStore`/inject 面），业务组件不得接触 ctx。
- 语言：`ctx.locale.register(NS, { zh, en })` 注册字典（每个字典走 `ctx.effect`）；注册组件时带 `locale: NS` 即注入 `t` 座位；nav label 用 `() => t(...)` thunk 或在 locale 变更时重注册（`ui-settings-general/src/client/index.ts:175-182` 的 `GeneralSection` 为样板）。
- client 侧可用服务（须列入插件 `inject`）：`slots`、`locale`、`layout`、`remote`（含 `remote.settings` 等子服务）、`settingsScope`、`theme`、`connection`、`sessions`、`uiWorkspace` 等。

### 5.1 已核验的注册样板（sidebar shell，`ui-sidebar/src/client/index.ts`）

```ts
export const inject = ['slots', 'layout', 'uiWorkspace', 'locale']
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar: dictionaries')
  ctx.effect(() => ctx.slots.register({
    name: 'sidebar',
    locale: NS,
    children: { /* 声明子孔 */ },
    inject: () => ({ startSession, toggleSidebar }),
  }, SidebarRoot), 'ui-sidebar: slot registration')
}
```

### 5.2 root 骨架与全屏加法孔（ui-layout，一手核验）

- `ui-layout/src/client/index.ts`：ui-layout 把 AppFrame 注册进**运行时内建 'root' 槽**，同一声明 4 个 child：
  `sidebar`(single/root)、`conversation`(single/session-maybe)、`details`(single/session)、`shell.overlay`(list/root)。
- **`shell.overlay`（list/root）是帧级浮动层**（位于所有列之上、滚动容器之外、默认 click-through，占用者可自行开启 pointer-events）；注释明示：“This is the additive seat for a frame-wide surface of your own: a fresh `id` is added beside the shipped entries instead of replacing them.” → **dsh-talk 全屏面板挂这里**（占用需 `id`）。
- 纪律（`packages/client/AGENTS.md`）：`sidebar`/`conversation`/`details` 已被整体占用，注册即整体替换并带走其声明的内部座位 → **我方只使用加法孔**：`sidebar.footer.action`、`settings.section`/`settings.general.item`、`shell.overlay`。

## 6. 已核验可占用孔位

| 孔位 | kind/scope | owner props | 声明者 | 占用者 | 我方用途 |
| --- | --- | --- | --- | --- | --- |
| `sidebar.footer.action` | list / root | `{ wide: boolean }` | ui-sidebar | 待第三方 | **dsh-talk 入口按钮**（wide 行/56px rail 图标自适应） |
| `sidebar.settings` | single / root | `{ wide }` | ui-sidebar | ui-settings-general | 不动 |
| `settings.section` | list / root | `{ close }` | ui-settings 域基座 | ui-settings-* | **dsh-talk 设置页**（占用带 `id/order/label`） |
| `settings.general.item` | list / root | 空 | ui-settings-general（运行时声明） | 各功能 | 无需独立页的单条设置（如 hubUrl）——v1 可不用 |
| `settings.action` | list / root | 空 | ui-settings | 各功能 | 设置面板头动作（可选） |
| `shell.overlay` | list / root | 无 owner props | ui-layout(AppFrame) | 各帧级浮层 | **dsh-talk 全屏面板**（list，须带 `id`；默认 click-through，面板自开 pointer-events） |
| `sidebar` / `conversation` / `details` | single | — | ui-layout | ui-sidebar / ui-conversation | **禁止占用**（整体替换语义） |

### 6.1 我方 UI 挂载方案（定稿）

1. 入口：`ctx.slots.inject('sidebar.footer.action', …)` 注册一个 action（`id: 'talk'`，rail 态图标 + wide 态文字），点击切换 Talk 面板可见性。
2. 面板本体：`ctx.slots.inject('shell.overlay', …)` 注册 `id: 'talk-overlay'` 全屏/浮层面板（自管 pointer-events、Esc/关闭、内部视图状态：社区抽屉→频道→消息）。
3. 设置：`ctx.slots.inject('settings.section', …)` 注册 `{ id: 'talk', order, label: () => t('nav'), locale: NS, children: {...} }` 页面。
4. 全部注册包在 `ctx.effect` 里（disposer 语义，HMR 安全）；语言包 `ctx.locale.register('talk', {zh, en})`。

> 注：会话 header 快捷入口候选 `conversation.session.header.actions`（list/session，ui-conversation 声明，`ui-conversation/src/client/contract/slots.ts:105`）；v1 分享入口默认放 Talk 面板内部，该孔列为 P1 增强（需 session 作用域 props，占用前先读其 owner 契约）。

### 6.2 client→host RPC（审计证据，M3 用）

- client 侧：`ctx.remote` 是网关动态挂载子服务的客户端（`api/remotes/src/client/index.ts:143-162` 对每个 `/remote` 贡献 `ctx.remote.$mount(contribution)`）；判环回 `ctx.remote.$host`；事件 `ctx.remote.$on('settings/document-updated', cb)`。
- 真实用例：`ui-settings-general/src/client/settings-document-store.ts:65` 调 `ctx.remote.settings.openSettingsDocument()`；host 侧 `api/settings-controller/src/index.ts:88-102` `SettingsController extends TypertRemoteService`，`super(ctx,'settingsController',{namespace:'settings'})`，方法标 `@Remote`。
- 我方新增命名空间最小路径（官方文档 `docs/cookbook/adding-a-remote-api.md`）：① host 半 TypertRemoteService + `@Remote` 方法；② 包导出 `./remote`（生成物）；③ client 装配处 `ctx.remote.$mount(contribution)`；转发事件需入 allowlist（`api/remotes/src/index.ts:14,48`）。→ M3 克隆/运行走该通道。

## 7. 对本项目落地要点（M0-2/M2 直接采用）

1. 仓库内最终产物必须是一个**可发布 npm 包**：`exports["./client"]` → `lib/client.js`（CJS+`__ModuleLoader__.load` 封装），`dsh.client` manifest，`files` 白名单。
2. client 半开发期本地加载：`cordis.yml`/profile patch 以**包名**引用（`docs/user/develop/basic/publish.md`：包名而非相对源码路径），包须可被 profile 的 node_modules（或 dsh 安装目录解析回退）解析 → M0-2 验证 `pnpm link`/本地 tarball 方案。
3. 构建时 external：PLATFORM_MODULES 列表（§4）+ cordis；其余内联。**不使用 CSS Modules**；样式走内联/ui-primitives。
4. 注册：host 半（Node）文件照旧由 `cordis.yml` 挂载；client 半在 `apply(ctx)` 里 `ctx.effect` 注册字典与 `ctx.slots.inject('sidebar.footer.action', …)` 占用侧栏入口。
5. 共享 UI 状态（会话/工作区等）经框架座位或 slots 协议获得；**不要** `dsh.client.external` 去 import 其他功能插件（红线）。
6. 挂载方案已定稿（§6.1）：入口 `sidebar.footer.action`、全屏面板 `shell.overlay`、设置 `settings.section`；会话 header 快捷入口待审计补强（非阻塞，分享入口 v1 放面板内）。

## 8. 权威文档索引（上游仓库，tag dsh-v0.1.2-rc.1）

- `packages/client/AGENTS.md`（新插件包检查清单、slot/导出/ctx 纪律）
- `packages/client/ui-sidebar/src/client/contract/slots.ts`、`index.ts`（孔位+样板）
- `packages/client/ui-slots/src/index.ts`（SlotCore 类型/运行期）
- `packages/client/web/src/platform.ts`（平台种子表）
- `packages/client/tsdown.client.ts`（client 产物契约）
- `docs/subsystems/client-modules.md`、`docs/subsystems/web-client.md`
- `docs/user/develop/basic/publish.md`、`docs/cookbook/adding-a-settings-card.md`
- `docs/architecture.md`（profile/层/patch 语义）

## 9. Open items（并入点）

- [x] settings 分区孔、全屏 overlay 定位、root 骨架声明关系（一手核验，见 §5.2/§6）
- [x] M0-1 全量审计已并入：BaseOptions/KindOptions 命名、list 排序规则、settings.section 注册参数样板、RPC 最小路径（§6.2）、conversation header 候选孔
- [ ] 非阻塞待补（审计未确认项）：`settings.section` 各页 id/order 明细、`conversation.session.header.actions/.utilities` 占用者与 owner 契约、`ctx.sessions`/remote-service-key/allowlist 细节、LocaleRuntime 精确签名
- [ ] M0-2 双半骨架/打包配置 + 本地加载路径验证
