// ================================================================
// 类型化 slot 接入层：仅为了把 DSH 官方表面的 `declare module` 合并
// （SlotMap / Context 增强）拉进本插件的编译，从而拿到
// 'sidebar.footer.action'、'shell.overlay' 等键的强类型。
// 运行期没有任何代码从这里加载。
// ================================================================

import type { ILayout } from "@deepseek-ai/dsh-client-ui-layout/client";
import type {
  SidebarFooterActionOwnerProps,
  SidebarSettingsOwnerProps,
} from "@deepseek-ai/dsh-client-ui-sidebar/client";

export type { ILayout, SidebarFooterActionOwnerProps, SidebarSettingsOwnerProps };
