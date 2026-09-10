// ===============================================================
// DSH 插件：client（浏览器） ↔ host（Node.js）  RPC 契约
//
// 调用方式：
//   client 侧通过 DSH 的 remote 机制调用：
//     const r = await ctx.remote['dsh-talk'].cloneSession({ shareId, downloadUrl })
//   host 侧在 apply(ctx) 中通过 ctx.on/ctx.inject 暴露方法，方法签名和此文件一致。
//
// 命名约定（一个文件内把所有方法定义成 interface，client 侧 Pick 用，host 侧 implements 用）
// ===============================================================

import type { Share, TimestampMs } from "./entities";

// ---------- 通用 RPC 结果包装 ----------

/** 耗时任务的进度事件（client 订阅 host 的 event 得到） */
export interface RpcProgress {
  stage: "downloading" | "verifying" | "extracting" | "writing-session" | "indexing" | "running";
  /** 0-1 */
  percent?: number | null;
  message?: string | null;
  /** 当前字节数（下载/解压时） */
  bytesDone?: number;
  bytesTotal?: number;
}

export interface RpcError {
  code:
    | "USER_CANCELLED"
    | "NETWORK_ERROR"
    | "CHECKSUM_MISMATCH"
    | "MANIFEST_INVALID"
    | "DSH_API_ERROR"
    | "QUOTA_EXCEEDED"
    | "INTERNAL";
  message: string;
  details?: Record<string, unknown>;
}

// ---------- 1. 配置读写（client 拿 token/serverUrl 这些） ----------

export interface TalkSettings {
  serverUrl: string;
  /** Better Auth username 的本地回显缓存（@handle），不再参与认证 */
  handle: string;
  /** Better Auth 会话 token（secret）：登录成功 set-auth-token 得到，client 请求 Server 时带 Bearer */
  token: string;
  autoReconnect: boolean;
  share: {
    maxSizeMb: number;
  };
}

export interface SettingsRpc {
  /** 读当前设置（合并默认值 + 用户覆盖） */
  "talk.settings.get"(): Promise<TalkSettings>;

  /** 写部分设置（patch 语义） */
  "talk.settings.set"(patch: Partial<TalkSettings>): Promise<TalkSettings>;

  /** 订阅设置变更（host 用 DSH 的 ctx.settings.watch 来触发），
   *  调用方式上 client 拿到的是一个事件流接口，MVP 先定义成纯类型 */
  "talk.settings.watch"?(): AsyncIterable<TalkSettings>;
}

// ---------- 1.5 本地克隆（HTTP：host /api/talk/clone + /api/talk/clones） ----------

/** GET /api/talk/clones —— 本地克隆目录与已克隆文件列表 */
export interface HostClonesStatus {
  dir: string;
  items: Array<{
    /** 文件名（相对 dir） */
    file: string;
    bytes: number;
    modifiedAt: TimestampMs;
  }>;
}

/** POST /api/talk/clone —— 让 host 下载分享包；DSH 会话包会直接还原成本地会话 */
export interface HostCloneRequest {
  /** 分享包下载地址（share 的 downloadUrl，GET /api/r2/objects/…?download=1） */
  downloadUrl: string;
  /** 还原会话用的工作区绝对路径；缺省用 host 进程 cwd */
  cwd?: string;
}

export interface HostCloneResult {
  /** 落盘绝对路径（会话包直接还原、不留文件，此时为空） */
  file?: string;
  bytes: number;
  elapsedMs: number;
  /** 会话包还原出的新会话 id；频道快照等非会话包为 undefined */
  sessionId?: string;
}

// ---------- 1.6 本地 DSH 会话（HTTP：host /api/talk/sessions + /api/talk/session-package） ----------

/** 可供分享的本机会话（来自 DSH 会话持久化层的 header） */
export interface LocalSessionSummary {
  id: string;
  /** 会话创建时的工作区绝对路径 */
  cwd?: string;
  createdAt: number;
  /** seed 来源会话（fork / 克隆谱系） */
  parentSession?: string;
}

/** GET /api/talk/sessions —— 本机可分享的会话列表 */
export interface HostSessionsStatus {
  sessions: LocalSessionSummary[];
}

/** 会话包 manifest 快照（随 share 存库，供卡片展示与克隆校验） */
export interface AgentSessionPackageManifest {
  /** JSON 袋：可直接透传给 Share.manifest（Record<string, unknown>） */
  [key: string]: unknown;
  /** 包格式版本 */
  packageVersion: number;
  /** 来源机器上的 DSH 会话 id */
  sessionId: string;
  /** 来源工作区绝对路径 */
  cwd?: string;
  /** DSH 会话 header 的格式版本 */
  sessionVersion: number;
  eventCount: number;
  createdAt: number;
}

/** GET /api/talk/session-package?sessionId=… 返回的包体（application/json） */
export interface AgentSessionPackage {
  /** 包类型标记：host 据此把下载到的包识别为会话包并还原 */
  kind: "agent-session";
  manifest: AgentSessionPackageManifest;
  /** DSH 会话 header 快照（保留 lineage） */
  header: {
    version: number;
    id: string;
    createdAt: number;
    cwd?: string;
    parentSession?: string;
    seedLength?: number;
  };
  /** 会话事件（append-only、lossless JSON） */
  events: unknown[];
}

// ---------- 2. 会话克隆（核心能力） ----------

