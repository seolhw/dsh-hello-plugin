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
import { activateTalk, deactivateTalk, dismissToast, refresh, useTalkState } from "./store";

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

/** 「社区」页签页：随会话 view 挂载/卸载而激活/释放实时连接 */
export function TalkPage(_props: object): ReactElement {
  const talk = useTalkState();

  useEffect(() => {
    activateTalk();
    return () => deactivateTalk();
  }, []);

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
    <div style={pageRoot}>
      {body}
      {talk.toast.length > 0 ? <Toast text={talk.toast} onDone={() => dismissToast()} /> : null}
    </div>
  );
}

export function HelloWorld(): ReactElement {
  return <div>Hello World!</div>;
}
