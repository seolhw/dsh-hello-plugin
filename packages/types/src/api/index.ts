// ---------------------------------------------------------------
// Server REST API 类型总入口
// ---------------------------------------------------------------

export * from "./auth";
export * from "./common";
export * from "./communities";
export * from "./inbox";
export * from "./messages";
export * from "./r2";
export * from "./shares";

// ---------------------------------------------------------------
// 路由总表（仅供人阅读的「契约目录」，非运行时用）
// 实际实现在 server/src/worker.ts
// ---------------------------------------------------------------

/**
 * 路由契约（方法 + 路径 → 请求/响应类型）
 *
 *  认证（由 Better Auth 提供，路径都在 /api/auth 下；会话 = Bearer Token）
 *   POST  /api/auth/sign-up/email       邮箱注册（用户名可选）
 *   POST  /api/auth/sign-in/email       邮箱登录
 *   POST  /api/auth/sign-in/username    用户名登录（username 插件）
 *   POST  /api/auth/sign-out            登出（吊销会话）
 *   GET   /api/auth/get-session         当前会话（user + session）
 *   POST  /api/auth/change-password     修改密码
 *   POST  /api/auth/update-user         改资料 / 改用户名
 *   POST  /api/auth/send-verification-email      重发验证邮件
 *   POST  /api/auth/request-password-reset       忘记密码（发重置邮件）
 *   POST  /api/auth/reset-password      用 token 重设密码
 *   （登录/注册成功后，响应头 set-auth-token 即会话 token）
 *
 *  社区
 *   GET   /api/communities/discover   query:DiscoverCommunitiesQuery  → DiscoverCommunitiesResponse
 *   GET   /api/communities/mine       —                                → GetMyCommunitiesResponse
 *   POST  /api/communities            CreateCommunityRequest           → CreateCommunityResponse
 *   GET   /api/communities/:id        —                                → GetCommunityResponse
 *   PATCH /api/communities/:id        UpdateCommunityRequest           → UpdateCommunityResponse
 *   POST  /api/communities/join-by-code      JoinByInviteRequest       → JoinByInviteResponse
 *   POST  /api/communities/:id/join   —                                → JoinCommunityResponse
 *   POST  /api/communities/:id/leave  —                                → LeaveCommunityResponse
 *   DELETE /api/communities/:id       —                                → DeleteCommunityResponse
 *
 *  频道
 *   POST  /api/communities/:id/channels  CreateChannelRequest       → CreateChannelResponse
 *   PATCH /api/channels/:id              UpdateChannelRequest       → UpdateChannelResponse
 *   DELETE /api/channels/:id             —                         → DeleteChannelResponse
 *
 *  成员
 *   GET   /api/communities/:id/members        query:ListMembersQuery   → ListMembersResponse
 *   PATCH /api/communities/:id/members/:userId/role  UpdateMemberRoleRequest → UpdateMemberRoleResponse
 *   DELETE /api/communities/:id/members/:userId      —                 → RemoveMemberResponse
 *
 *  邀请 / 站内信
 *   POST  /api/communities/:id/invites   CreateInviteRequest       → CreateInviteResponse
 *   POST  /api/invites/:id/accept        —                         → AcceptInviteResponse
 *   POST  /api/invites/:id/decline       —                         → DeclineInviteResponse
 *   GET   /api/notifications             query:ListNotificationsQuery → ListNotificationsResponse
 *   POST  /api/notifications/:id/read    —                         → MarkNotificationReadResponse
 *   POST  /api/notifications/read-all    —                         → MarkAllNotificationsReadResponse
 *
 *  消息
 *   GET    /api/channels/:id/messages          query:ListMessagesQuery  → ListMessagesResponse
 *   POST   /api/channels/:id/messages          CreateMessageRequest     → CreateMessageResponse
 *   PATCH  /api/messages/:id                   UpdateMessageRequest     → UpdateMessageResponse
 *   DELETE /api/messages/:id                   —                        → DeleteMessageResponse
 *   POST   /api/messages/:id/resolve           ResolveHelpRequest       → ResolveHelpResponse
 *
 *  未读
 *   GET    /api/channels/:id/read-state        —                        → GetReadStateResponse
 *   POST   /api/channels/:id/read-state        UpdateReadStateRequest   → UpdateReadStateResponse
 *
 *  分享（会话快照）
 *   GET    /api/shares/discover              query:ListSharesQuery      → ListSharesResponse
 *   GET    /api/shares/mine                  query:ListMySharesQuery    → ListMySharesResponse
 *   POST   /api/shares/snapshot              CreateShareRequest         → CreateShareResponse
 *   GET    /api/shares/:id                   —                          → GetShareResponse
 *   DELETE /api/shares/:id                   —                          → DeleteShareResponse
 *
 *  附件（R2，Worker 直写）
 *   PUT   /api/r2/objects              原始字节 body + X-File-Name(URL 编码)
 *                                      + Content-Type → UploadAttachmentResponse
 *   GET   /api/r2/objects/:key         公开读取（key 不可枚举）；?download=1 触发下载
 *
 *  WebSocket 升级
 *   GET    /ws                               Upgrade header             → WebSocket 连接
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const _ROUTE_CONTRACT: unique symbol;
