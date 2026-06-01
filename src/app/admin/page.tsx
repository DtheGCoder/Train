import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createUser } from "@/lib/actions";
import { PageHeader, Card, Button, Input } from "@/components/ui";
import { DeleteUserButton } from "@/components/delete-user-button";
import { getVersionInfo, GITHUB_URL } from "@/lib/version";
import {
  ShieldCheck,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  GitBranch,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAdmin();

  const [users, version] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    getVersionInfo(),
  ]);

  const adminCount = users.filter((u) => u.isAdmin).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        subtitle="Benutzer verwalten & Systemversion"
      />

      {/* Version / Update-Status */}
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <GitBranch className="size-5 text-primary" />
          <h2 className="font-semibold">Version & Updates</h2>
        </div>

        {version.upToDate === true && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            <CheckCircle2 className="size-4" />
            Aktuell – du nutzt die neueste Version.
          </div>
        )}
        {version.upToDate === false && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            <AlertTriangle className="size-4" />
            Ein Update ist verfügbar. Der Server aktualisiert sich automatisch.
          </div>
        )}
        {version.error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-muted">
            <AlertTriangle className="size-4" />
            {version.error}
          </div>
        )}

        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">Installierte Version</dt>
            <dd className="font-mono">
              {version.currentShortSha ?? "unbekannt"}
            </dd>
          </div>
          <div className="rounded-lg bg-surface-2 px-3 py-2">
            <dt className="text-xs text-muted">Neuester Commit (GitHub)</dt>
            <dd className="font-mono">
              {version.latest?.shortSha ?? "—"}
            </dd>
          </div>
        </dl>

        {version.latest && (
          <p className="mt-3 text-xs text-muted">
            Zuletzt:{" "}
            <span className="text-foreground">{version.latest.message}</span>
            {version.latest.date && (
              <>
                {" "}
                ·{" "}
                {format(new Date(version.latest.date), "dd.MM.yyyy HH:mm", {
                  locale: de,
                })}
              </>
            )}
          </p>
        )}

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
        >
          Repository auf GitHub ansehen →
        </a>
      </Card>

      {/* Neuen Benutzer anlegen */}
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="size-5 text-primary" />
          <h2 className="font-semibold">Neuen Benutzer anlegen</h2>
        </div>
        <form action={createUser} className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Benutzername
            </label>
            <Input
              name="username"
              type="text"
              required
              minLength={3}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="mind. 3 Zeichen"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Passwort
            </label>
            <Input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="mind. 6 Zeichen"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isAdmin"
              className="size-4 accent-[var(--primary)]"
            />
            Administrator-Rechte
          </label>
          <Button type="submit" className="mt-1 w-full">
            <UserPlus className="size-4" /> Benutzer anlegen
          </Button>
        </form>
      </Card>

      {/* Benutzerliste */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="font-semibold">Benutzer ({users.length})</h2>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {users.map((u) => {
            const isLastAdmin = u.isAdmin && adminCount <= 1;
            const isSelf = u.id === me.id;
            return (
              <li
                key={u.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {u.username}
                    {isSelf && (
                      <span className="ml-2 text-xs text-muted">(du)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {u.isAdmin ? "Administrator" : "Benutzer"} · seit{" "}
                    {format(u.createdAt, "dd.MM.yyyy", { locale: de })}
                  </p>
                </div>
                <DeleteUserButton
                  id={u.id}
                  username={u.username}
                  disabled={isSelf || isLastAdmin}
                />
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">
          Der eigene Account und der letzte Administrator können nicht gelöscht
          werden.
        </p>
      </div>
    </div>
  );
}
