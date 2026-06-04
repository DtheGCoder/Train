// Service Worker für Train — aktuell nur für Pausen-Benachrichtigungen.
// Plant ein Lock-Screen-Banner zum Pausen-Ende, auch wenn die App im
// Hintergrund ist (best effort, solange das System den Worker laufen lässt).

let restTimeout = null;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function showRestDone(title, body) {
  return self.registration.showNotification(title || "Pause vorbei", {
    body: body || "Weiter geht's!",
    tag: "rest-done",
    renotify: true,
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [200, 100, 200],
    requireInteraction: false,
  });
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "schedule-rest") {
    if (restTimeout) clearTimeout(restTimeout);
    const delay = Math.max(0, (data.endAt || 0) - Date.now());
    restTimeout = setTimeout(() => {
      restTimeout = null;
      showRestDone(data.title, data.body);
    }, delay);
  } else if (data.type === "cancel-rest") {
    if (restTimeout) clearTimeout(restTimeout);
    restTimeout = null;
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cls) => {
      for (const c of cls) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    }),
  );
});
