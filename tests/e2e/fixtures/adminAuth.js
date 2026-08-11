// Alta y baja de los usuarios del panel que usan los tests: el superusuario
// (rol 'admin') y el organizador de liga (rol 'liga', migracion 0014).
//
// El alta publica esta deshabilitada (`enable_signup = false` en
// supabase/config.toml), pero la Admin API con service role la saltea. El rol
// se otorga insertando en user_roles, que es lo que miran is_admin() y
// roles_panel() -- las funciones security definer de 0004 y 0014.
import { getServiceClient } from "../../testSupabase.js";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  LIGA_EMAIL,
  LIGA_PASSWORD,
} from "./datos.js";

async function buscarUsuario(supabase, email) {
  // No hay getUserByEmail en la Admin API: se lista y se filtra.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });
  if (error) throw error;
  return data.users.find((usuario) => usuario.email === email) ?? null;
}

async function crearUsuarioConRol(email, password, rol) {
  const supabase = getServiceClient();

  // Idempotente: si una corrida anterior murio antes del teardown, se reusa.
  let usuario = await buscarUsuario(supabase, email);

  if (!usuario) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    usuario = data.user;
  }

  const { data: fila, error: rolError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", rol)
    .maybeSingle();

  if (rolError) throw rolError;
  if (!fila) {
    throw new Error(
      `No existe el rol '${rol}': corre \`npx supabase db reset\` para aplicar las migraciones.`,
    );
  }

  const { error: asignacionError } = await supabase
    .from("user_roles")
    .upsert({ user_id: usuario.id, role_id: fila.id }, { onConflict: "user_id,role_id" });

  if (asignacionError) throw asignacionError;

  return usuario;
}

async function borrarUsuario(email) {
  const supabase = getServiceClient();
  const usuario = await buscarUsuario(supabase, email);
  // user_roles cae por cascade contra auth.users.
  if (usuario) await supabase.auth.admin.deleteUser(usuario.id);
}

export function crearAdmin() {
  return crearUsuarioConRol(ADMIN_EMAIL, ADMIN_PASSWORD, "admin");
}

export function crearUsuarioLiga() {
  return crearUsuarioConRol(LIGA_EMAIL, LIGA_PASSWORD, "liga");
}

export async function borrarUsuariosDelPanel() {
  await borrarUsuario(ADMIN_EMAIL);
  await borrarUsuario(LIGA_EMAIL);
}
