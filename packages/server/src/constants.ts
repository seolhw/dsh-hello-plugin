// ================================================================
// 业务静态常量（不通过环境变量注入；需要调整时直接改这里）
// 原 wrangler.toml [vars] 的配置项迁到这里，保持配置面最小化。
// ================================================================

/** 每用户每天可创建社区的个数上限 */
export const COMMUNITY_CREATE_DAILY_LIMIT = 3;

/** 每用户最多可加入的社区数（含自建） */
export const MAX_COMMUNITIES_PER_USER = 10;

/** 管理员 @handle 列表（空 = 尚未指定管理员） */
export const ADMIN_HANDLES: readonly string[] = [];

/** 单条消息最大长度（字符） */
export const MAX_MESSAGE_LENGTH = 4000;

/** 单个附件最大字节数（25 MiB；走 Worker 直写 R2 的单次 PUT 上限内） */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/** 一条消息最多携带的附件数 */
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;

/** 附件原始文件名最大长度（字符） */
export const MAX_ATTACHMENT_NAME = 200;

/** 分享包最大字节数（50 MiB） */
export const MAX_SHARE_BYTES = 50 * 1024 * 1024;

/** 讨论组自动归档：24 小时无新消息即归档（有人再发言自动恢复活跃） */
export const THREAD_AUTO_ARCHIVE_MS = 24 * 60 * 60 * 1000;

/** 讨论组名称最大长度（字符） */
export const THREAD_NAME_MAX = 80;

/** 从消息发起讨论时，name/摘要最多截取多少字符 */
export const THREAD_STARTER_SNIPPET_MAX = 100;
