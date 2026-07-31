// Configuracion de puntos por posicion (tabla `puntajes_config`). Sigue el
// patron de rankings.js: funciones puras faciles de testear + funciones que
// reciben `supabase` por parametro para operar sobre el service client.
//
// El puntaje otorgado por posicion queda desnormalizado en cada resultado
// historico (tournament_participants_raw.puntaje): cambiar esta tabla NO
// reescribe los torneos ya cargados, solo afecta a las proximas
// importaciones (ver obtenerPuntajes en importarTorneo.js).
export function validarPuntajes(filas) {
  if (!Array.isArray(filas) || filas.length === 0) {
    return { ok: false, error: "Se requiere al menos una posicion" };
  }

  const posiciones = new Set();

  for (const fila of filas) {
    if (!Number.isInteger(fila?.posicion) || fila.posicion < 1) {
      return { ok: false, error: "Cada posicion debe ser un entero mayor o igual a 1" };
    }
    if (!Number.isInteger(fila?.puntos) || fila.puntos < 0) {
      return { ok: false, error: "Cada puntaje debe ser un entero mayor o igual a 0" };
    }
    if (posiciones.has(fila.posicion)) {
      return { ok: false, error: `La posicion ${fila.posicion} esta repetida` };
    }
    posiciones.add(fila.posicion);
  }

  return { ok: true };
}

// Reemplazo total, no merge: ademas de guardar las filas recibidas, borra
// las posiciones que ya no vienen en el payload -- es lo que permite quitar
// una posicion desde la UI (el upsert solo no alcanza para eso).
export async function reemplazarPuntajes(supabase, juegoId, filas) {
  const { error: upsertError } = await supabase.from("puntajes_config").upsert(
    filas.map((fila) => ({
      juego_id: juegoId,
      posicion: fila.posicion,
      puntos: fila.puntos,
    })),
    { onConflict: "juego_id,posicion" },
  );

  if (upsertError) {
    throw upsertError;
  }

  const posicionesVigentes = filas.map((fila) => fila.posicion);

  const { error: deleteError } = await supabase
    .from("puntajes_config")
    .delete()
    .eq("juego_id", juegoId)
    .not("posicion", "in", `(${posicionesVigentes.join(",")})`);

  if (deleteError) {
    throw deleteError;
  }
}
