/**
 * Minimal structured (JSON lines) logger.
 *
 * - Never logs secrets: keys matching SENSITIVE_KEY are redacted.
 * - Levels: debug < info < warn < error (LOG_LEVEL env).
 * - Kept dependency-free on purpose.
 */
type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const SENSITIVE_KEY = /(key|secret|token|password|authorization|cookie|passwordhash)/i;

function currentLevel(): number {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
  return LEVELS[raw] ?? LEVELS.info;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function emit(level: Level, event: string, fields?: Record<string, unknown>) {
  if (LEVELS[level] < currentLevel()) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    event,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}

export const logger = {
  debug: (event: string, fields?: Record<string, unknown>) => emit("debug", event, fields),
  info: (event: string, fields?: Record<string, unknown>) => emit("info", event, fields),
  warn: (event: string, fields?: Record<string, unknown>) => emit("warn", event, fields),
  error: (event: string, fields?: Record<string, unknown>) => emit("error", event, fields),
};

/** Measure the duration of an async operation and log it. */
export async function timed<T>(
  event: string,
  fields: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logger.info(event, { ...fields, latencyMs: Date.now() - start, ok: true });
    return result;
  } catch (error) {
    logger.error(event, { ...fields, latencyMs: Date.now() - start, ok: false, error });
    throw error;
  }
}
