import { createRoot } from 'react-dom/client'
import { useState, useEffect, useCallback } from 'react'
import App from './App.tsx'
import './index.css'
import './styles/premium.css'
import './hooks/useThemeFlashPrevention'
import { AvatarCacheProvider } from './contexts/AvatarCacheContext'
import { PWASplashScreen, useIsPWA } from './components/PWASplashScreen'

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

// Root component with PWA splash screen
const RootApp = () => {
  const isPWA = useIsPWA();
  const [showSplash, setShowSplash] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    // Only show splash on PWA and first load of the session
    const hasShownSplash = sessionStorage.getItem('pwa-splash-shown');
    if (isPWA && !hasShownSplash) {
      setShowSplash(true);
      sessionStorage.setItem('pwa-splash-shown', 'true');
    } else {
      setSplashFinished(true);
    }
  }, [isPWA]);

  const handleSplashFinish = useCallback(() => {
    setSplashFinished(true);
    setShowSplash(false);
  }, []);

  return (
    <>
      {showSplash && <PWASplashScreen onFinish={handleSplashFinish} />}
      {splashFinished && (
        <AvatarCacheProvider>
          <App />
        </AvatarCacheProvider>
      )}
    </>
  );
};

createRoot(document.getElementById("root")!).render(<RootApp />);
