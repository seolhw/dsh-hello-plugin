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
import type {
  ChannelOnlineMember,
  GetShareResponse,
  SearchMessageResult,
  ThreadMemberItem,
  ThreadSummary,
  UpdateThreadRequest,
} from "@dsh-talk/types/api";
import type {
  Channel,
  Community,
  MemberRole,
  MessageAttachment,
  ThreadVisibility,
  User,
} from "@dsh-talk/types/entities";
import { orderBy, partition } from "es-toolkit/array";
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
  addThreadMember,
  backToCommunities,
  cancelReply,
  canEditMessage,
  canRetractMessage,
  clearMessageFocus,
  cloneShareToSession,
  closeThread,
  createCommunity,
  createThreadInChannel,
  deleteMessage,
  discoverCommunities,
  fetchChannelOnline,
  getCurrentDshSession,
  getShareInfo,
  joinCommunityByCode,
  joinPublicCommunity,
  joinThreadWithPasscode,
  listShareableSessions,
  listThreadCandidates,
  listThreadMembers,
  loadOlderMessages,
  logout,
  type MemberLite,
  type MessageItem,
  notify,
  openCommunity,
  openInbox,
  openThread,
  reloadCommunityDetail,
  removeThreadMember,
  removeUserAvatar,
  replyToMessage,
  revealMessage,
  searchCommunityMessages,
  selectChannel,
  sendMessage,
  setThreadArchived,
  shareDownloadUrl,
  shareLocalSession,
  type ShareSessionRow,
  updateMessage,
  updateThread,
  updateUserAvatar,
  updateUserName,
  uploadImage,
  useTalkState,
} from "../store";
import { BellGlyph, InboxDialog } from "./Inbox";
import { ChannelRowMenu, CommunityTools, CreateChannelButton } from "./Manage";
import {
  Avatar,
  AvatarPicker,
  BrandLogo,
  fieldBlock,
  fieldLabel,
  listCard,
  listCardName,
  palette,
  pillGroup,
  pillStyle,
  smallText,
  timeLabel,
} from "./styles";

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

/** 私密讨论组角标（图标库无锁图标，用 emoji + 文字标注） */
const privacyBadge: CSSProperties = {
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

// ---------- 弹窗表单样式 ----------

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
        <Avatar color="#fff" label={community.name} src={community.iconUrl} size={32} inset={3} />
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
      <BrandLogo size={34} title="dsh-talk 社区" />
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
          aria-label="加入、发现或创建社区"
          title="加入、发现或创建社区"
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
                    <Avatar color="#fff" label={c.name} src={c.iconUrl} size={44} inset={4} />
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
          <HoverCard
            openDelayMs={150}
            content={
              <div style={{ display: "flex", flexDirection: "column", gap: 8, width: 168 }}>
                <span style={{ fontSize: 12.5, color: palette.text }}>确定要退出登录吗？</span>
                <Button size="sm" variant="primary" onClick={() => void logout()}>
                  退出登录
                </Button>
              </div>
            }
            anchor={
              <button type="button" style={railAction} aria-label="退出登录" title="退出登录">
                <IconRightUpOutline16 />
              </button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

// ---------------- 频道列表 ----------------

function ChannelList({
  onCreateThread,
}: {
  onCreateThread: (channelId: string) => void;
}): ReactElement | null {
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
                  <span style={{ display: "inline-flex", flex: "0 0 auto", color: palette.muted }}>
                    #
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
                <ChannelRowMenu channel={ch} onCreateThread={onCreateThread} />
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

/** 单个讨论组的列表行（含未读角标与私密标识），点击进入该讨论 */
function ThreadListRow({ thread, channelId }: { thread: ThreadSummary; channelId: string }) {
  const talk = useTalkState();
  const [joinOpen, setJoinOpen] = useState(false);
  const opened = talk.view.threadId === thread.id;
  const unread = thread.unreadCount;
  const mention = thread.unreadMentions;
  const isPrivate = thread.visibility === "private";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (thread.locked) setJoinOpen(true);
          else void openThread({ id: thread.id, channelId });
        }}
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
        {isPrivate ? <span style={privacyBadge}>{thread.locked ? "🔒 私密" : "私密"}</span> : null}
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
      <ThreadJoinModal open={joinOpen} onClose={() => setJoinOpen(false)} thread={thread} />
    </>
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
  const [joinOpen, setJoinOpen] = useState(false);
  const unread = thread.unreadCount;
  const mention = thread.unreadMentions;
  const author = thread.creatorDisplayName ?? thread.creatorHandle;
  const replies = thread.messageCount;
  const isPrivate = thread.visibility === "private";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (thread.locked) setJoinOpen(true);
          else void openThread({ id: thread.id, channelId });
        }}
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
            {isPrivate ? (
              <span style={privacyBadge}>{thread.locked ? "🔒 私密" : "私密"}</span>
            ) : null}
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
      <ThreadJoinModal open={joinOpen} onClose={() => setJoinOpen(false)} thread={thread} />
    </>
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
  const [activeRaw, archivedRaw] = partition(all, (t) => t.status === "active");
  const active = orderBy(activeRaw, [(t) => t.lastActivityAt], ["desc"]);
  const archived = orderBy(archivedRaw, [(t) => t.lastActivityAt], ["desc"]);

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
              fontSize: 19,
              fontWeight: 700,
            }}
          >
            #
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
        {item.shareCard ? <ShareCardView card={item.shareCard} /> : null}
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

