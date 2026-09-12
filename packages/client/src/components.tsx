// ================================================================
// dsh-talk client UI：会话「社区」页签页（整页，非弹窗）
// 认证态 → AuthScreen；已登录 → HomeScreen（社区/频道/消息 + 实时）
// 顶层不再自绘浮层外壳 —— 视觉 chrome（会话标题/页签/操作行）由
// DSH 宿主头部承担，本组件只负责整页内容与身份门禁。
// ================================================================

import { Button, Toast } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { HomeScreen } from "./components/HomeScreen";
import { pageRoot, palette } from "./components/styles";
import {
  activateTalk,
  deactivateTalk,
  dismissToast,
  refresh,
  refreshInboxUnread,
  setCurrentDshSession,
  useTalkState,
} from "./store";

/** 居中提示视图 */
function Centered({ children }: { children: ReactElement }): ReactElement {
  return (
    <div style={{ flex: 1, minHeight: 0, display: "grid", placeItems: "center", padding: 24 }}>
      {children}
    </div>
  );
}

function LoadingView(): ReactElement {
  return <div style={{ color: palette.muted, fontSize: 13 }}>正在连接 dsh-talk Server…</div>;
}

function ErrorView(): ReactElement {
  const { error } = useTalkState();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ color: palette.danger, fontSize: 13 }}>连接失败：{error}</div>
      <Button variant="outline" size="sm" onClick={() => void refresh()}>
        重试
      </Button>
    </div>
  );
}

// 宿主契约：视图根声明 data-conversation-composer-overlay 后，宿主把 viewArea 约束为定高
// （flex:1 1 0; min-height:0; overflow:hidden），滚动交给视图内部（官方「轨迹」视图同做法）。
// 该模式下宿主的 composer 会浮在视图底部，与社区页自带的输入框叠加，故一并隐藏。
// 宿主类名是构建期哈希，只能用其 data-* 契约属性定位。
const PAGE_HOST_CSS = `
[data-conversation-scroll]:has([data-dsht-page-root]) > [data-composer-seat] {
  display: none;
}
`;

let hostCssInjected = false;

/** 注入一次宿主覆盖样式（幂等） */
function ensureHostCss(): void {
  if (hostCssInjected) return;
  const style = document.createElement("style");
  style.setAttribute("data-dsht-page-css", "");
  style.textContent = PAGE_HOST_CSS;
  document.head.appendChild(style);
  hostCssInjected = true;
}

/** 「社区」页签页：随会话 view 挂载/卸载而激活/释放实时连接 */
export function TalkPage(props: { sessionId?: string }): ReactElement {
  const talk = useTalkState();
  const ready = talk.phase === "ready";
  const sessionId = props.sessionId ?? null;

  // 记录当前 DSH 会话 id：「分享会话」入口默认用它
  useEffect(() => {
    setCurrentDshSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    activateTalk();
    return () => deactivateTalk();
  }, []);

  // 宿主覆盖样式：社区页自己管滚动与输入框，挂载时注入一次
  useEffect(() => {
    ensureHostCss();
  }, []);

  // 就绪后周期性地轮询站内信未读数（铃铛角标），有新邀请时尽快亮起
  useEffect(() => {
    if (!ready) return;
    void refreshInboxUnread();
    const timer = window.setInterval(() => void refreshInboxUnread(), 30000);
    return () => window.clearInterval(timer);
  }, [ready]);

  let body: ReactElement;
  if (talk.phase === "error") {
    body = (
      <Centered>
        <ErrorView />
      </Centered>
    );
  } else if (talk.phase === "anon") {
    body = (
      <Centered>
        <AuthScreen />
      </Centered>
    );
  } else if (talk.busy || talk.phase === "booting") {
    body = (
      <Centered>
        <LoadingView />
      </Centered>
    );
  } else {
    body = <HomeScreen />;
  }

  return (
    <div style={pageRoot} data-dsht-page-root data-conversation-composer-overlay="">
      {body}
      {talk.toast.length > 0 ? <Toast text={talk.toast} onDone={() => dismissToast()} /> : null}
    </div>
  );
}
