import { ApiError } from "@/lib/apiError";
import { recalcularSnapshotsPorTorneos } from "@/lib/rankings";
import { registrarEvento } from "@/lib/identidadEventos";

// Resuelve un participante pendiente (tournament_participants_raw con
// player_id null) contra un jugador ya existente. Usado tanto por
// /vincular (jugador ya existia) como por /crear_jugador (jugador recien
// creado) -- ambos terminan haciendo exactamente lo mismo desde aca.
export async function resolverParticipante(
  supabase,
  { participanteId, playerId, actorUserId, actorEmail, tipoEvento },
) {
  const { data: participante, error: participanteError } = await supabase
    .from("tournament_participants_raw")
    .select(
      "id, torneo_id, challonge_id, challonge_username, nombre_participante, player_id",
    )
    .eq("id", participanteId)
    .maybeSingle();

  if (participanteError) throw participanteError;
  if (!participante) throw new ApiError("Participante no encontrado", 404);
  if (participante.player_id) {
    throw new ApiError("Este participante ya fue resuelto", 409);
  }

  let cuentaCreada = false;
  let idsARresolver = [participanteId];

  if (participante.challonge_id) {
    const { data: cuentaExistente, error: cuentaError } = await supabase
      .from("player_challonge_accounts")
      .select("player_id")
      .eq("challonge_id", participante.challonge_id)
      .maybeSingle();

    if (cuentaError) throw cuentaError;

    if (cuentaExistente && cuentaExistente.player_id !== playerId) {
      throw new ApiError(
        "Esta cuenta de Challonge ya esta vinculada a otro jugador: usa Fusionar en vez de Vincular",
        409,
      );
    }

    if (!cuentaExistente) {
      const { data: cuentasActivas, error: cuentasError } = await supabase
        .from("player_challonge_accounts")
        .select("id")
        .eq("player_id", playerId)
        .eq("active", true);

      if (cuentasError) throw cuentasError;

      const { error: insertCuentaError } = await supabase
        .from("player_challonge_accounts")
        .insert({
          player_id: playerId,
          challonge_id: participante.challonge_id,
          challonge_username:
            participante.challonge_username || participante.nombre_participante,
          active: cuentasActivas.length === 0,
        });

      if (insertCuentaError) throw insertCuentaError;
      cuentaCreada = true;

      const { error: aliasError } = await supabase.from("player_aliases").insert({
        challonge_id: participante.challonge_id,
        nombre: participante.nombre_participante,
        activo: true,
      });

      if (aliasError) throw aliasError;
    }

    // Otras filas pendientes con la misma cuenta de Challonge (de otros
    // torneos importados antes de vincular esta) se resuelven juntas.
    const { data: hermanos, error: hermanosError } = await supabase
      .from("tournament_participants_raw")
      .select("id")
      .eq("challonge_id", participante.challonge_id)
      .is("player_id", null);

    if (hermanosError) throw hermanosError;

    idsARresolver = [...new Set([participanteId, ...hermanos.map((h) => h.id)])];
  }

  const nowIso = new Date().toISOString();
  const { data: filasResueltas, error: updateError } = await supabase
    .from("tournament_participants_raw")
    .update({ player_id: playerId, resolved_at: nowIso, resolved_by: actorUserId ?? null })
    .in("id", idsARresolver)
    .select("torneo_id");

  if (updateError) throw updateError;

  const temporadasRecalculadas = await recalcularSnapshotsPorTorneos(
    supabase,
    filasResueltas.map((fila) => fila.torneo_id),
  );

  await registrarEvento(supabase, {
    tipo: tipoEvento,
    actorUserId,
    detalle: {
      participante_ids: idsARresolver,
      challonge_id: participante.challonge_id,
      player_id: playerId,
      cuenta_creada: cuentaCreada,
      actor_email: actorEmail,
    },
  });

  return {
    filas_resueltas: idsARresolver.length,
    temporadas_recalculadas: temporadasRecalculadas,
  };
}
