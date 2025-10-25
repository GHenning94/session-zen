// Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event)
  
  let data = { title: 'Nova notificação', body: '' }
  
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      console.error('[SW] Failed to parse push data:', e)
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body || data.conteudo,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: data.tag || 'notification',
    requireInteraction: false,
    data: {
      url: data.url || '/',
      ...data
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || data.titulo, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed')
  // Handle subscription refresh if needed
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options)
      .then((subscription) => {
        console.log('[SW] Subscription refreshed')
        // Could send to server to update
      })
  )
})

// Basic caching for offline support (optional)
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(clients.claim())
})
