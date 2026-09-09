// ================================================================
// 主工作区：社区栏 | 频道列表 | 聊天面板（含实时状态与输入框）
// ================================================================

import {
  Button,
  HoverCard,
  IconBranchOutline16,
  IconChevronLeftOutline14,
  IconChevronRightOutline14,
  IconCloseOutline16,
  IconDownloadOutline16,
  IconEditOutline16,
  IconLoadingOutline16,
  IconPaperclipOutline16,
  IconPlusOutline16,
  IconRefreshOutline16,
  IconRightUpOutline16,
  IconSearchOutline16,
  IconSendOutline16,
  IconShareOutline16,
  IconTrashOutline16,
  IconUserOutline16,
  Input,
  Modal,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { ChannelOnlineMember, SearchMessageResult, ThreadSummary } from "@dsh-talk/types/api";
import type { Channel, Community, MemberRole, MessageAttachment } from "@dsh-talk/types/entities";
import type {
  ChangeEvent,
  CSSProperties,
  KeyboardEvent,
  ReactElement,
  ReactNode,
  UIEvent,
} from "react";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  backToCommunities,
  cancelReply,
  canEditMessage,
  canRetractMessage,
  clearMessageFocus,
  cloneToLocal,
  closeThread,
  createCommunity,
  createThreadInChannel,
  deleteMessage,
  fetchChannelOnline,
  joinCommunityByCode,
  loadOlderMessages,
  logout,
  type MemberLite,
  type MessageItem,
  notify,
  openCommunity,
  openInbox,
  openThread,
  reloadCommunityDetail,
  removeUserAvatar,
  replyToMessage,
  revealMessage,
  searchCommunityMessages,
  selectChannel,
  sendMessage,
  setDraft,
  setThreadArchived,
  snapshotChannel,
  updateMessage,
  updateUserAvatar,
  updateUserName,
  uploadImage,
  useTalkState,
} from "../store";
import { BellGlyph, InboxDialog } from "./Inbox";
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
  gap: 10,
  padding: "5px 12px",
  borderRadius: 8,
  position: "relative",
};

