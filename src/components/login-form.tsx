"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Dumbbell, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { login, type LoginState } from "@/lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative mt-2 inline-flex min-h-12 w-full select-none items-center justify-center gap-2 overflow-hidden rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[transform,opacity] active:scale-[0.98] disabled:opacity-70"
    >
      {/* Shimmer-Lichtstreifen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%)] bg-[length:250%_100%]"
        style={{ animation: "shimmer 2.4s linear infinite" }}
      />
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Anmelden…
        </>
      ) : (
        <>
          <LogIn className="size-4" />
          Anmelden
        </>
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(login, undefined);
  const [showPw, setShowPw] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Fehler-Element neu animieren, wenn sich der Fehler ändert.
  useEffect(() => {
    if (state?.error && errorRef.current) {
      errorRef.current.classList.remove("error-shake");
      // reflow erzwingen
      void errorRef.current.offsetWidth;
      errorRef.current.classList.add("error-shake");
    }
  }, [state]);

  return (
    <div className="login-rise w-full max-w-sm">
      <div className="rounded-2xl border border-border bg-surface/70 p-7 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <div className="logo-pulse mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Dumbbell className="size-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Train</h1>
          <p className="mt-1 text-sm text-muted">
            Melde dich an, um weiterzutrainieren.
          </p>
        </div>

        <form action={action} className="mt-7 flex flex-col gap-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Benutzername
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
              placeholder="z. B. admin"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-xs font-medium text-muted"
            >
              Passwort
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-3 pr-11 text-sm outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Passwort verbergen" : "Passwort anzeigen"}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted transition-colors hover:text-foreground"
              >
                {showPw ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {state?.error && (
            <div
              ref={errorRef}
              role="alert"
              className="error-shake rounded-lg border border-danger/40 bg-danger/10 px-3 py-2.5 text-sm text-danger"
            >
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>
      </div>

      <p className="mt-5 text-center text-xs text-muted">
        Kein Konto? Wende dich an deinen Administrator.
      </p>
    </div>
  );
}
