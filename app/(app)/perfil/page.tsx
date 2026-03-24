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
      
      const { data: profile, error } = await supabase
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
    } catch (error: any) {
      toast.error("Error al subir imagen: " + error.message);
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
    <div className="min-h-screen bg-surface pb-32">
      {/* Header Profile */}
      <div className="bg-cta-gradient pt-12 pb-24 px-5 rounded-b-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 size-40 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 size-40 bg-white rounded-full blur-3xl" />
        </div>

        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="font-headline font-extrabold text-3xl text-on-primary tracking-tight">
              {isOnboarding ? "¡Hola! Empecemos" : "Mi Perfil"}
            </h1>
            <p className="text-on-primary/70 text-sm mt-1">
              {isOnboarding ? "Completá tus datos para continuar" : "Configurá tu identidad digital"}
            </p>
          </div>
          <div className="size-10 rounded-full bg-white/10 flex items-center justify-center">
             <MSymbol icon={isOnboarding ? "celebration" : "person"} size={24} className="text-on-primary" filled />
          </div>
        </div>

        {/* Floating Avatar Card */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[85%] max-w-sm">
          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-xl border border-outline-variant/10 flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
              <Avatar className="size-28 border-4 border-white shadow-inner group-hover:opacity-90 transition-all duration-300">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-4xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
                uploading && "opacity-100"
              )}>
                {uploading ? (
                  <div className="size-6 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                ) : (
                  <MSymbol icon="photo_camera" size={24} className="text-white" />
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
                <div className="absolute -bottom-1 -right-1 bg-primary text-on-primary size-9 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                  <MSymbol icon="add_a_photo" size={16} filled />
                </div>
              )}
            </div>

            <div className="mt-4 text-center">
              <h2 className="font-headline font-bold text-xl text-on-surface">
                {fullName || "Tu Nombre"}
              </h2>
              <div className="flex flex-col items-center gap-1 mt-1">
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
                  Foto opcional
                </span>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="text-xs text-on-surface-variant font-medium">
                    {isProvider ? "Prestador de Servicios" : "Solicitante de Servicios"}
                  </span>
                  <div className="size-1 bg-outline-variant rounded-full mx-1" />
                  <span className="text-xs text-on-surface-variant font-medium">
                    {barrio || "Sin barrio"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20 px-6 flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {isOnboarding && (
          <div className="bg-surface-container-low p-4 rounded-2xl border border-primary/10">
            <p className="text-sm text-on-surface-variant leading-relaxed">
              <span className="font-bold text-primary">A mano</span> necesita estos datos para asegurar la confianza entre vecinos de Formosa.
            </p>
          </div>
        )}

        {/* Section: Basic Info */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <MSymbol icon="assignment_ind" size={18} className="text-primary" />
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface">Datos Obligatorios</h3>
          </div>

          <div className="grid gap-4">
            <div className="group">
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-on-surface-variant/60 ml-1 mb-1.5 block group-focus-within:text-primary transition-colors">
                Nombre y Apellido <span className="text-error">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Ej: Juan Pérez" 
                value={fullName} 
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-4 text-sm text-on-surface placeholder-outline-variant outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm" 
              />
            </div>

            <div className="group">
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-on-surface-variant/60 ml-1 mb-1.5 block group-focus-within:text-primary transition-colors">
                Teléfono WhatsApp <span className="text-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3 border-r border-outline-variant/30">
                  <span className="text-sm font-bold text-on-surface-variant">+54</span>
                </div>
                <input 
                  type="tel" 
                  placeholder="370 4123456" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl pl-16 pr-4 py-4 text-sm text-on-surface placeholder-outline-variant outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm" 
                />
              </div>
            </div>

            <div className="group">
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-on-surface-variant/60 ml-1 mb-1.5 block group-focus-within:text-primary transition-colors">
                Tu Barrio en Formosa <span className="text-error">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <MSymbol icon="location_on" size={18} className="text-primary" />
                </div>
                <input 
                  list="barrios-list"
                  value={barrio} 
                  onChange={e => setBarrio(e.target.value)}
                  placeholder="Escribí o seleccioná tu barrio..."
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl pl-11 pr-4 py-4 text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm"
                />
                <datalist id="barrios-list">
                  {BARRIOS_FORMOSA.map((b) => <option key={b} value={b} />)}
                </datalist>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                  <MSymbol icon="search" size={18} className="text-outline" />
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant/70 mt-1.5 ml-1">
                Si tu barrio no figura, podés escribirlo manualmente.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Mode Toggle */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-primary/20 shadow-lg relative overflow-hidden group transition-all hover:bg-surface-container-low">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-primary/10" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className={cn(
                "size-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                isProvider ? "bg-primary text-on-primary rotate-0" : "bg-surface-container-high text-on-surface-variant -rotate-12"
              )}>
                <MSymbol icon={isProvider ? "handyman" : "person_search"} size={28} filled />
              </div>
              <div>
                <p className="font-headline font-bold text-on-surface text-lg">¿Querés ser Prestador?</p>
                <p className="text-xs text-on-surface-variant mt-0.5">Activá para ofrecer servicios</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsProvider(!isProvider)}
              className={cn(
                "w-16 h-9 rounded-full transition-all relative p-1.5",
                isProvider ? "bg-primary shadow-lg shadow-primary/25" : "bg-surface-container-highest"
              )}
            >
              <div className={cn(
                "size-6 rounded-full bg-white shadow-md transition-all duration-300 transform",
                isProvider ? "translate-x-7" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Categorías integradas en el flujo obligatorio si es prestador */}
          {isProvider && (
            <div className="mt-8 pt-6 border-t border-outline-variant/20 animate-in fade-in slide-in-from-top-4 duration-500">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 ml-1">
                Seleccioná tus especialidades <span className="text-error">*</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {CATEGORIES.map((cat) => (
                  <button 
                    key={cat.id} 
                    type="button" 
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all duration-300 font-bold text-xs border shadow-sm",
                      selectedCategories.includes(cat.id)
                        ? "bg-secondary text-on-secondary border-secondary scale-[1.03] shadow-secondary/20"
                        : "bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:border-secondary/50"
                    )}
                  >
                    <MSymbol 
                      icon={cat.icon} 
                      size={16} 
                      filled={selectedCategories.includes(cat.id)} 
                      className={selectedCategories.includes(cat.id) ? "text-on-secondary" : "text-secondary"}
                    />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section: Optional Info */}
        <div className="space-y-5 opacity-80">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-8 bg-surface-container-high rounded-lg flex items-center justify-center">
              <MSymbol icon="more_horiz" size={18} className="text-on-surface-variant" />
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface">Datos Opcionales</h3>
          </div>

          <div className="grid gap-4">
            <div className="group">
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-on-surface-variant/60 ml-1 mb-1.5 block group-focus-within:text-primary transition-colors">
                DNI <span className="text-[9px] font-normal lowercase">(Uso interno verificado)</span>
              </label>
              <input 
                type="text" 
                placeholder="Número de documento" 
                value={dni} 
                onChange={e => setDni(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-4 text-sm text-on-surface placeholder-outline-variant outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm" 
              />
            </div>

            <div className="group">
              <label className="text-[11px] uppercase font-bold tracking-[0.1em] text-on-surface-variant/60 ml-1 mb-1.5 block group-focus-within:text-primary transition-colors">
                Biografía / Descripción <span className="text-[9px] font-normal lowercase">(Opcional)</span>
              </label>
              <textarea 
                placeholder="Contanos un poco sobre vos o tu experiencia..." 
                value={bio} 
                onChange={e => setBio(e.target.value)}
                rows={3}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl px-4 py-4 text-sm text-on-surface placeholder-outline-variant outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all shadow-sm resize-none" 
              />
            </div>
          </div>
        </div>

        {/* Save Button - Now part of the flow but highly visible */}
        <div className="mt-8 pt-4 pb-12 border-t border-outline-variant/10">
          <button 
            onClick={handleSave} 
            disabled={saving || uploading} 
            className="w-full py-5 bg-cta-gradient text-on-primary font-headline font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 uppercase tracking-[0.15em] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all block"
          >
            {saving ? (
              <div className="flex items-center justify-center gap-3">
                <div className="size-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                {isOnboarding ? "Configurando..." : "Guardando..."}
              </div>
            ) : isOnboarding ? "Empezar a usar A Mano" : "Actualizar Mi Perfil"}
          </button>
          
          {isOnboarding && (
            <p className="text-[10px] text-center text-on-surface-variant/50 mt-4 font-medium uppercase tracking-widest">
              Al confirmar aceptás nuestros términos de uso.
            </p>
          )}
        </div>

        {/* Section: Logout */}
        {!isOnboarding && (
          <div className="pb-12">
            <button 
              onClick={handleLogout}
              className={cn(
                "w-full py-4 flex items-center justify-center gap-3 rounded-2xl transition-all duration-300 font-headline font-bold text-sm uppercase tracking-wider border-2",
                confirmLogout 
                  ? "bg-error text-on-error border-error scale-[1.02] shadow-lg shadow-error/25" 
                  : "bg-surface text-error border-error/20 hover:bg-error/5"
              )}
            >
              <MSymbol icon={confirmLogout ? "check" : "logout"} size={20} filled={confirmLogout} />
              {confirmLogout ? "Confirmar Salida" : "Cerrar Sesión"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
