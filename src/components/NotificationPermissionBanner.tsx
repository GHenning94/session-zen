import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';
import { usePushSubscription } from '@/hooks/usePushSubscription';

export const NotificationPermissionBanner = () => {
  const [show, setShow] = useState(false);
  const { requestPermission, isSupported, permission } = useBrowserNotifications();
  const { subscribe: subscribePush, isSupported: pushSupported } = usePushSubscription();

  useEffect(() => {
    // Banner disabled due to push service errors
    // Users can enable notifications via settings
  }, [isSupported, permission]);

  const handleAllow = async () => {
    const granted = await requestPermission();
    
    // Also subscribe to Web Push if supported
    if (pushSupported && Notification.permission === 'granted') {
      await subscribePush();
    }
    
    if (granted) {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    // Save preference to not show again
    localStorage.setItem('notification-permission-dismissed', 'true');
  };

  // Don't show if user already dismissed it
  if (localStorage.getItem('notification-permission-dismissed')) {
    return null;
  }

  // Banner permanently disabled
  return null;

  /* Disabled due to push service configuration issues
  if (!show || !isSupported || permission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-lg shadow-elegant p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">
              Ativar Notificações
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Receba alertas importantes sobre sessões, pagamentos e mensagens diretamente no seu navegador.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAllow}
                className="bg-gradient-primary hover:opacity-90"
              >
                Permitir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
              >
                Agora não
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
  */
};
