// ================================================================
// 主工作区：社区栏 | 频道列表 | 聊天面板（含实时状态与输入框）
// ================================================================

import {
  Button,
  IconChevronLeftOutline14,
  IconCloseOutline16,
  IconDownloadOutline16,
  IconEditOutline16,
  IconLinkOutline16,
  IconLoadingOutline16,
  IconPaperclipOutline16,
  IconPlusOutline16,
  IconSendOutline16,
  IconShareOutline16,
  IconTrashOutline16,
  Input,
  Modal,
  Pill,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { Channel, MessageAttachment } from "@dsh-talk/types/entities";
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
  selectChannel,
  sendMessage,
  setDraft,
  snapshotChannel,
  updateMessage,
  useTalkState,
} from "../store";
import { ChannelRowMenu, CommunityTools, CreateChannelButton } from "./Manage";
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
            icon={<IconLinkOutline16 />}
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
          gap: 6,
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
            flex: 1,
          }}
        >
          {community.name}
        </span>
        <CommunityTools />
      </div>
      <div style={{ ...railScroll, flex: 1 }}>
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
                background: active ? palette.active : undefined,
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
          <Button
            size="sm"
            variant="ghost"
            icon={<IconShareOutline16 />}
            onClick={() => setShareOpen(true)}
            aria-label="分享会话快照"
            title="把本频道消息打成可分享的快照"
          />
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
            <span style={{ ...smallText, fontSize: 11 }}>
              {talk.view.live ? "实时" : "重连中…"}
            </span>
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