/** hover 时浮在消息右上角的操作条（Discord 风格，平时不占位） */
const msgChip: CSSProperties = {
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
const messageRowCss = `
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

/** 回复目标 / 引用块的正文摘要上限 */
const QUOTE_SNIPPET_MAX = 72;

/** 被引用消息的展示辅助：拆出作者名与正文摘要 */
function replyParts(item: Pick<MessageItem, "replyTo">): { author: string; content: string } {
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
            {PRIVACY_LABELS[community.privacy]}
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
      </div>
    </div>
  );
}

function CommunitiesRail({
  onAdd,
  onInbox,
  onEditProfile,
}: {
  onAdd: () => void;
  onInbox: () => void;
  onEditProfile: () => void;
}): ReactElement {
  const talk = useTalkState();
  const current = talk.view.communityId;
  const me = talk.me;
  const unreadLabel = talk.inboxUnread > 99 ? "99+" : String(talk.inboxUnread);
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
          onClick={onInbox}
          aria-label="站内信"
          title="站内信"
        >
          <span style={railAvatar}>
            <BellGlyph />
            {talk.inboxUnread > 0 ? (
              <span style={{ ...railBubble, top: -5, right: -7 }}>{unreadLabel}</span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          style={railAction}
          onClick={onAdd}
          aria-label="加入或创建社区"
          title="加入或创建社区"
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

/** 话题（forum）频道小图标：气泡内两根横线 = 一帖一话题，点进去聊 */
function ForumGlyph(): ReactElement {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8.5h8M6 12h5" />
      <path d="M20 20l-3.4-2.7H9a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4h7a4 4 0 0 1 4 4v5.6a2 2 0 0 1-2 2h-.6z" />
    </svg>
  );
}

/** 频道类型图标：文字 # / 公告 ! / 话题（气泡+横线），便于成员快速区分频道定位 */
function ChannelGlyph({ kind }: { kind: Channel["kind"] }): ReactElement {
  if (kind === "announcement") {
    return (
      <span
        title="公告频道"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          borderRadius: 5,
          background: "var(--dsw-alias-state-warn-primary)",
          color: "#fff",
          fontSize: 11,
          fontWeight: 800,
          lineHeight: 1,
          flex: "0 0 auto",
        }}
      >
        !
      </span>
    );
  }
  if (kind === "forum") {
    return (
      <span
        title="话题频道"
        style={{
          color: palette.accent,
          display: "inline-flex",
          alignItems: "center",
          flex: "0 0 auto",
        }}
      >
        <ForumGlyph />
      </span>
    );
  }
  return <span style={{ color: palette.muted }}>#</span>;
}

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
            <Fragment key={ch.id}>
              <div
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
                  <span style={{ display: "inline-flex", flex: "0 0 auto" }}>
                    <ChannelGlyph kind={ch.kind} />
                  </span>
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
              <ChannelThreadsOf channelId={ch.id} />
            </Fragment>
          );
        })}
        <CreateChannelButton />
      </div>
    </div>
  );
}

// ---------------- 讨论组（thread）列表：挂在频道下 ----------------

/** 单个讨论组的列表行（含未读角标），点击进入该讨论 */
function ThreadListRow({ thread, channelId }: { thread: ThreadSummary; channelId: string }) {
  const talk = useTalkState();
  const opened = talk.view.threadId === thread.id;
  const unread = thread.unreadCount;
  const mention = thread.unreadMentions;
  return (
    <button
      type="button"
      onClick={() => void openThread({ id: thread.id, channelId })}
      title={thread.starterSnippet ? `起点：${thread.starterSnippet}` : thread.name}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        width: "100%",
        border: "none",
        background: opened ? palette.hover : "transparent",
        borderRadius: 6,
        padding: "4px 6px 4px 8px",
        color: palette.text,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        style={{
          color: opened ? palette.accent : palette.caption,
          display: "inline-flex",
          flex: "0 0 auto",
        }}
      >
        <IconBranchOutline16 />
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12,
          color: thread.status === "archived" ? palette.muted : palette.secondary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {thread.name}
      </span>
      {unread > 0 ? (
        <span
          style={{
            flex: "0 0 auto",
            minWidth: 15,
            height: 15,
            padding: "0 4px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            lineHeight: "15px",
            textAlign: "center",
            color: "#fff",
            background: mention > 0 ? palette.accent : palette.badge,
          }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}

/** 频道下方的「讨论」分组：活跃在列，已归档折叠可展开。话题频道不在此嵌套（右侧话题板承担列表）。 */
function ChannelThreadsOf({ channelId }: { channelId: string }): ReactElement | null {
  const talk = useTalkState();
  const [archivedOpen, setArchivedOpen] = useState(false);
  const kindOf = talk.view.community?.channels.find((c) => c.id === channelId)?.kind;
  if (kindOf === "forum") return null;
  const all = talk.view.community?.threads.filter((t) => t.channelId === channelId) ?? [];
  const active = all.filter((t) => t.status === "active");
  const archived = all.filter((t) => t.status === "archived");
  if (active.length === 0 && archived.length === 0) return null;

  return (
    <div style={{ margin: "1px 0 6px", paddingLeft: 12 }}>
      {active.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {active.map((t) => (
            <ThreadListRow key={t.id} thread={t} channelId={channelId} />
          ))}
        </div>
      ) : null}
      {archived.length > 0 ? (
        <button
          type="button"
          onClick={() => setArchivedOpen((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            width: "100%",
            border: "none",
            background: "transparent",
            padding: "3px 8px",
            fontSize: 11,
            color: palette.caption,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              color: palette.muted,
              transition: "transform 120ms ease",
              transform: archivedOpen ? "rotate(90deg)" : undefined,
            }}
          >
            <IconChevronRightOutline14 />
          </span>
          已归档讨论（{archived.length}）
        </button>
      ) : null}
      {archivedOpen && archived.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {archived.map((t) => (
            <ThreadListRow key={t.id} thread={t} channelId={channelId} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------- 话题（forum）板：选中话题频道时的主面板 ----------------

/** 单个话题行（帖子式：标题 + 发起人/活跃时间/回复数），点击进入话题内聊天 */
function ForumTopicRow({
  thread,
  channelId,
  archivedView,
}: {
  thread: ThreadSummary;
  channelId: string;
  archivedView: boolean;
}): ReactElement {
  const unread = thread.unreadCount;
  const mention = thread.unreadMentions;
  const author = thread.creatorDisplayName ?? thread.creatorHandle;
  const replies = thread.messageCount;
  return (
    <button
      type="button"
      onClick={() => void openThread({ id: thread.id, channelId })}
      title={thread.name}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        border: "none",
        borderBottom: `1px solid ${palette.border}`,
        background: "transparent",
        padding: "9px 4px",
        color: palette.text,
        cursor: "pointer",
        textAlign: "left",
        transition: "background 120ms ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = palette.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 10,
          background: palette.inputBg,
          border: `1px solid ${palette.border}`,
          color: archivedView ? palette.muted : palette.accent,
          flex: "0 0 auto",
        }}
      >
        <IconBranchOutline16 />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            fontSize: 13.5,
            fontWeight: 650,
            color: archivedView ? palette.muted : palette.text,
          }}
        >
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {thread.name}
          </span>
          {archivedView ? (
            <span
              style={{
                flex: "0 0 auto",
                fontSize: 10,
                fontWeight: 600,
                color: palette.muted,
                border: `1px solid ${palette.border}`,
                borderRadius: 999,
                padding: "0 6px",
                lineHeight: "16px",
              }}
            >
              已归档
            </span>
          ) : null}
        </span>
        <span style={{ ...smallText, fontSize: 11.5, color: palette.caption }}>
          {author} 发起
          {thread.starterSnippet ? (
            <>
              {" · "}
              <span style={{ color: palette.muted }}>{thread.starterSnippet}</span>
            </>
          ) : null}
          {" · "}
          {replies} 条回复 · {timeLabel(thread.lastActivityAt)}
        </span>
      </span>
      {unread > 0 ? (
        <span
          style={{
            flex: "0 0 auto",
            minWidth: 17,
            height: 17,
            padding: "0 5px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: "17px",
            textAlign: "center",
            color: "#fff",
            background: mention > 0 ? palette.accent : palette.badge,
          }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}

/** 话题频道主面板：活跃话题列表 + 已归档折叠 + 空状态引导；点行进入话题详情交流 */
function ForumTopicBoard({
  channelId,
  onNewTopic,
}: {
  channelId: string;
  onNewTopic: () => void;
}): ReactElement | null {
  const talk = useTalkState();
  const [archivedOpen, setArchivedOpen] = useState(false);
  const channel = talk.view.community?.channels.find((c) => c.id === channelId) ?? null;
  if (channel?.kind !== "forum") return null;
  const canPost = (talk.view.community?.myRole ?? null) !== null;
  const all = (talk.view.community?.threads ?? []).filter((t) => t.channelId === channelId);
  const byRecent = (a: ThreadSummary, b: ThreadSummary): number =>
    b.lastActivityAt - a.lastActivityAt;
  const active = all.filter((t) => t.status === "active").sort(byRecent);
  const archived = all.filter((t) => t.status === "archived").sort(byRecent);

  if (active.length === 0 && archived.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={emptyMsg}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 14,
              color: palette.accent,
              background: palette.inputBg,
              border: `1px solid ${palette.border}`,
            }}
          >
            <ForumGlyph />
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>这里还没有话题</span>
          <span style={{ fontSize: 12, lineHeight: 1.6 }}>
            话题频道的聊天都放进一条条话题里：发一个新话题，
            <br />
            大家点进去围绕它交流；24 小时无人回复会自动归档。
          </span>
          {canPost ? (
            <Button
              variant="primary"
              size="sm"
              icon={<IconBranchOutline16 />}
              onClick={onNewTopic}
              style={{ marginTop: 4 }}
            >
              创建第一个话题
            </Button>
          ) : null}
          {!canPost ? <span style={{ fontSize: 12 }}>成员可自由发布话题。</span> : null}
        </div>
      </div>
    );
  }

  const metaBar: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "4px 4px 8px",
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 14px" }}>
      <div style={metaBar}>
        <span style={{ ...smallText, fontSize: 11.5, color: palette.caption }}>
          {active.length + archived.length} 条话题 · 点进话题查看与回复
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Button
            size="sm"
            variant="ghost"
            icon={<IconRefreshOutline16 />}
            onClick={() => void reloadCommunityDetail()}
            aria-label="刷新话题"
            title="刷新话题列表（含最新回复与未读）"
          />
          {canPost ? (
            <Button size="sm" variant="ghost" icon={<IconPlusOutline16 />} onClick={onNewTopic}>
              新建话题
            </Button>
          ) : null}
        </span>
      </div>
      <div>
        {active.map((t) => (
          <ForumTopicRow key={t.id} thread={t} channelId={channelId} archivedView={false} />
        ))}
      </div>
      {archived.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setArchivedOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 8,
              border: "none",
              background: "transparent",
              padding: "4px 2px",
              fontSize: 11.5,
              fontWeight: 600,
              color: palette.caption,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                color: palette.muted,
                transition: "transform 120ms ease",
                transform: archivedOpen ? "rotate(90deg)" : undefined,
              }}
            >
              <IconChevronRightOutline14 />
            </span>
            已归档话题（{archived.length}）
          </button>
          {archivedOpen ? (
            <div>
              {archived.map((t) => (
                <ForumTopicRow key={t.id} thread={t} channelId={channelId} archivedView={true} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
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

/** 回复（引用）小图标：拐角返回箭头，随按钮颜色 */
function ReplyGlyph(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5V19" />
    </svg>
  );
}

function MessageRow({
  item,
  onCreateThread,
}: {
  item: MessageItem;
  onCreateThread?: (item: MessageItem) => void;
}): ReactElement {
  const talk = useTalkState();
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(item.content);
  const mine = talk.me !== null && item.authorId === talk.me.id;
  const mentionedMe = (item.mentions ?? []).includes(talk.me?.id ?? "");
  const focused = talk.view.focusMessageId === item.id;
  const allowEdit = canEditMessage(item);
  const allowRetract = canRetractMessage(item);
  const quote = item.replyTo ? replyParts(item) : null;
  // 公告频道只读成员不能回复（也没有输入框）
  const channelOf = talk.view.community?.channels.find((c) => c.id === item.channelId);
  const roleOf = talk.view.community?.myRole;
  const canReplyHere =
    channelOf?.kind !== "announcement" || roleOf === "owner" || roleOf === "admin";
  // 只能从文字频道主频道的直接消息开临时讨论（讨论组/话题内的消息不能再套娃）
  const canThreadHere = item.threadId === null && roleOf !== null && channelOf?.kind === "text";

  async function saveEdit(): Promise<void> {
    try {
      await updateMessage(item.id, draftText);
      setEditing(false);
    } catch {
      // 错误已 toast
    }
  }

  /** 撤回（自己的消息，2 分钟内）或删除（owner/admin） */
  async function remove(): Promise<void> {
    const confirmed = window.confirm(
      mine ? "撤回这条消息？2 分钟内可撤回，超过 2 分钟只能编辑。" : "删除这条消息？",
    );
    if (!confirmed) return;
    try {
      await deleteMessage(item.id);
    } catch {
      // 错误已 toast（例如已超过 2 分钟撤回窗口）
    }
  }

  async function jumpQuote(): Promise<void> {
    const target = item.replyTo;
    if (!target) return;
    const ok = await revealMessage(item.channelId, target.id, target.threadId ?? null);
    if (!ok) notify("被引用的消息较旧，未能定位");
  }

  return (
    <div
      className={`dsht-msg-row${mentionedMe ? " is-mentioned" : ""}${focused ? " is-focus" : ""}`}
      data-msg-id={item.id}
      style={msgRow}
    >
      <Avatar label={item.author.handle} src={item.author.avatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {quote ? (
          <button
            type="button"
            onClick={() => void jumpQuote()}
            title={`跳转到 ${quote.author} 的消息`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              maxWidth: "100%",
              border: "none",
              background: "transparent",
              padding: "1px 0",
              margin: "0 0 2px",
              cursor: "pointer",
              color: palette.caption,
              fontSize: 11.5,
              textAlign: "left",
              overflow: "hidden",
            }}
          >
            <span style={{ color: palette.accent, display: "inline-flex", flex: "0 0 auto" }}>
              <ReplyGlyph />
            </span>
            <span
              style={{
                flex: "0 0 auto",
                fontWeight: 600,
                color: palette.accent,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 150,
              }}
            >
              {quote.author}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {quote.content}
            </span>
          </button>
        ) : null}
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
      <span className={`dsht-msg-actions${editing ? " is-open" : ""}`} style={msgChip}>
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
            {canReplyHere ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<ReplyGlyph />}
                onClick={() => replyToMessage(item)}
                aria-label="回复"
                title="回复这条消息"
              />
            ) : null}
            {canThreadHere && onCreateThread ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconBranchOutline16 />}
                onClick={() => onCreateThread(item)}
                aria-label="创建讨论组"
                title="以此为话题创建讨论组"
              />
            ) : null}
            {allowEdit ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconEditOutline16 />}
                onClick={() => setEditing(true)}
                aria-label="编辑"
                title="编辑消息"
              />
            ) : null}
            {allowRetract ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconTrashOutline16 />}
                onClick={() => void remove()}
                aria-label={mine ? "撤回" : "删除"}
                title={mine ? "撤回消息（2 分钟内）" : "删除消息"}
              />
            ) : null}
          </>
        )}
      </span>
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
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineMembers, setOnlineMembers] = useState<ChannelOnlineMember[]>([]);
  // 输入框 / @ 提及自动补全 / 消息搜索
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartRef = useRef(-1);
  // 创建讨论组弹窗（空白 / 从消息发起）
  const [threadCreateOpen, setThreadCreateOpen] = useState(false);
  const [threadSeed, setThreadSeed] = useState<{ name: string; starterMessageId?: string } | null>(
    null,
  );

  const threadId = talk.view.threadId;
  const roomKey = threadId ?? channelId;
  const draft = roomKey ? (talk.view.drafts[roomKey] ?? "") : "";
  const currentThread =
    channelId && threadId
      ? (talk.view.community?.threads.find((t) => t.id === threadId) ?? null)
      : null;
  const isThread = currentThread !== null;
  const isForumChannel = (channel?.kind ?? "text") === "forum";
  /** 话题频道的主面板 = 话题板（列表）；打开某条话题后才是聊天视图 */
  const isForumBoard = isForumChannel && !isThread;

  /** 与 @mentionQuery 匹配的候选成员（不含自己，最多 8 个） */
  const mentionCandidates: MemberLite[] = mentionActive
    ? talk.view.members
        .filter((m) => m.userId !== talk.me?.id)
        .filter((m) => m.handle.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 8)
    : [];

  /** 回复目标（composer 提示条）展示信息 */
  const replyingPreview = talk.view.replyingTo
    ? replyParts({ replyTo: talk.view.replyingTo })
    : null;

  // 公告频道仅 owner/admin 可发；其余频道所有成员可发
  const myRole = community?.myRole ?? null;
  const canPost = channel?.kind !== "announcement" || myRole === "owner" || myRole === "admin";

  /** 在主频道头部开一个空白讨论组 */
  function openBlankThread(): void {
    setThreadSeed(null);
    setThreadCreateOpen(true);
  }

  /** 从某条消息发起讨论组（自动用消息摘要取名） */
  function openThreadFromMessage(item: MessageItem): void {
    const raw = item.content.replace(/\s+/g, " ").trim();
    const name = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw || "话题讨论";
    setThreadSeed({ name, starterMessageId: item.id });
    setThreadCreateOpen(true);
  }

  /** 归档 / 恢复当前讨论组 */
  async function toggleThreadArchive(): Promise<void> {
    if (!currentThread) return;
    await setThreadArchived(currentThread.id, currentThread.status === "active");
  }

  function onScroll(event: UIEvent<HTMLDivElement>): void {
    const el = event.currentTarget;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // 切房间（主频道/讨论组）→ 置底；消息增多且贴底 → 跟随
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const switched = channelRef.current !== roomKey;
    channelRef.current = roomKey;
    if (switched) {
      lastCountRef.current = messageCount;
      el.scrollTop = el.scrollHeight;
      pinnedRef.current = true;
      return;
    }
    const grew = messageCount > lastCountRef.current;
    lastCountRef.current = messageCount;
    if (grew && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [roomKey, messageCount]);

  // 切房间：收起 @ 补全弹层与回复提示
  // biome-ignore lint/correctness/useExhaustiveDependencies: 需要在切换房间时重置弹层
  useEffect(() => {
    setMentionActive(false);
    setMentionQuery("");
    setMentionIndex(0);
    mentionStartRef.current = -1;
  }, [roomKey]);

  // 选中「回复」后自动聚焦输入框
  useEffect(() => {
    if (talk.view.replyingTo) composerRef.current?.focus();
  }, [talk.view.replyingTo]);

  // 定位高亮：滚动到目标消息并在 1.8s 后清除标记
  useEffect(() => {
    const targetId = talk.view.focusMessageId;
    if (!targetId) return;
    const el = scrollRef.current?.querySelector<HTMLElement>(`[data-msg-id="${targetId}"]`);
    if (el) {
      pinnedRef.current = false;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
    const timer = window.setTimeout(() => clearMessageFocus(), 1800);
    return () => window.clearTimeout(timer);
  }, [talk.view.focusMessageId]);

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

  /** 光标前是否存在正在输入的 `@handle`，返回 token 起点与已输入部分 */
  function mentionAtCaret(text: string, caret: number): { start: number; query: string } | null {
    if (caret < 1) return null;
    let i = caret - 1;
    while (i >= 0 && /[\p{L}\p{N}_]/u.test(text.charAt(i))) i -= 1;
    if (i < 0 || text.charAt(i) !== "@") return null;
    if (i > 0 && /[\p{L}\p{N}_]/u.test(text.charAt(i - 1))) return null;
    return { start: i, query: text.slice(i + 1, caret) };
  }

  /** 把选中的成员插入正文，替换掉当前 @token */
  function acceptMention(member: MemberLite): void {
    const text = draft;
    const caret = composerRef.current?.selectionStart ?? text.length;
    const start =
      mentionStartRef.current >= 0
        ? mentionStartRef.current
        : Math.max(0, caret - mentionQuery.length - 1);
    const next = `${text.slice(0, start)}@${member.handle} ${text.slice(caret)}`;
    setDraft(next);
    setMentionActive(false);
    setMentionQuery("");
    mentionStartRef.current = -1;
    const caretAfter = start + member.handle.length + 2;
    const el = composerRef.current;
    if (el) {
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(caretAfter, caretAfter);
      });
    }
  }

  function handleComposerChange(value: string): void {
    setDraft(value);
    const caret = composerRef.current?.selectionStart ?? value.length;
    const hit = mentionAtCaret(value, caret);
    if (hit) {
      mentionStartRef.current = hit.start;
      setMentionQuery(hit.query);
      setMentionIndex(0);
      setMentionActive(true);
    } else {
      mentionStartRef.current = -1;
      setMentionActive(false);
    }
  }

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    const choosing = mentionActive && mentionCandidates.length > 0;
    if (choosing && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const delta = e.key === "ArrowDown" ? 1 : -1;
      setMentionIndex((i) => (i + delta + mentionCandidates.length) % mentionCandidates.length);
      return;
    }
    if (choosing && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault();
      const pick = mentionCandidates[mentionIndex];
      if (pick) acceptMention(pick);
      return;
    }
    if (mentionActive && e.key === "Escape") {
      e.preventDefault();
      setMentionActive(false);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  async function submit(): Promise<void> {
    const text = draft;
    if (text.trim().length === 0 && pendingFiles.length === 0) return;
    const ok = await sendMessage(text, pendingFiles);
    if (ok) {
      setDraft("");
      setPendingFiles([]);
      setMentionActive(false);
      mentionStartRef.current = -1;
      composerRef.current?.focus();
    }
  }

  async function openOnline(): Promise<void> {
    setOnlineOpen(true);
    setOnlineLoading(true);
    const list = await fetchChannelOnline();
    setOnlineMembers(list);
    setOnlineLoading(false);
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
          {isThread && currentThread ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<IconChevronLeftOutline14 />}
              onClick={() => void closeThread()}
              aria-label={isForumChannel ? "返回话题列表" : "返回主频道"}
              title={isForumChannel ? "返回话题列表" : `返回 #${channel?.name ?? ""}`}
            />
          ) : null}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 22,
              borderRadius: 6,
              background: palette.inputBg,
              border: `1px solid ${palette.border}`,
              flex: "0 0 auto",
            }}
          >
            {isThread ? <IconBranchOutline16 /> : <ChannelGlyph kind={channel?.kind ?? "text"} />}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isThread
                ? (currentThread?.name ?? (isForumChannel ? "话题" : "讨论组"))
                : (channel?.name ?? "")}
            </div>
            {isThread ? (
              <div style={{ ...smallText, fontSize: 11, color: palette.caption }}>
                {isForumChannel ? "话题" : "讨论组"}
                {currentThread?.status === "archived" ? "（已归档）" : ""} · 位于 #
                {channel?.name ?? ""}
              </div>
            ) : channel?.topic ? (
              <div
                style={{
                  ...smallText,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {channel.topic}
              </div>
            ) : null}
          </div>
          {isThread ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void toggleThreadArchive()}
              aria-label={currentThread?.status === "active" ? "归档" : "恢复"}
              title={
                isForumChannel
                  ? currentThread?.status === "active"
                    ? "归档话题（24h 无人回复也会自动归档）"
                    : "把话题恢复为活跃"
                  : currentThread?.status === "active"
                    ? "手动归档（24h 无人发言也会自动归档）"
                    : "把讨论组恢复为活跃"
              }
            >
              {currentThread?.status === "active" ? "归档" : "恢复"}
            </Button>
          ) : null}
          {!isThread && canPost && channel?.kind !== "announcement" ? (
            isForumChannel ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconBranchOutline16 />}
                onClick={openBlankThread}
              >
                新建话题
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconBranchOutline16 />}
                onClick={openBlankThread}
                aria-label="创建讨论组"
                title="为当前频道开一个讨论组"
              />
            )
          ) : null}
          {!isThread && !isForumBoard ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<IconShareOutline16 />}
              onClick={() => setShareOpen(true)}
              aria-label="分享会话快照"
              title="把本频道消息打成可分享的快照"
            />
          ) : null}
          {!isThread ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<IconSearchOutline16 />}
              onClick={() => setSearchOpen(true)}
              aria-label="搜索消息"
              title="搜索社区内的消息"
            />
          ) : null}
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              flex: "0 0 auto",
            }}
          >
            {talk.view.live && !isThread ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconUserOutline16 />}
                onClick={() => void openOnline()}
                aria-label="在线成员"
                title="当前房间在线成员"
              >
                {talk.view.onlineCount}
              </Button>
            ) : null}
            <span
              style={{
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
          </span>
        </div>

        {isForumBoard ? (
          <ForumTopicBoard channelId={channelId} onNewTopic={openBlankThread} />
        ) : (
          <>
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
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      fontSize: 19,
                      fontWeight: 700,
                      color: channel?.kind === "announcement" ? "#fff" : palette.accent,
                      background:
                        channel?.kind === "announcement"
                          ? "var(--dsw-alias-state-warn-primary)"
                          : palette.inputBg,
                      border: channel?.kind === "text" ? `1px solid ${palette.border}` : "none",
                    }}
                  >
                    {channel?.kind === "announcement" ? "!" : "#"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>
                    {channel?.kind === "announcement" ? "暂无公告" : "还没有消息"}
                  </span>
                  <span style={{ fontSize: 12 }}>
                    {channel?.kind === "announcement"
                      ? canPost
                        ? "在这里发布面向全员的公告。"
                        : "公告由所有者/管理员发布。"
                      : "来说第一句吧。"}
                  </span>
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
                    <MessageRow key={item.id} item={item} onCreateThread={openThreadFromMessage} />
                  ))}
                </>
              )}
            </div>

            <div style={composerWrap}>
              {canPost ? (
                <>
                  <Button
                    size="md"
                    variant="ghost"
                    icon={<IconPaperclipOutline16 />}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={talk.view.sending}
                    aria-label="添加附件"
                    title="添加附件"
                  />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      minWidth: 0,
                    }}
                  >
                    {replyingPreview ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          background: palette.inputBg,
                          border: `1px solid ${palette.border}`,
                          borderRadius: 8,
                          padding: "2px 4px 2px 8px",
                        }}
                      >
                        <span style={{ color: palette.accent, display: "inline-flex" }}>
                          <ReplyGlyph />
                        </span>
                        <span
                          style={{
                            flex: 1,
                            minWidth: 0,
                            fontSize: 11.5,
                            color: palette.secondary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          正在回复{" "}
                          <span style={{ fontWeight: 600, color: palette.text }}>
                            @{replyingPreview.author}
                          </span>
                          {replyingPreview.content ? (
                            <span>：{replyingPreview.content}</span>
                          ) : null}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<IconCloseOutline16 />}
                          onClick={() => {
                            cancelReply();
                            composerRef.current?.focus();
                          }}
                          aria-label="取消回复"
                        />
                      </div>
                    ) : null}
                    {pendingFiles.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {pendingFiles.map((f, i) => (
                          <span
                            key={`${f.name}-${f.size}-${f.lastModified}-${f.type}`}
                            style={pendingChip}
                          >
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
                    {mentionActive ? (
                      <div
                        style={{
                          background: palette.elevated,
                          border: `1px solid ${palette.border}`,
                          borderRadius: 10,
                          padding: 4,
                          maxHeight: 220,
                          overflowY: "auto",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.14)",
                        }}
                      >
                        {talk.view.membersLoading ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: palette.muted,
                              padding: "8px 10px",
                              textAlign: "center",
                            }}
                          >
                            加载成员…
                          </div>
                        ) : mentionCandidates.length === 0 ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: palette.muted,
                              padding: "8px 10px",
                              textAlign: "center",
                            }}
                          >
                            {mentionQuery.length > 0
                              ? `没有匹配「${mentionQuery}」的成员`
                              : "还没有成员"}
                          </div>
                        ) : (
                          mentionCandidates.map((member, i) => (
                            <button
                              key={member.userId}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => acceptMention(member)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                border: "none",
                                background: i === mentionIndex ? palette.hover : "transparent",
                                borderRadius: 8,
                                padding: "5px 8px",
                                cursor: "pointer",
                                textAlign: "left",
                              }}
                            >
                              <Avatar label={member.handle} src={member.avatarUrl} size={18} />
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: palette.text,
                                  flex: "0 0 auto",
                                }}
                              >
                                {member.displayName ?? member.handle}
                              </span>
                              <span style={{ fontSize: 12, color: palette.caption }}>
                                @{member.handle}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                    <textarea
                      ref={composerRef}
                      value={draft}
                      onChange={(e) => handleComposerChange(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={
                        isThread && currentThread
                          ? `在「${currentThread.name}」里发消息…`
                          : `在 #${channel?.name ?? ""} 发消息…`
                      }
                      style={textArea}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    icon={<IconSendOutline16 />}
                    disabled={
                      talk.view.sending || (draft.trim().length === 0 && pendingFiles.length === 0)
                    }
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
                </>
              ) : (
                <span
                  style={{
                    ...smallText,
                    fontSize: 12,
                    flex: 1,
                    textAlign: "center",
                    padding: "10px 0",
                  }}
                >
                  公告频道仅所有者/管理员可发布，普通成员只读。
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <ShareSnapshotModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        channelName={channel?.name ?? ""}
      />
      <ThreadCreateModal
        open={threadCreateOpen}
        onClose={() => setThreadCreateOpen(false)}
        channelId={channelId}
        seed={threadSeed}
      />
      <SearchMessagesModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <OnlineMembersModal
        open={onlineOpen}
        onClose={() => setOnlineOpen(false)}
        loading={onlineLoading}
        members={onlineMembers}
      />
    </>
  );
}

