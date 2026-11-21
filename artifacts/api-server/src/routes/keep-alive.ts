import { Router, type Request, type Response } from "express";
import { performRedisKeepAlive } from "../lib/redis";
import {
  getRenderKeepAliveState,
  triggerRenderKeepAlivePing,
} from "../lib/render-keep-alive";

const router = Router();

/**
 * Validates optional keep-alive secret.
 * If KEEPALIVE_SECRET is defined in process.env, the request must supply it
 * via query param (?secret=...), header (x-keepalive-secret), or Bearer token.
 * If KEEPALIVE_SECRET is not configured, endpoints are publicly accessible.
 */
function isAuthorized(req: Request): boolean {
  const secret = process.env.KEEPALIVE_SECRET;
  if (!secret) return true;

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : undefined;
  const provided =
    (req.query.secret as string | undefined) ||
    (req.headers["x-keepalive-secret"] as string | undefined) ||
    token;

  return provided === secret;
}

const handleKeepAlive = async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).json({
      status: "unauthorized",
      error: "Invalid or missing keep-alive secret",
    });
    return;
  }

  const result = await performRedisKeepAlive();
  const renderKeepAliveState = getRenderKeepAliveState();

  if (result.success) {
    res.status(200).json({
      status: "ok",
      message: "Redis keep-alive ping successful",
      timestamp: new Date().toISOString(),
      latencyMs: result.latencyMs,
      redis: {
        status: result.status,
        ping: result.ping,
        lastHeartbeat: result.lastHeartbeat,
        currentHeartbeat: result.currentHeartbeat,
      },
      renderKeepAlive: renderKeepAliveState,
    });
  } else {
    res.status(503).json({
      status: "error",
      message: "Redis keep-alive failed to reach Redis database",
      timestamp: new Date().toISOString(),
      latencyMs: result.latencyMs,
      error: result.error,
      renderKeepAlive: renderKeepAliveState,
    });
  }
};

// Main keep-alive endpoints
router.get("/redis/keep-alive", handleKeepAlive);
router.post("/redis/keep-alive", handleKeepAlive);

// Convenient top-level aliases
router.get("/keep-alive", handleKeepAlive);
router.post("/keep-alive", handleKeepAlive);

// Lightweight ping-only endpoint
router.get("/redis/ping", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).json({
      status: "unauthorized",
      error: "Invalid or missing keep-alive secret",
    });
    return;
  }

  const result = await performRedisKeepAlive();
  if (result.success) {
    res.status(200).json({
      status: "ok",
      ping: result.ping,
      latencyMs: result.latencyMs,
    });
  } else {
    res.status(503).json({
      status: "error",
      error: result.error,
      latencyMs: result.latencyMs,
    });
  }
});

// Render Keep-Alive status & manual trigger endpoints
router.get("/health/render-keep-alive", (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).json({
      status: "unauthorized",
      error: "Invalid or missing keep-alive secret",
    });
    return;
  }

  res.status(200).json({
    status: "ok",
    renderKeepAlive: getRenderKeepAliveState(),
  });
});

router.post("/health/render-keep-alive", async (req: Request, res: Response) => {
  if (!isAuthorized(req)) {
    res.status(401).json({
      status: "unauthorized",
      error: "Invalid or missing keep-alive secret",
    });
    return;
  }

  const pingResult = await triggerRenderKeepAlivePing();
  res.status(pingResult.success ? 200 : 503).json({
    status: pingResult.success ? "ok" : "error",
    result: pingResult,
    renderKeepAlive: getRenderKeepAliveState(),
  });
});

export default router;
