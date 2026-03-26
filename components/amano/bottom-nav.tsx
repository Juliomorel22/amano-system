"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { MSymbol } from "@/components/amano/m-symbol";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "sonner";

const navItems = [
  { icon: "home", label: "Inicio", href: "/dashboard", view: "home" },
  { icon: "add_circle", label: "Publicar", href: "/publicar", cta: true },
  { icon: "work", label: "Mis Pedidos", href: "/dashboard?view=orders", view: "orders" },
  { icon: "person", label: "Perfil", href: "/perfil" },
];

const ADMIN_EMAIL = "administrator@amano.com";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
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
    // Insertar Gestión antes de Perfil
    items.splice(3, 0, { icon: "admin_panel_settings", label: "Gestión", href: "/admin", view: "" });
  }

  // No mostrar BottomNav en páginas de proceso (pago, publicar)
  const isHidden = pathname.endsWith("/pago") || pathname === "/publicar";
  if (isHidden) return null;

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // Si el perfil no está completo y no es la página de perfil, bloquear
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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-3xl lg:max-w-5xl z-[100] glass-header border-t border-outline-variant/10 shadow-ambient px-safe-bottom">
      <div className="flex items-center justify-around px-2 h-16 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isDashboard = item.href === "/dashboard";
          const isActive = isDashboard 
            ? (pathname === "/dashboard" && (item.view === currentView))
            : (pathname === item.href || pathname.startsWith(item.href + "/"));
          
          if (item.cta) {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className="flex flex-col items-center gap-0.5 -mt-7 shrink-0"
              >
                <div className="bg-cta-gradient w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                  <MSymbol icon={item.icon} size={26} className="text-white" filled />
                </div>
                <span className="text-[10px] font-medium" style={{ color: "#424752" }}>
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
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all shrink-0",
                isActive ? "text-primary" : "text-on-surface-variant"
              )}
            >
              <MSymbol icon={item.icon} size={24} filled={isActive} />
              <span className={cn("text-[10px] font-medium leading-none", isActive ? "font-semibold" : "")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
