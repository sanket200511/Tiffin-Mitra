import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "./middlewares/authMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// ALLOWED_ORIGINS: comma-separated list of allowed origins for CORS.
// Example: ALLOWED_ORIGINS=https://app.example.com,https://www.example.com
// In development (NODE_ENV != production) localhost is always allowed.
const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isDev = process.env.NODE_ENV !== "production";
      const isLocalhost =
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1");
      if ((isDev && isLocalhost) || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

// ─── Rate limiting ─────────────────────────────────────────────────────────────
// General API limit — applies to all /api routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
  skip: (req) => {
    // Exempt keep-alive and health check endpoints so external monitors/cron won't get blocked
    if (
      req.path === "/redis/keep-alive" ||
      req.path === "/keep-alive" ||
      req.path === "/redis/ping" ||
      req.path === "/healthz" ||
      req.path === "/health/render-keep-alive"
    ) {
      return true;
    }
    // Skip rate limiting in development
    return process.env.NODE_ENV !== "production" && (
      req.ip === "127.0.0.1" || req.ip === "::1" || req.ip === "::ffff:127.0.0.1"
    );
  },
});

// Stricter limit for auth endpoints (login, register, etc.)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

// Mutation limit — POST/PATCH/DELETE on write-heavy routes
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, slow down." },
  skip: (req) =>
    req.method === "GET" ||
    req.method === "HEAD" ||
    req.method === "OPTIONS" ||
    req.path === "/redis/keep-alive" ||
    req.path === "/keep-alive" ||
    req.path === "/health/render-keep-alive",
});

// ─── Body parsing & auth ──────────────────────────────────────────────────────

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(authMiddleware);

// Apply rate limiters
app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api", mutationLimiter);

app.use("/api", router);

export default app;
