import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MSymbol } from "@/components/amano/m-symbol";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface OfferCardProps {
  id: string;
  jobId: string;
  providerId: string;
  providerName: string;
  providerAvatar?: string;
  rating: number;
  jobsCount: number;
  amount: number;
  status: string;
  onAccept?: () => void;
}

export function OfferCard({
  jobId,
  providerId,
  providerName,
  providerAvatar,
  rating,
  jobsCount,
  amount,
  status,
  onAccept,
}: OfferCardProps) {
  const initials = providerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isAccepted = status === "accepted";

  return (
    <div className={cn(
      "bg-surface-container-lowest rounded-3xl p-5 shadow-sm border transition-all duration-300",
      isAccepted ? "border-success/30 bg-success/5 shadow-ambient" : "border-outline-variant/10 hover:shadow-ambient"
    )}>
      <div className="flex items-center gap-4">
        <Link href={`/perfil/${providerId}`} className="shrink-0 active:scale-95 transition-transform">
          <Avatar className="size-14 border-2 border-primary/5 shadow-sm">
            <AvatarImage src={providerAvatar} className="object-cover" />
            <AvatarFallback className="bg-primary/5 text-primary font-black text-base">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href={`/perfil/${providerId}`} className="hover:underline decoration-primary/30">
              <p className="font-headline font-black text-lg text-on-surface truncate">{providerName}</p>
            </Link>
            {isAccepted && (
              <span className="bg-success text-on-success text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0 border border-success/20">
                Elegido
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 text-amber-600">
              <MSymbol icon="star" size={14} filled />
              <span className="text-xs font-black ml-0.5 text-on-surface/80">
                {rating.toFixed(1)}
              </span>
            </div>
            <span className="text-outline-variant opacity-30">•</span>
            <span className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest opacity-60">
              {jobsCount} TRABAJOS
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-baseline justify-between px-1">
          <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Presupuesto total</span>
          <p className="font-headline text-3xl font-black text-primary tracking-tighter">
            ${amount.toLocaleString("es-AR")}
          </p>
        </div>
        
        <button
          onClick={onAccept}
          disabled={isAccepted}
          className={cn(
            "w-full py-4 rounded-[1.25rem] font-headline font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95",
            isAccepted 
              ? "bg-success text-on-success shadow-success/20 cursor-default" 
              : "bg-cta-gradient text-on-primary shadow-primary/25 hover:opacity-95"
          )}
        >
          {isAccepted ? "Oferta aceptada con éxito" : "Aceptar esta Propuesta"}
        </button>
      </div>
    </div>
  );
}
