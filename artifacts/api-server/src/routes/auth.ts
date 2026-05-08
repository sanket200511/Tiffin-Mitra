import bcrypt from "bcryptjs";
import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { generateState, generateCodeVerifier } from "arctic";
import { google } from "../lib/oauth";
import {
  clearSession,
  createSession,
  getSessionId,
  setSessionCookie,
  updateSession,
  getSession,
} from "../lib/auth";

const router: IRouter = Router();

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/register", async (req: Request, res: Response) => {
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

router.post("/auth/login", async (req: Request, res: Response) => {
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
    if (!user.passwordHash) {
      res.status(401).json({ error: "This account uses Google Login. Please sign in with Google." });
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
router.post("/auth/make-admin", async (req: Request, res: Response) => {
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

// Google OAuth redirect
router.get("/auth/google", async (_req: Request, res: Response) => {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "profile", "email"]);

  res.cookie("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600 * 1000, // 10 minutes
  });

  res.cookie("google_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600 * 1000, // 10 minutes
  });

  res.redirect(url.toString());
});

// Google OAuth callback
router.get("/auth/google/callback", async (req: Request, res: Response) => {
  const code = req.query.code?.toString();
  const state = req.query.state?.toString();
  const storedState = req.cookies?.google_oauth_state;
  const codeVerifier = req.cookies?.google_code_verifier;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    res.status(400).json({ error: "Invalid OAuth state or code" });
    return;
  }

  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier);
    const googleUserResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken()}`,
      },
    });
    const googleUser = (await googleUserResponse.json()) as {
      sub: string;
      email: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      email_verified: boolean;
    };

    if (!googleUser.email_verified) {
      res.status(400).json({ error: "Google email not verified" });
      return;
    }

    // Upsert user
    const [existingByGoogle] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, googleUser.sub));

    let user = existingByGoogle;

    if (!user) {
      // Check if email already exists
      const [existingByEmail] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, googleUser.email.toLowerCase()));

      if (existingByEmail) {
        // Link google account to existing email
        [user] = await db
          .update(usersTable)
          .set({
            googleId: googleUser.sub,
            profileImageUrl: googleUser.picture || existingByEmail.profileImageUrl,
            updatedAt: new Date(),
          })
          .where(eq(usersTable.id, existingByEmail.id))
          .returning();
      } else {
        // Create new user
        [user] = await db
          .insert(usersTable)
          .values({
            email: googleUser.email.toLowerCase(),
            googleId: googleUser.sub,
            firstName: googleUser.given_name || null,
            lastName: googleUser.family_name || null,
            profileImageUrl: googleUser.picture || null,
            role: "customer", // Default role
          })
          .returning();
      }
    }

    // Create session
    const sid = await createSession({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role ?? null,
      },
    });
    setSessionCookie(res, sid);

    // Clear oauth cookies
    res.clearCookie("google_oauth_state");
    res.clearCookie("google_code_verifier");

    // Redirect to frontend (e.g., home or dashboard)
    const frontendUrl = process.env.FRONTEND_URL || "/";
    res.redirect(frontendUrl);
  } catch (err) {
    req.log.error({ err }, "Google OAuth error");
    res.status(500).json({ error: "Authentication failed" });
  }
});

export default router;
