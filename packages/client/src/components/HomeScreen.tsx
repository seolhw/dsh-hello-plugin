// ================================================================
// 主工作区：社区栏 | 频道列表 | 聊天面板（含实时状态与输入框）
// 具体区块与弹窗见同目录下的 CommunitiesRail / ChannelList / ChatPane
// / ThreadModals / SearchModals / CommunityAddModal / ShareModals / ProfileModal。
// ================================================================

import type { ReactElement } from "react";
import { useState } from "react";
import { openInbox, useTalkState } from "../store";
import { ChannelList } from "./ChannelList";
import { ChatPane } from "./ChatPane";
import { CommunitiesRail } from "./CommunitiesRail";
import { CommunityAddModal } from "./CommunityAddModal";
import { chatCol, emptyCard, messageRowCss } from "./homeStyles";
import { InboxDialog } from "./Inbox";
import { ProfileModal } from "./ProfileModal";
import { BrandLogo, smallText } from "./styles";
import { ThreadCreateModal } from "./ThreadModals";

// ---------------- 主出口（整页三栏，无独立浮层外壳） ----------------

export function HomeScreen(): ReactElement {
  const talk = useTalkState();
  const [showAdd, setShowAdd] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
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
        onOpenProfile={() => setShowProfile(true)}
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
      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
      <InboxDialog />
    </div>
  );
}
