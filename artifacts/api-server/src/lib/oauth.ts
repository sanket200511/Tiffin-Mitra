import { Google } from "arctic";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!googleClientId || !googleClientSecret || !redirectUri) {
  // We don't throw here to allow the server to start, but OAuth will fail if used
  console.warn("Google OAuth environment variables are missing.");
}

export const google = new Google(
  googleClientId ?? "",
  googleClientSecret ?? "",
  redirectUri ?? ""
);
