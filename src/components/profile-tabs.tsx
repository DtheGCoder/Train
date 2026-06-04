"use client";

import { useState } from "react";
import { UserCog, Dumbbell, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

// Gliedert den Profilbereich in Tabs: Profil · Coach · Mehr.
export function ProfileTabs({
  profile,
  coach,
  more,
}: {
  profile: React.ReactNode;
  coach: React.ReactNode;
  more: React.ReactNode;
}) {
  const [tab, setTab] = useState<"profile" | "coach" | "more">("profile");
  const tabs = [
    { id: "profile" as const, label: "Profil", Icon: UserCog },
    { id: "coach" as const, label: "Coach", Icon: Dumbbell },
    { id: "more" as const, label: "Mehr", Icon: Compass },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors",
              tab === t.id ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
            )}
          >
            <t.Icon className="size-4 shrink-0" />
            {t.label}
          </button>
        ))}
      </div>
      <div className="space-y-5">
        {tab === "profile" ? profile : tab === "coach" ? coach : more}
      </div>
    </div>
  );
}
