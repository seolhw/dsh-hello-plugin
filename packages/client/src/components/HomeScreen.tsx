// ================================================================
// 主工作区：社区栏 | 频道列表 | 聊天面板（含实时状态与输入框）
// ================================================================

import {
  Button,
  HoverCard,
  IconChevronLeftOutline14,
  IconCloseOutline16,
  IconDownloadOutline16,
  IconEditOutline16,
  IconLinkOutline16,
  IconLoadingOutline16,
  IconPaperclipOutline16,
  IconPlusOutline16,
  IconRightUpOutline16,
  IconSendOutline16,
  IconShareOutline16,
  IconTrashOutline16,
  Input,
  Modal,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { Channel, Community, MemberRole, MessageAttachment } from "@dsh-talk/types/entities";
import type { ChangeEvent, CSSProperties, ReactElement, ReactNode, UIEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  backToCommunities,
  canModify,
  cloneToLocal,
  createCommunity,
  deleteMessage,
  joinCommunityByCode,
  loadOlderMessages,
  logout,
  type MessageItem,
  notify,
  openCommunity,
  removeUserAvatar,
  selectChannel,
  sendMessage,
  setDraft,
  snapshotChannel,
  updateMessage,
  updateUserName,
  updateUserAvatar,
  uploadImage,
  useTalkState,
} from "../store";
import { ChannelRowMenu, CommunityTools, CreateChannelButton } from "./Manage";
import { Avatar, AvatarPicker, palette, smallText, timeLabel } from "./styles";

// ---------------- 布局样式 ----------------

// 社区栏（Discord 式窄列）：只显示社区头像圆块，节省横向空间
const rail: CSSProperties = {
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

const railScroll: CSSProperties = { overflowY: "auto", flex: 1, width: "100%", padding: "6px 0" };

// 窄列里的图标按钮（加入 / 创建 / 修改 / 退出），40×40
const railAction: CSSProperties = {
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
const railItem: CSSProperties = {
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
const railAvatar: CSSProperties = {
  position: "relative",
  display: "inline-flex",
};

// 激活态的左侧指示条（Discord 风格）
const railPill: CSSProperties = {
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
const railBubble: CSSProperties = {
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
const railDivider: CSSProperties = {
  width: 32,
  height: 1,
  margin: "6px 0",
  background: palette.border,
};

const midCol: CSSProperties = {
  width: 216,
  flex: "0 0 auto",
  background: palette.page,
  borderRight: `1px solid ${palette.border}`,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const chatCol: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
};

const messagesWrap: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "12px 16px",
  display: "flex",
  flexDirection: "column",
};

const msgRow: CSSProperties = {
  display: "flex",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 10,
  border: `1px solid transparent`,
};

const creatorRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "6px 0",
};

const emptyMsg: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  padding: "38px 16px",
  color: palette.muted,
  textAlign: "center",
};

const composerWrap: CSSProperties = {
  borderTop: `1px solid ${palette.border}`,
  background: palette.page,
  padding: "10px 14px",
  display: "flex",
  gap: 8,
  alignItems: "flex-end",
};

const textArea: CSSProperties = {
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

const textAreaEdit: CSSProperties = {
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

const pendingChip: CSSProperties = {
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

// 与登录/注册一致的品牌渐变元素（@_@）
const brandMark: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, var(--dsw-static-deepseek-500), var(--dsw-static-deepseek-400))",
  color: "#fff",
  fontWeight: 700,
  fontSize: 24,
  userSelect: "none",
  flex: "0 0 auto",
};

const emptyCard: CSSProperties = {
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

const sectionTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 650,
  color: palette.caption,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  padding: "4px 8px 2px",
};

// 社区栏顶部的迷你品牌标志（登录/注册品牌渐变的小号版本）
const railMark: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, var(--dsw-static-deepseek-500), var(--dsw-static-deepseek-400))",
  color: "#fff",
  fontWeight: 700,
  fontSize: 17,
  userSelect: "none",
  flex: "0 0 auto",
};

// 分段式激活态（对齐 AuthScreen 的 Segmented 控件）
const activeTile: CSSProperties = {
  background: palette.elevated,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  border: `1px solid ${palette.border}`,
};

const liveDot: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flex: "0 0 auto",
};

// ---------- 与登录/注册一致的弹窗表单样式 ----------

/** 分段选择组容器（对齐 AuthScreen 的 Segmented 控件） */
const pillGroup: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  borderRadius: 10,
  background: palette.inputBg,
  border: `1px solid ${palette.border}`,
};

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

