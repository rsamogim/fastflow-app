/**
 * FastFlow — Service Worker PWA
 * Estratégia Cache-First para funcionamento offline completo,
 * invalidação de cache por versão e gerenciamento de notificações.
 */

const CACHE_NAME = 'fastflow-v3.0.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/reset.css',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './css/print.css',
  './js/app.js',
  './js/state.js',
  './js/storage.js',
  './js/timer.js',
  './js/protocols.js',
  './js/history.js',
  './js/stats.js',
  './js/charts.js',
  './js/notifications.js',
  './js/ui.js',
  './js/theme.js',
  './js/utils.js',
  './js/glp1.js',
  './js/license.js',
  './js/reports.js',
  './js/inventory.js',
  './js/nutrition.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png'
];

// 1. Instalação: Pré-cache dos arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[FastFlow SW] Pré-armazenando assets essenciais no cache');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Ativação: Limpeza de versões anteriores de cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('[FastFlow SW] Removendo cache legado:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Interceptação de requisições: Estratégia Cache-First com fallback de rede
self.addEventListener('fetch', (event) => {
  // Ignora chamadas com esquemas incompatíveis (ex: chrome-extension)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Se for uma requisição bem-sucedida de mesma origem ou fontes, armazena no cache dinâmico
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            (event.request.url.startsWith(self.location.origin) ||
              event.request.url.includes('fonts.googleapis.com') ||
              event.request.url.includes('fonts.gstatic.com'))
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Se estiver totalmente offline e navegando, entrega a página principal index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// 4. Clique em Notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('index.html') && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('./index.html');
        }
      })
  );
});
