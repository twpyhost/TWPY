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
