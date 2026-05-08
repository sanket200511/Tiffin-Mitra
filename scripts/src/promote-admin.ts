import { db, usersTable } from "../../lib/db/src/index";
import { eq } from "drizzle-orm";

async function promoteAdmin(email: string) {
  try {
    const [user] = await db
      .update(usersTable)
      .set({ role: "super_admin" })
      .where(eq(usersTable.email, email.toLowerCase()))
      .returning();

    if (user) {
      console.log(`Successfully promoted ${email} to super_admin.`);
    } else {
      console.log(`User with email ${email} not found.`);
    }
  } catch (error) {
    console.error("Error promoting user:", error);
  } finally {
    process.exit(0);
  }
}

const email = process.argv[2] || "sanketkurve.2005@gmail.com";
promoteAdmin(email);
