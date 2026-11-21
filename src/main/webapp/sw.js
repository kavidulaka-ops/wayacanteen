// ==========================================================================
// WAYACANTEEN - PWA SERVICE WORKER
// Version: 1.0.0 (Cache: wayacanteen-pwa-v1)
// ==========================================================================

const CACHE_NAME = 'wayacanteen-pwa-v1';

// Core Application Shell & Offline Assets
const PRECACHE_ASSETS = [
    './',
    'home.html',
    'login.html',
    'food.html',
    'stationery.html',
    'finance.html',
    'help-center.html',
    'cart.html',
    'order-history.html',
    'offline.html',
    'manifest.json',
    'home.css',
    'login.css',
    'food.css',
    'stationery.css',
    'finance.css',
    'help-center.css',
    'cart.css',
    'canteen-queue-live.js',
    'pwa-install.js',
    'images/icons/icon-72x72.png',
    'images/icons/icon-96x96.png',
    'images/icons/icon-128x128.png',
    'images/icons/icon-144x144.png',
    'images/icons/icon-152x152.png',
    'images/icons/icon-192x192.png',
    'images/icons/icon-384x384.png',
    'images/icons/icon-512x512.png',
    'images/icons/maskable-icon-192x192.png',
    'images/icons/maskable-icon-512x512.png',
    'images/icons/apple-touch-icon.png',
    'images/icons/favicon.png',
    'images/stationery-notebook-3d.png',
    'images/stationery-pencil-3d.png',
    'images/stationery-calculator-3d.png',
    'images/stationery-pen-highlighter-3d.png',
    'images/stationery-straight-ruler-3d.png',
    'images/stationery-triangle-ruler-3d.png',
    'images/samosa-3d.png',
    'images/yellow-rice-plate-3d.png',
    'images/chicken-kottu-3d.png',
    'images/egg-roll-3d.png',
    'images/ulundu-vadai-3d.png',
    'images/parippu-vadai-3d.png',
    'images/vegetable-roti-3d.png',
    'images/sausage-bun-3d.png'
];

// ================= 1. INSTALL EVENT =================
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Precache with error resilience: cache items one by one so single missing asset doesn't break install
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url => {
                        return cache.add(url).catch(err => {
                            console.warn(`[PWA SW] Precache failed for ${url}:`, err);
                        });
                    })
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ================= 2. ACTIVATE EVENT =================
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[PWA SW] Removing obsolete cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ================= 3. FETCH EVENT =================
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);

    // Only process HTTP/HTTPS GET requests
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // Dynamic API endpoints & Server Actions (always Network-First, do not fallback to offline HTML)
    const isApiRequest = url.pathname.includes('/help-requests') ||
                         url.pathname.includes('/api/') ||
                         url.pathname.includes('/login') ||
                         url.pathname.includes('/register') ||
                         url.pathname.includes('/cart') ||
                         url.pathname.includes('/order');

    if (isApiRequest) {
        event.respondWith(
            fetch(request).catch(err => {
                // If offline and request is in cache, return it
                return caches.match(request);
            })
        );
        return;
    }

    // HTML Navigation requests (pages)
    if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(request)
                .then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Try cache first
                    return caches.match(request).then(cachedResponse => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // If not in cache, fallback to offline.html
                        return caches.match('offline.html');
                    });
                })
        );
        return;
    }

    // Static Assets (CSS, JS, Fonts, Images) -> Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            const fetchPromise = fetch(request).then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(err => {
                // Network failed, nothing to update
            });

            return cachedResponse || fetchPromise;
        })
    );
});
