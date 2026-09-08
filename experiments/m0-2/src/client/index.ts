/**
 * Browser half (M0-2 experiment). Proves:
 *  1. the bundle executes (document marker set during apply),
 *  2. ctx.locale.register works,
 *  3. ctx.slots.inject('sidebar.footer.action', …) mounts a third-party entry
 *     (list/root, owner props { wide }).
 */
import type { Context as ClientContext } from "@deepseek-ai/cordis";
import { createElement } from "react";

export const name = "dsh-talk-m02";

export const inject = ["slots", "locale"];

const NS = "talk-m02";

function FooterAction(_props: { wide: boolean }): unknown {
  return createElement("button", { "data-talk-m02": "entry" }, "Talk (M02)");
}

export function apply(ctx: ClientContext): void {
  document.documentElement.dataset.talkM02 = "loaded";
  ctx.effect(
    () =>
      ctx.locale.register(NS, {
        zh: { entry: "社区 (M02)" },
        en: { entry: "Talk (M02)" },
      }),
    "m02: dictionaries",
  );
  ctx.effect(
    () =>
      ctx.slots.inject("sidebar.footer.action", () =>
        ctx.slots.register(
          {
            name: "sidebar.footer.action",
            id: "talk-m02-entry",
            order: 10,
            locale: NS,
          },
          FooterAction,
        ),
      ),
    "m02: sidebar entry",
  );
}
