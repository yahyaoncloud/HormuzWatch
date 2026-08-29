import { env } from "@/environments/environment";

export interface AdminSessionMetadata {
  token: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: number; // Unix timestamp in ms
}

const COOKIE_NAME = "hw_admin_session";

/**
 * Encodes session metadata into a cookie string with Max-Age matching session expiry.
 */
export function createAdminSessionCookie(token: string, email: string, role = "Root Admin"): AdminSessionMetadata {
  const expiryMs = (env.auth as any).sessionExpiryMs || 7 * 24 * 60 * 60 * 1000; // default 7 days
  const expiresAt = Date.now() + expiryMs;

  const metadata: AdminSessionMetadata = {
    token,
    email,
    role,
    createdAt: new Date().toISOString(),
    expiresAt,
  };

  if (typeof document !== "undefined") {
    const encoded = encodeURIComponent(JSON.stringify(metadata));
    const maxAgeSeconds = Math.floor(expiryMs / 1000);
    document.cookie = `${COOKIE_NAME}=${encoded}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax; ${location.protocol === 'https:' ? 'Secure;' : ''}`;
  }

  return metadata;
}

/**
 * Retrieves and validates the admin session cookie from browser storage or cookie header.
 */
export function getAdminSessionCookie(): AdminSessionMetadata | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split("=");
    if (key === COOKIE_NAME && value) {
      try {
        const metadata: AdminSessionMetadata = JSON.parse(decodeURIComponent(value));
        if (metadata.expiresAt && Date.now() > metadata.expiresAt) {
          destroyAdminSessionCookie();
          return null; // Session expired
        }
        return metadata;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Destroys the admin session cookie on logout.
 */
export function destroyAdminSessionCookie(): void {
  if (typeof document !== "undefined") {
    document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}
