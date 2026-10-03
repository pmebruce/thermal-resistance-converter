const CACHE_NAME = "thermal-resistance-converter-v8-type2-hero2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=8",
  "./app.js",
  "./manifest.webmanifest",
  "./apple-touch-icon-180-v2.png",
  "./icon-192-v2.png",
  "./icon-512-v2.png"
];

self.addEventListener("install", function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(APP_SHELL);
  }).then(function() {
    return self.skipWaiting();
  }));
});

self.addEventListener("activate", function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(key) {
      return key.startsWith('thermal-resistance-converter-') && key !== CACHE_NAME;
    }).map(function(key) {
      return caches.delete(key);
    }));
  }).then(function() {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function(event) {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(function(cached) {
    const network = fetch(event.request).then(function(response) {
      if (response && response.ok && new URL(event.request.url).origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, copy);
        });
      }
      return response;
    }).catch(function() {
      return cached || caches.match("./index.html");
    });
    return cached || network;
  }));
});