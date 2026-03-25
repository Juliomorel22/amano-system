"use client";

import { useEffect, useState } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type JobStatus } from "@/components/amano/job-card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ADMIN_EMAIL = "administrator@amano.com";

export default function AdminPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return router.push("/login");
    
    if (user.email !== ADMIN_EMAIL) {
      toast.error("No tenés permisos para acceder a esta sección.");
      return router.push("/dashboard");
    }

    // Cargar pagos pendientes (donde verified_at es nulo)
    const { data: paymentsData, error: payError } = await supabase
      .from("payments")
      .select(`
        *,
        jobs (
          *,
          profiles:profiles!jobs_client_id_fkey(full_name)
        )
      `)
      .is("verified_at", null)
      .order("created_at", { ascending: false });

    console.log("Admin: Pendientes de pago:", paymentsData);

    if (payError) {
      console.error("Error detallado cargando pagos:", payError);
      toast.error("Error al cargar pagos: " + payError.message);
    } else if (paymentsData) {
      setPayments(paymentsData);
    }

    // Cargar todos los trabajos activos para el admin
    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        *, 
        client:profiles!jobs_client_id_fkey(full_name),
        provider:profiles!jobs_provider_id_fkey(full_name, phone)
      `)
      .not("status", "eq", "completed") // Traer todo lo que no esté cerrado aún
      .order("created_at", { ascending: false });

    if (!jobsError && jobsData) {
      setActiveJobs(jobsData);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const supabase = createClient();
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const handleApprove = async (paymentId: string, jobId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Validar el pago
    const { error: payError } = await supabase
      .from("payments")
      .update({ 
        verified_at: new Date().toISOString(),
        verified_by: user.id
      })
      .eq("id", paymentId);

    if (payError) return toast.error(payError.message);

    // 2. Actualizar el trabajo a 'in_progress'
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ status: "in_progress" })
      .eq("id", jobId);

    if (jobError) return toast.error(jobError.message);

    // 3. Notificar a las partes
    const { data: jobData } = await supabase
      .from("jobs")
      .select("title, description, category, client_id, provider_id")
      .eq("id", jobId)
      .single();

    if (jobData) {
      if (jobData.provider_id) {
        await supabase.from("notifications").insert({
          user_id: jobData.provider_id,
          type: "payment_verified",
          title: "Pago verificado",
          content: `El pago para "${jobData.title || jobData.description || jobData.category}" fue verificado. ¡Ya podés comenzar el trabajo!`,
          link: `/trabajos/${jobId}`,
        });
      }
      if (jobData.client_id) {
        await supabase.from("notifications").insert({
          user_id: jobData.client_id,
          type: "payment_verified",
          title: "Pago aprobado",
          content: `Tu pago para "${jobData.title || jobData.description || jobData.category}" fue aprobado por administración.`,
          link: `/trabajos/${jobId}`,
        });
      }
    }

    toast.success("Pago aprobado y trabajo habilitado.");
    loadData();
  };

  const handleReject = async (paymentId: string, jobId: string) => {
    const supabase = createClient();
    
    // 1. Marcar el trabajo como pago rechazado
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ status: "payment_rejected" })
      .eq("id", jobId);

    if (jobError) return toast.error(jobError.message);

    // 2. Eliminar el registro de pago para permitir re-subida
    const { error: payError } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (payError) return toast.error(payError.message);

    // 3. Notificar al cliente
    const { data: jobData } = await supabase
      .from("jobs")
      .select("title, description, category, client_id")
      .eq("id", jobId)
      .single();

    if (jobData?.client_id) {
      await supabase.from("notifications").insert({
        user_id: jobData.client_id,
        type: "payment_rejected",
        title: "Pago rechazado",
        content: `Tu comprobante para "${jobData.title || jobData.description || jobData.category}" fue rechazado. Por favor, subí uno válido.`,
        link: `/trabajos/${jobId}`,
      });
    }

    toast.error("Pago rechazado correctamente.");
    loadData();
  };

  const handleCompleteByAdmin = async (jobId: string) => {
    const supabase = createClient();
    
    // Marcar como 'finished' (por cerrar por admin)
    const { error } = await supabase
      .from("jobs")
      .update({ status: "finished" })
      .eq("id", jobId);

    if (error) return toast.error(error.message);

    toast.success("Trabajo marcado como finalizado.");
    loadData();
  };

  const handleCloseJob = async (jobId: string) => {
    const supabase = createClient();
    
    // 1. Marcar como completado definitivamente
    const { error: errorJob } = await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", jobId);

    if (errorJob) return toast.error(errorJob.message);

    // 2. Notificar a ambas partes del cierre exitoso
    const { data: jobData } = await supabase
      .from("jobs")
      .select("title, description, category, client_id, provider_id")
      .eq("id", jobId)
      .single();

    if (jobData) {
      if (jobData.provider_id) {
        await supabase.from("notifications").insert({
          user_id: jobData.provider_id,
          type: "job_closed",
          title: "Trabajo cerrado con éxito",
          content: `¡Felicidades! La administración cerró el trabajo "${jobData.title || jobData.description || jobData.category}". Tu saldo será acreditado en breve.`,
          link: `/dashboard`,
        });
      }

      if (jobData.client_id) {
        await supabase.from("notifications").insert({
          user_id: jobData.client_id,
          type: "job_closed",
          title: "Trabajo finalizado",
          content: `El trabajo "${jobData.title || jobData.description || jobData.category}" ha sido cerrado definitivamente por administración. ¡Gracias por confiar en Amano!`,
          link: `/trabajos/${jobId}`,
        });
      }
    }

    toast.success("Trabajo cerrado correctamente.");
    loadData();
  };

  const calculateCommissions = () => {
    const total = activeJobs
      .filter(j => j.status === 'paid' || j.status === 'in_progress' || j.status === 'finished')
      .reduce((acc, job) => acc + (job.final_amount || 0), 0);
    return (total * 0.10).toLocaleString("es-AR");
  };

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center">Cargando panel...</div>;

  const pendingPayments = payments;
  const jobsToClose = activeJobs.filter(j => j.status === 'finished');
  const monitoringJobs = activeJobs.filter(j => j.status !== 'finished');

  return (
    <div className="bg-surface flex flex-col max-w-md md:max-w-4xl lg:max-w-6xl mx-auto shadow-2xl relative">
      <div className="px-5 pt-8 pb-6 bg-surface-container-low border-b border-outline-variant/10">
        <div className="flex items-center gap-2 mb-1">
          <MSymbol icon="admin_panel_settings" size={28} className="text-primary" filled />
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">Panel Admin</h1>
        </div>
        <p className="text-on-surface-variant text-base">Gestión y Validación · A mano</p>
      </div>

      {/* Stats */}
      <section className="px-5 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Pagos Pendientes", value: pendingPayments.length, icon: "pending_actions", color: "text-tertiary" },
            { label: "Por Finalizar", value: jobsToClose.length, icon: "task_alt", color: "text-secondary" },
            { label: "Comisiones Estimadas", value: `$${calculateCommissions()}`, icon: "payments", color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-full bg-surface-container-low ${s.color}`}>
                <MSymbol icon={s.icon} size={28} filled />
              </div>
              <div>
                <p className={`font-headline font-extrabold text-2xl ${s.color}`}>{s.value}</p>
                <p className="text-xs text-on-surface-variant font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pagos por Validar */}
      <section className="px-5 mb-8">
        <h2 className="font-headline font-bold text-xl text-on-surface mb-4 flex items-center gap-2">
          <MSymbol icon="pending_actions" size={22} className="text-tertiary" />
          Pagos por Validar
          {pendingPayments.length > 0 && (
            <span className="ml-1 bg-tertiary text-on-tertiary text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {pendingPayments.length}
            </span>
          )}
        </h2>
        
        {pendingPayments.length === 0 ? (
           <p className="text-on-surface-variant text-sm p-4 bg-surface-container-lowest rounded-lg">No hay pagos pendientes de validación.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPayments.map((p) => {
              // Manejar tanto objeto como array (por si acaso)
              const jobData = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs;
              const profile = Array.isArray(jobData?.profiles) ? jobData.profiles[0] : jobData?.profiles;
              const clName = profile?.full_name || "Cliente";
              const shortId = jobData?.id?.split("-")[0] || "---";

              return (
                <div key={p.id} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
                  <div className="relative h-40 bg-surface-container">
                    {p.proof_url?.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-surface-container-high text-on-surface-variant">
                        <MSymbol icon="picture_as_pdf" size={40} className="text-error" filled />
                        <span className="text-xs font-bold uppercase tracking-wider">Documento PDF</span>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.proof_url} alt="Comprobante" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <span className="bg-surface/80 backdrop-blur-md text-on-surface text-[10px] font-bold px-2 py-1 rounded-md uppercase">
                        ID: {shortId}
                      </span>
                      <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm">
                        Sin Validar
                      </span>
                    </div>
                    <a 
                      href={p.proof_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute bottom-2 left-2 bg-surface/80 backdrop-blur-md text-primary text-[10px] font-bold px-3 py-1.5 rounded-md uppercase hover:bg-primary hover:text-white transition-all flex items-center gap-1"
                    >
                      <MSymbol icon="open_in_new" size={14} />
                      Ver pantalla completa
                    </a>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <Link href={`/trabajos/${p.job_id}`} className="hover:opacity-80 transition-opacity">
                        <p className="font-headline font-bold text-lg text-on-surface capitalize truncate">{jobData?.title || jobData?.category}</p>
                        <p className="text-sm text-on-surface-variant font-medium">Cliente: {clName}</p>
                        <p className="text-xs text-outline mt-1">{new Date(p.created_at).toLocaleTimeString()} · {jobData?.barrio}</p>
                      </Link>
                      <p className="font-headline font-extrabold text-2xl text-primary">${(jobData?.final_amount || 0).toLocaleString("es-AR")}</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleReject(p.id, p.job_id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-outline-variant/20 text-on-surface-variant font-bold text-sm hover:bg-error/10 hover:text-error hover:border-error/30 transition-all"
                      >
                        <MSymbol icon="close" size={18} />
                        Rechazar
                      </button>
                      <button 
                        onClick={() => handleApprove(p.id, p.job_id)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-cta-gradient text-white font-bold text-sm shadow-md hover:opacity-90 transition-all"
                      >
                        <MSymbol icon="verified" size={18} filled />
                        Aprobar Pago
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Trabajos por Cerrar - NUEVA SECCIÓN */}
      {jobsToClose.length > 0 && (
        <section className="px-5 mb-8">
          <h2 className="font-headline font-bold text-xl text-on-surface mb-4 flex items-center gap-2">
            <MSymbol icon="task_alt" size={22} className="text-secondary" />
            Trabajos por Cerrar
            <span className="ml-1 bg-secondary text-on-secondary text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {jobsToClose.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jobsToClose.map((j) => (
              <div key={j.id} className="bg-surface-container-lowest rounded-xl p-5 border-2 border-secondary/20 shadow-sm flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-lg text-on-surface truncate">{j.title || j.category}</p>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">El prestador ya terminó la tarea.</p>
                  </div>
                  <Badge className="bg-secondary text-on-secondary text-[10px] uppercase font-black">Terminado</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-surface-container-low">
                    <span className="text-[9px] uppercase font-bold text-outline">Solicitante</span>
                    <span className="text-xs font-bold text-on-surface truncate">{j.client?.full_name}</span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-2 rounded-lg bg-surface-container-low">
                    <span className="text-[9px] uppercase font-bold text-outline">Prestador</span>
                    <span className="text-xs font-bold text-primary truncate">{j.provider?.full_name}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCloseJob(j.id)}
                  className="w-full py-3 bg-secondary text-on-secondary rounded-xl font-headline font-bold text-sm uppercase tracking-wider shadow-lg shadow-secondary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <MSymbol icon="verified" size={18} />
                  Finalizar y Cerrar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trabajos Activos */}
      <section className="px-5 flex-1">
        <h2 className="font-headline font-bold text-xl text-on-surface mb-4 flex items-center gap-2">
          <MSymbol icon="work" size={22} className="text-primary" />
          Monitoreo de Trabajos Activos
        </h2>
        {monitoringJobs.length === 0 ? (
          <p className="text-on-surface-variant text-sm p-4 bg-surface-container-lowest rounded-lg">No hay otros trabajos activos.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {monitoringJobs.map((j) => {
              const clName = j.client?.full_name || "Cliente";
              const prName = j.provider?.full_name;
              const shortId = j.id?.split('-')[0] || "---";
              
              return (
                <Link 
                  key={j.id} 
                  href={`/trabajos/${j.id}`}
                  className="bg-surface-container-lowest rounded-xl p-4 flex items-center justify-between border border-outline-variant/10 shadow-sm hover:border-primary/20 transition-all group"
                >
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold text-outline uppercase bg-surface-container-low px-1.5 py-0.5 rounded">#{shortId}</span>
                      <p className="font-semibold text-on-surface text-base group-hover:text-primary transition-colors truncate">{j.title || j.category}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-xs text-on-surface-variant flex items-center gap-1">
                        <MSymbol icon="person" size={14} /> {clName}
                      </p>
                      {prName && (
                        <p className="text-xs text-primary font-bold flex items-center gap-1">
                          <MSymbol icon="engineering" size={14} filled /> {prName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end shrink-0 ml-4">
                    <Badge className={cn(
                      "rounded-full text-[10px] mb-1.5 px-3 py-1 font-bold uppercase",
                      j.status === "in_progress" ? "bg-primary text-on-primary" : "bg-secondary-container text-on-secondary-container"
                    )}>
                      {STATUS_LABELS[j.status as JobStatus] || j.status}
                    </Badge>
                    {j.status === "in_progress" && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCompleteByAdmin(j.id);
                        }}
                        className="text-[10px] font-bold text-primary uppercase border border-primary/20 px-2 py-1 rounded hover:bg-primary/10 transition-colors mt-1"
                      >
                        Marcar Finalizado
                      </button>
                    )}
                    {j.final_amount > 0 && <p className="font-headline font-bold text-primary text-base mt-1">${j.final_amount.toLocaleString("es-AR")}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
