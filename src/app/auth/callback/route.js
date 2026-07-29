import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

// Destino del redirect OAuth de Supabase (Discord). Intercambia el `code`
// por una sesion y redirige a `next` (por defecto, home). Distinto de
// /auth/confirm, que verifica el token_hash de los links de email.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/error", origin));
}
