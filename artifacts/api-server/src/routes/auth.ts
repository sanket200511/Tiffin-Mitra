import bcrypt from "bcryptjs";
import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import {
  clearSession,
  createSession,
  getSessionId,
  setSessionCookie,
  updateSession,
  getSession,
} from "../lib/auth";

const router: IRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/register", authLimiter, async (req: Request, res: Response) => {
  const { email, password, firstName, lastName } = req.body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }

  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      email: email.toLowerCase(),
      passwordHash,
      firstName: firstName || null,
      lastName: lastName || null,
    }).returning();

    const sid = await createSession({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, role: user.role ?? null } });
    setSessionCookie(res, sid);

    res.status(201).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, role: user.role ?? null } });
  } catch (err) {
    req.log.error({ err }, "Registration error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const sid = await createSession({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, role: user.role ?? null } });
    setSessionCookie(res, sid);

    res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, role: user.role ?? null } });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

router.patch("/auth/role", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { role } = req.body as { role?: string };
  if (!role || !["customer", "vendor"].includes(role)) {
    res.status(400).json({ error: "Role must be 'customer' or 'vendor'" });
    return;
  }

  try {
    const [user] = await db.update(usersTable)
      .set({ role: role as "customer" | "vendor", updatedAt: new Date() })
      .where(eq(usersTable.id, req.user.id))
      .returning();

    const sid = getSessionId(req);
    if (sid) {
      const session = await getSession(sid);
      if (session) {
        session.user.role = user.role ?? null;
        await updateSession(sid, session);
      }
    }

    res.json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl, role: user.role ?? null } });
  } catch (err) {
    req.log.error({ err }, "Role update error");
    res.status(500).json({ error: "Failed to update role" });
  }
});

// POST /auth/make-admin — requires ADMIN_SETUP_KEY env var. No default key.
router.post("/auth/make-admin", authLimiter, async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "You must be logged in first" });
    return;
  }

  const expectedKey = process.env.ADMIN_SETUP_KEY;
  if (!expectedKey) {
    res.status(403).json({ error: "Admin setup is not enabled on this server" });
    return;
  }

  const { setupKey } = req.body as { setupKey?: string };
  if (!setupKey || setupKey !== expectedKey) {
    res.status(403).json({ error: "Invalid setup key" });
    return;
  }

  try {
    const [user] = await db.update(usersTable)
      .set({ role: "super_admin", updatedAt: new Date() })
      .where(eq(usersTable.id, req.user.id))
      .returning();

    const sid = getSessionId(req);
    if (sid) {
      const session = await getSession(sid);
      if (session) {
        session.user.role = "super_admin";
        await updateSession(sid, session);
      }
    }

    res.json({ message: "You are now a super admin", user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    req.log.error({ err }, "Make admin error");
    res.status(500).json({ error: "Failed to update role" });
  }
});

export default router;
