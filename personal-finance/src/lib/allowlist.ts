// Admin email — full access, always allowed.
export const ADMIN_EMAIL = "allenkim95@gmail.com";

// Add Google email addresses here to grant access to the finance tracker.
// Users not on this list (and not the admin) will be rejected at sign-in.
// Leave empty to allow only the admin.
export const ALLOWED_EMAILS: string[] = [
  ADMIN_EMAIL,
  // "friend@gmail.com",
];
