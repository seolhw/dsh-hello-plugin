// ================================================================
// 聊天相关弹窗：社区内消息搜索（命中可跳转定位）、当前频道在线成员。
// ================================================================

import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ChannelOnlineMember, SearchMessageResult } from "@dsh-talk/types/api";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import { notify, revealMessage, searchCommunityMessages } from "../store";
import { emptyMsg, liveDot } from "./homeStyles";
import { Avatar, listCardName, palette, smallText, timeLabel } from "./styles";
import { TalkModal as Modal } from "./TalkModal";

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
export function SearchMessagesModal({
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

// ---------------- 在线成员 ----------------

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
export function OnlineMembersModal({
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