const pillKeyActive: CSSProperties = {
  fontWeight: 600,
  color: palette.text,
  background: palette.elevated,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
};

const fieldBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const fieldLabel: CSSProperties = {
  fontSize: 12,
  color: palette.muted,
  fontWeight: 500,
};

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
};

const PRIVACY_LABELS: Record<Community["privacy"], string> = {
  public: "公开",
  private: "私密",
};

// ---------------- 社区栏 ----------------

// 社区栏 hover 小窗的内容：名称、可见性/角色、描述、成员总数（只读，点击仍选社区）
function CommunityMetaCard({
  community,
}: {
  community: Community & { role: MemberRole };
}): ReactElement {
  return (
    <div style={{ minWidth: 180, maxWidth: 280 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar label={community.name} src={community.iconUrl} size={32} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: palette.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {community.name}
          </div>
          <div style={{ fontSize: 11, color: palette.caption }}>
            {PRIVACY_LABELS[community.privacy]} · {ROLE_LABELS[community.role]}成员
          </div>
        </div>
      </div>
      {community.description ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            lineHeight: 1.6,
            color: palette.secondary,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {community.description}
        </div>
      ) : null}
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: palette.muted,
        }}
      >
        <span>{community.memberCount} 名成员</span>
        {community.slug ? <span>#{community.slug}</span> : null}
      </div>
    </div>
  );
}

