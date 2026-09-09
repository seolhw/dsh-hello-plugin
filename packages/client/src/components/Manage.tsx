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
  IconRefreshOutline16,
  IconTrashOutline16,
  IconUserOutline16,
  Input,
  Menu,
  Modal,
  writeClipboard,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { Channel, MemberRole, User } from "@dsh-talk/types/entities";
import type { CSSProperties, ReactElement } from "react";
import { useEffect, useState } from "react";
import {
  createChannel,
  deleteChannelById,
  kickMember,
  leaveCommunity,
  listMembers,
  notify,
  rotateInvite,
  setMemberRole,
  updateChannelById,
  updateCommunity,
  uploadImage,
  useTalkState,
} from "../store";
import { Avatar, AvatarPicker, palette, smallText } from "./styles";

const isModerator = (role: MemberRole | null | undefined): boolean =>
  role === "owner" || role === "admin";

const roleColor: Record<MemberRole, string> = {
  owner: "var(--dsw-alias-state-warn-primary)",
  admin: "var(--dsw-alias-state-business-primary)",
  member: palette.muted,
};

const roleName: Record<MemberRole, string> = { owner: "所有者", admin: "管理员", member: "成员" };

// ---------- 与登录/注册一致的共享样式 ----------

/** 分段选择组容器（对齐 AuthScreen 的 Segmented 控件）：圆角外壳 + 内部激活键 */
const pillGroup: CSSProperties = {
  display: "flex",
  gap: 2,
  padding: 3,
  borderRadius: 10,
  background: palette.inputBg,
  border: `1px solid ${palette.border}`,
};

/** 分段选择组内的单个键 */
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

/** 表单字段纵向容器 */
const fieldBlock: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

/** 字段小标签 */
const fieldLabel: CSSProperties = {
  fontSize: 12,
  color: palette.muted,
  fontWeight: 500,
};

/** 弹窗说明文字 */
const dialogHint: CSSProperties = {
  fontSize: 11.5,
  color: palette.caption,
  lineHeight: 1.6,
};

type CommunityDialog = null | "members" | "invite" | "settings";

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
      { id: "invite", label: "邀请码", icon: <IconCopyOutline16 /> },
      { id: "settings", label: "社区设置", icon: <IconEditOutline16 /> },
      { type: "separator", id: "sep" },
    );
  }
  menuItems.push({ id: "leave", label: "退出社区", danger: true, icon: <IconTrashOutline16 /> });

  return (
    <>
      <Menu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(id) => {
          setMenuOpen(false);
          if (id === "members" || id === "invite" || id === "settings") setDialog(id);
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
      {dialog === "invite" ? <InviteDialog open onClose={() => setDialog(null)} /> : null}
      {dialog === "settings" ? <SettingsDialog open onClose={() => setDialog(null)} /> : null}
    </>
  );
}

/** 邀请码展示 / 复制 / 轮换（owner/admin 可轮换；码对所有成员可见） */
function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const talk = useTalkState();
  const community = talk.view.community;
  const code = community?.inviteCode ?? "";
  const moder = isModerator(community?.myRole);
  const [busy, setBusy] = useState(false);

  async function copy(): Promise<void> {
    await writeClipboard(code);
    notify("邀请码已复制");
  }
  async function rotate(): Promise<void> {
    setBusy(true);
    const next = await rotateInvite();
    setBusy(false);
    if (next) await copyToClipboard(next);
  }
  async function copyToClipboard(value: string): Promise<void> {
    await writeClipboard(value);
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
          {moder ? (
            <Button
              variant="ghost"
              icon={<IconRefreshOutline16 />}
              disabled={busy}
              onClick={() => void rotate()}
            >
              换新码
            </Button>
          ) : null}
        </div>
        <span style={dialogHint}>所有成员均可查看，仅所有者/管理员可换新码。</span>
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

type MemberRow = { user: User; role: MemberRole; joinedAt: number };

/** 成员管理（owner/admin） */
function MembersDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement {
  const talk = useTalkState();
  const me = talk.me;
  const myRole = talk.view.community?.myRole ?? null;
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isOwner = myRole === "owner";
  const moder = isModerator(myRole);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void listMembers().then((items) => {
      setMembers(items as MemberRow[]);
      setLoading(false);
    });
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
              <div
                key={m.user.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 10,
                  background: palette.inputBg,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <Avatar label={m.user.handle} src={m.user.avatarUrl} />
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
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
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
  const [kind, setKind] = useState<"text" | "announcement">(channel?.kind ?? "text");
  const [isHelp, setIsHelp] = useState(channel?.isHelp ?? false);
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
        isHelp,
      });
    } else {
      const body: {
        name: string;
        topic?: string;
        kind?: "text" | "announcement";
        isHelp?: boolean;
      } = {
        name: name.trim(),
        kind,
        isHelp,
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
          : "和 Discord 一样，频道用于承载某一主题的实时消息。"
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
            placeholder="频道名，如 general / help"
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
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ ...fieldBlock, flex: 1 }}>
            <span style={fieldLabel}>类型</span>
            <div style={pillGroup}>
              <button
                type="button"
                style={{ ...pillKey, ...(kind === "text" ? pillKeyActive : {}) }}
                onClick={() => setKind("text")}
              >
                文字
              </button>
              <button
                type="button"
                style={{ ...pillKey, ...(kind === "announcement" ? pillKeyActive : {}) }}
                onClick={() => setKind("announcement")}
              >
                公告
              </button>
            </div>
          </div>
          <div style={{ ...fieldBlock, flex: 1 }}>
            <span style={fieldLabel}>属性</span>
            <div style={pillGroup}>
              <button
                type="button"
                style={{ ...pillKey, ...(isHelp ? pillKeyActive : {}) }}
                onClick={() => setIsHelp((v) => !v)}
              >
                求助频道
              </button>
            </div>
          </div>
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
