import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminApiCall } from "@/utils/adminApi";
import { toast } from "sonner";
import { Bell, AlertTriangle, DollarSign, Activity, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "security" | "payment" | "usage" | "system";
  severity: "info" | "warning" | "critical";
  read: boolean;
  metadata?: any;
  created_at: string;
}

export const AdminNotificationPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadNotifications();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications'
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterType]);

  const loadNotifications = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterType !== "all") {
        params.type = filterType;
      }

      const { data, error } = await adminApiCall('admin-get-notifications', params);

      if (error) throw error;

      setNotifications(data.notifications || []);
      setStats(data.stats || {});
    } catch (error: any) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await adminApiCall('admin-mark-notification-read', {
        notification_id: notificationId
      });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await adminApiCall('admin-mark-notification-read', {
        mark_all: true
      });

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('Todas notificações marcadas como lidas');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      toast.error('Erro ao marcar todas como lidas');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "security":
        return <AlertTriangle className="h-4 w-4" />;
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      case "usage":
        return <Activity className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "warning":
        return "secondary";
      default:
        return "outline";
    }
  };

  const filteredNotifications = filterType === "all" 
    ? notifications 
    : notifications.filter(n => n.type === filterType);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações do Sistema
            </CardTitle>
            <CardDescription>
              {stats.unread} não lida(s) • {stats.critical} crítica(s)
            </CardDescription>
          </div>
          {stats.unread > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filterType} onValueChange={setFilterType}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              Todas ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="security">
              Segurança ({stats.by_type?.security || 0})
            </TabsTrigger>
            <TabsTrigger value="payment">
              Pagamentos ({stats.by_type?.payment || 0})
            </TabsTrigger>
            <TabsTrigger value="usage">
              Uso ({stats.by_type?.usage || 0})
            </TabsTrigger>
            <TabsTrigger value="system">
              Sistema ({stats.by_type?.system || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filterType} className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma notificação
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 rounded-lg border transition-colors",
                        !notification.read && "bg-muted/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex gap-3 flex-1">
                          <div className={cn(
                            "mt-1",
                            notification.severity === "critical" && "text-destructive",
                            notification.severity === "warning" && "text-warning"
                          )}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{notification.title}</h4>
                              <Badge variant={getSeverityColor(notification.severity)} className="text-xs">
                                {notification.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.created_at), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </p>
                          </div>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