function ChatPane({
  onCreateThread,
}: {
  onCreateThread: (
    channelId: string,
    seed: { name: string; starterMessageId?: string } | null,
  ) => void;
}): ReactElement | null {
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
  const [composerText, setComposerText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionStartRef = useRef(-1);
  // 私密讨论组成员管理弹窗
  const [threadMembersOpen, setThreadMembersOpen] = useState(false);
  // 讨论组设置弹窗（改名 / 可见性 / 密码）
  const [threadSettingsOpen, setThreadSettingsOpen] = useState(false);

  const threadId = talk.view.threadId;
  const roomKey = threadId ?? channelId;
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
  /** 能否管理当前讨论组（发起人或社区 owner/admin） */
  const canManageThread =
    currentThread !== null &&
    (currentThread.createdBy === talk.me?.id || myRole === "owner" || myRole === "admin");

  /** 在主频道头部开一个空白讨论组（弹窗由 HomeScreen 承载） */
  function openBlankThread(): void {
    if (channelId) onCreateThread(channelId, null);
  }

  /** 从某条消息发起讨论组（自动用消息摘要取名） */
  function openThreadFromMessage(item: MessageItem): void {
    const raw = item.content.replace(/\s+/g, " ").trim();
    const name = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw || "话题讨论";
    if (channelId) onCreateThread(channelId, { name, starterMessageId: item.id });
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

  // 切房间：清空输入框，收起 @ 补全弹层与回复提示
  // biome-ignore lint/correctness/useExhaustiveDependencies: 需要在切换房间时重置弹层与输入
  useEffect(() => {
    setComposerText("");
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
    const text = composerText;
    const caret = composerRef.current?.selectionStart ?? text.length;
    const start =
      mentionStartRef.current >= 0
        ? mentionStartRef.current
        : Math.max(0, caret - mentionQuery.length - 1);
    const next = `${text.slice(0, start)}@${member.handle} ${text.slice(caret)}`;
    setComposerText(next);
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
    setComposerText(value);
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
    const text = composerText;
    if (text.trim().length === 0 && pendingFiles.length === 0) return;
    const ok = await sendMessage(text, pendingFiles);
    if (ok) {
      setComposerText("");
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
            {isThread ? (
              <IconBranchOutline16 />
            ) : (
              <span style={{ color: palette.muted }}>#</span>
            )}
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
          {isThread && currentThread?.visibility === "private" ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<IconUserOutline16 />}
              onClick={() => setThreadMembersOpen(true)}
              aria-label="讨论组成员"
              title="管理私密讨论组成员"
            >
              成员
            </Button>
          ) : null}
          {canManageThread ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<IconEditOutline16 />}
              onClick={() => setThreadSettingsOpen(true)}
              aria-label="讨论组设置"
              title="改动讨论组：名称 / 可见性 / 进入密码"
            />
          ) : null}
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
              aria-label="分享"
              title="把本机 DSH 会话分享到社区"
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
                      color: palette.accent,
                      background: palette.inputBg,
                      border: `1px solid ${palette.border}`,
                    }}
                  >
                    #
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
                      value={composerText}
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
                      talk.view.sending ||
                      (composerText.trim().length === 0 && pendingFiles.length === 0)
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
        channelId={channelId ?? ""}
        communityId={community?.id ?? null}
      />
      {isThread && currentThread ? (
        <>
          <ThreadMembersModal
            open={threadMembersOpen}
            onClose={() => setThreadMembersOpen(false)}
            thread={currentThread}
          />
          <ThreadSettingsModal
            open={threadSettingsOpen}
            onClose={() => setThreadSettingsOpen(false)}
            thread={currentThread}
          />
        </>
      ) : null}
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
  const [visibility, setVisibility] = useState<ThreadVisibility>("public");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const talk = useTalkState();

  // 每次打开按来源预填标题，并重置可见性
  useEffect(() => {
    if (open) {
      setName(seed?.name ?? "");
      setVisibility("public");
      setPasscode("");
    }
  }, [open, seed]);

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (!channelId || trimmed.length === 0 || busy) return;
    setBusy(true);
    const input: {
      name: string;
      starterMessageId?: string;
      visibility?: ThreadVisibility;
      passcode?: string | null;
    } = { name: trimmed, visibility };
    if (seed?.starterMessageId) input.starterMessageId = seed.starterMessageId;
    if (visibility === "private") {
      input.passcode = passcode.trim().length > 0 ? passcode.trim() : null;
    }
    const ok = await createThreadInChannel(channelId, input);
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
        <div style={fieldBlock}>
          <span style={fieldLabel}>可见性</span>
          <div style={pillGroup}>
            <button
              type="button"
              style={pillStyle(visibility === "public")}
              onClick={() => setVisibility("public")}
            >
              公开
            </button>
            <button
              type="button"
              style={pillStyle(visibility === "private")}
              onClick={() => setVisibility("private")}
            >
              私密
            </button>
          </div>
          <span style={{ ...smallText, fontSize: 12, lineHeight: 1.6 }}>
            {visibility === "public"
              ? "社区成员自由进出。"
              : passcode.trim().length > 0
                ? "非成员可见但需凭密码进入；社区所有者/管理员可直接查看。"
                : "仅邀请可加入：非成员看到锁标识，需由组内成员把你拉入。"}
          </span>
        </div>
        {visibility === "private" ? (
          <div style={fieldBlock}>
            <label htmlFor="talk-thread-passcode" style={fieldLabel}>
              进入密码（可选）
            </label>
            <Input
              id="talk-thread-passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="留空表示仅邀请加入"
            />
            <span style={{ ...smallText, fontSize: 11.5 }}>
              留空 = 只能由组内成员拉入；填写后，社区成员可凭该密码自行进入。
            </span>
          </div>
        ) : null}
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

