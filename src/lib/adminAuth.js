import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabaseServer";

// Roles del panel (migracion 0014):
//   'admin' -> superusuario: todas las secciones.
//   'liga'  -> solo /admin/liga.
export const ROL_ADMIN = "admin";
export const ROL_LIGA = "liga";

// Landing de cada rol: /admin no tiene contenido propio, redirige aca.
export const HOME_ADMIN = "/admin/identidades";
export const HOME_LIGA = "/admin/liga";

const SIN_SESION = {
  user: null,
  roles: [],
  isAdmin: false,
  isLiga: false,
  puedeEntrarAlPanel: false,
};

// Sesion actual de Supabase Auth y que puede hacer en el panel, resuelto con
// la funcion roles_panel() de la BD. `isLiga` es "puede operar la liga", asi
// que el superusuario tambien lo tiene: la jerarquia se aplica aca, no en la
// tabla user_roles.
export async function getAdminUser() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ...SIN_SESION, error: null };
    }

    const { data, error } = await supabase.rpc("roles_panel");
    if (error) {
      return { ...SIN_SESION, error };
    }

    const roles = data ?? [];
    const isAdmin = roles.includes(ROL_ADMIN);
    const isLiga = isAdmin || roles.includes(ROL_LIGA);

    return {
      user: { id: user.id, email: user.email },
      roles,
      isAdmin,
      isLiga,
      puedeEntrarAlPanel: isAdmin || isLiga,
      error: null,
    };
  } catch (error) {
    return { ...SIN_SESION, error };
  }
}

// Seccion del panel a la que mandar a alguien que recien entra.
export function homeDelPanel({ isAdmin, isLiga }) {
  if (isAdmin) return HOME_ADMIN;
  if (isLiga) return HOME_LIGA;
  return "/no-autorizado";
}

// Guard de las paginas exclusivas del superusuario. El layout de /admin ya
// dejo pasar a cualquiera con acceso al panel (incluido el rol 'liga'), asi
// que cada seccion que no sea la liga tiene que frenarlo antes de renderizar.
// El limite de seguridad real siguen siendo requireAdmin()/requireLiga() en
// las rutas de API: esto es UX.
export async function requireSuperusuario() {
  const { user, isAdmin, error } = await getAdminUser();
  if (error) redirect("/error");
  if (!user) redirect("/auth/login?redirectTo=/admin");
  if (!isAdmin) redirect("/no-autorizado");
}
