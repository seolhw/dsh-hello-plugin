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
// 另 inject "sessions"：克隆还原出的 DSH 会话要能在 UI 里打开。
// ================================================================

import type { ClientContext } from "@deepseek-ai/dsh-client-runtime/client";
import "./augment";
import { TalkPage } from "./components";
import { bindSessionOpener, bindSessionTree, refresh, type ShareSessionRow } from "./store";

export const inject: string[] = ["slots", "sessions"];

/** 宿主会话树快照里本插件用到的字段（SessionListState 的子集） */
interface SessionsListSnapshot {
  ids: string[];
  byId: Record<
    string,
    { id: string; displayTitle?: string; cwd?: string; blank?: boolean; origin?: string }
  >;
}

/** 客户端 sessions 服务里本插件用到的最小面（open/refresh/list 不在公开 ISessions 上） */
interface SessionsFace {
  open(id: string): void;
  refresh(): Promise<void>;
  list: { getSnapshot(): SessionsListSnapshot };
}

export function apply(ctx: ClientContext): void {
  // 克隆还原出的会话要能在 UI 里切过去：先 refresh 列表再 open
  const sessions = ctx.get("sessions") as SessionsFace | undefined;
  bindSessionOpener(async (sessionId) => {
    if (!sessions) return false;
    try {
      await sessions.refresh();
    } catch {
      // 列表刷新失败也继续尝试打开（目标可能已在列表中）
    }
    try {
      sessions.open(sessionId);
      return true;
    } catch {
      return false;
    }
  });

  // 分享会话选择器：用左侧会话栏同源的会话树（工作区 → 会话，带标题）
  bindSessionTree(() => {
    if (!sessions) return [];
    const snapshot = sessions.list.getSnapshot();
    const rows: ShareSessionRow[] = [];
    for (const id of snapshot.ids) {
      const row = snapshot.byId[id];
      // 空白会话（还没有任何事件）与子代理会话不参与分享
      if (!row || row.blank || row.origin === "subagent") continue;
      rows.push({
        id: row.id,
        title: row.displayTitle ?? row.id,
        ...(row.cwd ? { cwd: row.cwd } : {}),
      });
    }
    return rows;
  });

  try {
    // 会话页签「社区」：注册进 conversation.view（list / scope=session）。
    // label 作为页签文字；order 越大越靠右（官方 chat = 0，trajectory≈10）。
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
