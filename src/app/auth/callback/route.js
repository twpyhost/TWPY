import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

// Sanitiza `next` resolviendolo contra `origin` y verificando que el
// resultado siga siendo del mismo origen. Un prefix-check tipo
// startsWith("/") es insuficiente: payloads como "/\evil.example" pasan
// ese chequeo pero WHATWG URL normaliza la barra invertida a "/" antes de
// resolver, terminando en un origen distinto. Resolver primero y comparar
// origin cierra esa clase de bypass.
function safeNext(rawNext, origin) {
  if (!rawNext) return "/";
  try {
    const resolved = new URL(rawNext, origin);
    return resolved.origin === origin
      ? `${resolved.pathname}${resolved.search}${resolved.hash}`
      : "/";
  } catch {
    return "/";
  }
}

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
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/error", origin));
}
