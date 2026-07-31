import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Solo indicadores reales -- sin tarjeta de estado del bot de Discord
// (decision del plan de go-live: eso no se mide desde aca).
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const supabase = getSupabaseAdmin();

    const { data: ultimoHealth, error: healthError } = await supabase
      .from("sistema_eventos")
      .select("ok, created_at")
      .eq("tipo", "health")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (healthError) throw healthError;

    const { data: torneos, error: torneosError } = await supabase
      .from("torneos")
      .select("challonge_source_account, created_at");
    if (torneosError) throw torneosError;

    const ultimaImportacionPorCuenta = { A: null, B: null };
    for (const torneo of torneos) {
      const cuenta = torneo.challonge_source_account;
      if (
        !ultimaImportacionPorCuenta[cuenta] ||
        torneo.created_at > ultimaImportacionPorCuenta[cuenta]
      ) {
        ultimaImportacionPorCuenta[cuenta] = torneo.created_at;
      }
    }

    const { data: ultimoBackup, error: backupError } = await supabase
      .from("sistema_eventos")
      .select("ok, created_at")
      .eq("tipo", "backup")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (backupError) throw backupError;

    return Response.json(
      {
        health: ultimoHealth ?? null,
        importaciones: ultimaImportacionPorCuenta,
        backup: ultimoBackup ?? null,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al obtener el estado del sistema" },
      { status: 500 },
    );
  }
}
