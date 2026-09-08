// ===============================================================
// /api/r2/objects —— 消息附件（Worker 直写 R2，非预签名 S3）
// 上传：client 把文件原始字节 PUT 到 /api/r2/objects
//      （文件名放 X-File-Name，URL 编码；类型放 Content-Type）
// 读取：GET /api/r2/objects/:key 公开但 key 不可枚举（随机 21 位）
// 拿到的 r2Key 作为后续 POST /api/channels/:id/messages 的 attachments[].r2Key
// ===============================================================

/** PUT /api/r2/objects 上传成功后的响应 */
export interface UploadAttachmentResponse {
  /** R2 对象 key（形如 att<21位随机>），创建消息时回填 */
  r2Key: string;
  /** 可公开读取的完整 URL（GET /api/r2/objects/:key） */
  url: string;
  /** 原始文件名（服务端回读） */
  name: string;
  /** 实际写入 R2 的字节数 */
  size: number;
  /** 实际存储的 MIME（回退 application/octet-stream） */
  mimeType: string | null;
}

/** 创建消息时携带的单个附件元数据（先 PUT /api/r2/objects 拿到 r2Key） */
export interface MessageAttachmentPut {
  r2Key: string;
  /** 原始文件名 */
  name: string;
  /** 字节数（仅用于预检，存储时以 R2 实际为准） */
  size: number;
  /** 浏览器侧的 MIME（服务端若缺省则以 R2 存储的为准） */
  mimeType?: string | null;
  /** 图片宽高（可选，预留渲染占位用） */
  width?: number | null;
  height?: number | null;
}
