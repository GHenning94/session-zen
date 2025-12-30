import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CreditCard, Shield, EyeOff, Repeat, GripHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { use2FA } from '@/hooks/use2FA';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfileModal } from '@/contexts/ProfileModalContext';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ActionableNotification {
  id: string;
  icon: React.ReactNode;
  message: string;
  action: string;
  route: string;
  count?: number;
}

export const ActionableNotificationsBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { has2FAConfigured, loading: loading2FA } = use2FA();
  const profileModal = useProfileModal();
  const [visible, setVisible] = useState(true);
  const [notifications, setNotifications] = useState<ActionableNotification[]>([]);
  const [showHideDialog, setShowHideDialog] = useState(false);
  const [notificationToHide, setNotificationToHide] = useState<string | null>(null);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('actionableNotificationsDismissed', 'true');
  };

  const { handlers: swipeHandlers, style: swipeStyle } = useSwipeToDismiss({
    threshold: 100,
    onDismiss: handleDismiss,
  });

  useEffect(() => {
    // Check if banner was dismissed in this session
    const dismissed = sessionStorage.getItem('actionableNotificationsDismissed');
    if (dismissed === 'true') {
      setVisible(false);
      return;
    }

    // Check for permanently hidden notifications
    const hiddenNotifications = localStorage.getItem('hiddenNotifications');
    if (hiddenNotifications) {
      try {
        const hidden = JSON.parse(hiddenNotifications);
        if (Array.isArray(hidden)) {
          // Filter logic will be applied in loadNotifications
        }
      } catch (e) {
        console.error('Error parsing hidden notifications:', e);
      }
    }

    loadNotifications();
  }, [loading2FA, user, has2FAConfigured]);

  const loadNotifications = async () => {
    const actionableNotifications: ActionableNotification[] = [];

    // Get hidden notifications from localStorage
    const hiddenNotifications = localStorage.getItem('hiddenNotifications');
    const hidden = hiddenNotifications ? JSON.parse(hiddenNotifications) : [];

    // Check for 2FA not configured - SEMPRE usa texto curto no botão
    if (!loading2FA && !has2FAConfigured() && !hidden.includes('2fa-not-configured')) {
      actionableNotifications.push({
        id: '2fa-not-configured',
        icon: <Shield className="h-5 w-5" />,
        message: 'Proteja sua conta com autenticação de dois fatores',
        action: 'Configurar 2FA',
        route: '/configuracoes?tab=seguranca',
      });
    }

    // Sessões individuais sem método de pagamento agora aparecem como notificação regular
    // no sistema de notificações (não mais no banner acionável)

    // Check for recurring sessions without payment method
    if (user && !hidden.includes('recurring-no-payment-method')) {
      const { data: recurringSessions } = await supabase
        .from('recurring_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'ativa')
        .or('metodo_pagamento.eq.A definir,metodo_pagamento.is.null');

      if (recurringSessions && recurringSessions.length > 0) {
        actionableNotifications.push({
          id: 'recurring-no-payment-method',
          icon: <Repeat className="h-5 w-5" />,
          message: `${recurringSessions.length} sessão(ões) recorrente(s) sem método de pagamento definido`,
          action: 'Ver Recorrências',
          route: '/sessoes-recorrentes',
          count: recurringSessions.length,
        });
      }
    }

    setNotifications(actionableNotifications);
  };

  const handleHideNotification = (notificationId: string) => {
    setNotificationToHide(notificationId);
    setShowHideDialog(true);
  };

  const confirmHideNotification = () => {
    if (!notificationToHide) return;

    // Save to localStorage
    const hiddenNotifications = localStorage.getItem('hiddenNotifications');
    const hidden = hiddenNotifications ? JSON.parse(hiddenNotifications) : [];
    
    if (!hidden.includes(notificationToHide)) {
      hidden.push(notificationToHide);
      localStorage.setItem('hiddenNotifications', JSON.stringify(hidden));
    }

    // Remove from current notifications
    setNotifications(prev => prev.filter(n => n.id !== notificationToHide));
    setShowHideDialog(false);
    setNotificationToHide(null);

    // If no more notifications, hide banner
    if (notifications.length <= 1) {
      setVisible(false);
    }
  };

  const handleAction = (route: string) => {
    // Always navigate to the route directly
    navigate(route);
  };

  if (!visible || notifications.length === 0) {
    return null;
  }

  return (
    <>
      <div
        {...swipeHandlers}
        style={swipeStyle}
        className="touch-pan-y"
      >
        <Card className="mb-6 border-warning/50 bg-warning/5 overflow-hidden">
          <CardContent className="py-2 px-3 md:px-4">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                className="flex items-center justify-between gap-3"
              >
                {/* Message with icon */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-warning">
                    {notification.icon}
                  </div>
                  <p className="text-sm font-medium truncate md:whitespace-normal">
                    {notification.message}
                  </p>
                </div>
                {/* Action buttons - grouped together */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleAction(notification.route)}
                    className="whitespace-nowrap"
                  >
                    {notification.action}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleHideNotification(notification.id)}
                    title="Não mostrar novamente"
                    className="h-8 w-8"
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDismiss}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ocultar notificação permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta notificação não será mais exibida. Você poderá reativar notificações nas configurações se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowHideDialog(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmHideNotification}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
