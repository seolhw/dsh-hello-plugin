// ================================================================
// 表情选择器（共用）：输入框「插入表情」与消息「表情回应」都用这一个弹层，
// 差别只在触发按钮尺寸与面板对齐方向（align）。
// 图标库无笑脸 glyph，这里手绘一个（与 Inbox 的 BellGlyph 同做法）。
// ================================================================

import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { palette, shadow, slimScrollbar } from "./styles";

/** 手绘笑脸 glyph：表情按钮用（图标库没有对应图标） */
export function SmileGlyph({ size = 16 }: { size?: number }): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.4" />
      <path d="M5.6 9.5a3 3 0 0 0 4.8 0" />
      <path d="M6.1 6.3h.01M9.9 6.3h.01" strokeWidth="1.9" />
    </svg>
  );
}

/** 表情分类（够用即可，不追求全集；常用放最前，同时作为兜底分组） */
const FREQUENT_GROUP = {
  id: "frequent",
  label: "常用",
  emojis: [
    "😀",
    "😃",
    "😄",
    "😁",
    "😆",
    "😅",
    "😂",
    "🤣",
    "😊",
    "😇",
    "🙂",
    "🙃",
    "😉",
    "😌",
    "😍",
    "🥰",
    "😘",
    "😋",
    "😜",
    "🤪",
    "🤨",
    "🧐",
    "🤓",
    "😎",
    "🥳",
    "😏",
    "😒",
    "😞",
    "😔",
    "😢",
    "😭",
    "😤",
  ],
};

const EMOJI_GROUPS: { id: string; label: string; emojis: string[] }[] = [
  FREQUENT_GROUP,
  {
    id: "gesture",
    label: "手势",
    emojis: [
      "👍",
      "👎",
      "👌",
      "✌️",
      "🤞",
      "🤟",
      "🤘",
      "🤙",
      "👈",
      "👉",
      "👆",
      "👇",
      "☝️",
      "✋",
      "🤚",
      "🖐️",
      "🖖",
      "👋",
      "🤝",
      "🙏",
      "💪",
      "👏",
      "🙌",
      "👐",
      "🤲",
      "💯",
    ],
  },
  {
    id: "mood",
    label: "心情",
    emojis: [
      "😶",
      "😐",
      "😑",
      "😬",
      "🙄",
      "😯",
      "😲",
      "😳",
      "🥺",
      "😦",
      "😧",
      "😨",
      "😰",
      "😥",
      "😓",
      "🤗",
      "🤔",
      "🤭",
      "🤫",
      "🤥",
      "😴",
      "😪",
      "😵",
      "🤐",
      "🤒",
      "🤕",
      "🥱",
      "😈",
      "👻",
      "💀",
      "🤖",
      "🎃",
    ],
  },
  {
    id: "animal",
    label: "动物",
    emojis: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐸",
      "🐵",
      "🐔",
      "🐧",
      "🐦",
      "🐤",
      "🦆",
      "🦉",
      "🐴",
      "🦄",
      "🐝",
      "🦋",
      "🐌",
      "🐞",
      "🐢",
      "🐍",
      "🐙",
      "🐳",
      "🌵",
    ],
  },
  {
    id: "food",
    label: "美食",
    emojis: [
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥝",
      "🍅",
      "🥑",
      "🥦",
      "🥕",
      "🌽",
      "🥒",
      "🍄",
      "🍞",
      "🥐",
      "🍕",
      "🍔",
      "🍟",
      "🍣",
      "🍜",
      "🍰",
      "🍺",
      "☕",
      "🍵",
      "🎂",
    ],
  },
  {
    id: "activity",
    label: "活动",
    emojis: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🎾",
      "🏐",
      "🎱",
      "🏓",
      "🏸",
      "🎯",
      "🎮",
      "🎲",
      "🎸",
      "🎹",
      "🎧",
      "🎤",
      "🎬",
      "📷",
      "💻",
      "📱",
      "⌨️",
      "🖥️",
      "🚀",
      "🎁",
      "🎉",
      "🎊",
      "🏆",
      "🥇",
      "💡",
      "🔧",
      "📌",
      "📎",
    ],
  },
  {
    id: "symbol",
    label: "符号",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "💔",
      "✨",
      "⭐",
      "🌟",
      "🔥",
      "💧",
      "🌈",
      "☀️",
      "🌙",
      "⚡",
      "🎵",
      "✅",
      "❌",
      "⚠️",
      "❓",
      "❗",
      "➕",
      "➖",
      "⏰",
      "🔔",
      "🔒",
      "🔑",
      "📢",
      "🏷️",
    ],
  },
];

const pickerWrap: CSSProperties = {
  position: "relative",
  flex: "0 0 auto",
  alignSelf: "flex-end",
};

/** 面板宽度：定位计算需要，故提为常量 */
const PANEL_WIDTH = 320;

/** 面板与视口边缘的最小留白 */
const PANEL_MARGIN = 8;

