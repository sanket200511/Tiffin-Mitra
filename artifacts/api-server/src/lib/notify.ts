import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type NotifPayload = {
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
};

export async function notifyUser(userId: string, payload: NotifPayload): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      metadata: payload.metadata ?? null,
    });
  } catch {
    // notification failure must never break the main operation
  }
}

export async function notifyAllAdmins(payload: NotifPayload): Promise<void> {
  try {
    const admins = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "super_admin"));
    if (admins.length === 0) return;
    await db.insert(notificationsTable).values(
      admins.map((a) => ({
        userId: a.id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        metadata: payload.metadata ?? null,
      })),
    );
  } catch {
    // notification failure must never break the main operation
  }
}
