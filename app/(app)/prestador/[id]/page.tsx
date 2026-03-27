"use client";

import { useEffect, useState, use, useCallback } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import NextImage from "next/image";

interface PrestadorJob {
  id: string;
  title?: string;
  description: string;
  category: string;
  barrio: string;
  status: string;
  client_id: string;
  provider_id?: string;
  provider_arrived_at?: string;
  client?: {
    full_name: string;
    phone: string;
    avatar_url?: string;
    bio?: string;
    rating?: number;
  };
}

export default function DatosDesbloqueadosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [job, setJob] = useState<PrestadorJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const loadJob = useCallback(async () => {
    const supabase = createClient();
    const { data: jobData } = await supabase
      .from("jobs")
      .select("*, client:profiles(full_name, phone, avatar_url, bio, rating)")
      .eq("id", id)
      .single();

    if (!jobData) {
      router.push("/dashboard");
    } else {
      setJob(jobData as unknown as PrestadorJob);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadJob();

    // Suscribirse a cambios en tiempo real
    const supabase = createClient();
    const channel = supabase
      .channel(`job-detail-${id}`)
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "jobs",
        filter: `id=eq.${id}` 
      }, (payload) => {
        setJob((prev) => prev ? ({ ...prev, ...payload.new as Partial<PrestadorJob> }) : null);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadJob]);

  const handleComplete = async () => {
    if (!job) return;
    setUpdating(true);
    const supabase = createClient();
    
    console.log("Prestador: Intentando finalizar trabajo:", id);
    
    const { error } = await supabase.from("jobs").update({ status: "finished" }).eq("id", id);
    if (!error) {
      console.log("Prestador: Trabajo finalizado exitosamente en DB");
      
      // Actualización inmediata local
      setJob((prev) => prev ? ({ ...prev, status: "finished" }) : prev);

       // 1. Notificar al admin sobre la finalización
       const { data: adminUser } = await supabase.from("profiles").select("id").eq("email", "administrator@amano.com").single();
       if (adminUser) {
         await supabase.from("notifications").insert({
           user_id: adminUser.id,
           type: "job_finished_review",
           title: "Trabajo por cerrar",
           content: `El prestador informó que terminó: ${job.title || job.description}. Por favor, validá para cerrar.`,
           link: `/admin`,
         });
       }

       // 2. Notificar al cliente
       if (job.client_id) {
         await supabase.from("notifications").insert({
           user_id: job.client_id,
           type: "job_status",
           title: "Trabajo terminado por prestador",
           content: `El colaborador informó que terminó la tarea. Administración validará el cierre en breve.`,
           link: `/trabajos/${id}`,
         });
       }

      toast.success("Trabajo marcado como finalizado. Aguardando validación de Admin.");
      router.push("/dashboard");
    } else {
      console.error("Prestador: Error al finalizar:", error);
      toast.error("No se pudo finalizar: " + error.message);
    }
    setUpdating(false);
  };

  if (loading || !job) return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
      <div className="size-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-on-surface-variant text-sm font-medium">Cargando detalles...</p>
    </div>
  );

  const clientName = job.client?.full_name || "Cliente";
  const initials = clientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const phone = job.client?.phone || "";
  const avatarUrl = job.client?.avatar_url || "";
  const rating = job.client?.rating || 5.0;

  return (
    <div className="bg-background">
      {/* Top Navigation Bar */}
      <header className="glass-header flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="text-on-surface hover:bg-surface-container-high transition-colors p-2 rounded-full"
          >
            <MSymbol icon="arrow_back" size={24} />
          </button>
          <h1 className="text-2xl font-extrabold tracking-tighter text-primary font-headline">Amano</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-on-surface-variant p-2 hover:bg-surface-container-high rounded-full">
            <MSymbol icon="notifications" size={24} />
          </button>
          <button className="text-on-surface-variant p-2 hover:bg-surface-container-high rounded-full">
            <MSymbol icon="menu" size={24} />
          </button>
        </div>
      </header>

      <main className="lg:max-w-full max-w-md mx-auto px-4 mt-6">
        {/* Status Banner */}
        <div className="mb-8 px-2">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "size-3 rounded-full shrink-0",
              job.status === "finished" ? "bg-success animate-pulse" : "bg-primary animate-pulse"
            )}></span>
            <span className="text-primary font-bold tracking-tight font-headline text-lg uppercase">
              {job.status === "paid" || job.status === "in_progress" ? "Pago Confirmado" : 
               job.status === "finished" ? "Aguardando Cierre Admin" : 
               job.status === "completed" ? "Trabajo Finalizado" : "En Proceso"}
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-on-surface leading-tight font-headline">
            {job.status === "completed" ? "Servicio Completado" : 
             job.status === "finished" ? "Informamos a Admin" : "Ir al Domicilio"}
          </h2>
          <p className="text-on-secondary-container mt-2 font-medium">
            {job.status === "completed" ? "¡Buen trabajo! Ya podés ver otros pedidos." : 
             job.status === "finished" ? "Ya avisamos que terminaste. En breve se cerrará el trabajo." : "El cliente está esperando el servicio."}
          </p>
        </div>

        {/* Main Bento-Style Grid Layout */}
        <div className="grid grid-cols-1 gap-4">
          {/* Featured Client & Location Card */}
          <section className="bg-surface-container-low rounded-lg p-6 relative overflow-hidden shadow-sm">
            {/* Visual highlight gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-10 -mt-10"></div>
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <Avatar className="w-16 h-16 border-4 border-white shadow-sm">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-on-surface font-headline">{clientName}</h3>
                <p className="text-on-secondary-container text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                  <MSymbol icon="star" size={14} filled /> {rating.toFixed(1)} · Cliente Verificado
                </p>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                  <MSymbol icon="location_on" size={24} className="text-primary" filled />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-secondary-container/60 mb-1">Ubicación</p>
                  <p className="text-lg font-bold text-on-surface">{job.barrio}</p>
                  <p className="text-sm text-on-secondary-container">Formosa, Argentina</p>
                </div>
              </div>
              
              <button 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.barrio + ", Formosa, Argentina")}`, "_blank")}
                className="w-full py-4 px-6 bg-white text-primary font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-surface-container-high transition-all active:scale-95 shadow-sm border border-outline-variant/10"
              >
                <MSymbol icon="map" size={20} />
                Abrir en Maps
              </button>
            </div>
          </section>

          {/* Quick Contact Actions */}
          <div className="grid grid-cols-2 gap-4">
            <a 
              href={`tel:${phone.replace(/\D/g, '')}`}
              className="bg-white border border-outline-variant/20 p-5 rounded-lg flex flex-col items-center justify-center gap-3 hover:bg-surface-container-low transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <MSymbol icon="call" size={24} />
              </div>
              <span className="font-bold text-on-surface">Llamar</span>
            </a>
            <a 
              href={`https://wa.me/${phone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white border border-outline-variant/20 p-5 rounded-lg flex flex-col items-center justify-center gap-3 hover:bg-surface-container-low transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] group-hover:scale-110 transition-transform">
                <MSymbol icon="chat" size={24} />
              </div>
              <span className="font-bold text-on-surface">WhatsApp</span>
            </a>
          </div>

          {/* Secondary Map Visual Anchor */}
          <div className="h-40 w-full rounded-lg overflow-hidden relative shadow-inner grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer border border-outline-variant/10">
            <NextImage 
              alt="Mapa de la ubicación" 
              fill
              className="object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDdRl5UKDy1C5IcLDP32_9ExS62aOCBtRE6NqjjHu6c4GgCSv9-mUqyiQfhZkM02cEg4U4doepcZVVJFIZBsCfkqKYCwRbz2r58N4Nao1wqZkVRhPui7yrUq3nl-UWi7Z0iehN7P1BEByW_0QSL4vJXZDP3t_FUPFCz9RtA8nVk5lSmY7UJ4tvHM91kCKODjZbNmYNERn22aad6s-0WKAf2WNQ_GgRAi737abwGwPnqh4QQDRo6GxSYMtfgYKhDKEXX02ixG83aXE4L" 
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-primary p-3 rounded-full shadow-xl ring-4 ring-white">
                <MSymbol icon="location_on" size={24} className="text-white" filled />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Bottom Action Area */}
      {(job.status === "in_progress" || job.status === "finished") && (
        <div className="fixed bottom-0 left-0 w-full z-40 px-4 pb-8 pt-4 glass-header">
          <div className="lg:max-w-full max-w-md mx-auto">
            {!job.provider_arrived_at ? (
              <div className="bg-surface-container-high/50 p-4 rounded-xl border border-outline-variant/10 flex items-center gap-3">
                <MSymbol icon="hourglass_empty" size={24} className="text-outline" />
                <p className="text-xs text-on-surface-variant font-medium">
                  El botón de finalización se habilitará una vez que el cliente confirme tu llegada al domicilio.
                </p>
              </div>
            ) : (
              <button 
                onClick={handleComplete}
                disabled={updating || job.status === "finished"}
                className={cn(
                  "w-full py-5 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50",
                  job.status === "finished" 
                    ? "bg-success/20 text-success border border-success/30 shadow-none" 
                    : "bg-cta-gradient text-on-primary hover:opacity-90 active:scale-95"
                )}
              >
                {updating ? (
                  <div className="size-6 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                ) : (
                  <>
                    <MSymbol icon="check_circle" size={24} filled />
                    {job.status === "finished" ? "Trabajo Finalizado" : "Marcar como Trabajo Finalizado"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
