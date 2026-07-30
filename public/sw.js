// Minimal pass-through service worker: required for Android installability,
// deliberately does no caching so the app never serves stale data.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
