import { supabase } from "@/lib/supabaseClient";

export async function handleLogout(redirectTo = "/login") {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { success: false, message: error.message };
  } else {
    return { success: true };
  }
}