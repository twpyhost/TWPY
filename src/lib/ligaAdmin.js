// Helpers compartidos por las rutas /api/admin/liga/*. Una sola liga activa
// en el MVP (sin pantalla para elegir entre varias, ver plan) -- se opera
// siempre sobre la mas reciente, mismo patron que obtenerJuegoTekken8() en
// /api/admin/puntajes.
export async function obtenerLigaActual(supabase) {
  const { data, error } = await supabase
    .from("ligas")
    .select("id, slug, nombre, temporada, estado")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function obtenerGrupoPorNumero(supabase, ligaId, numero) {
  const { data, error } = await supabase
    .from("liga_grupos")
    .select("id, numero, nombre, cupos_clasificados, cerrado")
    .eq("liga_id", ligaId)
    .eq("numero", numero)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Badge del nav de admin (mismo patron que el pendingCount de Identidades
// en AdminShell, pero contando liga_participantes en vez de
// tournament_participants_raw).
export async function contarPendientesVincularLiga(supabase, ligaId) {
  if (!ligaId) return 0;

  const { data: grupos, error: gruposError } = await supabase
    .from("liga_grupos")
    .select("id")
    .eq("liga_id", ligaId);
  if (gruposError) throw gruposError;

  const grupoIds = grupos.map((g) => g.id);
  if (grupoIds.length === 0) return 0;

  const { count, error: countError } = await supabase
    .from("liga_participantes")
    .select("id", { count: "exact", head: true })
    .in("grupo_id", grupoIds)
    .is("player_id", null);
  if (countError) throw countError;

  return count ?? 0;
}
