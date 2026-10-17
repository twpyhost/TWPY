import { test, expect } from "@playwright/test";
import { getAnonClient, getServiceClient } from "../testSupabase.js";
import { createRankingHistoryReader } from "../../src/lib/rankingHistoryDb.js";
import { recalcularSnapshots } from "../../src/lib/rankings.js";

test("lecturas anonimas conservan snapshots, rechazan otro ano y distinguen cortes faltantes", async () => {
  const service = getServiceClient();
  const reader = createRankingHistoryReader(getAnonClient());
  const season = 9094;
  let player;
  const ids = [994010, 994011, 994012];
  try {
    const game = await service.from("juegos").select("id").ilike("nombre", "Tekken 8").single().throwOnError();
    player = (await service.from("players").insert({ display_name: "Histórico Álex" }).select("id").single().throwOnError()).data;
    await service.from("torneos").insert(ids.map((id, i) => ({ id, nombre: `Corte ${id}`, temporada: season,
      fecha_inicio: i < 2 ? "2094-01-01" : "2094-02-01", juego_id: game.data.id }))).throwOnError();
    await service.from("ranking_snapshots").insert(ids.slice(0, 2).map(torneo_id => ({ torneo_id, player_id: player.id,
      temporada: season, posicion_global: 1, puntaje_acumulado: 80 }))).throwOnError();
    const before = (await service.from("ranking_snapshots").select("*").eq("temporada", season).order("torneo_id").throwOnError()).data;
    expect(await reader.getRankingCuts(String(season))).toMatchObject([
      { tournamentId: "994010", available: true }, { tournamentId: "994011", available: true }, { tournamentId: "994012", available: false },
    ]);
    expect(await reader.getRankingAtCut({ year: String(season), tournamentId: "994011" })).toMatchObject({
      previousCut: { tournamentId: "994010" }, rows: [{ playerId: String(player.id), name: "Histórico Álex", position: 1, points: 80, movement: "IGUAL" }],
    });
    expect(await reader.getRankingAtCut({ year: "2026", tournamentId: "994011" })).toBeNull();
    expect(await reader.getPlayerRankingHistory(String(player.id), String(season))).toMatchObject([
      { points: 80 }, { points: 80 }, { position: null, points: null, available: false },
    ]);
    expect((await service.from("ranking_snapshots").select("*").eq("temporada", season).order("torneo_id").throwOnError()).data).toEqual(before);
    // Reimport changes a result, then identity resolution links a previously raw result.
    await service.from("tournament_participants_raw").insert([
      { torneo_id: ids[0], player_id: player.id, nombre_participante: "Histórico Álex", posicion: 1, puntaje: 0 },
      { torneo_id: ids[1], player_id: null, nombre_participante: "Sin resolver", posicion: 1, puntaje: 30 },
    ]).throwOnError();
    await recalcularSnapshots(service, season);
    expect((await reader.getPlayerRankingHistory(String(player.id), String(season)))[0]).toMatchObject({ points: 0, position: 1, available: true });
    await service.from("tournament_participants_raw").update({ player_id: player.id }).eq("torneo_id", ids[1]).throwOnError();
    await recalcularSnapshots(service, season);
    expect(await reader.getPlayerRankingHistory(String(player.id), String(season))).toMatchObject([
      { points: 0, position: 1 }, { points: 30, position: 1 }, { points: 30, position: 1 },
    ]);
    expect((await reader.getRankingAtCut({ year: String(season), tournamentId: "994011" })).rows).toMatchObject([
      { playerId: String(player.id), name: "Histórico Álex", points: 30, movement: "IGUAL" },
    ]);
  } finally {
    await service.from("torneos").delete().in("id", ids).throwOnError();
    if (player) await service.from("players").delete().eq("id", player.id).throwOnError();
  }
});
