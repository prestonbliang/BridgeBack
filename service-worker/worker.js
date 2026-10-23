/* Advance this release marker when deploying a new application build. */
const RELEASE = "phase2-20261022";
const PREFIX = "bridgeback-shell-";
const INDEX = `${PREFIX}index-v2`;
const ACTIVE = "/__bridgeback/active-shell";
const CANDIDATE = "/__bridgeback/candidate-shell";
const LOCAL_ASSETS = [
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/fonts.css",
];

async function shellCache() {
  const index = await caches.open(INDEX);
  const pointer = await index.match(ACTIVE);
  return pointer ? caches.open(await pointer.text()) : null;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const response = await fetch("/", { cache: "no-store" });
      if (!response.ok) throw Error("Application shell unavailable");
      const html = await response.clone().text();
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(html),
      );
      const fingerprint = [...new Uint8Array(digest)]
        .slice(0, 12)
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      const name = `${PREFIX}${RELEASE}-${fingerprint}`;
      const existed = (await caches.keys()).includes(name);
      const cache = await caches.open(name);
      try {
        const assets = [...html.matchAll(/(?:src|href)="([^" ]+)"/g)]
          .map((match) => match[1].replace(/&amp;/g, "&"))
          .filter((path) => path.startsWith("/_next/static/"));
        if (!assets.length)
          throw Error("Production shell has no static assets");
        // The candidate becomes discoverable only after every required asset is cached.
        await cache.addAll([...new Set([...assets, ...LOCAL_ASSETS])]);
        await cache.put("/", response);
        const index = await caches.open(INDEX);
        await index.put(CANDIDATE, new Response(name));
      } catch (error) {
        if (!existed) await caches.delete(name);
        throw error;
      }
      // Updates wait for existing tabs to close. Old pages keep their matching assets.
      // First installation activates normally and claims its initial page below.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const index = await caches.open(INDEX);
      const candidate = await index.match(CANDIDATE);
      if (!candidate) throw Error("No complete application shell is installed");
      const name = await candidate.text();
      const cache = await caches.open(name);
      if (!(await cache.match("/")))
        throw Error("Installed shell is incomplete");
      await index.put(ACTIVE, new Response(name));
      await index.delete(CANDIDATE);
      // Normal worker activation occurs after the prior worker's tabs close.
      // Never remove caches owned by another application on the same origin.
      await Promise.all(
        (await caches.keys())
          .filter(
            (key) => key.startsWith(PREFIX) && key !== INDEX && key !== name,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      (async () => {
        const cache = await shellCache();
        // Keep HTML and its hashed assets from the same completed installation.
        // A newly deployed shell is adopted by the next service-worker lifecycle.
        const cached = cache && (await cache.match("/"));
        return cached || fetch(request);
      })(),
    );
    return;
  }
  if (
    url.pathname.startsWith("/_next/static/") ||
    LOCAL_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await shellCache();
        const cached = cache && (await cache.match(request));
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok && cache) {
          const copy = response.clone();
          event.waitUntil(cache.put(request, copy));
        }
        return response;
      })(),
    );
  }
});
