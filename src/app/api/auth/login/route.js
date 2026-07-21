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

  const { data: isAdmin } = await supabase.rpc("is_admin");

  return Response.json({
    user: { email: data.user.email },
    isAdmin: Boolean(isAdmin),
  });
}
