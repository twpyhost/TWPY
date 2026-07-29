const TIPOS_DESHACIBLES = ["vincular", "crear_jugador", "registrar_manual"];

function extraerPlayerIds(detalle) {
  const ids = [];
  if (detalle?.player_id) ids.push(detalle.player_id);
  if (detalle?.base_player_id) ids.push(detalle.base_player_id);
  if (detalle?.duplicate_player_id) ids.push(detalle.duplicate_player_id);
  return ids;
}

// Deshacer solo es seguro si nada volvio a tocar el/los mismos jugadores
// desde entonces (una fusion incluida). Guard best-effort calculado sobre
// el propio log de auditoria en vez del estado en vivo de las tablas:
// como toda mutacion de identidad pasa por estas rutas, el log ya es la
// fuente de verdad de "que le paso a este jugador despues".
// "fusionar" nunca es deshacible en v1 (ver plan): puede tocar un numero
// no acotado de filas en varias temporadas sin transacciones de por medio.
export function puedeDeshacer(evento, todosLosEventos) {
  if (!TIPOS_DESHACIBLES.includes(evento.tipo)) {
    return false;
  }

  const playerIds = new Set(extraerPlayerIds(evento.detalle));

  return !todosLosEventos.some(
    (otro) =>
      otro.id !== evento.id &&
      new Date(otro.created_at) > new Date(evento.created_at) &&
      extraerPlayerIds(otro.detalle).some((id) => playerIds.has(id)),
  );
}