function CommunitiesRail({
  onJoin,
  onCreate,
  onEditProfile,
}: {
  onJoin: () => void;
  onCreate: () => void;
  onEditProfile: () => void;
}): ReactElement {
  const talk = useTalkState();
  const current = talk.view.communityId;
  const me = talk.me;
  return (
    <div style={rail}>
      <span style={railMark} title="dsh-talk 社区">
        {me?.handle.slice(0, 1).toUpperCase() ?? "T"}
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          marginTop: 6,
        }}
      >
        <button
          type="button"
          style={railAction}
          onClick={onJoin}
          aria-label="用邀请码加入"
          title="用邀请码加入"
        >
          <IconLinkOutline16 />
        </button>
        <button
          type="button"
          style={railAction}
          onClick={onCreate}
          aria-label="创建社区"
          title="创建社区"
        >
          <IconPlusOutline16 />
        </button>
      </div>
      <div style={railDivider} />
      <div style={railScroll}>
        {talk.communities.map((c) => {
          const active = c.id === current;
          const unread = c.unreadChannels;
          const mention = c.unreadMentions;
          return (
            <button
              key={c.id}
              type="button"
              style={railItem}
              onClick={() => {
                if (!active) void openCommunity(c.id);
              }}
            >
              {active ? <span style={railPill} /> : null}
              <HoverCard
                openDelayMs={300}
                content={<CommunityMetaCard community={c} />}
                anchor={
                  <span style={railAvatar}>
                    <Avatar label={c.name} src={c.iconUrl} size={44} />
                    {mention > 0 ? (
                      <span style={{ ...railBubble, background: palette.accent }}>{mention}</span>
                    ) : unread > 0 ? (
                      <span style={railBubble}>{unread}</span>
                    ) : null}
                  </span>
                }
              />
            </button>
          );
        })}
      </div>
      {me ? (
        <div
          style={{
            padding: "8px 0 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            width: "100%",
          }}
        >
          <div style={railDivider} />
          <span title={me.handle} style={railAvatar}>
            <Avatar label={me.handle} src={me.avatarUrl} size={34} />
          </span>
          <button
            type="button"
            style={railAction}
            onClick={onEditProfile}
            aria-label="修改用户名"
            title="修改用户名"
          >
            <IconEditOutline16 />
          </button>
          <button
            type="button"
            style={railAction}
            onClick={() => void logout()}
            aria-label="退出登录"
            title="退出登录"
          >
            <IconRightUpOutline16 />
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ---------------- 频道列表 ----------------

function ChannelList(): ReactElement | null {
  const talk = useTalkState();
  const community = talk.view.community;
  const activeChannel = talk.view.channelId;
  if (!community) return null;
  return (
    <div style={midCol}>
      <div
        style={{
          padding: "10px 12px 6px",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Button
          size="sm"
          variant="ghost"
          icon={<IconChevronLeftOutline14 />}
          onClick={() => backToCommunities()}
          aria-label="返回社区列表"
          title="返回社区列表"
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 650,
            color: palette.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {community.name}
        </span>
        <CommunityTools />
      </div>
      <div style={{ ...railScroll, flex: 1, padding: "0 8px 8px" }}>
        <div style={sectionTitle}>频道</div>
        {community.channels.map((ch: Channel) => {
          const active = ch.id === activeChannel;
          return (
            <div
              key={ch.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "0 4px 0 8px",
                borderRadius: 8,
                background: active ? palette.hover : undefined,
                border: "1px solid transparent",
                ...(active ? activeTile : {}),
                marginBottom: 2,
              }}
            >
              <button
                type="button"
                onClick={() => void selectChannel(ch.id)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 2px",
                  border: "none",
                  background: "transparent",
                  color: palette.text,
                  fontWeight: active ? 600 : 450,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ color: palette.muted }}>#</span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ch.name}
                </span>
              </button>
              <ChannelRowMenu channel={ch} />
            </div>
          );
        })}
        <CreateChannelButton />
      </div>
    </div>
  );
}

// ---------------- 文本渲染（@mention 高亮） ----------------

function renderMentions(text: string, selfHandle: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /@([\p{L}\p{N}_]+)/gu;
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null = re.exec(text);
  while (match !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const isSelf = match[1] === selfHandle;
    nodes.push(
      <span
        key={`mention-${index}`}
        style={{
          color: isSelf ? "#ffffff" : palette.accent,
          background: isSelf ? palette.accent : "rgba(91,140,255,0.12)",
          borderRadius: 4,
          padding: isSelf ? "0 3px" : "0 2px",
          fontWeight: 500,
        }}
      >
        {match[0]}
      </span>,
    );
    last = match.index + match[0].length;
    index += 1;
    match = re.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ---------------- 附件展示 ----------------

function formatBytes(n: number): string {
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

const fileChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 9px",
  borderRadius: 8,
  border: `1px solid ${palette.border}`,
  background: palette.inputBg,
  color: palette.text,
  fontSize: 12,
  textDecoration: "none",
  maxWidth: 260,
};

function AttachmentList({
  attachments,
}: {
  attachments: MessageAttachment[];
}): ReactElement | null {
  const list = attachments ?? [];
  if (list.length === 0) return null;
  const images = list.filter((a) => a.kind === "image");
  const files = list.filter((a) => a.kind !== "image");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
      {images.map((a) => (
        <a
          key={a.url}
          href={a.url}
          target="_blank"
          rel="noreferrer"
          title={a.name}
          style={{ display: "block", borderRadius: 10, overflow: "hidden" }}
        >
          <img
            src={a.url}
            alt={a.name}
            loading="lazy"
            style={{
              display: "block",
              maxHeight: 240,
              maxWidth: 320,
              borderRadius: 10,
              border: `1px solid ${palette.border}`,
              background: palette.inputBg,
            }}
          />
        </a>
      ))}
      {files.map((a) => (
        <a key={a.url} href={`${a.url}?download=1`} title="点击下载" style={fileChip}>
          <span style={{ color: palette.muted, display: "inline-flex" }}>
            <IconDownloadOutline16 />
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {a.name}
          </span>
          <span style={{ ...smallText, fontSize: 11, flex: "0 0 auto" }}>
            {formatBytes(a.size)}
          </span>
        </a>
      ))}
    </div>
  );
}

// ---------------- 消息行 ----------------

function MessageRow({ item }: { item: MessageItem }): ReactElement {
  const talk = useTalkState();
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(item.content);
  const mine = talk.me !== null && item.authorId === talk.me.id;
  const mentionedMe = (item.mentions ?? []).includes(talk.me?.id ?? "");
  const allowEdit = canModify(item);

  async function saveEdit(): Promise<void> {
    try {
      await updateMessage(item.id, draftText);
      setEditing(false);
    } catch {
      // 错误已 toast
    }
  }

  async function remove(): Promise<void> {
    if (!window.confirm("删除这条消息？")) return;
    try {
      await deleteMessage(item.id);
    } catch {
      // 错误已 toast
    }
  }

  return (
    <div
      style={{
        ...msgRow,
        borderColor: mentionedMe ? "var(--dsw-alias-state-business-tertiary)" : undefined,
        background: mine ? palette.hover : undefined,
        cursor: "default",
      }}
    >
      <Avatar label={item.author.handle} src={item.author.avatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {item.author.displayName ?? item.author.handle}
          </span>
          <span style={{ fontSize: 11 }}>{mine ? "" : `@${item.author.handle}`}</span>
          <span style={{ ...smallText, fontSize: 11 }}>{timeLabel(item.createdAt)}</span>
          {mentionedMe ? <span style={{ fontSize: 11, color: palette.accent }}>@了你</span> : null}
          {item.updatedAt ? <span style={{ ...smallText, fontSize: 10 }}>(已编辑)</span> : null}
        </div>
        {editing ? (
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void saveEdit();
              } else if (e.key === "Escape") {
                setDraftText(item.content);
                setEditing(false);
              }
            }}
            style={textAreaEdit}
          />
        ) : (
          <div
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 13.5,
              lineHeight: 1.55,
            }}
          >
            {renderMentions(item.content, talk.me?.handle ?? "")}
          </div>
        )}
        <AttachmentList attachments={item.attachments ?? []} />
      </div>
      {allowEdit ? (
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                icon={<IconCloseOutline16 />}
                onClick={() => setEditing(false)}
                aria-label="取消编辑"
              />
              <Button
                size="sm"
                variant="ghost"
                icon={<IconLoadingOutline16 />}
                onClick={() => void saveEdit()}
                aria-label="保存"
              />
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                icon={<IconEditOutline16 />}
                onClick={() => setEditing(true)}
                aria-label="编辑"
              />
              <Button
                size="sm"
                variant="ghost"
                icon={<IconTrashOutline16 />}
                onClick={() => void remove()}
                aria-label="删除"
              />
            </>
          )}
        </span>
      ) : null}
    </div>
  );
}

