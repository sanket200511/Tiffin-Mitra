import cron, { type ScheduledTask } from "node-cron";

export interface RenderKeepAliveState {
  enabled: boolean;
  targetBaseUrl: string;
  pingUrl: string;
  intervalMinutes: number;
  totalPings: number;
  lastPingAt?: string;
  lastPingStatus?: number;
  lastPingLatencyMs?: number;
  lastPingError?: string;
  nextPingAt?: string;
}

const state: RenderKeepAliveState = {
  enabled: false,
  targetBaseUrl: "",
  pingUrl: "",
  intervalMinutes: 10,
  totalPings: 0,
};

let cronTask: ScheduledTask | null = null;
let initialTimeout: NodeJS.Timeout | null = null;

function resolveBaseUrl(): string {
  if (process.env.RENDER_KEEP_ALIVE_URL) {
    return process.env.RENDER_KEEP_ALIVE_URL.replace(/\/+$/, "");
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, "");
  }
  if (process.env.API_URL) {
    return process.env.API_URL.replace(/\/+$/, "");
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  // Default Render URL for this project if in production
  if (process.env.NODE_ENV === "production") {
    return "https://dabba-api.onrender.com";
  }
  const port = process.env.PORT || "8080";
  return `http://127.0.0.1:${port}`;
}

export function getKeepAlivePingUrl(): string {
  const baseUrl = resolveBaseUrl();
  const secret = process.env.KEEPALIVE_SECRET;
  const path = "/api/redis/keep-alive";
  return secret ? `${baseUrl}${path}?secret=${encodeURIComponent(secret)}` : `${baseUrl}${path}`;
}

export function getRenderKeepAliveState(): RenderKeepAliveState {
  return { ...state };
}

/**
 * Triggers a single self-ping request to the public keep-alive endpoint.
 * This sends an inbound HTTP request through Render's reverse proxy,
 * resetting Render's 15-minute inactivity idle counter.
 */
export async function triggerRenderKeepAlivePing(): Promise<{
  success: boolean;
  statusCode?: number;
  latencyMs: number;
  error?: string;
}> {
  const pingUrl = getKeepAlivePingUrl();
  const startTime = Date.now();
  state.pingUrl = pingUrl;
  state.lastPingAt = new Date().toISOString();

  try {
    const response = await fetch(pingUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Dabba-Render-KeepAlive/1.0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const latencyMs = Date.now() - startTime;
    state.totalPings += 1;
    state.lastPingStatus = response.status;
    state.lastPingLatencyMs = latencyMs;
    state.lastPingError = undefined;

    console.log(
      `[RENDER_KEEP_ALIVE] Self-ping to ${pingUrl} completed with HTTP ${response.status} (${latencyMs}ms)`,
    );

    return {
      success: response.ok,
      statusCode: response.status,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    state.totalPings += 1;
    state.lastPingStatus = undefined;
    state.lastPingLatencyMs = latencyMs;
    state.lastPingError = err?.message || String(err);

    console.warn(
      `[RENDER_KEEP_ALIVE] Self-ping to ${pingUrl} failed: ${state.lastPingError}`,
    );

    return {
      success: false,
      latencyMs,
      error: state.lastPingError,
    };
  }
}

/**
 * Initializes the Render Keep-Alive self-ping background worker.
 *
 * Controlled by RENDER_KEEP_ALIVE in .env:
 * - "true": Pings itself every 10 minutes to prevent Render free-tier from hibernating.
 * - "false" / undefined: Disabled. Server will idle out after 15 minutes to save monthly free hours.
 */
export function initRenderKeepAlive(): void {
  const isEnabled = process.env.RENDER_KEEP_ALIVE?.toLowerCase() === "true";
  const baseUrl = resolveBaseUrl();
  const pingUrl = getKeepAlivePingUrl();
  const intervalMinutes = Number(process.env.RENDER_KEEP_ALIVE_INTERVAL_MINUTES) || 10;

  state.enabled = isEnabled;
  state.targetBaseUrl = baseUrl;
  state.pingUrl = pingUrl;
  state.intervalMinutes = intervalMinutes;

  if (!isEnabled) {
    console.log(
      "[RENDER_KEEP_ALIVE] Disabled (RENDER_KEEP_ALIVE is not set to 'true'). Server will sleep after 15 minutes of inactivity to save free tier hours.",
    );
    return;
  }

  console.log(
    `[RENDER_KEEP_ALIVE] Active: Self-pinging every ${intervalMinutes} minutes at ${pingUrl} to prevent Render from going inactive.`,
  );

  // Send an initial self-ping 30 seconds after startup so the server is ready
  initialTimeout = setTimeout(() => {
    triggerRenderKeepAlivePing().catch(() => {});
  }, 30000);
  initialTimeout.unref();

  // Schedule recurring pings (e.g. */10 * * * *)
  const cronExpression = `*/${Math.min(Math.max(intervalMinutes, 1), 14)} * * * *`;
  cronTask = cron.schedule(cronExpression, async () => {
    state.nextPingAt = new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();
    await triggerRenderKeepAlivePing();
  });
}
