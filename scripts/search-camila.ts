import { createClient } from "@/lib/supabase/client";

async function searchCamila() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("full_name", "%Camila%");
  
  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("CAMILAS FOUND:", data);
  }
}

searchCamila();
