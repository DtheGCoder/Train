import { cn } from "@/lib/utils";
import type { Rarity } from "@/lib/titles";

const CLS: Record<Rarity, string> = {
  common: "title-common",
  uncommon: "title-uncommon",
  rare: "title-rare",
  epic: "title-epic",
  legendary: "title-legendary",
  funny: "title-funny",
  secret: "title-secret",
};

// Animiertes Titel-Label (Farbe/Animation je Seltenheit).
export function TitleBadge({
  name,
  rarity,
  className,
}: {
  name: string;
  rarity: Rarity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block text-xs font-extrabold tracking-tight",
        CLS[rarity],
        className,
      )}
    >
      {name}
    </span>
  );
}
