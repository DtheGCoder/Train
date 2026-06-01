import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Cookie-Name muss mit src/lib/auth.ts (SESSION_COOKIE) übereinstimmen.
// Inline gehalten, da Proxy keine geteilten Module voraussetzen soll.
const SESSION_COOKIE = "train_session";

// Optimistische Prüfung: nur Cookie-Präsenz, KEINE DB-Abfrage.
// Die echte Verifikation passiert in der Data-Access-Layer (src/lib/auth.ts).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isLogin = pathname === "/login";

  // Eingeloggt und auf /login -> weiter in die App.
  if (isLogin) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Alle übrigen (geschützten) Routen erfordern eine Session.
  if (!hasSession) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Läuft auf allen Routen außer API, Next-Assets, Metadaten und statischen Dateien.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.png|apple-icon.png|.*\\.png$|.*\\.svg$).*)",
  ],
};
