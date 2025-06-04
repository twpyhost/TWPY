import { supabase } from "@/lib/supabaseClient";
export async function userHasRole(userId, roleName) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", userId)
    .single();

  if (error || !data) return false;

  return data.roles.name === roleName;
}