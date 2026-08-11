import { calcularTabla } from "./ligaTabla";

// Arma la forma anidada { liga, fechas, grupos } a partir de las filas
// "planas" tal como salen de Supabase (misma forma la usan supabaseDb.js y
// mockDb.js, para que ambas fuentes de datos no puedan divergir).
//
// rows.liga:          { id, slug, nombre, temporada, estado }
// rows.fechas:        [{ id, numero, fecha, hora }]
// rows.grupos:        [{ id, numero, nombre, cupos_clasificados, cerrado }]
// rows.participantes: [{ id, grupo_id, nombre, player_id, orden_desempate }]
// rows.partidos:      [{ id, grupo_id, fecha_id, participante_a_id, participante_b_id, orden, ganador_id }]
export function armarLiga({ liga, fechas, grupos, participantes, partidos }) {
  const fechaPorId = new Map(fechas.map((f) => [f.id, f]));

  const gruposArmados = [...grupos]
    .sort((a, b) => a.numero - b.numero)
    .map((grupo) => armarGrupo({ grupo, participantes, partidos, fechaPorId }));

  return {
    liga: {
      id: liga.id,
      slug: liga.slug,
      nombre: liga.nombre,
      temporada: liga.temporada,
      estado: liga.estado,
    },
    fechas: [...fechas]
      .sort((a, b) => a.numero - b.numero)
      .map((f) => ({ id: f.id, numero: f.numero, fecha: f.fecha, hora: f.hora })),
    grupos: gruposArmados,
  };
}

// Misma forma que un elemento de `grupos` en armarLiga(), reusada por el
// detalle de admin de un solo grupo (GET /api/admin/liga/grupos/[numero]).
export function armarGrupo({ grupo, participantes, partidos, fechaPorId }) {
  const participantesGrupo = participantes.filter((p) => p.grupo_id === grupo.id);
  const partidosGrupo = partidos.filter((p) => p.grupo_id === grupo.id);
  const nombrePorParticipanteId = new Map(participantesGrupo.map((p) => [p.id, p.nombre]));

  const tabla = calcularTabla(participantesGrupo, partidosGrupo, {
    cuposClasificados: grupo.cupos_clasificados,
  });

  const partidosArmados = partidosGrupo
    .map((partido) => {
      const fecha = fechaPorId.get(partido.fecha_id);
      return {
        id: partido.id,
        fechaNumero: fecha?.numero ?? null,
        orden: partido.orden,
        participanteAId: partido.participante_a_id,
        nombreA: nombrePorParticipanteId.get(partido.participante_a_id) ?? null,
        participanteBId: partido.participante_b_id,
        nombreB: nombrePorParticipanteId.get(partido.participante_b_id) ?? null,
        ganadorId: partido.ganador_id,
        ganadorNombre: partido.ganador_id
          ? (nombrePorParticipanteId.get(partido.ganador_id) ?? null)
          : null,
      };
    })
    .sort((a, b) => a.fechaNumero - b.fechaNumero || a.orden - b.orden);

  return {
    id: grupo.id,
    numero: grupo.numero,
    nombre: grupo.nombre,
    cuposClasificados: grupo.cupos_clasificados,
    cerrado: grupo.cerrado,
    participantes: participantesGrupo.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      playerId: p.player_id,
      ordenDesempate: p.orden_desempate,
    })),
    partidos: partidosArmados,
    tabla,
  };
}