// ---------------- 聊天面板 ----------------

function ChatPane(): ReactElement | null {
  const talk = useTalkState();
  const channelId = talk.view.channelId;
  const community = talk.view.community;
  const channel = channelId ? (community?.channels.find((c) => c.id === channelId) ?? null) : null;
  const messageCount = talk.view.messages.length;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<string | null>(null);
  const pinnedRef = useRef(true);
  const lastCountRef = useRef(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_ATTACH = 4;
  const [shareOpen, setShareOpen] = useState(false);

  const draft = channelId ? (talk.view.drafts[channelId] ?? "") : "";

  function onScroll(event: UIEvent<HTMLDivElement>): void {
    const el = event.currentTarget;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // 切频道 → 置底；后续消息增多且用户贴底 → 跟随到底
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const switched = channelRef.current !== channelId;
    channelRef.current = channelId;
    if (switched) {
      lastCountRef.current = messageCount;
      el.scrollTop = el.scrollHeight;
      pinnedRef.current = true;
      return;
    }
    const grew = messageCount > lastCountRef.current;
    lastCountRef.current = messageCount;
    if (grew && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [channelId, messageCount]);

  if (!channelId) return null;

  function pickFiles(event: ChangeEvent<HTMLInputElement>): void {
    const picked = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    if (picked.length === 0) return;
    setPendingFiles((prev) => {
      const room = MAX_ATTACH - prev.length;
      if (room <= 0) {
        notify(`一条消息最多 ${MAX_ATTACH} 个附件`);
        return prev;
      }
      if (picked.length > room) notify(`一条消息最多 ${MAX_ATTACH} 个附件，已保留前 ${room} 个`);
      return [...prev, ...picked].slice(0, MAX_ATTACH);
    });
  }

  function removePending(index: number): void {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit(): Promise<void> {
    const text = draft;
    if (text.trim().length === 0 && pendingFiles.length === 0) return;
    const ok = await sendMessage(text, pendingFiles);
    if (ok) {
      setDraft("");
      setPendingFiles([]);
    }
  }

  const hasOlder = talk.view.nextCursor !== null;
  const canLoadMore = !talk.view.loadingOlder && hasOlder;

  return (
    <>
      <div style={chatCol}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderBottom: `1px solid ${palette.border}`,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              borderRadius: 6,
              background: palette.inputBg,
              border: `1px solid ${palette.border}`,
              color: palette.muted,
              fontSize: 12,
              fontWeight: 700,
              flex: "0 0 auto",
            }}
          >
            #
          </span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{channel?.name ?? ""}</span>
          {channel?.topic ? (
            <span
              style={{
                ...smallText,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {channel.topic}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            icon={<IconShareOutline16 />}
            onClick={() => setShareOpen(true)}
            aria-label="分享会话快照"
            title="把本频道消息打成可分享的快照"
          />
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 8px",
              borderRadius: 999,
              background: talk.view.live ? palette.hover : palette.inputBg,
              border: `1px solid ${palette.border}`,
            }}
          >
            <span
              style={{
                ...liveDot,
                background: talk.view.live ? palette.success : palette.muted,
                boxShadow: talk.view.live ? `0 0 5px ${palette.success}` : undefined,
              }}
            />
            <span style={{ fontSize: 11, color: palette.secondary }}>
              {talk.view.live ? "实时" : "重连中…"}
            </span>
          </span>
        </div>

        <div ref={scrollRef} onScroll={onScroll} style={messagesWrap}>
          {talk.view.messagesLoading ? (
            <div style={{ ...emptyMsg }}>加载消息…</div>
          ) : talk.view.messages.length === 0 ? (
            <div style={{ ...emptyMsg }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: palette.inputBg,
                  border: `1px solid ${palette.border}`,
                  color: palette.accent,
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                #
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>还没有消息</span>
              <span style={{ fontSize: 12 }}>来说第一句吧。</span>
            </div>
          ) : (
            <>
              {canLoadMore ? (
                <div style={creatorRow}>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void loadOlderMessages()}
                    disabled={talk.view.loadingOlder}
                  >
                    {talk.view.loadingOlder ? "加载中…" : "加载更早消息"}
                  </Button>
                </div>
              ) : null}
              {talk.view.messages.map((item) => (
                <MessageRow key={item.id} item={item} />
              ))}
            </>
          )}
        </div>

        <div style={composerWrap}>
          <Button
            size="md"
            variant="ghost"
            icon={<IconPaperclipOutline16 />}
            onClick={() => fileInputRef.current?.click()}
            disabled={talk.view.sending}
            aria-label="添加附件"
            title="添加附件"
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            {pendingFiles.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {pendingFiles.map((f, i) => (
                  <span key={`${f.name}-${f.size}-${f.lastModified}-${f.type}`} style={pendingChip}>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.name}
                    </span>
                    <span style={{ ...smallText, fontSize: 11, flex: "0 0 auto" }}>
                      {formatBytes(f.size)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<IconCloseOutline16 />}
                      onClick={() => removePending(i)}
                      aria-label={`移除 ${f.name}`}
                    />
                  </span>
                ))}
              </div>
            ) : null}
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={`在 #${channel?.name ?? ""} 发消息…`}
              style={textArea}
            />
          </div>
          <Button
            variant="primary"
            size="md"
            icon={<IconSendOutline16 />}
            disabled={talk.view.sending || (draft.trim().length === 0 && pendingFiles.length === 0)}
            onClick={() => void submit()}
            aria-label="发送"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => pickFiles(e)}
            style={{ display: "none" }}
            aria-hidden
            tabIndex={-1}
          />
        </div>
      </div>
      <ShareSnapshotModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        channelName={channel?.name ?? ""}
      />
    </>
  );
}

