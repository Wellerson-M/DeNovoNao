const CACHE_NAME = "avalieitor-v2";
const APP_SHELL = ["/", "/manifest.json", "/icon-192.svg", "/icon-512.svg"];

function isLocalHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

async function destroyLocalServiceWorker() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  await self.registration.unregister();

  const clients = await self.clients.matchAll({ type: "window" });
  await Promise.all(clients.map((client) => client.navigate(client.url)));
}

self.addEventListener("install", (event) => {
  if (isLocalHostname(self.location.hostname)) {
    event.waitUntil(destroyLocalServiceWorker());
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  if (isLocalHostname(self.location.hostname)) {
    event.waitUntil(destroyLocalServiceWorker());
    return;
  }

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (isLocalHostname(self.location.hostname)) {
    return;
  }

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request)
        .then((response) => {
          const cloned = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });

          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});
