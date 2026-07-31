import { createClient } from "@/lib/supabaseServer";

const MENSAJES = {
  invalid_credentials: "Credenciales invalidas",
  email_not_confirmed:
    "Tenes que confirmar tu correo antes de iniciar sesion. Revisa tu bandeja de entrada.",
};

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { error: "Se requieren correo y password" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return Response.json(
      { error: MENSAJES[error.code] || "No se pudo iniciar sesion" },
      { status: 401 },
    );
  }

  // El sitio no tiene area de usuario: la unica sesion valida es la de un
  // admin. Sin este chequeo quedaria una sesion abierta sin permisos y la
  // navbar mostraria el boton ADMIN igual.
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    await supabase.auth.signOut();
    return Response.json(
      { error: "Esta cuenta no tiene acceso al panel" },
      { status: 403 },
    );
  }

  return Response.json({
    user: { email: data.user.email },
    isAdmin: true,
  });
}
