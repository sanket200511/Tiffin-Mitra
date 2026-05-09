import crypto from "crypto";
import { type Request, type Response } from "express";
import redis from "./redis";
import type { AuthUser } from "../middlewares/authMiddleware";

export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  user: AuthUser;
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  // Store session in Redis with TTL (in seconds)
  await redis.setex(`sess:${sid}`, Math.floor(SESSION_TTL / 1000), JSON.stringify(data));
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const data = await redis.get(`sess:${sid}`);
  if (!data) return null;
  
  try {
    return JSON.parse(data) as SessionData;
  } catch (err) {
    console.error("Failed to parse session data from Redis", err);
    return null;
  }
}

export async function updateSession(sid: string, data: SessionData): Promise<void> {
  await redis.setex(`sess:${sid}`, Math.floor(SESSION_TTL / 1000), JSON.stringify(data));
}

export async function deleteSession(sid: string): Promise<void> {
  await redis.del(`sess:${sid}`);
}

export async function clearSession(res: Response, sid?: string): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}

export function setSessionCookie(res: Response, sid: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}
