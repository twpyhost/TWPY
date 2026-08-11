// Calculo de la tabla de posiciones de un grupo de la Liga. Funcion pura
// (sin Supabase) -- reusada por la capa de datos (getLiga) y por el admin
// (tabla en vivo del grupo).
//
// Cada partido es un first-to-3 y se carga el marcador (3-0, 3-1 o 3-2):
// PTS = FT ganados (1 punto por set ganado). Los empates de PTS se rompen
// automaticamente por diferencia de matches y luego por matches ganados;
// solo si esos tres valores coinciden se cae al desempate manual del admin
// (orden_desempate).
//
// participantes: [{ id, nombre, player_id, orden_desempate }]
// partidos:      [{ participante_a_id, participante_b_id, ganador_id,
//                   matches_a, matches_b }]
// opciones:      { cuposClasificados = 5 }

// Corte de clasificado/eliminado segun la posicion en la tabla. Extraida
// para que `calcularTabla` y la tabla en vivo del admin (GrupoDetalle, que
// recalcula el orden localmente mientras el admin arrastra un desempate)
// compartan exactamente la misma regla.
export function estadoParaPosicion(posicion, total, cuposClasificados) {
  if (posicion <= cuposClasificados) return "clasificado";
  if (posicion > total - 2) return "eliminado";
  return "neutral";
}

// Diferencia de matches con signo explicito, para que la columna DIF se lea
// igual en la tabla publica y en la del admin.
export function formatearDif(dif) {
  return dif > 0 ? `+${dif}` : String(dif);
}

// Criterios que el sistema resuelve solo, en orden: puntos (FT ganados),
// diferencia de matches y matches ganados. Dos filas con la misma clave son
// un empate real que el admin tiene que ordenar a mano.
function mismoNivelAuto(a, b) {
  return a.puntos === b.puntos && a.dif === b.dif && a.mg === b.mg;
}

export function calcularTabla(participantes, partidos, opciones = {}) {
  const cuposClasificados = opciones.cuposClasificados ?? 5;

  const stats = new Map(
    participantes.map((p) => [p.id, { pj: 0, g: 0, p: 0, mg: 0, mp: 0 }]),
  );

  for (const partido of partidos) {
    if (partido.ganador_id == null) continue;

    const ganadorEsA = partido.ganador_id === partido.participante_a_id;
    const perdedorId = ganadorEsA
      ? partido.participante_b_id
      : partido.participante_a_id;

    // Un partido cargado con el sistema viejo (ganador sin marcador) cuenta
    // en pj/g/p pero no aporta matches -- la migracion 0013 los limpia, esto
    // es solo para no romper si aparece uno.
    const matchesGanador = (ganadorEsA ? partido.matches_a : partido.matches_b) ?? 0;
    const matchesPerdedor = (ganadorEsA ? partido.matches_b : partido.matches_a) ?? 0;

    const ganador = stats.get(partido.ganador_id);
    if (ganador) {
      ganador.pj += 1;
      ganador.g += 1;
      ganador.mg += matchesGanador;
      ganador.mp += matchesPerdedor;
    }

    const perdedor = stats.get(perdedorId);
    if (perdedor) {
      perdedor.pj += 1;
      perdedor.p += 1;
      perdedor.mg += matchesPerdedor;
      perdedor.mp += matchesGanador;
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
      mg: s.mg,
      mp: s.mp,
      dif: s.mg - s.mp,
      puntos: s.g,
    };
  });

  filas.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    if (b.dif !== a.dif) return b.dif - a.dif;
    if (b.mg !== a.mg) return b.mg - a.mg;
    if (a.ordenDesempate == null && b.ordenDesempate != null) return 1;
    if (a.ordenDesempate != null && b.ordenDesempate == null) return -1;
    if (a.ordenDesempate != null && b.ordenDesempate != null) {
      if (a.ordenDesempate !== b.ordenDesempate) {
        return a.ordenDesempate - b.ordenDesempate;
      }
    }
    return a.nombre.localeCompare(b.nombre);
  });

  // Bloques que los criterios automaticos no lograron separar: sin resolver
  // mientras algun miembro del bloque no tenga orden_desempate asignado.
  const empatadoPorId = new Map();
  let inicioBloque = 0;
  for (let i = 1; i <= filas.length; i += 1) {
    const finDeBloque =
      i === filas.length || !mismoNivelAuto(filas[i], filas[inicioBloque]);
    if (finDeBloque) {
      const bloque = filas.slice(inicioBloque, i);
      const ordenes = bloque.map((f) => f.ordenDesempate);
      const resuelto =
        bloque.length <= 1 ||
        (ordenes.every((o) => o != null) && new Set(ordenes).size === bloque.length);
      for (const f of bloque) empatadoPorId.set(f.participanteId, !resuelto);
      inicioBloque = i;
    }
  }

  const total = filas.length;
  return filas.map((f, indice) => {
    const posicion = indice + 1;
    const estado = estadoParaPosicion(posicion, total, cuposClasificados);

    return {
      posicion,
      participanteId: f.participanteId,
      nombre: f.nombre,
      playerId: f.playerId,
      pj: f.pj,
      g: f.g,
      p: f.p,
      mg: f.mg,
      mp: f.mp,
      dif: f.dif,
      puntos: f.puntos,
      empatado: empatadoPorId.get(f.participanteId) ?? false,
      estado,
    };
  });
}

// Bloques contiguos que los criterios automaticos (puntos, diferencia de
// matches, matches ganados) no separan, resueltos o no -- a diferencia del
// campo `empatado` (que se apaga apenas todos tienen orden_desempate), esto
// los agrupa igual para que el admin pueda seguir reordenando un bloque
// despues de resolverlo. `calcularTabla` ya deja las filas ordenadas, asi
// que un bloque es siempre un rango contiguo.
export function bloquesEmpatados(tabla) {
  const bloques = [];
  let i = 0;
  while (i < tabla.length) {
    let j = i + 1;
    while (j < tabla.length && mismoNivelAuto(tabla[j], tabla[i])) {
      j += 1;
    }
    if (j - i > 1) bloques.push({ inicio: i, fin: j });
    i = j;
  }
  return bloques;
}
