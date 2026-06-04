"use client";

import { useState } from "react";
import { CalendarDays, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

// Tab-Umschalter im Kalender: zwischen Kalender und Statistik wechseln.
export function CalendarTabs({
  calendar,
  stats,
}: {
  calendar: React.ReactNode;
  stats: React.ReactNode;
}) {
  const [tab, setTab] = useState<"calendar" | "stats">("calendar");
  const tabs = [
    { id: "calendar" as const, label: "Kalender", Icon: CalendarDays },
    { id: "stats" as const, label: "Statistik", Icon: BarChart3 },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground",
            )}
          >
            <t.Icon className="size-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>
      <div>{tab === "calendar" ? calendar : stats}</div>
    </div>
  );
}
