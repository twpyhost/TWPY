import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { safeNext } from "@/lib/safeNext";

// Destino del link de confirmacion que manda Supabase por correo
// (signup, magic link, recovery). Verifica el token y deja la sesion
// iniciada.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = safeNext(searchParams.get("next"), origin);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/error", request.url));
}
