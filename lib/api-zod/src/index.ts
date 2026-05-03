export * from "./generated/api";

/**
 * The authenticated user shape stored in the session and attached to req.user.
 * Derived from the GetCurrentAuthUserResponse OpenAPI schema.
 */
export type AuthUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: "super_admin" | "vendor" | "customer" | "delivery_agent" | "kitchen_staff" | null | undefined;
};
