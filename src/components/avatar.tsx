import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Profilbild mit sauberem Initialen-Fallback. data-URLs werden direkt als <img>
// gerendert (kein next/image für data-URLs).
export function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const base =
    "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-primary/10 font-bold text-foreground select-none";
  if (src) {
    return (
      <span className={cn(base, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </span>
    );
  }
  return (
    <span className={cn(base, className)} aria-label={name}>
      {initials(name)}
    </span>
  );
}
