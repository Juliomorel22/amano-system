"use client";

import { useEffect, useState, use } from "react";
import { MSymbol } from "@/components/amano/m-symbol";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CATEGORIES } from "@/components/amano/category-chip";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  barrio?: string;
  bio?: string;
  rating?: number;
  jobs_count?: number;
  categories?: string[];
  is_provider: boolean;
}

export default function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (profileError || !profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      // Fetch reviews
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviewer_id (
            full_name,
            avatar_url
          )
        `)
        .eq("reviewed_id", id)
        .order("created_at", { ascending: false });

      if (reviewsData) {
        setReviews(reviewsData as any[]);
      }

      setLoading(false);
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col max-w-7xl mx-auto pb-20">
        <div className="h-48 bg-cta-gradient rounded-b-[3rem] shrink-0" />
        <div className="px-5 -mt-16 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-[2.5rem] shadow-xl border border-outline-variant/10 flex flex-col items-center gap-4">
            <Skeleton className="size-32 rounded-full" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 text-center">
        <div className="size-20 bg-error/10 rounded-full flex items-center justify-center mb-6">
          <MSymbol icon="person_off" size={40} className="text-error" filled />
        </div>
        <h1 className="text-2xl font-headline font-black text-on-surface mb-2">Perfil no encontrado</h1>
        <p className="text-on-surface-variant mb-8 max-w-xs">El usuario que buscás no existe o ha sido desactivado.</p>
        <button 
          onClick={() => router.back()}
          className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-bold transition-all active:scale-95"
        >
          Volver atrás
        </button>
      </div>
    );
  }

  const initials = profile.full_name
    ? profile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "AM";

  const profileCategories = CATEGORIES.filter(c => profile.categories?.includes(c.id));

  return (
    <div className="bg-surface min-h-screen pb-20">
      {/* Dynamic Header Background */}
      <div className="bg-cta-gradient pt-12 pb-32 px-5 rounded-b-[3.5rem] relative overflow-hidden">
        <button 
          onClick={() => router.back()}
          className="absolute top-10 left-6 z-30 size-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 text-on-primary active:scale-90 transition-all"
        >
          <MSymbol icon="arrow_back" size={24} />
        </button>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-container/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-5 -mt-24 relative z-20">
        {/* Main Profile Card */}
        <section className="bg-surface-container-lowest p-8 rounded-[3rem] shadow-2xl border border-outline-variant/10 flex flex-col items-center text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative mb-6">
            <Avatar className="size-36 md:size-44 border-4 border-surface shadow-2xl ring-4 ring-primary/5">
              <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="bg-primary/5 text-primary font-black text-5xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            {profile.is_provider && (
              <div className="absolute -bottom-2 -right-2 bg-success text-on-success size-10 rounded-2xl flex items-center justify-center shadow-lg border-2 border-surface rotate-12">
                <MSymbol icon="verified" size={20} filled />
              </div>
            )}
          </div>

          <h1 className="font-headline font-black text-3xl text-on-surface mb-2 tracking-tight">
            {profile.full_name}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-surface-container-high rounded-full text-sm font-bold text-on-surface-variant">
              <MSymbol icon="location_on" size={16} className="text-primary" />
              {profile.barrio || "Formosa"}
            </div>
            {profile.rating && (
              <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500/10 rounded-full text-sm font-black text-amber-700">
                <MSymbol icon="star" size={16} filled />
                {profile.rating.toFixed(1)}
              </div>
            )}
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-primary/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
              {profile.jobs_count || 0} Trabajos
            </div>
          </div>

          {profile.bio && (
            <p className="text-on-surface-variant text-sm md:text-base leading-relaxed max-w-md font-medium">
              "{profile.bio}"
            </p>
          )}
        </section>

        {/* Categories Section */}
        {profileCategories.length > 0 && (
          <section className="mb-10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-6 mb-4">
              Especialidades
            </h2>
            <div className="flex flex-wrap gap-2.5 px-2">
              {profileCategories.map(cat => (
                <div 
                  key={cat.id}
                  className="flex items-center gap-2.5 px-5 py-3 bg-surface-container-low border border-outline-variant/10 rounded-2xl shadow-sm hover:scale-105 transition-transform"
                >
                  <MSymbol icon={cat.icon} size={18} className="text-primary" />
                  <span className="text-xs font-black text-on-surface tracking-tight">{cat.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Reviews Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50">
              Reseñas y Opiniones
            </h2>
            <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase">
              {reviews.length} total
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-surface-container-low border border-dashed border-outline-variant/30 rounded-[2.5rem] p-12 text-center">
              <div className="size-16 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                <MSymbol icon="rate_review" size={32} className="text-outline" />
              </div>
              <p className="text-on-surface-variant font-medium">Este profesional aún no tiene reseñas.</p>
              <p className="text-xs text-on-surface-variant/60 mt-1 italic">¡Sé el primero en calificarlo al terminar un trabajo!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <div 
                  key={review.id} 
                  className="bg-surface-container-lowest p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 border border-outline-variant/10">
                        <AvatarImage src={review.reviewer.avatar_url || ""} />
                        <AvatarFallback className="bg-surface-container-high text-on-surface-variant text-xs font-black">
                          {review.reviewer.full_name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs font-black text-on-surface leading-none mb-1">
                          {review.reviewer.full_name}
                        </p>
                        <p className="text-[10px] text-on-surface-variant/60 font-medium">
                          {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <MSymbol 
                          key={i} 
                          icon="star" 
                          size={14} 
                          filled={i < review.rating} 
                          className={cn(i < review.rating ? "text-amber-500" : "text-outline-variant opacity-20")} 
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-on-surface-variant leading-relaxed font-medium pl-1">
                      "{review.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
