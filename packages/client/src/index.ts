// ================================================================
// dsh-talk 浏览器侧（client）入口
//  1. 在 sidebar 底部加「社区」入口按钮（'sidebar.footer.action'）
//  2. 注册全屏浮层面板（'shell.overlay'）
// 数据流：host 配置（/api/talk/config）→ Server REST（身份/社区列表）
// 槽位类型合并由 ./augment 拉入，见该文件注释。
//
// 注册写法对齐官方 dsh-client-ui-* 插件：
//   inject: ["slots"] 才能访问 ctx.slots（否则报 “cannot get property "slots"
//   without inject”）；list slot 一律用 ctx.slots.inject(slotName, factory)
//   延迟到宿主挂载时注册，避免与槽位定义方的启动顺序竞争。
// ================================================================

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import "./augment";
import { TalkOverlay, TalkToggle } from "./components";
import { refresh } from "./store";

/**
 * Required services：需要 DSH 的 `slots` 服务接线后，ctx.slots 才能用。
 * 浏览器插件在 fiber 上等待 services 会把整个 GUI boot 卡在
 * “Loading plugins…” 闸门后 —— 官方写法是只 inject 必要服务（slots 由
 * client runtime 恒常提供），其余全部按需惰性查找 + 容错。
 */
export const inject: string[] = ["slots"];

export function apply(ctx: ClientContext): void {
  try {
    // sidebar 底部「社区」入口（list slot，宿主渲染时传 { wide }）
    ctx.slots.inject("sidebar.footer.action", () =>
      ctx.slots.register(
        {
          name: "sidebar.footer.action",
          id: "dsh-talk",
          order: 1000,
          label: "社区",
          registrant: "dsh-talk",
        },
        TalkToggle,
      ),
    );
    // 全屏浮层面板（list slot，宿主渲染时传 {}）
    ctx.slots.inject("shell.overlay", () =>
      ctx.slots.register(
        {
          name: "shell.overlay",
          id: "dsh-talk",
          order: 1000,
          label: "dsh-talk 面板",
          registrant: "dsh-talk",
        },
        TalkOverlay,
      ),
    );
  } catch (error) {
    // 注册失败只降级为诊断输出，绝不让插件 fiber 崩掉整个 GUI。
    console.error("[dsh-talk] slot register failed:", error);
  }

  // 预取一次配置，让打开面板时身份状态是温的
  void refresh();
}
