// ================================================================
// dsh-talk 页面共享样式：全部使用 DeepSeek 宿主注入的 --dsw-* token，
// 随系统亮/暗主题自动切换（宿主把 "system" 解析成实际 colorScheme 后，
// 通过 body 内联变量 + body[data-ds-dark-theme] 下发）。插件侧禁止硬编码色值。
// 参考：dsh-client-ui-theme 的 design-platform.css token 命名。
// ================================================================

import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import type { CSSProperties, ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

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

/** 分段选择组容器（对齐 AuthScreen 的 Segmented 控件）：圆角外壳 + 内部激活键 */
export const pillGroup: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  borderRadius: 10,
  background: palette.inputBg,
  border: `1px solid ${palette.border}`,
};

/** 分段选择组内的单个键（非激活态） */
const pillKey: CSSProperties = {
  flex: 1,
  border: "none",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 13,
  fontWeight: 450,
  color: palette.muted,
  background: "transparent",
  cursor: "pointer",
  transition: "background 120ms ease, color 120ms ease",
};

/** 分段选择键样式：active 时叠加激活态 */
export function pillStyle(active: boolean): CSSProperties {
  if (!active) return pillKey;
  return {
    ...pillKey,
    fontWeight: 600,
    color: palette.text,
    background: palette.elevated,
    boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  };
}

/** 表单字段纵向容器 */
export const fieldBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

/** 字段小标签 */
export const fieldLabel: CSSProperties = {
  fontSize: 12,
  color: palette.muted,
  fontWeight: 500,
};

/** 成员 / 封禁 / 在线成员等列表卡片行 */
export const listCard: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 10,
  background: palette.inputBg,
  border: `1px solid ${palette.border}`,
};

/** 列表卡片的主标题行（单行省略） */
export const listCardName: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/**
 * 项目 logo（构建期由 tsdown 读 packages/client/public/logo.svg 注入）转 data URL。
 * 源文件是纯黑单色图形，这里统一用 CSS mask 渲染、以宿主语义文字色填充，
 * 因此亮/暗主题下都可见（详见 BrandLogo）。
 */
export const talkLogoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(__DSH_TALK_LOGO_SVG__)}`;

/** 品牌 logo 标记：单色 mask 跟随宿主文字色，尺寸自定 */
export function BrandLogo({ size = 34, title }: { size?: number; title?: string }): ReactElement {
  return (
    <span
      role="img"
      aria-label={title ?? "dsh-talk"}
      title={title}
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        display: "inline-block",
        backgroundColor: palette.text,
        maskImage: `url("${talkLogoUrl}")`,
        WebkitMaskImage: `url("${talkLogoUrl}")`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

// ---------------- 默认头像（DiceBear 占位图） ----------------
// 用户与社区走不同 style + 不同配色，避免默认头像看起来是一类东西：
//   用户 = notionists 手绘人物 + 低饱和马卡龙底色（纸面透明）
//   社区 = shapes 几何图形 + 高饱和底色 + 白色图形，更接近社区徽标
const DICEBEAR_API = "https://api.dicebear.com/10.x";

const USER_PLACEHOLDER_BG = "b6e3f4";
// const USER_PLACEHOLDER_BG = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf";
const COMMUNITY_PLACEHOLDER_BG = "7c3aed";
// const COMMUNITY_PLACEHOLDER_BG = "2563eb,7c3aed,db2777,0d9488,ea580c";

/** 头像归属：用户 / 社区，决定默认占位图的风格 */
export type AvatarKind = "user" | "community";

/** 拼装 DiceBear 占位图 URL；seed 相同则每次生成同一张图，可稳定替代自定义头像 */
export function dicebearAvatarUrl(kind: AvatarKind, seed: string): string {
  const search = new URLSearchParams({ seed, size: "96" });
  if (kind === "community") {
    search.set("backgroundColor", COMMUNITY_PLACEHOLDER_BG);
    for (const key of ["shape1Color", "shape2Color", "shape3Color"]) {
      search.set(key, "ffffff");
    }
    return `${DICEBEAR_API}/planets/svg?${search}`;
  }
  search.set("backgroundColor", USER_PLACEHOLDER_BG);
  // 纸面透明，让底色铺满整个头像圆块
  search.set("paperColor", "00000000");
  return `${DICEBEAR_API}/voxel-bot/svg?${search}`;
}

/** 头像圆块：有 url 时显示图片；无 url / 加载失败时回退到 DiceBear 默认占位图 */
export function Avatar({
  label,
  color,
  size = 28,
  src,
  inset,
  kind = "user",
}: {
  label: string;
  color?: string;
  size?: number;
  src?: string | null;
  /** 图片相对圆块的内缩（px）：留出一圈底色与 logo 的缝隙；不传则图片铺满整圆 */
  inset?: number;
  /** 头像归属：用户 / 社区，决定默认占位图风格（默认用户） */
  kind?: AvatarKind;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (src) setFailed(false);
  }, [src]);
  const placeholder = dicebearAvatarUrl(kind, label);
  const showImage = Boolean(src) && !failed;
  const showPlaceholder = !showImage && placeholder;

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
        overflow: "hidden",
        background:
          color ??
          "linear-gradient(135deg, var(--dsw-static-deepseek-500), var(--dsw-static-deepseek-400))",
        color: "#fff",
        fontSize: Math.round(size * 0.42),
        fontWeight: 600,
        userSelect: "none",
      }}
    >
      {showImage ? (
        <img
          src={src ?? ""}
          alt={label}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            // inset 时改用 contain：logo 完整落在内缩后的区域，四周露出底色
            objectFit: inset ? "contain" : "cover",
            ...(inset ? { boxSizing: "border-box" as const, padding: inset } : {}),
          }}
        />
      ) : showPlaceholder ? (
        <img
          src={placeholder}
          alt={label}
          onError={() => setFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
          }}
        />
      ) : (
        label.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}

/** 头像/图标选择器：预览圆块 + 「修改/移除」按钮，选取后回调 onPick(File) */
export function AvatarPicker({
  src,
  label,
  size = 60,
  onPick,
  onRemove,
  uploadLabel = "修改头像",
  removeLabel = "移除头像",
  busy,
  kind = "user",
}: {
  src?: string | null;
  label: string;
  size?: number;
  onPick?: (file: File) => void;
  onRemove?: () => void;
  uploadLabel?: string;
  removeLabel?: string;
  busy?: boolean;
  /** 头像归属：用户 / 社区，决定默认占位图风格（默认用户） */
  kind?: AvatarKind;
}): ReactElement {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Avatar label={label} src={src ?? null} size={size} kind={kind} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {uploadLabel}
          </Button>
          {onRemove ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onRemove}>
              {removeLabel}
            </Button>
          ) : null}
        </div>
        <span style={{ ...smallText, fontSize: 11 }}>支持 JPG / PNG / WebP，建议方形图片</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && onPick) onPick(file);
        }}
        aria-hidden
        tabIndex={-1}
      />
    </div>
  );
}

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
