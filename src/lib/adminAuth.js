import { createClient } from "@/lib/supabaseServer";

// Sesion actual de Supabase Auth y si el usuario es admin (rol 'admin'
// en user_roles, consultado via la funcion is_admin() de la BD).
export async function getAdminUser() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, isAdmin: false, error: null };
    }

    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error) {
      return { user: null, isAdmin: false, error };
    }

    return {
      user: { id: user.id, email: user.email },
      isAdmin: Boolean(isAdmin),
      error: null,
    };
  } catch (error) {
    return { user: null, isAdmin: false, error };
  }
}
