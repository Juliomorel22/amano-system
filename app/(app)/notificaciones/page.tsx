"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { MSymbol } from "@/components/amano/m-symbol";
import Link from "next/link";

export default function NotificacionesPage() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)] bg-surface pb-10">
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">
          Notificaciones
        </h1>
        {notifications.some(n => !n.is_read) && (
          <button 
            onClick={markAllAsRead}
            className="text-primary text-xs font-bold hover:underline"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="flex-1 mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 text-on-surface-variant">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
            <span className="text-sm font-medium">Cargando notificaciones...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="bg-surface-container-lowest p-6 rounded-full mb-4">
              <MSymbol icon="notifications_off" size={48} className="text-outline-variant" />
            </div>
            <h3 className="font-headline font-bold text-on-surface text-lg">No hay notificaciones</h3>
            <p className="text-on-surface-variant text-sm mt-1 max-w-[240px]">
              Te avisaremos cuando alguien interactúe con tus pedidos u ofertas.
            </p>
          </div>
        ) : (
          <div className="space-y-px">
            {notifications.map((notification) => (
              <Link 
                key={notification.id}
                href={notification.link || "#"}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
                className={`flex gap-4 px-5 py-4 transition-colors ${
                  notification.is_read 
                    ? "bg-surface hover:bg-surface-container-low" 
                    : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <div className={`mt-1 size-10 flex items-center justify-center rounded-full shrink-0 ${
                  getNotificationBgColor(notification.type)
                }`}>
                  <MSymbol 
                    icon={getNotificationIcon(notification.type)} 
                    size={22} 
                    className={getNotificationIconColor(notification.type)}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`font-bold text-sm truncate ${
                      notification.is_read ? "text-on-surface" : "text-primary"
                    }`}>
                      {notification.title}
                    </span>
                    <span className="text-[10px] text-on-surface-variant whitespace-nowrap">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant line-clamp-2 leading-snug">
                    {notification.content}
                  </p>
                </div>

                {!notification.is_read && (
                  <div className="mt-1.5 size-2 rounded-full bg-primary shrink-0 self-start" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case "new_offer": return "local_offer";
    case "offer_accepted": return "check_circle";
    case "new_message": return "chat";
    case "new_review": return "brand_awareness";
    case "job_status": return "info";
    default: return "notifications";
  }
}

function getNotificationBgColor(type: string): string {
  switch (type) {
    case "new_offer": return "bg-blue-100";
    case "offer_accepted": return "bg-green-100";
    case "new_message": return "bg-purple-100";
    case "new_review": return "bg-orange-100";
    case "job_status": return "bg-gray-100";
    default: return "bg-primary/10";
  }
}

function getNotificationIconColor(type: string): string {
  switch (type) {
    case "new_offer": return "text-blue-600";
    case "offer_accepted": return "text-green-600";
    case "new_message": return "text-purple-600";
    case "new_review": return "text-orange-600";
    case "job_status": return "text-gray-600";
    default: return "text-primary";
  }
}
