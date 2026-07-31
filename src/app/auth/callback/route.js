import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { safeNext } from "@/lib/safeNext";

// Destino del redirect OAuth de Supabase (Discord). Intercambia el `code`
// por una sesion y redirige a `next` (por defecto, home). Distinto de
// /auth/confirm, que verifica el token_hash de los links de email.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // El sitio no tiene area de usuario: la unica sesion valida es la de un
      // admin. Sin este chequeo, cualquier cuenta de Discord podria abrir
      // sesion y la navbar le mostraria el boton ADMIN.
      const { data: isAdmin } = await supabase.rpc("is_admin");

      if (!isAdmin) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/no-autorizado", origin));
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/error", origin));
}
