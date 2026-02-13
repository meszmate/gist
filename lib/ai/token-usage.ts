import { db } from "@/lib/db";
import { tokenUsageLogs } from "@/lib/db/schema";
import { eq, gte, and, sql } from "drizzle-orm";

const DEFAULT_TOKEN_LIMIT = 1_000_000;
const ROLLING_WINDOW_HOURS = 5;

function getTokenLimit(): number {
  const envLimit = process.env.TOKEN_USAGE_LIMIT;
  if (envLimit) {
    const parsed = parseInt(envLimit, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TOKEN_LIMIT;
}

export async function checkTokenLimit(userId: string): Promise<{
  allowed: boolean;
  tokensUsed: number;
  tokenLimit: number;
}> {
  const tokenLimit = getTokenLimit();
  const windowStart = new Date(Date.now() - ROLLING_WINDOW_HOURS * 60 * 60 * 1000);

  const [result] = await db
    .select({
      total: sql<number>`coalesce(sum(${tokenUsageLogs.tokensUsed}), 0)`,
    })
    .from(tokenUsageLogs)
    .where(
      and(
        eq(tokenUsageLogs.userId, userId),
        gte(tokenUsageLogs.createdAt, windowStart)
      )
    );

  const tokensUsed = Number(result.total);

  return {
    allowed: tokensUsed < tokenLimit,
    tokensUsed,
    tokenLimit,
  };
}

export async function logTokenUsage(
  userId: string,
  usage: { total_tokens: number; prompt_tokens?: number; completion_tokens?: number } | null,
  operation: string,
  model?: string
): Promise<void> {
  if (!usage || usage.total_tokens <= 0) return;

  await db.insert(tokenUsageLogs).values({
    userId,
    tokensUsed: usage.total_tokens,
    promptTokens: usage.prompt_tokens ?? null,
    completionTokens: usage.completion_tokens ?? null,
    operation,
    model: model ?? null,
  });
}
