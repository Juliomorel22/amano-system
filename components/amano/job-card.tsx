import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { MSymbol } from "@/components/amano/m-symbol";
import { CATEGORIES } from "@/components/amano/category-chip";
import { cn } from "@/lib/utils";
import NextImage from "next/image";

export type JobStatus = "open" | "accepted" | "paid" | "in_progress" | "finished" | "completed" | "cancelled" | "payment_rejected" | "pending_offer" | "offer_rejected";

export const STATUS_LABELS: Record<JobStatus, string> = {
  open: "Recibiendo Ofertas",
  pending_offer: "Oferta Enviada",
  offer_rejected: "Oferta Rechazada",
  accepted: "Oferta Aceptada",
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
}

export function JobCard({ id, category, title, description, barrio, status, offersCount = 0, photos_urls, isAssigned, clientName }: JobCardProps) {
  const cat = CATEGORIES.find((c) => c.id === category);
  const isAccepted = status === "accepted" || status === "paid" || status === "in_progress";
  const isRejected = status === "offer_rejected" || status === "cancelled" || status === "payment_rejected";
  
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
        <div className="absolute top-0 right-0 bg-primary text-on-primary text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter z-10">
          Fuiste elegido
        </div>
      )}
      
      {isRejected && (
        <div className={cn(
          "absolute top-0 right-0 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter z-10",
          isPaymentError && isProviderView ? "bg-amber-600" : "bg-error"
        )}>
          {isPaymentError && isProviderView ? "En espera" : "Atención"}
        </div>
      )}
      
      <div className="flex gap-4">
        {/* Thumbnail if photo exists */}
        {firstPhoto && (
          <div className={cn(
            "relative w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-outline-variant/10",
            isRejected && "grayscale-[0.5] opacity-80"
          )}>
            <NextImage
              src={firstPhoto}
              alt={title || description}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold text-outline-variant uppercase bg-surface-container-high px-1.5 py-0.5 rounded w-fit tracking-tighter">
                ID: {id.split("-")[0]}
              </p>
              {clientName && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant truncate max-w-[100px]">
                  <MSymbol icon="person" size={12} className="text-primary" filled />
                  <span className="truncate">{clientName}</span>
                </div>
              )}
            </div>
            <Badge className={cn(
              "rounded-full text-[9px] px-2.5 py-0.5 whitespace-nowrap font-bold uppercase tracking-wider h-fit border-none",
              badgeColor
            )}>
              {STATUS_LABELS[status]}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            <span className={cn(
              "flex items-center justify-center w-5 h-5 rounded-full",
              isRejected ? (isPaymentError && isProviderView ? "bg-amber-500/20" : "bg-error/10") : "bg-primary/10"
            )}>
              <MSymbol icon={cat?.icon ?? "build"} size={12} className={isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary"} filled />
            </span>
            <p className={cn(
              "text-[11px] font-black uppercase tracking-widest",
              isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary"
            )}>
              {cat?.label ?? category}
            </p>
          </div>
          
          <h3 className={cn(
            "font-headline font-bold text-base leading-tight truncate",
            isRejected ? (isPaymentError && isProviderView ? "text-amber-900" : "text-error") : "text-on-surface"
          )}>
            {title || description}
          </h3>

          <p className="text-xs text-on-surface-variant mt-1 line-clamp-1 italic opacity-80">
            {description}
          </p>
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-outline-variant/5">
            <div className="flex items-center gap-1.5 text-on-surface font-bold text-[11px] bg-surface-container-high/40 px-2 py-1 rounded-md">
              <MSymbol icon="location_on" size={14} className={isRejected ? (isPaymentError && isProviderView ? "text-amber-600" : "text-error") : "text-primary"} filled />
              <span className="tracking-tight uppercase">{barrio}</span>
            </div>
            
            {offersCount > 0 && (
              <div className={cn(
                "flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm animate-in zoom-in duration-300",
                isRejected 
                  ? (isPaymentError && isProviderView ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-error/10 text-error border border-error/20")
                  : isAssigned || isAccepted 
                    ? "bg-success/10 text-success border border-success/20" 
                    : "bg-amber-400 text-amber-950 border border-amber-500/20"
              )}>
                <MSymbol icon={isRejected ? (isPaymentError && isProviderView ? "schedule" : "error") : (isAssigned || isAccepted ? "check_circle" : "bolt")} size={14} filled />
                <span className="tracking-tighter uppercase">
                  {isRejected ? (isPaymentError && isProviderView ? "PENDIENTE PAGO" : "RECHAZADO") : (isAssigned || isAccepted ? "ASIGNADO" : `${offersCount} ${offersCount === 1 ? "OFERTA" : "OFERTAS"}`)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
