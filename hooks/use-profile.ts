"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

export function useProfile() {
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function checkProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, barrio")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfile(profile);
        const complete = !!(profile.full_name && profile.phone && profile.barrio);
        setIsComplete(complete);
      } else {
        setIsComplete(false);
      }
      setLoading(false);
    }
    checkProfile();
  }, [pathname]); // Re-verificar cada vez que cambia la ruta para asegurar que el bloqueo se actualice

  return { loading, isComplete, profile };
}
