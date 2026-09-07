import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/auth";
import { assertWorkspaceAccess } from "@/db/workspaces";
import { chatRequestSchema } from "@/domain/schemas";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { ForbiddenError } from "@/lib/session";
import { AIProviderError } from "@/services/ai/types";
import { runDiscoveryTurn, type TurnEvent } from "@/services/discovery/turn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/workspaces/:workspaceId/chat
 * Streams NDJSON `TurnEvent`s. Authenticated, workspace-scoped, rate limited.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { workspaceId } = await ctx.params;

  const env = getEnv();
  const limit = checkRateLimit(
    `chat:${userId}`,
    env.AI_RATE_LIMIT_MAX,
    env.AI_RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!limit.allowed) {
    logger.warn("chat.rate_limited", { userId, workspaceId });
    return NextResponse.json(
      { error: `Too many AI requests. Try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    await assertWorkspaceAccess(userId, workspaceId);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw error;
  }

  const body = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TurnEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        for await (const event of runDiscoveryTurn({
          workspaceId,
          message: body.data.message,
          entryMode: body.data.entryMode,
          signal: request.signal,
        })) {
          send(event);
        }
      } catch (error) {
        logger.error("chat.turn_failed", { userId, workspaceId, error });
        const message =
          error instanceof AIProviderError
            ? error.message
            : "The discovery turn failed. Please retry.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
