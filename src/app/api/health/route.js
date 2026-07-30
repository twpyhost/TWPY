import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Lo que dispara la pausa de Supabase free tier es la inactividad de la
// base, no el trafico del sitio -- por eso esta ruta tiene que hacer una
// query real (no solo responder 200) y por eso no puede ser estatica.
export const dynamic = "force-dynamic";

async function registrarEvento(ok, detalle) {
  try {
    await getSupabaseAdmin()
      .from("sistema_eventos")
      .insert({ tipo: "health", ok, detalle });
  } catch (error) {
    // No queremos que un fallo al registrar el evento tumbe el health
    // check en si -- el health check ya respondio lo que corresponde.
    console.error("No se pudo registrar el evento de health:", error);
  }
}

export async function GET(req) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

  const { error } = await client.from("juegos").select("id").limit(1);
  const checkedAt = new Date().toISOString();

  // Solo registra el evento si viene el secreto correcto, para que un GET
  // anonimo (cualquiera puede pegarle a /api/health) no pueda spamear filas.
  const autorizado =
    Boolean(process.env.HEALTH_PING_SECRET) &&
    req.headers.get("x-health-secret") === process.env.HEALTH_PING_SECRET;

  if (error) {
    if (autorizado) {
      await registrarEvento(false, { checked_at: checkedAt, error: error.message });
    }
    return Response.json(
      { ok: false, checked_at: checkedAt, error: error.message },
      { status: 503 },
    );
  }

  if (autorizado) {
    await registrarEvento(true, { checked_at: checkedAt });
  }

  return Response.json({ ok: true, checked_at: checkedAt }, { status: 200 });
}
