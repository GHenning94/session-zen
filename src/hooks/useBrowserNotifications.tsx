import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

export const useBrowserNotifications = () => {
  const { user } = useAuth();
  const permissionGranted = useRef(false);

  // Request notification permission
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionGranted.current = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionGranted.current = permission === 'granted';
      return permission === 'granted';
    }

    return false;
  };

  // Show browser notification
  const showNotification = (title: string, body: string) => {
    if (!permissionGranted.current || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'therapypro-notification',
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      // Focus window on click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Erro ao mostrar notificação:', error);
    }
  };

  // Initialize on mount
  useEffect(() => {
    if (user && Notification.permission === 'granted') {
      permissionGranted.current = true;
    }
  }, [user]);

  return {
    requestPermission,
    showNotification,
    isSupported: 'Notification' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'default'
  };
};
