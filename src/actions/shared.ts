import { ForbiddenError, UnauthorizedError } from "@/lib/session";
import { logger } from "@/lib/logger";
import { AIProviderError } from "@/services/ai/types";

export type ActionResult<T = undefined> =
  { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** Turn thrown errors into a safe, user-facing ActionResult. */
export async function safeAction<T>(name: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "Please sign in." };
    if (error instanceof ForbiddenError)
      return { ok: false, error: "You do not have access to this workspace." };
    if (error instanceof AIProviderError) return { ok: false, error: error.message };
    if (error && typeof error === "object" && "digest" in error) throw error; // Next redirect
    logger.error("action.failed", { action: name, error });
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export function zodFieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const out: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
