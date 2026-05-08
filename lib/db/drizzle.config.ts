import { defineConfig } from "drizzle-kit";

// Prefer DATABASE_DIRECT_URL for migrations (bypasses pgBouncer pooler)
// Fall back to DATABASE_URL if not set
const dbUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL (or DATABASE_DIRECT_URL) must be set. Did you forget to provision a database?");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
  schemaFilter: ["dabba"],
});
