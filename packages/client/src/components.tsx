// ================================================================
// dsh-talk client UI：sidebar 底部入口 + 全屏浮层面板
// 纯 React（平台模块），样式内联，不依赖其它 UI 组件库
// ================================================================

import type { GetMyCommunitiesResponse } from "@dsh-talk/types/api";
import type { CSSProperties, FormEvent, ReactElement } from "react";
import { useState } from "react";
import { closeTalk, logout, openTalk, refresh, registerIdentity, useTalkState } from "./store";

// ---------- 极简样式 ----------

const COLORS = {
  bg: "rgba(16,18,24,0.72)",
  panel: "#1b1e27",
  border: "rgba(255,255,255,0.09)",
  text: "#e6e9ef",
  muted: "#9aa1ad",
  accent: "#4f7cff",
  danger: "#e5534b",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: COLORS.bg,
  backdropFilter: "blur(4px)",
  pointerEvents: "auto",
};

const panelStyle: CSSProperties = {
  width: 460,
  maxWidth: "calc(100vw - 40px)",
  maxHeight: "min(620px, calc(100vh - 40px))",
  overflow: "auto",
  background: COLORS.panel,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: "20px 20px 16px",
  boxShadow: "0 12px 40px rgba(0,0,0,.45)",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  marginTop: 6,
  marginBottom: 12,
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: "rgba(255,255,255,0.04)",
  color: COLORS.text,
};

const btnStyle: CSSProperties = {
  border: `1px solid ${COLORS.border}`,
  background: "rgba(255,255,255,0.06)",
  color: COLORS.text,
  padding: "7px 14px",
  borderRadius: 8,
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  ...btnStyle,
  background: COLORS.accent,
  borderColor: COLORS.accent,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  marginBottom: 8,
};

const footerActionStyle: CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: COLORS.text,
  cursor: "pointer",
  fontSize: 13,
};

// ---------- 图标 ----------

function TalkIcon({ size = 18 }: { size?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="8" r="3.2" />
      <circle cx="17" cy="8" r="2" opacity="0.6" />
      <circle cx="9" cy="16" r="3.2" />
      <circle cx="17" cy="16" r="2" opacity="0.6" />
    </svg>
  );
}

// ---------- Sidebar 底部入口（'sidebar.footer.action' 列表项） ----------

export function TalkToggle({ wide }: { wide: boolean }): ReactElement {
  const { open } = useTalkState();
  const style: CSSProperties = {
    ...footerActionStyle,
    ...(open ? { background: "rgba(255,255,255,0.08)" } : {}),
  };
  return (
    <button type="button" style={style} onClick={() => openTalk()} title="dsh-talk 社区">
      <TalkIcon />
      {wide ? <span>社区</span> : null}
    </button>
  );
}

// ---------- 浮层面板（'shell.overlay' 列表项） ----------

function CommunityList({ communities }: { communities: GetMyCommunitiesResponse }): ReactElement {
  if (communities.length === 0) {
    return (
      <div style={{ color: COLORS.muted }}>
        还没有加入任何社区。创建/加入功能随 Hub API 完善后开启。
      </div>
    );
  }
  return (
    <div>
      {communities.map((community) => (
        <div key={community.id} style={rowStyle}>
          <div>
            <div>{community.name}</div>
            {community.description ? (
              <div style={{ color: COLORS.muted, fontSize: 12 }}>{community.description}</div>
            ) : null}
          </div>
          <span
            style={{
              fontSize: 11,
              color: COLORS.accent,
              border: `1px solid ${COLORS.accent}`,
              borderRadius: 999,
              padding: "2px 8px",
            }}
          >
            {community.role}
          </span>
        </div>
      ))}
    </div>
  );
}

function RegisterForm({ hubUrl }: { hubUrl: string }): ReactElement {
  const { busy } = useTalkState();
  const [code, setCode] = useState("");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (code.trim().length === 0 || handle.trim().length === 0) return;
    void registerIdentity({
      inviteCode: code.trim(),
      handle: handle.trim(),
      displayName: displayName.trim().length > 0 ? displayName.trim() : null,
    });
  };

  return (
    <form onSubmit={submit}>
      <p style={{ color: COLORS.muted, fontSize: 12, marginTop: 0 }}>
        Hub：{hubUrl} —— 用一次性平台注册码开通身份，令牌会安全保存在本地 DSH 设置里。
      </p>
      <input
        style={fieldStyle}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="平台注册码（一次性）"
        autoComplete="off"
      />
      <input
        style={fieldStyle}
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        placeholder="昵称 @handle（全局唯一）"
        autoComplete="off"
      />
      <input
        style={fieldStyle}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="显示名（可选）"
        autoComplete="off"
      />
      <button
        type="submit"
        style={{ ...primaryBtn, width: "100%", opacity: busy ? 0.6 : 1 }}
        disabled={busy}
      >
        {busy ? "注册中…" : "开通身份"}
      </button>
    </form>
  );
}

function ErrorView(): React.ReactElement {
  const { error } = useTalkState();
  return (
    <div>
      <div style={{ color: COLORS.danger, marginBottom: 12 }}>连接失败：{error}</div>
      <button type="button" style={btnStyle} onClick={() => void refresh()}>
        重试
      </button>
    </div>
  );
}

export function TalkOverlay(_props: object): ReactElement | null {
  const talk = useTalkState();
  if (!talk.open) return null;

  const body =
    talk.busy && talk.phase === "booting" ? (
      <div style={{ color: COLORS.muted }}>连接 Hub…</div>
    ) : talk.phase === "error" ? (
      <ErrorView />
    ) : talk.phase === "anon" ? (
      <RegisterForm hubUrl={talk.settings?.hubUrl ?? "http://127.0.0.1:8787"} />
    ) : (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>
              {talk.me?.displayName ?? talk.me?.handle ?? "已登录"}
            </div>
            <div style={{ color: COLORS.muted, fontSize: 12 }}>@{talk.me?.handle}</div>
          </div>
          <button type="button" style={btnStyle} onClick={() => void logout()}>
            退出
          </button>
        </div>
        <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 8 }}>我的社区</div>
        {talk.me !== null ? <CommunityList communities={talk.communities} /> : null}
      </div>
    );

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div
            style={{ fontWeight: 600, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}
          >
            <TalkIcon />
            dsh-talk 社区
          </div>
          <button type="button" style={btnStyle} onClick={() => closeTalk()} aria-label="关闭">
            关闭
          </button>
        </div>
        {body}
      </div>
    </div>
  );
}
