// ================================================================
// Drizzle 初始化（D1 driver）
// 注：本地 SQLite（better-sqlite3）不在这里静态依赖——需要原生编译，
//     Worker 运行期用不到；drizzle-kit 的本地连接/studio 需要时再按需安装。
// ================================================================

import type { D1Database } from "@cloudflare/workers-types";
import { type DrizzleD1Database, drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";

export type Db = DrizzleD1Database<typeof schema>;

/** Worker 内使用：接收 env.DB（D1 binding） */
export function createDbForWorker(d1: D1Database): Db {
  return drizzleD1(d1, { schema }) as Db;
}

export { schema };
