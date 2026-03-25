"use client";

import { useState, useRef, useEffect } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { CATEGORIES } from "@/components/amano/category-chip";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NextImage from "next/image";

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [barrio, setBarrio] = useState("");
  const [address, setAddress] = useState(""); // Nuevo estado para domicilio
  const [barrioDropdownOpen, setBarrioDropdownOpen] = useState(false);
  const [barrioSearch, setBarrioSearch] = useState("");
  const [availability, setAvailability] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);

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

  const canSubmit = selectedCategory && title.trim().length > 5 && description.trim().length > 10 && barrio && address.trim().length > 3;

  const selectedCategoryData = CATEGORIES.find((c) => c.id === selectedCategory);

  const filteredBarrios = BARRIOS_FORMOSA.filter((b) =>
    b.toLowerCase().includes(barrioSearch.toLowerCase())
  );

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

      // 10MB limit
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
        console.error("Upload error:", error);
        toast.error(`Error subiendo ${media.file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("job-media")
        .getPublicUrl(data.path);

      urls.push(publicUrl);
    }

    return urls;
  };

  const handlePublish = async () => {
    if (!canSubmit) return;
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

    // Geocoding manual con fallbacks para obtener coordenadas
    let lat: number | null = null;
    let lng: number | null = null;
    
    const geocode = async (query: string) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
          { headers: { "Accept-Language": "es" } }
        );
        const data = await res.json();
        if (data[0]) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      } catch (e) {
        console.error("Geocoding error:", e);
      }
      return null;
    };

    // 1. Intentar Dirección + Barrio + Formosa
    const geo1 = await geocode(`${address.trim()}, ${barrio}, Formosa, Argentina`);
    if (geo1) {
      lat = geo1.lat;
      lng = geo1.lon;
    } else {
      // 2. Intentar solo Dirección + Formosa
      const geo2 = await geocode(`${address.trim()}, Formosa, Argentina`);
      if (geo2) {
        lat = geo2.lat;
        lng = geo2.lon;
      } else {
        // 3. Intentar solo Barrio + Formosa (Ubicación menos precisa pero útil)
        const geo3 = await geocode(`${barrio}, Formosa, Argentina`);
        if (geo3) {
          lat = geo3.lat;
          lng = geo3.lon;
        }
      }
    }

    const { data: jobData, error } = await supabase
      .from("jobs")
      .insert({
        client_id: user.id,
        category: selectedCategory,
        title,
        description,
        barrio,
        address: address.trim(), // Guardar domicilio
        lat,
        lng,
        availability: availability.trim() || null,
        photos_urls: photosUrls.length > 0 ? photosUrls : null,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      toast.error("Error al publicar el pedido: " + error.message);
      setLoading(false);
    } else {
      // 3. Notificar a prestadores de la categoría
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
          content: `Se publicó un nuevo pedido de ${selectedCategoryData?.label} en ${barrio}: ${title || description}`,
          link: `/trabajos/${jobData.id}`,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      toast.success("¡Pedido publicado exitosamente!");
      router.push("/dashboard");
    }
  };

  return (
    <div className="bg-surface flex flex-col max-w-md md:max-w-3xl lg:max-w-5xl mx-auto shadow-2xl relative pb-0">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-5">
          <Link href="/dashboard" className="text-on-surface-variant">
            <MSymbol icon="close" size={24} />
          </Link>
          <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
            Nuevo Pedido
          </span>
          <div className="w-6" />
        </div>
      </div>

      {/* CTA */}
      <section className="px-5 mb-6">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-5 border border-primary/10">
          <h1 className="font-headline font-extrabold text-2xl md:text-3xl text-on-surface tracking-tight leading-tight">
            Contanos qué necesitás y publicamos tu pedido
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            Completá los datos y recibí ofertas de profesionales verificados.
          </p>
        </div>
      </section>

      {/* Dropdown de Categoría */}
      <section className="px-5 mb-5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
          Categoría de servicio
        </p>
        <div className="relative" ref={categoryRef}>
          <button
            type="button"
            onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
            className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl border transition-all duration-200 text-left ${
              categoryDropdownOpen
                ? "border-primary bg-surface-container-low ring-2 ring-primary/20"
                : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/50"
            }`}
          >
            <div className="flex items-center gap-3">
              {selectedCategoryData ? (
                <>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <MSymbol icon={selectedCategoryData.icon} size={18} className="text-primary" filled />
                  </span>
                  <span className="text-sm font-semibold text-on-surface">
                    {selectedCategoryData.label}
                  </span>
                </>
              ) : (
                <>
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-outline-variant/10">
                    <MSymbol icon="category" size={18} className="text-outline" />
                  </span>
                  <span className="text-sm text-outline">
                    Seleccioná una categoría
                  </span>
                </>
              )}
            </div>
            <MSymbol
              icon={categoryDropdownOpen ? "expand_less" : "expand_more"}
              size={20}
              className="text-outline"
            />
          </button>

          {categoryDropdownOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCategoryDropdownOpen(false);
                  }}
                  className={`flex items-center gap-3 w-full px-4 py-3 text-left transition-all first:rounded-t-xl last:rounded-b-xl ${
                    selectedCategory === cat.id
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-surface-container-high text-on-surface"
                  }`}
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    selectedCategory === cat.id ? "bg-primary/20" : "bg-surface-container-highest"
                  }`}>
                    <MSymbol
                      icon={cat.icon}
                      size={16}
                      filled={selectedCategory === cat.id}
                      className={selectedCategory === cat.id ? "text-primary" : "text-on-surface-variant"}
                    />
                  </span>
                  <span className="text-sm">{cat.label}</span>
                  {selectedCategory === cat.id && (
                    <MSymbol icon="check" size={18} className="ml-auto text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Título */}
      <section className="px-5 mb-5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
          Título del pedido
        </p>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Reparar goteo de canilla"
          className="w-full bg-surface-container-lowest rounded-xl px-4 py-3.5 text-sm text-on-surface placeholder-outline-variant outline-none border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </section>

      {/* Descripción */}
      <section className="px-5 mb-5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
          Descripción de la tarea
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describí el problema (ej: Pierde agua el termotanque desde hace dos días…)"
          className="w-full bg-surface-container-lowest rounded-xl p-4 text-sm text-on-surface placeholder-outline-variant outline-none border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
        />
      </section>

      {/* Adjuntar fotos/videos */}
      <section className="px-5 mb-5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
          Fotos o videos
        </p>

        {mediaFiles.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {mediaFiles.map((media, index) => (
              <div key={index} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-outline-variant/20 group">
                {media.type === "image" ? (
                  <NextImage
                    src={media.preview}
                    alt={`Adjunto ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                    <MSymbol icon="videocam" size={28} className="text-primary" />
                  </div>
                )}
                <button
                  onClick={() => removeMedia(index)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-error text-on-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  style={{ opacity: 1 }}
                >
                  <MSymbol icon="close" size={14} />
                </button>
                {media.type === "video" && (
                  <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">
                    VIDEO
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="media-upload"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={mediaFiles.length >= 5}
          className={`flex items-center justify-center gap-3 w-full py-4 rounded-xl border border-dashed transition-all ${
            mediaFiles.length >= 5
              ? "border-outline-variant/10 text-outline-variant/40 cursor-not-allowed"
              : "border-primary/30 text-primary font-semibold text-sm hover:bg-primary/5 hover:border-primary/50 active:scale-[0.98]"
          }`}
        >
          <MSymbol icon="add_photo_alternate" size={22} />
          {mediaFiles.length >= 5
            ? "Máximo 5 archivos alcanzado"
            : mediaFiles.length > 0
              ? `Agregar más (${mediaFiles.length}/5)`
              : "Agregar fotos o video desde tu dispositivo"
          }
        </button>
        <p className="text-[10px] text-outline mt-1.5 text-center">
          Máx. 5 archivos · 10 MB cada uno · JPG, PNG, MP4
        </p>
      </section>

      {/* Dropdown de Barrio */}
      <section className="px-5 mb-5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
          Barrio
        </p>
        <div className="relative" ref={barrioRef}>
          <div
            onClick={() => setBarrioDropdownOpen(!barrioDropdownOpen)}
            className={`flex items-center w-full rounded-xl border transition-all duration-200 cursor-pointer ${
              barrioDropdownOpen
                ? "border-primary bg-surface-container-low ring-2 ring-primary/20"
                : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant/50"
            }`}
          >
            <div className="pl-4">
              <MSymbol icon="location_on" size={18} className="text-outline" />
            </div>
            <input
              type="text"
              value={barrioDropdownOpen ? barrioSearch : barrio}
              onChange={(e) => {
                setBarrioSearch(e.target.value);
                setBarrio(e.target.value);
                if (!barrioDropdownOpen) setBarrioDropdownOpen(true);
              }}
              onFocus={() => setBarrioDropdownOpen(true)}
              placeholder="Seleccioná o escribí tu barrio..."
              className="flex-1 bg-transparent py-3.5 pl-3 pr-4 text-sm text-on-surface outline-none placeholder-outline"
            />
            <div className="pr-3">
              <MSymbol
                icon={barrioDropdownOpen ? "expand_less" : "expand_more"}
                size={20}
                className="text-outline"
              />
            </div>
          </div>

          {barrioDropdownOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface-container-lowest border border-outline-variant/20 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
              {filteredBarrios.length === 0 ? (
                <div className="px-4 py-3 text-sm text-outline-variant text-center">
                  No se encontraron barrios
                </div>
              ) : (
                filteredBarrios.map((b) => (
                  <button
                    key={b}
                    onClick={() => {
                      setBarrio(b);
                      setBarrioSearch(b);
                      setBarrioDropdownOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-all first:rounded-t-xl last:rounded-b-xl ${
                      barrio === b
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-surface-container-high text-on-surface"
                    }`}
                  >
                    <MSymbol icon="location_on" size={14} className={barrio === b ? "text-primary" : "text-outline-variant"} />
                    {b}
                    {barrio === b && (
                      <MSymbol icon="check" size={16} className="ml-auto text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {/* Domicilio exacto */}
      <section className="px-5 mb-5">
        <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
          Domicilio a realizar el trabajo
        </p>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <MSymbol icon="home" size={18} className="text-outline" />
          </div>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Calle Salta 1234, entre... / Mz 10 Casa 5"
            className="w-full bg-surface-container-lowest rounded-xl pl-11 pr-4 py-3.5 text-sm text-on-surface placeholder-outline-variant outline-none border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
        <p className="text-[10px] text-outline mt-1.5">
          Este dato solo será visible para el prestador una vez que confirmemos tu pago.
        </p>
      </section>

      {/* Disponibilidad horaria */}
      <section className="px-5 mb-12">
        <p className="text-[10px] uppercase font-bold tracking-wider text-on-secondary-container mb-2">
          Disponibilidad horaria para el trabajo
        </p>
        <textarea
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          rows={3}
          placeholder="Ej: Solamente los fines de semana entre las 16 hasta las 18 horas. / Cualquier día entre las 9 y las 17."
          className="w-full bg-surface-container-lowest rounded-xl p-4 text-sm text-on-surface placeholder-outline-variant outline-none border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
        />
        <p className="text-[10px] text-outline mt-1.5">
          Indicá los días y horarios en que preferís que se realice el trabajo.
        </p>
      </section>

      {/* CTA flotante */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-5 pb-6 pt-4 glass-header border-t border-outline-variant/10 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto shadow-ambient bg-surface md:rounded-b-[2rem] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        {!canSubmit && (
          <p className="text-[10px] text-on-surface-variant text-center mb-2 uppercase font-bold tracking-tight">
            {!selectedCategory ? "Seleccioná una categoría" : !title.trim() || title.trim().length <= 5 ? "Escribí un título (mín. 5 carac.)" : !description.trim() || description.trim().length <= 10 ? "Describí el trabajo (mín. 10 carac.)" : "Escribí o seleccioná tu barrio"}
          </p>
        )}
        <button
          disabled={!canSubmit || loading}
          onClick={handlePublish}
          className="flex items-center justify-center w-full py-4 bg-cta-gradient text-on-primary font-headline font-bold text-base rounded-xl shadow-lg shadow-primary/25 uppercase tracking-wider disabled:opacity-40 transition-all hover:opacity-90 active:scale-[0.98]"
        >
          {loading ? "Publicando..." : "Publicar y Recibir Ofertas"}
        </button>
      </div>
    </div>
  );
}
