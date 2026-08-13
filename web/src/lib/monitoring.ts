import "server-only";

// Error tracking without the SDK weight.
//
// Every capture does two things:
//   1. Emits one structured JSON line to stderr — on EC2 that is what the
//      CloudWatch agent (or `docker logs`) picks up, greppable by `scope`.
//   2. If SENTRY_DSN is set, forwards the event to Sentry's envelope endpoint
//      directly. The wire format is stable and public; no @sentry/nextjs
//      build plugins, no bundle growth, works the same in Docker on EC2.
//
// Fire-and-forget by design: telemetry must never delay or fail a request.

export type CapturedEvent = {
  scope: string; // e.g. "plan-solve", "client"
  message: string;
  stack?: string;
  level?: "error" | "warning";
  url?: string;
  userAgent?: string;
  extra?: Record<string, unknown>;
};

export function captureServerError(
  scope: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  capture({ scope, message, stack, level: "error", extra });
}

export function capture(event: CapturedEvent): void {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: event.level ?? "error",
      scope: event.scope,
      message: event.message,
      ...(event.url ? { url: event.url } : {}),
      ...(event.extra ?? {}),
    })
  );
  void forwardToSentry(event).catch(() => {
    // Telemetry is best-effort; the structured log line above already landed.
  });
}

async function forwardToSentry(event: CapturedEvent): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  let endpoint: string;
  let key: string;
  try {
    const u = new URL(dsn);
    key = u.username;
    const projectId = u.pathname.replace(/\//g, "");
    if (!key || !projectId) return;
    endpoint = `${u.protocol}//${u.host}/api/${projectId}/envelope/`;
  } catch {
    return; // malformed DSN — the log line still happened
  }

  const eventId = randomHex32();
  const sentAt = new Date().toISOString();
  const payload = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "javascript",
    level: event.level ?? "error",
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
    server_name: "meguaz-web",
    tags: { scope: event.scope },
    ...(event.url ? { request: { url: event.url, headers: userAgentHeader(event) } } : {}),
    exception: {
      values: [{ type: "Error", value: event.message.slice(0, 1000) }],
    },
    extra: {
      ...(event.extra ?? {}),
      ...(event.stack ? { stack: event.stack.slice(0, 8000) } : {}),
    },
  };

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: sentAt }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(payload) +
    "\n";

  await fetch(`${endpoint}?sentry_key=${key}&sentry_version=7&sentry_client=meguaz/1.0`, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope" },
    body: envelope,
    signal: AbortSignal.timeout(3000),
  });
}

function userAgentHeader(event: CapturedEvent): Record<string, string> | undefined {
  return event.userAgent ? { "User-Agent": event.userAgent } : undefined;
}

function randomHex32(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
