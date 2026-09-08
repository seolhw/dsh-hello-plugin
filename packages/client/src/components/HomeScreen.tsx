// ================================================================
// 主工作区：社区栏 | 频道列表 | 聊天面板（含实时状态与输入框）
// ================================================================

import {
  Button,
  IconChevronLeftOutline14,
  IconCloseOutline16,
  IconEditOutline16,
  IconLoadingOutline16,
  IconPlusOutline16,
  IconSendOutline16,
  IconTrashOutline16,
  Input,
  Modal,
  Pill,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { Channel } from "@dsh-talk/types/entities";
import type { CSSProperties, ReactElement, UIEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  backToCommunities,
  canModify,
  createCommunity,
  deleteMessage,
  joinCommunityByCode,
  loadOlderMessages,
  logout,
  type MessageItem,
  openCommunity,
  selectChannel,
  sendMessage,
  setDraft,
  updateMessage,
  useTalkState,
} from "../store";
import { Avatar, palette, smallText, timeLabel } from "./styles";

// ---------------- 布局样式 ----------------

const body: CSSProperties = { display: "flex", flex: 1, minHeight: 0 };

const rail: CSSProperties = {
  width: 240,
  flex: "0 0 auto",
  background: palette.rail,
  borderRight: `1px solid ${palette.border}`,
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
};

const railHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 12px 8px",
};

const railScroll: CSSProperties = { overflow: "auto", flex: 1, padding: "0 8px 8px" };

const itemRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "7px 8px",
  borderRadius: 8,
  cursor: "pointer",
  border: "none",
  background: "transparent",
  color: palette.text,
  width: "100%",
  textAlign: "left",
};