// ---------------- 弹窗：创建 / 加入 ----------------

function CreateCommunityModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 每次打开重置已上传的头像预览
  useEffect(() => {
    if (open) setIconUrl(null);
  }, [open]);

  async function pickIcon(file: File): Promise<void> {
    const url = await uploadImage(file);
    if (url) setIconUrl(url);
  }

  async function submit(): Promise<void> {
    if (name.trim().length === 0) return;
    setBusy(true);
    const body: {
      name: string;
      description?: string;
      privacy?: "public" | "private";
      iconUrl?: string | null;
    } = {
      name: name.trim(),
      privacy,
      iconUrl,
    };
    if (description.trim().length > 0) body.description = description.trim();
    const ok = await createCommunity(body);
    setBusy(false);
    if (ok) {
      setName("");
      setDescription("");
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="创建社区"
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || name.trim().length === 0}
            onClick={() => void submit()}
          >
            创建
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={fieldBlock}>
          <span style={fieldLabel}>社区头像</span>
          <AvatarPicker
            src={iconUrl}
            label={name.trim() || "社区"}
            size={60}
            onPick={(file) => void pickIcon(file)}
            onRemove={() => setIconUrl(null)}
            uploadLabel="设置头像"
            removeLabel="移除头像"
            busy={busy}
          />
        </div>
        <div style={fieldBlock}>
          <label htmlFor="talk-create-name" style={fieldLabel}>
            社区名称
          </label>
          <Input
            id="talk-create-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="社区名称"
          />
        </div>
        <div style={fieldBlock}>
          <label htmlFor="talk-create-desc" style={fieldLabel}>
            简介
          </label>
          <Input
            id="talk-create-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="简介（可选）"
          />
        </div>
        <div style={fieldBlock}>
          <span style={fieldLabel}>可见性</span>
          <div style={pillGroup}>
            <button
              type="button"
              style={{ ...pillKey, ...(privacy === "public" ? pillKeyActive : {}) }}
              onClick={() => setPrivacy("public")}
            >
              公开
            </button>
            <button
              type="button"
              style={{ ...pillKey, ...(privacy === "private" ? pillKeyActive : {}) }}
              onClick={() => setPrivacy("private")}
            >
              私有
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function JoinModal({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    if (code.trim().length === 0) return;
    setBusy(true);
    const ok = await joinCommunityByCode(code);
    setBusy(false);
    if (ok) {
      setCode("");
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="用邀请码加入"
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || code.trim().length === 0}
            onClick={() => void submit()}
          >
            加入
          </Button>
        </>
      }
    >
      <div style={fieldBlock}>
        <label htmlFor="talk-join-code" style={fieldLabel}>
          邀请码
        </label>
        <Input
          id="talk-join-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="邀请码，如 ABCD1234"
        />
      </div>
    </Modal>
  );
}

