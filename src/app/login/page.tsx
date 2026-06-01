import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Bereits eingeloggt? Direkt weiter zur App.
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      {/* Animierter Aurora-Hintergrund */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div
          className="aurora-a absolute -left-1/4 -top-1/4 size-[60vmax] rounded-full opacity-50 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, var(--primary), transparent 60%)",
          }}
        />
        <div
          className="aurora-b absolute -bottom-1/4 -right-1/4 size-[55vmax] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, #22c55e, transparent 60%)",
          }}
        />
        {/* feines Raster für Tiefe */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
      </div>

      <LoginForm />
    </div>
  );
}
