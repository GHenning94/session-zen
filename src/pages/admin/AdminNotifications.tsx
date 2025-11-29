import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminNotificationPanel } from "@/components/admin/AdminNotificationPanel";

export default function AdminNotifications() {
  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            Acompanhe eventos críticos do sistema em tempo real
          </p>
        </div>

        <AdminNotificationPanel />
      </div>
    </AdminLayout>
  );
}