// ---------------- 弹窗：创建讨论组 ----------------

function ThreadCreateModal({
  open,
  onClose,
  channelId,
  seed,
}: {
  open: boolean;
  onClose: () => void;
  channelId: string | null;
  seed: { name: string; starterMessageId?: string } | null;
}): ReactElement | null {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const talk = useTalkState();

  // 每次打开按来源预填标题
  useEffect(() => {
    if (open) setName(seed?.name ?? "");
  }, [open, seed]);

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (!channelId || trimmed.length === 0 || busy) return;
    setBusy(true);
    const ok = await createThreadInChannel(
      channelId,
      seed?.starterMessageId
        ? { name: trimmed, starterMessageId: seed.starterMessageId }
        : { name: trimmed },
    );
    setBusy(false);
    if (ok) onClose();
  }

  const starterNote = seed?.starterMessageId
    ? "以这条消息为起点：讨论组会单独成串，原消息保留在主频道。"
    : null;
  const threadable = channelId
    ? (talk.view.community?.channels.find((c) => c.id === channelId)?.kind ?? "text")
    : "text";
  const forumMode = threadable === "forum";
  if (!open || !channelId || threadable === "announcement") return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={forumMode ? "创建话题" : "创建讨论组"}
      closeLabel="关闭"
      description={
        forumMode
          ? "发一条新话题，它会列在本频道的话题列表里；大家点进去围绕它交流，24 小时无人回复会自动归档。"
          : "为某个话题开一个独立、集中的小空间，发言后它列在频道下的「讨论」里。"
      }
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
            {busy ? "创建中…" : forumMode ? "创建话题" : "创建讨论组"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={fieldBlock}>
          <label htmlFor="talk-thread-name" style={fieldLabel}>
            {forumMode ? "话题标题" : "讨论组名称"}
          </label>
          <Input
            id="talk-thread-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={forumMode ? "例如：如何快速导出聊天记录？" : "例如：周末活动安排"}
          />
        </div>
        {starterNote ? (
          <div style={{ ...smallText, fontSize: 12, lineHeight: 1.6 }}>{starterNote}</div>
        ) : null}
        <div style={{ ...smallText, fontSize: 12, lineHeight: 1.6 }}>
          24
          小时内没人发言会自动归档（从频道列表收起，可在「已归档」里恢复）；再有人发言会自动回到活跃区。
        </div>
      </div>
    </Modal>
  );
}

