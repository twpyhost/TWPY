// Calculo de la tabla de posiciones de un grupo de la Liga. Funcion pura
// (sin Supabase) -- reusada por la capa de datos (getLiga) y por el admin
// (tabla en vivo del grupo). 1 punto por victoria, 0 por derrota, sin
// diferencia de sets. El desempate es manual (orden_desempate, lo fija el
// admin) -- no hay desempate automatico.
//
// participantes: [{ id, nombre, player_id, orden_desempate }]
// partidos:      [{ participante_a_id, participante_b_id, ganador_id }]
// opciones:      { cuposClasificados = 5 }
export function calcularTabla(participantes, partidos, opciones = {}) {
  const cuposClasificados = opciones.cuposClasificados ?? 5;

  const stats = new Map(
    participantes.map((p) => [
      p.id,
      { pj: 0, g: 0, p: 0, puntos: 0 },
    ]),
  );

  for (const partido of partidos) {
    if (partido.ganador_id == null) continue;

    const perdedorId =
      partido.ganador_id === partido.participante_a_id
        ? partido.participante_b_id
        : partido.participante_a_id;

    const ganador = stats.get(partido.ganador_id);
    if (ganador) {
      ganador.pj += 1;
      ganador.g += 1;
      ganador.puntos += 1;
    }

    const perdedor = stats.get(perdedorId);
    if (perdedor) {
      perdedor.pj += 1;
      perdedor.p += 1;
    }
  }

  const filas = participantes.map((participante) => {
    const s = stats.get(participante.id);
    return {
      participanteId: participante.id,
      nombre: participante.nombre,
      playerId: participante.player_id ?? null,
      ordenDesempate: participante.orden_desempate ?? null,
      pj: s.pj,
      g: s.g,
      p: s.p,
      puntos: s.puntos,
    };
  });

  filas.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (a.ordenDesempate == null && b.ordenDesempate != null) return 1;
    if (a.ordenDesempate != null && b.ordenDesempate == null) return -1;
    if (a.ordenDesempate != null && b.ordenDesempate != null) {
      if (a.ordenDesempate !== b.ordenDesempate) {
        return a.ordenDesempate - b.ordenDesempate;
      }
    }
    return a.nombre.localeCompare(b.nombre);
  });

  // Bloques empatados por puntos: sin resolver mientras algun miembro del
  // bloque no tenga orden_desempate asignado.
  const empatadoPorId = new Map();
  let inicioBloque = 0;
  for (let i = 1; i <= filas.length; i += 1) {
    const finDeBloque = i === filas.length || filas[i].puntos !== filas[inicioBloque].puntos;
    if (finDeBloque) {
      const bloque = filas.slice(inicioBloque, i);
      const resuelto = bloque.length <= 1 || bloque.every((f) => f.ordenDesempate != null);
      for (const f of bloque) empatadoPorId.set(f.participanteId, !resuelto);
      inicioBloque = i;
    }
  }

  const total = filas.length;
  return filas.map((f, indice) => {
    const posicion = indice + 1;
    let estado = "neutral";
    if (posicion <= cuposClasificados) estado = "clasificado";
    else if (posicion > total - 2) estado = "eliminado";

    return {
      posicion,
      participanteId: f.participanteId,
      nombre: f.nombre,
      playerId: f.playerId,
      pj: f.pj,
      g: f.g,
      p: f.p,
      puntos: f.puntos,
      empatado: empatadoPorId.get(f.participanteId) ?? false,
      estado,
    };
  });
}
