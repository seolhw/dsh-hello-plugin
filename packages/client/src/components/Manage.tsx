// ================================================================
// 管理 UI：社区工具（成员/邀请码/设置/退出）、频道创建/编辑/删除
// 权限判定以 talk.view.community.myRole 为准（owner/admin 可见管理项）
// ================================================================

import type { MenuEntry } from "@deepseek-ai/dsh-client-ui-primitives";
import {
  Button,
  IconCopyOutline16,
  IconEditOutline16,
  IconEllipsisOutline16,
  IconPlusOutline16,
  IconRightUpOutline16,
  IconTrashOutline16,
  IconUserOutline16,
  Input,
  Menu,
  Modal,
  writeClipboard,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { CommunityBanItem } from "@dsh-talk/types/api";
import type { Channel, MemberRole, User } from "@dsh-talk/types/entities";
import type { CSSProperties, ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  banUser,
  createChannel,
  deleteChannelById,
  deleteCommunity,
  inviteMember,
  kickMember,
  leaveCommunity,
  listBannedUsers,
  listMembers,
  notify,
  setMemberRole,
  unbanUser,
  updateChannelById,
  updateCommunity,
  uploadImage,
  useTalkState,
} from "../store";
import {
  Avatar,
  AvatarPicker,
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

const isModerator = (role: MemberRole | null | undefined): boolean =>
  role === "owner" || role === "admin";

const roleColor: Record<MemberRole, string> = {
  owner: "var(--dsw-alias-state-warn-primary)",
  admin: "var(--dsw-alias-state-business-primary)",
  member: palette.muted,
};

const roleName: Record<MemberRole, string> = { owner: "所有者", admin: "管理员", member: "成员" };

// ---------- 弹窗共享样式 ----------

/** 弹窗说明文字 */
const dialogHint: CSSProperties = {
  fontSize: 11.5,
  color: palette.caption,
  lineHeight: 1.6,
};

type CommunityDialog = null | "members" | "invite-user" | "invite" | "settings";

/** 频道列表顶部的社区管理菜单（成员 / 邀请码 / 设置 / 退出） */
export function CommunityTools(): ReactElement | null {
  const talk = useTalkState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<CommunityDialog>(null);
  const communityId = talk.view.communityId;
  const moder = isModerator(talk.view.community?.myRole);
  if (!communityId) return null;

  const menuItems: MenuEntry[] = [];
  if (moder) {
    menuItems.push(
      { id: "members", label: "成员管理", icon: <IconUserOutline16 /> },
      { id: "invite-user", label: "邀请用户", icon: <IconPlusOutline16 /> },
      { id: "invite", label: "邀请码", icon: <IconCopyOutline16 /> },
      { id: "settings", label: "社区设置", icon: <IconEditOutline16 /> },
      { type: "separator", id: "sep" },
    );
  }
  menuItems.push({ id: "leave", label: "退出社区", danger: true, icon: <IconRightUpOutline16 /> });

  return (
    <>
      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(id) => {
          setMenuOpen(false);
          if (id === "members" || id === "invite-user" || id === "invite" || id === "settings")
            setDialog(id);
          if (id === "leave") {
            if (window.confirm("退出该社区？所有者需先转让所有权。"))
              void leaveCommunity(communityId);
          }
        }}
        anchor={
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEllipsisOutline16 />}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="社区管理"
          />
        }
        items={menuItems}
        portal
      />
      {dialog === "members" ? <MembersDialog open onClose={() => setDialog(null)} /> : null}
      {dialog === "invite-user" ? <InviteUserDialog open onClose={() => setDialog(null)} /> : null}
      {dialog === "invite" ? <InviteDialog open onClose={() => setDialog(null)} /> : null}
      {dialog === "settings" ? <SettingsDialog open onClose={() => setDialog(null)} /> : null}
    </>
  );
}

/** 邀请码展示 / 复制（创建社区时生成、固定不变；码对所有成员可见） */
function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const talk = useTalkState();
  const community = talk.view.community;
  const code = community?.inviteCode ?? "";

  async function copy(): Promise<void> {
    await writeClipboard(code);
    notify("邀请码已复制");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="邀请码"
      closeLabel="关闭"
      description="把邀请码发给对方：对方在「＋ 加入」里输入即可进社区。"
    >
      <div style={fieldBlock}>
        <label htmlFor="talk-invite-code" style={fieldLabel}>
          邀请码
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            id="talk-invite-code"
            readOnly
            value={code}
            aria-label="邀请码"
            style={{ flex: 1 }}
          />
          <Button variant="outline" icon={<IconCopyOutline16 />} onClick={() => void copy()}>
            复制
          </Button>
        </div>
        <span style={dialogHint}>
          邀请码在创建社区时生成、固定不变，不会过期；请妥善保存，所有成员均可查看。
        </span>
      </div>
    </Modal>
  );
}

