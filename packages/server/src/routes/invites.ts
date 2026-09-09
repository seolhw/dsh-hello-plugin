// ================================================================
// /api/invites/:id/* —— 接受 / 拒绝社区邀请
//   仅被邀请人本人可处理；处理成功即入会（成员 role=member），
//   同时把对应 pending 邀请收尾、站内信标已读。
// ================================================================

import type { AcceptInviteResponse } from "@dsh-talk/types/api";
import type { MemberRole } from "@dsh-talk/types/entities";
import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { channels, communities, communityMembers, type InviteRow, invites } from "../db/schema";
import { getMembership, requireNotBanned } from "../lib/access";
import { createBearerAuth, requireUserId } from "../lib/auth";
import { db as dbOf } from "../lib/db";
import { HttpApiError } from "../lib/errors";
import { finalizePendingInvites } from "../lib/invites";
import { emptyOk } from "../lib/response";
import type { Env, HonoAppVariables } from "../types";

const invitesApi = new Hono<{ Bindings: Env; Variables: HonoAppVariables }>();

export const invitesRoutes = invitesApi;

invitesApi.use("*", createBearerAuth("required"));

async function loadInviteOr404(db: ReturnType<typeof dbOf>, inviteId: string): Promise<InviteRow> {
  const row = (await db.select().from(invites).where(eq(invites.id, inviteId)).limit(1))[0];
  if (!row) throw new HttpApiError(404, "INVITE_INVALID", "邀请不存在或已被撤销");
  return row;
}

async function listChannels(db: ReturnType<typeof dbOf>, communityId: string) {
  return db
    .select()
    .from(channels)
    .where(eq(channels.communityId, communityId))
    .orderBy(asc(channels.position));
}

// --- POST /:id/accept —— 接受邀请并加入社区 ---
invitesApi.post("/:id/accept", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const invite = await loadInviteOr404(db, c.req.param("id"));
  if (invite.inviteeUserId !== userId) {
    throw new HttpApiError(403, "INVITE_INVALID", "只有被邀请人可以处理这条邀请");
  }
  if (invite.status !== "pending") {
    throw new HttpApiError(409, "INVITE_INVALID", "该邀请已处理，无需重复操作");
  }
  const communityRow = (
    await db.select().from(communities).where(eq(communities.id, invite.communityId)).limit(1)
  )[0];
  if (!communityRow) {
    throw new HttpApiError(404, "INVITE_INVALID", "邀请的社区不存在或已删除");
  }

  const existing = await getMembership(db, communityRow.id, userId);
  if (!existing) {
    await requireNotBanned(db, communityRow.id, userId);
    await db.insert(communityMembers).values({
      communityId: communityRow.id,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
    await db
      .update(communities)
      .set({ memberCount: communityRow.memberCount + 1 })
      .where(eq(communities.id, communityRow.id));
  }
  await finalizePendingInvites(db, communityRow.id, userId, "accepted");

  const chans = await listChannels(db, communityRow.id);
  const role = (existing?.role ?? "member") as MemberRole;
  const body: AcceptInviteResponse = {
    id: communityRow.id,
    name: communityRow.name,
    slug: communityRow.slug,
    description: communityRow.description,
    privacy: communityRow.privacy,
    ownerId: communityRow.ownerId,
    iconUrl: communityRow.iconUrl,
    bannerUrl: communityRow.bannerUrl,
    inviteCode: communityRow.inviteCode,
    memberCount: communityRow.memberCount + (existing ? 0 : 1),
    createdAt: communityRow.createdAt,
    updatedAt: communityRow.updatedAt,
    channels: chans,
    myRole: role,
  };
  return c.json(body);
});

// --- POST /:id/decline —— 拒绝邀请 ---
invitesApi.post("/:id/decline", async (c) => {
  const db = dbOf(c);
  const userId = requireUserId(c);
  const invite = await loadInviteOr404(db, c.req.param("id"));
  if (invite.inviteeUserId !== userId) {
    throw new HttpApiError(403, "INVITE_INVALID", "只有被邀请人可以处理这条邀请");
  }
  if (invite.status !== "pending") {
    throw new HttpApiError(409, "INVITE_INVALID", "该邀请已处理，无需重复操作");
  }
  await finalizePendingInvites(db, invite.communityId, userId, "declined");
  return emptyOk(c);
});
