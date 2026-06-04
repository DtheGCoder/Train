"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Lock, Check, Sparkles, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { equipTitle } from "@/lib/actions";
import { TitleBadge } from "@/components/title-badge";
import { RARITY_LABEL, RARITY_ORDER, type Rarity } from "@/lib/titles";

export type TitleRow = {
  id: string;
  name: string;
  rarity: Rarity;
  condition: string;
  hidden: boolean;
  unlocked: boolean;
};

const RARITY_DOT: Record<Rarity, string> = {
  common: "#8b8b94",
  uncommon: "#4ade80",
  rare: "#38bdf8",
  epic: "#d946ef",
  legendary: "#f59e0b",
  funny: "#f472b6",
  secret: "#94a3b8",
};

export function TitlesView({
  rows,
  equipped,
  onlyUnlocked = false,
}: {
  rows: TitleRow[];
  equipped: string;
  onlyUnlocked?: boolean;
}) {
  const [eq, setEq] = useState(equipped);
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [, start] = useTransition();
  const [pending, setPending] = useState<string | null>(null);

  const unlockedCount = rows.filter((r) => r.unlocked).length;
  const equippedRow = rows.find((r) => r.id === eq && r.unlocked);

  const equip = (id: string) => {
    const next = eq === id ? "" : id;
    setEq(next);
    setPending(id);
    start(async () => {
      await equipTitle(next);
      setPending(null);
    });
  };

  const view = useMemo(() => {
    let list = rows.slice();
    if (onlyUnlocked) list = list.filter((r) => r.unlocked);
    if (rarity !== "all") list = list.filter((r) => r.rarity === rarity);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((r) => {
        const shown = r.hidden && !r.unlocked ? "geheim" : r.name.toLowerCase();
        return shown.includes(needle);
      });
    }
    list.sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    });
    return list;
  }, [rows, q, rarity, onlyUnlocked]);

  const rarities = RARITY_ORDER.filter((r) => rows.some((x) => x.rarity === r));

  return (
    <div className="space-y-4">
      {/* Aktueller Titel */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Dein Titel
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          {equippedRow ? (
            <TitleBadge name={equippedRow.name} rarity={equippedRow.rarity} className="text-lg" />
          ) : (
            <span className="text-lg font-bold text-muted">Kein Titel ausgerüstet</span>
          )}
          {equippedRow && (
            <button
              onClick={() => equip(equippedRow.id)}
              className="text-xs font-medium text-muted hover:text-danger"
            >
              Entfernen
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          {unlockedCount} / {rows.length} Titel freigeschaltet · erscheint in der
          Bestenliste unter deinem Namen.
        </p>
      </div>

      {/* Suche + Rarität */}
      {!onlyUnlocked && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titel suchen…"
              className="w-full rounded-lg border border-border bg-surface-2 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setRarity("all")}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                rarity === "all" ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted",
              )}
            >
              Alle
            </button>
            {rarities.map((r) => (
              <button
                key={r}
                onClick={() => setRarity(r)}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium",
                  rarity === r ? "border-primary bg-primary/15 text-primary" : "border-border bg-surface text-muted",
                )}
              >
                <span className="size-2 rounded-full" style={{ background: RARITY_DOT[r] }} />
                {RARITY_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Liste */}
      {view.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted">
          {onlyUnlocked ? "Noch keine Titel freigeschaltet – trainiere weiter!" : "Nichts gefunden."}
        </p>
      ) : (
        <ul className="space-y-2">
          {view.map((r) => {
            const secretLocked = r.hidden && !r.unlocked;
            const isEq = eq === r.id;
            return (
              <li
                key={r.id}
                className={cn(
                  "rounded-2xl border p-3 transition-colors",
                  isEq
                    ? "border-primary bg-primary/5"
                    : r.unlocked
                      ? "border-border bg-surface"
                      : "border-border bg-surface/60",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: `${RARITY_DOT[r.rarity]}22` }}
                  >
                    {secretLocked ? (
                      <HelpCircle className="size-5" style={{ color: RARITY_DOT[r.rarity] }} />
                    ) : r.unlocked ? (
                      <Sparkles className="size-5" style={{ color: RARITY_DOT[r.rarity] }} />
                    ) : (
                      <Lock className="size-4 text-muted" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {secretLocked ? (
                        <span className="font-bold text-muted">??? Geheimer Titel</span>
                      ) : (
                        <TitleBadge name={r.name} rarity={r.rarity} className="text-base" />
                      )}
                      <span
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase"
                        style={{ background: `${RARITY_DOT[r.rarity]}22`, color: RARITY_DOT[r.rarity] }}
                      >
                        {RARITY_LABEL[r.rarity]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-muted">
                      {secretLocked
                        ? "Schalte ihn durch besondere Leistungen frei."
                        : r.condition}
                    </p>
                  </div>
                  {r.unlocked && (
                    <button
                      onClick={() => equip(r.id)}
                      disabled={pending === r.id}
                      className={cn(
                        "flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors active:scale-95",
                        isEq
                          ? "bg-primary/15 text-primary"
                          : "bg-surface-2 text-foreground hover:bg-border",
                      )}
                    >
                      {pending === r.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : isEq ? (
                        <Check className="size-3.5" />
                      ) : null}
                      {isEq ? "Ausgerüstet" : "Ausrüsten"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
