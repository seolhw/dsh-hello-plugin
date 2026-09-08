// ================================================================
// dsh-talk 浏览器侧（client）入口
//  1. 在 sidebar 底部加「社区」入口按钮（'sidebar.footer.action'）
//  2. 注册全屏浮层面板（'shell.overlay'）
// 数据流：host 配置（/api/talk/config）→ Hub REST（身份/社区列表）
// 槽位类型合并由 ./augment 拉入，见该文件注释。
// ================================================================

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import "./augment";
import { TalkOverlay, TalkToggle } from "./components";
import { refresh } from "./store";

/**
 * Required services。故意留空：
 * 浏览器插件在 fiber 上等待服务会把整个 GUI boot 卡在
 * “Loading plugins…” 闸门后；这里全部按需惰性查找 + 容错。
 */
export const inject: string[] = [];

export function apply(ctx: ClientContext): void {
  const disposers: Array<() => void> = [];

  try {
    disposers.push(
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

  ctx.effect(
    () => () => {
      for (const dispose of disposers) dispose();
    },
    "dsh-talk: client ui",
  );

  // 预取一次配置，让打开面板时身份状态是温的
  void refresh();
}
