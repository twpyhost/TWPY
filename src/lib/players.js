// Sigue la cadena de merged_into_player_id hasta el jugador base (no
// fusionado). Permite que vincular/crear contra un jugador que ya fue
// absorbido en una fusion redirija solo al jugador correcto en vez de
// fallar o crear un duplicado nuevo.
export async function resolvePlayerChain(supabase, playerId) {
  let currentId = playerId;

  // Tope defensivo: no deberia haber ciclos (players_no_self_merge lo
  // impide para auto-referencias, pero esto cubre cualquier cadena larga
  // inesperada sin loopear indefinidamente).
  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabase
      .from("players")
      .select("id, merged_into_player_id")
      .eq("id", currentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    if (!data.merged_into_player_id) {
      return data.id;
    }

    currentId = data.merged_into_player_id;
  }

  return currentId;
}
