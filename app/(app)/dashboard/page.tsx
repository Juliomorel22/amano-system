"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MSymbol } from "@/components/amano/m-symbol";
import { JobCard, STATUS_LABELS, type JobStatus } from "@/components/amano/job-card";
import { CATEGORIES } from "@/components/amano/category-chip";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import NextImage from "next/image";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center">Cargando...</div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "home";
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isProvider, setIsProvider] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadJobs() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setLoading(false);

    const isUserAdmin = user.email === "administrator@amano.com";
    setIsAdmin(isUserAdmin);

    const { data: profile } = await supabase.from("profiles").select("is_provider, categories").eq("id", user.id).single();
    const providerStatus = profile?.is_provider || false;
    setIsProvider(providerStatus);

    let query;
    
    if (view === "orders") {
      if (isUserAdmin) {
        // Historial completo para Admin con info de cliente y prestador
        query = supabase.from("jobs").select(`
          *,
          client:profiles!jobs_client_id_fkey(full_name, phone),
          offers(status, provider:profiles(full_name, phone))
        `);
      } else if (providerStatus) {
        // Si es proveedor, cargar trabajos donde ofertó O donde ya es el asignado
        const { data: myOffers } = await supabase
          .from("offers")
          .select("job_id")
          .eq("provider_id", user.id);
        
        const jobIdsFromOffers = (myOffers || []).map(o => o.job_id);

        query = supabase.from("jobs")
          .select(`
            *,
            client:profiles!jobs_client_id_fkey(full_name),
            offersCount:offers(count),
            my_offer:offers!offers_job_id_fkey(status, provider_id)
          `)
          .or(`provider_id.eq.${user.id}${jobIdsFromOffers.length > 0 ? `,id.in.(${jobIdsFromOffers.join(",")})` : ""}`);
      } else {
        // Si es solicitante, mostrar sus propios pedidos
        query = supabase.from("jobs").select(`*, client:profiles!jobs_client_id_fkey(full_name), offersCount:offers(count)`).eq("client_id", user.id);
      }
    } else {
      // VIEW: home
      if (isUserAdmin) {
        query = supabase.from("jobs").select(`
          *,
          client:profiles!jobs_client_id_fkey(full_name, phone),
          provider:profiles!jobs_provider_id_fkey(full_name, phone)
        `);
      } else {
        query = supabase.from("jobs").select(`*, client:profiles!jobs_client_id_fkey(full_name), offersCount:offers(count)`).eq("status", "open");
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    const currentUserId = user.id;

    if (!error && data) {
      setJobs(data.map(j => {
        // Extraer mi oferta si existe
        const myOffer = Array.isArray(j.my_offer) 
          ? j.my_offer.find((o: any) => o.provider_id === currentUserId)
          : null;
        
        const offersCountData = Array.isArray(j.offersCount) ? j.offersCount[0] : j.offersCount;
        const offersCount = typeof offersCountData === 'object' ? offersCountData?.count || 0 : (offersCountData || 0);
        
        const isMeAssigned = j.provider_id === currentUserId || myOffer?.status === 'accepted';
        
        // LÓGICA DE ESTADO DINÁMICO SINCRONIZADA
        let displayStatus = j.status;
        
        if (providerStatus) {
          if (isMeAssigned) {
            // Soy el elegido: si el job está en 'open' o 'accepted', aún falta el pago/validación
            displayStatus = (j.status === 'open' || j.status === 'accepted') ? 'accepted' : j.status;
          } else if (j.provider_id && j.provider_id !== currentUserId) {
            // Eligieron a otro
            displayStatus = 'offer_rejected';
          } else if (myOffer) {
            // Sigo en competencia
            displayStatus = 'pending_offer';
          }
        }

        return {
          ...j,
          status: displayStatus,
          offersCount,
          isAssigned: isMeAssigned,
          clientName: j.client?.full_name,
          clientPhone: j.client?.phone,
          providerName: j.provider?.full_name,
          createdAt: j.created_at
        };
      }));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadJobs();

    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        loadJobs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view]);

  const filteredJobs = jobs.filter(job => 
    (!selectedCategory || job.category === selectedCategory) &&
    (!selectedStatus || job.status === selectedStatus) &&
    (!search || 
      job.description.toLowerCase().includes(search.toLowerCase()) || 
      (job.title && job.title.toLowerCase().includes(search.toLowerCase()))
    )
  );

  return (
    <div className="bg-surface">
      {/* Hero - Solo en Inicio */}
      {view === "home" && (
        <section className="px-5 pt-6 pb-5">
          <h1 className="font-headline font-extrabold text-4xl text-on-surface leading-tight tracking-tight mb-1 pr-16">
            ¿Qué servicio necesitás hoy en Formosa?
          </h1>
          <p className="text-on-surface-variant text-sm mb-5">
            {isProvider ? "Encontrá trabajos cerca tuyo." : "Publicá tu pedido y recibí ofertas de profesionales locales."}
          </p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <MSymbol icon="search" size={20} className="text-outline" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: Plomero, Electricista, Pintor…"
              className="w-full bg-surface-container-lowest rounded-xl pl-11 pr-4 py-3.5 text-sm text-on-surface placeholder-outline-variant outline-none focus:bg-surface-container-high focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </section>
      )}

      {/* Bento de categorías - Solo en Inicio */}
      {view === "home" && (
        <section className="px-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-bold text-lg text-on-surface">Categorías</h2>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} className="text-xs text-primary font-semibold">
                Ver todas
              </button>
            )}
          </div>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {CATEGORIES.slice(0, 8).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20"
                    : "bg-surface-container-lowest text-on-surface-variant"
                }`}
              >
                <MSymbol
                  icon={cat.icon}
                  size={26}
                  filled={selectedCategory === cat.id}
                  className={selectedCategory === cat.id ? "text-white" : "text-primary"}
                />
                <span className="text-[10px] font-semibold text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Mis Pedidos Activos / Trabajos Disponibles */}
      <section className={cn("px-5", view === "orders" ? "pt-8" : "")}>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-lg text-on-surface">
              {isAdmin && view === "orders"
                ? "Historial de Trabajos"
                : view === "home" 
                  ? "Trabajos Disponibles"
                  : (isProvider ? "Mis Ofertas Enviadas" : "Mis Pedidos")}
            </h2>
          </div>

          {/* Filtros de Estado - Para todos en vista de Órdenes/Pedidos */}
          {view === "orders" && (
            <div className="relative w-full max-w-xs">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <MSymbol icon="filter_list" size={18} className="text-primary" />
              </div>
              <select
                value={selectedStatus || ""}
                onChange={(e) => setSelectedStatus(e.target.value || null)}
                className="w-full bg-surface-container-high rounded-xl pl-10 pr-10 py-3 text-[11px] font-bold text-on-surface appearance-none outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer uppercase tracking-wider"
              >
                <option value="">TODOS LOS ESTADOS</option>
                {Object.entries(STATUS_LABELS).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <MSymbol icon="expand_more" size={20} className="text-on-surface-variant" />
              </div>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="text-center p-8 text-on-surface-variant text-sm">Cargando...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-lg p-8 text-center border border-outline-variant/10">
            <MSymbol icon="inbox" size={40} className="text-outline-variant mx-auto mb-3" />
            <p className="font-headline font-bold text-on-surface mb-1">
              {view === "home" 
                ? "Sin trabajos disponibles"
                : (isProvider ? "Aún no has ofertado" : "No tienes pedidos")}
            </p>
            <p className="text-on-surface-variant text-sm text-pretty">
              {view === "home"
                ? "No hay trabajos publicados en este momento."
                : (isProvider ? "Empieza a buscar trabajos en el Inicio." : "Tus pedidos aparecerán aquí.")
              }
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 max-w-4xl mx-auto">
            {filteredJobs.map((job) => (
              isAdmin && view === "orders" ? (
                <Link
                  key={job.id}
                  href={`/trabajos/${job.id}`}
                  className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-container-low transition-all"
                >
                  {job.photos_urls && job.photos_urls.length > 0 ? (
                    <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-outline-variant/10 relative">
                      <NextImage
                        src={job.photos_urls[0]}
                        alt={job.description}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <MSymbol icon={CATEGORIES.find(c => c.id === job.category)?.icon || "build"} size={24} className="text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-outline-variant uppercase bg-surface-container-high px-1.5 py-0.5 rounded tracking-tighter shrink-0">
                          ID: {job.id.split("-")[0]}
                        </span>
                        <p className="font-headline font-bold text-on-surface truncate">{job.title || job.description}</p>
                      </div>
                      <Badge className={cn(
                        "text-[9px] px-2 py-0.5 h-auto uppercase font-bold shrink-0 whitespace-nowrap",
                        job.status === "paid" || job.status === "completed" ? "bg-success text-on-success" : 
                        job.status === "payment_rejected" ? "bg-error text-on-error" :
                        "bg-secondary-container text-on-secondary-container"
                      )}>
                        {STATUS_LABELS[job.status as JobStatus] || job.status}
                      </Badge>
                      </div>
                      {job.title && <p className="text-xs text-on-surface-variant truncate">{job.description}</p>}
                      <div className="flex items-center gap-3 text-[11px] text-on-surface-variant mt-1 overflow-hidden">
                        <span className="flex items-center gap-1 shrink-0 truncate max-w-[100px]"><MSymbol icon="person" size={12} /> {job.clientName || "Cliente"}</span>
                        {job.providerName && (
                          <span className="flex items-center gap-1 text-primary font-bold shrink-0 truncate max-w-[100px]"><MSymbol icon="engineering" size={12} /> {job.providerName}</span>
                        )}
                        <span className="flex items-center gap-1 ml-auto shrink-0 truncate text-[10px] opacity-60 italic">
                          {job.created_at && new Date(job.created_at).toLocaleDateString('es-AR')}
                        </span>
                        <span className="flex items-center gap-1 shrink-0 truncate"><MSymbol icon="location_on" size={12} /> {job.barrio}</span>
                      </div>
                  </div>
                  <MSymbol icon="chevron_right" size={20} className="text-outline-variant" />
                </Link>
              ) : (
                <JobCard key={job.id} {...job} />
              )
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
