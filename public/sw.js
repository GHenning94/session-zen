// Service Worker v1.0.0 - TherapyPro
// Este arquivo é necessário para evitar erros de registro do SW

const CACHE_VERSION = 'v1.0.0';

// Instalação - ativa imediatamente sem esperar
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  self.skipWaiting();
});

// Ativação - limpa caches antigos e assume controle
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch - não intercepta requests, deixa passar direto
// Isso evita problemas de cache inconsistente entre perfis
self.addEventListener('fetch', (event) => {
  // Não fazer nada - deixar o navegador lidar normalmente
  return;
});
