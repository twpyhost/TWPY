// Recalcula los cortes de ranking de una temporada completa, en orden
// cronologico de torneos, a partir de tournament_participants_raw (solo
// filas ya resueltas a un jugador). Reusado por la importacion de torneos
// y por las rutas de resolucion de identidades (vincular/crear_jugador/
// fusionar/deshacer), que pueden alterar el player_id de filas historicas.
export async function recalcularSnapshots(supabase, temporada) {
  const { data: torneos, error: torneosError } = await supabase
    .from("torneos")
    .select("id")
    .eq("temporada", temporada)
    .order("fecha_inicio", { ascending: true })
    .order("id", { ascending: true });

  if (torneosError) {
    throw torneosError;
  }

  const torneoIds = torneos.map((torneo) => torneo.id);

  const { data: participantes, error: participantesError } = await supabase
    .from("tournament_participants_raw")
    .select("torneo_id, player_id, puntaje")
    .in("torneo_id", torneoIds)
    .not("player_id", "is", null);

  if (participantesError) {
    throw participantesError;
  }

  const porTorneo = new Map(torneoIds.map((id) => [id, []]));
  for (const participante of participantes) {
    porTorneo.get(participante.torneo_id)?.push(participante);
  }

  const acumulados = new Map();
  const snapshots = [];

  for (const torneoId of torneoIds) {
    for (const participante of porTorneo.get(torneoId)) {
      acumulados.set(
        participante.player_id,
        (acumulados.get(participante.player_id) || 0) + participante.puntaje,
      );
    }

    [...acumulados.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([playerId, puntajeAcumulado], index) => {
        snapshots.push({
          torneo_id: torneoId,
          player_id: playerId,
          temporada,
          puntaje_acumulado: puntajeAcumulado,
          posicion_global: index + 1,
        });
      });
  }

  const { error: deleteError } = await supabase
    .from("ranking_snapshots")
    .delete()
    .eq("temporada", temporada);

  if (deleteError) {
    throw deleteError;
  }

  if (snapshots.length > 0) {
    const { error: insertError } = await supabase
      .from("ranking_snapshots")
      .insert(snapshots);

    if (insertError) {
      throw insertError;
    }
  }
}

// Recalcula todas las temporadas afectadas por una accion (import, vinculo,
// fusion, etc.), dado un set de torneo_id tocados. Devuelve la lista de
// temporadas recalculadas para incluir en la respuesta de la API.
export async function recalcularSnapshotsPorTorneos(supabase, torneoIds) {
  if (torneoIds.length === 0) {
    return [];
  }

  const { data: torneos, error } = await supabase
    .from("torneos")
    .select("temporada")
    .in("id", [...new Set(torneoIds)]);

  if (error) {
    throw error;
  }

  const temporadas = [...new Set(torneos.map((torneo) => torneo.temporada))];

  for (const temporada of temporadas) {
    await recalcularSnapshots(supabase, temporada);
  }

  return temporadas;
}