const badge: CSSProperties = {
  minWidth: 18,
  height: 18,
  padding: "0 5px",
  borderRadius: 999,
  background: palette.badge,
  color: "#fff",
  fontSize: 11,
  lineHeight: "18px",
  textAlign: "center",
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

const composerWrap: CSSProperties = {
  borderTop: `1px solid ${palette.border}`,
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

// ---------------- 社区栏 ----------------

function CommunitiesRail({
  onJoin,
  onCreate,
}: {
  onJoin: () => void;
  onCreate: () => void;
}): ReactElement {
  const talk = useTalkState();
  const current = talk.view.communityId;
  return (
    <div style={rail}>
      <div style={railHeader}>
        <span style={{ fontSize: 13, fontWeight: 650, color: palette.muted }}>社区</span>
        <span style={{ display: "flex", gap: 2 }}>
          <Button
            size="sm"
            variant="ghost"
            icon={<IconPlusOutline16 />}
            onClick={onJoin}
            aria-label="加入社区"
            title="用邀请码加入"
          />
          <Button
            size="sm"
            variant="ghost"
            icon={<IconPlusOutline16 />}
            onClick={onCreate}
            aria-label="创建社区"
            title="创建社区"
          />
        </span>
      </div>
      <div style={railScroll}>
        {talk.communities.length === 0 ? (
          <div style={{ ...smallText, padding: "8px 10px" }}>
            还没有社区。点右上「+」创建或用邀请码加入。
          </div>
        ) : (
          talk.communities.map((c) => {
            const active = c.id === current;
            const unread = c.unreadChannels;
            const mention = c.unreadMentions;
            return (
              <button
                key={c.id}
                type="button"
                style={{ ...itemRow, background: active ? palette.active : undefined }}
                onClick={() => {
                  if (!active) void openCommunity(c.id);
                }}
              >
                <Avatar label={c.name} size={26} />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </span>
                {mention > 0 ? (
                  <span style={{ ...badge, background: palette.accent }}>{mention}</span>
                ) : unread > 0 ? (
                  <span style={badge}>{unread}</span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
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
          padding: "12px 12px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 650,
            color: palette.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {community.name}
        </span>
      </div>
      <div style={railScroll}>
        {community.channels.map((ch: Channel) => {
          const active = ch.id === activeChannel;
          return (
            <button
              key={ch.id}
              type="button"
              style={{ ...itemRow, background: active ? palette.active : undefined }}
              onClick={() => void selectChannel(ch.id)}
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
          );
        })}
      </div>
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
        borderColor: mentionedMe ? "rgba(91,140,255,0.35)" : undefined,
        background: mine ? "rgba(255,255,255,0.02)" : undefined,
      }}
    >
      <Avatar label={item.author.handle} />
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
            {item.content}
          </div>
        )}
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

  async function submit(): Promise<void> {
    const text = draft;
    if (text.trim().length === 0) return;
    await sendMessage(text);
    setDraft("");
  }

  const hasOlder = talk.view.nextCursor !== null;
  const canLoadMore = !talk.view.loadingOlder && hasOlder;

  return (
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
        <span style={{ color: palette.muted }}>#</span>
        <span style={{ fontWeight: 650 }}>{channel?.name ?? ""}</span>
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
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: talk.view.live ? palette.success : palette.muted,
              boxShadow: talk.view.live ? `0 0 6px ${palette.success}` : undefined,
            }}
          />
          <span style={{ ...smallText, fontSize: 11 }}>{talk.view.live ? "实时" : "重连中…"}</span>
        </span>
      </div>

      <div ref={scrollRef} onScroll={onScroll} style={messagesWrap}>
        {talk.view.messagesLoading ? (
          <div style={{ ...smallText, padding: 16 }}>加载消息…</div>
        ) : talk.view.messages.length === 0 ? (
          <div style={{ ...smallText, padding: 16 }}>还没有消息，来说第一句吧。</div>
        ) : (
          <>
            {canLoadMore ? (
              <div style={{ textAlign: "center", padding: 4 }}>
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
        <Button
          variant="primary"
          size="md"
          icon={<IconSendOutline16 />}
          disabled={talk.view.sending || draft.trim().length === 0}
          onClick={() => void submit()}
          aria-label="发送"
        />
      </div>
    </div>
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
  const [busy, setBusy] = useState(false);

  async function submit(): Promise<void> {
    if (name.trim().length === 0) return;
    setBusy(true);
    const body: { name: string; description?: string; privacy?: "public" | "private" } = {
      name: name.trim(),
      privacy,
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
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="社区名称" />
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="简介（可选）"
        />
        <div style={{ display: "flex", gap: 6 }}>
          <Pill active={privacy === "public"} onClick={() => setPrivacy("public")}>
            公开
          </Pill>
          <Pill active={privacy === "private"} onClick={() => setPrivacy("private")}>
            私有
          </Pill>
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
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="邀请码，如 ABCD1234"
      />
    </Modal>
  );
}

// ---------------- 主出口 ----------------

export function HomeScreen(): ReactElement {
  const talk = useTalkState();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const inCommunity = talk.view.communityId !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        {inCommunity ? (
          <Button
            size="sm"
            variant="ghost"
            icon={<IconChevronLeftOutline14 />}
            onClick={() => backToCommunities()}
            aria-label="返回社区列表"
          >
            返回
          </Button>
        ) : null}
        <span style={{ fontWeight: 650 }}>
          {inCommunity ? (talk.view.community?.name ?? "…") : "社区"}
        </span>
        <span style={{ ...smallText, fontSize: 11 }}>@{talk.me?.handle}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => void logout()}>
            退出登录
          </Button>
        </span>
      </div>
      <div style={body}>
        <CommunitiesRail onJoin={() => setShowJoin(true)} onCreate={() => setShowCreate(true)} />
        {inCommunity ? <ChannelList /> : null}
        {inCommunity ? (
          <ChatPane />
        ) : (
          <div
            style={{
              ...chatCol,
              alignItems: "center",
              justifyContent: "center",
              color: palette.muted,
            }}
          >
            选择一个社区开始聊天
          </div>
        )}
      </div>
      <CreateCommunityModal open={showCreate} onClose={() => setShowCreate(false)} />
      <JoinModal open={showJoin} onClose={() => setShowJoin(false)} />
    </div>
  );
}
