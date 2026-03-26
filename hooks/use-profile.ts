"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";

export function useProfile() {
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const pathname = usePathname();

  const checkProfile = useCallback(async () => {
    setLoading(true);
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
      const complete = !!(profile.full_name?.trim() && profile.phone?.trim() && profile.barrio?.trim());
      setIsComplete(complete);
    } else {
      setIsComplete(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkProfile();

    // Escuchar evento personalizado de actualización
    const handleUpdate = () => {
      checkProfile();
    };

    window.addEventListener("profile-updated", handleUpdate);
    return () => window.removeEventListener("profile-updated", handleUpdate);
  }, [checkProfile, pathname]);

  return { loading, isComplete, profile, refresh: checkProfile };
}
