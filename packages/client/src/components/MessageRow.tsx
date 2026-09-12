// ================================================================
// 消息行：作者/时间/正文（@ 高亮）/附件/分享卡片 + 表情回应 + hover 操作条
// （加表情回应/回复/讨论组/编辑/撤回）。
// ================================================================

import {
  Button,
  IconBranchOutline16,
  IconCloseOutline16,
  IconDownloadOutline16,
  IconEditOutline16,
  IconLoadingOutline16,
  IconTrashOutline16,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { type MessageAttachment, Permission } from "@dsh-talk/types/entities";
import type { CSSProperties, KeyboardEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";
import {
  canEditMessage,
  canRetractMessage,
  channelPermissions,
  deleteMessage,
  type MessageItem,
  notify,
  replyToMessage,
  revealMessage,
  toggleReaction,
  updateMessage,
  useTalkState,
} from "../store";
import { EmojiPopover } from "./EmojiPicker";
import { formatBytes, msgChip, msgRow, replyParts, textAreaEdit } from "./homeStyles";
import { ShareCardView } from "./ShareModals";
import { Avatar, palette, smallText, timeLabel } from "./styles";

/** 正文里的 @mention 高亮（自己用品牌底色反白） */
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
          color: isSelf ? palette.onColor : palette.accent,
          background: isSelf ? palette.accent : palette.mentionBg,
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

/** 回复（引用）小图标：拐角返回箭头，随按钮颜色 */
export function ReplyGlyph(): ReactElement {
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

// ---------------- 附件展示 ----------------

const fileChip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 9px",
  borderRadius: 8,
  border: `1px solid ${palette.border}`,
  background: palette.inputBg,
  color: palette.text,
  fontSize: 14,
  textDecoration: "none",
  maxWidth: 260,
};

export function AttachmentList({
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
          <span style={{ ...smallText, fontSize: 14, flex: "0 0 auto" }}>
            {formatBytes(a.size)}
          </span>
        </a>
      ))}
    </div>
  );
}

// ---------------- 表情回应（reaction） ----------------

/** 回应小胶囊：我投过的用品牌色描边高亮 */
function reactionChipStyle(mine: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 7px",
    borderRadius: 999,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${mine ? palette.accent : palette.border}`,
    background: mine ? palette.hoverAccent : palette.inputBg,
    color: mine ? palette.accent : palette.muted,
  };
}

/** 消息底部的一排回应：表情 + 计数，点击切换自己的回应 */
function ReactionRow({ item }: { item: MessageItem }): ReactElement | null {
  const reactions = item.reactions ?? [];
  if (reactions.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => void toggleReaction(item, reaction.emoji)}
          title={reaction.me ? `取消回应 ${reaction.emoji}` : `回应 ${reaction.emoji}`}
          style={reactionChipStyle(reaction.me)}
        >
          <span style={{ fontSize: 14, lineHeight: 1.2 }}>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------- 消息行 ----------------

export function MessageRow({
  item,
  onCreateThread,
}: {
  item: MessageItem;
  onCreateThread?: (item: MessageItem) => void;
}): ReactElement {
  const talk = useTalkState();
  const [editing, setEditing] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [draftText, setDraftText] = useState(item.content);
  const mine = talk.me !== null && item.authorId === talk.me.id;
  const mentionedMe = (item.mentions ?? []).includes(talk.me?.id ?? "");
  const focused = talk.view.focusMessageId === item.id;
  const allowEdit = canEditMessage(item);
  const allowRetract = canRetractMessage(item);
  const quote = item.replyTo ? replyParts(item) : null;
  // 该消息所在频道的权限位：能否回复 / 能否从这条消息开讨论组
  const channelOf = talk.view.community?.channels.find((c) => c.id === item.channelId);
  const channelPerms = channelOf ? channelPermissions(channelOf.id) : 0;
  const canReplyHere = (channelPerms & Permission.SEND_MESSAGES) !== 0;
  // 只能从文字频道主频道的直接消息开临时讨论（讨论组/话题内的消息不能再套娃）
  const canThreadHere =
    item.threadId === null &&
    channelOf?.kind === "text" &&
    (channelPerms & Permission.CREATE_THREAD) !== 0;

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

  function onEditKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void saveEdit();
    } else if (e.key === "Escape") {
      setDraftText(item.content);
      setEditing(false);
    }
  }

  return (
    <div
      className={`dsht-msg-row${mentionedMe ? " is-mentioned" : ""}${focused ? " is-focus" : ""}`}
      data-msg-id={item.id}
      style={msgRow}
    >
      <Avatar size={38} label={item.author.handle} src={item.author.avatarUrl} />
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
              color: palette.muted,
              fontSize: 14,
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
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {item.author.displayName ?? item.author.handle}
          </span>
          <span style={{ fontSize: 14 }}>{mine ? "" : `@${item.author.handle}`}</span>
          <span style={{ ...smallText, fontSize: 14 }}>{timeLabel(item.createdAt)}</span>
          {mentionedMe ? <span style={{ fontSize: 14, color: palette.accent }}>@了你</span> : null}
          {item.updatedAt ? <span style={{ ...smallText, fontSize: 14 }}>(已编辑)</span> : null}
        </div>
        {editing ? (
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            onKeyDown={onEditKeyDown}
            style={textAreaEdit}
          />
        ) : (
          <div
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: 14,
              lineHeight: 1.55,
            }}
          >
            {renderMentions(item.content, talk.me?.handle ?? "")}
          </div>
        )}
        <AttachmentList attachments={item.attachments ?? []} />
        {item.shareCard ? <ShareCardView card={item.shareCard} /> : null}
        <ReactionRow item={item} />
      </div>
      <span
        className={`dsht-msg-actions${editing || reactionOpen ? " is-open" : ""}`}
        style={msgChip}
      >
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
            <EmojiPopover
              open={reactionOpen}
              onOpenChange={setReactionOpen}
              onPick={(emoji) => void toggleReaction(item, emoji)}
              size="sm"
              align="right"
              label="添加表情回应"
              title="添加表情回应"
            />
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
