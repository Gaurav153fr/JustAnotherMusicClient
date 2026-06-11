import { invoke } from "@tauri-apps/api/core";

type LogLevel = "debug" | "info" | "warn" | "error";

const sessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let sequence = 0;

function safeStringify(value: unknown, maxLen = 4000): string {
  const seen = new WeakSet<object>();
  const json = JSON.stringify(
    value,
    (_key, v) => {
      if (v instanceof Error) {
        return {
          name: v.name,
          message: v.message,
          stack: v.stack,
          cause: (v as { cause?: unknown }).cause,
        };
      }
      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[Circular]";
        seen.add(v);
      }
      if (typeof v === "bigint") return v.toString();
      return v;
    },
    2,
  );

  if (typeof json !== "string") return String(json);
  if (json.length <= maxLen) return json;
  return `${json.slice(0, maxLen)}\n…(truncated ${json.length - maxLen} chars)…`;
}

function normalizeError(error: unknown): Record<string, unknown> | unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // `Error.cause` depends on TS lib target; keep it safe across configs.
      cause: (error as { cause?: unknown }).cause,
    };
  }
  if (typeof error === "object" && error !== null) {
    // Some libraries throw non-Error objects with non-enumerable properties.
    const record: Record<string, unknown> = {
      type: Object.prototype.toString.call(error),
    };
    try {
      for (const key of Object.getOwnPropertyNames(error)) {
        record[key] = (error as Record<string, unknown>)[key];
      }
    } catch {
      // ignore
    }
    try {
      // Provide a best-effort string form for quick scanning in logs.
      record.string = String(error);
    } catch {
      // ignore
    }
    return record;
  }
  return error;
}

function writeInternalLog(level: LogLevel, context: string, extra?: Record<string, unknown>) {
  sequence += 1;
  const payload = {
    timestamp: new Date().toISOString(),
    sessionId,
    sequence,
    context,
    ...extra,
  };
  const payloadText = safeStringify(payload);
  void invoke("frontend_log", {
    level,
    context,
    payload: payloadText,
  }).catch(() => {
    // Logging must never interrupt the application flow.
  });

  if (level === "debug") {
    console.debug(`[internal][debug] ${context}`, payloadText, payload);
    return;
  }

  if (level === "info") {
    console.info(`[internal][info] ${context}`, payloadText, payload);
    return;
  }

  if (level === "warn") {
    console.warn(`[internal][warn] ${context}`, payloadText, payload);
    return;
  }

  console.error(`[internal][error] ${context}`, payloadText, payload);
}

export function logInternalDebug(context: string, extra?: Record<string, unknown>) {
  writeInternalLog("debug", context, extra);
}

export function logInternalInfo(context: string, extra?: Record<string, unknown>) {
  writeInternalLog("info", context, extra);
}

export function logInternalWarn(context: string, extra?: Record<string, unknown>) {
  writeInternalLog("warn", context, extra);
}

export function logInternalError(context: string, error: unknown, extra?: Record<string, unknown>) {
  writeInternalLog("error", context, {
    error: normalizeError(error),
    ...extra,
  });
}
