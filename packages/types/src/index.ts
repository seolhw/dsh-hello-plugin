/**
 * @dsh-talk/types
 *
 * dsh-talk 全栈共享类型包：
 *  - entities.ts        D1 表对应实体
 *  - api/*              Server REST API 请求/响应 + 路由契约注释
 *  - ws.ts              Server WebSocket 帧协议
 *  - rpc.ts             DSH 插件 client ↔ host 的 RPC 接口
 *
 * 使用方式：
 *   import type { User, Community } from "@dsh-talk/types/entities";
 *   import type { CreateCommunityRequest } from "@dsh-talk/types/api";
 *   import type { ClientFrame, ServerFrame } from "@dsh-talk/types/ws";
 *   import type { TalkHostRpc } from "@dsh-talk/types/rpc";
 */

export * as Api from "./api";
export * from "./entities";
export * from "./rpc";
export * from "./ws";
