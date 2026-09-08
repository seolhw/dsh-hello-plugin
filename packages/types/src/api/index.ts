// ---------------------------------------------------------------
// Hub REST API 类型总入口
// ---------------------------------------------------------------

export * from "./auth";
export * from "./common";
export * from "./communities";
export * from "./messages";
export * from "./shares";

// ---------------------------------------------------------------
// 路由总表（仅供人阅读的「契约目录」，非运行时用）
// 实际实现在 server/src/worker.ts
// ---------------------------------------------------------------

/**
 * 路由契约（方法 + 路径 → 请求/响应类型）
 *
 *  认证
 *   POST  /api/auth/exchange-invite   ExchangeInviteRequest  → ExchangeInviteResponse
 *   GET   /api/auth/me                —                      → GetMeResponse
 *   PATCH /api/auth/me                UpdateMeRequest        → UpdateMeResponse
 *   POST  /api/auth/logout            —                      → LogoutResponse
 *
 *  社区
 *   GET   /api/communities/discover   query:DiscoverCommunitiesQuery  → DiscoverCommunitiesResponse
 *   GET   /api/communities/mine       —                                → GetMyCommunitiesResponse
 *   POST  /api/communities            CreateCommunityRequest           → CreateCommunityResponse
 *   GET   /api/communities/:id        —                                → GetCommunityResponse
 *   PATCH /api/communities/:id        UpdateCommunityRequest           → UpdateCommunityResponse
 *   POST  /api/communities/:id/rotate-invite  RotateInviteRequest      → RotateInviteResponse
 *   POST  /api/communities/join-by-code      JoinByInviteRequest       → JoinByInviteResponse
 *   POST  /api/communities/:id/join   —                                → JoinCommunityResponse
 *   POST  /api/communities/:id/leave  —                                → LeaveCommunityResponse
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
 *  分享
 *   GET    /api/shares/discover              query:ListSharesQuery      → ListSharesResponse
 *   GET    /api/shares/mine                  query:ListMySharesQuery    → ListMySharesResponse
 *   POST   /api/shares                       CreateShareRequest         → CreateShareResponse
 *   GET    /api/shares/:id                   —                          → GetShareResponse
 *   DELETE /api/shares/:id                   —                          → DeleteShareResponse
 *
 *  R2 通用签名
 *   POST   /api/r2/sign-upload               R2SignedUploadRequest      → R2SignedUploadResponse
 *
 *  WebSocket 升级
 *   GET    /ws                               Upgrade header             → WebSocket 连接
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const _ROUTE_CONTRACT: unique symbol;
