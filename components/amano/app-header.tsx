"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MSymbol } from "@/components/amano/m-symbol";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNotifications } from "@/hooks/use-notifications";
import { createClient } from "@/lib/supabase/client";

interface AppHeaderProps {
  showBack?: boolean;
  title?: string;
  rightContent?: React.ReactNode;
}

export function AppHeader({ showBack = false, title, rightContent }: AppHeaderProps) {
  const { unreadCount } = useNotifications();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("AM");

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

    // Suscribirse a cambios en el perfil si fuera necesario, 
    // pero por ahora con el fetch inicial basta para el Header.
  }, []);

  return (
    <header className="glass-header sticky top-0 z-50 border-b border-outline-variant/10 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 h-14 max-w-md md:max-w-3xl lg:max-w-5xl mx-auto">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button onClick={() => history.back()} className="text-on-surface hover:bg-surface-container-high p-1.5 rounded-full transition-colors">
              <MSymbol icon="arrow_back" size={24} />
            </button>
          ) : (
            <button className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-full transition-colors">
              <MSymbol icon="menu" size={24} />
            </button>
          )}

          {title ? (
            <span className="font-headline font-bold text-base text-on-surface truncate max-w-[150px]">{title}</span>
          ) : (
            <Link href="/dashboard" className="active:scale-95 transition-transform">
              <span className="font-headline font-extrabold text-xl text-primary tracking-tight">
                amano
              </span>
            </Link>
          )}
        </div>

        {rightContent ?? (
          <div className="flex items-center gap-3.5">
            <Link href="/notificaciones" className="relative text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-full transition-all">
              <MSymbol icon="notifications" size={26} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-error border-2 border-surface shadow-sm animate-pulse" />
              )}
            </Link>
            <Link href="/perfil" className="active:scale-90 transition-transform">
              <Avatar className="size-8 border-2 border-primary/20 shadow-sm ring-2 ring-transparent hover:ring-primary/40 transition-all">
                <AvatarImage src={avatarUrl || ""} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
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
