import { auth } from "./auth";

export type AuthUser = { id: string; email: string };

/**
 * Get the authenticated user from the session.
 * Returns null if not authenticated. Reads userId directly from the JWT
 * session (set by the jwt/session callbacks in auth.ts) — no extra DB query.
 */
export async function getUser(): Promise<AuthUser | null> {
  const session = await auth();
  const id = (session?.user as Record<string, unknown> | undefined)?.id as string | undefined;
  const email = session?.user?.email;
  if (!id || !email) return null;
  return { id, email };
}
