const CACHE_NAME = 'tuka-v2.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/styles/variables.css',
  '/styles/main.css',
  '/scripts/app.js',
  '/scripts/photos.js',
  '/scripts/logo.js',
  '/scripts/canvas.js',
  '/scripts/export.js',
  '/scripts/tour.js',
  '/scripts/limits.js',
  '/scripts/api.js',
  '/images/logo-tuka.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json'
];

// Instala e faz cache de todos os assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .catch(err => console.warn('SW install cache error:', err))
  );
  self.skipWaiting();
});

// Apaga caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Nunca fazer cache da API de remoção de fundo
  if (url.includes('/remove-bg') || url.includes('workers.dev') || url.includes('huggingface')) {
    return;
  }

  // Nunca fazer cache de pedidos de outros domínios (Google Fonts, etc.)
  if (!url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // Navegação — network first, fallback para index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Assets estáticos — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response('', { status: 408 }));
    })
  );
});