/** 邀请已注册用户入社区（owner/admin）：输入 @用户名 或邮箱，对方会收到站内信 + 邮件 */
function InviteUserDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  // 每次打开清空输入
  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  async function submit(): Promise<void> {
    if (busy || value.trim().length === 0) return;
    setBusy(true);
    const ok = await inviteMember(value);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="邀请用户加入"
      closeLabel="关闭"
      description="输入对方的 @用户名 或注册邮箱，对方会收到站内信和邮件邀请。"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || value.trim().length === 0}
            onClick={() => void submit()}
          >
            {busy ? "邀请中…" : "发送邀请"}
          </Button>
        </>
      }
    >
      <div style={fieldBlock}>
        <label htmlFor="talk-invite-user" style={fieldLabel}>
          @用户名 或邮箱
        </label>
        <Input
          id="talk-invite-user"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="如 @alice 或 alice@example.com"
        />
        <span style={dialogHint}>仅可邀请已注册的用户；对方接受后即可加入社区。</span>
      </div>
    </Modal>
  );
}

/** 社区设置（owner/admin） */
function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const talk = useTalkState();
  const community = talk.view.community;
  const [name, setName] = useState(community?.name ?? "");
  const [description, setDescription] = useState(community?.description ?? "");
  const [privacy, setPrivacy] = useState<"public" | "private">(community?.privacy ?? "public");
  const [iconUrl, setIconUrl] = useState<string | null>(community?.iconUrl ?? null);
  const [busy, setBusy] = useState(false);

  // 每次打开用当前社区资料预填
  useEffect(() => {
    if (!open) return;
    setName(community?.name ?? "");
    setDescription(community?.description ?? "");
    setPrivacy(community?.privacy ?? "public");
    setIconUrl(community?.iconUrl ?? null);
  }, [open, community?.name, community?.description, community?.privacy, community?.iconUrl]);

  async function pickIcon(file: File): Promise<void> {
    const url = await uploadImage(file);
    if (url) setIconUrl(url);
  }

  async function save(): Promise<void> {
    if (name.trim().length === 0) return;
    setBusy(true);
    const ok = await updateCommunity({
      name: name.trim(),
      description: description.length > 0 ? description : null,
      privacy,
      iconUrl,
    });
    setBusy(false);
    if (ok) onClose();
  }

  /** 删除社区（仅 owner 可见按钮）；删除后整个社区及其内容不复存在 */
  async function removeCommunity(): Promise<void> {
    if (!community) return;
    const confirmed = window.confirm(
      `删除社区「${community.name}」？其中所有频道与消息将被永久删除，且无法恢复。`,
    );
    if (!confirmed) return;
    setBusy(true);
    const ok = await deleteCommunity(community.id);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="社区设置"
      closeLabel="关闭"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || name.trim().length === 0}
            onClick={() => void save()}
          >
            保存
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
          <label htmlFor="talk-community-name" style={fieldLabel}>
            社区名称
          </label>
          <Input
            id="talk-community-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="社区名称"
          />
        </div>
        <div style={fieldBlock}>
          <label htmlFor="talk-community-desc" style={fieldLabel}>
            简介
          </label>
          <Input
            id="talk-community-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="一句话介绍这个社区"
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
        {community?.myRole === "owner" ? (
          <div
            style={{
              borderTop: `1px solid ${palette.border}`,
              paddingTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span style={dialogHint}>
              危险操作：删除社区「{community.name}」后，其全部频道与消息将被永久清除。
            </span>
            <Button
              variant="ghost"
              icon={<IconTrashOutline16 />}
              disabled={busy}
              onClick={() => void removeCommunity()}
              style={{
                color: palette.danger,
                border: `1px solid ${palette.dangerSoft}`,
                alignSelf: "flex-start",
              }}
            >
              删除社区
            </Button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

type MemberRow = { user: User; role: MemberRole; joinedAt: number };

/** 成员管理（owner/admin） */
function MembersDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const talk = useTalkState();
  const me = talk.me;
  const myRole = talk.view.community?.myRole ?? null;
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [bans, setBans] = useState<CommunityBanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwner = myRole === "owner";
  const moder = isModerator(myRole);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([listMembers(), listBannedUsers()]).then(([ms, bs]) => {
      if (cancelled) return;
      setMembers(ms as MemberRow[]);
      setBans(bs);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function act(userId: string, role: MemberRole, label: string): Promise<void> {
    if (!window.confirm(`确认${label}？`)) return;
    const ok = await setMemberRole(userId, role);
    if (ok) setMembers((prev) => prev.map((m) => (m.user.id === userId ? { ...m, role } : m)));
  }

  async function kick(user: User): Promise<void> {
    if (!window.confirm(`把 ${user.handle} 移出社区？`)) return;
    const ok = await kickMember(user.id);
    if (ok) setMembers((prev) => prev.filter((m) => m.user.id !== user.id));
  }

  async function ban(user: User): Promise<void> {
    if (
      !window.confirm(
        `封禁 @${user.handle}？封禁会同时将其移出社区，且之后无法通过邀请码/邀请再加入（可在下方解封）。`,
      )
    ) {
      return;
    }
    const ok = await banUser(user.id);
    if (ok) {
      setMembers((prev) => prev.filter((m) => m.user.id !== user.id));
      void listBannedUsers().then(setBans);
    }
  }

  async function unban(item: CommunityBanItem): Promise<void> {
    if (!window.confirm(`解封 @${item.user.handle}？解封后 TA 可重新加入社区。`)) return;
    const ok = await unbanUser(item.userId);
    if (ok) setBans((prev) => prev.filter((b) => b.userId !== item.userId));
  }

  return (
    <Modal open={open} onClose={onClose} title="成员管理" closeLabel="关闭">
      {loading ? (
        <div style={{ ...smallText, padding: "12px 4px" }}>加载成员…</div>
      ) : members.length === 0 ? (
        <div style={{ ...smallText, padding: "12px 4px" }}>还没有成员。</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {members.map((m) => {
            const self = me !== null && m.user.id === me.id;
            const targetIsOwner = m.role === "owner";
            const rowCanManage = moder && !self && !targetIsOwner;
            const canTransfer = isOwner && !self && targetIsOwner;
            return (
              <div key={m.user.id} style={listCard}>
                <Avatar label={m.user.handle} src={m.user.avatarUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={listCardName}>
                    {m.user.displayName ?? m.user.handle}
                    {self ? (
                      <span style={{ color: palette.muted, fontSize: 11 }}>（我）</span>
                    ) : null}
                  </div>
                  <div style={{ ...smallText, fontSize: 11 }}>@{m.user.handle}</div>
                </div>
                <span style={{ fontSize: 12, color: roleColor[m.role], width: 44 }}>
                  {roleName[m.role]}
                </span>
                {canTransfer ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void act(m.user.id, "owner", "转让所有权给该成员")}
                  >
                    转让
                  </Button>
                ) : null}
                {rowCanManage ? (
                  <span style={{ display: "flex", gap: 2 }}>
                    {m.role !== "admin" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void act(m.user.id, "admin", "设为管理员")}
                      >
                        设管理员
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void act(m.user.id, "member", "降为成员")}
                      >
                        降为成员
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<IconTrashOutline16 />}
                      onClick={() => void kick(m.user)}
                      aria-label="移除成员"
                    >
                      移除
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void ban(m.user)}
                      aria-label="封禁成员"
                      title="封禁（同时移出成员并禁止再次加入）"
                    >
                      封禁
                    </Button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
      {bans.length > 0 ? (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 650,
              color: palette.caption,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              padding: "2px 2px 0",
            }}
          >
            已封禁用户（{bans.length}）
          </div>
          {bans.map((b) => (
            <div key={b.userId} style={listCard}>
              <Avatar label={b.user.handle} src={b.user.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={listCardName}>
                  @{b.user.handle}
                  {b.reason ? (
                    <span style={{ color: palette.caption, fontSize: 11 }}> · {b.reason}</span>
                  ) : null}
                </div>
                <div style={{ ...smallText, fontSize: 11 }}>封禁于 {timeLabel(b.createdAt)}</div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void unban(b)}
                aria-label={`解封 ${b.user.handle}`}
              >
                解封
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </Modal>
  );
}

// ---------------- 频道：创建 / 编辑 / 删除 ----------------

/** 频道列表底部“新建频道”入口（owner/admin） */
export function CreateChannelButton(): ReactElement | null {
  const talk = useTalkState();
  const [open, setOpen] = useState(false);
  if (!isModerator(talk.view.community?.myRole)) return null;
  return (
    <>
      <div style={{ padding: "6px 8px" }}>
        <Button
          size="sm"
          variant="ghost"
          icon={<IconPlusOutline16 />}
          onClick={() => setOpen(true)}
          style={{ width: "100%" }}
        >
          新建频道
        </Button>
      </div>
      {open ? <ChannelDialog open onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ChannelDialog({
  open,
  onClose,
  channel,
}: {
  open: boolean;
  onClose: () => void;
  channel?: Channel;
}): ReactElement {
  const isEdit = channel !== undefined;
  const [name, setName] = useState(channel?.name ?? "");
  const [topic, setTopic] = useState(channel?.topic ?? "");
  const [kind, setKind] = useState<"text" | "announcement" | "forum">(channel?.kind ?? "text");
  const [busy, setBusy] = useState(false);

  async function save(): Promise<void> {
    if (name.trim().length === 0) return;
    setBusy(true);
    let ok = false;
    if (isEdit) {
      ok = await updateChannelById(channel.id, {
        name: name.trim(),
        topic: topic.length > 0 ? topic : null,
        kind,
      });
    } else {
      const body: {
        name: string;
        topic?: string;
        kind?: "text" | "announcement" | "forum";
      } = {
        name: name.trim(),
        kind,
      };
      if (topic.length > 0) body.topic = topic;
      ok = await createChannel(body);
    }
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "编辑频道" : "新建频道"}
      closeLabel="关闭"
      description={
        isEdit
          ? "可改名、改主题与类型。删除频道请用频道旁的「…」。"
          : "频道用于承载某一主题的实时消息。"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            disabled={busy || name.trim().length === 0}
            onClick={() => void save()}
          >
            {isEdit ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={fieldBlock}>
          <label htmlFor="talk-channel-name" style={fieldLabel}>
            频道名
          </label>
          <Input
            id="talk-channel-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="频道名，如 general / 公告 / 话题"
          />
        </div>
        <div style={fieldBlock}>
          <label htmlFor="talk-channel-topic" style={fieldLabel}>
            主题
          </label>
          <Input
            id="talk-channel-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="主题（显示在消息区顶部，可选）"
          />
        </div>
        <div style={fieldBlock}>
          <span style={fieldLabel}>类型</span>
          <div style={pillGroup}>
            <button
              type="button"
              style={pillStyle(kind === "text")}
              onClick={() => setKind("text")}
            >
              文字
            </button>
            <button
              type="button"
              style={pillStyle(kind === "announcement")}
              onClick={() => setKind("announcement")}
            >
              公告
            </button>
            <button
              type="button"
              style={pillStyle(kind === "forum")}
              onClick={() => setKind("forum")}
            >
              话题
            </button>
          </div>
          <span style={dialogHint}>
            {kind === "text"
              ? "全员自由发言。"
              : kind === "announcement"
                ? "仅所有者/管理员可发，普通成员只读。"
                : "频道里只列话题，点进话题才聊天（24h 无人回复自动归档）。"}
          </span>
        </div>
      </div>
    </Modal>
  );
}

/** 每行的频道管理菜单（改名 / 主题 / 删除；owner/admin 可见） */
export function ChannelRowMenu({ channel }: { channel: Channel }): ReactElement | null {
  const talk = useTalkState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  if (!isModerator(talk.view.community?.myRole)) return null;

  async function remove(): Promise<void> {
    if (!window.confirm(`删除频道 #${channel.name}？其中的消息将一并删除。`)) return;
    const ok = await deleteChannelById(channel.id);
    if (ok) setMenuOpen(false);
  }

  return (
    <>
      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(id) => {
          setMenuOpen(false);
          if (id === "edit") setEditing(true);
          if (id === "delete") void remove();
        }}
        anchor={
          <Button
            size="sm"
            variant="ghost"
            icon={<IconEllipsisOutline16 />}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label={`管理 #${channel.name}`}
          />
        }
        items={[
          { id: "edit", label: "编辑频道", icon: <IconEditOutline16 /> },
          { id: "delete", label: "删除频道", danger: true, icon: <IconTrashOutline16 /> },
        ]}
        portal
      />
      {editing ? <ChannelDialog open channel={channel} onClose={() => setEditing(false)} /> : null}
    </>
  );
}
