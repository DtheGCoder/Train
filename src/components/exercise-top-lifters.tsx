import { Trophy } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import type { TopLifter } from "@/lib/exercise-leaders";

// Rang-Farben (Gold/Silber/Bronze) für den Ring um das Mini-Avatar.
const RING = [
  "ring-amber-400/80",
  "ring-slate-300/80",
  "ring-amber-700/80",
];
const KG = ["text-amber-400", "text-slate-300", "text-amber-700"];

const fmt = (n: number) => Math.round(n).toLocaleString("de-DE");

// Kompakte, dezent animierte Top-3-Anzeige „wer bewegt hier am meisten kg".
// Erscheint nur, wenn Daten vorhanden sind – sonst nichts (nicht störend).
export function ExerciseTopLifters({
  lifters,
  className,
}: {
  lifters?: TopLifter[];
  className?: string;
}) {
  if (!lifters || lifters.length === 0) return null;
  const weighted = lifters.some((l) => l.kg > 0);

  return (
    <div className={cn("flex items-center gap-2 overflow-hidden", className)}>
      <Trophy className="size-3 shrink-0 text-amber-400/80" aria-hidden />
      <ul className="flex min-w-0 items-center gap-2">
        {lifters.map((l, i) => (
          <li
            key={i}
            className="lift-pop flex shrink-0 items-center gap-1"
            style={{ animationDelay: `${i * 70}ms` }}
            title={`${i + 1}. ${l.name} · ${
              weighted ? `${fmt(l.kg)} kg × ${l.reps}` : `${l.reps} Wdh`
            }`}
          >
            <Avatar
              src={l.avatar}
              name={l.name}
              className={cn(
                "size-4 text-[8px] ring-1 ring-offset-1 ring-offset-surface",
                RING[i] ?? "ring-border",
              )}
            />
            <span className={cn("text-[11px] font-bold tabular-nums", KG[i])}>
              {weighted ? `${fmt(l.kg)}` : `${l.reps}`}
            </span>
            <span className="text-[10px] text-muted">
              {weighted ? "kg" : "Wdh"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
