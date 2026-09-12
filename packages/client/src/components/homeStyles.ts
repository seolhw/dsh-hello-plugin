// ================================================================
// 主工作区（HomeScreen）共享样式与渲染辅助
// 由 HomeScreen 及拆分出的子组件复用，避免样式在多个文件里各写一份。
// ================================================================

import type { Community } from "@dsh-talk/types/entities";
import type { CSSProperties } from "react";
import type { MessageItem } from "../store";
import { palette } from "./styles";

// ---------------- 布局样式 ----------------

// 社区栏（Discord 式窄列）：只显示社区头像圆块，节省横向空间
export const rail: CSSProperties = {
  width: 72,
  flex: "0 0 auto",
  background: palette.rail,
  borderRight: `1px solid ${palette.border}`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minHeight: 0,
  paddingTop: 8,
};

export const railScroll: CSSProperties = {
  overflowY: "auto",
  flex: 1,
  width: "100%",
  padding: "6px 0",
};

// 窄列里的图标按钮（加入 / 创建 / 修改 / 退出），40×40
export const railAction: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 12,
  border: "none",
  background: "transparent",
  color: palette.secondary,
  cursor: "pointer",
  flex: "0 0 auto",
};

// 单个社区域（48 高，内容水平垂直居中），左缘留出激活指示条
export const railItem: CSSProperties = {
  width: "100%",
  height: 48,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  position: "relative",
  color: palette.text,
};

// 头像容器：用于包裹 Avatar 并叠加右上角未读气泡
export const railAvatar: CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

// 激活态的左侧指示条（Discord 风格）
export const railPill: CSSProperties = {
  position: "absolute",
  left: 0,
  top: "50%",
  transform: "translateY(-50%)",
  width: 4,
  height: 18,
  borderRadius: "0 4px 4px 0",
  background: palette.text,
};

// 头像右上角未读气泡
export const railBubble: CSSProperties = {
  position: "absolute",
  top: -2,
  right: -2,
  minWidth: 15,
  height: 15,
  padding: "0 3px",
  borderRadius: 999,
  background: palette.badge,
  color: "#fff",
  fontSize: 9,
  fontWeight: 700,
  lineHeight: "15px",
  textAlign: "center",
};

// 窄列内的细分隔线
export const railDivider: CSSProperties = {
  width: 32,
  height: 1,
  margin: "6px 0",
  background: palette.border,
};

export const midCol: CSSProperties = {
  width: 216,
  flex: "0 0 auto",
  background: palette.page,
  borderRight: `1px solid ${palette.border}`,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

export const chatCol: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
};

export const messagesWrap: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
};

/** 消息内容包裹层：供 ResizeObserver 观测内容高度变化（贴底跟随） */
export const messagesContent: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minHeight: 0,
};

export const msgRow: CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "5px 12px",
  borderRadius: 8,
  position: "relative",
};

/** hover 时浮在消息右上角的操作条（Discord 风格，平时不占位） */
export const msgChip: CSSProperties = {
  position: "absolute",
  top: 4,
  right: 8,
  display: "inline-flex",
  alignItems: "center",
  gap: 2,
  padding: 2,
  borderRadius: 8,
  background: palette.elevated,
  border: `1px solid ${palette.border}`,
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

/**
 * 消息行的 hover 表现走 CSS（避免在无交互语义的 div 上绑鼠标事件）：
 * 平时整行无底色，hover 淡显；操作条默认隐藏，hover / 键盘聚焦到行内时显示。
 */
export const messageRowCss = `
  .dsht-msg-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
  .dsht-msg-row.is-mentioned { background: var(--dsw-alias-state-business-tertiary); }
  .dsht-msg-row.is-focus { animation: dsht-focus-fade 1.8s ease-out forwards; }
  @keyframes dsht-focus-fade {
    from { background-color: var(--dsw-alias-state-business-tertiary); }
    to { background-color: transparent; }
  }
  .dsht-msg-row .dsht-msg-actions { opacity: 0; pointer-events: none; }
  .dsht-msg-row:hover .dsht-msg-actions,
  .dsht-msg-row:focus-within .dsht-msg-actions,
  .dsht-msg-actions.is-open { opacity: 1; pointer-events: auto; }
  .dsht-quote-btn { cursor: pointer; }
`;

export const creatorRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "6px 0",
};

export const emptyMsg: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "38px 16px",
  color: palette.muted,
  textAlign: "center",
};

export const composerWrap: CSSProperties = {
  borderTop: `1px solid ${palette.border}`,
  background: palette.page,
  padding: "10px 14px",
  display: "flex",
  gap: 8,
  alignItems: "flex-end",
};

export const textArea: CSSProperties = {
  flex: 1,
  minHeight: 40,
  maxHeight: 160,
  resize: "none",
  borderRadius: 10,
  border: `1px solid ${palette.border}`,
  background: palette.inputBg,
  color: palette.text,
  padding: "8px 10px",
  font: "inherit",
  fontSize: 13,
  outline: "none",
};

export const textAreaEdit: CSSProperties = {
  width: "100%",
  minHeight: 54,
  resize: "vertical",
  borderRadius: 8,
  border: `1px solid ${palette.border}`,
  background: palette.inputBg,
  color: palette.text,
  padding: "6px 8px",
  font: "inherit",
  fontSize: 13,
};

export const pendingChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 4px 3px 9px",
  borderRadius: 8,
  border: `1px solid ${palette.border}`,
  background: palette.inputBg,
  fontSize: 12,
  color: palette.text,
  maxWidth: 260,
};

export const emptyCard: CSSProperties = {
  width: 380,
  maxWidth: "calc(100vw - 56px)",
  background: palette.panel,
  border: `1px solid ${palette.border}`,
  borderRadius: 16,
  padding: "34px 30px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
  color: palette.text,
  textAlign: "center",
};

export const sectionTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 650,
  color: palette.caption,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "4px 8px 2px",
};

/** 私密讨论组角标（图标库无锁图标，用 emoji + 文字标注） */
export const privacyBadge: CSSProperties = {
  flex: "0 0 auto",
  fontSize: 10,
  fontWeight: 600,
  color: palette.muted,
  border: `1px solid ${palette.border}`,
  borderRadius: 999,
  padding: "0 6px",
  lineHeight: "16px",
  whiteSpace: "nowrap",
};

// 分段式激活态（对齐 AuthScreen 的 Segmented 控件）
export const activeTile: CSSProperties = {
  background: palette.elevated,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  border: `1px solid ${palette.border}`,
};

export const liveDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flex: "0 0 auto",
};

// ---------------- 弹窗表单样式 ----------------

export const PRIVACY_LABELS: Record<Community["privacy"], string> = {
  public: "公开",
  private: "私密",
};

// ---------------- 渲染辅助 ----------------

/** 回复目标 / 引用块的正文摘要上限 */
const QUOTE_SNIPPET_MAX = 72;

/** 被引用消息的展示辅助：拆出作者名与正文摘要 */
export function replyParts(item: Pick<MessageItem, "replyTo">): {
  author: string;
  content: string;
} {
  const target = item.replyTo;
  if (!target) return { author: "", content: "" };
  const author = target.author.displayName ?? target.author.handle;
  const raw = target.content.replace(/\s+/g, " ").trim();
  const content =
    raw.length === 0
      ? (target.attachments?.length ?? 0) > 0
        ? "[附件]"
        : ""
      : raw.length > QUOTE_SNIPPET_MAX
        ? `${raw.slice(0, QUOTE_SNIPPET_MAX)}…`
        : raw;
  return { author, content };
}

/** 附件大小人类可读化 */
export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}
