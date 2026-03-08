import { prisma } from "./db";

// Admin email — always allowed, cannot be removed.
export const ADMIN_EMAIL = "allenkim95@gmail.com";

/** Check if an email is in the allowlist (DB) or is the admin. */
export async function isEmailAllowed(email: string): Promise<boolean> {
  if (email === ADMIN_EMAIL) return true;
  const entry = await prisma.allowedEmail.findUnique({ where: { email } });
  return !!entry;
}

/** Check if an email is the admin. */
export function isAdmin(email: string): boolean {
  return email === ADMIN_EMAIL;
}
