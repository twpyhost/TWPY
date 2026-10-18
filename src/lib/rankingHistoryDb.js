import { isPublicId } from "./playerProfiles.js";
import { orderRankingCuts, projectRankingAtCut, projectRankingHistory } from "./rankingHistory.js";

// Anonymous, read-only queries. Paginate to preserve seasons exceeding the API row cap.
export function createRankingHistoryReader(client) {
  async function seasonData(year) {
    if (typeof year !== "string" || !/^\d{4}$/.test(year)) return { cuts: [], snapshots: [] };
    const tournaments = [];
    const raw = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from("torneos").select("id::text,nombre,fecha_inicio,temporada")
        .eq("temporada", year).order("fecha_inicio").order("id").range(offset, offset + 999);
      if (error) throw error;
      tournaments.push(...data);
      if (data.length < 1000) break;
    }
    if (tournaments.length) for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from("ranking_snapshots")
        .select("torneo_id::text,player_id::text,posicion_global,puntaje_acumulado,jugador:players!inner(display_name)")
        .eq("temporada", year).order("torneo_id").order("player_id").range(offset, offset + 999);
      if (error) throw error;
      raw.push(...data);
      if (data.length < 1000) break;
    }
    const available = new Set(raw.map(s => s.torneo_id));
    return {
      cuts: orderRankingCuts(tournaments.map(t => ({ tournamentId: t.id, title: t.nombre, date: t.fecha_inicio,
        season: String(t.temporada), available: available.has(t.id) }))),
      snapshots: raw.map(s => ({ tournamentId: s.torneo_id, playerId: s.player_id, name: s.jugador.display_name,
        position: s.posicion_global, points: s.puntaje_acumulado })),
    };
  }
  return {
    async getRankingCuts(year) { return (await seasonData(year)).cuts; },
    async getRankingAtCut({ year, tournamentId }) {
      if (!isPublicId(tournamentId)) return null;
      return projectRankingAtCut({ ...await seasonData(year), year, tournamentId });
    },
    async getPlayerRankingHistory(playerId, year) {
      if (!isPublicId(playerId)) return [];
      return projectRankingHistory({ ...await seasonData(year), playerId });
    },
  };
}
