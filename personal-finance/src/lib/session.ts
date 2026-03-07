import { auth } from "./auth";
import { prisma } from "./db";

export type AuthUser = { id: string; email: string };

/**
 * Get the authenticated user from the session.
 * Returns null if not authenticated or user not found in DB.
 */
export async function getUser(): Promise<AuthUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  return user;
}
