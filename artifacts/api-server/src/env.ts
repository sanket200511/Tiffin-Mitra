import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load .env from root (3 levels up from src/env.ts or dist/env.mjs)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.DATABASE_URL) {
  // If not found at 3 levels, try 2 levels (if running from dist and dist is root-ish)
  dotenv.config({ path: path.resolve(__dirname, "../../.env") });
}
