"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MSymbol } from "@/components/amano/m-symbol";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

const navItems = [
  { icon: "home", label: "Inicio", href: "/dashboard", view: "home" },
  { icon: "add", label: "Publicar", href: "/publicar", cta: true },
  { icon: "work", label: "Mis Pedidos", href: "/dashboard?view=orders", view: "orders" },
  { icon: "person", label: "Perfil", href: "/perfil" },
];

const ADMIN_EMAIL = "administrator@amano.com";

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") || "home";
  const [isAdmin, setIsAdmin] = useState(false);
  const { isComplete, loading: profileLoading } = useProfile();

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      }
    }
    checkAdmin();
  }, []);

  const items = [...navItems];
  if (isAdmin) {
    items.splice(3, 0, { icon: "admin_panel_settings", label: "Gestión", href: "/admin", view: "" });
  }

  const isHidden = pathname.endsWith("/pago") || pathname === "/publicar";
  if (isHidden) return null;

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
    <nav className="fixed bottom-0 left-0 right-0 z-[100] glass-header border-t border-outline-variant/10 shadow-ambient px-safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-7xl mx-auto px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isDashboard = item.href === "/dashboard" || item.href.startsWith("/dashboard?");
          const isActive = isDashboard 
            ? (pathname === "/dashboard" && (item.view === currentView))
            : (pathname === item.href || pathname.startsWith(item.href + "/"));
          
          if (item.cta) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="flex flex-col items-center gap-1 -mt-8 shrink-0 active:scale-90 transition-transform"
                aria-label={item.label}
              >
                <div className="bg-cta-gradient w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-45 group">
                  <div className="-rotate-45">
                    <MSymbol icon={item.icon} size={28} className="text-white" filled />
                  </div>
                </div>
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-tighter mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href + item.view}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 h-full rounded-xl transition-all shrink-0 active:scale-95",
                isActive ? "text-primary" : "text-on-surface-variant/70"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-full transition-all",
                isActive ? "bg-primary/5 shadow-[0_0_20px_rgba(0,63,135,0.08)]" : ""
              )}>
                <MSymbol icon={item.icon} size={24} filled={isActive} />
              </div>
              <span className={cn("text-[9px] font-bold uppercase tracking-tight leading-none", isActive ? "text-primary" : "")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
