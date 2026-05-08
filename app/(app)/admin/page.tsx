"use client";

import { useEffect, useState, useCallback } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type JobStatus } from "@/components/amano/job-card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import { sendNotification } from "@/lib/supabase/notifications";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const ADMIN_EMAIL = "administrator@amano.com";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  is_provider: boolean;
  rating: number;
  avatar_url?: string;
  barrio?: string;
  created_at: string;
}

interface AdminPayment {
  id: string;
  job_id: string;
  proof_url: string;
  verified_at: string | null;
  created_at: string;
  jobs: {
    id: string;
    title?: string;
    category: string;
    description: string;
    final_amount: number;
    barrio: string;
    client_id: string;
    provider_id: string;
    profiles?: { full_name: string } | { full_name: string }[];
  } | {
    id: string;
    title?: string;
    category: string;
    description: string;
    final_amount: number;
    barrio: string;
    client_id: string;
    provider_id: string;
    profiles?: { full_name: string } | { full_name: string }[];
  }[];
}

interface AdminJob {
  id: string;
  title?: string;
  category: string;
  description: string;
  status: JobStatus;
  barrio: string;
  final_amount: number;
  client_id: string;
  provider_id: string;
  created_at: string;
  client?: { full_name: string };
  provider?: { full_name: string; phone?: string };
}

