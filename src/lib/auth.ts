import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/password";

export const SESSION_COOKIE = "train_session";
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 Tage

export type SessionUser = {
  id: string;
  username: string; // Login-Name
  displayName: string | null; // Anzeigename (Fallback: username)
  avatar: string | null; // Profilbild (data-URL) oder null
  isAdmin: boolean;
};

/**
 * Erstellt eine DB-Session und setzt das httpOnly-Cookie.
 * Nur in Server-Actions / Route-Handlern aufrufen (Cookie-Set).
 */
export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000);

  await db.session.create({
    data: { token, userId, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

/**
 * Löscht die aktuelle Session aus DB und entfernt das Cookie.
 * Nur in Server-Actions / Route-Handlern aufrufen.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Liest die aktuelle Session aus DB (sichere Prüfung).
 * Memoisiert pro Render via React cache.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    // Abgelaufen – aufräumen (best effort).
    await db.session.deleteMany({ where: { token } }).catch(() => {});
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    displayName: session.user.displayName,
    avatar: session.user.avatar,
    isAdmin: session.user.isAdmin,
  };
});

/** Erzwingt einen eingeloggten User, sonst Redirect auf /login. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Erzwingt einen Admin, sonst Redirect. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");
  return user;
}
