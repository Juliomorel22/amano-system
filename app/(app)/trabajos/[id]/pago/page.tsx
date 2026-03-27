"use client";

import { useEffect, useState, use } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmarPagoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offer");

  const [copied, setCopied] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [job, setJob] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      if (!offerId) return router.push(`/trabajos/${id}`);
      const supabase = createClient();
      const { data: jobData } = await supabase.from("jobs").select("*").eq("id", id).single();
      const { data: offerData } = await supabase.from("offers").select("*, provider:profiles(full_name)").eq("id", offerId).single();
      
      setJob(jobData);
      setOffer(offerData);
      setLoading(false);
    }
    loadData();
  }, [id, offerId, router]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText("AMANO.FORMOSA");
    setCopied(true);
    toast.success("Alias copiado al portapapeles");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async () => {
    if (!proofFile) return;
    setSubmitting(true);
    const supabase = createClient();

    try {
      // 1. Upload file to Supabase Storage
      const ext = proofFile.name.split(".").pop() || "jpg";
      const fileName = `${id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("job-media")
        .upload(fileName, proofFile, {
          contentType: proofFile.type,
          cacheControl: "3600",
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("job-media")
        .getPublicUrl(uploadData.path);

      // 2. Insertar pago
      await supabase.from("payments").insert({
        job_id: id,
        proof_url: publicUrl,
      });

      // Notificar al admin sobre el nuevo pago
      const { data: adminUser } = await supabase.from("profiles").select("id").eq("email", "administrator@amano.com").single();
      if (adminUser) {
        await supabase.from("notifications").insert({
          user_id: adminUser.id,
          type: "payment_uploaded",
          title: "Nuevo pago por validar",
          content: `El cliente subió un comprobante para el trabajo: ${job?.title || job?.description || id}`,
          link: `/admin`,
        });
      }

      // 3. Actualizar oferta
      await supabase.from("offers").update({ status: "accepted" }).eq("id", offerId);
      
      // 4. Actualizar job con el estado de revisión y el monto final (Asignamos provider_id para visibilidad)
      await supabase.from("jobs").update({ 
        status: "payment_under_review", 
        final_amount: offer?.amount,
        provider_id: offer?.provider_id
      }).eq("id", id);

      // 5. NOTIFICAR AL PROVEEDOR que su oferta fue pre-seleccionada
      if (offer?.provider_id) {
        await supabase.from("notifications").insert({
          user_id: offer.provider_id,
          type: "offer_selected",
          title: "¡Oferta seleccionada!",
          content: `El cliente seleccionó tu oferta para: ${job?.title || job?.description || "un trabajo"}. El pago está siendo revisado por Amano.`,
          link: `/trabajos/${id}`,
        });
      }
      
      toast.success("Comprobante enviado. En breve lo validaremos.");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error submitting proof:", error);
      toast.error("Error al subir el comprobante: " + (error.message || "Intentalo nuevamente."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !job || !offer) return <div className="min-h-screen bg-surface flex items-center justify-center">Cargando...</div>;

  return (
    <div className="bg-surface flex flex-col max-w-md md:max-w-3xl lg:max-w-full mx-auto lg:shadow-none shadow-2xl relative">
      <div className="flex items-center gap-3 px-5 pt-6 bg-surface-container-low text-on-surface">
        <button onClick={() => history.back()}><MSymbol icon="arrow_back" size={24} /></button>
        <span className="font-headline font-bold text-lg">Confirmar Pago</span>
      </div>

      {/* Resumen */}
      <section className="px-5 pt-6 pb-8 text-center bg-surface-container-low">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-container-highest mb-4">
          <MSymbol icon="water_drop" size={30} className="text-primary" filled />
        </div>
        <p className="text-on-secondary-container text-[10px] font-bold uppercase tracking-widest mb-1">
          {job.category}
        </p>
        <p className="font-headline text-2xl font-extrabold text-on-surface mb-1">
          {offer.provider?.full_name || "Prestador"}
        </p>
        <p className="font-headline text-5xl font-extrabold text-primary tracking-tighter">
          ${offer.amount.toLocaleString("es-AR")}
        </p>
        <p className="text-on-surface-variant text-sm mt-1">Monto acordado</p>
      </section>

      {/* Instrucciones */}
      <section className="mx-5 my-4 bg-surface-container-low rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MSymbol icon="account_balance" size={20} className="text-primary" />
          <h2 className="font-headline font-bold text-base text-on-surface">Instrucciones de Pago</h2>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10 flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container">
              Alias de transferencia
            </p>
            <p className="font-headline font-extrabold text-xl text-on-surface mt-0.5">AMANO.FORMOSA</p>
          </div>
          <button
            onClick={handleCopy}
            className="bg-surface-container-high rounded-lg p-3 text-primary hover:bg-surface-container transition-all"
          >
            <MSymbol icon={copied ? "check" : "content_copy"} size={20} />
          </button>
        </div>
        <ol className="space-y-2 text-sm text-on-surface-variant">
          <li className="flex gap-2"><span className="font-bold text-primary">1.</span>Abrí tu app bancaria y realizá la transferencia.</li>
          <li className="flex gap-2"><span className="font-bold text-primary">2.</span>Descargá el comprobante y subilo abajo.</li>
          <li className="flex gap-2"><span className="font-bold text-primary">3.</span>El admin validará el pago en menos de 2 horas.</li>
        </ol>
      </section>

      {/* Upload */}
      <section className="mx-5 mb-4">
        <label
          className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-outline-variant/20 cursor-pointer hover:bg-surface-container-low transition-all text-center"
          htmlFor="proof-upload"
        >
          {proofFile ? (
            <>
              <MSymbol icon="check_circle" size={32} className="text-primary" filled />
              <p className="font-semibold text-primary text-sm">{proofFile.name}</p>
              <p className="text-on-surface-variant text-xs">Toca para cambiar</p>
            </>
          ) : (
            <>
              <MSymbol icon="upload_file" size={32} className="text-outline" />
              <p className="font-semibold text-on-surface text-sm">Subir comprobante</p>
              <p className="text-on-surface-variant text-xs">JPG, PNG o PDF · Máx. 5MB</p>
            </>
          )}
        </label>
        <input id="proof-upload" type="file" accept="image/*,.pdf" className="hidden"
          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
      </section>

      {/* Trust */}
      <section className="mx-5">
        <div className="bg-surface-container-low rounded-lg p-4 flex items-start gap-3">
          <MSymbol icon="verified_user" size={20} className="text-primary flex-shrink-0 mt-0.5" filled />
          <p className="text-sm text-on-surface-variant leading-relaxed">
            <span className="font-semibold text-on-surface">Tu dinero está seguro.</span>{" "}
            Lo retenemos hasta que confirmés la finalización del trabajo.
          </p>
        </div>
      </section>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-6 pt-4 glass-header border-t border-outline-variant/10 max-w-md md:max-w-3xl lg:max-w-full mx-auto bg-surface md:rounded-b-[2rem] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <button
          disabled={!proofFile || submitting}
          onClick={handleSubmit}
          className="flex items-center justify-center w-full py-4 bg-cta-gradient text-on-primary font-headline font-bold text-base rounded-xl shadow-lg shadow-primary/25 uppercase tracking-wider disabled:opacity-40 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <MSymbol icon="send" size={20} className="mr-2" />
          {submitting ? "Procesando..." : "Confirmar Envío"}
        </button>
      </div>
    </div>
  );
}
