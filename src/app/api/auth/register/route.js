import { createClient } from "@/lib/supabaseServer";

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json(
      { error: "Se requieren correo y password" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return Response.json(
      { error: "El password debe tener al menos 6 caracteres" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const origin = new URL(req.url).origin;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    const mensaje =
      error.code === "user_already_exists"
        ? "Ya existe una cuenta con ese correo"
        : "No se pudo crear la cuenta";
    return Response.json({ error: mensaje }, { status: 400 });
  }

  // Con "confirm email" activado en Supabase, un correo ya registrado
  // devuelve un usuario fantasma (sin identities) en vez de error.
  if (data.user && data.user.identities?.length === 0) {
    return Response.json(
      { error: "Ya existe una cuenta con ese correo" },
      { status: 400 },
    );
  }

  return Response.json({
    message:
      "Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesion.",
  });
}
