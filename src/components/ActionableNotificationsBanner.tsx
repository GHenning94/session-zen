import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, CreditCard, Shield, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { use2FA } from '@/hooks/use2FA';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfileModal } from '@/contexts/ProfileModalContext';
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
  }, [loading2FA, user]);

  const loadNotifications = async () => {
    const actionableNotifications: ActionableNotification[] = [];

    // Get hidden notifications from localStorage
    const hiddenNotifications = localStorage.getItem('hiddenNotifications');
    const hidden = hiddenNotifications ? JSON.parse(hiddenNotifications) : [];

    // Check for 2FA not configured
    if (!loading2FA && !has2FAConfigured() && !hidden.includes('2fa-not-configured')) {
      actionableNotifications.push({
        id: '2fa-not-configured',
        icon: <Shield className="h-5 w-5" />,
        message: 'Aumente a segurança da sua conta ativando a autenticação de dois fatores',
        action: 'Configurar 2FA',
        route: '/configuracoes?tab=security',
      });
    }

    // Check for pending payments
    if (user && !hidden.includes('pending-payments')) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'pendente')
        .eq('metodo_pagamento', 'pendente');

      if (sessions && sessions.length > 0) {
        actionableNotifications.push({
          id: 'pending-payments',
          icon: <CreditCard className="h-5 w-5" />,
          message: `${sessions.length} pagamento${sessions.length > 1 ? 's exigem' : ' exige'} atenção`,
          action: 'Ver Pagamentos',
          route: '/pagamentos',
          count: sessions.length,
        });
      }
    }

    setNotifications(actionableNotifications);
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('actionableNotificationsDismissed', 'true');
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
    if (route === '/configuracoes?tab=security') {
      // Open profile modal to security tab
      profileModal.openToSecurity();
    } else {
      navigate(route);
    }
  };

  if (!visible || notifications.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 border-warning/50 bg-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between gap-4 p-3 bg-background/50 rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex-shrink-0 text-warning">
                      {notification.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleAction(notification.route)}
                    >
                      {notification.action}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleHideNotification(notification.id)}
                      title="Não mostrar novamente"
                    >
                      <EyeOff className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDismiss}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

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