// ---------------- 弹窗：修改用户名 ----------------

function UpdateUsernameModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const talk = useTalkState();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  // 每次打开用当前 handle 预填
  useEffect(() => {
    if (open) setValue(talk.me?.handle ?? "");
  }, [open, talk.me?.handle]);

  async function pickAvatar(file: File): Promise<void> {
    setAvatarBusy(true);
    await updateUserAvatar(file);
    setAvatarBusy(false);
  }

  async function removeAvatar(): Promise<void> {
    setAvatarBusy(true);
    await removeUserAvatar();
    setAvatarBusy(false);
  }

  async function submit(): Promise<void> {
    if (busy) return;
    setBusy(true);
    const ok = await updateUserName(value);
    setBusy(false);
    if (ok) onClose();
  }

  const trimmed = value.trim();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="修改用户名"
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || trimmed.length === 0}
            onClick={() => void submit()}
          >
            {busy ? "保存中…" : "保存"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={fieldBlock}>
          <span style={fieldLabel}>个人头像</span>
          <AvatarPicker
            src={talk.me?.avatarUrl ?? null}
            label={talk.me?.handle ?? ""}
            size={60}
            onPick={(file) => void pickAvatar(file)}
            onRemove={() => void removeAvatar()}
            busy={avatarBusy}
          />
        </div>
        <div style={fieldBlock}>
          <label htmlFor="talk-username" style={fieldLabel}>
            用户名
          </label>
          <Input
            id="talk-username"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="新的用户名"
          />
        </div>
        <span style={{ ...smallText, fontSize: 12, lineHeight: 1.6 }}>
          仅限字母、数字、下划线与点；4-30 位且全局唯一（@提及用）。若已被占用会自动提示。
        </span>
      </div>
    </Modal>
  );
}

