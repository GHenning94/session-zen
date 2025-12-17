import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/premium.css'
import './hooks/useThemeFlashPrevention'
import { AvatarCacheProvider } from './contexts/AvatarCacheContext'

// Register Service Worker for Web Push Notifications
if ('serviceWorker' in navigator && 'PushManager' in window) {
  console.log('[Main] Service Worker and Push API supported')
  
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      console.log('[Main] Service Worker registered successfully:', registration.scope)
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready
      console.log('[Main] Service Worker is ready')
    } catch (error) {
      console.error('[Main] Service Worker registration failed:', error)
    }
  })
} else {
  console.log('[Main] Service Worker or Push API not supported in this browser')
}

createRoot(document.getElementById("root")!).render(
  <AvatarCacheProvider>
    <App />
  </AvatarCacheProvider>
);
