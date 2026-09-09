// ================================================================
// dsh-talk 浏览器侧（client）入口
//  注册为 `conversation.view` 页签（与官方「对话 / 轨迹」等页签平行）：
//  - 宿主会话顶栏会出现「社区」页签，点击后主内容区整页展示社区 UI，
//    不再是浮层/弹窗。
//  - 页签位置跟随官方 tab 列表（会话头部），不占用侧栏底部设置区。
// 数据流：host 配置（/api/talk/config）→ Server REST（身份/社区列表）
// 槽位类型合并由 ./augment 拉入，见该文件注释。
//
// 注册写法对齐官方 ui-conversation 对 conversation.view 的注册：
//   inject: ["slots"]；list slot 一律用 ctx.slots.inject(slotName, factory)
//   延迟到宿主声明后注册。
// ================================================================

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import "./augment";
import { TalkPage } from "./components";
import { refresh } from "./store";

export const inject: string[] = ["slots"];

export function apply(ctx: ClientContext): void {
  try {
    // 会话页签「社区」：注册进 conversation.view（list/scope=session）。
    // label 作为页签文字；order 越大越靠右（官方 chat=0，trajectory≈10）。
    ctx.slots.inject("conversation.view", () =>
      ctx.slots.register(
        {
          name: "conversation.view",
          id: "dsh-talk",
          order: 20,
          label: "社区",
          registrant: "dsh-talk",
        },
        TalkPage,
      ),
    );
  } catch (error) {
    // 注册失败只降级为诊断输出，绝不让插件 fiber 崩掉整个 GUI。
    console.error("[dsh-talk] slot register failed:", error);
  }

  // 预取一次配置，让社区页打开时身份状态是温的
  void refresh();
}