// ---------------- 弹窗：消息搜索 ----------------

/** 高亮命中关键词（不区分大小写） */
function highlightMatch(text: string, keyword: string): ReactNode {
  const kw = keyword.trim().toLowerCase();
  if (kw.length === 0) return text;
  const lower = text.toLowerCase();
  const nodes: ReactNode[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const at = lower.indexOf(kw, cursor);
    if (at < 0) {
      nodes.push(text.slice(cursor));
      break;
    }
    if (at > cursor) nodes.push(text.slice(cursor, at));
    nodes.push(
      <span
        key={`${at}-${kw}`}
        style={{ background: "rgba(91,140,255,0.22)", borderRadius: 3, padding: "0 1px" }}
      >
        {text.slice(at, at + kw.length)}
      </span>,
    );
    cursor = at + kw.length;
  }
  return <>{nodes}</>;
}

/** 消息搜索弹窗：社区内按正文关键词搜索，命中可一键跳到对应频道定位 */
function SearchMessagesModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  const [items, setItems] = useState<SearchMessageResult[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // 每次打开重置搜索状态
  useEffect(() => {
    if (open) {
      setQ("");
      setItems([]);
      setNextCursor(null);
      setRan(false);
      setBusy(false);
      setLoadingMore(false);
    }
  }, [open]);

  async function run(append: boolean): Promise<void> {
    const keyword = q.trim();
    if (keyword.length === 0) return;
    if (append) {
      if (loadingMore || nextCursor === null) return;
      setLoadingMore(true);
    } else {
      if (busy) return;
      setBusy(true);
      setRan(true);
    }
    const cursorArg = append && nextCursor ? nextCursor : undefined;
    const page = await searchCommunityMessages(keyword, cursorArg);
    if (page) {
      setItems((prev) => (append ? [...prev, ...page.items] : page.items));
      setNextCursor(page.nextCursor);
    }
    setBusy(false);
    setLoadingMore(false);
  }

  async function openHit(hit: SearchMessageResult): Promise<void> {
    const ok = await revealMessage(hit.channelId, hit.id, hit.thread?.id ?? null);
    if (ok) onClose();
    else notify("该消息较旧，未能定位（可去对应频道向上加载更早消息）");
  }

  const keyword = q.trim();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="搜索消息"
      closeLabel="关闭"
      description="按正文关键词搜索本社区消息，命中结果可一键跳转定位。"
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 340, minHeight: 160 }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void run(false);
              }
            }}
            placeholder="搜索关键词"
          />
          <Button
            variant="primary"
            disabled={busy || keyword.length === 0}
            onClick={() => void run(false)}
          >
            {busy ? "搜索中…" : "搜索"}
          </Button>
        </div>
        {ran && !busy && items.length === 0 ? (
          <div style={{ ...emptyMsg, padding: "26px 8px" }}>没有匹配「{keyword}」的消息</div>
        ) : !ran && items.length === 0 ? (
          <div style={{ ...emptyMsg, padding: "26px 8px" }}>
            输入关键词搜索整个社区，点击结果可跳到对应频道定位。
          </div>
        ) : null}
        {items.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 330,
              overflowY: "auto",
            }}
          >
            {items.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => void openHit(hit)}
                style={{
                  display: "block",
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  borderRadius: 10,
                  padding: "7px 10px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = palette.hover;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ChannelGlyph kind={hit.channel.kind} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: palette.text }}>
                    {hit.channel.name}
                  </span>
                  <span style={{ ...smallText, fontSize: 11 }}>{timeLabel(hit.createdAt)}</span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: 12,
                      color: palette.caption,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {hit.author.displayName ?? hit.author.handle}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 3,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: palette.secondary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {highlightMatch(
                    hit.content.length > 180 ? `${hit.content.slice(0, 180)}…` : hit.content,
                    keyword,
                  )}
                </div>
              </button>
            ))}
            {nextCursor ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void run(true)}
                disabled={loadingMore}
              >
                {loadingMore ? "加载中…" : "加载更多"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

// ---------------- 弹窗：在线成员 ----------------

const presenceColor: Record<ChannelOnlineMember["presence"], string> = {
  online: palette.success,
  away: palette.warn,
  offline: palette.muted,
};

const presenceLabel: Record<ChannelOnlineMember["presence"], string> = {
  online: "在线",
  away: "离开",
  offline: "离线",
};

/** 当前频道在线成员弹窗：读频道 DO 的 presence 快照（仅统计保持连接的会话） */
function OnlineMembersModal({
  open,
  onClose,
  loading,
  members,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  members: ChannelOnlineMember[];
}): ReactElement {
  const rank: Record<ChannelOnlineMember["presence"], number> = { online: 0, away: 1, offline: 2 };
  const sorted = [...members].sort(
    (a, b) => rank[a.presence] - rank[b.presence] || a.handle.localeCompare(b.handle),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="在线成员"
      closeLabel="关闭"
      description="本频道当前保持连接的成员（关闭面板即下线）。"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 300 }}>
        {loading ? (
          <div style={{ ...smallText, padding: "14px 4px" }}>加载中…</div>
        ) : sorted.length === 0 ? (
          <div style={{ ...smallText, padding: "16px 4px", textAlign: "center" }}>
            暂无成员在线。
          </div>
        ) : (
          sorted.map((m) => (
            <div
              key={m.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 10,
                background: palette.inputBg,
                border: `1px solid ${palette.border}`,
              }}
            >
              <Avatar label={m.handle} src={m.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.displayName ?? m.handle}
                </div>
                <div style={{ ...smallText, fontSize: 11 }}>@{m.handle}</div>
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{ ...liveDot, background: presenceColor[m.presence], flex: "0 0 auto" }}
                />
                <span style={{ fontSize: 11.5, color: palette.secondary }}>
                  {presenceLabel[m.presence]}
                </span>
              </span>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

// ---------------- 弹窗：加入 / 创建（合并单入口，顶部 tab 切换） ----------------

/** 「加入 / 创建」合并为一个弹窗：顶部 tab 切换，默认「加入」 */
function CommunityAddModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const [tab, setTab] = useState<"join" | "create">("join");
  // 加入：邀请码
  const [code, setCode] = useState("");
  // 创建：名称 / 简介 / 可见性 / 头像
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 每次打开：重置表单，默认落在「加入」
  useEffect(() => {
    if (open) {
      setTab("join");
      setCode("");
      setName("");
      setDescription("");
      setPrivacy("public");
      setIconUrl(null);
    }
  }, [open]);

  async function pickIcon(file: File): Promise<void> {
    const url = await uploadImage(file);
    if (url) setIconUrl(url);
  }

  async function submit(): Promise<void> {
    if (busy) return;
    if (tab === "join") {
      if (code.trim().length === 0) return;
      setBusy(true);
      const ok = await joinCommunityByCode(code);
      setBusy(false);
      if (ok) {
        setCode("");
        onClose();
      }
      return;
    }
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

  const creating = tab === "create";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? "创建社区" : "加入社区"}
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || (creating ? name.trim().length === 0 : code.trim().length === 0)}
            onClick={() => void submit()}
          >
            {busy ? (creating ? "创建中…" : "加入中…") : creating ? "创建" : "加入"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* tab 顶栏：加入（默认）/ 创建 */}
        <div style={pillGroup}>
          <button
            type="button"
            style={{ ...pillKey, ...(tab === "join" ? pillKeyActive : {}) }}
            onClick={() => setTab("join")}
          >
            加入
          </button>
          <button
            type="button"
            style={{ ...pillKey, ...(tab === "create" ? pillKeyActive : {}) }}
            onClick={() => setTab("create")}
          >
            创建
          </button>
        </div>
        {creating ? (
          <>
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
          </>
        ) : (
          <div style={fieldBlock}>
            <label htmlFor="talk-join-code" style={fieldLabel}>
              邀请码
            </label>
            <Input
              id="talk-join-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder="邀请码，如 ABCD1234"
            />
          </div>
        )}
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
  const [showAdd, setShowAdd] = useState(false);
  const [showUsername, setShowUsername] = useState(false);
  const inCommunity = talk.view.communityId !== null;

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
      <style>{messageRowCss}</style>
      <CommunitiesRail
        onAdd={() => setShowAdd(true)}
        onInbox={() => void openInbox()}
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
              点左栏「＋」用邀请码加入，或创建一个新社区。
            </span>
          </div>
        </div>
      )}
      <CommunityAddModal open={showAdd} onClose={() => setShowAdd(false)} />
      <UpdateUsernameModal open={showUsername} onClose={() => setShowUsername(false)} />
      <InboxDialog />
    </div>
  );
}