/** 克隆前：client 先让 host 检查一下能不能做（磁盘、版本等），顺便让用户弹确认框 */
export interface CloneSessionPreviewRequest {
  /** 分享元数据（GetShareResponse 里拿的，host 做 manifest 校验） */
  share: Pick<Share, "id" | "kind" | "manifest" | "sizeBytes" | "sha256">;
}

export interface CloneSessionPreview {
  ok: boolean;
  /** 预估磁盘占用 bytes */
  estimatedSizeBytes: number;
  /** 需要哪些用户确认（逐条展示给用户，勾选确认后才能 clone） */
  confirmations: CloneConfirmationItem[];
  /** 包体版本校验：host 认识不？false = 可能需要升级插件 */
  manifestCompatible: boolean;
  warning?: string;
}

export interface CloneConfirmationItem {
  id: "include-attachments" | "overwrite-existing" | "run-unsigned-script";
  label: string;
  description?: string;
  required: boolean;
}

export interface CloneSessionRequest {
  shareId: string;
  /** GetShareResponse 返回的预签名下载 URL；host 直接从 Cloudflare R2 拉，不走 client */
  downloadUrl: string;
  expectedSha256?: string | null;
  /** 预览里用户勾选了哪些 confirmation id */
  confirmed: string[];
  /** 克隆后的会话显示名（默认用分享的 title） */
  sessionTitle?: string | null;
}

export interface CloneSessionResult {
  /** 新会话 id；client 用 ctx.sessions.open(sessionId) 切到它 */
  sessionId: string;
  /** 克隆耗时 ms */
  elapsedMs: number;
  /** 最终落盘 bytes */
  sizeBytes: number;
  /** 克隆的消息条数/子会话数（manifest 里拆出来的） */
  stats: {
    messages: number;
    subSessions?: number;
    attachments?: number;
  };
}

// ---------- 3. 会话打包 & 上传分享（host 端也做，因为要读本地 DSH 会话） ----------

export interface PackageSessionRequest {
  sessionId: string;
  /** 是否把附件一起打进包里；默认 false（隐私） */
  includeAttachments?: boolean;
  /** 是否把子会话也打包；默认 true */
  includeSubSessions?: boolean;
  /** 压缩级别 1-9，默认 6 */
  compressLevel?: number;
}

export interface PackageSessionResult {
  /** host 侧暂存到的本地路径（R2 上传前先存本地 tmp） */
  localPath: string;
  sizeBytes: number;
  sha256: string;
  elapsedMs: number;
  manifest: Record<string, unknown>;
  /** 打包内容摘要，展示在卡片上 */
  summary: {
    messages: number;
    subSessions?: number;
    attachments?: number;
    durationMs?: number;
  };
}

/** 打包好的本地文件 → host 自己用预签名 URL 直传 R2（返回 r2Key 给 client 去 POST /api/shares 落库） */
export interface UploadSharePackageRequest {
  /** PackageSessionResult 返回的本地路径（host 打包后暂存） */
  localPath: string;
  /** 预签名上传 URL + headers（client 调 /api/r2/sign-upload 拿到后转 host） */
  uploadUrl: string;
  requiredHeaders: Record<string, string>;
  expectedSizeBytes: number;
  expectedSha256?: string | null;
}

export interface UploadSharePackageResult {
  sizeBytes: number;
  sha256: string;
  elapsedMs: number;
}

// ---------- 5. 本地草稿 / 缓存（简单 CRUD，MVP 先给基础能力） ----------

export interface DraftMessage {
  id: string;
  channelId: string;
  content: string;
  /** 附件草稿：本地文件路径列表（上传了的 r2Key / 未上传的本地路径都先记着） */
  attachmentDrafts?: Array<
    | { status: "local"; path: string; name: string; size: number; mimeType?: string }
    | { status: "uploaded"; r2Key: string; name: string; size: number; mimeType?: string }
  >;
  updatedAt: TimestampMs;
}

export interface CacheRpc {
  "talk.cache.draft.list"(): Promise<DraftMessage[]>;
  "talk.cache.draft.get"(channelId: string): Promise<DraftMessage | null>;
  "talk.cache.draft.set"(draft: DraftMessage): Promise<void>;
  "talk.cache.draft.delete"(channelId: string): Promise<void>;
}

// ---------- 总聚合：host 需要暴露的所有方法 ----------

export interface TalkHostRpc extends SettingsRpc, CacheRpc {
  // --- 克隆 ---
  "talk.clone.preview"(req: CloneSessionPreviewRequest): Promise<CloneSessionPreview>;
  "talk.clone.run"(req: CloneSessionRequest): Promise<CloneSessionResult>;
  /** 流式报告进度；client 订阅（MVP 可选实现，先定义接口） */
  "talk.clone.stream"?(
    req: CloneSessionRequest,
  ): AsyncIterable<
    | { type: "progress"; data: RpcProgress }
    | { type: "done"; data: CloneSessionResult }
    | { type: "error"; data: RpcError }
  >;

  // --- 分享打包 & 上传 ---
  "talk.share.packageSession"(req: PackageSessionRequest): Promise<PackageSessionResult>;
  "talk.share.uploadPackage"(req: UploadSharePackageRequest): Promise<UploadSharePackageResult>;
  /** 上传后清临时文件 */
  "talk.share.cleanupTemp"(localPath: string): Promise<void>;
}

// ---------- client 侧「类型化调用」辅助：只取方法名与返回类型 ----------

export type TalkHostMethodName = keyof TalkHostRpc;
