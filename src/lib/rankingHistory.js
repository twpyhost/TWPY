import { getMovimiento } from "./data/movimiento.js";

export function orderRankingCuts(cuts) {
  return [...cuts].sort((a, b) => a.date.localeCompare(b.date) ||
    (BigInt(a.tournamentId) < BigInt(b.tournamentId) ? -1 : BigInt(a.tournamentId) > BigInt(b.tournamentId) ? 1 : 0));
}

export function projectRankingHistory({ cuts, snapshots, playerId }) {
  const byCut = new Map(snapshots.filter(s => s.playerId === String(playerId)).map(s => [s.tournamentId, s]));
  return orderRankingCuts(cuts).map(cut => {
    const snapshot = cut.available ? byCut.get(cut.tournamentId) : null;
    return { tournamentId: cut.tournamentId, date: cut.date, position: snapshot?.position ?? null,
      points: snapshot?.points ?? null, available: cut.available };
  });
}

export function projectRankingAtCut({ cuts, snapshots, year, tournamentId }) {
  const ordered = orderRankingCuts(cuts.filter(c => c.season === year));
  const index = ordered.findIndex(c => c.tournamentId === tournamentId);
  if (index < 0) return null;
  const cut = ordered[index];
  const previousCut = ordered[index - 1] ?? null;
  const previous = new Map(snapshots.filter(s => s.tournamentId === previousCut?.tournamentId).map(s => [s.playerId, s.position]));
  const rows = cut.available ? snapshots.filter(s => s.tournamentId === cut.tournamentId)
    .map(s => ({ playerId: s.playerId, name: s.name, position: s.position, points: s.points,
      movement: previousCut && !previousCut.available ? null : getMovimiento(s.position, previous.get(s.playerId)) }))
    .sort((a, b) => a.position - b.position) : [];
  return { cut, previousCut, rows };
}
