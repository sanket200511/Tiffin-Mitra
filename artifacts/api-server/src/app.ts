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
    crossOriginResourcePolicy: { policy: "same-site" },
    contentSecurityPolicy: false,
  }),
);

const allowedOrigins = process.env.REPLIT_DOMAINS
  ? process.env.REPLIT_DOMAINS.split(",").map(d => `https://${d.trim()}`)
  : [];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isReplit =
        origin.includes(".replit.dev") ||
        origin.includes(".repl.co") ||
        origin.includes(".replit.app");
      const isLocalhost =
        origin.startsWith("http://localhost") ||
        origin.startsWith("http://127.0.0.1");
      const isAllowed = allowedOrigins.includes(origin);
      if (isReplit || isLocalhost || isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

// ─── Rate limiting ────────────────────────────────────────────────────────────

// Global limiter: 300 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: (req) => req.method === "OPTIONS",
});

// Strict limiter for auth endpoints: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
});

// Wallet top-up: 10 per minute per IP to prevent abuse
const walletLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many wallet requests. Please slow down." },
});

app.use("/api", globalLimiter);
// Auth limiter only on write/sensitive endpoints — not on GET /api/auth/user
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/logout", authLimiter);
app.use("/api/customers/wallet/topup", walletLimiter);

// ─── Body parsing & auth ──────────────────────────────────────────────────────

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(authMiddleware);

app.use("/api", router);

export default app;
