"use client";

import { useEffect, useState, useRef } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CATEGORIES } from "@/components/amano/category-chip";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BARRIOS_FORMOSA } from "@/lib/constants";

export default function PerfilPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Determinar si es un perfil nuevo/incompleto (onboarding)
  const [isOnboarding, setIsOnboarding] = useState(false);

  const [fullName, setFullName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [barrio, setBarrio] = useState("");
  const [bio, setBio] = useState("");
  const [isProvider, setIsProvider] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (profile) {
        setFullName(profile.full_name || "");
        setDni(profile.dni || "");
        setPhone(profile.phone || "");
        setBarrio(profile.barrio || "");
        setBio(profile.bio || "");
        setIsProvider(profile.is_provider || false);
        setSelectedCategories(profile.categories || []);
        setAvatarUrl(profile.avatar_url || "");
        setRating(profile.rating || null);

        // Si faltan datos obligatorios, es modo onboarding
        if (!profile.full_name || !profile.phone || !profile.barrio) {
          setIsOnboarding(true);
        } else {
          // Si el perfil está completo y el usuario entró a /perfil, 
          // lo dejamos estar aquí si quiere editar, 
          // PERO si viene directo del login (sin intención de editar),
          // podríamos redirigirlo. Por ahora, si tiene datos, NO es onboarding.
          setIsOnboarding(false);
        }
      } else {
        setIsOnboarding(true);
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  const toggleCategory = (id: string) =>
    setSelectedCategories((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      return toast.error("Por favor, subí una imagen válida.");
    }
    if (file.size > 2 * 1024 * 1024) {
      return toast.error("La imagen es muy pesada (máx 2MB).");
    }

    setUploading(true);
    const supabase = createClient();
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('job-media')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('job-media')
        .getPublicUrl(filePath);

      // 1. Guardar en la tabla profiles inmediatamente
      await supabase
        .from("profiles")
        .upsert({ id: userId, avatar_url: publicUrl });

      // 2. Guardar en los metadatos de autenticación del usuario
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setAvatarUrl(publicUrl);
      toast.success("Foto de perfil actualizada");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast.error("Error al subir imagen: " + message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    
    // Validaciones estrictas según requerimiento
    if (!fullName.trim()) return toast.error("El Nombre y Apellido es obligatorio.");
    if (!phone.trim()) return toast.error("El Teléfono de WhatsApp es obligatorio.");
    if (!barrio) return toast.error("Debés seleccionar tu barrio.");
    if (isProvider && selectedCategories.length === 0) {
      return toast.error("Si vas a ser Prestador, seleccioná al menos una especialidad.");
    }
    
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName,
      dni,
      phone,
      barrio,
      bio,
      is_provider: isProvider,
      categories: isProvider ? selectedCategories : [],
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isOnboarding ? "¡Bienvenido a A Mano!" : "¡Perfil guardado con éxito!");
      router.push("/dashboard");
    }
    setSaving(false);
  };

  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      toast.info("Presioná de nuevo para cerrar sesión");
      setTimeout(() => setConfirmLogout(false), 3000);
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-on-surface-variant font-medium animate-pulse">Preparando tu espacio...</p>
      </div>
    );
  }

  const initials = fullName 
    ? fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() 
    : "AM";

  return (
    <div className="bg-surface">
      {/* Header Profile - Integrated look with AppHeader */}
      <div className="bg-cta-gradient pt-8 pb-32 px-5 md:px-10 rounded-b-[3rem] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 size-64 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 size-64 bg-white rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto flex justify-between items-end relative z-10">
          <div className="space-y-1">
            <h1 className="font-headline font-extrabold text-3xl md:text-4xl text-on-primary tracking-tight">
              {isOnboarding ? "¡Hola! Empecemos" : "Mi Perfil"}
            </h1>
            <p className="text-on-primary/80 text-sm md:text-base max-w-xs md:max-w-md">
              {isOnboarding ? "Completá tus datos para empezar a usar la plataforma" : "Personalizá tu experiencia y gestioná tus datos"}
            </p>
          </div>
          <div className="size-12 md:size-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner hidden sm:flex">
             <MSymbol icon={isOnboarding ? "celebration" : "person"} size={28} className="text-on-primary" filled />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-4xl mx-auto px-5 md:px-10 -mt-20 relative z-20">
        
        {/* Floating Avatar Card */}
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl border border-outline-variant/10 flex flex-col md:flex-row items-center md:items-end gap-6 mb-10">
          <div className="relative group cursor-pointer shrink-0" onClick={handleAvatarClick}>
            <Avatar className="size-32 md:size-40 border-4 border-surface shadow-xl group-hover:scale-105 transition-all duration-500 ring-4 ring-primary/5">
              <AvatarImage src={avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary font-bold text-5xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]",
              uploading && "opacity-100"
            )}>
              {uploading ? (
                <div className="size-8 border-3 border-white/30 border-t-white animate-spin rounded-full" />
              ) : (
                <MSymbol icon="photo_camera" size={32} className="text-white" />
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
            {!uploading && (
              <div className="absolute -bottom-2 -right-2 bg-primary text-on-primary size-10 rounded-2xl flex items-center justify-center shadow-lg border-2 border-surface rotate-12 group-hover:rotate-0 transition-transform">
                <MSymbol icon="edit" size={20} filled />
              </div>
            )}
          </div>

          <div className="text-center md:text-left flex-1 min-w-0 pb-2">
            <h2 className="font-headline font-extrabold text-2xl md:text-3xl text-on-surface truncate">
              {fullName || "Tu Nombre"}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-y-2 gap-x-3 mt-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                isProvider ? "bg-primary/10 text-primary border-primary/20" : "bg-secondary/10 text-secondary border-secondary/20"
              )}>
                {isProvider ? "Prestador" : "Solicitante"}
              </span>
              <div className="flex items-center gap-1.5 text-sm text-on-surface-variant font-medium">
                <MSymbol icon="location_on" size={16} className="text-primary" />
                {barrio || "Barrio no definido"}
              </div>
              {rating && (
                <div className="flex items-center gap-1 text-sm text-warning font-bold">
                  <MSymbol icon="star" size={16} filled />
                  {rating.toFixed(1)}
                </div>
              )}
            </div>

            {/* Biografía integrada en la cabecera */}
            <div className="mt-4 group">
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 ml-1 mb-1 block">
                Tu biografía o experiencia
              </label>
              <textarea 
                placeholder="Contanos un poco sobre vos..." 
                value={bio} 
                onChange={e => setBio(e.target.value)}
                rows={2}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all resize-none text-on-surface" 
              />
            </div>
          </div>

          <div className="md:self-center">
            <button 
              onClick={handleSave}
              disabled={saving || uploading}
              className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-8 space-y-10">
            {isOnboarding && (
              <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 flex gap-4 items-start">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MSymbol icon="info" size={20} className="text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-primary text-sm mb-1">Información de confianza</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Completar tu perfil ayuda a generar confianza en la comunidad. Tus datos están protegidos y solo se comparten cuando se confirma un trabajo.
                  </p>
                </div>
              </div>
            )}

            {/* Section: Basic Info */}
            <section className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <MSymbol icon="person_outline" size={22} className="text-primary" />
                </div>
                <h3 className="font-headline font-bold text-xl text-on-surface">Datos Personales</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group space-y-2">
                  <label className="text-xs font-bold tracking-wide text-on-surface-variant/80 ml-1">
                    Nombre y Apellido <span className="text-error">*</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ej: Juan Pérez" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" 
                  />
                </div>

                <div className="group space-y-2">
                  <label className="text-xs font-bold tracking-wide text-on-surface-variant/80 ml-1">
                    WhatsApp <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-on-surface-variant/60 text-sm pr-3 border-r border-outline-variant/20">
                      +54
                    </div>
                    <input 
                      type="tel" 
                      placeholder="370 4123456" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl pl-16 pr-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" 
                    />
                  </div>
                </div>

                <div className="group space-y-2">
                  <label className="text-xs font-bold tracking-wide text-on-surface-variant/80 ml-1">
                    Tu Barrio <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <MSymbol icon="location_on" size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-primary" />
                    <input 
                      list="barrios-list"
                      value={barrio} 
                      onChange={e => setBarrio(e.target.value)}
                      placeholder="Seleccioná..."
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl pl-12 pr-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    />
                    <datalist id="barrios-list">
                      {BARRIOS_FORMOSA.map((b) => <option key={b} value={b} />)}
                    </datalist>
                  </div>
                </div>

                <div className="group space-y-2">
                  <label className="text-xs font-bold tracking-wide text-on-surface-variant/80 ml-1">
                    DNI <span className="text-[10px] font-normal opacity-60 ml-1">(Opcional)</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="Número de documento" 
                    value={dni} 
                    onChange={e => setDni(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all" 
                  />
                </div>
              </div>
            </section>

            {/* Section: Mode & Categories */}
            <section className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10 mb-8">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "size-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner",
                    isProvider ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
                  )}>
                    <MSymbol icon={isProvider ? "handyman" : "person_search"} size={28} filled />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-xl text-on-surface">Perfil de Prestador</h3>
                    <p className="text-xs text-on-surface-variant">Activá para ofrecer tus servicios</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsProvider(!isProvider)}
                  className={cn(
                    "w-16 h-9 rounded-full transition-all relative p-1.5 flex items-center shrink-0",
                    isProvider ? "bg-primary shadow-lg shadow-primary/30" : "bg-surface-container-highest"
                  )}
                >
                  <div className={cn(
                    "size-6 rounded-full bg-white shadow-md transition-all duration-500 transform",
                    isProvider ? "translate-x-7" : "translate-x-0"
                  )} />
                </button>
              </div>

              {isProvider && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 relative z-10">
                  <div className="h-px bg-outline-variant/10 w-full" />
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 ml-1">
                      Seleccioná tus rubros <span className="text-error">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {CATEGORIES.map((cat) => (
                        <button 
                          key={cat.id} 
                          type="button" 
                          onClick={() => toggleCategory(cat.id)}
                          className={cn(
                            "flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 font-bold text-xs border",
                            selectedCategories.includes(cat.id)
                              ? "bg-secondary text-on-secondary border-secondary shadow-md shadow-secondary/20 scale-105"
                              : "bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:border-secondary/50"
                          )}
                        >
                          <MSymbol icon={cat.icon} size={16} filled={selectedCategories.includes(cat.id)} />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Actions */}
          <div className="lg:col-span-4 space-y-4">
            <button 
              onClick={handleSave} 
              disabled={saving || uploading} 
              className="w-full py-5 bg-cta-gradient text-on-primary font-headline font-extrabold text-lg rounded-[2rem] shadow-xl shadow-primary/30 uppercase tracking-[0.1em] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all"
            >
              {saving ? "Guardando..." : isOnboarding ? "Empezar ahora" : "Guardar Perfil"}
            </button>

            {!isOnboarding && (
              <button 
                onClick={handleLogout}
                className={cn(
                  "w-full py-4 flex items-center justify-center gap-3 rounded-[2rem] transition-all duration-300 font-headline font-bold text-sm uppercase tracking-wider border-2",
                  confirmLogout 
                    ? "bg-error text-on-error border-error shadow-lg shadow-error/20" 
                    : "bg-transparent text-error border-error/20 hover:bg-error/5"
                )}
              >
                <MSymbol icon={confirmLogout ? "check" : "logout"} size={20} />
                {confirmLogout ? "Confirmar Salida" : "Cerrar Sesión"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
