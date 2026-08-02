// Alta y baja del usuario admin que usan los tests del panel.
//
// El alta publica esta deshabilitada (`enable_signup = false` en
// supabase/config.toml), pero la Admin API con service role la saltea. El rol
// se otorga insertando en user_roles, que es lo que mira is_admin() -- la
// funcion security definer de la migracion 0004.
import { getServiceClient } from "../../testSupabase.js";
import { ADMIN_EMAIL, ADMIN_PASSWORD } from "./datos.js";

async function buscarUsuario(supabase) {
  // No hay getUserByEmail en la Admin API: se lista y se filtra.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((usuario) => usuario.email === ADMIN_EMAIL) ?? null;
}

export async function crearAdmin() {
  const supabase = getServiceClient();

  // Idempotente: si una corrida anterior murio antes del teardown, se reusa.
  let usuario = await buscarUsuario(supabase);

  if (!usuario) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    usuario = data.user;
  }

  const { data: rol, error: rolError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "admin")
    .maybeSingle();

  if (rolError) throw rolError;
  if (!rol) {
    throw new Error(
      "No existe el rol 'admin': corre `npx supabase db reset` para aplicar las migraciones.",
    );
  }

  const { error: asignacionError } = await supabase
    .from("user_roles")
    .upsert({ user_id: usuario.id, role_id: rol.id }, { onConflict: "user_id,role_id" });

  if (asignacionError) throw asignacionError;

  return usuario;
}

export async function borrarAdmin() {
  const supabase = getServiceClient();
  const usuario = await buscarUsuario(supabase);
  // user_roles cae por cascade contra auth.users.
  if (usuario) await supabase.auth.admin.deleteUser(usuario.id);
}
