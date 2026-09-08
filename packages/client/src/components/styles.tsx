// ================================================================
// dsh-talk 面板共享样式常量（深色；交互控件用 DSH UI primitives）
// ================================================================

import type { CSSProperties } from "react";

export const palette = {
  page: "#0d0f14",
  panel: "#151923",
  rail: "#10141d",
  border: "rgba(255,255,255,0.09)",
  text: "#e7eaf1",
  muted: "#8b93a5",
  accent: "#5b8cff",
  danger: "#f2695e",
  success: "#3fb950",
  badge: "#e5534b",
  inputBg: "rgba(255,255,255,0.05)",
  hover: "rgba(255,255,255,0.07)",
  active: "rgba(91,140,255,0.16)",
} as const;

export const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(6,8,12,0.62)",
  backdropFilter: "blur(6px)",
  pointerEvents: "auto",
};

export const panelStyle: CSSProperties = {
  width: 1080,
  maxWidth: "calc(100vw - 40px)",
  height: "min(680px, calc(100vh - 40px))",
  display: "flex",
  flexDirection: "column",
  background: palette.panel,
  color: palette.text,
  border: `1px solid ${palette.border}`,
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 16px 48px rgba(0,0,0,.5)",
};

export const panelHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  borderBottom: `1px solid ${palette.border}`,
};

export const smallText: CSSProperties = { fontSize: 12, color: palette.muted };

/** 头像圆块（无图时用 handle 首字母） */
export function Avatar({
  label,
  color,
  size = 26,
}: {
  label: string;
  color?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: color ?? "linear-gradient(135deg,#5b8cff,#8a63ff)",
        color: "#fff",
        fontSize: Math.round(size * 0.42),
        fontWeight: 600,
        userSelect: "none",
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
