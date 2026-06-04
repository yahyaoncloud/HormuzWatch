export const PRIMARY_ADMIN_EMAIL = "ykinwork1@gmail.com";

export function isPrimaryAdmin(user?: { email?: string; role?: string } | null) {
  return (
    user?.role === "admin" &&
    user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL
  );
}
