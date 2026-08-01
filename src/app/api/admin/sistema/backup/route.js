import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Lo llama .github/workflows/backup-supabase.yml tras el pg_dump, para que
// /admin/sistema deje de mostrar "sin datos" en la tarjeta de backup. Mismo
// patron de autenticacion que /api/health: secreto compartido por header,
// no sesion (es un workflow de GitHub, no un usuario logueado).
export const dynamic = "force-dynamic";

export async function POST(req) {
  const autorizado =
    Boolean(process.env.HEALTH_PING_SECRET) &&
    req.headers.get("x-health-secret") === process.env.HEALTH_PING_SECRET;

  if (!autorizado) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const { ok, detalle } = await req.json().catch(() => ({}));

  try {
    await getSupabaseAdmin()
      .from("sistema_eventos")
      .insert({ tipo: "backup", ok: Boolean(ok), detalle: detalle ?? {} });
  } catch (error) {
    console.error("No se pudo registrar el evento de backup:", error);
    return Response.json({ error: "No se pudo registrar el evento" }, { status: 500 });
  }

  return Response.json({ registrado: true }, { status: 200 });
}
