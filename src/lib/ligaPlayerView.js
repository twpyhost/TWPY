// Uses the existing league standings and scores; never derives annual points.
export function getLigaPlayerView(bundle, participanteId) {
  const id = String(participanteId);
  const group = bundle.grupos.find(g => g.participantes.some(p => String(p.id) === id));
  if (!group) return null;
  const participant = group.participantes.find(p => String(p.id) === id);
  const byId = new Map(group.participantes.map(p => [String(p.id), p]));
  const dates = new Map(bundle.fechas.map(f => [f.numero, f]));
  const matches = group.partidos.filter(p => String(p.participanteAId) === id || String(p.participanteBId) === id).map(p => {
    const isA = String(p.participanteAId) === id;
    const opponentId = String(isA ? p.participanteBId : p.participanteAId);
    const opponent = byId.get(opponentId);
    const status = p.resultadoTipo ?? (p.ganadorId != null ? "jugado" : "pendiente");
    return { id: String(p.id), fechaNumero: p.fechaNumero, date: dates.get(p.fechaNumero)?.fecha ?? null,
      time: dates.get(p.fechaNumero)?.hora ?? null, opponentId, opponentName: opponent?.nombre ?? "Por confirmar",
      scoreFor: status === "pendiente" ? null : status === "sancionado" ? 0 : (isA ? p.matchesA : p.matchesB),
      scoreAgainst: status === "pendiente" ? null : status === "sancionado" ? 0 : (isA ? p.matchesB : p.matchesA),
      status, profileId: opponent?.playerId == null ? null : String(opponent.playerId) };
  }).sort((a, b) => a.fechaNumero - b.fechaNumero);
  const groupDates = new Set(group.partidos.map(p => p.fechaNumero));
  const playedDates = new Set(matches.map(p => p.fechaNumero));
  return { participant: { ...participant, id, playerId: participant.playerId == null ? null : String(participant.playerId) },
    group: { id: String(group.id), numero: group.numero, nombre: group.nombre },
    standing: group.tabla.find(row => String(row.participanteId) === id) ?? null,
    upcoming: matches.filter(p => p.status === "pendiente"), completed: matches.filter(p => p.status !== "pendiente"),
    restDates: bundle.fechas.filter(f => groupDates.has(f.numero) && !playedDates.has(f.numero)) };
}