export default function AdminPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [activeJobs, setActiveJobs] = useState<AdminJob[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState("all");

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return router.push("/login");
    
    if (user.email !== ADMIN_EMAIL) {
      toast.error("No tenés permisos para acceder a esta sección.");
      return router.push("/dashboard");
    }

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

    if (payError) {
      console.error("Error detallado cargando pagos:", payError);
      toast.error("Error al cargar pagos: " + payError.message);
    } else if (paymentsData) {
      setPayments(paymentsData as unknown as AdminPayment[]);
    }

    const { data: jobsData, error: jobsError } = await supabase
      .from("jobs")
      .select(`
        *, 
        client:profiles!jobs_client_id_fkey(full_name),
        provider:profiles!jobs_provider_id_fkey(full_name, phone)
      `)
      .not("status", "eq", "completed")
      .order("created_at", { ascending: false });

    if (!jobsError && jobsData) {
      setActiveJobs(jobsData as unknown as AdminJob[]);
    }

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!profilesError && profilesData) {
      setProfiles(profilesData as Profile[]);
    }

    setLoading(false);
  }, [router]);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const handleApprove = async (paymentId: string, jobId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: jobData, error: jobFetchError } = await supabase
      .from("jobs")
      .select("provider_id, title, description, category, client_id")
      .eq("id", jobId)
      .single();

    if (jobFetchError || !jobData?.provider_id) {
      return toast.error("No se pudo encontrar el colaborador asignado a este trabajo.");
    }

    const { error: payError } = await supabase
      .from("payments")
      .update({ 
        verified_at: new Date().toISOString(),
        verified_by: user.id
      })
      .eq("id", paymentId);

    if (payError) return toast.error(payError.message);

    const { error: jobUpdateError } = await supabase
      .from("jobs")
      .update({ 
        status: "in_progress"
      })
      .eq("id", jobId);

    if (jobUpdateError) return toast.error(jobUpdateError.message);

    await sendNotification({
      userId: jobData.provider_id,
      type: "payment_verified",
      title: "Pago verificado",
      content: `¡El pago fue verificado! Ya fuiste asignado oficialmente al trabajo. Ya podés ver los datos de contacto y comenzar.`,
      link: `/trabajos/${jobId}`,
    });

    if (jobData.client_id) {
      await sendNotification({
        userId: jobData.client_id,
        type: "payment_verified",
        title: "Pago aprobado",
        content: `Tu pago para "${jobData.title || jobData.description || jobData.category}" fue aprobado. El colaborador ya tiene tus datos y se pondrá en contacto.`,
        link: `/trabajos/${jobId}`,
      });
    }

    toast.success("Pago aprobado y trabajo habilitado.");
    loadData();
  };

  const handleReject = async (paymentId: string, jobId: string) => {
    const supabase = createClient();
    const { error: jobError } = await supabase
      .from("jobs")
      .update({ status: "payment_rejected" })
      .eq("id", jobId);

    if (jobError) return toast.error(jobError.message);

    const { error: payError } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (payError) return toast.error(payError.message);

    const { data: jobData } = await supabase
      .from("jobs")
      .select("title, description, category, client_id")
      .eq("id", jobId)
      .single();

    if (jobData?.client_id) {
      await sendNotification({
        userId: jobData.client_id,
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
    const { error: errorJob } = await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", jobId);

    if (errorJob) return toast.error(errorJob.message);

    const { data: jobData } = await supabase
      .from("jobs")
      .select("title, description, category, client_id, provider_id")
      .eq("id", jobId)
      .single();

    if (jobData) {
      if (jobData.provider_id) {
        await sendNotification({
          userId: jobData.provider_id,
          type: "job_closed",
          title: "Trabajo cerrado con éxito",
          content: `¡Felicidades! La administración cerró el trabajo "${jobData.title || jobData.description || jobData.category}". Tu saldo será acreditado en breve.`,
          link: `/dashboard`,
        });
      }

      if (jobData.client_id) {
        await sendNotification({
          userId: jobData.client_id,
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

  const pendingPaymentsList = payments;
  const jobsToClose = activeJobs.filter(j => j.status === 'finished');
  const monitoringJobs = activeJobs.filter(j => j.status !== 'finished');

  const filteredProfiles = profiles.filter(p => {
    if (userFilter === "clients") return !p.is_provider;
    if (userFilter === "providers") return p.is_provider;
    return true;
  });

  return (
    <div className="bg-surface flex flex-col w-full lg:max-w-full max-w-7xl mx-auto md:my-8 lg:my-0 md:rounded-3xl lg:rounded-none shadow-2xl lg:shadow-none overflow-hidden relative">
      <div className="px-6 pt-10 pb-8 bg-surface-container-low border-b border-outline-variant/10 md:px-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <MSymbol icon="admin_panel_settings" size={32} className="text-primary" filled />
              <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-surface">Panel Admin</h1>
            </div>
            <p className="text-on-surface-variant text-base md:text-lg">Gestión centralizada · A mano Formosa</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-outline uppercase tracking-widest bg-surface-container-high px-3 py-1.5 rounded-full w-fit">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Sistema en Vivo
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <section className="px-6 py-8 md:px-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/5 flex items-center gap-5 transition-transform hover:scale-[1.02] h-full">
            <div className="p-4 rounded-2xl bg-tertiary/10 text-tertiary shrink-0">
              <MSymbol icon="pending_actions" size={32} filled />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-headline font-black text-2xl md:text-3xl text-tertiary truncate">{pendingPaymentsList.length}</p>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-tight mt-0.5 truncate">Pagos Pendientes</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/5 flex items-center gap-5 transition-transform hover:scale-[1.02] h-full">
            <div className="p-4 rounded-2xl bg-secondary/10 text-secondary shrink-0">
              <MSymbol icon="task_alt" size={32} filled />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-headline font-black text-2xl md:text-3xl text-secondary truncate">{jobsToClose.length}</p>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-tight mt-0.5 truncate">Por Finalizar</p>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/5 flex items-center gap-5 transition-transform hover:scale-[1.02] h-full overflow-hidden">
            <div className="p-4 rounded-2xl bg-primary/10 text-primary shrink-0">
              <MSymbol icon="payments" size={32} filled />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-headline font-black text-xl md:text-2xl text-primary break-all leading-tight">
                ${calculateCommissions()}
              </p>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-tight mt-1 truncate">Comisiones</p>
            </div>
          </div>

          <Dialog>
            <DialogTrigger
              render={
                <button className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/5 flex items-center gap-5 transition-all hover:scale-[1.02] hover:bg-surface-container-low text-left group h-full">
                  <div className="p-4 rounded-2xl bg-[#0066FF]/10 text-[#0066FF] group-hover:bg-[#0066FF] group-hover:text-white transition-colors shrink-0">
                    <MSymbol icon="group" size={32} filled />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-headline font-black text-2xl md:text-3xl text-[#0066FF] truncate">{profiles.length}</p>
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-tight mt-0.5 truncate">Usuarios</p>
                  </div>
                </button>
              }
            />
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden md:rounded-3xl border-none shadow-2xl">
              <DialogHeader className="p-8 border-b border-outline-variant/10 shrink-0 bg-surface-container-low">
                <DialogTitle className="text-3xl font-headline font-black text-on-surface">Gestión de Usuarios</DialogTitle>
                <DialogDescription className="text-base text-on-surface-variant">
                  Explora y filtra la base de datos de usuarios registrados.
                </DialogDescription>
              </DialogHeader>

              <div className="px-8 py-5 border-b border-outline-variant/10 bg-surface-container-lowest shrink-0">
                <Tabs value={userFilter} onValueChange={setUserFilter} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-12 p-1.5 bg-surface-container-high rounded-xl">
                    <TabsTrigger value="all" className="rounded-lg font-bold">Todos ({profiles.length})</TabsTrigger>
                    <TabsTrigger value="clients" className="rounded-lg font-bold">Clientes ({profiles.filter(p => !p.is_provider).length})</TabsTrigger>
                    <TabsTrigger value="providers" className="rounded-lg font-bold">Proveedores ({profiles.filter(p => p.is_provider).length})</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredProfiles.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-on-surface-variant opacity-50">
                       <MSymbol icon="person_search" size={64} />
                       <p className="text-lg font-bold mt-4">No se encontraron usuarios.</p>
                    </div>
                  ) : (
                    filteredProfiles.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-5 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest shadow-sm hover:border-primary/30 transition-all group">
                        <Avatar size="lg" className="ring-2 ring-transparent group-hover:ring-primary/20 transition-all shrink-0">
                          <AvatarImage src={p.avatar_url} />
                          <AvatarFallback className="text-lg font-bold">{p.full_name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-on-surface text-lg leading-tight break-words">{p.full_name || "Sin nombre"}</p>
                            <Badge className={cn(
                              "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0",
                              p.is_provider ? "bg-primary text-on-primary" : "bg-secondary-container text-on-secondary-container"
                            )}>
                              {p.is_provider ? "Proveedor" : "Solicitante"}
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1 mt-2">
                            <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2">
                              <MSymbol icon="phone" size={16} className="text-outline" /> {p.phone || "---"}
                            </p>
                            <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2">
                              <MSymbol icon="location_on" size={16} className="text-outline" /> {p.barrio || "---"}
                            </p>
                          </div>
                        </div>
                        {p.is_provider && (
                          <div className="text-right shrink-0 bg-primary/5 p-3 rounded-xl ml-2">
                            <div className="flex items-center justify-end gap-1 text-primary">
                              <span className="text-lg font-black">{p.rating?.toFixed(1) || "0.0"}</span>
                              <MSymbol icon="star" size={18} filled />
                            </div>
                            <p className="text-[9px] text-outline font-black uppercase mt-0.5">Score</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      {/* Main Content Grids */}
      <div className="px-6 pb-12 md:px-10 grid grid-cols-1 gap-10">
        
        {/* Payments Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-headline font-extrabold text-2xl text-on-surface flex items-center gap-3">
              <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary">
                <MSymbol icon="pending_actions" size={24} />
              </div>
              Pagos por Validar
              {pendingPaymentsList.length > 0 && (
                <span className="ml-2 bg-tertiary text-on-tertiary text-sm font-black rounded-full px-2.5 py-0.5">
                  {pendingPaymentsList.length}
                </span>
              )}
            </h2>
          </div>
          
          {pendingPaymentsList.length === 0 ? (
             <div className="p-10 rounded-3xl bg-surface-container-lowest border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-on-surface-variant opacity-60">
                <MSymbol icon="task" size={48} />
                <p className="font-bold mt-4">Todo al día. No hay pagos pendientes.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingPaymentsList.map((p) => {
                const jobData = Array.isArray(p.jobs) ? p.jobs[0] : p.jobs;
                const profile = Array.isArray(jobData?.profiles) ? jobData.profiles[0] : jobData?.profiles;
                const clName = profile?.full_name || "Cliente";
                const shortId = jobData?.id?.split("-")[0] || "---";

                return (
                  <div key={p.id} className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-md border border-outline-variant/5 flex flex-col group transition-all hover:shadow-xl">
                    <div className="relative h-48 bg-surface-container overflow-hidden">
                      {p.proof_url?.toLowerCase().endsWith('.pdf') ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-surface-container-high text-on-surface-variant">
                          <MSymbol icon="picture_as_pdf" size={48} className="text-error" filled />
                          <span className="text-xs font-black uppercase tracking-widest">Documento PDF</span>
                        </div>
                      ) : (
                        <NextImage 
                          src={p.proof_url} 
                          alt="Comprobante" 
                          fill 
                          className="object-cover transition-transform group-hover:scale-110 duration-500" 
                          unoptimized
                        />
                      )}
                      <div className="absolute top-4 right-4 flex gap-2">
                        <span className="bg-surface/90 backdrop-blur-md text-on-surface text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm border border-outline-variant/10 uppercase">
                          ID: {shortId}
                        </span>
                      </div>
                      <a 
                        href={p.proof_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold gap-2 backdrop-blur-sm"
                      >
                        <MSymbol icon="open_in_new" size={24} />
                        VER COMPLETO
                      </a>
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-2">
                          <Link href={`/trabajos/${p.job_id}`} className="hover:text-primary transition-colors">
                            <p className="font-headline font-black text-xl text-on-surface capitalize truncate">{jobData?.title || jobData?.category}</p>
                          </Link>
                          <p className="text-sm text-on-surface-variant font-bold mt-1 flex items-center gap-1.5">
                            <MSymbol icon="person" size={16} /> {clName}
                          </p>
                          <p className="text-[10px] text-outline font-black uppercase tracking-tighter mt-1">{new Date(p.created_at).toLocaleString()} · {jobData?.barrio}</p>
                        </div>
                        <p className="font-headline font-black text-2xl text-primary shrink-0">${(jobData?.final_amount || 0).toLocaleString("es-AR")}</p>
                      </div>
                      <div className="flex gap-3 mt-auto pt-4 border-t border-outline-variant/10">
                        <button 
                          onClick={() => handleReject(p.id, p.job_id)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-outline-variant/10 text-on-surface-variant font-black text-xs uppercase hover:bg-error hover:text-white hover:border-error transition-all"
                        >
                          <MSymbol icon="close" size={18} />
                          Rechazar
                        </button>
                        <button 
                          onClick={() => handleApprove(p.id, p.job_id)}
                          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-cta-gradient text-white font-black text-xs uppercase shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                        >
                          <MSymbol icon="verified" size={18} filled />
                          Validar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Closing Jobs Section */}
        {jobsToClose.length > 0 && (
          <section>
            <h2 className="font-headline font-extrabold text-2xl text-on-surface mb-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                <MSymbol icon="task_alt" size={24} />
              </div>
              Trabajos por Cerrar
              <span className="ml-2 bg-secondary text-on-secondary text-sm font-black rounded-full px-2.5 py-0.5">
                {jobsToClose.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobsToClose.map((j) => (
                <div key={j.id} className="bg-surface-container-lowest rounded-3xl p-6 border-2 border-secondary/10 shadow-sm flex flex-col gap-5 hover:border-secondary/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-black text-xl text-on-surface truncate">{j.title || j.category}</p>
                      <Badge className="bg-secondary text-on-secondary text-[9px] uppercase font-black px-2 py-0.5 mt-2">Terminado</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/5">
                      <span className="text-[8px] uppercase font-black text-outline tracking-wider">Solicitante</span>
                      <span className="text-xs font-bold text-on-surface truncate">{j.client?.full_name}</span>
                    </div>
                    <div className="flex flex-col gap-1 p-3 rounded-2xl bg-surface-container-low border border-outline-variant/5">
                      <span className="text-[8px] uppercase font-black text-outline tracking-wider">Colaborador</span>
                      <span className="text-xs font-bold text-primary truncate">{j.provider?.full_name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCloseJob(j.id)}
                    className="w-full py-4 bg-secondary text-on-secondary rounded-2xl font-headline font-black text-sm uppercase tracking-widest shadow-xl shadow-secondary/20 hover:bg-secondary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <MSymbol icon="verified" size={20} />
                    Finalizar y Cerrar
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Monitoring Section - LIST FORMAT SORTED NEWEST FIRST */}
        <section>
          <h2 className="font-headline font-extrabold text-2xl text-on-surface mb-6 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <MSymbol icon="work" size={24} />
            </div>
            Monitoreo Activo
          </h2>
          {monitoringJobs.length === 0 ? (
            <div className="p-10 rounded-3xl bg-surface-container-lowest border border-outline-variant/10 text-center text-on-surface-variant">
              No hay trabajos activos en este momento.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {monitoringJobs.map((j) => {
                const clName = j.client?.full_name || "Cliente";
                const prName = j.provider?.full_name;
                const shortId = j.id?.split('-')[0] || "---";
                
                return (
                  <Link 
                    key={j.id} 
                    href={`/trabajos/${j.id}`}
                    className="bg-surface-container-lowest rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between border border-outline-variant/10 shadow-sm hover:border-primary transition-all group gap-4"
                  >
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-black text-outline uppercase bg-surface-container-low px-2 py-0.5 rounded-lg border border-outline-variant/5 shrink-0">#{shortId}</span>
                        <p className="font-bold text-on-surface text-lg group-hover:text-primary transition-colors truncate">{j.title || j.category}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-1">
                        <div className="text-xs text-on-surface-variant font-bold flex items-center gap-1.5">
                          <MSymbol icon="person" size={16} className="text-outline" /> {clName}
                        </div>
                        {prName && (
                          <div className="text-xs text-primary font-black flex items-center gap-1.5">
                            <MSymbol icon="engineering" size={16} filled /> {prName}
                          </div>
                        )}
                        <div className="text-[10px] text-outline font-bold flex items-center gap-1.5">
                          <MSymbol icon="schedule" size={14} /> {new Date(j.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 sm:ml-6 border-t sm:border-t-0 pt-4 sm:pt-0 border-outline-variant/5">
                      <div className="text-right flex flex-col items-end">
                        <Badge className={cn(
                          "rounded-full text-[9px] mb-1 px-3 py-1 font-black uppercase tracking-tighter",
                          j.status === "in_progress" ? "bg-primary text-on-primary" : "bg-secondary-container text-on-secondary-container"
                        )}>
                          {STATUS_LABELS[j.status as JobStatus] || j.status}
                        </Badge>
                        {j.final_amount > 0 && <p className="font-headline font-black text-primary text-xl leading-none mt-1">${j.final_amount.toLocaleString("es-AR")}</p>}
                      </div>
                      
                      {j.status === "in_progress" && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCompleteByAdmin(j.id);
                          }}
                          className="text-[9px] font-black text-primary uppercase border-2 border-primary/20 px-3 py-2 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                        >
                          CERRAR
                        </button>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
