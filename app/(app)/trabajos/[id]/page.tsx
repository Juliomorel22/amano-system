"use client";

import { useEffect, useState, use, useCallback, Suspense, useRef } from "react";
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
import { formatDistanceToNow, isToday, isYesterday, format } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const MapaAproximado = dynamic(
  () => import('@/components/amano/mapa-aproximado'),
  {
    ssr: false,
    loading: () => <div className="h-[220px] rounded-2xl bg-surface-container-low animate-pulse" />
  }
)

import { sendNotification, notifyAdmin } from "@/lib/supabase/notifications";

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

function TrabajoDetalleSkeleton() {
  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-7xl mx-auto pb-20">
      <section className="px-5 pt-5 pb-4 bg-surface-container-low">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-6" />
        <div className="flex gap-3">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      </section>
      <section className="px-5 py-4">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </section>
      <section className="px-5 py-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
      </section>
    </div>
  );
}

export default function TrabajoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<TrabajoDetalleSkeleton />}>
      <TrabajoDetalleContent params={params} />
    </Suspense>
  );
}

function TrabajoDetalleContent({ params }: { params: Promise<{ id: string }> }) {
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
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  // Estado para la nueva oferta
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [isEditingOffer, setIsEditingOffer] = useState(false);

  // Estado para el diálogo de aceptación
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [finalAmount, setFinalAmount] = useState("");

  const selectedOffer = offers.find(o => o.id === selectedOfferId);

  // Estado para zoom de imagen
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Estado para el diálogo de reseña
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = useCallback(async () => {
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

      // Si el trabajo está completado, buscar la fecha de finalización en las reseñas
      if (jobData.status === "completed") {
        const { data: reviewData } = await supabase
          .from("reviews")
          .select("created_at")
          .eq("job_id", id)
          .single();
        
        if (reviewData) {
          setCompletedAt(reviewData.created_at);
        }
      }

      // Siempre cargar info del cliente para mostrar quién publica
      const { data: cData } = await supabase.from("profiles").select("*").eq("id", jobData.client_id).single();
      setClientData(cData);

      // Cargar ofertas para determinar si hay una aceptada
      const { data: offersData } = await supabase
        .from("offers")
        .select(`*, provider:profiles(*)`)
        .eq("job_id", id);

      const mappedOffers = offersData ? offersData.map(o => ({
        id: o.id,
        jobId: o.job_id,
        providerId: o.provider_id,
        providerName: o.provider?.full_name || "Prestador",
        providerAvatar: o.provider?.avatar_url,
        rating: o.provider?.rating || 5,
        jobsCount: o.provider?.jobs_count || 0,
        amount: o.amount,
        minAmount: o.min_amount,
        maxAmount: o.max_amount,
        status: o.status,
        providerData: o.provider
      })) : [];
      
      setOffers(mappedOffers);

      // Determinar el proveedor asignado (ya sea por provider_id o por oferta aceptada)
      if (jobData.provider) {
        setAssignedProvider(jobData.provider);
      } else if (jobData.provider_id) {
        const { data: pData } = await supabase.from("profiles").select("*").eq("id", jobData.provider_id).single();
        if (pData) setAssignedProvider(pData);
      } else {
        const acceptedOffer = mappedOffers.find(o => o.status === "accepted");
        if (acceptedOffer) {
          setAssignedProvider(acceptedOffer.providerData);
        }
      }
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    loadData();

    // Suscribirse a cambios en tiempo real
    const supabase = createClient();
    
    // Cambios en el trabajo
    const jobChannel = supabase
      .channel(`job-main-detail-${id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "jobs",
        filter: `id=eq.${id}`
      }, (payload) => {
        setJob((prev: any) => ({ ...prev, ...payload.new }));
        // Recargar datos completos si el status cambió para actualizar assignedProvider
        loadData();
      })
      .subscribe();

    // Cambios en las ofertas
    const offersChannel = supabase
      .channel(`job-offers-update-${id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "offers",
        filter: `job_id=eq.${id}`
      }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(offersChannel);
    };
  }, [id, loadData]);

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
    if (!minAmount || !maxAmount) return toast.error("Ingresá el rango de tu oferta.");
    if (parseFloat(maxAmount) < parseFloat(minAmount)) return toast.error("El precio máximo no puede ser menor al mínimo.");
    
    setSubmittingOffer(true);
    const supabase = createClient();

    const myOffer = offers.find(o => o.providerId === userId);
    let error;

    const offerData = {
      min_amount: parseFloat(minAmount),
      max_amount: parseFloat(maxAmount),
      amount: parseFloat(maxAmount), // Usamos el máximo como monto de referencia por ahora
    };

    if (myOffer) {
      // Actualizar oferta existente
      const { error: updateError } = await supabase
        .from("offers")
        .update(offerData)
        .eq("id", myOffer.id);
      error = updateError;
    } else {
      // Insertar nueva oferta
      const { error: insertError } = await supabase.from("offers").insert({
        job_id: id,
        provider_id: userId,
        status: "pending",
        ...offerData
      });
      error = insertError;
    }

    if (error) {
      toast.error(error.message);
    } else {
      // Obtener datos actualizados del trabajo para asegurar la notificación
      const { data: currentJob } = await supabase.from("jobs").select("client_id, title, description").eq("id", id).single();

      // Notificar al dueño del trabajo
      if (currentJob?.client_id) {
        await sendNotification({
          userId: currentJob.client_id,
          type: "new_offer",
          title: myOffer ? "Oferta modificada" : "Nueva oferta recibida",
          content: `${myOffer ? "Se actualizó la oferta a" : "Recibiste una oferta de"} $${parseFloat(minAmount).toLocaleString("es-AR")} - $${parseFloat(maxAmount).toLocaleString("es-AR")} para: ${currentJob.title || currentJob.description}`,
          link: `/trabajos/${id}`,
        });
      }

      toast.success(myOffer ? "Oferta actualizada." : "Oferta enviada.");
      setMinAmount("");
      setMaxAmount("");
      setIsEditingOffer(false);
      loadData();
    }
    setSubmittingOffer(false);
  };

  const handleOpenAcceptDialog = (offerId: string) => {
    const offer = offers.find(o => o.id === offerId);
    setSelectedOfferId(offerId);
    // Inicializar el monto final con el máximo o el único monto
    setFinalAmount(offer?.maxAmount?.toString() || offer?.amount?.toString() || "");
    setIsAcceptDialogOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!selectedOfferId || !selectedOffer) return;
    if (!finalAmount || parseFloat(finalAmount) <= 0) {
      return toast.error("Por favor ingresá el monto acordado.");
    }

    setSubmittingOffer(true);
    const supabase = createClient();

    try {
      // 1. Actualizar el monto final y estado en la oferta
      await supabase
        .from("offers")
        .update({ 
          amount: parseFloat(finalAmount),
          status: "accepted" 
        })
        .eq("id", selectedOfferId);

      // 2. Actualizar el trabajo: Asignar proveedor, monto final y pasar a in_progress
      const { error: jobError } = await supabase
        .from("jobs")
        .update({ 
          status: "in_progress", 
          final_amount: parseFloat(finalAmount),
          provider_id: selectedOffer.providerId
        })
        .eq("id", id);

      if (jobError) throw jobError;

      // 3. Notificar al proveedor que fue elegido
      await sendNotification({
        userId: selectedOffer.providerId,
        type: "job_started",
        title: "¡Oferta aceptada!",
        content: `¡El cliente aceptó tu propuesta para "${job?.title || job?.description}"! Los datos de contacto ya están disponibles para coordinar el trabajo.`,
        link: `/trabajos/${id}`,
      });

      toast.success("¡Oferta aceptada! Los datos de contacto ya están liberados.");
      setIsAcceptDialogOpen(false);
      loadData(); // Recargar para ver los cambios y datos desbloqueados
    } catch (error: any) {
      toast.error("Error al aceptar oferta: " + error.message);
    } finally {
      setSubmittingOffer(false);
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
        await sendNotification({
          userId: job.provider_id,
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

    // 1. Intentar actualizar en DB
    const { error } = await supabase
      .from("jobs")
      .update({ status: "finished" })
      .eq("id", id);

    if (!error) {
      // Actualización inmediata del estado local para feedback visual
      setJob((prev: any) => prev ? ({ ...prev, status: "finished" }) : prev);

      // Notificar al admin sobre la finalización
      await notifyAdmin({
        type: "job_finished_review",
        title: "Trabajo por cerrar",
        content: `El prestador marcó como terminado el servicio: ${job.title || job.description}. Por favor, validá para cerrar.`,
        link: `/admin`,
      });

      // Notificar al cliente
      if (job?.client_id) {
        await sendNotification({
          userId: job.client_id,
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
      toast.error("No se pudo finalizar: " + error.message);
    }
    setSubmittingOffer(false);
  };

  const handleSubmitReview = async () => {
    if (!assignedProvider) return;
    setSubmittingReview(true);
    const supabase = createClient();

    try {
      // 1. Insertar la reseña
      const { error: reviewError } = await supabase.from("reviews").insert({
        job_id: id,
        reviewer_id: userId,
        reviewed_id: assignedProvider.id,
        rating,
        comment: comment.trim(),
      });

      if (reviewError) throw reviewError;

      // 2. Marcar el trabajo como completado
      const { error: jobError } = await supabase
        .from("jobs")
        .update({ status: "completed" })
        .eq("id", id);

      if (jobError) throw jobError;

      // 3. Obtener todas las reseñas del proveedor para recalcular el promedio
      const { data: allReviews } = await supabase
        .from("reviews")
        .select("rating")
        .eq("reviewed_id", assignedProvider.id);

      if (allReviews && allReviews.length > 0) {
        const totalRating = allReviews.reduce((acc, curr) => acc + curr.rating, 0);
        const avgRating = totalRating / allReviews.length;

        // 4. Actualizar el perfil del proveedor
        await supabase
          .from("profiles")
          .update({
            rating: avgRating,
            jobs_count: allReviews.length
          })
          .eq("id", assignedProvider.id);
      }

      // 5. Notificar al prestador sobre la nueva reseña
      await sendNotification({
        userId: assignedProvider.id,
        type: "new_review",
        title: "¡Recibiste una calificación!",
        content: `El cliente te calificó con ${rating} estrellas por: ${job.title || job.description}`,
        link: `/trabajos/${id}`,
      });

      toast.success("¡Gracias por tu reseña! Trabajo finalizado.");
      setIsReviewDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Error al enviar la reseña: " + error.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <TrabajoDetalleSkeleton />;
  if (!job) return <div className="min-h-screen bg-surface p-5 text-center flex flex-col items-center justify-center gap-4">
    <MSymbol icon="error" size={48} className="text-error" />
    <p className="font-headline font-bold text-on-surface">Trabajo no encontrado.</p>
    <Link href="/dashboard" className="text-primary font-bold uppercase tracking-widest text-xs border-b border-primary/20 pb-0.5">Volver al inicio</Link>
  </div>;

  const isOwner = job.client_id === userId;
  const isAssignedProvider = assignedProvider?.id === userId;
  const isAuthorized = isOwner || isAssignedProvider || isAdmin;

  const displayStatus = (job.status === "payment_rejected" && !isAuthorized) ? "accepted" : job.status;

  const hasMadeOffer = offers.some(o => o.providerId === userId);
  const isAssigned = !!assignedProvider;

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-7xl mx-auto lg:shadow-none shadow-2xl relative pb-20">
      <section className="px-5 pt-5 pb-6 bg-surface-container-low rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full text-[10px] uppercase tracking-wider font-black px-3 py-1">
              {STATUS_LABELS[job.status as JobStatus] || job.status}
            </Badge>
            <p className="text-[10px] font-bold text-outline-variant uppercase bg-surface-container-high px-1.5 py-0.5 rounded tracking-tighter">
              ID: {id.split("-")[0]}
            </p>
          </div>
          <button 
            onClick={() => history.back()} 
            className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full active:scale-90 transition-all"
            aria-label="Cerrar"
          >
            <MSymbol icon="close" size={24} />
          </button>
        </div>

        {/* User Info Header */}
        <div className="flex items-center gap-3 mb-6">
          <Avatar className="size-11 border-2 border-primary/10 shadow-sm shrink-0">
            <AvatarImage src={clientData?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">
              {clientData?.full_name?.substring(0, 2).toUpperCase() || "AM"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-headline font-bold text-on-surface leading-tight truncate">
              {clientData?.full_name || "Usuario"}
            </p>
            <p className="text-[11px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">
              necesita una mano con:
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-2">
          <h1 className="font-headline font-black text-3xl text-on-surface tracking-tight leading-[1.1]">
            {job.title || job.description}
          </h1>
          {job.title && (
            <p className="text-on-surface-variant text-base mt-2 leading-relaxed">
              {job.description}
            </p>
          )}
          {job.availability && (
            <div className="mt-6 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm flex items-start gap-3">
              <MSymbol icon="calendar_today" size={20} className="text-primary mt-0.5" filled />
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Fecha y horario deseado</p>
                <p className="text-base font-headline font-extrabold text-on-surface">
                  {job.availability}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-6">
          {job.created_at && (
            <div className="flex items-center gap-2 bg-surface-container-highest/50 px-3 py-1.5 rounded-full border border-outline-variant/10">
              <MSymbol icon="schedule" size={14} className="text-on-surface-variant/70" filled />
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-tight leading-none italic">
                {isToday(new Date(job.created_at)) 
                  ? "hoy" 
                  : isYesterday(new Date(job.created_at)) 
                    ? "ayer" 
                    : formatDistanceToNow(new Date(job.created_at), { addSuffix: false, locale: es })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/10">
            <MSymbol icon="category" size={14} className="text-primary" filled />
            <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">
              {job.category}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-surface-container-highest/50 px-3 py-1.5 rounded-full border border-outline-variant/10">
            <MSymbol icon="location_on" size={14} className="text-on-surface/70" filled />
            <span className="text-[10px] font-black text-on-surface uppercase tracking-tight leading-none">
              {job.barrio}
            </span>
          </div>
        </div>
      </section>

      {/* Mensajes de estado Críticos para la Publicación */}
      <section className="px-5 mt-4">
        {job.status === "completed" && (
           <div className="mb-4 p-5 bg-success/10 border border-success/30 rounded-[2rem] flex flex-col items-center text-center gap-3 animate-in fade-in zoom-in duration-700">
             <div className="size-14 bg-success/20 rounded-full flex items-center justify-center mb-1">
               <MSymbol icon="task_alt" size={32} className="text-success" filled />
             </div>
             <div>
               <p className="text-lg font-headline font-black text-success leading-tight mb-1">
                 ¡Tarea finalizada exitosamente!
               </p>
               {completedAt && (
                 <p className="text-sm font-bold text-on-surface-variant/80">
                   Completado el {format(new Date(completedAt), "dd-MM-yyyy 'a las' HH:mm", { locale: es })}hs
                 </p>
               )}
             </div>
           </div>
        )}

        {(job.status === "in_progress" || job.status === "finished") && isAuthorized && (
           <div className="mb-4 p-4 bg-success-container/30 border border-success/20 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
             <MSymbol icon="verified" size={20} className="text-success mt-0.5" filled />
             <div>
               <p className="text-sm font-black text-on-success-container uppercase tracking-tight mb-0.5">
                 ¡Trabajo en curso!
               </p>
               <p className="text-sm font-semibold text-on-success-container/90 text-pretty leading-snug">
                 {isAssignedProvider ? (
                   <>
                     La dirección del trabajo es en <span className="font-black text-on-success-container underline decoration-success/30 underline-offset-2">{job.address}</span> y el horario es <span className="font-black text-on-success-container underline decoration-success/30 underline-offset-2">{job.availability || "a convenir"}</span>.
                   </>
                 ) : (
                   "La oferta fue aceptada. El domicilio y los celulares ahora están visibles para ambas partes."
                 )}
               </p>
             </div>
           </div>
        )}
      </section>

      {/* Administrator Audit Section */}
      {isAdmin && (
        <section className="px-5 py-6 bg-surface-container-high/30 border-y border-outline-variant/10 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-sm">
              <MSymbol icon="admin_panel_settings" size={20} filled />
            </div>
            <h2 className="font-headline font-bold text-lg text-on-surface">Auditoría</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Info */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-on-surface-variant uppercase text-[10px] font-black tracking-widest opacity-60">
                <MSymbol icon="person" size={14} />
                Solicitante
              </div>
              {clientData ? (
                <div className="space-y-2">
                  <p className="font-headline font-bold text-on-surface">{clientData.full_name}</p>
                  <div className="flex flex-col gap-1.5">
                    <a href={`tel:${clientData.phone}`} className="text-sm text-primary font-black flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-lg w-fit transition-colors hover:bg-primary/10 active:scale-95">
                      <MSymbol icon="call" size={16} /> {clientData.phone || "Sin teléfono"}
                    </a>
                    <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2 px-1">
                      <MSymbol icon="location_on" size={16} /> {clientData.barrio || "Sin barrio"}
                    </p>
                  </div>
                </div>
              ) : (
                <Skeleton className="h-20 w-full rounded-xl" />
              )}
            </div>

            {/* Provider Info */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-on-surface-variant uppercase text-[10px] font-black tracking-widest opacity-60">
                <MSymbol icon="engineering" size={14} />
                Colaborador
              </div>
              {assignedProvider ? (
                <div className="space-y-2">
                  <p className="font-headline font-bold text-on-surface">{assignedProvider.full_name}</p>
                  <div className="flex flex-col gap-1.5">
                    <a href={`tel:${assignedProvider.phone}`} className="text-sm text-primary font-black flex items-center gap-2 bg-primary/5 px-3 py-2 rounded-lg w-fit transition-colors hover:bg-primary/10 active:scale-95">
                      <MSymbol icon="call" size={16} /> {assignedProvider.phone || "Sin teléfono"}
                    </a>
                    <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2 px-1">
                      <MSymbol icon="location_on" size={16} /> {assignedProvider.barrio || "Sin barrio"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 border border-dashed border-outline-variant/20 rounded-xl flex items-center justify-center">
                  <p className="text-[10px] text-outline font-bold uppercase tracking-widest italic">Sin asignar</p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleDeleteJob}
            className="w-full mt-6 py-4 bg-error/5 text-error border border-error/10 rounded-2xl font-headline font-black text-xs uppercase tracking-widest hover:bg-error hover:text-on-error active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <MSymbol icon="delete" size={20} />
            Borrar Publicación Permanente
          </button>
        </section>
      )}

      {/* Galería asimétrica bento */}
      <section className="px-5 py-4">
        {job.photos_urls && job.photos_urls.length > 0 ? (
          <div className="grid grid-cols-4 grid-rows-2 gap-2.5 h-64 md:h-80">
            <div
              className="col-span-3 row-span-2 rounded-[1.5rem] bg-surface-container overflow-hidden relative border border-outline-variant/10 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all shadow-sm"
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
                className="col-span-1 row-span-1 rounded-2xl bg-surface-container overflow-hidden relative border border-outline-variant/10 cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all shadow-sm"
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
                className="col-span-1 row-span-1 rounded-2xl bg-surface-container overflow-hidden relative border border-outline-variant/10 cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all shadow-sm"
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
                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-black text-lg"
                  >
                    +{job.photos_urls.length - 3}
                  </div>
                )}
              </div>
            ) : (
              <div className="col-span-1 row-span-1 rounded-2xl bg-surface-container-highest/30 flex items-center justify-center border border-outline-variant/10">
                <MSymbol icon="more_horiz" size={24} className="text-outline-variant/40" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-32 rounded-2xl bg-surface-container-low border border-dashed border-outline-variant/30 flex flex-col items-center justify-center gap-2 text-on-surface-variant/40">
            <MSymbol icon="image_not_supported" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Sin fotos adjuntas</p>
          </div>
        )}
      </section>

      {/* Mapa de ubicación */}
      {job.lat && job.lng && (
        <section className="px-5 pb-8">
          <p className="text-[10px] uppercase font-black tracking-widest text-primary/60 mb-3 px-1">
            {isOwner ? "Tu ubicación del trabajo" : "Ubicación aproximada"}
          </p>
          <MapaAproximado
            lat={Number(job.lat)}
            lng={Number(job.lng)}
            exact={isOwner || isAdmin || ['paid', 'in_progress', 'completed', 'finished'].includes(job.status)}
          />
          {(isOwner || isAdmin || ['paid', 'in_progress', 'completed', 'finished'].includes(job.status)) && (
            <div className="flex items-center gap-3 mt-4 px-4 py-3 bg-primary/5 rounded-2xl border border-primary/10">
              <MSymbol icon="location_on" size={20} className="text-primary" filled />
              <p className="text-sm font-bold text-on-surface leading-tight">{job.address}</p>
            </div>
          )}
        </section>
      )}

      {/* Aviso para Solicitantes (No proveedores) que ven el trabajo */}
      {!isProvider && !isOwner && !isAdmin && (
        <section className="px-5 mb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="size-12 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
              <MSymbol icon="engineering" size={24} className="text-amber-600" filled />
            </div>
            <div>
              <p className="text-base font-headline font-black text-amber-900 leading-tight mb-1">
                ¿Querés realizar este trabajo?
              </p>
              <p className="text-sm text-amber-800 leading-relaxed font-medium">
                Para enviar una oferta y postularte, primero debés configurar y activar tu perfil de prestador de servicios en tu configuración.
              </p>
              <Link href="/perfil" className="inline-flex items-center gap-2 mt-4 text-[11px] font-black text-amber-700 uppercase tracking-widest bg-amber-200/50 px-4 py-2 rounded-xl transition-all active:scale-95">
                Configurar mi perfil ahora
                <MSymbol icon="arrow_forward" size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Datos de Contacto */}
      {(assignedProvider && isAuthorized) && (        <section className="px-5 mb-8">
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-3xl p-5 shadow-ambient">
            {isOwner || isAdmin ? (
              // Vista para el dueño o admin: Mostrar datos del colaborador
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-primary uppercase text-[10px] font-black tracking-widest opacity-80">
                    <MSymbol icon="engineering" size={14} filled />
                    Colaborador Asignado
                  </div>
                  {job.final_amount > 0 && (
                    <div className="bg-success/10 text-success text-xs font-black px-3 py-1 rounded-full uppercase tracking-tight border border-success/10 animate-in fade-in zoom-in duration-500">
                      Monto: ${job.final_amount.toLocaleString("es-AR")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14 border-2 border-primary/10 shadow-sm">
                    <AvatarImage src={assignedProvider.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/5 text-primary font-black">
                      {assignedProvider.full_name?.substring(0, 2).toUpperCase() || "AM"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-black text-lg text-on-surface leading-tight truncate">
                      {assignedProvider.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-0.5 text-amber-600 font-black text-xs">
                        <MSymbol icon="star" size={14} filled />
                        {assignedProvider.rating || 5}
                      </div>
                      <span className="text-outline-variant">•</span>
                      <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">
                        {assignedProvider.jobs_count || 0} TRABAJOS
                      </span>
                    </div>
                  </div>
                  {(job.status === "paid" || job.status === "in_progress" || job.status === "finished" || job.status === "completed") && (
                    <a
                      href={`tel:${assignedProvider.phone}`}
                      className="size-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-all"
                      aria-label="Llamar"
                    >
                      <MSymbol icon="call" size={24} />
                    </a>
                  )}
                </div>
              </>
            ) : (
              // Vista para el colaborador: Mostrar datos del solicitante
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-primary uppercase text-[10px] font-black tracking-widest opacity-80">
                    <MSymbol icon="person" size={14} filled />
                    Solicitante
                  </div>
                  {job.final_amount > 0 && (
                    <div className="bg-success/10 text-success text-xs font-black px-3 py-1 rounded-full uppercase tracking-tight border border-success/10 animate-in fade-in zoom-in duration-500">
                      Oferta: ${job.final_amount.toLocaleString("es-AR")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14 border-2 border-primary/10 shadow-sm">
                    <AvatarImage src={clientData?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/5 text-primary font-black">
                      {clientData?.full_name?.substring(0, 2).toUpperCase() || "AM"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-black text-lg text-on-surface leading-tight truncate">
                      {clientData?.full_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">
                        DUEÑO DEL TRABAJO
                      </span>
                    </div>
                  </div>
                  {(job.status === "in_progress" || job.status === "finished" || job.status === "completed") && (
                    <a
                      href={`tel:${clientData?.phone}`}
                      className="size-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/30 active:scale-90 transition-all"
                      aria-label="Llamar"
                    >
                      <MSymbol icon="call" size={24} />
                    </a>
                  )}
                </div>
              </>
            )}

            {(job.status === "in_progress" || job.status === "finished") && (
              <div className="mt-6 pt-5 border-t border-outline-variant/10">
                {isOwner ? (
                  !job.provider_arrived_at ? (
                    <button
                      onClick={handleConfirmArrival}
                      className="w-full py-4 bg-cta-gradient text-on-primary rounded-2xl font-headline font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                    >
                      Confirmar llegada al domicilio
                    </button>
                  ) : job.status === "finished" ? (
                    <button
                      onClick={() => setIsReviewDialogOpen(true)}
                      className="w-full py-4 bg-cta-gradient text-on-primary rounded-2xl font-headline font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <MSymbol icon="rate_review" size={20} filled />
                      Calificar y Cerrar Trabajo
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5 text-success font-black text-[11px] uppercase tracking-wider bg-success/5 px-4 py-3 rounded-xl border border-success/10">
                      <MSymbol icon="check_circle" size={18} filled />
                      {job.status === "finished" ? "Tarea terminada · Aguardando cierre" : "Llegada confirmada · En proceso"}
                    </div>
                  )
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-[11px] text-primary/70 font-black uppercase tracking-widest text-center">
                      {!job.provider_arrived_at
                        ? "Esperando confirmación de llegada."
                        : job.status === "finished"
                          ? "Trabajo informado como terminado."
                          : "¡Ya podés comenzar a trabajar!"}
                    </p>
                    {(job.provider_arrived_at && (isAssignedProvider || isAdmin)) && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={handleComplete}
                          disabled={submittingOffer || job.status === "finished"}
                          className={cn(
                            "w-full py-4 rounded-2xl font-headline font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95",
                            job.status === "finished"
                              ? "bg-success/10 text-success shadow-none border border-success/20"
                              : "bg-cta-gradient text-white shadow-primary/25 hover:opacity-95"
                          )}
                        >
                          {submittingOffer ? "..." : job.status === "finished" ? "Finalizado" : "Finalizar Tarea"}
                        </button>
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
        <section className="px-5">
          {isOwner ? (
            <>
              <div className="flex items-center justify-between mb-5 px-1">
                <h2 className="font-headline font-black text-xl text-on-surface tracking-tight">
                  Ofertas recibidas
                  <span className="ml-2 text-primary opacity-40 font-black">({offers.length})</span>
                </h2>
              </div>

              {offers.length === 0 ? (
                <div className="bg-surface-container-lowest border border-dashed border-outline-variant/30 rounded-2xl p-8 text-center">
                  <MSymbol icon="inbox" size={32} className="text-outline-variant mb-2 opacity-40" />
                  <p className="text-on-surface-variant text-sm font-medium">Aguardando ofertas de profesionales...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
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
              "p-6 rounded-3xl shadow-ambient border border-outline-variant/10",
              job.status === "payment_rejected" ? "bg-error-container/10 border-error/20" : "bg-surface-container-lowest"
            )}>
              {hasMadeOffer && !isEditingOffer ? (
                (() => {
                  const myOffer = offers.find(o => o.providerId === userId);
                  if (myOffer?.status === "accepted") {
                    return (
                        <div className="flex flex-col items-center justify-center gap-4 text-center py-4">
                          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                            <MSymbol icon="star" size={40} className="text-primary" filled />
                          </div>
                          <div>
                            <h3 className="font-headline font-black text-2xl text-on-surface">¡Te eligieron!</h3>
                            <p className="text-sm text-on-surface-variant mt-2 font-medium leading-relaxed">
                              El cliente seleccionó tu oferta. Los datos de contacto ya están disponibles para coordinar el trabajo.
                            </p>
                          </div>
                        </div>
                    );
                  }

                  return (
                    <div className="text-center flex flex-col items-center gap-4">
                      <div className="bg-primary/5 w-full p-6 rounded-2xl border border-primary/10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 opacity-60">Tu Propuesta</p>
                        <p className="text-4xl font-black text-primary font-headline tracking-tighter">
                          ${myOffer?.minAmount?.toLocaleString("es-AR")} - ${myOffer?.maxAmount?.toLocaleString("es-AR")}
                        </p>
                      </div>
                      <div className="px-4">
                        <p className="text-sm font-bold text-on-surface">Oferta enviada con éxito.</p>
                        <p className="text-xs text-on-surface-variant mt-2 leading-relaxed font-medium">Recibirás una notificación si el cliente acepta tu propuesta o si se selecciona a otro profesional.</p>
                      </div>
                      <button 
                        onClick={() => {
                          setMinAmount(myOffer?.minAmount?.toString() || "");
                          setMaxAmount(myOffer?.maxAmount?.toString() || "");
                          setIsEditingOffer(true);
                        }}
                        className="text-[10px] font-black text-primary uppercase tracking-widest mt-4 border-b-2 border-primary/10 pb-1 hover:border-primary transition-all active:scale-95"
                      >
                        Modificar rango de oferta
                      </button>
                    </div>
                  );
                })()
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="font-headline font-black text-2xl text-on-surface tracking-tight">
                      {hasMadeOffer ? "Editar oferta" : "Hacer una oferta"}
                    </h2>
                    {isEditingOffer && (
                      <button onClick={() => setIsEditingOffer(false)} className="text-on-surface-variant hover:bg-surface-container-high p-2 rounded-full transition-all">
                        <MSymbol icon="close" size={20} />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface font-headline font-black text-base opacity-40">$</span>
                        <input
                          type="number"
                          value={minAmount}
                          onChange={(e) => setMinAmount(e.target.value)}
                          placeholder="Mínimo"
                          className="w-full bg-surface-container rounded-2xl pl-8 pr-4 py-4 text-base font-headline font-black text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline-variant/50 shadow-inner"
                        />
                        <span className="absolute -top-2 left-4 bg-surface px-1 text-[9px] font-black text-primary uppercase tracking-widest">Desde</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface font-headline font-black text-base opacity-40">$</span>
                        <input
                          type="number"
                          value={maxAmount}
                          onChange={(e) => setMaxAmount(e.target.value)}
                          placeholder="Máximo"
                          className="w-full bg-surface-container rounded-2xl pl-8 pr-4 py-4 text-base font-headline font-black text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline-variant/50 shadow-inner"
                        />
                        <span className="absolute -top-2 left-4 bg-surface px-1 text-[9px] font-black text-primary uppercase tracking-widest">Hasta</span>
                      </div>
                    </div>
                    <button
                      disabled={submittingOffer}
                      onClick={handleSubmitOffer}
                      className="w-full py-5 bg-cta-gradient text-white font-headline font-black text-base rounded-2xl uppercase tracking-widest shadow-lg shadow-primary/25 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {submittingOffer ? "..." : hasMadeOffer ? "Guardar Cambios" : "Enviar Oferta al Cliente"}
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
        <DialogContent className="max-w-[90vw] md:max-w-md rounded-3xl p-8 gap-8 border-none shadow-2xl">
          <DialogHeader>
            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <MSymbol icon="payments" size={40} className="text-primary" filled />
            </div>
            <DialogTitle className="text-center font-headline font-black text-3xl tracking-tight">Confirmar elección</DialogTitle>
            <DialogDescription className="text-center text-on-surface-variant text-base leading-relaxed mt-4 font-medium px-2">
              Al aceptar esta oferta, se liberarán los datos de contacto mutuos para coordinar el trabajo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-on-surface font-headline font-black text-xl opacity-40">$</span>
              <input
                type="number"
                value={finalAmount}
                onChange={(e) => setFinalAmount(e.target.value)}
                placeholder="Monto final acordado"
                className="w-full bg-surface-container rounded-2xl pl-10 pr-6 py-5 text-xl font-headline font-black text-on-surface outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline-variant/50 shadow-inner"
              />
            </div>
            <p className="text-[10px] text-center font-black text-on-surface-variant uppercase tracking-widest opacity-60">
              Confirmá el monto acordado para el registro del trabajo.
            </p>
            {selectedOffer?.minAmount && selectedOffer?.maxAmount && (
              <p className="text-[10px] text-center font-black text-primary uppercase tracking-widest opacity-60">
                Rango ofrecido: ${selectedOffer.minAmount.toLocaleString("es-AR")} - ${selectedOffer.maxAmount.toLocaleString("es-AR")}
              </p>
            )}
          </div>

          <DialogFooter className="sm:justify-center">
            <button
              onClick={handleConfirmAccept}
              disabled={submittingOffer}
              className="w-full py-5 bg-cta-gradient text-on-primary font-headline font-black text-base rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest transition-all hover:opacity-95 active:scale-95 disabled:opacity-50"
            >
              {submittingOffer ? "..." : "Aceptar y Ver Contacto"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Reseña y Calificación */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-md rounded-[2.5rem] p-6 md:p-8 border-none shadow-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <div className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-4 md:mb-6 rotate-3">
              <MSymbol icon="star" size={32} className="text-primary md:size-10" filled />
            </div>
            <DialogTitle className="text-center font-headline font-black text-2xl md:text-3xl tracking-tight leading-none mb-2">
              ¿Cómo fue tu experiencia?
            </DialogTitle>
            <DialogDescription className="text-center text-on-surface-variant text-sm md:text-base font-medium">
              Calificá el trabajo de <span className="text-primary font-black">{assignedProvider?.full_name}</span> para ayudar a otros vecinos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 md:space-y-8 mt-4 relative z-10">
            {/* Star Rating Selector */}
            <div className="flex items-center justify-center gap-1 md:gap-2 py-3 md:py-4 bg-surface-container-low rounded-[2rem] border border-outline-variant/10">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-all active:scale-90"
                >
                  <MSymbol 
                    icon="star" 
                    size={36} 
                    filled={star <= rating} 
                    className={cn(
                      "transition-all md:size-10",
                      star <= rating ? "text-amber-500 drop-shadow-sm scale-110" : "text-outline-variant opacity-30"
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Comment Area */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 ml-4">
                Comentario (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ej: Excelente trabajo, muy puntual y prolijo..."
                className="w-full h-24 md:h-32 bg-surface-container rounded-3xl p-4 md:p-5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none border border-outline-variant/10"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 md:mt-8 relative z-10 border-none bg-transparent p-0 m-0">
            <button
              onClick={handleSubmitReview}
              disabled={submittingReview}
              className="w-full py-4 md:py-5 bg-cta-gradient text-on-primary font-headline font-black text-sm md:text-base rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-widest transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 mb-2"
            >
              {submittingReview ? "Enviando..." : "Finalizar y Calificar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Zoom de Imagen */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent showCloseButton={false} className="max-w-[95vw] max-h-[90vh] p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center ring-0">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 z-[60] p-3 rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors"
          >
            <MSymbol icon="close" size={24} />
          </button>
          {selectedImage && (
            <div className="relative w-full h-full min-h-[50vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage}
                alt="Imagen ampliada"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
