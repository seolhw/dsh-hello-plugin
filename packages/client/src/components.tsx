// ================================================================
// dsh-talk client UI：sidebar 底部入口 + 全屏浮层面板
// 认证态 → AuthScreen；已登录 → HomeScreen（社区/频道/消息 + 实时）
// 交互控件来自 @deepseek-ai/dsh-client-ui-primitives（最新 rc.6）
// ================================================================

import {
  Button,
  IconCloseOutline16,
  IconQueueOutline14,
  Toast,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { CSSProperties, ReactElement } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { HomeScreen } from "./components/HomeScreen";
import { overlayStyle, palette, panelHeader, panelStyle } from "./components/styles";
import { closeTalk, dismissToast, openTalk, refresh, useTalkState } from "./store";

// ---------- Sidebar 底部入口（'sidebar.footer.action' 列表项） ----------

const footerActionStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: palette.text,
  cursor: "pointer",
  fontSize: 13,
};

export function TalkToggle({ wide }: { wide: boolean }): ReactElement {
  const { open } = useTalkState();
  return (
    <button
      type="button"
      style={{ ...footerActionStyle, background: open ? palette.active : undefined }}
      onClick={() => openTalk()}
      title="dsh-talk 社区"
    >
      <IconQueueOutline14 size={16} />
      {wide ? <span>社区</span> : null}
    </button>
  );
}

// ---------- 浮层面板（'shell.overlay' 列表项） ----------

function LoadingView(): ReactElement {
  return <div style={{ color: palette.muted, padding: 20 }}>连接 Server…</div>;
}

function ErrorView(): ReactElement {
  const { error } = useTalkState();
  return (
    <div style={{ color: palette.muted }}>
      <div style={{ color: palette.danger, marginBottom: 12 }}>连接失败：{error}</div>
      <Button variant="outline" size="sm" onClick={() => void refresh()}>
        重试
      </Button>
    </div>
  );
}

export function TalkOverlay(_props: object): ReactElement | null {
  const talk = useTalkState();
  if (!talk.open) return null;

  let body: ReactElement;
  if (talk.phase === "error") {
    body = <ErrorView />;
  } else if (talk.phase === "anon") {
    body = <AuthScreen />;
  } else if (talk.busy || talk.phase === "booting") {
    body = <LoadingView />;
  } else {
    body = <HomeScreen />;
  }

  const centered = talk.phase === "anon" || talk.phase === "error";
  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div style={panelHeader}>
          <span
            style={{ fontWeight: 650, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}
          >
            <IconQueueOutline14 size={16} />
            dsh-talk 社区
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {talk.phase === "ready" && talk.me ? (
              <span style={{ color: palette.muted, fontSize: 12, alignSelf: "center" }}>
                @{talk.me.handle}
              </span>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              icon={<IconCloseOutline16 />}
              onClick={() => closeTalk()}
              aria-label="关闭面板"
            />
          </span>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            alignItems: centered ? "center" : undefined,
            justifyContent: centered ? "center" : undefined,
            overflow: "hidden",
          }}
        >
          {body}
        </div>
      </div>
      {talk.toast.length > 0 ? <Toast text={talk.toast} onDone={() => dismissToast()} /> : null}
    </div>
  );
}
