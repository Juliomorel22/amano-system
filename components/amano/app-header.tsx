"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MSymbol } from "@/components/amano/m-symbol";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  showBack?: boolean;
  title?: string;
  rightContent?: React.ReactNode;
}

export function AppHeader({ showBack = false, title, rightContent }: AppHeaderProps) {
  const { unreadCount } = useNotifications();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("AM");
  const { isComplete, loading: profileLoading } = useProfile();

  useEffect(() => {
    async function getProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, full_name")
          .eq("id", user.id)
          .single();
        
        if (profile) {
          setAvatarUrl(profile.avatar_url);
          if (profile.full_name) {
            const parts = profile.full_name.split(" ");
            setInitials(parts.map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());
          }
        }
      }
    }
    getProfile();
  }, []);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (!profileLoading && !isComplete && href !== "/perfil") {
      e.preventDefault();
      toast.error("Para explorar todas las funciones debés completar tus datos primero", {
        className: "bg-error text-on-error border-none",
        duration: 4000
      });
      return;
    }
  };

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-outline-variant/10 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 h-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-1">
          {showBack ? (
            <button 
              onClick={() => history.back()} 
              className="text-on-surface hover:bg-surface-container-high active:scale-90 p-3 rounded-full transition-all"
              aria-label="Volver"
            >
              <MSymbol icon="arrow_back" size={24} />
            </button>
          ) : (
            <button 
              className="text-on-surface-variant hover:bg-surface-container-high active:scale-90 p-3 rounded-full transition-all"
              aria-label="Menú"
            >
              <MSymbol icon="menu" size={24} />
            </button>
          )}

          {title ? (
            <span className="font-headline font-bold text-base text-on-surface truncate max-w-[180px] ml-1">{title}</span>
          ) : (
            <Link 
              href="/dashboard" 
              onClick={(e) => handleNavClick(e, "/dashboard")}
              className="active:scale-95 transition-transform ml-2"
            >
              <span className="font-headline font-black text-2xl text-primary tracking-tighter">
                amano
              </span>
            </Link>
          )}
        </div>

        {rightContent ?? (
          <div className="flex items-center gap-1">
            <Link 
              href="/notificaciones" 
              onClick={(e) => handleNavClick(e, "/notificaciones")}
              className="relative text-on-surface-variant hover:bg-surface-container-high active:scale-90 p-3 rounded-full transition-all"
              aria-label="Notificaciones"
            >
              <MSymbol icon="notifications" size={26} />
              {unreadCount > 0 && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-error border-2 border-surface shadow-sm animate-pulse" />
              )}
            </Link>
            <Link 
              href="/perfil" 
              className="active:scale-90 transition-transform p-1.5"
              aria-label="Perfil"
            >
              <Avatar className="size-9 border-2 border-primary/10 shadow-sm hover:border-primary/30 transition-all">
                <AvatarImage src={avatarUrl || ""} className="object-cover" />
                <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-black">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
