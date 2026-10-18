// Contra el stack local de Supabase (`supabase start`). Nunca corre contra
// el proyecto remoto -- ver tests/testSupabase.js.
//
// getRankings/getRankingsCount (supabaseDb.js) arman su propio cliente
// interno desde NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (a
// diferencia de puntajes.js, no reciben el cliente como parametro), asi
// que esas vars se fijan en beforeAll, antes de la primera llamada.
import { test, expect } from "@playwright/test";

import {
  getServiceClient,
  LOCAL_SUPABASE_URL,
  LOCAL_SUPABASE_ANON_KEY,
} from "../testSupabase.js";
import {
  getRankings,
  getRankingsCount,
} from "../../src/lib/data/supabaseDb.js";
import { createRankingHistoryReader } from "../../src/lib/rankingHistoryDb.js";
import { getAnonClient } from "../testSupabase.js";

const TORNEO_ID = 995002;
const TEMPORADA = 9095;

test.describe("getRankingsCount (supabaseDb)", () => {
  let playerIds = [];

  test.beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.SUPABASE_URL || LOCAL_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || LOCAL_SUPABASE_ANON_KEY;

    const supabase = getServiceClient();

    const { data: juego } = await supabase
      .from("juegos")
      .select("id")
      .ilike("nombre", "Tekken 8")
      .maybeSingle();

    await supabase.from("torneos").insert({
      id: TORNEO_ID,
      nombre: "Torneo Count E2E",
      fecha_inicio: "2095-01-01",
      temporada: TEMPORADA,
      juego_id: juego.id,
    });

    for (const nombre of ["Count E2E Uno", "Count E2E Dos"]) {
      const { data: player } = await supabase
        .from("players")
        .insert({ display_name: nombre })
        .select("id")
        .single();
      playerIds.push(player.id);
    }

    await supabase.from("ranking_snapshots").insert([
      {
        torneo_id: TORNEO_ID,
        player_id: playerIds[0],
        temporada: TEMPORADA,
        puntaje_acumulado: 100,
        posicion_global: 1,
      },
      {
        torneo_id: TORNEO_ID,
        player_id: playerIds[1],
        temporada: TEMPORADA,
        puntaje_acumulado: 50,
        posicion_global: 2,
      },
    ]);
  });

  test.afterAll(async () => {
    const supabase = getServiceClient();
    await supabase.from("torneos").delete().eq("id", TORNEO_ID);
    for (const id of playerIds) {
      await supabase.from("players").delete().eq("id", id);
    }
  });

  test("cuenta los jugadores rankeados sembrados", async () => {
    const count = await getRankingsCount(String(TEMPORADA));
    expect(count).toBe(2);
  });

  test("coincide con getRankings(temporada).length", async () => {
    const rankings = await getRankings(String(TEMPORADA));
    const count = await getRankingsCount(String(TEMPORADA));
    expect(count).toBe(rankings.length);
  });

  test("devuelve 0 para una temporada sin torneos", async () => {
    const count = await getRankingsCount("8888");
    expect(count).toBe(0);
  });

  test("latest ranking and count match history for adjacent bigint tournament IDs", async () => {
    const service = getServiceClient();
    const ids = ["9223372036854775701", "9223372036854775702"];
    const tournament = await service
      .from("torneos")
      .select("juego_id")
      .eq("id", TORNEO_ID)
      .single()
      .throwOnError();
    try {
      await service
        .from("torneos")
        .insert(
          ids.map((id, i) => ({
            id,
            nombre: `Exact ranking cut ${i}`,
            fecha_inicio: "2095-02-01",
            temporada: TEMPORADA,
            juego_id: tournament.data.juego_id,
          })),
        )
        .throwOnError();
      await service
        .from("ranking_snapshots")
        .insert([
          {
            torneo_id: ids[0],
            player_id: playerIds[0],
            temporada: TEMPORADA,
            puntaje_acumulado: 101,
            posicion_global: 1,
          },
          {
            torneo_id: ids[1],
            player_id: playerIds[1],
            temporada: TEMPORADA,
            puntaje_acumulado: 202,
            posicion_global: 1,
          },
          {
            torneo_id: ids[1],
            player_id: playerIds[0],
            temporada: TEMPORADA,
            puntaje_acumulado: 150,
            posicion_global: 2,
          },
        ])
        .throwOnError();
      const history = await createRankingHistoryReader(
        getAnonClient(),
      ).getRankingAtCut({ year: String(TEMPORADA), tournamentId: ids[1] });
      const [rankings, count] = await Promise.allSettled([
        getRankings(String(TEMPORADA)),
        getRankingsCount(String(TEMPORADA)),
      ]);
      expect.soft(rankings.status, rankings.reason?.message).toBe("fulfilled");
      expect.soft(count.status, count.reason?.message).toBe("fulfilled");
      if (rankings.status === "fulfilled")
        expect(
          rankings.value.map((row) => ({
            name: row.nombre,
            points: row.puntaje,
          })),
        ).toEqual(
          history.rows.map((row) => ({ name: row.name, points: row.points })),
        );
      if (count.status === "fulfilled")
        expect(count.value).toBe(history.rows.length);
    } finally {
      await service.from("torneos").delete().in("id", ids).throwOnError();
    }
  });
});
