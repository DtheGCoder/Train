// Client-Helfer für Pausen-Benachrichtigungen (Lock-Screen-Banner).
//
// Hinweis zur Plattform-Realität: Ein PWA kann eine *Notification* anzeigen
// (Banner auf dem Sperrbildschirm), aber KEIN frei gestaltetes Live-Widget mit
// tickender Sekundenanzeige – das können nur native Apps (iOS Live Activities,
// Android Foreground-Service). Für zuverlässiges Auslösen im Hintergrund planen
// wir die Benachrichtigung zusätzlich im Service Worker (best effort: auf
// Android meist zuverlässig, auf iOS eingeschränkt, solange das System den
// Worker laufen lässt).

let swReg: ServiceWorkerRegistration | null = null;

export function canNotify(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  if (swReg) return swReg;
  try {
    swReg = await navigator.serviceWorker.register("/sw.js");
    return swReg;
  } catch {
    return null;
  }
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!canNotify()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

async function activeWorker(): Promise<ServiceWorker | null> {
  const reg = (await ensureServiceWorker()) ?? null;
  if (reg?.active) return reg.active;
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const ready = await navigator.serviceWorker.ready;
      return ready.active ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

// Plant eine Benachrichtigung zum Pausen-Ende im Service Worker (Hintergrund).
export async function scheduleRestNotification(
  endAt: number,
  title: string,
  body: string,
): Promise<void> {
  if (!canNotify() || Notification.permission !== "granted") return;
  const sw = await activeWorker();
  sw?.postMessage({ type: "schedule-rest", endAt, title, body });
}

export async function cancelRestNotification(): Promise<void> {
  const sw = await activeWorker();
  sw?.postMessage({ type: "cancel-rest" });
}

// Zeigt die Benachrichtigung sofort an (wenn die App im Vordergrund das
// Pausen-Ende erreicht).
export async function notifyRestDone(title: string, body: string): Promise<void> {
  if (!canNotify() || Notification.permission !== "granted") return;
  const reg = await ensureServiceWorker();
  const opts: NotificationOptions = {
    body,
    tag: "rest-done",
    icon: "/icon.svg",
    badge: "/icon.svg",
  };
  try {
    if (reg) {
      await reg.showNotification(title, opts);
      return;
    }
  } catch {
    /* Fallback unten */
  }
  try {
    new Notification(title, opts);
  } catch {
    /* ignorieren */
  }
}
