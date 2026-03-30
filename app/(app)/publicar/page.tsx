"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { CATEGORIES } from "@/components/amano/category-chip";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import dynamic from 'next/dynamic';

const MapaAproximado = dynamic(
  () => import('@/components/amano/mapa-aproximado'),
  {
    ssr: false,
    loading: () => <div className="h-[220px] rounded-2xl bg-surface-container-low animate-pulse" />
  }
)

const BARRIOS_FORMOSA = [
  "12 de Octubre", "16 de Julio", "17 de Octubre", "2 de Abril",
  "7 de Mayo", "8 de Marzo", "Altos de Caacupé", "Antenor Gauna",
  "Arturo Illia", "Barrio Militar", "Barrio Municipal", "Barrio Piero",
  "Barrio Vial", "Belgrano", "Caracolito", "Collucio",
  "Divino Niño Jesús", "Don Bosco", "Dr. Ricardo Balbín", "El Mistol",
  "El Palomar", "El Resguardo", "Emilio Tomas", "Eva Perón",
  "Facundo Quiroga", "Federación", "Guadalupe", "Hipólito Irigoyen",
  "Independencia", "Islas Malvinas", "J.F. Kennedy", "Juan D. Perón",
  "Juan M. de Rosas", "La Floresta", "La Nueva Formosa", "La Paz",
  "La Santa Rosa", "La Virgen Niña", "Las Delicias", "La Estrella",
  "Libertad", "Liborsi", "Los Lapachos", "Manuel Belgrano",
  "Mariano Moreno", "Namqom", "Nuestra Señora de Luján", "Obrero",
  "Parque Industrial", "Pellegrini", "Pompeya", "Pte. Illia",
  "República Argentina", "Roberto Sotelo", "Sagrado Corazón de María", "San Agustín",
  "San Andrés", "San Cayetano", "San Francisco", "San Isidro",
  "San Isidro Labrador", "San José Obrero", "San Juan Bautista", "San Martín",
  "San Miguel", "San Pedro", "San Pío X", "Santa Lucía",
  "Tiro Federal", "Venezuela", "Villa Hermosa", "Villa La Pilar",
  "Villa Lourdes", "Villa del Parque", "Virgen de Itatí II"
];

const DAYS_OF_WEEK = [
  { id: "lun", label: "Lunes" },
  { id: "mar", label: "Martes" },
  { id: "mie", label: "Miércoles" },
  { id: "jue", label: "Jueves" },
  { id: "vie", label: "Viernes" },
  { id: "sab", label: "Sábado" },
  { id: "dom", label: "Domingo" },
];

interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
}

