import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MSymbol } from "@/components/amano/m-symbol";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface OfferCardProps {
  id: string;
  jobId: string;
  providerName: string;
  providerAvatar?: string;
  rating: number;
  jobsCount: number;
  amount: number;
  status: string; // Añadida prop de estado
  onAccept?: () => void;
}

export function OfferCard({
  jobId,
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
      "bg-surface-container-lowest rounded-lg p-6 shadow-sm border transition-all",
      isAccepted ? "border-success/30 bg-success/5 shadow-md" : "border-outline-variant/10"
    )}>
      <div className="flex items-center gap-4">
        <Avatar className="size-14 border-2 border-surface-container-high shadow-sm">
          <AvatarImage src={providerAvatar} />
          <AvatarFallback className="bg-primary/5 text-primary font-bold text-base">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-headline font-bold text-lg text-on-surface truncate flex-1">{providerName}</p>
            {isAccepted && (
              <span className="bg-success text-on-success text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">
                Elegido
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex items-center gap-0.5 text-yellow-500">
              <MSymbol icon="star" size={14} filled />
              <span className="text-xs font-black ml-0.5 text-on-surface">
                {rating.toFixed(1)}
              </span>
            </div>
            <span className="text-outline-variant text-[10px]">•</span>
            <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
              {jobsCount} TRABAJOS
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-headline text-3xl font-extrabold text-primary tracking-tighter leading-none">
            ${amount.toLocaleString("es-AR")}
          </p>
          <p className="text-[9px] font-bold text-outline-variant uppercase mt-1 tracking-widest">Oferta total</p>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={onAccept}
          disabled={isAccepted}
          className={cn(
            "w-full py-4 rounded-xl font-headline font-bold text-sm uppercase tracking-widest transition-all",
            isAccepted 
              ? "bg-success text-on-success shadow-lg shadow-success/20" 
              : "bg-cta-gradient text-on-primary shadow-lg shadow-primary/25 hover:opacity-90 active:scale-[0.98]"
          )}
        >
          {isAccepted ? "Oferta aceptada" : "Aceptar esta Oferta"}
        </button>
      </div>
    </div>
  );
}
