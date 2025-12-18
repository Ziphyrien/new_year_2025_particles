const CACHE_NAME = 'new-year-2025-cache-v1';

// Files to cache immediately
const PRECACHE_URLS = [
    './',
    './index.html',
    './css/style.css',
    './src/main.js',
    './src/Particles.js',
    './src/shaders.js',
    './src/GestureController.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Activate worker immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Take control of all clients immediately
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Strategy: Cache First, falling back to Network
    // We specifically target MediaPipe files from jsdelivr
    if (url.hostname.includes('cdn.jsdelivr.net') && url.pathname.includes('@mediapipe')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request).then((response) => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'cors') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                });
            })
        );
    } else {
        // For other requests, try network first, but you could also use Stale-While-Revalidate
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
    }
});