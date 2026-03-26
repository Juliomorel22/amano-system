import { createClient } from "@/lib/supabase/client";

async function checkProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    console.log("USER ID:", user.id);
    console.log("USER EMAIL:", user.email);
    console.log("PROFILE:", profile);
  } else {
    console.log("NO USER");
  }
}

checkProfile();
