import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MSymbol } from "@/components/amano/m-symbol";
import { CATEGORIES } from "@/components/amano/category-chip";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

export type JobStatus = "open" | "accepted" | "paid" | "in_progress" | "finished" | "completed" | "cancelled" | "payment_rejected" | "pending_offer" | "offer_rejected" | "payment_under_review";

export const STATUS_LABELS: Record<JobStatus, string> = {
  open: "Recibiendo Ofertas",
  pending_offer: "Oferta Enviada",
  offer_rejected: "Oferta Rechazada",
  accepted: "Oferta Aceptada",
  payment_under_review: "Pago en Revisión",
  paid: "Pago Verificado",
  in_progress: "En Proceso",
  finished: "Por cerrar (Admin)",
  completed: "Completado",
  cancelled: "Cancelado",
  payment_rejected: "Pago Rechazado",
};

interface JobCardProps {
  id: string;
  category: string;
  title?: string;
  description: string;
  barrio: string;
  status: JobStatus;
  offersCount?: number;
  photos_urls?: string[] | null;
  isAssigned?: boolean;
  clientName?: string;
  createdAt?: string;
}

export function JobCard({ id, category, title, description, barrio, status, offersCount = 0, photos_urls, isAssigned, clientName, createdAt }: JobCardProps) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const isAccepted = status === "accepted" || status === "paid" || status === "in_progress";
  const isRejected = status === "offer_rejected" || status === "cancelled" || status === "payment_rejected";
  
  // Formatear fecha
  const dateObj = createdAt ? new Date(createdAt) : null;
  let timeAgo = "";
  if (dateObj) {
    if (isToday(dateObj)) {
      timeAgo = "Publicado hoy";
    } else if (isYesterday(dateObj)) {
      timeAgo = "Publicado ayer";
    } else {
      timeAgo = `Publicado ${formatDistanceToNow(dateObj, { addSuffix: true, locale: es })}`;
    }
  }
  
  // Para el proveedor, el rechazo de pago es "Amarillo" (Informativo), para el cliente es "Rojo" (Acción)
  const isProviderView = isAssigned;
  const isPaymentError = status === "payment_rejected";

  // Clase de color para el badge
  const badgeColor = isRejected 
    ? (isPaymentError && isProviderView ? "bg-amber-500 text-amber-950" : "bg-error text-on-error")
    : (isAssigned || isAccepted) 
      ? "bg-success text-on-success" 
      : "bg-primary text-on-primary shadow-sm";

  // Clase de fondo para la card
  const cardBg = isRejected 
    ? (isPaymentError && isProviderView ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/10" : "bg-error-container/15 border-error/30 ring-1 ring-error/10")
    : isAssigned 
      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
      : isAccepted 
        ? "bg-success-container/10 border-success/20" 
        : "bg-surface-container-lowest";

  const firstPhoto = photos_urls && photos_urls.length > 0 ? photos_urls[0] : null;

  return (
    <Link
      href={`/trabajos/${id}`}
      className={cn(
        "block rounded-xl p-4 shadow-sm hover:shadow-ambient transition-all border border-outline-variant/10 relative overflow-hidden",
        cardBg
      )}
    >
      {isAssigned && !isRejected && (
        <div className="absolute top-0 right-0 bg-primary text-on-primary text-[9px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-tight z-10 shadow-sm">
          Fuiste elegido
        </div>
      )}
      
      {isRejected && (
        <div className={cn(
          "absolute top-0 right-0 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-tight z-10 shadow-sm",
          isPaymentError && isProviderView ? "bg-amber-600" : "bg-error"
        )}>
          {isPaymentError && isProviderView ? "En espera" : "Atención"}
        </div>
      )}
      
      <div className="flex gap-4 md:gap-6">
        {/* Thumbnail container - Always visible to preserve alignment */}
        <div className={cn(
          "relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden shrink-0 border border-outline-variant/10",
          !firstPhoto ? "bg-surface-container-high/40 flex items-center justify-center" : "",
          isRejected && "grayscale-[0.5] opacity-80"
        )}>
          {firstPhoto ? (
            <NextImage
              src={firstPhoto}
              alt={title || description}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <MSymbol icon="image" size={24} className="text-outline-variant/30" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Fila Superior: Categoría y Estado */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full shrink-0",
                isRejected ? (isPaymentError && isProviderView ? "bg-amber-500/20" : "bg-error/10") : "bg-primary/10"
              )}>
                <MSymbol icon={cat?.icon ?? "build"} size={12} className={isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary"} filled />
              </span>
              <p className={cn(
                "text-[10px] md:text-xs font-black uppercase tracking-widest truncate",
                isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary"
              )}>
                {cat?.label ?? category}
              </p>
            </div>
            <Badge className={cn(
              "rounded-full text-[9px] md:text-[10px] px-2.5 py-0.5 whitespace-nowrap font-bold uppercase tracking-wider h-fit border-none shrink-0",
              badgeColor
            )}>
              {STATUS_LABELS[status]}
            </Badge>
          </div>
          
          {/* Título */}
          <h3 className={cn(
            "font-headline font-bold text-base md:text-lg leading-tight truncate mb-0.5",
            isRejected ? (isPaymentError && isProviderView ? "text-amber-900" : "text-error") : "text-on-surface"
          )}>
            {title || description}
          </h3>

          {/* Nombre del Cliente y Fecha - Ahora con más espacio horizontal */}
          <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
            {clientName && (
              <div className="flex items-center gap-1 text-[11px] md:text-xs font-bold text-on-surface-variant/70 min-w-0">
                <MSymbol icon="person" size={12} className="text-primary shrink-0" filled />
                <span className="truncate">{clientName}</span>
              </div>
            )}
            {timeAgo && (
              <span className="text-[10px] md:text-[11px] text-on-surface-variant/80 font-bold whitespace-nowrap italic shrink-0">
                {timeAgo}
              </span>
            )}
          </div>

          {/* Descripción corta */}
          <p className="text-xs md:text-sm text-on-surface-variant line-clamp-1 italic opacity-70 mb-3">
            {description}
          </p>
          
          {/* Footer: Ubicación y Ofertas */}
          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/5 gap-2">
            <div className="flex items-center gap-1.5 text-on-surface font-bold text-[10px] md:text-[11px] bg-surface-container-high/40 px-2 py-1 rounded-md min-w-0">
              <MSymbol icon="location_on" size={14} className={isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary"} filled shrink-0 />
              <span className="tracking-tight uppercase truncate">{barrio}</span>
            </div>
            
            {offersCount > 0 && (
              <div className={cn(
                "flex items-center gap-1.5 text-[9px] md:text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm shrink-0",
                isRejected 
                  ? (isPaymentError && isProviderView ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-error/10 text-error border border-error/20")
                  : isAssigned || isAccepted 
                    ? "bg-success/10 text-success border border-success/20" 
                    : "bg-amber-400 text-amber-950 border border-amber-500/20"
              )}>
                <MSymbol icon={isRejected ? (isPaymentError && isProviderView ? "schedule" : "error") : (isAssigned || isAccepted ? "check_circle" : "bolt")} size={12} filled />
                <span className="tracking-tighter uppercase whitespace-nowrap">
                  {isRejected ? (isPaymentError && isProviderView ? "PENDIENTE" : "RECHAZADO") : (isAssigned || isAccepted ? "ASIGNADO" : `${offersCount} ${offersCount === 1 ? "OFERTA" : "OFERTAS"}`)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
