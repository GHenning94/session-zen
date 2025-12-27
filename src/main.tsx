import { createRoot } from 'react-dom/client'
import { useState, useEffect, useCallback } from 'react'
import App from './App.tsx'
import './index.css'
import './styles/premium.css'
import './hooks/useThemeFlashPrevention'
import { AvatarCacheProvider } from './contexts/AvatarCacheContext'
import { PWASplashScreen, useIsPWA } from './components/PWASplashScreen'

// Register Service Worker for Web Push Notifications
// Simplificado para evitar conflitos entre perfis do navegador
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Registrar novo SW (o cleanup foi feito no index.html)
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none' // Forçar sempre buscar novo SW
      })
      console.log('[Main] SW registered:', registration.scope)
    } catch (error) {
      // Silenciar erro - SW é opcional para funcionalidade básica
      console.log('[Main] SW registration skipped:', error.message)
    }
  })
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
