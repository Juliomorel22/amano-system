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
  payment_under_review: "En revisión",
  paid: "Confirmado",
  in_progress: "En Proceso",
  finished: "Por cerrar (Admin)",
  completed: "Completado",
  cancelled: "Cancelado",
  payment_rejected: "Rechazado",
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
  showDescription?: boolean;
  is_urgent?: boolean;
  urgent_expires_at?: string;
}

export function JobCard({ id, category, title, description, barrio, status, offersCount = 0, photos_urls, isAssigned, clientName, createdAt, showDescription, is_urgent, urgent_expires_at }: JobCardProps) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const isAccepted = status === "accepted" || status === "paid" || status === "in_progress";
  const isRejected = status === "offer_rejected" || status === "cancelled" || status === "payment_rejected";
  
  // Formatear fecha
  const dateObj = createdAt ? new Date(createdAt) : null;
  let timeAgo = "";
  if (dateObj) {
    if (isToday(dateObj)) {
      timeAgo = "hoy";
    } else if (isYesterday(dateObj)) {
      timeAgo = "ayer";
    } else {
      timeAgo = formatDistanceToNow(dateObj, { addSuffix: false, locale: es });
    }
  }
  
  const isProviderView = isAssigned;
  const isPaymentError = status === "payment_rejected";

  const badgeColor = isRejected 
    ? (isPaymentError && isProviderView ? "bg-amber-500 text-amber-950" : "bg-error text-on-error")
    : (isAssigned || isAccepted || status === "completed" || status === "finished") 
      ? "bg-success text-on-success" 
      : is_urgent
        ? "bg-amber-600 text-white animate-pulse shadow-[0_0_10px_rgba(217,119,6,0.5)]"
        : "bg-primary text-on-primary shadow-sm";

  const cardBg = isRejected 
    ? (isPaymentError && isProviderView ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/10" : "bg-error-container/15 border-error/30 ring-1 ring-error/10")
    : isAssigned 
      ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
      : isAccepted 
        ? "bg-success-container/10 border-success/20" 
        : is_urgent
          ? "bg-amber-50/50 border-amber-500/20"
          : "bg-surface-container-lowest";

  const firstPhoto = photos_urls && photos_urls.length > 0 ? photos_urls[0] : null;

  return (
    <Link
      href={`/trabajos/${id}`}
      className={cn(
        "block rounded-2xl p-4 shadow-sm active:scale-[0.98] hover:shadow-ambient transition-all border border-outline-variant/10 relative overflow-hidden",
        cardBg
      )}
    >
      {is_urgent && status === "open" && (
        <div className="absolute top-0 right-0 bg-amber-600 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-tighter z-10 shadow-sm flex items-center gap-1">
          <MSymbol icon="bolt" size={10} filled />
          Urgente 2h
        </div>
      )}

      {isAssigned && !isRejected && !is_urgent && (
        <div className="absolute top-0 right-0 bg-primary text-on-primary text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-tight z-10 shadow-sm">
          Fuiste elegido
        </div>
      )}
      
      {isRejected && (
        <div className={cn(
          "absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl rounded-tr-xl uppercase tracking-tight z-10 shadow-sm",
          isPaymentError && isProviderView ? "bg-amber-600" : "bg-error"
        )}>
          {isPaymentError && isProviderView ? "En espera" : "Atención"}
        </div>
      )}
      
      <div className="flex gap-4">
        {/* Thumbnail container */}
        <div className={cn(
          "relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-outline-variant/10",
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
            <MSymbol icon={cat?.icon ?? "build"} size={28} className="text-primary/20" />
          )}
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest truncate",
                  isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary/80"
                )}>
                  {cat?.label ?? category}
                </p>
              </div>
              <Badge className={cn(
                "rounded-full text-[9px] px-2.5 py-0.5 whitespace-nowrap font-bold uppercase tracking-wider h-fit border-none shrink-0",
                badgeColor
              )}>
                {STATUS_LABELS[status]}
              </Badge>
            </div>
            
            <h3 className={cn(
              "font-headline font-bold text-base leading-tight truncate",
              isRejected ? (isPaymentError && isProviderView ? "text-amber-900" : "text-error") : "text-on-surface"
            )}>
              {title || description}
            </h3>

            <div className="flex items-center gap-2 text-[11px] font-medium text-on-surface-variant/70 min-w-0">
              {clientName && (
                <span className="truncate flex items-center gap-1">
                  <MSymbol icon="person" size={12} className="text-primary/60 shrink-0" filled />
                  {clientName}
                </span>
              )}
              <span className="shrink-0 text-outline-variant">•</span>
              <span className="shrink-0 italic">{timeAgo}</span>
            </div>

            {showDescription && title && (
              <p className="text-xs text-on-surface-variant/70 line-clamp-2 mt-1 leading-relaxed italic">
                {description}
              </p>
            )}
          </div>
          
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-on-surface font-bold text-[10px] bg-surface-container/50 px-2 py-1 rounded-md min-w-0">
              <MSymbol icon="location_on" size={14} className={isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary"} filled shrink-0 />
              <span className="tracking-tight uppercase truncate">{barrio}</span>
            </div>
            
            {offersCount > 0 && (
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-black shrink-0",
                isRejected 
                  ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error")
                  : isAssigned || isAccepted 
                    ? "text-success" 
                    : "text-amber-600"
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