// ---------------- 弹窗：输入密码进入私密讨论组 ----------------

/** 锁态私密讨论组：有密码 → 输入进入；无密码 → 仅提示需被邀请 */
function ThreadJoinModal({
  open,
  onClose,
  thread,
}: {
  open: boolean;
  onClose: () => void;
  thread: ThreadSummary;
}): ReactElement {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setPasscode("");
  }, [open]);

  async function submit(): Promise<void> {
    if (busy || passcode.trim().length === 0) return;
    setBusy(true);
    const ok = await joinThreadWithPasscode(thread.id, passcode);
    setBusy(false);
    if (ok) onClose();
  }

  const needsPasscode = thread.hasPasscode;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={needsPasscode ? "输入密码进入" : "私密讨论组"}
      closeLabel="关闭"
      description={
        needsPasscode
          ? `「${thread.name}」是私密讨论组，请输入进入密码。`
          : `「${thread.name}」是仅邀请可加入的私密讨论组，请联系组内成员把你拉入。`
      }
      footer={
        needsPasscode ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              取消
            </Button>
            <Button
              variant="primary"
              disabled={busy || passcode.trim().length === 0}
              onClick={() => void submit()}
            >
              {busy ? "进入中…" : "进入"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>
            知道了
          </Button>
        )
      }
    >
      {needsPasscode ? (
        <div style={fieldBlock}>
          <label htmlFor="talk-thread-join-passcode" style={fieldLabel}>
            进入密码
          </label>
          <Input
            id="talk-thread-join-passcode"
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="请输入密码"
          />
        </div>
      ) : null}
    </Modal>
  );
}

