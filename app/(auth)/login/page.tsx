"use client";

import { useState } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Completá todos los campos");
    if (isRegister && (!fullName || !phone)) return toast.error("Completá nombre y teléfono");
    
    setLoading(true);
    const supabase = createClient();

    const loginEmail = email.toLowerCase() === 'administrator' 
      ? 'administrator@amano.com' 
      : email.toLowerCase() === 'proveedor'
      ? 'proveedor@amano.com'
      : email;

    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: loginEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        if (!data.session) {
          toast.success("¡Cuenta creada! Por favor, verificá tu correo.");
        } else {
          toast.success("¡Cuenta creada con éxito!");
          router.push("/perfil");
        }
      }
    } else {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        toast.error("Credenciales inválidas o cuenta no existe.");
      } else {
        toast.success("Sesión iniciada");
        
        // Check if profile is complete
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, barrio")
          .eq("id", user?.id)
          .single();

        if (profile?.full_name && profile?.phone && profile?.barrio) {
          router.push("/dashboard");
        } else {
          router.push("/perfil");
        }
      }
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-md md:max-w-3xl lg:max-w-5xl mx-auto shadow-2xl">
      {/* Hero */}
      <div className="flex-1 bg-cta-gradient flex flex-col items-center justify-center px-8 pt-16 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 size-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 size-40 bg-white rounded-full blur-3xl" />
        </div>
        <div className="text-center mb-8 relative z-10">
          <p className="text-on-primary/70 text-xs font-semibold uppercase tracking-[0.2em] mb-3">
            Formosa, Argentina
          </p>
          <h1 className="font-headline font-extrabold text-5xl text-on-primary tracking-tight leading-none mb-4">
            amano
          </h1>
          <p className="text-on-primary/80 text-base leading-relaxed max-w-xs mx-auto">
            Conectamos vecinos con profesionales de servicios del hogar.
          </p>
        </div>
        <div className="flex gap-8 relative z-10">
          {[
            { value: "11", label: "Categorías" },
            { value: "90%", label: "Al Prestador" },
            { value: "2h", label: "Respuesta Máx." },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-headline font-extrabold text-2xl text-on-primary">{s.value}</p>
              <p className="text-on-primary/60 text-[10px] uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleAuth} className="bg-surface rounded-t-[2rem] px-6 pt-8 pb-10 -mt-6 shadow-ambient relative z-20">
        <h2 className="font-headline font-extrabold text-2xl text-on-surface mb-1">
          {isRegister ? "Crear cuenta" : "Iniciar sesión"}
        </h2>
        <p className="text-on-surface-variant text-sm mb-6">
          {isRegister ? "Registrate gratis y empezá." : "Bienvenido de vuelta."}
        </p>

        <div className="flex flex-col gap-4 mb-6">
          {isRegister && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder="Nombre y Apellido"
                disabled={loading}
                className="w-full bg-surface-container-lowest rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder-outline-variant border border-outline-variant/10 outline-none focus:bg-surface-container-high focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp (ej: 3704123456)"
                disabled={loading}
                className="w-full bg-surface-container-lowest rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder-outline-variant border border-outline-variant/10 outline-none focus:bg-surface-container-high focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
            </div>
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@email.com o usuario"
            disabled={loading}
            className="w-full bg-surface-container-lowest rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder-outline-variant border border-outline-variant/10 outline-none focus:bg-surface-container-high focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            disabled={loading}
            className="w-full bg-surface-container-lowest rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder-outline-variant border border-outline-variant/10 outline-none focus:bg-surface-container-high focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50" />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-cta-gradient text-on-primary font-headline font-bold text-base rounded-2xl shadow-lg shadow-primary/25 uppercase tracking-[0.1em] mb-4 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="size-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
              Cargando...
            </div>
          ) : (isRegister ? "Crear Cuenta" : "Entrar")}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-outline-variant/30" />
          <span className="text-[10px] uppercase tracking-widest text-outline-variant font-bold">o continuá con</span>
          <div className="flex-1 h-px bg-outline-variant/30" />
        </div>

        <button 
          type="button"
          onClick={handleGoogleAuth}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-outline-variant/20 text-on-surface font-bold text-sm hover:bg-surface-container-low transition-all mb-6">
          <MSymbol icon="account_circle" size={20} className="text-primary" />
          Google
        </button>

        <p className="text-center text-sm text-on-surface-variant">
          {isRegister ? "¿Ya tenés cuenta?" : "¿No tenés cuenta?"}{" "}
          <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-primary font-bold hover:underline">
            {isRegister ? "Iniciá sesión" : "Registrate gratis"}
          </button>
        </p>
      </form>
    </div>
  );
}

