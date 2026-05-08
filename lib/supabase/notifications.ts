import { createClient } from "./client";

export type NotificationType = 
  | "new_job_available" 
  | "new_offer" 
  | "job_started" 
  | "payment_submitted" 
  | "payment_verified" 
  | "payment_rejected" 
  | "arrival_confirmed" 
  | "job_status" 
  | "job_finished_review" 
  | "job_closed" 
  | "new_review"
  | "new_message";

interface SendNotificationProps {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
}

/**
 * Utility to send notifications from the client side.
 * In a production environment, this should ideally be handled via 
 * Database Triggers or Edge Functions for security and reliability.
 */
export async function sendNotification({ 
  userId, 
  type, 
  title, 
  content, 
  link 
}: SendNotificationProps) {
  const supabase = createClient();
  
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    content,
    link: link || null,
  });

  if (error) {
    console.error("Error sending notification:", error);
    return { success: false, error };
  }

  return { success: true };
}

/**
 * Sends a notification to the administrator.
 */
export async function notifyAdmin({ 
  type, 
  title, 
  content, 
  link 
}: Omit<SendNotificationProps, "userId">) {
  const supabase = createClient();
  
  // Find admin user - by convention in this project: administrator@amano.com
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", "administrator@amano.com")
    .single();

  if (adminProfile) {
    return sendNotification({
      userId: adminProfile.id,
      type,
      title,
      content,
      link
    });
  }

  return { success: false, error: "Admin not found" };
}