/**
 * 面板经 portal 挂到 body、以 fixed 定位浮在触发按钮上方。
 * 原因：面板原先用 absolute 相对按钮定位，而消息操作条在 messagesWrap
 * （overflowY: auto）滚动容器内，消息靠上时整个面板会被容器裁剪 / 被聊天区
 * 上层元素盖住。改为 fixed 视口定位后不再受任何祖先 overflow 影响。
 */
const panel: CSSProperties = {
  position: "fixed",
  zIndex: 900,
  width: PANEL_WIDTH,
  background: palette.elevated,
  border: `1px solid ${palette.border}`,
  borderRadius: 10,
  boxShadow: shadow.popup,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const tabRow: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: "6px 6px 4px",
  overflowX: "auto",
};

const tab: CSSProperties = {
  flex: "0 0 auto",
  border: "none",
  background: "transparent",
  color: palette.muted,
  fontSize: 14,
  fontWeight: 600,
  padding: "4px 8px",
  borderRadius: 999,
  cursor: "pointer",
};

const tabActive: CSSProperties = { background: palette.hover, color: palette.text };

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(8, 1fr)",
  gap: 2,
  padding: "0 6px 6px",
  maxHeight: 200,
  overflowY: "auto",
};

const emojiButton: CSSProperties = {
  border: "none",
  background: "transparent",
  borderRadius: 8,
  cursor: "pointer",
  padding: 0,
  height: 30,
  fontSize: 16,
  lineHeight: "30px",
  color: palette.text,
};

/**
 * 表情选择器：自带触发按钮，面板经 body portal 以 fixed 定位浮在按钮上方
 * （输入框贴底，向下会出屏；也避免被聊天区滚动容器裁剪）。
 * open 由外部持有，便于切房间 / 发送后统一收起。
 * align="right" 时面板向右对齐按钮（消息行操作条在右侧，避免面板溢出屏幕）。
 */
export function EmojiPopover({
  open,
  onOpenChange,
  onPick,
  disabled = false,
  size = "md",
  align = "left",
  icon = <SmileGlyph />,
  label = "表情",
  title = "插入表情",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (emoji: string) => void;
  disabled?: boolean;
  size?: "md" | "sm";
  align?: "left" | "right";
  icon?: ReactNode;
  label?: string;
  title?: string;
}): ReactElement {
  const [groupIndex, setGroupIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  /** 触发按钮的视口矩形；未测到时不渲染面板 */
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  } | null>(null);
  /** 面板实测高度：用于判断向上还是向下弹出 */
  const [panelHeight, setPanelHeight] = useState(0);

  // 面板 fixed 定位：按触发按钮的视口坐标实时计算，滚动 / 改窗口尺寸都要重算
  useLayoutEffect(() => {
    if (!open) {
      setAnchorRect(null);
      return;
    }
    function update(): void {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchorRect({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
    }
    update();
    // 捕获阶段监听：聊天区（messagesWrap）自身的滚动不会冒泡到 window
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // 面板渲染后量一次高度，用于决定向上 / 向下弹出
  useLayoutEffect(() => {
    if (!open) {
      setPanelHeight(0);
      return;
    }
    const height = panelRef.current?.offsetHeight ?? 0;
    if (height !== panelHeight) setPanelHeight(height);
  }, [open, panelHeight]);

  // 点击面板外 / 按 Esc 收起；按钮与面板都识别为「内部」，不会误触关闭
  useEffect(() => {
    if (!open) return;
    function onMouseDown(event: MouseEvent): void {
      const target = event.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onOpenChange(false);
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  const group = EMOJI_GROUPS[groupIndex] ?? FREQUENT_GROUP;

  /** 面板定位：默认向上弹（输入框贴底），上方放不下则翻到按钮下方 */
  function panelStyle(): CSSProperties {
    if (!anchorRect) return panel;
    const rawLeft = align === "right" ? anchorRect.right - PANEL_WIDTH : anchorRect.left;
    const maxLeft = window.innerWidth - PANEL_WIDTH - PANEL_MARGIN;
    const left = Math.max(PANEL_MARGIN, Math.min(rawLeft, Math.max(PANEL_MARGIN, maxLeft)));
    const fitsAbove = anchorRect.top - PANEL_MARGIN >= panelHeight;
    return {
      ...panel,
      left,
      ...(fitsAbove
        ? { bottom: window.innerHeight - anchorRect.top + PANEL_MARGIN }
        : { top: anchorRect.bottom + PANEL_MARGIN }),
    };
  }

  return (
    <div ref={wrapRef} style={pickerWrap}>
      <Button
        size={size}
        variant="ghost"
        icon={icon}
        onClick={() => onOpenChange(!open)}
        disabled={disabled}
        aria-label={label}
        aria-expanded={open}
        title={title}
      />
      {open && anchorRect
        ? createPortal(
            <div ref={panelRef} style={panelStyle()} role="dialog" aria-label="表情面板">
              <div style={tabRow}>
                {EMOJI_GROUPS.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGroupIndex(index)}
                    style={index === groupIndex ? { ...tab, ...tabActive } : tab}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div style={{ ...grid, ...slimScrollbar }}>
                {group.emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    title={emoji}
                    aria-label={emoji}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPick(emoji)}
                    style={emojiButton}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = palette.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