// ---------------- 弹窗：分享会话快照 ----------------

function ShareSnapshotModal({
  open,
  onClose,
  channelName,
}: {
  open: boolean;
  onClose: () => void;
  channelName: string;
}): ReactElement {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    if (busy) return;
    setBusy(true);
    const url = await snapshotChannel({ title, summary });
    if (url) {
      await cloneToLocal(url);
    }
    setBusy(false);
    if (!url) return;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // 剪贴板不可用时忽略
      }
    }
    setTitle("");
    setSummary("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="分享会话快照"
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void submit()}>
            {busy ? "打包中…" : "生成并复制链接"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`会话快照：${channelName}`}
        />
        <Input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="一句话摘要（可选）"
        />
        <div style={{ ...smallText, fontSize: 12 }}>
          把本频道最近最多 200 条消息打包成 JSON 快照，并让本机 host 流式下载到本地
          `~/.dsh-talk/clones`；生成后链接也会复制到剪贴板，可分享给其它人。
        </div>
      </div>
    </Modal>
  );
}

// ---------------- 主出口（整页三栏，无独立浮层外壳） ----------------

export function HomeScreen(): ReactElement {
  const talk = useTalkState();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const inCommunity = talk.view.communityId !== null;

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <CommunitiesRail
        onJoin={() => setShowJoin(true)}
        onCreate={() => setShowCreate(true)}
        onEditProfile={() => setShowUsername(true)}
      />
      {inCommunity ? (
        <>
          <ChannelList />
          <ChatPane />
        </>
      ) : (
        <div style={{ ...chatCol, alignItems: "center", justifyContent: "center" }}>
          <div style={emptyCard}>
            <span style={brandMark}>T</span>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.3,
                marginTop: 2,
              }}
            >
              欢迎使用 dsh-talk 社区
            </div>
            <span style={{ ...smallText, fontSize: 12.5, lineHeight: 1.7 }}>
              从左侧选择一个社区开始聊天，
              <br />
              或点右上「＋」创建 / 用邀请码加入。
            </span>
          </div>
        </div>
      )}
      <CreateCommunityModal open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinModal open={showJoin} onClose={() => setShowJoin(false)} />
      <UpdateUsernameModal open={showUsername} onClose={() => setShowUsername(false)} />
    </div>
  );
}
