"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  Trophy,
  LayoutList,
  Apple,
  Play,
  CalendarDays,
  UserCog,
  ShieldCheck,
  LogOut,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions";
import { Avatar } from "@/components/avatar";
import type { SessionUser } from "@/lib/auth";

const items = [
  { href: "/", label: "Start", icon: Play },
  { href: "/exercises", label: "Übungen", icon: Dumbbell },
  { href: "/routines", label: "Pläne", icon: LayoutList },
  { href: "/calendar", label: "Kalender", icon: CalendarDays },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/leaderboard", label: "Bestenliste", icon: Trophy },
  { href: "/analysis", label: "Analyse", icon: Activity },
];

export function Nav({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop-Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <Dumbbell className="size-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">Train</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <Link
            href="/profile"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive("/profile")
                ? "bg-primary/15 text-primary"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {user ? (
              <Avatar
                src={user.avatar}
                name={user.displayName ?? user.username}
                className="size-5 text-[9px]"
              />
            ) : (
              <UserCog className="size-5" />
            )}
            Coach & Profil
          </Link>

          {user?.isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/admin")
                  ? "bg-primary/15 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <ShieldCheck className="size-5" />
              Admin
            </Link>
          )}

          {user && (
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="size-5" />
                <span className="flex flex-col items-start leading-tight">
                  <span>Abmelden</span>
                  <span className="text-[11px] font-normal text-muted">
                    {user.displayName ?? user.username}
                  </span>
                </span>
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* Mobile-Bottombar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[3.5rem] flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors active:bg-surface-2",
                active ? "text-primary" : "text-muted",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
