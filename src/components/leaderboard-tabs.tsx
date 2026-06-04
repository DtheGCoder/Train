"use client";

import { useState } from "react";
import { Trophy, Award } from "lucide-react";
import { cn } from "@/lib/utils";

// Tab-Umschalter in der Bestenliste: Rangliste ↔ Achievements.
export function LeaderboardTabs({
  ranking,
  achievements,
}: {
  ranking: React.ReactNode;
  achievements: React.ReactNode;
}) {
  const [tab, setTab] = useState<"ranking" | "achievements">("ranking");
  const tabs = [
    { id: "ranking" as const, label: "Rangliste", Icon: Trophy },
    { id: "achievements" as const, label: "Achievements", Icon: Award },
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
      <div>{tab === "ranking" ? ranking : achievements}</div>
    </div>
  );
}
