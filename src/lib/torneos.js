// Elimina un torneo importado. El cascade de la migracion 0005 limpia
// tournament_participants_raw y ranking_snapshots de ESE torneo -- mismo
// mecanismo que ya usan el rollback de insertarTorneo() y "reimportar" --,
// pero deja stale los acumulados de los torneos posteriores de la misma
// temporada, asi que hay que recalcular esa temporada despues del delete.
import { recalcularSnapshots } from "@/lib/rankings";

export async function eliminarTorneo(supabase, torneoId) {
  const { data: torneo, error: torneoError } = await supabase
    .from("torneos")
    .select("id, nombre, temporada")
    .eq("id", torneoId)
    .maybeSingle();

  if (torneoError) {
    throw torneoError;
  }

  if (!torneo) {
    return null;
  }

  const { error: deleteError } = await supabase.from("torneos").delete().eq("id", torneoId);
  if (deleteError) {
    throw deleteError;
  }

  await recalcularSnapshots(supabase, torneo.temporada);

  return { nombre: torneo.nombre, temporada: torneo.temporada };
}
