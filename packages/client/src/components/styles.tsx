// ================================================================
// dsh-talk 页面共享样式：全部使用 DeepSeek 宿主注入的 --dsw-* token，
// 随系统亮/暗主题自动切换（宿主把 "system" 解析成实际 colorScheme 后，
// 通过 body 内联变量 + body[data-ds-dark-theme] 下发）。插件侧禁止硬编码色值。
// 参考：dsh-client-ui-theme 的 design-platform.css token 命名。
// ================================================================

import type { CSSProperties } from "react";

/** 语义色 token（明暗随宿主翻转）。按键名保留旧 palette 兼容存量引用 */
export const palette = {
  // 表面
  page: "var(--dsw-alias-bg-base)",
  panel: "var(--dsw-alias-bg-layer-1)",
  layer2: "var(--dsw-alias-bg-layer-2)",
  layer3: "var(--dsw-alias-bg-layer-3)",
  rail: "var(--dsw-specific-sidebar-fill)",
  elevated: "var(--dsw-alias-bg-overlay)",
  mask: "var(--dsw-alias-bg-mask-1)",
  skeleton: "var(--dsw-alias-bg-skeleton)",
  // 边框
  border: "var(--dsw-alias-border-l1)",
  border2: "var(--dsw-alias-border-l2)",
  border3: "var(--dsw-alias-border-l3)",
  border4: "var(--dsw-alias-border-l4)",
  // 文字
  text: "var(--dsw-alias-label-primary)",
  secondary: "var(--dsw-alias-label-secondary)",
  muted: "var(--dsw-alias-label-tertiary)",
  caption: "var(--dsw-alias-label-caption)",
  // 品牌 / 状态
  accent: "var(--dsw-alias-state-business-primary)",
  danger: "var(--dsw-alias-state-error-primary)",
  dangerSoft: "var(--dsw-alias-state-error-secondary)",
  success: "var(--dsw-alias-state-success-primary)",
  warn: "var(--dsw-alias-state-warn-primary)",
  warnLabel: "var(--dsw-alias-state-warn-label)",
  // 交互
  inputBg: "var(--dsw-alias-interactive-bg-hover-solid)",
  hover: "var(--dsw-alias-interactive-bg-hover)",
  active: "var(--dsw-alias-interactive-bg-active)",
  // 徽标：提及用品牌色，普通未读用文字弱化层
  badge: "var(--dsw-alias-state-error-primary)",
  hoverAccent: "var(--dsw-alias-interactive-bg-hover-accent)",
} as const;

/** 页签内容页根容器：占满宿主中栏（高度由外层 flex 约束） */
export const pageRoot: CSSProperties = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  background: palette.page,
  color: palette.text,
};

/** 垂直填满剩余空间 */
export const flexFill: CSSProperties = { flex: 1, minHeight: 0 };

/** 水平滚动条细样式（可选加到滚动容器） */
export const slimScrollbar: CSSProperties = {
  scrollbarWidth: "thin",
  scrollbarColor: "var(--dsh-scrollbar-thumb, var(--dsw-alias-scrollbar-bg-l2)) transparent",
};

export const smallText: CSSProperties = { fontSize: 12, color: palette.muted };

/** 头像圆块：无图时显示 handle 首字母；背景用品牌渐变，跟随主题 */
export function Avatar({
  label,
  color,
  size = 28,
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
        background:
          color ??
          "linear-gradient(135deg, var(--dsw-static-deepseek-500), var(--dsw-static-deepseek-400))",
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