// ---------------- 弹窗：讨论组设置（改名 / 可见性 / 密码） ----------------

/** 讨论组设置：改名、公开↔私密、设置/清除进入密码（发起人或 owner/admin） */
function ThreadSettingsModal({
  open,
  onClose,
  thread,
}: {
  open: boolean;
  onClose: () => void;
  thread: ThreadSummary;
}): ReactElement {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<ThreadVisibility>("public");
  const [passcode, setPasscode] = useState("");
  const [clearPasscode, setClearPasscode] = useState(false);
  const [busy, setBusy] = useState(false);

  // 每次打开按当前讨论组重置表单
  useEffect(() => {
    if (!open) return;
    setName(thread.name);
    setVisibility(thread.visibility);
    setPasscode("");
    setClearPasscode(false);
  }, [open, thread.name, thread.visibility]);

  async function submit(): Promise<void> {
    const trimmed = name.trim();
    if (busy || trimmed.length === 0) return;
    setBusy(true);
    const patch: UpdateThreadRequest = { name: trimmed, visibility };
    // 私密组才处理密码：勾了清除 → null；填了新密码 → 设置；否则不动
    if (visibility === "private") {
      if (clearPasscode) patch.passcode = null;
      else if (passcode.trim().length > 0) patch.passcode = passcode.trim();
    }
    const ok = await updateThread(thread.id, patch);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="讨论组设置"
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
            {busy ? "保存中…" : "保存"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={fieldBlock}>
          <label htmlFor="talk-thread-settings-name" style={fieldLabel}>
            名称
          </label>
          <Input
            id="talk-thread-settings-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div style={fieldBlock}>
          <span style={fieldLabel}>可见性</span>
          <div style={pillGroup}>
            <button
              type="button"
              style={pillStyle(visibility === "public")}
              onClick={() => setVisibility("public")}
            >
              公开
            </button>
            <button
              type="button"
              style={pillStyle(visibility === "private")}
              onClick={() => setVisibility("private")}
            >
              私密
            </button>
          </div>
        </div>
        {visibility === "private" ? (
          <div style={fieldBlock}>
            <label htmlFor="talk-thread-settings-passcode" style={fieldLabel}>
              进入密码（可选）
            </label>
            <Input
              id="talk-thread-settings-passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={thread.hasPasscode ? "留空保持原密码" : "留空 = 仅邀请可加入"}
              disabled={clearPasscode}
            />
            {thread.hasPasscode ? (
              <label style={{ ...smallText, display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={clearPasscode}
                  onChange={(e) => setClearPasscode(e.target.checked)}
                />
                清除现有密码（改为仅邀请可加入）
              </label>
            ) : null}
          </div>
        ) : (
          <div style={{ ...smallText, fontSize: 12 }}>
            公开讨论组：社区成员可自由进出；转为公开会一并清除进入密码。
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------- 弹窗：私密讨论组成员管理 ----------------

/** 私密讨论组成员：查看成员、移出/退出、从社区成员中搜索并拉入 */
function ThreadMembersModal({
  open,
  onClose,
  thread,
}: {
  open: boolean;
  onClose: () => void;
  thread: ThreadSummary;
}): ReactElement {
  const talk = useTalkState();
  const me = talk.me;
  const [members, setMembers] = useState<ThreadMemberItem[]>([]);
  const [candidates, setCandidates] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const role = talk.view.community?.myRole ?? null;
  const canManage = thread.createdBy === me?.id || role === "owner" || role === "admin";

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setQuery("");
    void listThreadMembers(thread.id).then((list) => {
      if (cancelled) return;
      setMembers(list);
      setLoading(false);
    });
    void listThreadCandidates(thread.id, "").then((list) => {
      if (!cancelled) setCandidates(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, thread.id]);

  async function searchCandidates(value: string): Promise<void> {
    setQuery(value);
    const list = await listThreadCandidates(thread.id, value);
    setCandidates(list);
  }

  async function invite(userId: string): Promise<void> {
    if (busyId !== null) return;
    setBusyId(userId);
    const ok = await addThreadMember(thread.id, userId);
    setBusyId(null);
    if (!ok) return;
    const [nextMembers, nextCandidates] = await Promise.all([
      listThreadMembers(thread.id),
      listThreadCandidates(thread.id, query),
    ]);
    setMembers(nextMembers);
    setCandidates(nextCandidates);
  }

  async function remove(userId: string, isSelf: boolean): Promise<void> {
    if (busyId !== null) return;
    if (!window.confirm(isSelf ? "退出该私密讨论组？" : "把该成员移出讨论组？")) return;
    setBusyId(userId);
    const ok = await removeThreadMember(thread.id, userId);
    setBusyId(null);
    if (!ok) return;
    if (isSelf) {
      onClose();
      void closeThread();
      return;
    }
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
    void listThreadCandidates(thread.id, query).then(setCandidates);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="讨论组成员"
      closeLabel="关闭"
      description="私密讨论组：仅成员可进入；可将社区成员直接拉入。"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>成员（{members.length}）</span>
          {loading ? (
            <div style={{ ...smallText, padding: "8px 2px" }}>加载成员…</div>
          ) : members.length === 0 ? (
            <div style={{ ...smallText, padding: "8px 2px" }}>还没有成员。</div>
          ) : (
            members.map((m) => {
              const isSelf = me !== null && m.userId === me.id;
              const isCreator = m.userId === thread.createdBy;
              return (
                <div key={m.userId} style={listCard}>
                  <Avatar label={m.user.handle} src={m.user.avatarUrl} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={listCardName}>
                      {m.user.displayName ?? m.user.handle}
                      {isSelf ? (
                        <span style={{ color: palette.muted, fontSize: 11 }}>（我）</span>
                      ) : null}
                    </div>
                    <div style={{ ...smallText, fontSize: 11 }}>
                      @{m.user.handle} · {isCreator ? "发起人" : "成员"}
                    </div>
                  </div>
                  {isSelf && !isCreator ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId !== null}
                      onClick={() => void remove(m.userId, true)}
                    >
                      退出
                    </Button>
                  ) : canManage && !isCreator ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId !== null}
                      onClick={() => void remove(m.userId, false)}
                    >
                      移出
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={fieldLabel}>拉入社区成员</span>
          <Input
            value={query}
            onChange={(e) => void searchCandidates(e.target.value)}
            placeholder="搜索 @用户名 / 昵称"
            aria-label="搜索可拉入的成员"
          />
          {candidates.length === 0 ? (
            <div style={{ ...smallText, padding: "4px 2px" }}>没有可拉入的成员。</div>
          ) : (
            candidates.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px",
                  borderRadius: 10,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <Avatar label={u.handle} src={u.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={listCardName}>{u.displayName ?? u.handle}</div>
                  <div style={{ ...smallText, fontSize: 11 }}>@{u.handle}</div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<IconPlusOutline16 />}
                  disabled={busyId !== null}
                  onClick={() => void invite(u.id)}
                >
                  拉入
                </Button>
              </div>
            ))
          )}
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
                  e.currentTarget.style.background = palette.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: palette.muted }}>#</span>
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
      description="本频道当前保持连接的成员。"
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
                <div style={listCardName}>{m.displayName ?? m.handle}</div>
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

// ---------------- 弹窗：加入 / 发现 / 创建（合并单入口，顶部 tab 切换） ----------------

// 发现页的社区行（头像 + 名称/成员数 + 简介 + 加入按钮）
const discoverRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 10px",
  borderRadius: 10,
  background: palette.inputBg,
  border: `1px solid ${palette.border}`,
};

const discoverName: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const discoverDesc: CSSProperties = {
  fontSize: 11.5,
  color: palette.caption,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/** 「加入 / 发现 / 创建」合并为一个弹窗：顶部 tab 切换，默认「加入」 */
function CommunityAddModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const talk = useTalkState();
  const [tab, setTab] = useState<"join" | "discover" | "create">("join");
  // 加入：邀请码
  const [code, setCode] = useState("");
  // 发现：公开社区目录
  const [discoverItems, setDiscoverItems] = useState<Community[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  // 创建：名称 / 简介 / 可见性 / 头像
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [iconUrl, setIconUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 我已在的社区（发现页据此把「加入」换成「进入」）
  const joinedIds = new Set(talk.communities.map((c) => c.id));

  // 每次打开：重置表单，默认落在「加入」
  useEffect(() => {
    if (open) {
      setTab("join");
      setCode("");
      setKeyword("");
      setDiscoverItems([]);
      setJoiningId(null);
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

  /** 拉公开社区目录（关键词为空 = 热门） */
  async function loadDiscover(q: string): Promise<void> {
    setDiscoverLoading(true);
    const items = await discoverCommunities({ q });
    setDiscoverItems(items);
    setDiscoverLoading(false);
  }

  /** 加入公开社区并进入 */
  async function enter(communityId: string): Promise<void> {
    if (joiningId !== null) return;
    setJoiningId(communityId);
    const ok = await joinPublicCommunity(communityId);
    setJoiningId(null);
    if (ok) onClose();
  }

  async function submit(): Promise<void> {
    if (busy) return;
    if (tab !== "create") {
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
  const discovering = tab === "discover";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? "创建社区" : discovering ? "发现社区" : "加入社区"}
      closeLabel="关闭"
      footer={
        discovering ? (
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        ) : (
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
        )
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* tab 顶栏：加入（默认）/ 发现 / 创建 */}
        <div style={pillGroup}>
          <button type="button" style={pillStyle(tab === "join")} onClick={() => setTab("join")}>
            加入
          </button>
          <button
            type="button"
            style={pillStyle(discovering)}
            onClick={() => {
              setTab("discover");
              void loadDiscover(keyword);
            }}
          >
            发现
          </button>
          <button type="button" style={pillStyle(creating)} onClick={() => setTab("create")}>
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
                  style={pillStyle(privacy === "public")}
                  onClick={() => setPrivacy("public")}
                >
                  公开
                </button>
                <button
                  type="button"
                  style={pillStyle(privacy === "private")}
                  onClick={() => setPrivacy("private")}
                >
                  私有
                </button>
              </div>
            </div>
          </>
        ) : discovering ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void loadDiscover(keyword);
                  }
                }}
                placeholder="搜索公开社区（名称 / 简介）"
                aria-label="搜索公开社区"
              />
              <Button variant="outline" onClick={() => void loadDiscover(keyword)}>
                搜索
              </Button>
            </div>
            {discoverLoading ? (
              <div style={{ ...smallText, padding: "8px 2px" }}>加载社区…</div>
            ) : discoverItems.length === 0 ? (
              <div style={{ ...smallText, padding: "8px 2px" }}>没有找到公开社区。</div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {discoverItems.map((item) => {
                  const joined = joinedIds.has(item.id);
                  return (
                    <div key={item.id} style={discoverRow}>
                      <Avatar label={item.name} src={item.iconUrl} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={discoverName}>
                          {item.name}
                          <span style={{ color: palette.caption, fontSize: 11 }}>
                            {" "}
                            · {item.memberCount} 成员
                          </span>
                        </div>
                        {item.description ? (
                          <div style={discoverDesc}>{item.description}</div>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        variant={joined ? "ghost" : "primary"}
                        disabled={joiningId !== null}
                        onClick={() => (joined ? void openCommunity(item.id) : void enter(item.id))}
                      >
                        {joined ? "进入" : joiningId === item.id ? "加入中…" : "加入"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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

// ---------------- 弹窗：分享 DSH 会话 ----------------

/** 工作区展示名：路径最后一段（对齐宿主左侧会话栏） */
function workspaceLabel(cwd: string): string {
  const parts = cwd.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? cwd;
}

/** 会话树按工作区（cwd）分组：保持工作区在会话树里首次出现的顺序 */
function groupSessionsByWorkspace(
  rows: ShareSessionRow[],
): { key: string; label: string; rows: ShareSessionRow[] }[] {
  const groups = new Map<string, { key: string; label: string; rows: ShareSessionRow[] }>();
  for (const row of rows) {
    const key = row.cwd ?? "";
    let group = groups.get(key);
    if (!group) {
      group = { key, label: key.length > 0 ? workspaceLabel(key) : "未知工作区", rows: [] };
      groups.set(key, group);
    }
    group.rows.push(row);
  }
  return [...groups.values()];
}

function ShareSnapshotModal({
  open,
  onClose,
  channelId,
  communityId,
}: {
  open: boolean;
  onClose: () => void;
  channelId: string;
  communityId: string | null;
}): ReactElement {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  // DSH 会话分享：整个会话树（工作区 → 会话）+ 选中的会话
  const [sessions, setSessions] = useState<ShareSessionRow[]>([]);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    if (!open) return;
    const current = getCurrentDshSession();
    setSessionId(current ?? "");
    void listShareableSessions().then((list) => {
      setSessions(list);
      if (!current && list.length > 0) setSessionId(list[0]?.id ?? "");
    });
  }, [open]);

  /** DSH 会话：host 打包上传后登记分享，并把卡片发到当前频道 */
  async function submitSession(): Promise<void> {
    if (busy || sessionId.length === 0) return;
    setBusy(true);
    const shareId = await shareLocalSession({ sessionId, title, summary, communityId });
    if (shareId && channelId.length > 0) {
      const sent = await sendMessage("", [], shareId);
      if (!sent) notify("分享已创建，但发送卡片失败");
    }
    setBusy(false);
    if (!shareId) return;
    setTitle("");
    setSummary("");
    onClose();
  }

  const sessionGroups = groupSessionsByWorkspace(sessions);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="分享 DSH 会话"
      description="把本机一个 DSH 会话打包上传，社区成员可「克隆到会话」还原出同样的会话。"
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || sessionId.length === 0}
            onClick={() => void submitSession()}
          >
            {busy ? "处理中…" : "分享到本频道"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {sessionGroups.length === 0 ? (
              <div style={{ ...smallText, fontSize: 12 }}>没有可分享的本机会话。</div>
            ) : (
              sessionGroups.map((group) => (
                <div key={group.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span
                    title={group.key.length > 0 ? group.key : undefined}
                    style={{
                      fontSize: 11,
                      fontWeight: 650,
                      color: palette.caption,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {group.label}
                  </span>
                  {group.rows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSessionId(row.id)}
                      title={row.id}
                      style={{
                        ...pillStyle(row.id === sessionId),
                        textAlign: "left",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.title}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="会话分享标题（可选）"
        />
        <Input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="一句话摘要（可选）"
        />
      </div>
    </Modal>
  );
}

// ---------------- 消息内嵌分享卡片 ----------------

// 消息内嵌的分享卡片（标题 + 摘要 + 下载）
const shareCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 6,
  padding: "8px 10px",
  maxWidth: 380,
  borderRadius: 10,
  background: palette.inputBg,
  border: `1px solid ${palette.border}`,
  cursor: "pointer",
  textAlign: "left",
};

const shareCardBadge: CSSProperties = {
  flex: "0 0 auto",
  fontSize: 10.5,
  fontWeight: 650,
  color: palette.accent,
  background: palette.elevated,
  border: `1px solid ${palette.border}`,
  borderRadius: 6,
  padding: "2px 6px",
  letterSpacing: "0.02em",
};

/** 消息内嵌分享卡片：点击打开详情弹窗（可在弹窗里克隆到本地会话） */
function ShareCardView({ card }: { card: NonNullable<MessageItem["shareCard"]> }): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="查看分享详情"
        style={shareCardStyle}
      >
        <span style={shareCardBadge}>DSH 会话</span>
        <span style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {card.title}
          </span>
          {card.summary ? (
            <span
              style={{
                ...smallText,
                fontSize: 11.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {card.summary}
            </span>
          ) : null}
        </span>
        <span style={{ ...smallText, fontSize: 11, flex: "0 0 auto" }}>查看</span>
      </button>
      <ShareCardModal open={open} onClose={() => setOpen(false)} card={card} />
    </>
  );
}

/** 分享详情弹窗：展示分享信息；可一键克隆到本地会话 */
function ShareCardModal({
  open,
  onClose,
  card,
}: {
  open: boolean;
  onClose: () => void;
  card: NonNullable<MessageItem["shareCard"]>;
}): ReactElement {
  const [detail, setDetail] = useState<GetShareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // 打开时拉一次详情（分享者 / 时间 / 大小 / 会话事件数）
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    void getShareInfo(card.shareId).then((res) => {
      if (cancelled) return;
      setDetail(res);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, card.shareId]);

  async function download(): Promise<void> {
    if (busy) return;
    setBusy(true);
    const url = await shareDownloadUrl(card.shareId);
    setBusy(false);
    if (url) window.open(url, "_blank", "noopener");
  }

  async function clone(): Promise<void> {
    if (busy) return;
    setBusy(true);
    const ok = await cloneShareToSession(card.shareId);
    setBusy(false);
    if (ok) onClose();
  }

  const eventCount =
    typeof detail?.manifest.eventCount === "number" ? detail.manifest.eventCount : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="DSH 会话分享"
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" disabled={busy} onClick={() => void download()}>
            下载包体
          </Button>
          <Button variant="primary" disabled={busy || loading} onClick={() => void clone()}>
            {busy ? "处理中…" : "克隆到本地的会话"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={shareCardBadge}>DSH 会话</span>
          <span style={{ fontSize: 14, fontWeight: 650 }}>{card.title}</span>
        </div>
        {card.summary ? <div style={{ ...smallText, fontSize: 12.5 }}>{card.summary}</div> : null}
        {loading ? (
          <div style={{ ...smallText, fontSize: 12 }}>加载分享信息…</div>
        ) : detail ? (
          <div style={{ ...smallText, fontSize: 12, lineHeight: 1.9 }}>
            <div>分享者：@{detail.author.handle}</div>
            <div>时间：{timeLabel(detail.createdAt)}</div>
            <div>大小：{formatBytes(detail.sizeBytes)}</div>
            {eventCount !== null ? <div>会话事件数：{eventCount}</div> : null}
            <div>下载次数：{detail.downloadCount}</div>
          </div>
        ) : null}
        <div style={{ ...smallText, fontSize: 12 }}>
          克隆会在你的 DSH 里新建一个会话并切过去，不影响原会话。
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
  /** 创建讨论组弹窗：由 HomeScreen 承载，频道列表菜单与会话头部共用 */
  const [threadCreate, setThreadCreate] = useState<{
    channelId: string;
    seed: { name: string; starterMessageId?: string } | null;
  } | null>(null);
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
          <ChannelList onCreateThread={(channelId) => setThreadCreate({ channelId, seed: null })} />
          <ChatPane onCreateThread={(channelId, seed) => setThreadCreate({ channelId, seed })} />
        </>
      ) : (
        <div style={{ ...chatCol, alignItems: "center", justifyContent: "center" }}>
          <div style={emptyCard}>
            <BrandLogo size={52} />
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
              点左栏「＋」发现公开社区、用邀请码加入，或创建一个新社区。
              <br />
              请不要输入如 密码、银行卡、APIKEY 等敏感信息。
            </span>
          </div>
        </div>
      )}
      <ThreadCreateModal
        open={threadCreate !== null}
        onClose={() => setThreadCreate(null)}
        channelId={threadCreate?.channelId ?? null}
        seed={threadCreate?.seed ?? null}
      />
      <CommunityAddModal open={showAdd} onClose={() => setShowAdd(false)} />
      <UpdateUsernameModal open={showUsername} onClose={() => setShowUsername(false)} />
      <InboxDialog />
    </div>
  );
}
