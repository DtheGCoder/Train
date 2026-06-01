"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/nav";
import type { SessionUser } from "@/lib/auth";

// Rahmen der App: Auf /login wird die Navigation ausgeblendet (Vollbild-Login),
// sonst Sidebar/Bottombar + zentrierter Inhalt.
export function AppShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const bare = pathname === "/login";

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Nav user={user} />
      <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-60">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
