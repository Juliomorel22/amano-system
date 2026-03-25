import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirect("/login");
  }

  // Verificar si el perfil está completo
  const { data: profile } = await supabase
    .from("profiles")
    .select("barrio, phone, full_name")
    .eq("id", session.user.id)
    .single();

  if (!profile?.barrio || !profile?.phone || !profile?.full_name) {
    return redirect("/perfil");
  }

  return redirect("/dashboard");
}
