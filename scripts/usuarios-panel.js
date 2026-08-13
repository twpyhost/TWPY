// Alta y baja de los usuarios del panel para desarrollo LOCAL.
//
// Mismo mecanismo que el fixture de Playwright (tests/e2e/fixtures/adminAuth.js):
// el alta publica esta deshabilitada (`enable_signup = false` en
// supabase/config.toml), pero la Admin API con service role la saltea, y el rol
// se otorga insertando en `user_roles` -- que es lo que miran is_admin() y
// roles_panel() (migraciones 0004 y 0014).
//
// Los mails son distintos a los de los tests (`@twpy.test`) a proposito: el
// teardown de la suite borra los suyos, y no queremos que se lleve puesto el
// usuario con el que estas laburando.

export const USUARIOS_PANEL = [
  { rol: "admin", email: "admin@twpy.local", password: "twpy-admin-local" },
  { rol: "liga", email: "liga@twpy.local", password: "twpy-liga-local" },
];

async function buscarUsuario(supabase, email) {
  // No hay getUserByEmail en la Admin API: se lista y se filtra.
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`listando usuarios: ${error.message}`);
  return data.users.find((usuario) => usuario.email === email) ?? null;
}

// Idempotente: si el usuario ya existe se reusa y se le resetea la password,
// asi re-correr el seed siempre deja credenciales conocidas.
export async function crearUsuarioDePanel(supabase, { email, password, rol }) {
  let usuario = await buscarUsuario(supabase, email);
  let creado = false;

  if (usuario) {
    const { error } = await supabase.auth.admin.updateUserById(usuario.id, { password });
    if (error) throw new Error(`actualizando ${email}: ${error.message}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`creando ${email}: ${error.message}`);
    usuario = data.user;
    creado = true;
  }

  const { data: fila, error: rolError } = await supabase
    .from("roles")
    .select("id")
    .eq("name", rol)
    .maybeSingle();
  if (rolError) throw new Error(`leyendo el rol ${rol}: ${rolError.message}`);
  if (!fila) {
    throw new Error(
      `No existe el rol '${rol}': corré \`npx supabase db reset\` para aplicar las migraciones.`,
    );
  }

  const { error: asignacionError } = await supabase
    .from("user_roles")
    .upsert({ user_id: usuario.id, role_id: fila.id }, { onConflict: "user_id,role_id" });
  if (asignacionError) {
    throw new Error(`asignando el rol ${rol} a ${email}: ${asignacionError.message}`);
  }

  return { usuario, creado };
}

export async function borrarUsuarioDePanel(supabase, email) {
  const usuario = await buscarUsuario(supabase, email);
  if (!usuario) return false;
  // user_roles cae por cascade contra auth.users.
  const { error } = await supabase.auth.admin.deleteUser(usuario.id);
  if (error) throw new Error(`borrando ${email}: ${error.message}`);
  return true;
}

// Resuelve que usuarios abarca la corrida a partir de --rol/--email.
export function seleccionarUsuarios(argv) {
  const valor = (nombre) => {
    const prefijo = `--${nombre}=`;
    const encontrado = argv.find((arg) => arg.startsWith(prefijo));
    return encontrado ? encontrado.slice(prefijo.length) : null;
  };

  const rol = valor("rol");
  const email = valor("email");
  const password = valor("password");

  if (rol && !USUARIOS_PANEL.some((u) => u.rol === rol)) {
    throw new Error(`Rol desconocido: ${rol} (usá admin o liga)`);
  }

  let elegidos = rol ? USUARIOS_PANEL.filter((u) => u.rol === rol) : USUARIOS_PANEL;

  if (email || password) {
    if (elegidos.length !== 1) {
      throw new Error("--email/--password requieren también --rol=admin o --rol=liga");
    }
    elegidos = [{ ...elegidos[0], ...(email && { email }), ...(password && { password }) }];
  }

  return elegidos;
}
