import { Card } from "@/components/ui";
import {
  Layers,
  AlertTriangle,
  Scale,
  ListChecks,
} from "lucide-react";
import {
  type WeeklyGroup,
  type VolumeInsights,
  STATUS_LABEL,
  STATUS_COLOR,
} from "@/lib/coach-volume";

function VolumeBar({ g }: { g: WeeklyGroup }) {
  const scaleMax = Math.max(g.mrv * 1.2, g.sets * 1.1, 1);
  const pct = (v: number) => `${Math.min(100, (v / scaleMax) * 100)}%`;
  const color = STATUS_COLOR[g.status];
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      {/* optimaler Bereich (MEV–MAV) */}
      <div
        className="absolute inset-y-0 bg-success/20"
        style={{ left: pct(g.mev), width: pct(g.mav - g.mev) }}
      />
      {/* Füllbalken bis zur aktuellen Satzzahl */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: pct(g.sets), background: color, opacity: 0.85 }}
      />
      {/* MRV-Markierung */}
      <div
        className="absolute inset-y-0 w-px bg-foreground/40"
        style={{ left: pct(g.mrv) }}
      />
    </div>
  );
}

export function WeeklyVolumeReport({
  groups,
  insights,
}: {
  groups: WeeklyGroup[];
  insights: VolumeInsights;
}) {
  const anyTrained = groups.some((g) => g.sets > 0);

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="size-5 text-primary" />
        <h2 className="font-semibold">Wochenvolumen je Muskel</h2>
        <span className="ml-auto text-xs text-muted">letzte 7 Tage</span>
      </div>

      {!anyTrained ? (
        <p className="text-sm text-muted">
          In den letzten 7 Tagen noch keine Sätze – leg los, dann bewerte ich dein
          Wochenvolumen je Muskelgruppe.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {groups.map((g) => (
            <li key={g.key} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{g.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="tabular-nums text-muted">
                    {g.sets} Sätze
                    {g.days > 0 && (
                      <span className="text-muted/70"> · {g.days}×</span>
                    )}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: STATUS_COLOR[g.status] }}
                  >
                    {STATUS_LABEL[g.status]}
                  </span>
                </span>
              </div>
              <VolumeBar g={g} />
            </li>
          ))}
        </ul>
      )}

      {/* Push/Pull-Balance */}
      {insights.balance.note && (
        <div className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2.5 text-sm">
          <Scale className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="text-muted">
            <span className="font-semibold text-foreground">Balance:</span>{" "}
            {insights.balance.note}
          </span>
        </div>
      )}

      {/* Warnungen */}
      {insights.warnings.length > 0 && (
        <div className="space-y-1.5">
          {insights.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs leading-snug text-muted"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Aktionen diese Woche */}
      {insights.actions.length > 0 && (
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-3">
          <div className="mb-1.5 flex items-center gap-2">
            <ListChecks className="size-4 text-primary" />
            <p className="text-sm font-semibold text-primary">
              Diese Woche sinnvoll
            </p>
          </div>
          <ul className="space-y-1">
            {insights.actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-xs leading-snug text-muted">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-[11px] leading-snug text-muted">
        Harte Sätze/Woche je Muskel (sekundär zur Hälfte gezählt). Der grüne
        Bereich ist der optimale Korridor, die Linie markiert das sinnvolle
        Maximum – darüber bringt mehr v. a. Ermüdung.
      </p>
    </Card>
  );
}