export default function PublicarPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const barrioRef = useRef<HTMLDivElement>(null);
  
  // Navigation State
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [barrio, setBarrio] = useState("");
  const [address, setAddress] = useState("");
  const [barrioDropdownOpen, setBarrioDropdownOpen] = useState(false);
  const [barrioSearch, setBarrioSearch] = useState("");
  
  // Schedule State
  const [scheduleMode, setScheduleMode] = useState<"specific" | "flexible">("flexible");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [flexibleDays, setFlexibleDays] = useState<string[]>([]);
  const [flexibleTimeSlot, setFlexibleTimeSlot] = useState<"mañana" | "tarde" | "todo-el-dia" | null>(null);

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (barrioRef.current && !barrioRef.current.contains(e.target as Node)) {
        setBarrioDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Geocoding & Suggestions effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      // Coordenadas constantes para Formosa Capital (West, North, East, South)
      const VIEWBOX = '-58.25,-26.10,-58.10,-26.25';
      
      if (address.trim().length > 2) {
        // Búsqueda de calles con RESTRICCIÓN ESTRICTA
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${address}, Formosa, Argentina`)}&format=json&limit=5&viewbox=${VIEWBOX}&bounded=1&addressdetails=1`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          const results = data.map((item: any) => {
            const road = item.address.road || item.address.pedestrian || item.address.path || item.display_name.split(',')[0];
            const houseNumber = item.address.house_number || "";
            // Combinamos calle y altura para el nombre corto
            const shortName = houseNumber ? `${road} ${houseNumber}` : road;
            
            return {
              name: item.display_name,
              shortName: shortName,
              subText: item.display_name.split(',').slice(1, 3).join(','),
              center: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) }
            };
          });
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
          
          // Si encontramos un resultado muy exacto, actualizamos el mapa automáticamente
          if (results.length > 0 && !coords) {
             setCoords(results[0].center);
          }
        } catch (e) {
          console.error("Geocoding error:", e);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        
        // Si no hay dirección pero hay barrio, mostramos el mapa del barrio
        if (barrio) {
          const query = `${barrio}, Ciudad de Formosa, Argentina`;
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&viewbox=${VIEWBOX}&bounded=1`;
          try {
            const res = await fetch(url);
            const data = await res.json();
            if (data[0]) {
              setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
            }
          } catch (e) {}
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [address, barrio]);

  const handleSelectSuggestion = (result: any) => {
    // Si el usuario escribió un número (altura) pero el resultado no lo tiene, lo preservamos
    const userNumber = address.match(/\d+/)?.[0];
    const hasNumber = /\d+/.test(result.shortName);
    
    const finalAddress = !hasNumber && userNumber 
      ? `${result.shortName} ${userNumber}` 
      : result.shortName;

    setAddress(finalAddress);
    setCoords(result.center);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const selectedCategoryData = CATEGORIES.find((c) => c.id === selectedCategory);
  const filteredBarrios = BARRIOS_FORMOSA.filter((b) =>
    b.toLowerCase().includes(barrioSearch.toLowerCase())
  );

  const toggleDay = (dayId: string) => {
    setFlexibleDays(prev => 
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  // Validation per step
  const canGoNext = () => {
    if (step === 1) {
      return selectedCategory && title.trim().length >= 5 && description.trim().length >= 10;
    }
    if (step === 2) {
      return true; // Media is optional
    }
    if (step === 3) {
      const locationValid = barrio && address.trim().length >= 3;
      if (!locationValid) return false;
      
      if (scheduleMode === "specific") {
        return !!(scheduledDate && scheduledTime);
      } else {
        return flexibleDays.length > 0 && !!flexibleTimeSlot;
      }
    }
    return false;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newMedia: MediaFile[] = [];
    Array.from(files).forEach((file) => {
      if (mediaFiles.length + newMedia.length >= 5) return;
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) {
        toast.error(`Archivo no soportado: ${file.name}`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`El archivo ${file.name} supera los 10MB`);
        return;
      }
      newMedia.push({
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? "video" : "image",
      });
    });
    setMediaFiles((prev) => [...prev, ...newMedia].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadMedia = async (supabase: ReturnType<typeof createClient>, userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const media of mediaFiles) {
      const ext = media.file.name.split(".").pop() || "jpg";
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("job-media")
        .upload(fileName, media.file, {
          contentType: media.file.type,
          cacheControl: "3600",
        });
      if (error) {
        toast.error(`Error subiendo ${media.file.name}`);
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from("job-media").getPublicUrl(data.path);
      urls.push(publicUrl);
    }
    return urls;
  };

  const handlePublish = async () => {
    if (!canGoNext()) return;
    setLoading(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Debes iniciar sesión para publicar");
      router.push("/login");
      return;
    }

    let photosUrls: string[] = [];
    if (mediaFiles.length > 0) {
      photosUrls = await uploadMedia(supabase, user.id);
    }

    // Use existing coords or geocode one last time if missing
    let lat = coords?.lat || null;
    let lng = coords?.lng || null;
    
    if (!lat || !lng) {
      const geocode = async (query: string) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
          const data = await res.json();
          if (data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        } catch (e) {}
        return null;
      };

      // Try full address first
      let geo = await geocode(`${address.trim()}, ${barrio}, Formosa, Argentina`);
      
      // Fallback to just Barrio if full address fails
      if (!geo) {
        geo = await geocode(`${barrio}, Formosa, Argentina`);
      }

      if (geo) { lat = geo.lat; lng = geo.lon; }
    }

    let availability = "";
    if (scheduleMode === "specific") {
      availability = `Programado para: ${scheduledDate} a las ${scheduledTime}`;
    } else {
      const daysText = flexibleDays.map(id => DAYS_OF_WEEK.find(d => d.id === id)?.label).join(", ");
      const timeText = flexibleTimeSlot === "todo-el-dia" ? "Todo el día" : flexibleTimeSlot === "mañana" ? "Por la mañana" : "Por la tarde";
      availability = `Flexible: ${daysText} (${timeText})`;
    }

    const { data: jobData, error } = await supabase
      .from("jobs")
      .insert({
        client_id: user.id,
        category: selectedCategory,
        title,
        description,
        barrio,
        address: address.trim(),
        lat,
        lng,
        availability,
        photos_urls: photosUrls.length > 0 ? photosUrls : null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al publicar el pedido: " + error.message);
      setLoading(false);
    } else {
      const { data: matchingProviders } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_provider", true)
        .contains("categories", [selectedCategory]);

      if (matchingProviders && matchingProviders.length > 0) {
        const notifications = matchingProviders.map(p => ({
          user_id: p.id,
          type: "new_job_available",
          title: "¡Nuevo trabajo disponible!",
          content: `Se publicó un nuevo pedido de ${selectedCategoryData?.label} en ${barrio}: ${title}`,
          link: `/trabajos/${jobData.id}`,
        }));
        await supabase.from("notifications").insert(notifications);
      }
      toast.success("¡Pedido publicado exitosamente!");
      router.push("/dashboard");
    }
  };

  const nextStep = () => {
    if (canGoNext()) setStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  return (
    <div className="bg-surface flex flex-col max-w-md md:max-w-3xl lg:max-w-full mx-auto relative min-h-screen pb-40">
      {/* Header & Progress Indicator */}
      <div className="px-5 pt-5 pb-2 sticky top-0 bg-surface z-50">
        <div className="flex items-center justify-between mb-4">
          <button onClick={step === 1 ? () => router.push("/dashboard") : prevStep} className="text-on-surface-variant p-1">
            <MSymbol icon={step === 1 ? "close" : "arrow_back"} size={24} />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">
              Paso {step} de {totalSteps}
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step ? "w-8 bg-primary" : s < step ? "w-4 bg-primary/40" : "w-4 bg-outline-variant/30"
                  }`} 
                />
              ))}
            </div>
          </div>
          <div className="w-8" />
        </div>
      </div>

      {/* Step Contents */}
      <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
        
        {step === 1 && (
          <div className="space-y-6 px-5 py-4">
            <section>
              <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight leading-tight mb-2">
                ¿Qué necesitás solucionar?
              </h1>
              <p className="text-on-surface-variant text-sm">
                Comencemos por lo básico: describí el problema y elegí la categoría.
              </p>
            </section>

            {/* Categoría */}
            <section>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
                Categoría de servicio
              </p>
              <div className="relative" ref={categoryRef}>
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl border transition-all duration-200 text-left ${
                    categoryDropdownOpen ? "border-primary bg-surface-container-low ring-2 ring-primary/20" : "border-outline-variant/30 bg-surface-container-lowest shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {selectedCategoryData ? (
                      <>
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          <MSymbol icon={selectedCategoryData.icon} size={18} className="text-primary" filled />
                        </span>
                        <span className="text-sm font-semibold text-on-surface">{selectedCategoryData.label}</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-outline-variant/10">
                          <MSymbol icon="category" size={18} className="text-outline" />
                        </span>
                        <span className="text-sm text-outline">Seleccioná una categoría</span>
                      </>
                    )}
                  </div>
                  <MSymbol icon={categoryDropdownOpen ? "expand_less" : "expand_more"} size={20} className="text-outline" />
                </button>
                {categoryDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategory(cat.id); setCategoryDropdownOpen(false); }}
                        className={`flex items-center gap-3 w-full px-4 py-3 text-left ${selectedCategory === cat.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-surface-container-high text-on-surface"}`}
                      >
                        <MSymbol icon={cat.icon} size={16} filled={selectedCategory === cat.id} className={selectedCategory === cat.id ? "text-primary" : "text-on-surface-variant"} />
                        <span className="text-sm">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Título */}
            <section>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
                Título del pedido
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Reparar goteo de canilla"
                className="w-full bg-surface-container-lowest rounded-xl px-4 py-3.5 text-sm outline-none border border-outline-variant/30 focus:border-primary transition-all shadow-sm"
              />
            </section>

            {/* Descripción */}
            <section>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
                Descripción detallada
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Describí el problema con el mayor detalle posible..."
                className="w-full bg-surface-container-lowest rounded-xl p-4 text-sm outline-none border border-outline-variant/30 focus:border-primary transition-all resize-none shadow-sm"
              />
            </section>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 px-5 py-4">
            <section>
              <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight leading-tight mb-2">
                Sumá fotos o videos
              </h1>
              <p className="text-on-surface-variant text-sm">
                Una imagen ayuda a los prestadores a entender mejor el trabajo (opcional).
              </p>
            </section>

            <section className="flex flex-col items-center">
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                  {mediaFiles.map((media, index) => (
                    <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/20 group shadow-md">
                      {media.type === "image" ? (
                        <NextImage src={media.preview} alt="Preview" fill unoptimized className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                          <MSymbol icon="videocam" size={40} className="text-primary" />
                        </div>
                      )}
                      <button
                        onClick={() => removeMedia(index)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-error text-on-primary flex items-center justify-center shadow-lg"
                      >
                        <MSymbol icon="close" size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" id="media-upload" />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={mediaFiles.length >= 5}
                className="flex flex-col items-center justify-center gap-3 w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-all active:scale-[0.99]"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MSymbol icon="add_a_photo" size={28} />
                </div>
                <span className="font-semibold text-sm">Subir contenido</span>
                <span className="text-[10px] text-outline tracking-wider uppercase">Máximo 5 archivos</span>
              </button>
            </section>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 px-5 py-4">
            <section>
              <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight leading-tight mb-2">
                Ubicación y Disponibilidad
              </h1>
              <p className="text-on-surface-variant text-sm">
                ¿Dónde y en qué momento podrías recibir al profesional?
              </p>
            </section>

            {/* Barrio */}
            <section>
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">Barrio</p>
              <div className="relative" ref={barrioRef}>
                <div className="flex items-center w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden shadow-sm">
                  <div className="pl-4"><MSymbol icon="location_on" size={18} className="text-outline" /></div>
                  <input
                    type="text"
                    value={barrioDropdownOpen ? barrioSearch : barrio}
                    onChange={(e) => { setBarrioSearch(e.target.value); setBarrio(e.target.value); if (!barrioDropdownOpen) setBarrioDropdownOpen(true); }}
                    onFocus={() => setBarrioDropdownOpen(true)}
                    placeholder="Escribí tu barrio..."
                    className="flex-1 py-3.5 pl-3 pr-4 text-sm outline-none"
                  />
                </div>
                {barrioDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredBarrios.map((b) => (
                      <button key={b} onClick={() => { setBarrio(b); setBarrioSearch(b); setBarrioDropdownOpen(false); }} className={`w-full px-4 py-3 text-left text-sm ${barrio === b ? "bg-primary/10 text-primary font-semibold" : "hover:bg-surface-container-high"}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Domicilio */}
            <section className="relative">
              <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">Domicilio exacto</p>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2"><MSymbol icon="home" size={18} className="text-outline" /></div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (e.target.value.length > 2) setShowSuggestions(true);
                  }}
                  placeholder="Calle y número / Manzana y Casa"
                  className="w-full bg-surface-container-lowest rounded-xl pl-11 pr-4 py-3.5 text-sm border border-outline-variant/30 outline-none focus:border-primary transition-all shadow-sm"
                  onFocus={() => address.length > 2 && suggestions.length > 0 && setShowSuggestions(true)}
                />
              </div>

              {/* Sugerencias de Nominatim */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-outline-variant/20 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {suggestions.map((result, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectSuggestion(result)}
                      className="w-full px-5 py-4 text-left hover:bg-primary/5 transition-colors border-b border-outline-variant/10 last:border-0 flex items-start gap-3"
                    >
                      <MSymbol icon="location_on" size={18} className="text-primary/40 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-on-surface leading-tight">
                          {result.shortName}
                        </span>
                        <span className="text-[11px] text-on-surface-variant/70 truncate">
                          {result.subText}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Vista previa del mapa */}
            {coords && (
              <div className="mt-2 animate-in fade-in zoom-in-95 duration-500">
                <p className="text-[10px] uppercase font-bold text-outline-variant mb-2 ml-1">Vista previa de ubicación</p>
                <MapaAproximado lat={coords.lat} lng={coords.lng} exact={true} />
              </div>
            )}

            {/* Disponibilidad (Nuevo Formato Flexible) */}
            <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
              <div className="flex border-b border-outline-variant/20">
                <button
                  onClick={() => setScheduleMode("specific")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${scheduleMode === "specific" ? "bg-primary text-on-primary" : "text-outline hover:bg-surface-container-low"}`}
                >
                  Fecha Exacta
                </button>
                <button
                  onClick={() => setScheduleMode("flexible")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${scheduleMode === "flexible" ? "bg-primary text-on-primary" : "text-outline hover:bg-surface-container-low"}`}
                >
                  Horario Flexible
                </button>
              </div>

              <div className="p-5">
                {scheduleMode === "specific" ? (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-outline-variant mb-2">Fecha</p>
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full bg-surface-container-low rounded-xl px-3 py-3 text-sm outline-none border border-outline-variant/10 focus:border-primary"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-outline-variant mb-2">Hora</p>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full bg-surface-container-low rounded-xl px-3 py-3 text-sm outline-none border border-outline-variant/10 focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-300 space-y-5">
                    {/* Checklist de Días */}
                    <div>
                      <p className="text-[10px] uppercase font-bold text-outline-variant mb-3">¿Qué días podrías?</p>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <button
                            key={day.id}
                            onClick={() => toggleDay(day.id)}
                            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${
                              flexibleDays.includes(day.id)
                                ? "bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/20"
                                : "bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Franja Horaria */}
                    <div>
                      <p className="text-[10px] uppercase font-bold text-outline-variant mb-3">¿En qué momento?</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "mañana", label: "Mañana", icon: "wb_sunny" },
                          { id: "tarde", label: "Tarde", icon: "dark_mode" },
                          { id: "todo-el-dia", label: "Todo el día", icon: "schedule" },
                        ].map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setFlexibleTimeSlot(slot.id as any)}
                            className={`flex flex-col items-center justify-center py-3 rounded-xl gap-1.5 transition-all border ${
                              flexibleTimeSlot === slot.id
                                ? "bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/20"
                                : "bg-surface-container-low border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
                            }`}
                          >
                            <MSymbol icon={slot.icon} size={18} filled={flexibleTimeSlot === slot.id} />
                            <span className="text-[10px] font-bold uppercase">{slot.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
            
            <p className="bg-secondary-container/20 text-on-secondary-container text-[11px] p-4 rounded-xl leading-relaxed border border-primary/5">
              <span className="font-bold flex items-center gap-1.5 mb-1">
                <MSymbol icon="info" size={14} /> Importante
              </span>
              Tu domicilio exacto solo se mostrará al profesional una vez que confirmes el pago del servicio.
            </p>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-8 pt-4 bg-surface/90 backdrop-blur-md border-t border-outline-variant/10 max-w-md md:max-w-3xl lg:max-w-full mx-auto">
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 bg-surface-container-high text-on-surface font-headline font-bold text-sm rounded-xl uppercase tracking-wider active:scale-[0.98] transition-all"
            >
              Volver
            </button>
          )}
          <button
            disabled={!canGoNext() || loading}
            onClick={step === totalSteps ? handlePublish : nextStep}
            className={`py-4 bg-cta-gradient text-on-primary font-headline font-bold text-sm rounded-xl shadow-lg shadow-primary/25 uppercase tracking-wider disabled:opacity-40 transition-all active:scale-[0.98] ${step > 1 ? "flex-[2]" : "w-full"}`}
          >
            {loading ? "Publicando..." : step === totalSteps ? "Publicar Pedido" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
