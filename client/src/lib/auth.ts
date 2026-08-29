import { signIn, signOut, signUp, getSession } from "./supabase";
import { createAdminSessionCookie, destroyAdminSessionCookie, getAdminSessionCookie } from "./session";
import { env } from "@/environments/environment";

export function isAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase().trim();
  return env.auth.adminEmails.includes(normalized) || env.auth.adminEmailPattern.test(normalized);
}

export async function adminLogin(email: string, password: string) {
  const data = await signIn(email, password);
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
