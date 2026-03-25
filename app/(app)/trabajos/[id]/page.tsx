"use client";

import { useEffect, useState, use } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { OfferCard } from "@/components/amano/offer-card";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type JobStatus } from "@/components/amano/job-card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import NextImage from "next/image";
import { cn } from "@/lib/utils";
import dynamic from 'next/dynamic';
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

const MapaAproximado = dynamic(
  () => import('@/components/amano/mapa-aproximado'),
  {
    ssr: false,
    loading: () => <div className="h-[220px] rounded-2xl bg-surface-container-low animate-pulse" />
  }
)

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function TrabajoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [job, setJob] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProvider, setIsProvider] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [clientData, setClientData] = useState<any>(null);
  const [assignedProvider, setAssignedProvider] = useState<any>(null);

  // Estado para la nueva oferta
  const [offerAmount, setOfferAmount] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Estado para el diálogo de aceptación
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  // Estado para zoom de imagen
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      setUserId(user.id);

      const isUserAdmin = user.email === "administrator@amano.com";
      setIsAdmin(isUserAdmin);

      const { data: profile } = await supabase.from("profiles").select("is_provider").eq("id", user.id).single();
      setIsProvider(profile?.is_provider || false);

      const { data: jobData } = await supabase
        .from("jobs")
        .select(`
          *,
          provider:profiles!jobs_provider_id_fkey(*)
        `)
        .eq("id", id)
        .single();

      if (jobData) {
        setJob(jobData);

        // Siempre cargar info del cliente para mostrar quién publica
        const { data: cData } = await supabase.from("profiles").select("*").eq("id", jobData.client_id).single();
        setClientData(cData);

        // Asignar el prestador desde la relación directa (JOIN)
        if (jobData.provider) {
          setAssignedProvider(jobData.provider);
        } else if (jobData.provider_id) {
          // Fallback por si el join falla por RLS
          const { data: pData } = await supabase.from("profiles").select("*").eq("id", jobData.provider_id).single();
          if (pData) setAssignedProvider(pData);
        }

        if (isUserAdmin || jobData.client_id === user.id || profile?.is_provider) {
          const { data: offersData } = await supabase
            .from("offers")
            .select(`*, provider:profiles(*)`)
            .eq("job_id", id);

          if (offersData) {
            setOffers(offersData.map(o => ({
              id: o.id,
              jobId: o.job_id,
              providerId: o.provider_id,
              providerName: o.provider?.full_name || "Prestador",
              providerAvatar: o.provider?.avatar_url, // Se añade el mapeo de la foto
              rating: o.provider?.rating || 5,
              jobsCount: o.provider?.jobs_count || 0,
              amount: o.amount,
              status: o.status,
              providerData: o.provider
            })));

            // Si aún no tenemos assignedProvider (trabajo recién aceptado pero no actualizado en DB aún), 
            // lo sacamos de la oferta aceptada
            if (!jobData.provider_id && !jobData.provider) {
              const accepted = offersData.find(o => o.status === "accepted");
              if (accepted) {
                setAssignedProvider(accepted.provider);
              }
            }
          }
        }
      }
      setLoading(false);
    }
    loadData();

    // Suscribirse a cambios en tiempo real
    const supabase = createClient();
    const channel = supabase
      .channel(`job-main-detail-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "jobs",
        filter: `id=eq.${id}`
      }, (payload) => {
        setJob((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, router]);

  const handleDeleteJob = async () => {
    if (!isAdmin) return;

    if (!confirm("¿Estás seguro de que querés eliminar esta publicación? Esta acción no se puede deshacer.")) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("jobs").delete().eq("id", id);

    if (error) {
      toast.error("Error al eliminar el trabajo: " + error.message);
    } else {
      toast.success("Publicación eliminada correctamente.");
      router.push("/dashboard");
    }
  };

  const handleSubmitOffer = async () => {
    if (!offerAmount) return toast.error("Ingresá un monto para tu oferta.");
    setSubmittingOffer(true);
    const supabase = createClient();
    const { error } = await supabase.from("offers").insert({
      job_id: id,
      provider_id: userId,
      amount: parseFloat(offerAmount),
      status: "pending",
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Obtener datos actualizados del trabajo para asegurar la notificación
      const { data: currentJob } = await supabase.from("jobs").select("client_id, title, description").eq("id", id).single();

      // Notificar al dueño del trabajo
      if (currentJob?.client_id) {
        await supabase.from("notifications").insert({
          user_id: currentJob.client_id,
          type: "new_offer",
          title: "Nueva oferta recibida",
          content: `Recibiste una oferta de $${parseFloat(offerAmount).toLocaleString("es-AR")} para: ${currentJob.title || currentJob.description}`,
          link: `/trabajos/${id}`,
        });
      }

      toast.success("Oferta enviada.");
      setOfferAmount("");
      // Refresh local offers optionally or redirect
      router.push("/dashboard");
    }
    setSubmittingOffer(false);
  };

  const handleOpenAcceptDialog = (offerId: string) => {
    setSelectedOfferId(offerId);
    setIsAcceptDialogOpen(true);
  };

  const handleConfirmAccept = () => {
    if (selectedOfferId) {
      router.push(`/trabajos/${id}/pago?offer=${selectedOfferId}`);
    }
  };

  const handleConfirmArrival = async () => {
    const supabase = createClient();
    const { error } = await supabase
      .from("jobs")
      .update({ provider_arrived_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error("Error al confirmar llegada: " + error.message);
    } else {
      // Notificar al prestador
      if (job.provider_id) {
        await supabase.from("notifications").insert({
          user_id: job.provider_id,
          type: "arrival_confirmed",
          title: "Llegada confirmada",
          content: `El cliente confirmó que ya estás en su domicilio para: ${job.title || job.description}. Ya podés finalizar el trabajo cuando termines.`,
          link: `/trabajos/${id}`,
        });
      }
      toast.success("Llegada confirmada correctamente.");
      // Recargar datos locales
      const { data: updatedJob } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (updatedJob) setJob(updatedJob);
    }
  };

  const handleComplete = async () => {
    setSubmittingOffer(true);
    const supabase = createClient();

    console.log("Intentando finalizar trabajo:", id);

    // 1. Intentar actualizar en DB
    const { error } = await supabase
      .from("jobs")
      .update({ status: "finished" })
      .eq("id", id);

    if (!error) {
      console.log("Trabajo finalizado exitosamente en DB");

      // Actualización inmediata del estado local para feedback visual
      setJob((prev: any) => prev ? ({ ...prev, status: "finished" }) : prev);

      // Notificar al admin sobre la finalización
      const { data: adminUser } = await supabase.from("profiles").select("id").eq("email", "administrator@amano.com").single();
      if (adminUser) {
        await supabase.from("notifications").insert({
          user_id: adminUser.id,
          type: "job_finished_review",
          title: "Trabajo por cerrar",
          content: `El prestador marcó como terminado el servicio: ${job.title || job.description}. Por favor, validá para cerrar.`,
          link: `/admin`,
        });
      }

      // Notificar al cliente
      if (job?.client_id) {
        await supabase.from("notifications").insert({
          user_id: job.client_id,
          type: "job_status",
          title: "Trabajo terminado por prestador",
          content: `El colaborador informó que terminó la tarea. Administración validará el cierre en breve.`,
          link: `/trabajos/${id}`,
        });
      }

      toast.success("Informamos a administración que terminaste el trabajo.");

      // Recargar datos para estar seguros
      const { data: updatedJob } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (updatedJob) setJob(updatedJob);
    } else {
      console.error("Error al finalizar trabajo:", error);
      toast.error("No se pudo finalizar: " + error.message);
    }
    setSubmittingOffer(false);
  };

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center">Cargando...</div>;
  if (!job) return <div className="min-h-screen bg-surface p-5">Trabajo no encontrado.</div>;

  const isOwner = job.client_id === userId;
  const isAssignedProvider = job.provider_id === userId;
  const isAuthorized = isOwner || isAssignedProvider || isAdmin;

  const displayStatus = (job.status === "payment_rejected" && !isAuthorized) ? "accepted" : job.status;

  const hasMadeOffer = offers.some(o => o.providerId === userId);
  const isAssigned = !!job.provider_id;

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md md:max-w-3xl lg:max-w-5xl mx-auto shadow-2xl relative">
      <section className="px-5 pt-5 pb-4 bg-surface-container-low">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-secondary-container text-on-secondary-container rounded-full text-[10px] uppercase tracking-wider font-bold px-3 py-1">
            {STATUS_LABELS[job.status as JobStatus] || job.status}
          </Badge>
          <button onClick={() => history.back()} className="text-on-surface-variant">
            <MSymbol icon="close" size={20} />
          </button>
        </div>

        {/* User Info Header */}
        <div className="flex items-center gap-3 mb-6">
          <Avatar size="default" className="border border-outline-variant/10 shadow-sm shrink-0">
            <AvatarImage src={clientData?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
              {clientData?.full_name?.substring(0, 2).toUpperCase() || "AM"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-headline font-bold text-on-surface leading-tight truncate">
              {clientData?.full_name || "Usuario"}
            </p>
            <p className="text-[11px] text-on-surface-variant font-medium">
              necesita una mano con:
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-2">
          <p className="text-[10px] font-bold text-outline-variant uppercase bg-surface-container-high px-1.5 py-0.5 rounded w-fit tracking-tighter">
            ID: {id.split("-")[0]}
          </p>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight leading-tight">
            {job.title || job.description}
          </h1>
          {job.title && (
            <p className="text-on-surface-variant text-base mt-1">
              {job.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {job.created_at && (
            <div className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-full border border-outline-variant/10">
              <MSymbol icon="schedule" size={16} className="text-on-surface-variant" filled />
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tight leading-none italic">
                {isToday(new Date(job.created_at)) 
                  ? "Publicado hoy" 
                  : isYesterday(new Date(job.created_at)) 
                    ? "Publicado ayer" 
                    : `Publicado ${formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: es })}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            <MSymbol icon="category" size={16} className="text-primary" filled />
            <span className="text-xs font-black text-primary uppercase tracking-widest leading-none">
              {job.category}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-highest px-3 py-1.5 rounded-full border border-outline-variant/20">
            <MSymbol icon="location_on" size={16} className="text-on-surface" filled />
            <span className="text-xs font-bold text-on-surface uppercase tracking-tight leading-none">
              {job.barrio}
            </span>
          </div>
          {job.availability && (
            <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1.5 rounded-full border border-secondary/20">
              <MSymbol icon="schedule" size={16} className="text-secondary" filled />
              <span className="text-xs font-bold text-secondary uppercase tracking-tight leading-none">
                {job.availability}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Mensajes de estado Críticos para la Publicación (Visibles para las partes involucradas) */}
      <section className="px-5 mt-4">
        {job.status === "payment_rejected" && isAuthorized && (
          <div className={cn(
            "mb-4 p-4 border rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500",
            isOwner ? "bg-error-container/30 border-error/20" : "bg-amber-50 border-amber-200"
          )}>
            <MSymbol icon={isOwner ? "error" : "schedule"} size={20} className={isOwner ? "text-error mt-0.5" : "text-amber-600 mt-0.5"} filled />
            <div>
              <p className={cn(
                "text-sm font-bold uppercase tracking-tight mb-0.5",
                isOwner ? "text-on-error-container" : "text-amber-800"
              )}>
                {isOwner ? "Atención: Pago Rechazado" : "En espera: Pago del cliente"}
              </p>
              <p className={cn(
                "text-sm font-medium text-pretty leading-snug",
                isOwner ? "text-on-error-container" : "text-amber-700"
              )}>
                {isOwner
                  ? `Pago rechazado. Tu comprobante para "${job.title || job.description || job.category}" fue rechazado por la administración de Amano. Estaremos en contacto con vos para resolver el asunto.`
                  : "El pago por parte del solicitante fue rechazado por la administración de Amano. Estaremos en contacto con la persona para resolver el pago del trabajo."
                }
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Administrator Audit Section */}
      {isAdmin && (
        <section className="px-5 py-6 bg-surface-container-high/50 border-y border-outline-variant/10 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MSymbol icon="admin_panel_settings" size={20} filled />
            </div>
            <h2 className="font-headline font-bold text-lg text-on-surface">Auditoría de Administrador</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Info */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
              <div className="flex items-center gap-2 mb-3 text-on-surface-variant uppercase text-[10px] font-bold tracking-widest">
                <MSymbol icon="person" size={14} />
                Datos del Solicitante
              </div>
              {clientData ? (
                <div className="space-y-2">
                  <p className="font-headline font-bold text-on-surface">{clientData.full_name}</p>
                  <div className="flex flex-col gap-1">
                    <a href={`tel:${clientData.phone}`} className="text-sm text-primary font-medium flex items-center gap-2">
                      <MSymbol icon="call" size={16} /> {clientData.phone || "Sin teléfono"}
                    </a>
                    <p className="text-xs text-on-surface-variant flex items-center gap-2">
                      <MSymbol icon="location_on" size={16} /> {clientData.barrio || "Sin barrio"}
                    </p>
                    <p className="text-[10px] text-outline font-mono mt-1">UUID: {clientData.id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-outline italic">Cargando datos...</p>
              )}
            </div>

            {/* Provider Info */}
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
              <div className="flex items-center gap-2 mb-3 text-on-surface-variant uppercase text-[10px] font-bold tracking-widest">
                <MSymbol icon="engineering" size={14} />
                Colaborador Asignado
              </div>
              {assignedProvider ? (
                <div className="space-y-2">
                  <p className="font-headline font-bold text-on-surface">{assignedProvider.full_name}</p>
                  <div className="flex flex-col gap-1">
                    <a href={`tel:${assignedProvider.phone}`} className="text-sm text-primary font-medium flex items-center gap-2">
                      <MSymbol icon="call" size={16} /> {assignedProvider.phone || "Sin teléfono"}
                    </a>
                    <p className="text-xs text-on-surface-variant flex items-center gap-2">
                      <MSymbol icon="location_on" size={16} /> {assignedProvider.barrio || "Sin barrio"}
                    </p>
                    <p className="text-[10px] text-outline font-mono mt-1">UUID: {assignedProvider.id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-outline italic">
                  {offers.some(o => o.status === 'accepted') ? "Cargando datos..." : "Ningún colaborador asignado aún."}
                </p>
              )}
            </div>

            {/* Payment Proof Audit */}
            {job.payment_proof_url && (
              <div className="col-span-1 md:col-span-2 bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                <div className="flex items-center gap-2 mb-3 text-on-surface-variant uppercase text-[10px] font-bold tracking-widest">
                  <MSymbol icon="receipt_long" size={14} />
                  Registro de Comprobante de Pago
                </div>
                <div
                  className="relative h-32 w-full rounded-lg overflow-hidden border border-outline-variant/20 bg-surface-container cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setSelectedImage(job.payment_proof_url)}
                >
                  {job.payment_proof_url.toLowerCase().endsWith('.pdf') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <MSymbol icon="picture_as_pdf" size={32} className="text-error" filled />
                      <span className="text-[10px] font-bold">Ver PDF</span>
                    </div>
                  ) : (
                    <NextImage
                      src={job.payment_proof_url}
                      alt="Comprobante de pago"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <MSymbol icon="zoom_in" size={24} className="text-white drop-shadow-md" />
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-2 text-center italic">
                  Este comprobante se guarda permanentemente para auditoría interna.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleDeleteJob}
            className="w-full mt-6 py-3 bg-error/10 text-error border border-error/20 rounded-xl font-headline font-bold text-sm uppercase tracking-wider hover:bg-error hover:text-on-error transition-all flex items-center justify-center gap-2"
          >
            <MSymbol icon="delete" size={20} />
            Borrar Publicación
          </button>
        </section>
      )}

      {/* Galería asimétrica bento */}
      <section className="px-5 py-4">
        {job.photos_urls && job.photos_urls.length > 0 ? (
          <div className="grid grid-cols-4 grid-rows-2 gap-2 h-64 md:h-80">
            <div
              className="col-span-3 row-span-2 rounded-2xl bg-surface-container overflow-hidden relative border border-outline-variant/10 cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => setSelectedImage(job.photos_urls[0])}
            >
              <NextImage
                src={job.photos_urls[0]}
                alt="Foto del trabajo 1"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            {job.photos_urls[1] && (
              <div
                className="col-span-1 row-span-1 rounded-2xl bg-surface-container overflow-hidden relative border border-outline-variant/10 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => setSelectedImage(job.photos_urls[1])}
              >
                <NextImage
                  src={job.photos_urls[1]}
                  alt="Foto del trabajo 2"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}
            {job.photos_urls[2] ? (
              <div
                className="col-span-1 row-span-1 rounded-2xl bg-surface-container overflow-hidden relative border border-outline-variant/10 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => setSelectedImage(job.photos_urls[2])}
              >
                <NextImage
                  src={job.photos_urls[2]}
                  alt="Foto del trabajo 3"
                  fill
                  unoptimized
                  className="object-cover"
                />
                {job.photos_urls.length > 3 && (
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold text-lg cursor-pointer"
                    onClick={() => setSelectedImage(job.photos_urls[3])}
                  >
                    +{job.photos_urls.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <div className="col-span-1 row-span-1 rounded-2xl bg-surface-container-highest flex items-center justify-center border border-outline-variant/5">
                <MSymbol icon="more_horiz" size={24} className="text-outline-variant" />
              </div>
            )}
            {!job.photos_urls[1] && (
              <div className="col-span-1 row-span-1 rounded-2xl bg-surface-container-highest flex items-center justify-center border border-outline-variant/5">
                <MSymbol icon="image" size={24} className="text-outline-variant" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-32 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-2 text-on-surface-variant/40">
            <MSymbol icon="image_not_supported" size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest">Sin fotos adjuntas</p>
          </div>
        )}
      </section>

      {/* Mapa de ubicación */}
      {job.lat && job.lng && (
        <section className="px-5 pb-4">
          <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
            Ubicación del trabajo
          </p>
          <MapaAproximado
            lat={Number(job.lat)}
            lng={Number(job.lng)}
            exact={job.status === 'paid' || job.status === 'in_progress' || job.status === 'completed' || job.status === 'finished'}
          />
          {(job.status === 'open' || job.status === 'accepted') && (
            <p className="text-[10px] text-outline mt-1.5 text-center">
              Ubicación aproximada · La dirección exacta se revela cuando el solicitante acepte y abone una oferta por el trabajo
            </p>
          )}
          {(job.status === 'paid' || job.status === 'in_progress' || job.status === 'completed' || job.status === 'finished') && (
            <div className="flex items-center gap-2 mt-2 px-1">
              <MSymbol icon="location_on" size={16} className="text-primary" filled />
              <p className="text-sm font-medium text-on-surface">{job.address}</p>
            </div>
          )}
        </section>
      )}

      {/* Datos del Solicitante (Visible para el Prestador Asignado y Admin una vez aprobado el pago) */}
      {((job.status === "in_progress" || job.status === "completed") && (userId === assignedProvider?.id || isAdmin)) && (
        <section className="px-5 mb-8">
          <div className="bg-secondary/5 border border-secondary/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-secondary uppercase text-[10px] font-black tracking-widest">
              <MSymbol icon="person" size={14} filled />
              Datos del solicitante. Ya podés ponerte en contacto para apoyarlo
            </div>
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="border-2 border-secondary/20 shadow-sm">
                <AvatarImage src={clientData?.avatar_url || ""} />
                <AvatarFallback className="bg-secondary/10 text-secondary font-bold">
                  {clientData?.full_name?.substring(0, 2).toUpperCase() || "CL"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-lg text-on-surface leading-tight truncate">
                  {clientData?.full_name}
                </p>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs text-on-surface-variant flex items-center gap-1">
                    <MSymbol icon="location_on" size={14} /> {job.address || job.barrio}
                  </p>
                  <p className="text-[10px] text-outline uppercase font-bold tracking-tighter">
                    Formosa, Argentina
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`tel:${clientData?.phone}`}
                  className="size-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-lg shadow-secondary/25"
                >
                  <MSymbol icon="call" size={20} />
                </a>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.address || job.barrio}, Formosa, Argentina`)}`, "_blank")}
                  className="size-10 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center border border-outline-variant/20 shadow-sm"
                >
                  <MSymbol icon="map" size={20} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Colaborador Asignado (Visible para Cliente, Admin y el propio Prestador) */}
      {(assignedProvider && (isAdmin || isOwner || userId === assignedProvider.id)) && (
        <section className="px-5 mb-8">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-primary uppercase text-[10px] font-black tracking-widest">
              <MSymbol icon="engineering" size={14} filled />
              Colaborador Asignado
            </div>
            <div className="flex items-center gap-4">
              <Avatar size="lg" className="border-2 border-primary/20 shadow-sm">
                <AvatarImage src={assignedProvider.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {assignedProvider.full_name?.substring(0, 2).toUpperCase() || "AM"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-headline font-bold text-lg text-on-surface leading-tight">
                  {assignedProvider.full_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5 text-secondary font-bold text-xs">
                    <MSymbol icon="star" size={14} filled />
                    {assignedProvider.rating || 5}
                  </div>
                  <span className="text-[10px] text-outline">•</span>
                  <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                    {assignedProvider.jobs_count || 0} TRABAJOS
                  </span>
                </div>
              </div>
              {(isOwner || isAdmin) && (
                <div className="flex flex-col gap-2">
                  <a
                    href={`tel:${assignedProvider.phone}`}
                    className="size-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/25"
                  >
                    <MSymbol icon="call" size={20} />
                  </a>
                </div>
              )}
            </div>

            {(job.status === "in_progress" || job.status === "finished") && (
              <div className="mt-4 pt-3 border-t border-primary/10">
                {isOwner ? (
                  !job.provider_arrived_at ? (
                    <button
                      onClick={handleConfirmArrival}
                      className="w-full py-3 bg-primary text-on-primary rounded-xl font-headline font-bold text-sm uppercase tracking-wider shadow-lg shadow-primary/25"
                    >
                      Confirmar llegada del colaborador
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase">
                      <MSymbol icon="check_circle" size={18} filled />
                      {job.status === "finished" ? "El colaborador terminó la tarea · Aguardando cierre de Admin" : "Llegada confirmada · Trabajando en el domicilio"}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-[11px] text-primary/70 font-medium">
                      {!job.provider_arrived_at
                        ? "Aguardando confirmación de llegada del cliente."
                        : job.status === "finished"
                          ? "Informamos a administración que terminaste el trabajo."
                          : "El cliente confirmó tu llegada. ¡Podés comenzar a trabajar!"}
                    </p>
                    {(job.provider_arrived_at && (userId === job.provider_id || isAdmin)) && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleComplete}
                          disabled={submittingOffer || job.status === "finished"}
                          className={cn(
                            "w-full py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-wider shadow-lg transition-all",
                            job.status === "finished"
                              ? "bg-success/20 text-success shadow-none border border-success/30"
                              : "bg-cta-gradient text-white shadow-primary/25 hover:opacity-90"
                          )}
                        >
                          {submittingOffer ? "Procesando..." : job.status === "finished" ? "Trabajo Finalizado" : "Finalizar Trabajo"}
                        </button>
                        {job.status === "finished" && (
                          <p className="text-[10px] text-success font-bold text-center animate-pulse">
                            Pendiente de validación por la administración de Amano
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Ofertas / Creación de Oferta */}
      {!isAssigned && (
        <section className="px-5 pb-32">
          {isOwner ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-headline font-bold text-lg text-on-surface">
                  Ofertas recibidas
                  <span className="ml-2 text-primary text-base">({offers.length})</span>
                </h2>
              </div>

              {/* Mensajes de estado de pago para el solicitante */}
              {(job.status === "paid" || job.status === "in_progress") && (
                <div className="mb-6 p-4 bg-success-container/30 border border-success/20 rounded-xl flex items-start gap-3">
                  <MSymbol icon="check_circle" size={20} className="text-success mt-0.5" filled />
                  <p className="text-sm text-on-success-container font-medium text-pretty">Pago aceptado. El trabajo ya está en proceso y nos contactaremos con vos para coordinar el trabajo. También tenes el celular del colaborador asignado debajo.</p>
                </div>
              )}

              {offers.length === 0 ? (
                <p className="text-on-surface-variant text-sm">Aún no hay ofertas.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {offers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      {...offer}
                      onAccept={() => handleOpenAcceptDialog(offer.id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : isProvider ? (
            <div className={cn(
              "p-6 rounded-2xl shadow-sm border border-outline-variant/10",
              job.status === "payment_rejected" ? "bg-error-container/10 border-error/20" : "bg-surface-container-lowest"
            )}>
              {hasMadeOffer ? (
                (() => {
                  const myOffer = offers.find(o => o.providerId === userId);
                  if (myOffer?.status === "accepted") {
                    if (job.status === "paid" || job.status === "in_progress" || job.status === "completed") {
                      return (
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <MSymbol icon="check_circle" size={32} className="text-primary" filled />
                          </div>
                          <div>
                            <h3 className="font-headline font-bold text-xl text-on-surface">¡Oferta Aceptada!</h3>
                            <p className="text-sm text-on-surface-variant mt-1">El pago del solicitante ha sido aceptado y en breve nos estaremos comunicando con vos para brindarte los datos para que realices el trabajo en el domicilio</p>
                          </div>
                          <Link href={`/prestador/${job.id}`} className="mt-2 w-full py-4 bg-primary text-on-primary font-headline font-bold text-base rounded-xl shadow-lg shadow-primary/25 uppercase tracking-wider text-center">
                            Ver Datos del Cliente
                          </Link>
                        </div>
                      );
                    } else if (job.status === "payment_rejected") {
                      return (
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center">
                            <MSymbol icon="error" size={32} className="text-error" filled />
                          </div>
                          <div>
                            <h3 className="font-headline font-bold text-xl text-on-surface text-error uppercase">Pago Rechazado</h3>
                            <p className="text-sm text-on-surface-variant mt-1 italic">Estamos a la espera de que el solicitante suba un comprobante válido para que puedas iniciar el trabajo.</p>
                          </div>
                        </div>
                      );
                    }
                  }

                  return (
                    <div className="text-center">
                      <p className="text-primary font-semibold">Ya enviaste una oferta para este trabajo.</p>
                      <p className="text-sm text-on-surface-variant mt-2">Te notificaremos si el cliente te elige.</p>
                    </div>
                  );
                })()
              ) : (
                <>
                  <h2 className="font-headline font-bold text-xl text-on-surface mb-4">Hacer una oferta</h2>
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface font-headline font-bold">$</span>
                      <input
                        type="number"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder="Monto estimado"
                        className="w-full bg-surface-container rounded-xl pl-8 pr-4 py-3 text-sm font-headline font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <button
                      disabled={submittingOffer}
                      onClick={handleSubmitOffer}
                      className="w-full py-3 bg-cta-gradient text-white font-headline font-bold text-sm rounded-xl uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
                    >
                      {submittingOffer ? "Enviando..." : "Enviar Oferta"}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>
      )}

      {/* Diálogo de Confirmación de Aceptación */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl p-6 gap-6">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MSymbol icon="handshake" size={32} className="text-primary" filled />
            </div>
            <DialogTitle className="text-center font-headline font-bold text-2xl">Aceptar oferta</DialogTitle>
            <DialogDescription className="text-center text-on-surface-variant text-base leading-relaxed mt-2">
              Ahora debes transferir el dinero ofertado por el colaborador a la cuenta de Amano, cuando validemos que el pago es correcto se desbloquearán los datos del colaborador y podrá realizar el trabajo en tu domicilio.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <button
              onClick={handleConfirmAccept}
              className="w-full py-4 bg-cta-gradient text-on-primary font-headline font-bold text-base rounded-xl shadow-lg shadow-primary/25 uppercase tracking-wider transition-all hover:opacity-90"
            >
              Continuar al pago
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Zoom de Imagen */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent showCloseButton={false} className="max-w-[95vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center ring-0">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-[60] p-2 rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
          >
            <MSymbol icon="close" size={24} />
          </button>
          {selectedImage && (
            <div className="relative w-full h-full min-h-[50vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Imagen ampliada"
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
