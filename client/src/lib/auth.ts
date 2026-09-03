import { signIn, signOut, signUp, getSession } from "./supabase";
import { createAdminSessionCookie, destroyAdminSessionCookie, getAdminSessionCookie } from "./session";
import { env } from "@/environments/environment";

export function isAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return env.auth.adminEmails.includes(normalized) || env.auth.adminEmailPattern.test(normalized);
}

export async function adminLogin(email: string, password: string) {
  let data: any = null;
  let supabaseError: unknown = null;

  try {
    data = await signIn(email, password);
  } catch (err) {
    supabaseError = err;
    console.warn("[Auth] Supabase signIn failed or blocked by client; attempting backend fallback:", err);

    // Fallback: Direct authentication via Go backend /auth/login
    try {
      const resp = await fetch(`${env.api.baseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (resp.ok) {
        const body = await resp.json();
        if (body.token) {
          createAdminSessionCookie(body.token, email, body.user?.role || "admin");
          return {
            session: {
              access_token: body.token,
              token_type: "bearer",
              expires_in: 86400,
              refresh_token: "",
              user: {
                id: body.sessionId || "admin_session",
                email,
                role: body.user?.role || "admin",
                aud: "authenticated",
                created_at: new Date().toISOString(),
                email_confirmed_at: new Date().toISOString(),
              },
            },
            user: {
              id: body.sessionId || "admin_session",
              email,
              role: body.user?.role || "admin",
            },
          };
        }
      }
    } catch (backendErr) {
      console.error("[Auth] Backend fallback authentication failed:", backendErr);
    }

    // Re-throw if fallback also could not authenticate
    throw supabaseError;
  }

  if (!isAdminEmail(email)) {
    await signOut();
    destroyAdminSessionCookie();
    throw new Error("Access restricted to authorized administrators");
  }
  if (data.session?.access_token) {
    createAdminSessionCookie(data.session.access_token, email);
  }
  return data;
}

export async function adminRegister(email: string, password: string) {
  if (!isAdminEmail(email)) {
    throw new Error("Registration restricted to authorized administrators");
  }
  return signUp(email, password);
}

export async function adminLogout() {
  destroyAdminSessionCookie();
  return signOut();
}

export async function getAdminSession() {
  const session = await getSession();
  if (session?.user?.email) {
    if (!isAdminEmail(session.user.email)) {
      await signOut();
      destroyAdminSessionCookie();
      return null;
    }
    if (session.access_token) {
      createAdminSessionCookie(session.access_token, session.user.email);
    }
    return session;
  }

  // Fallback to active cookie session metadata if Supabase session is re-initializing
  const cookieSession = getAdminSessionCookie();
  if (cookieSession && cookieSession.token) {
    return {
      access_token: cookieSession.token,
      token_type: "bearer",
      expires_in: Math.floor((cookieSession.expiresAt - Date.now()) / 1000),
      refresh_token: "",
      user: {
        id: "cookie_user",
        email: cookieSession.email,
        email_confirmed_at: cookieSession.createdAt, // Trust cookie session as verified
        app_metadata: {},
        user_metadata: { full_name: cookieSession.role },
        aud: "authenticated",
        created_at: cookieSession.createdAt,
      },
    } as any;
  }

  return null;
}
